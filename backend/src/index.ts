import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import uploadRoutes from "./routes/upload";
import authRoutes from "./routes/auth";
import reportsRoutes from "./routes/reports";
import rewardsRoutes from "./routes/rewards";
import usersRoutes from "./routes/users";
import dustbinsRoutes from "./routes/dustbins";
import dashboardRoutes from "./routes/dashboard";
import complaintsRoutes from "./routes/complaints";
import incidentsRoutes from "./routes/incidents";

dotenv.config();

const app = express();

/* =========================
   CORS (PRODUCTION SAFE)
========================= */
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN
      ? [process.env.FRONTEND_ORIGIN]
      : "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

/* =========================
   BODY PARSER
========================= */
app.use(express.json({ limit: "10mb" }));

/* =========================
   DATABASE CONNECTION
========================= */
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  throw new Error("❌ MONGO_URI is not defined");
}

const isAtlas = /mongodb\+srv|mongodb\.net/i.test(mongoUri);
const dbSource = isAtlas ? "MongoDB Atlas" : "Local MongoDB";
const dbHostPart = (mongoUri.split("@").pop() || "").split("/")[0] || "unknown";

mongoose
  .connect(mongoUri)
  .then(() =>
    console.log(
      `✅ MongoDB connected • Source: ${dbSource} • Host: ${dbHostPart}`
    )
  )
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

/* =========================
   HEALTH & ROOT ROUTES
========================= */
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "Ecowaste Backend",
    db: dbSource
  });
});

app.get("/api/health/db", (_req, res) => {
  const conn = mongoose.connection;
  res.json({
    source: dbSource,
    host: dbHostPart,
    name: conn.name,
    readyState: conn.readyState
  });
});

/* =========================
   API ROUTES
========================= */
app.use("/api", uploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/rewards", rewardsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/dustbins", dustbinsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/complaints", complaintsRoutes);
app.use("/api/incidents", incidentsRoutes);

/* =========================
   404 HANDLER (JSON ONLY)
========================= */
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

/* =========================
   GLOBAL ERROR HANDLER
========================= */
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("❌ Server error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error"
  });
});

/* =========================
   SERVER START
========================= */
const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});