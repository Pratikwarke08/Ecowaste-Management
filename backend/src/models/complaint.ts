import mongoose from "mongoose";

const locationSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
}, { _id: false });

const complaintSchema = new mongoose.Schema({
  type: { type: String, enum: ["complaint", "suggestion", "issue"], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  photoBase64: { type: String },
  location: { type: locationSchema, required: true },
  citizenName: { type: String, required: true },
  citizenEmail: { type: String, required: true },
  citizenPhone: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  status: { type: String, enum: ["pending", "in_progress", "resolved", "rejected"], default: "pending", index: true },
  priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resolutionComment: { type: String },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

// Geospatial index for location queries
complaintSchema.index({ location: "2dsphere" });

// Compound indexes
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ type: 1, status: 1 });
complaintSchema.index({ priority: 1, status: 1 });
complaintSchema.index({ citizenEmail: 1, createdAt: -1 });

complaintSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const Complaint = mongoose.model("Complaint", complaintSchema);
