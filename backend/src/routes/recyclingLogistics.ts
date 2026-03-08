import express from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { RecyclingJob } from "../models/recyclingJob";

const router = express.Router();
router.use(authenticate);

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const query: any = {};
    if (req.authUser?.role === "recycling_logistics") {
      query.$or = [{ createdBy: req.authUser._id }, { assignedTo: req.authUser._id }];
    }
    const jobs = await RecyclingJob.find(query)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role")
      .sort({ updatedAt: -1 })
      .lean();
    return res.json(jobs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load recycling jobs" });
  }
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    if (req.authUser?.role !== "recycling_logistics") {
      return res.status(403).json({ error: "Only recycling logistics users can create jobs" });
    }
    const { title, materialType, quantityKg, pickupLocation, dropLocation, assignedTo } = req.body || {};
    if (!title || !materialType || quantityKg === undefined || !pickupLocation?.lat || !pickupLocation?.lng || !dropLocation?.lat || !dropLocation?.lng) {
      return res.status(400).json({ error: "title, materialType, quantityKg, pickupLocation, and dropLocation are required" });
    }
    const created = await RecyclingJob.create({
      title,
      materialType,
      quantityKg: Number(quantityKg),
      pickupLocation,
      dropLocation,
      assignedTo: assignedTo || undefined,
      createdBy: req.authUser._id,
    });
    const hydrated = await RecyclingJob.findById(created._id)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role")
      .lean();
    return res.status(201).json(hydrated || created);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create recycling job" });
  }
});

router.patch("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const job = await RecyclingJob.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (req.authUser?.role !== "recycling_logistics") {
      return res.status(403).json({ error: "Only recycling logistics users can update jobs" });
    }

    const { status, assignedTo, title, materialType, quantityKg, pickupLocation, dropLocation } = req.body || {};
    if (status !== undefined) job.status = status;
    if (assignedTo !== undefined) job.assignedTo = assignedTo;
    if (title !== undefined) job.title = title;
    if (materialType !== undefined) job.materialType = materialType;
    if (quantityKg !== undefined) job.quantityKg = Number(quantityKg);
    if (pickupLocation?.lat && pickupLocation?.lng) job.pickupLocation = pickupLocation;
    if (dropLocation?.lat && dropLocation?.lng) job.dropLocation = dropLocation;

    await job.save();
    const hydrated = await RecyclingJob.findById(job._id)
      .populate("createdBy", "name email role")
      .populate("assignedTo", "name email role")
      .lean();
    return res.json(hydrated || job);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update recycling job" });
  }
});

export default router;
