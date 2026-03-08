import mongoose from "mongoose";

const governmentCaseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    caseType: {
      type: String,
      enum: ["incident_review", "compliance", "escalation", "audit"],
      required: true,
      index: true,
    },
    referenceId: { type: String, default: "", trim: true, index: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["submitted", "under_review", "approved", "rejected"],
      default: "submitted",
      index: true,
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

governmentCaseSchema.index({ caseType: 1, status: 1, createdAt: -1 });

export const GovernmentCase = mongoose.model("GovernmentCase", governmentCaseSchema);
