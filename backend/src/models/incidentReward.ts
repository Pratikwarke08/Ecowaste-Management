import mongoose from "mongoose";

const incidentRewardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  incidentId: { type: mongoose.Schema.Types.ObjectId, ref: "Incident", required: true, index: true },
  points: { type: Number, required: true },
  note: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now, index: true }
});

incidentRewardSchema.index({ userId: 1, createdAt: -1 });

export const IncidentReward = mongoose.model("IncidentReward", incidentRewardSchema);
