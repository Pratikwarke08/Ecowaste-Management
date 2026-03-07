import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, default: "" }
  },
  { _id: false }
);

const metricsSchema = new mongoose.Schema(
  {
    pm25: { type: Number, default: 0 },
    pm10: { type: Number, default: 0 },
    co2: { type: Number, default: 0 },
    temperature: { type: Number, default: 0 },
    humidity: { type: Number, default: 0 },
    recordedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const verificationSchema = new mongoose.Schema(
  {
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    workerEmail: { type: String, index: true },
    location: { type: locationSchema, required: true },
    photoBase64: { type: String, required: true },
    verifiedAt: { type: Date, default: Date.now, index: true },
    aiDetectedTower: { type: Boolean, default: false },
    verificationStatus: { type: String, enum: ["verified", "flagged"], default: "verified" }
  },
  { _id: true }
);

const maintenanceLogSchema = new mongoose.Schema(
  {
    note: { type: String, default: "" },
    status: { type: String, enum: ["working", "maintenance_needed", "offline"], required: true },
    loggedBy: { type: String, default: "" },
    loggedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const airTowerSchema = new mongoose.Schema(
  {
    towerType: { type: String, enum: ["smog_tower", "artificial_lung"], required: true, index: true },
    towerName: { type: String, required: true, index: true },
    location: { type: locationSchema, required: true, index: true },
    installationDate: { type: Date, required: true, index: true },
    towerHeight: { type: Number, required: true },
    capacity: { type: Number, required: true },
    status: { type: String, enum: ["working", "maintenance_needed", "offline"], default: "working", index: true },
    assignedWorkers: [{ type: String }],
    totalAirProcessedToday: { type: Number, default: 0 },
    pm25Reduction: { type: Number, default: 0 },
    co2Reduction: { type: Number, default: 0 },
    latestMetrics: { type: metricsSchema, default: () => ({}) },
    metricsHistory: [{ type: metricsSchema }],
    verifications: [{ type: verificationSchema }],
    maintenanceLogs: [{ type: maintenanceLogSchema }],
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    ownerEmail: { type: String, index: true }
  },
  { timestamps: true }
);

airTowerSchema.index({ towerType: 1, status: 1, installationDate: -1 });

export const AirTower = mongoose.model("AirTower", airTowerSchema);
