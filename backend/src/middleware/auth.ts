import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

export interface AuthenticatedRequest extends Request {
  authUser?: any;
  tokenPayload?: any;
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const payload: any = jwt.verify(token, JWT_SECRET);
    if (!payload?.sub) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (typeof payload.sessionVersion === "number" && payload.sessionVersion !== user.tokenVersion) {
      return res.status(401).json({ error: "Session expired" });
    }
    req.authUser = user;
    req.tokenPayload = payload;
    if (!user.lastActiveAt || user.lastActiveAt.getTime() < Date.now() - 60000) {
      user.lastActiveAt = new Date();
      await user.save({ timestamps: false });
    }
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Unauthorized" });
  }
}


