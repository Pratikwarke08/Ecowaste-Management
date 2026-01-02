import express from "express";
import { Complaint } from "../models/complaint";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();

// Create a new complaint/suggestion/issue
router.post("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { type, title, description, photoBase64, location, citizenName, citizenPhone, priority } = req.body || {};
    
    if (!type || !title || !description || !location || !citizenName) {
      return res.status(400).json({ error: "Missing required fields: type, title, description, location, citizenName" });
    }

    if (!location.lat || !location.lng) {
      return res.status(400).json({ error: "Invalid location: lat and lng are required" });
    }

    const complaint = await Complaint.create({
      type,
      title,
      description,
      photoBase64,
      location,
      citizenName,
      // Always trust server-side identity
      citizenEmail: req.authUser?.email || undefined,
      createdBy: req.authUser?._id,
      citizenPhone,
      priority: priority || "medium"
    });

    return res.status(201).json(complaint);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create complaint" });
  }
});

// List all complaints
router.get("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { type, status, priority } = req.query;
    const filter: any = {};
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Role-based scoping
    const isEmployee = req.authUser?.role === "employee";
    if (!isEmployee) {
      // Collectors: only see their own complaints
      filter.$or = [
        { createdBy: req.authUser?._id },
        { citizenEmail: req.authUser?.email }
      ];
    }

    const complaints = await Complaint.find(filter)
      .populate("assignedTo", "name email")
      .populate("resolvedBy", "name email")
      .sort({ createdAt: -1 });

    return res.json(complaints);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch complaints" });
  }
});

// Get single complaint
router.get("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("assignedTo", "name email")
      .populate("resolvedBy", "name email");
    
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // Access control: employees can view all; collectors only their own
    const isEmployee = req.authUser?.role === "employee";
    const isOwner = complaint.createdBy?.toString() === req.authUser?._id?.toString() || complaint.citizenEmail === req.authUser?.email;
    if (!isEmployee && !isOwner) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.json(complaint);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch complaint" });
  }
});

// Update complaint (assign, resolve, etc.)
router.patch("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.authUser?.role !== "employee") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { status, priority, assignedTo, resolutionComment } = req.body || {};
    
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // Update fields
    if (status !== undefined) complaint.status = status;
    if (priority !== undefined) complaint.priority = priority;
    if (assignedTo !== undefined) complaint.assignedTo = assignedTo;
    if (resolutionComment !== undefined) complaint.resolutionComment = resolutionComment;
    
    // Set resolved info if status is resolved
    if (status === "resolved") {
      complaint.resolvedBy = req.authUser?._id;
      complaint.resolvedAt = new Date();
    }

    await complaint.save();
    
    const updatedComplaint = await Complaint.findById(req.params.id)
      .populate("assignedTo", "name email")
      .populate("resolvedBy", "name email");
    
    return res.json(updatedComplaint);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update complaint" });
  }
});

// Delete complaint
router.delete("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.authUser?.role !== "employee") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    return res.json({ message: "Complaint deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete complaint" });
  }
});

export default router;
