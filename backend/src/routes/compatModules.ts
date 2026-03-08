import express from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { Recycler } from "../models/recycler";
import { WasteListing } from "../models/wasteListing";
import { Order } from "../models/order";
import { Report } from "../models/report";
import { Collector } from "../models/collector";
import { PickupRequest } from "../models/pickupRequest";
import { CarbonCredit } from "../models/carbonCredit";

const router = express.Router();
router.use(authenticate);

const PRICE_MAP: Record<string, number> = {
  plastic: 18,
  metal: 35,
  paper: 12,
};

const CO2_MAP: Record<string, number> = {
  plastic: 2.5,
  paper: 1.8,
  metal: 4.2,
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function normalizeMaterial(raw: string | undefined | null) {
  const v = (raw || "").toLowerCase();
  if (v.includes("plastic") || v.includes("recycle")) return "plastic";
  if (v.includes("metal")) return "metal";
  if (v.includes("paper")) return "paper";
  return "plastic";
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

async function syncCarbonForReport(report: any) {
  const material = normalizeMaterial(report?.materialType || report?.aiAnalysis?.wasteItems?.[0]?.class_name);
  const weight = Math.max(0, Number(report?.wasteWeightKg || 0));
  const factor = CO2_MAP[material] || CO2_MAP.plastic;
  const co2_saved = Number((weight * factor).toFixed(3));
  const credits = Number((co2_saved / 10).toFixed(3));
  await CarbonCredit.findOneAndUpdate(
    { waste_upload_id: report._id },
    {
      waste_upload_id: report._id,
      user_id: report.collectorId,
      material_type: material,
      weight,
      co2_saved,
      credits,
    },
    { upsert: true, new: true }
  );
}

// MODULE 1 - Recycling Marketplace
router.post("/recycler/register", async (req: AuthenticatedRequest, res) => {
  try {
    const { name, company, location, contact } = req.body || {};
    const lat = toNumber(location?.lat);
    const lng = toNumber(location?.lng);
    if (!name || !contact || lat === null || lng === null) {
      return res.status(400).json({ error: "name, contact, and valid location are required" });
    }
    const recycler = await Recycler.findOneAndUpdate(
      { userId: req.authUser?._id },
      { name, company: company || "", location: { lat, lng }, contact, userId: req.authUser?._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.status(201).json(recycler);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to register recycler" });
  }
});

router.get("/recyclers", async (_req: AuthenticatedRequest, res) => {
  try {
    const recyclers = await Recycler.find({}).sort({ createdAt: -1 }).lean();
    return res.json(recyclers);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load recyclers" });
  }
});

router.post("/waste/create-listing", async (req: AuthenticatedRequest, res) => {
  try {
    const { waste_upload_id, material_type, weight, price_per_kg } = req.body || {};
    if (!waste_upload_id) return res.status(400).json({ error: "waste_upload_id is required" });

    const report = await Report.findById(waste_upload_id).lean();
    if (!report) return res.status(404).json({ error: "waste_upload not found" });
    if (report.status !== "approved") {
      return res.status(400).json({ error: "Only verified/approved waste_upload can be listed" });
    }

    const reporterOwner = String(report.collectorId || "");
    if (reporterOwner && reporterOwner !== String(req.authUser?._id)) {
      return res.status(403).json({ error: "You can only list your own waste_upload" });
    }

    const material = normalizeMaterial(material_type || report.materialType || report.aiAnalysis?.wasteItems?.[0]?.class_name);
    const weightKg = toNumber(weight) ?? Number(report.wasteWeightKg || 0);
    const finalWeight = Number.isFinite(weightKg) ? Math.max(weightKg, 0.01) : 0.01;
    const price = toNumber(price_per_kg) ?? PRICE_MAP[material] ?? 10;

    const listing = await WasteListing.create({
      waste_upload_id: report._id,
      material_type: material,
      weight: finalWeight,
      price_per_kg: price,
      seller_user_id: req.authUser?._id,
      status: "available",
    });

    await syncCarbonForReport(report);

    const hydrated = await WasteListing.findById(listing._id)
      .populate("seller_user_id", "name email")
      .populate("recycler_id", "name company contact location")
      .lean();
    return res.status(201).json(hydrated || listing);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create listing" });
  }
});

router.get("/waste/listings", async (req: AuthenticatedRequest, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "available";
    const query: any = {};
    if (status !== "all") query.status = status;
    const listings = await WasteListing.find(query)
      .populate("seller_user_id", "name email")
      .populate("recycler_id", "name company contact location")
      .populate("waste_upload_id", "pickupLocation disposalLocation materialType wasteWeightKg status")
      .sort({ createdAt: -1 })
      .lean();
    return res.json(listings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load listings" });
  }
});

router.post("/orders/create", async (req: AuthenticatedRequest, res) => {
  try {
    const { listing_id, quantity } = req.body || {};
    if (!listing_id || !toNumber(quantity)) {
      return res.status(400).json({ error: "listing_id and quantity are required" });
    }
    const listing = await WasteListing.findById(listing_id);
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.status !== "available") return res.status(400).json({ error: "Listing is not available" });

    const recycler = await Recycler.findOne({ userId: req.authUser?._id });
    if (!recycler) return res.status(400).json({ error: "Register recycler profile first" });

    const qty = Number(quantity);
    const total = Number((qty * Number(listing.price_per_kg || 0)).toFixed(2));
    const order = await Order.create({
      recycler_id: recycler._id,
      listing_id: listing._id,
      quantity: qty,
      total_price: total,
      status: "created",
    });

    listing.recycler_id = recycler._id as any;
    listing.status = "sold";
    await listing.save();

    const hydrated = await Order.findById(order._id)
      .populate("recycler_id", "name company contact")
      .populate("listing_id")
      .lean();
    return res.status(201).json(hydrated || order);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create order" });
  }
});

router.get("/orders/recycler", async (req: AuthenticatedRequest, res) => {
  try {
    const recycler = await Recycler.findOne({ userId: req.authUser?._id }).lean();
    if (!recycler) return res.json([]);
    const orders = await Order.find({ recycler_id: recycler._id })
      .populate("listing_id")
      .populate("recycler_id", "name company contact")
      .sort({ createdAt: -1 })
      .lean();
    return res.json(orders);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load recycler orders" });
  }
});

// MODULE 2 - Waste Pickup Logistics
router.post("/collector/register", async (req: AuthenticatedRequest, res) => {
  try {
    const { name, vehicle_type, service_area, contact } = req.body || {};
    const lat = toNumber(service_area?.lat);
    const lng = toNumber(service_area?.lng);
    const radiusKm = toNumber(service_area?.radiusKm) ?? 5;
    if (!name || !vehicle_type || !contact || lat === null || lng === null) {
      return res.status(400).json({ error: "name, vehicle_type, contact and service_area(lat,lng) are required" });
    }
    const collector = await Collector.findOneAndUpdate(
      { userId: req.authUser?._id },
      { name, vehicle_type, service_area: { lat, lng, radiusKm }, contact, userId: req.authUser?._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.status(201).json(collector);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to register collector" });
  }
});

router.post("/pickup/request", async (req: AuthenticatedRequest, res) => {
  try {
    const { waste_upload_id, pickup_location } = req.body || {};
    const lat = toNumber(pickup_location?.lat);
    const lng = toNumber(pickup_location?.lng);
    if (!waste_upload_id || lat === null || lng === null) {
      return res.status(400).json({ error: "waste_upload_id and pickup_location are required" });
    }
    const report = await Report.findById(waste_upload_id).lean();
    if (!report) return res.status(404).json({ error: "waste_upload not found" });
    if (report.status !== "approved") return res.status(400).json({ error: "waste_upload must be verified/approved" });
    const reportOwner = String(report.collectorId || "");
    if (reportOwner && reportOwner !== String(req.authUser?._id)) {
      return res.status(403).json({ error: "You can only request pickup for your own waste_upload" });
    }

    const quantityKg = Number(report.wasteWeightKg || 0);
    const pickup = await PickupRequest.create({
      user_id: req.authUser?._id,
      waste_upload_id: report._id,
      pickup_location: { lat, lng },
      status: "pending",
      suggested: quantityKg > 3,
    });

    return res.status(201).json({
      ...pickup.toObject(),
      suggestion: quantityKg > 3 ? "Pickup suggested because quantity is above 3kg." : "Pickup optional.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create pickup request" });
  }
});

router.get("/pickup/pending", async (req: AuthenticatedRequest, res) => {
  try {
    const collector = await Collector.findOne({ userId: req.authUser?._id }).lean();
    let pending = await PickupRequest.find({ status: { $in: ["pending", "assigned"] } })
      .populate("user_id", "name email")
      .populate("assigned_collector")
      .populate("waste_upload_id", "materialType wasteWeightKg status collectorEmail")
      .sort({ createdAt: -1 })
      .lean();

    if (collector?.service_area) {
      const center = { lat: Number(collector.service_area.lat), lng: Number(collector.service_area.lng) };
      const radius = Number(collector.service_area.radiusKm || 5);
      pending = pending.filter((p: any) => {
        const loc = p.pickup_location;
        if (!loc) return false;
        return haversineKm(center, { lat: Number(loc.lat), lng: Number(loc.lng) }) < radius;
      });
    }

    return res.json(pending);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load pending pickup requests" });
  }
});

router.get("/pickup/my", async (req: AuthenticatedRequest, res) => {
  try {
    const rows = await PickupRequest.find({ user_id: req.authUser?._id })
      .populate("assigned_collector")
      .populate("waste_upload_id", "materialType wasteWeightKg status")
      .sort({ createdAt: -1 })
      .lean();
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load your pickup requests" });
  }
});

router.post("/pickup/assign", async (req: AuthenticatedRequest, res) => {
  try {
    const { pickup_request_id } = req.body || {};
    if (!pickup_request_id) return res.status(400).json({ error: "pickup_request_id is required" });
    const collector = await Collector.findOne({ userId: req.authUser?._id });
    if (!collector) return res.status(400).json({ error: "Register collector profile first" });

    const pickup = await PickupRequest.findById(pickup_request_id);
    if (!pickup) return res.status(404).json({ error: "Pickup request not found" });
    pickup.assigned_collector = collector._id as any;
    pickup.status = "assigned";
    await pickup.save();
    return res.json(pickup);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to assign pickup request" });
  }
});

router.post("/pickup/complete", async (req: AuthenticatedRequest, res) => {
  try {
    const { pickup_request_id } = req.body || {};
    if (!pickup_request_id) return res.status(400).json({ error: "pickup_request_id is required" });
    const collector = await Collector.findOne({ userId: req.authUser?._id });
    if (!collector) return res.status(400).json({ error: "Register collector profile first" });

    const pickup = await PickupRequest.findById(pickup_request_id);
    if (!pickup) return res.status(404).json({ error: "Pickup request not found" });
    if (String(pickup.assigned_collector || "") !== String(collector._id)) {
      return res.status(403).json({ error: "Only assigned collector can complete this pickup" });
    }
    pickup.status = "completed";
    await pickup.save();
    return res.json(pickup);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to complete pickup request" });
  }
});

// MODULE 3 - Carbon Credit Tracking
router.get("/carbon/user", async (req: AuthenticatedRequest, res) => {
  try {
    const uploads = await Report.find({ collectorId: req.authUser?._id, status: "approved" }).lean();
    for (const upload of uploads) {
      await syncCarbonForReport(upload);
    }
    const credits = await CarbonCredit.find({ user_id: req.authUser?._id })
      .sort({ createdAt: -1 })
      .lean();
    const totals = credits.reduce(
      (acc, row: any) => {
        acc.totalWaste += Number(row.weight || 0);
        acc.totalCo2 += Number(row.co2_saved || 0);
        acc.totalCredits += Number(row.credits || 0);
        return acc;
      },
      { totalWaste: 0, totalCo2: 0, totalCredits: 0 }
    );
    return res.json({
      summary: {
        total_waste_recycled: Number(totals.totalWaste.toFixed(3)),
        total_co2_saved: Number(totals.totalCo2.toFixed(3)),
        total_credits_earned: Number(totals.totalCredits.toFixed(3)),
      },
      rows: credits,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load user carbon credits" });
  }
});

router.get("/carbon/total", async (_req: AuthenticatedRequest, res) => {
  try {
    const totals = await CarbonCredit.aggregate([
      {
        $group: {
          _id: null,
          total_waste_recycled: { $sum: "$weight" },
          total_co2_saved: { $sum: "$co2_saved" },
          total_credits_earned: { $sum: "$credits" },
          total_entries: { $sum: 1 },
        },
      },
    ]);
    return res.json(totals[0] || { total_waste_recycled: 0, total_co2_saved: 0, total_credits_earned: 0, total_entries: 0 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load total carbon credits" });
  }
});

export default router;
