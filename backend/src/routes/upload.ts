import express from "express";
import multer from "multer";
import { Photo } from "../models/photo";

const router = express.Router();

// Multer setup to store files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Route: Upload photo
router.post("/upload", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const newPhoto = new Photo({
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      imageBase64: req.file.buffer.toString("base64"),
    });

    await newPhoto.save();
    res.json({ message: "Photo uploaded successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// ✅ Route: Fetch all uploaded photos
router.get("/photos", async (req, res) => {
  try {
    const photos = await Photo.find().sort({ uploadedAt: -1 });
    res.json(photos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch photos" });
  }
});

export default router; // ✅ VERY IMPORTANT
