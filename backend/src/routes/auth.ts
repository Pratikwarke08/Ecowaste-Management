import express from "express";
import mongoose from "mongoose";
import { User } from "../models/user";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function issueToken(user: any) {
  return jwt.sign(
    { sub: user._id, email: user.email, role: user.role, sessionVersion: user.tokenVersion },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/signup", async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Database not connected. Please check MongoDB connection." });
    }

    const { name, email, password, role } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role === "employee" ? "employee" : "collector",
      lastLoginAt: new Date(),
      lastActiveAt: new Date()
    });
    const token = issueToken(user);
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile || {},
        settings: user.settings || {}
      }
    });
  } catch (err: any) {
    console.error("Signup error:", err);
    const errorMessage = err?.message || "Signup failed";
    return res.status(500).json({ error: errorMessage });
  }
});

router.post("/login", async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Database not connected. Please check MongoDB connection." });
    }

    const { email, password, role } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (role && role !== user.role) {
      return res.status(403).json({ error: `This account is registered as '${user.role}'.` });
    }
    user.lastLoginAt = new Date();
    user.lastActiveAt = new Date();
    await user.save();
    const token = issueToken(user);
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile || {},
        settings: user.settings || {}
      }
    });
  } catch (err: any) {
    console.error("Login error:", err);
    const errorMessage = err?.message || "Login failed";
    return res.status(500).json({ error: errorMessage });
  }
});

router.post("/logout", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.authUser;
    user.tokenVersion += 1;
    await user.save();
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to logout" });
  }
});

export default router;


