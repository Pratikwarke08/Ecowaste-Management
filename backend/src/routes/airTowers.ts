import express from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { AirTower } from "../models/airTower";

const router = express.Router();

function isEmployee(req: AuthenticatedRequest) {
  return req.authUser?.role === "employee";
}

router.get("/stats/overview", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const query: any = {};
    const type = req.query.type;
    if (typeof type === "string" && ["smog_tower", "artificial_lung"].includes(type)) {
      query.towerType = type;
    }

    const towers = await AirTower.find(query).lean();
    const totalTowers = towers.length;
    const activeTowers = towers.filter((t) => t.status === "working").length;
    const maintenanceNeeded = towers.filter((t) => t.status === "maintenance_needed").length;
    const totalAirProcessedToday = towers.reduce((sum, t) => sum + (t.totalAirProcessedToday || 0), 0);
    const totalPm25Reduction = towers.reduce((sum, t) => sum + (t.pm25Reduction || 0), 0);
    const totalCo2Reduction = towers.reduce((sum, t) => sum + (t.co2Reduction || 0), 0);

    // Flatten history for simple trend chart payload
    const metricsTimeline = towers
      .flatMap((tower) =>
        (tower.metricsHistory || []).map((m: any) => ({
          towerId: tower._id,
          towerName: tower.towerName,
          recordedAt: m.recordedAt,
          pm25: m.pm25 || 0,
          pm10: m.pm10 || 0,
          co2: m.co2 || 0,
          temperature: m.temperature || 0,
          humidity: m.humidity || 0
        }))
      )
      .sort((a, b) => new Date(a.recordedAt || 0).getTime() - new Date(b.recordedAt || 0).getTime())
      .slice(-200);

    return res.json({
      totalTowers,
      activeTowers,
      maintenanceNeeded,
      totalAirProcessedToday,
      totalPm25Reduction,
      totalCo2Reduction,
      metricsTimeline
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load tower overview stats" });
  }
});

router.get("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { status, type } = req.query;
    const query: any = {};

    if (typeof status === "string" && status !== "all") query.status = status;
    if (typeof type === "string" && ["smog_tower", "artificial_lung"].includes(type)) query.towerType = type;

    // Collectors only see their submitted towers
    if (!isEmployee(req)) {
      query.ownerEmail = req.authUser?.email;
    }

    const towers = await AirTower.find(query).sort({ createdAt: -1 }).lean();
    return res.json(towers);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load air towers" });
  }
});

router.get("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const tower = await AirTower.findById(req.params.id).lean();
    if (!tower) return res.status(404).json({ error: "Tower not found" });
    return res.json(tower);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load tower" });
  }
});

router.post("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      towerType,
      towerName,
      location,
      installationDate,
      towerHeight,
      capacity,
      assignedWorkers,
      totalAirProcessedToday,
      pm25Reduction,
      co2Reduction,
      latestMetrics
    } = req.body || {};

    if (!towerType || !towerName || !location || !installationDate || towerHeight === undefined || capacity === undefined) {
      return res.status(400).json({ error: "Missing required tower fields" });
    }
    if (!["smog_tower", "artificial_lung"].includes(towerType)) {
      return res.status(400).json({ error: "Invalid towerType" });
    }

    const lat = Number(location?.lat);
    const lng = Number(location?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "Invalid location coordinates" });
    }

    const tower = await AirTower.create({
      towerType,
      towerName,
      location: { lat, lng, address: location?.address || "" },
      installationDate: new Date(installationDate),
      towerHeight: Number(towerHeight),
      capacity: Number(capacity),
      assignedWorkers: Array.isArray(assignedWorkers) ? assignedWorkers : [],
      totalAirProcessedToday: Number(totalAirProcessedToday || 0),
      pm25Reduction: Number(pm25Reduction || 0),
      co2Reduction: Number(co2Reduction || 0),
      latestMetrics: latestMetrics || {},
      ownerId: req.authUser?._id,
      ownerEmail: req.authUser?.email
    });

    return res.status(201).json(tower);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create tower" });
  }
});

router.patch("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const tower = await AirTower.findById(req.params.id);
    if (!tower) return res.status(404).json({ error: "Tower not found" });

    // Only employee can manage globally; collector only owner can patch limited fields
    const employee = isEmployee(req);
    const owner = tower.ownerEmail && req.authUser?.email === tower.ownerEmail;
    if (!employee && !owner) return res.status(403).json({ error: "Forbidden" });

    const updates = req.body || {};
    const allowedFields = employee
      ? [
          "towerName",
          "location",
          "installationDate",
          "towerHeight",
          "capacity",
          "status",
          "assignedWorkers",
          "totalAirProcessedToday",
          "pm25Reduction",
          "co2Reduction",
          "latestMetrics"
        ]
      : ["towerName", "assignedWorkers"];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        (tower as any)[field] = updates[field];
      }
    });

    if (updates.status && employee) {
      tower.maintenanceLogs.push({
        note: updates.maintenanceNote || `Status changed to ${updates.status}`,
        status: updates.status,
        loggedBy: req.authUser?.email || "employee"
      } as any);
    }

    if (updates.latestMetrics && employee) {
      tower.metricsHistory.push({
        ...(updates.latestMetrics || {}),
        recordedAt: new Date()
      } as any);
    }

    await tower.save();
    return res.json(tower);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update tower" });
  }
});

router.delete("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (!isEmployee(req)) return res.status(403).json({ error: "Forbidden" });
    const tower = await AirTower.findByIdAndDelete(req.params.id);
    if (!tower) return res.status(404).json({ error: "Tower not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete tower" });
  }
});

router.post("/:id/verify", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const tower = await AirTower.findById(req.params.id);
    if (!tower) return res.status(404).json({ error: "Tower not found" });

    const { location, photoBase64 } = req.body || {};
    const lat = Number(location?.lat);
    const lng = Number(location?.lng);
    if (!photoBase64 || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "Verification requires photo and valid GPS location" });
    }

    // Lightweight pseudo-AI check placeholder
    const aiDetectedTower = photoBase64.length > 5000;
    const verificationStatus = aiDetectedTower ? "verified" : "flagged";

    tower.verifications.push({
      workerId: req.authUser?._id,
      workerEmail: req.authUser?.email,
      location: { lat, lng, address: location?.address || "" },
      photoBase64,
      verifiedAt: new Date(),
      aiDetectedTower,
      verificationStatus
    } as any);

    await tower.save();
    return res.status(201).json({
      success: true,
      aiDetectedTower,
      verificationStatus,
      verification: tower.verifications[tower.verifications.length - 1]
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to verify tower" });
  }
});

// Backward-compatible aliases used by legacy smog page
router.post("/:id/deploy", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const tower = await AirTower.findById(req.params.id);
    if (!tower) return res.status(404).json({ error: "Tower not found" });
    tower.status = "working";
    if (req.body?.plantedAt) {
      tower.installationDate = new Date(req.body.plantedAt);
    }
    await tower.save();
    return res.json(tower);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to deploy tower" });
  }
});

export default router;
