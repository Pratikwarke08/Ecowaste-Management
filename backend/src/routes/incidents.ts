import express from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { Incident } from "../models/incident";
import { IncidentReward } from "../models/incidentReward";
import { User } from "../models/user";

const router = express.Router();

function ensureEmployee(req: AuthenticatedRequest, res: express.Response) {
  if (req.authUser?.role !== "employee") {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

// List incidents with optional filters
router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const { status, urgency, category } = req.query;
    const query: any = {};
    if (status && typeof status === "string" && status !== "all") query.status = status;
    if (urgency && typeof urgency === "string" && urgency !== "all") query.urgency = urgency;
    if (category && typeof category === "string" && category !== "all") query.category = category;
    // Privacy: collectors can only see their incidents
    if (req.authUser?.role === 'collector') {
      query.reporter = req.authUser._id;
    }

    const incidents = await Incident.find(query).sort({ updatedAt: -1 }).lean();
    return res.json(incidents);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load incidents" });
  }
});

// Create new incident (reporter can be any authenticated user)
router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const { category, description, coordinates, imageBase64, urgency } = req.body || {};
    if (!category || !coordinates?.lat || !coordinates?.lng || !imageBase64) {
      return res.status(400).json({ error: "Category, coordinates, and image are required" });
    }
    const incident = await Incident.create({
      category,
      description: description || "",
      coordinates,
      imageBase64,
      urgency: urgency || "medium",
      status: "reported",
      reporter: req.authUser?._id,
      updatedAt: new Date(),
    });
    return res.status(201).json(incident);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create incident" });
  }
});

// Update incident (employees can update most fields; reporter can only add notes?)
router.patch("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: "Incident not found" });

    const isEmployee = req.authUser?.role === "employee";
    const updates: any = {};

    if (isEmployee) {
      const { category, description, coordinates, urgency, status, assignedTo, notes } = req.body || {};
      if (category !== undefined) updates.category = category;
      if (description !== undefined) updates.description = description;
      if (coordinates?.lat && coordinates?.lng) updates.coordinates = coordinates;
      if (urgency !== undefined) updates.urgency = urgency;
      if (status !== undefined) updates.status = status;
      if (assignedTo !== undefined) updates.assignedTo = assignedTo;
      if (notes !== undefined) updates.notes = notes;
    } else {
      const { notes } = req.body || {};
      if (notes !== undefined) updates.notes = notes;
    }

    if (Object.keys(updates).length === 0) return res.json(incident);

    updates.updatedAt = new Date();
    Object.assign(incident, updates);
    await incident.save();
    return res.json(incident);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update incident" });
  }
});

export default router;

// Award points for an incident to the reporter
router.post("/:id/reward", authenticate, async (req: AuthenticatedRequest, res) => {
  if (!ensureEmployee(req, res)) return;
  try {
    const { points, note } = req.body || {};
    const pts = Number(points);
    if (!pts || pts <= 0) {
      return res.status(400).json({ error: "Positive points required" });
    }
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: "Incident not found" });
    if (!incident.reporter) return res.status(400).json({ error: "Incident has no reporter" });

    // Rewards are only allowed once, and only for resolved incidents
    if (incident.status !== "resolved") {
      return res.status(400).json({ error: "Points can only be awarded when incident is resolved" });
    }
    if (incident.rewarded) {
      return res.status(400).json({ error: "Points already awarded for this incident" });
    }
    const reporter = await User.findById(incident.reporter);
    if (!reporter) return res.status(404).json({ error: "Reporter not found" });

    const reward = await IncidentReward.create({
      userId: reporter._id,
      incidentId: incident._id,
      points: pts,
      note: note || ""
    });

    incident.rewarded = true;
    incident.updatedAt = new Date();
    await incident.save();

    return res.status(201).json(reward);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to award points" });
  }
});

// Estimate repair cost for a pothole incident (fake AI-style endpoint)
router.post("/:id/estimate-repair", authenticate, async (req: AuthenticatedRequest, res) => {
  if (!ensureEmployee(req, res)) return;
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: "Incident not found" });

    // Only pothole incidents are supported for cost estimation
    if (incident.category !== "pothole") {
      return res.status(400).json({ error: "Repair estimate is only available for pothole incidents" });
    }

    // Simple heuristic based on urgency + a bit of randomness
    const urgency = incident.urgency || "medium";
    let baseMin = 3000;
    let baseMax = 8000;

    if (urgency === "low") {
      baseMin = 1500;
      baseMax = 4000;
    } else if (urgency === "medium") {
      baseMin = 3000;
      baseMax = 8000;
    } else if (urgency === "high") {
      baseMin = 6000;
      baseMax = 15000;
    } else if (urgency === "critical") {
      baseMin = 12000;
      baseMax = 30000;
    }

    const randomFactor = Math.random();
    const estimatedCost = Math.round(baseMin + (baseMax - baseMin) * randomFactor);

    return res.json({
      incidentId: incident._id,
      category: incident.category,
      urgency: incident.urgency,
      estimatedCost,
      currency: "INR",
      note: "This is a rough automated estimate based on urgency and basic heuristics, not a real engineering calculation.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to estimate repair cost" });
  }
});
