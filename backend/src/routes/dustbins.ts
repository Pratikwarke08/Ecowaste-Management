import express from "express";
import { Dustbin } from "../models/dustbin";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();

function ensureEmployee(req: AuthenticatedRequest, res: express.Response) {
  if (req.authUser?.role !== "employee") {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

router.get("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { status } = req.query;
    const query: any = {};
    if (status && typeof status === "string" && status !== "all") {
      query.status = status;
    }
    const dustbins = await Dustbin.find(query).sort({ updatedAt: -1 }).lean();
    return res.json(dustbins);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load dustbins" });
  }
});

router.get("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const dustbin = await Dustbin.findById(req.params.id).lean();
    if (!dustbin) {
      return res.status(404).json({ error: "Dustbin not found" });
    }
    return res.json(dustbin);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load dustbin" });
  }
});

router.post("/", authenticate, async (req: AuthenticatedRequest, res) => {
  if (!ensureEmployee(req, res)) {
    return;
  }
  try {
    const { name, sector, type, capacityLiters, coordinates, description, status, fillLevel, lastEmptiedAt, photoBase64, verificationRadius } = req.body || {};
    if (!name || !coordinates?.lat || !coordinates?.lng || !photoBase64) {
      return res.status(400).json({ error: "Name, coordinates, and photo are required" });
    }
    const dustbin = await Dustbin.create({
      name,
      sector,
      type,
      capacityLiters,
      coordinates,
      description,
      status: status || "active",
      fillLevel: typeof fillLevel === "number" ? fillLevel : 0,
      lastEmptiedAt,
      photoBase64,
      initialPhotoBase64: photoBase64, // Set initial photo same as current on creation
      verificationRadius: verificationRadius || 1.0,
      createdBy: req.authUser._id,
      updatedBy: req.authUser._id
    });
    return res.status(201).json(dustbin);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create dustbin" });
  }
});

router.patch("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const dustbin = await Dustbin.findById(req.params.id);
    if (!dustbin) {
      return res.status(404).json({ error: "Dustbin not found" });
    }
    const isEmployee = req.authUser?.role === "employee";
    const updates: any = {};

    if (isEmployee) {
      const { name, sector, type, capacityLiters, coordinates, description, status, fillLevel, lastEmptiedAt, urgent, photoBase64, verificationRadius } = req.body || {};
      if (name !== undefined) updates.name = name;
      if (sector !== undefined) updates.sector = sector;
      if (type !== undefined) updates.type = type;
      if (capacityLiters !== undefined) updates.capacityLiters = capacityLiters;
      if (coordinates?.lat && coordinates?.lng) updates.coordinates = coordinates;
      if (description !== undefined) updates.description = description;
      if (status !== undefined) updates.status = status;
      if (fillLevel !== undefined) updates.fillLevel = Math.max(0, Math.min(100, fillLevel));
      if (lastEmptiedAt !== undefined) updates.lastEmptiedAt = lastEmptiedAt;
      if (urgent !== undefined) updates.urgent = urgent;
      if (photoBase64 !== undefined) updates.photoBase64 = photoBase64;
      if (verificationRadius !== undefined) updates.verificationRadius = verificationRadius;
    } else {
      const { urgent } = req.body || {};
      if (urgent === true) {
        updates.urgent = true;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.json(dustbin);
    }
    updates.updatedBy = req.authUser?._id;
    updates.updatedAt = new Date();

    Object.assign(dustbin, updates);
    await dustbin.save();
    return res.json(dustbin);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update dustbin" });
  }
});

export default router;


