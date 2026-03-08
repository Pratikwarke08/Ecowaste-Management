import express from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { GovernmentCase } from "../models/governmentCase";

const router = express.Router();
router.use(authenticate);

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const query: any = {};
    if (req.authUser?.role !== "government_officer") {
      query.submittedBy = req.authUser?._id;
    }
    const cases = await GovernmentCase.find(query)
      .populate("submittedBy", "name email role")
      .populate("reviewedBy", "name email role")
      .sort({ updatedAt: -1 })
      .lean();
    return res.json(cases);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load government cases" });
  }
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const { title, caseType, referenceId, description } = req.body || {};
    if (!title || !caseType) {
      return res.status(400).json({ error: "title and caseType are required" });
    }
    const created = await GovernmentCase.create({
      title,
      caseType,
      referenceId: referenceId || "",
      description: description || "",
      submittedBy: req.authUser?._id,
    });
    const hydrated = await GovernmentCase.findById(created._id)
      .populate("submittedBy", "name email role")
      .populate("reviewedBy", "name email role")
      .lean();
    return res.status(201).json(hydrated || created);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create government case" });
  }
});

router.patch("/:id/review", async (req: AuthenticatedRequest, res) => {
  try {
    if (req.authUser?.role !== "government_officer") {
      return res.status(403).json({ error: "Only government officers can review cases" });
    }
    const gcase = await GovernmentCase.findById(req.params.id);
    if (!gcase) return res.status(404).json({ error: "Case not found" });

    const { status, remarks } = req.body || {};
    if (status !== undefined) gcase.status = status;
    if (remarks !== undefined) gcase.remarks = remarks;
    gcase.reviewedBy = req.authUser._id;
    await gcase.save();

    const hydrated = await GovernmentCase.findById(gcase._id)
      .populate("submittedBy", "name email role")
      .populate("reviewedBy", "name email role")
      .lean();
    return res.json(hydrated || gcase);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to review case" });
  }
});

export default router;
