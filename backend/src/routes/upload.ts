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
    let saved;
    if (req.file) {
      const newPhoto = new Photo({
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        imageBase64: req.file.buffer.toString("base64"),
      });
      saved = await newPhoto.save();
    } else if (req.body && req.body.imageBase64) {
      const { imageBase64, filename, contentType } = req.body;
      const newPhoto = new Photo({
        filename: filename || `image_${Date.now()}.png`,
        contentType: contentType || "image/png",
        imageBase64,
      });
      saved = await newPhoto.save();
    } else {
      return res.status(400).json({ error: "No file uploaded or imageBase64 provided" });
    }

    res.json({ message: "Photo uploaded successfully!", photoId: saved._id });
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
