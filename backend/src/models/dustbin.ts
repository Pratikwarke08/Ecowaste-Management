import mongoose from "mongoose";

const coordinateSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
}, { _id: false });

const dustbinSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  sector: { type: String },
  type: { type: String, default: "mixed" },
  capacityLiters: { type: Number, default: 0 },
  status: { type: String, enum: ["active", "inactive", "maintenance", "full"], default: "active", index: true },
  fillLevel: { type: Number, min: 0, max: 100, default: 0 },
  coordinates: { type: coordinateSchema, required: true },
  photoBase64: { type: String, required: true }, // Current/Latest photo
  initialPhotoBase64: { type: String }, // Original photo at deployment
  photoHistory: [{
    photo: String,
    updatedAt: Date,
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report" }
  }],
  verificationRadius: { type: Number, default: 1.0 }, // Verification radius in meters
  lastEmptiedAt: { type: Date },
  urgent: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

dustbinSchema.index({ "coordinates.lat": 1, "coordinates.lng": 1 });
dustbinSchema.index({ sector: 1 });
dustbinSchema.index({ updatedAt: -1 }); // For sorting
dustbinSchema.index({ status: 1, updatedAt: -1 }); // Compound index for filtered queries

dustbinSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const Dustbin = mongoose.model("Dustbin", dustbinSchema);


