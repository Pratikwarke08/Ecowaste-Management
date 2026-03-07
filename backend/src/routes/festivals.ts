import express from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { Festival } from "../models/festival";

const router = express.Router();

// List festivals with optional filters
router.get("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { status } = req.query;
    const query: any = {};
    if (status && typeof status === "string" && status !== "all") query.status = status;

    // Privacy: collectors can only see their festivals
    if (req.authUser?.role === 'collector') {
      query.reporter = req.authUser._id;
    }

    const festivals = await Festival.find(query).sort({ updatedAt: -1 }).lean();
    return res.json(festivals);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load festivals" });
  }
});

// Create new festival (reporter can be any authenticated user)
router.post("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      name,
      description,
      coordinates,
      imageBase64,
      festivalType,
      siteType,
      siteName,
      landmark
    } = req.body || {};

    const lat = typeof coordinates?.lat === "number" ? coordinates.lat : Number(coordinates?.lat);
    const lng = typeof coordinates?.lng === "number" ? coordinates.lng : Number(coordinates?.lng);

    if (!name || !imageBase64 || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "Name, coordinates, and image are required" });
    }
    const festival = await Festival.create({
      name,
      description: description || "",
      festivalType: ["ganesh", "durga", "other"].includes(festivalType) ? festivalType : "other",
      siteType: ["lake", "river", "beach", "pond", "spot", "other"].includes(siteType) ? siteType : "spot",
      siteName: siteName || "",
      landmark: landmark || "",
      coordinates: { lat, lng },
      imageBase64,
      status: "pending",
      reporter: req.authUser?._id,
      process: {
        stage: "not_started",
        notes: "",
        checklist: {
          ammoniaContainerReady: false,
          co2ContainerReady: false,
          gasesConnected: false,
          solutionCooled: false,
          crystalsObserved: false
        }
      },
      updatedAt: new Date(),
    });
    return res.status(201).json(festival);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create festival" });
  }
});

// Update festival (employees can update most fields; reporter can only add notes?)
router.patch("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const festival = await Festival.findById(req.params.id);
    if (!festival) return res.status(404).json({ error: "Festival not found" });

    const isEmployee = req.authUser?.role === "employee";
    const updates: any = {};

    if (isEmployee) {
      const {
        name,
        description,
        coordinates,
        status,
        assignedTo,
        notes,
        festivalType,
        siteType,
        siteName,
        landmark,
        process
      } = req.body || {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (festivalType !== undefined && ["ganesh", "durga", "other"].includes(festivalType)) updates.festivalType = festivalType;
      if (siteType !== undefined && ["lake", "river", "beach", "pond", "spot", "other"].includes(siteType)) updates.siteType = siteType;
      if (siteName !== undefined) updates.siteName = siteName;
      if (landmark !== undefined) updates.landmark = landmark;
      if (coordinates !== undefined) {
        const lat = typeof coordinates?.lat === "number" ? coordinates.lat : Number(coordinates?.lat);
        const lng = typeof coordinates?.lng === "number" ? coordinates.lng : Number(coordinates?.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          updates.coordinates = { lat, lng };
        }
      }
      if (status !== undefined && ["pending", "in_progress", "completed", "dismissed"].includes(status)) {
        updates.status = status;
      }
      if (assignedTo !== undefined) updates.assignedTo = assignedTo;
      if (notes !== undefined) updates.notes = notes;
      if (process !== undefined && typeof process === "object") {
        updates.process = {
          ...(festival as any).process,
          ...process,
          checklist: {
            ...((festival as any).process?.checklist || {}),
            ...(process?.checklist || {})
          }
        };
      }

      if (updates.status === "in_progress" && !(festival as any).process?.startedAt) {
        updates.process = {
          ...((updates.process as any) || (festival as any).process || {}),
          startedAt: new Date()
        };
      }
      if (updates.status === "completed") {
        updates.process = {
          ...((updates.process as any) || (festival as any).process || {}),
          stage: "completed",
          completedAt: new Date()
        };
      }
    } else {
      const { notes } = req.body || {};
      if (notes !== undefined) updates.notes = notes;
    }

    if (Object.keys(updates).length === 0) return res.json(festival);

    updates.updatedAt = new Date();
    Object.assign(festival, updates);
    await festival.save();
    return res.json(festival);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update festival" });
  }
});

export default router;
