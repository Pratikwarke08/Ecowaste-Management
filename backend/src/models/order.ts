import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    recycler_id: { type: mongoose.Schema.Types.ObjectId, ref: "Recycler", required: true, index: true },
    listing_id: { type: mongoose.Schema.Types.ObjectId, ref: "WasteListing", required: true, index: true },
    quantity: { type: Number, required: true, min: 0.01 },
    total_price: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["created", "confirmed", "completed", "cancelled"], default: "created", index: true },
  },
  { timestamps: true, collection: "orders" }
);

export const Order = mongoose.model("Order", orderSchema);
