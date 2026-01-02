import mongoose from "mongoose";

const locationSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
}, { _id: false });

const reportSchema = new mongoose.Schema({
  pickupImageBase64: { type: String, required: true },
  pickupLocation: { type: locationSchema, required: true },
  disposalImageBase64: { type: String, required: true },
  disposalLocation: { type: locationSchema, required: true },
  dustbinId: { type: mongoose.Schema.Types.ObjectId, ref: "Dustbin", index: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  collectorEmail: { type: String, index: true },
  collectorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  points: { type: Number, default: 0 },
  wasteWeightKg: { type: Number, default: 0 },
  materialType: { type: String },
  verificationComment: { type: String },
  verifiedBy: { type: String },
  submittedAt: { type: Date, default: Date.now, index: true },
  aiAnalysis: {
    wasteItems: [{
      class_name: String,
      confidence: Number,
      bbox: [Number],
      points: Number
    }],
    totalPoints: Number,
    confidenceMet: Boolean,
    dustbinCapacity: {
      capacity_percentage: Number,
      is_full: Boolean,
      bbox: [Number]
    },
    nearestDustbin: {
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
      lat: Number,
      lng: Number
    },
    disposalDistance: Number
  }
});

// Compound indexes for common query patterns
reportSchema.index({ collectorEmail: 1, status: 1 });
reportSchema.index({ collectorEmail: 1, submittedAt: -1 });
reportSchema.index({ status: 1, submittedAt: -1 });

export const Report = mongoose.model("Report", reportSchema);


