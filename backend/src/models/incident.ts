import mongoose from "mongoose";

const coordinateSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const employeeLiveLocationSchema = new mongoose.Schema(
  {
    coordinates: { type: coordinateSchema, required: true },
    updatedAt: { type: Date, default: Date.now, index: true },
  },
  { _id: false }
);

const timelineSchema = new mongoose.Schema(
  {
    assignedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    resolutionMinutes: { type: Number },
  },
  { _id: false }
);

const helperEmployeeSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    requestedAt: { type: Date, default: Date.now },
    joinedAt: { type: Date, default: Date.now },
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
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  helperEmployees: { type: [helperEmployeeSchema], default: [] },
  employeeLiveLocation: { type: employeeLiveLocationSchema, default: null },
  timeline: { type: timelineSchema, default: {} },
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
