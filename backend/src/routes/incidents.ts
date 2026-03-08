import express from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { Incident } from "../models/incident";
import { IncidentReward } from "../models/incidentReward";
import { User } from "../models/user";

const router = express.Router();
router.use(authenticate);

function ensureEmployee(req: AuthenticatedRequest, res: express.Response) {
  if (req.authUser?.role !== "employee") {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

function toNumber(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371e3;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function getEmployeeCoordinates(user: any): { lat: number; lng: number } | null {
  const settings = user?.settings || {};
  const c1 = settings.liveLocation;
  const c2 = settings.currentLocation;
  const source = c1 && typeof c1 === "object" ? c1 : c2 && typeof c2 === "object" ? c2 : null;
  if (!source) return null;
  const lat = toNumber(source.lat);
  const lng = toNumber(source.lng);
  if (lat === null || lng === null) return null;
  return { lat, lng };
}

async function assignBestEmployee(incidentCoordinates: { lat: number; lng: number }) {
  const employees = await User.find({ role: "employee" }).select("_id name email settings").lean();
  if (!employees.length) return null;

  const activeIncidentRows = await Incident.aggregate([
    {
      $match: {
        assignedTo: { $exists: true, $ne: null },
        status: { $in: ["reported", "acknowledged", "in_progress"] },
      },
    },
    { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
  ]);

  const activeCountByEmployee = new Map<string, number>();
  activeIncidentRows.forEach((row: any) => {
    activeCountByEmployee.set(String(row._id), Number(row.count || 0));
  });

  const latestLiveLocationRows = await Incident.aggregate([
    {
      $match: {
        assignedTo: { $exists: true, $ne: null },
        "employeeLiveLocation.coordinates.lat": { $type: "number" },
        "employeeLiveLocation.coordinates.lng": { $type: "number" },
      },
    },
    { $sort: { "employeeLiveLocation.updatedAt": -1 } },
    {
      $group: {
        _id: "$assignedTo",
        coordinates: { $first: "$employeeLiveLocation.coordinates" },
      },
    },
  ]);
  const latestLiveByEmployee = new Map<string, { lat: number; lng: number }>();
  latestLiveLocationRows.forEach((row: any) => {
    const lat = toNumber(row?.coordinates?.lat);
    const lng = toNumber(row?.coordinates?.lng);
    if (lat !== null && lng !== null) latestLiveByEmployee.set(String(row._id), { lat, lng });
  });

  const ranked = employees
    .map((employee: any) => {
      const id = String(employee._id);
      const activeCount = activeCountByEmployee.get(id) || 0;
      const coordinates = getEmployeeCoordinates(employee) || latestLiveByEmployee.get(id) || null;
      const distanceMeters = coordinates ? haversineMeters(coordinates, incidentCoordinates) : Number.POSITIVE_INFINITY;
      return { employee, activeCount, distanceMeters };
    })
    .sort((a, b) => {
      if (a.activeCount !== b.activeCount) return a.activeCount - b.activeCount;
      return a.distanceMeters - b.distanceMeters;
    });

  return ranked[0]?.employee || null;
}

function isAssignedEmployee(incident: any, userId: any) {
  return incident?.assignedTo && String(incident.assignedTo) === String(userId);
}

function isHelperEmployee(incident: any, userId: any) {
  const helpers = incident?.helperEmployees || [];
  return helpers.some((h: any) => String(h?.employee) === String(userId));
}

function isInvolvedEmployee(incident: any, userId: any) {
  return isAssignedEmployee(incident, userId) || isHelperEmployee(incident, userId);
}

// List incidents with privacy + filters
router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const { status, urgency, category } = req.query;
    const query: any = {};

    if (status && typeof status === "string" && status !== "all") query.status = status;
    if (urgency && typeof urgency === "string" && urgency !== "all") query.urgency = urgency;
    if (category && typeof category === "string" && category !== "all") query.category = category;

    if (req.authUser?.role === "collector") {
      query.reporter = req.authUser._id;
    } else if (req.authUser?.role === "employee") {
      query.$or = [
        { assignedTo: req.authUser._id },
        { "helperEmployees.employee": req.authUser._id },
      ];
    }

    const incidents = await Incident.find(query)
      .populate("assignedTo", "name email")
      .populate("reporter", "name email")
      .populate("helperEmployees.employee", "name email")
      .sort({ updatedAt: -1 })
      .lean();

    return res.json(incidents);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load incidents" });
  }
});

// List available employees for help requests
router.get("/support/employees", async (req: AuthenticatedRequest, res) => {
  try {
    if (!ensureEmployee(req, res)) return;
    const employees = await User.find({
      role: "employee",
      _id: { $ne: req.authUser?._id },
    })
      .select("_id name email")
      .sort({ name: 1, email: 1 })
      .lean();
    return res.json(employees);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load employees" });
  }
});

// Create incident and auto-assign nearest + least-loaded employee
router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const { category, description, coordinates, imageBase64, urgency } = req.body || {};
    const lat = toNumber(coordinates?.lat);
    const lng = toNumber(coordinates?.lng);
    if (!category || lat === null || lng === null || !imageBase64) {
      return res.status(400).json({ error: "Category, valid coordinates, and image are required" });
    }

    const normalizedCoordinates = { lat, lng };
    const selectedEmployee = await assignBestEmployee(normalizedCoordinates);
    const now = new Date();

    const incident = await Incident.create({
      category,
      description: description || "",
      coordinates: normalizedCoordinates,
      imageBase64,
      urgency: urgency || "medium",
      status: "reported",
      reporter: req.authUser?._id,
      assignedTo: selectedEmployee?._id || undefined,
      timeline: {
        assignedAt: selectedEmployee ? now : undefined,
      },
      updatedAt: now,
    });

    const populated = await Incident.findById(incident._id)
      .populate("assignedTo", "name email")
      .populate("reporter", "name email")
      .populate("helperEmployees.employee", "name email")
      .lean();

    return res.status(201).json(populated || incident);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create incident" });
  }
});

// Assigned employee can request support from another employee
router.post("/:id/request-help", async (req: AuthenticatedRequest, res) => {
  try {
    if (!ensureEmployee(req, res)) return;
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: "Incident not found" });
    if (!isAssignedEmployee(incident, req.authUser?._id)) {
      return res.status(403).json({ error: "Only assigned employee can request support" });
    }

    const helperEmployeeId = String(req.body?.helperEmployeeId || "");
    if (!helperEmployeeId) return res.status(400).json({ error: "helperEmployeeId is required" });
    if (String(req.authUser?._id) === helperEmployeeId) {
      return res.status(400).json({ error: "You are already the assigned employee" });
    }
    if (String(incident.assignedTo) === helperEmployeeId) {
      return res.status(400).json({ error: "Employee is already assigned" });
    }
    if (isHelperEmployee(incident, helperEmployeeId)) {
      return res.status(400).json({ error: "Employee is already added as helper" });
    }

    const helperUser = await User.findOne({ _id: helperEmployeeId, role: "employee" }).lean();
    if (!helperUser) return res.status(404).json({ error: "Helper employee not found" });

    incident.helperEmployees = [
      ...(incident.helperEmployees || []),
      {
        employee: helperUser._id,
        requestedAt: new Date(),
        joinedAt: new Date(),
      },
    ] as any;
    incident.updatedAt = new Date();
    await incident.save();

    const populated = await Incident.findById(incident._id)
      .populate("assignedTo", "name email")
      .populate("reporter", "name email")
      .populate("helperEmployees.employee", "name email")
      .lean();

    return res.json(populated || incident);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to add helper employee" });
  }
});

// Employee-only endpoint: push live employee location for assigned incident
router.patch("/:id/live-location", async (req: AuthenticatedRequest, res) => {
  try {
    if (!ensureEmployee(req, res)) return;

    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: "Incident not found" });
    if (!isInvolvedEmployee(incident, req.authUser?._id)) {
      return res.status(403).json({ error: "Only assigned or helper employee can update live location" });
    }

    const lat = toNumber(req.body?.coordinates?.lat);
    const lng = toNumber(req.body?.coordinates?.lng);
    if (lat === null || lng === null) {
      return res.status(400).json({ error: "Valid coordinates are required" });
    }

    const now = new Date();
    incident.employeeLiveLocation = {
      coordinates: { lat, lng },
      updatedAt: now,
    };
    incident.updatedAt = now;
    await incident.save();

    return res.json({
      ok: true,
      employeeLiveLocation: incident.employeeLiveLocation,
      updatedAt: incident.updatedAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update employee location" });
  }
});

// Update incident state
router.patch("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: "Incident not found" });

    const isEmployee = req.authUser?.role === "employee";
    const isCollector = req.authUser?.role === "collector";
    const isReporter = String(incident.reporter) === String(req.authUser?._id);
    const updates: any = {};

    if (isEmployee) {
      if (!isInvolvedEmployee(incident, req.authUser?._id)) {
        return res.status(403).json({ error: "Only assigned or helper employee can update this incident" });
      }
      const { category, description, coordinates, urgency, status, notes } = req.body || {};
      const lat = toNumber(coordinates?.lat);
      const lng = toNumber(coordinates?.lng);

      if (category !== undefined) updates.category = category;
      if (description !== undefined) updates.description = description;
      if (lat !== null && lng !== null) updates.coordinates = { lat, lng };
      if (urgency !== undefined) updates.urgency = urgency;
      if (notes !== undefined) updates.notes = notes;

      if (status !== undefined) {
        updates.status = status;
        const now = new Date();
        const assignedAt = incident.timeline?.assignedAt || incident.createdAt;
        if (status === "in_progress" && !incident.timeline?.startedAt) {
          updates.timeline = {
            ...(incident.timeline || {}),
            startedAt: now,
          };
        }
        if ((status === "resolved" || status === "dismissed") && !incident.timeline?.completedAt) {
          const minutes = Math.max(
            1,
            Math.round((now.getTime() - new Date(assignedAt).getTime()) / 60000)
          );
          updates.timeline = {
            ...(updates.timeline || incident.timeline || {}),
            completedAt: now,
            resolutionMinutes: minutes,
          };
        }
      }
    } else if (isCollector) {
      if (!isReporter) {
        return res.status(403).json({ error: "Collectors can only update their own incidents" });
      }
      const { notes } = req.body || {};
      if (notes !== undefined) updates.notes = notes;
    }

    if (Object.keys(updates).length === 0) return res.json(incident);

    updates.updatedAt = new Date();
    Object.assign(incident, updates);
    await incident.save();

    const populated = await Incident.findById(incident._id)
      .populate("assignedTo", "name email")
      .populate("reporter", "name email")
      .populate("helperEmployees.employee", "name email")
      .lean();

    return res.json(populated || incident);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update incident" });
  }
});

// Award points for resolved incident
router.post("/:id/reward", async (req: AuthenticatedRequest, res) => {
  if (!ensureEmployee(req, res)) return;
  try {
    const { points, note } = req.body || {};
    const pts = Number(points);
    if (!pts || pts <= 0) {
      return res.status(400).json({ error: "Positive points required" });
    }

    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: "Incident not found" });
    if (!isInvolvedEmployee(incident, req.authUser?._id)) {
      return res.status(403).json({ error: "Only assigned or helper employee can award points" });
    }
    if (!incident.reporter) return res.status(400).json({ error: "Incident has no reporter" });
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
      note: note || "",
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

// Estimate repair cost for pothole incident
router.post("/:id/estimate-repair", async (req: AuthenticatedRequest, res) => {
  if (!ensureEmployee(req, res)) return;
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ error: "Incident not found" });
    if (!isInvolvedEmployee(incident, req.authUser?._id)) {
      return res.status(403).json({ error: "Only assigned or helper employee can analyze this incident" });
    }
    if (incident.category !== "pothole") {
      return res.status(400).json({ error: "Repair estimate is only available for pothole incidents" });
    }

    const incidentUrgency = incident.urgency || "medium";
    let baseMin = 3000;
    let baseMax = 8000;

    if (incidentUrgency === "low") {
      baseMin = 1500;
      baseMax = 4000;
    } else if (incidentUrgency === "high") {
      baseMin = 6000;
      baseMax = 15000;
    } else if (incidentUrgency === "critical") {
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
      note: "Automated rough estimate from urgency, not a final engineering quote.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to estimate repair cost" });
  }
});

export default router;
