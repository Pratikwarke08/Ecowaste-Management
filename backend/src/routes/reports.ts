import express from "express";
import { Report } from "../models/report";
import { Dustbin } from "../models/dustbin";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();
const POINTS_PER_KG = Number(process.env.POINTS_PER_KG || "10");

function inferWeightFromPoints(points: number) {
  if (!points || POINTS_PER_KG <= 0) return 0;
  return points / POINTS_PER_KG;
}

function getDistanceMeters(
  a: { lat: number; lng: number } | null | undefined,
  b: { lat: number; lng: number } | null | undefined
): number | null {
  if (!a || !b) return null;
  if (
    typeof a.lat !== "number" ||
    typeof a.lng !== "number" ||
    typeof b.lat !== "number" ||
    typeof b.lng !== "number"
  ) {
    return null;
  }
  const R = 6371e3; // meters
  const phi1 = (a.lat * Math.PI) / 180;
  const phi2 = (b.lat * Math.PI) / 180;
  const dPhi = ((b.lat - a.lat) * Math.PI) / 180;
  const dLambda = ((b.lng - a.lng) * Math.PI) / 180;

  const s1 = Math.sin(dPhi / 2);
  const s2 = Math.sin(dLambda / 2);
  const h = s1 * s1 + Math.cos(phi1) * Math.cos(phi2) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

// ML integration removed; reports will be manually reviewed.

// Create a report
router.post("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { pickupImageBase64, pickupLocation, disposalImageBase64, disposalLocation, dustbinId, materialType, wasteWeightKg } = req.body || {};
    if (!pickupImageBase64 || !pickupLocation || !disposalImageBase64 || !disposalLocation) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Manual workflow: store report and compute disposal → dustbin distance if a dustbin is linked
    const collectorEmail = req.authUser?.email || req.body.collectorEmail;

    let aiAnalysis: any = undefined;

    if (dustbinId) {
      try {
        const dustbin = await Dustbin.findById(dustbinId).lean();
        if (dustbin && dustbin.coordinates) {
          const distance = getDistanceMeters(
            disposalLocation,
            {
              lat: dustbin.coordinates.lat,
              lng: dustbin.coordinates.lng
            }
          );

          if (distance !== null) {
            aiAnalysis = {
              disposalDistance: distance,
              nearestDustbin: {
                _id: dustbin._id,
                name: dustbin.name,
                lat: dustbin.coordinates.lat,
                lng: dustbin.coordinates.lng
              }
            };
          }
        }
      } catch (err) {
        console.error("Failed to compute disposal distance:", err);
      }
    }

    const report = await Report.create({
      pickupImageBase64,
      pickupLocation,
      disposalImageBase64,
      disposalLocation,
      dustbinId: dustbinId || undefined,
      status: "pending",
      collectorEmail,
      collectorId: req.authUser?._id,
      points: 0,
      wasteWeightKg: typeof wasteWeightKg === "number" ? wasteWeightKg : 0,
      materialType: materialType || undefined,
      aiAnalysis
    });

    return res.json({ id: report._id, points: 0 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create report" });
  }
});

// List reports (most recent first)
router.get("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const scope = req.query.scope;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Exclude large image fields for list view (much faster)
    const selectFields = '-pickupImageBase64 -disposalImageBase64';

    if (scope === "collector") {
      const email = req.authUser?.email;
      if (!email) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const [reports, total] = await Promise.all([
        Report.find({ collectorEmail: email })
          .select(selectFields)
          .sort({ submittedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Report.countDocuments({ collectorEmail: email })
      ]);
      return res.json({ reports, total, page, limit, totalPages: Math.ceil(total / limit) });
    }
    
    const [reports, total] = await Promise.all([
      Report.find()
        .select(selectFields)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments()
    ]);
    return res.json({ reports, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.get("/latest-disposal-image", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { dustbinId } = req.query;
    if (!dustbinId || typeof dustbinId !== "string") {
      return res.status(400).json({ error: "dustbinId query parameter is required" });
    }
    const query: any = { dustbinId };

    const report = await Report.findOne(query)
      .sort({ submittedAt: -1 })
      .select("disposalImageBase64 submittedAt aiAnalysis.nearestDustbin dustbinId")
      .lean();

    if (!report) {
      return res.status(404).json({ error: "No disposal reports found for this dustbin" });
    }

    return res.json({
      disposalImageBase64: report.disposalImageBase64,
      submittedAt: report.submittedAt,
      nearestDustbin: report.aiAnalysis?.nearestDustbin || null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch latest disposal image" });
  }
});

// Get single report details
router.get("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });
    return res.json(report);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.patch("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { status, points, verificationComment, verifiedBy } = req.body || {};
    if (!status || !["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }
    report.status = status;
    if (typeof points === "number") {
      report.points = points;
      if (status === "approved" && (!report.wasteWeightKg || report.wasteWeightKg === 0)) {
        report.wasteWeightKg = inferWeightFromPoints(points);
      }
    }
    if (verificationComment !== undefined) {
      report.verificationComment = verificationComment;
    }
    if (verifiedBy !== undefined) {
      report.verifiedBy = verifiedBy;
    }
    await report.save();

    if (status === "approved" && report.dustbinId) {
      const dustbin = await Dustbin.findById(report.dustbinId);
      if (dustbin) {
        if (dustbin.photoBase64) {
          dustbin.photoHistory.push({
            photo: dustbin.photoBase64,
            updatedAt: new Date(),
            reportId: report._id as any
          });
        }
        dustbin.photoBase64 = report.disposalImageBase64;
        
        // Keep reasonable history size
        if (dustbin.photoHistory.length > 20) {
          // Remove oldest entries to keep only the last 20
          const removeCount = dustbin.photoHistory.length - 20;
          dustbin.photoHistory.splice(0, removeCount);
        }
        
        await dustbin.save();
      }
    }

    return res.json(report);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update report" });
  }
});

export default router;

