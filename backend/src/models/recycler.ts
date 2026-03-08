import mongoose from "mongoose";

const coordinateSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const recyclerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    company: { type: String, default: "", trim: true },
    location: { type: coordinateSchema, required: true },
    contact: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, unique: true, sparse: true },
  },
  { timestamps: true, collection: "recyclers" }
);

export const Recycler = mongoose.model("Recycler", recyclerSchema);
