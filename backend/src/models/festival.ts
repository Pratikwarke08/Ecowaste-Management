import mongoose from "mongoose";

const coordinateSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const festivalSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  festivalType: { type: String, enum: ["ganesh", "durga", "other"], default: "other", index: true },
  siteType: { type: String, enum: ["lake", "river", "beach", "pond", "spot", "other"], default: "spot", index: true },
  siteName: { type: String, default: "" },
  landmark: { type: String, default: "" },
  description: { type: String, default: "" },
  coordinates: { type: coordinateSchema, required: true, index: true },
  imageBase64: { type: String, required: true },
  status: { type: String, enum: ["pending", "in_progress", "completed", "dismissed"], default: "pending", index: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  notes: { type: String, default: "" },
  process: {
    stage: { type: String, enum: ["not_started", "prep", "gas_mixing", "crystal_formation", "completed"], default: "not_started" },
    notes: { type: String, default: "" },
    checklist: {
      ammoniaContainerReady: { type: Boolean, default: false },
      co2ContainerReady: { type: Boolean, default: false },
      gasesConnected: { type: Boolean, default: false },
      solutionCooled: { type: Boolean, default: false },
      crystalsObserved: { type: Boolean, default: false }
    },
    startedAt: { type: Date },
    completedAt: { type: Date }
  },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now, index: true },
});

festivalSchema.pre("save", function (next) {
  // @ts-ignore
  this.updatedAt = new Date();
  next();
});

export const Festival = mongoose.model("Festival", festivalSchema);
