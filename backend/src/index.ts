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
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10mb" }));

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ecowaste";

const dbHostPart = (mongoUri.split("@").pop() || "").split("/")[0] || "";
const isAtlas = /mongodb\+srv|mongodb\.net/i.test(mongoUri);
const dbSource = isAtlas ? "MongoDB Atlas" : "Local (Compass)";

mongoose.connect(mongoUri)
  .then(() => console.log(`✅ MongoDB connected • Source: ${dbSource} • Host: ${dbHostPart}`))
  .catch(err => console.error("❌ MongoDB connection error:", err));

app.get("/api/health/db", (_req, res) => {
  const conn = mongoose.connection;
  res.json({
    source: dbSource,
    host: dbHostPart,
    name: conn.name,
    readyState: conn.readyState
  });
});

app.use("/api", uploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/rewards", rewardsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/dustbins", dustbinsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/complaints", complaintsRoutes);
app.use("/api/incidents", incidentsRoutes);

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});


// mongodb connection is configured via MONGO_URI