import mongoose from "mongoose";

const photoSchema = new mongoose.Schema({
  filename: String,
  contentType: String,
  imageBase64: String, // store image as base64
  uploadedAt: { type: Date, default: Date.now }
});

export const Photo = mongoose.model("Photo", photoSchema);
