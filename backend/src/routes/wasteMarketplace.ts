import express from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { MarketplaceListing } from "../models/marketplaceListing";

const router = express.Router();
router.use(authenticate);

router.get("/", async (_req: AuthenticatedRequest, res) => {
  try {
    const listings = await MarketplaceListing.find({})
      .populate("seller", "name email role")
      .populate("buyer", "name email role")
      .sort({ updatedAt: -1 })
      .lean();
    return res.json(listings);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load marketplace listings" });
  }
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const { title, materialType, quantityKg, pricePerKg } = req.body || {};
    if (!title || !materialType || quantityKg === undefined || pricePerKg === undefined) {
      return res.status(400).json({ error: "title, materialType, quantityKg, and pricePerKg are required" });
    }
    const created = await MarketplaceListing.create({
      title,
      materialType,
      quantityKg: Number(quantityKg),
      pricePerKg: Number(pricePerKg),
      seller: req.authUser?._id,
    });
    const hydrated = await MarketplaceListing.findById(created._id)
      .populate("seller", "name email role")
      .populate("buyer", "name email role")
      .lean();
    return res.status(201).json(hydrated || created);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create listing" });
  }
});

router.post("/:id/buy", async (req: AuthenticatedRequest, res) => {
  try {
    if (req.authUser?.role !== "waste_buyer") {
      return res.status(403).json({ error: "Only waste buyers can reserve listings" });
    }
    const listing = await MarketplaceListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.status !== "open") return res.status(400).json({ error: "Listing is not open" });

    listing.status = "reserved";
    listing.buyer = req.authUser._id;
    await listing.save();

    const hydrated = await MarketplaceListing.findById(listing._id)
      .populate("seller", "name email role")
      .populate("buyer", "name email role")
      .lean();
    return res.json(hydrated || listing);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to reserve listing" });
  }
});

router.patch("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const listing = await MarketplaceListing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    const isSeller = String(listing.seller) === String(req.authUser?._id);
    const isBuyer = String(listing.buyer) === String(req.authUser?._id);
    if (!isSeller && !isBuyer) {
      return res.status(403).json({ error: "Only seller or buyer can update listing" });
    }

    const { status, pricePerKg, quantityKg, title } = req.body || {};
    if (status !== undefined) listing.status = status;
    if (isSeller && pricePerKg !== undefined) listing.pricePerKg = Number(pricePerKg);
    if (isSeller && quantityKg !== undefined) listing.quantityKg = Number(quantityKg);
    if (isSeller && title !== undefined) listing.title = title;
    await listing.save();

    const hydrated = await MarketplaceListing.findById(listing._id)
      .populate("seller", "name email role")
      .populate("buyer", "name email role")
      .lean();
    return res.json(hydrated || listing);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update listing" });
  }
});

export default router;
