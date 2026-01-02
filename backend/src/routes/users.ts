import express from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();

function serializeUser(user: any) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    profile: user.profile || {},
    settings: user.settings || {},
    withdrawnPoints: user.withdrawnPoints || 0,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    lastActiveAt: user.lastActiveAt,
    currentStreak: user.currentStreak || 0,
    longestStreak: user.longestStreak || 0
  };
}

router.get("/me", authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.authUser;
  return res.json({ user: serializeUser(user) });
});

router.put("/me", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.authUser;
    const { name, profile, settings } = req.body || {};

    if (typeof name === "string") {
      user.name = name;
    }
    if (profile && typeof profile === "object") {
      user.profile = {
        ...(user.profile || {}),
        ...profile
      };
    }
    if (settings && typeof settings === "object") {
      user.settings = {
        ...(user.settings || {}),
        ...settings
      };
    }

    await user.save();
    return res.json({ user: serializeUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;


