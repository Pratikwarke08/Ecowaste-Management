import express from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { CarbonCreditEntry } from "../models/carbonCreditEntry";

const router = express.Router();
router.use(authenticate);

router.get("/", async (_req: AuthenticatedRequest, res) => {
  try {
    const entries = await CarbonCreditEntry.find({})
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 })
      .lean();
    return res.json(entries);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load carbon entries" });
  }
});

router.get("/summary", async (_req: AuthenticatedRequest, res) => {
  try {
    const summary = await CarbonCreditEntry.aggregate([
      {
        $group: {
          _id: null,
          totalCredits: { $sum: "$credits" },
          totalCo2eKg: { $sum: "$co2eKg" },
          count: { $sum: 1 },
        },
      },
    ]);
    return res.json(summary[0] || { totalCredits: 0, totalCo2eKg: 0, count: 0 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load carbon summary" });
  }
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    if (req.authUser?.role !== "carbon_auditor") {
      return res.status(403).json({ error: "Only carbon auditors can create entries" });
    }
    const { sourceType, referenceId, credits, co2eKg, note } = req.body || {};
    if (!sourceType || credits === undefined || co2eKg === undefined) {
      return res.status(400).json({ error: "sourceType, credits, and co2eKg are required" });
    }
    const created = await CarbonCreditEntry.create({
      sourceType,
      referenceId: referenceId || "",
      credits: Number(credits),
      co2eKg: Number(co2eKg),
      note: note || "",
      createdBy: req.authUser._id,
    });
    const hydrated = await CarbonCreditEntry.findById(created._id).populate("createdBy", "name email role").lean();
    return res.status(201).json(hydrated || created);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create carbon entry" });
  }
});

export default router;
