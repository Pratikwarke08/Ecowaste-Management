import mongoose from "mongoose";

const coordinateSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const incidentSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: [
      "pothole",
      "accident",
      "unethical_activity",
      "dead_animal",
      "suspicious_activity",
      "beggar",
      "tree_break",
      "electricity_pole_issue",
      "unauthorized_logging",
      "other",
    ],
    required: true,
    index: true,
  },
  description: { type: String, default: "" },
  coordinates: { type: coordinateSchema, required: true, index: true },
  imageBase64: { type: String, required: true },
  urgency: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium", index: true },
  status: { type: String, enum: ["reported", "acknowledged", "in_progress", "resolved", "dismissed"], default: "reported", index: true },
  rewarded: { type: Boolean, default: false, index: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now, index: true },
});

incidentSchema.pre("save", function (next) {
  // @ts-ignore
  this.updatedAt = new Date();
  next();
});

export const Incident = mongoose.model("Incident", incidentSchema);
