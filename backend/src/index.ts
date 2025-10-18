import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import uploadRoutes from "./routes/upload";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

mongoose.connect("mongodb+srv://ecowaste:220705@cluster0.wetdmil.mongodb.net/ecowaste")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

app.use("/api", uploadRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// mongodb+srv://ecowaste:220705@cluster0.wetdmil.mongodb.net/ecowaste