import express from "express";
import { Report } from "../models/report";
import { Dustbin } from "../models/dustbin";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const router = express.Router();
const POINTS_PER_KG = Number(process.env.POINTS_PER_KG || "10");
const DUSTBIN_VERIFICATION_DISTANCE_METERS = 10;
const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const BACKEND_ROOT = path.resolve(__dirname, "../..");
const ML_SERVICE_URL = process.env.ML_SERVICE_URL;
const VIRTUAL_DUSTBIN_KEY = process.env.VIRTUAL_DUSTBIN_KEY;

type WasteDetection = {
  wasteItems?: Array<{
    class_name: string;
    confidence: number;
    bbox?: number[];
    points?: number;
    estimatedWeightRangeGrams?: { min?: number; max?: number };
  }>;
  totalPoints?: number;
  confidenceMet?: boolean;
  estimatedWeightRangeGrams?: { min?: number; max?: number };
};

function resolvePythonBinary() {
  const envPython = process.env.AI_PYTHON_PATH;
  if (envPython && fs.existsSync(envPython)) {
    return envPython;
  }

  const candidates = [
    path.join(PROJECT_ROOT, ".venv", "bin", "python3"),
    path.join(BACKEND_ROOT, ".venv", "bin", "python3"),
    "python3"
  ];

  const found = candidates.find((candidate) => candidate === "python3" || fs.existsSync(candidate));
  return found || "python3";
}

function inferWeightFromPoints(points: number) {
  if (!points || POINTS_PER_KG <= 0) return 0;
  return points / POINTS_PER_KG;
}

function getDistanceMeters(
  a: { lat: number; lng: number } | null | undefined,
  b: { lat: number; lng: number } | null | undefined
): number | null {
  if (!a || !b) return null;
  if (
    typeof a.lat !== "number" ||
    typeof a.lng !== "number" ||
    typeof b.lat !== "number" ||
    typeof b.lng !== "number"
  ) {
    return null;
  }
  const R = 6371e3;
  const phi1 = (a.lat * Math.PI) / 180;
  const phi2 = (b.lat * Math.PI) / 180;
  const dPhi = ((b.lat - a.lat) * Math.PI) / 180;
  const dLambda = ((b.lng - a.lng) * Math.PI) / 180;

  const s1 = Math.sin(dPhi / 2);
  const s2 = Math.sin(dLambda / 2);
  const h = s1 * s1 + Math.cos(phi1) * Math.cos(phi2) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function normalizeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function countWasteItems(detection: WasteDetection | null | undefined) {
  return Array.isArray(detection?.wasteItems) ? detection!.wasteItems!.length : 0;
}

function toDepthPercentage(value: number, unit: string) {
  if (unit === "meter") {
    return Math.max(0, Math.min(100, value * 10));
  }
  return Math.max(0, Math.min(100, value));
}

function computeGenuinity(
  pickupResult: WasteDetection,
  beforeResult: WasteDetection,
  afterResult: WasteDetection,
  dustbinSignals: any
) {
  const weightBeforeKg = normalizeNumber(dustbinSignals?.weightBeforeKg, 0);
  const weightAfterKg = normalizeNumber(dustbinSignals?.weightAfterKg, 0);
  const depthBeforeRaw = normalizeNumber(dustbinSignals?.depthBefore, 0);
  const depthAfterRaw = normalizeNumber(dustbinSignals?.depthAfter, 0);
  const depthUnit = dustbinSignals?.depthUnit === "percent" ? "percent" : "meter";

  const observedWeightDeltaGrams = (weightAfterKg - weightBeforeKg) * 1000;
  const depthBeforePercentage = toDepthPercentage(depthBeforeRaw, depthUnit);
  const depthAfterPercentage = toDepthPercentage(depthAfterRaw, depthUnit);
  const depthDeltaPercentage = depthAfterPercentage - depthBeforePercentage;

  const expectedRange = pickupResult?.estimatedWeightRangeGrams || { min: 0, max: 0 };
  const expectedMin = normalizeNumber(expectedRange.min, 0);
  const expectedMax = normalizeNumber(expectedRange.max, 0);

  const beforeCount = countWasteItems(beforeResult);
  const afterCount = countWasteItems(afterResult);
  const imageCountDelta = afterCount - beforeCount;

  const checks: Record<string, boolean> = {
    weightNonNegative: observedWeightDeltaGrams >= 0,
    depthNonNegative: depthDeltaPercentage >= 0,
    imageCountNonNegative: imageCountDelta >= 0,
    atLeastOneSignalIncreased:
      observedWeightDeltaGrams > 0 || depthDeltaPercentage > 0 || imageCountDelta > 0
  };

  if (expectedMin > 0) {
    checks.weightMeetsExpectedLowerBound = observedWeightDeltaGrams >= expectedMin * 0.35;
  }
  if (expectedMax > 0) {
    checks.weightWithinExpectedUpperBound = observedWeightDeltaGrams <= expectedMax * 3;
  }

  const reasons: string[] = [];
  if (!checks.weightNonNegative) reasons.push("Weight decreased after disposal.");
  if (!checks.depthNonNegative) reasons.push("Dustbin depth/capacity reduced after disposal.");
  if (!checks.imageCountNonNegative) reasons.push("Detected waste count reduced in after image.");
  if (!checks.atLeastOneSignalIncreased) reasons.push("No increase observed across weight, depth, or image signals.");
  if (checks.weightMeetsExpectedLowerBound === false) {
    reasons.push("Weight increase is too low for detected pickup waste.");
  }
  if (checks.weightWithinExpectedUpperBound === false) {
    reasons.push("Weight increase is too high for detected pickup waste.");
  }

  const totalChecks = Object.keys(checks).length || 1;
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const confidenceScore = Number(((passedChecks / totalChecks) * 100).toFixed(2));

  const isGenuine =
    confidenceScore >= 70 &&
    checks.weightNonNegative &&
    checks.depthNonNegative &&
    checks.imageCountNonNegative;

  return {
    isGenuine,
    confidenceScore,
    reasons,
    checks,
    observed: {
      weightDeltaGrams: Number(observedWeightDeltaGrams.toFixed(2)),
      depthBeforePercentage: Number(depthBeforePercentage.toFixed(2)),
      depthAfterPercentage: Number(depthAfterPercentage.toFixed(2)),
      depthDeltaPercentage: Number(depthDeltaPercentage.toFixed(2)),
      imageItemCountBefore: beforeCount,
      imageItemCountAfter: afterCount,
      imageItemCountDelta: imageCountDelta
    },
    expectedWeightRangeGrams: {
      min: expectedMin,
      max: expectedMax
    }
  };
}

function runAIDetection(imageBase64: string) {
  let tempImagePath: string | null = null;
  try {
    if (!imageBase64) return null;

    const base64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

    tempImagePath = path.join(os.tmpdir(), `waste_${Date.now()}_${Math.round(Math.random() * 1e8)}.jpg`);
    fs.writeFileSync(tempImagePath, Buffer.from(base64, "base64"));

    const scriptPath = path.resolve(__dirname, "../../../ml/detect_waste.py");

    const pythonBinary = resolvePythonBinary();
    const result = spawnSync(pythonBinary, [scriptPath, tempImagePath], {
      encoding: "utf-8"
    });

    if (result.error) {
      console.error("AI detection error:", result.error);
      return null;
    }
    if (result.status !== 0) {
      console.error(`AI detection failed (python: ${pythonBinary}):`, result.stderr || `Exit code ${result.status}`);
      return null;
    }

    if (!result.stdout) return null;

    const trimmedOutput = result.stdout.trim();
    try {
      return JSON.parse(trimmedOutput);
    } catch {
      const lastLine = trimmedOutput.split("\n").pop() || "";
      try {
        return JSON.parse(lastLine);
      } catch {
        console.error("AI detection parse failed:", result.stdout);
        return null;
      }
    }
  } catch (err) {
    console.error("AI detection failed:", err);
    return null;
  } finally {
    if (tempImagePath && fs.existsSync(tempImagePath)) {
      try {
        fs.unlinkSync(tempImagePath);
      } catch {
        // Best effort cleanup
      }
    }
  }
}

async function runMLAnalysis(payload: any) {
  if (ML_SERVICE_URL) {
    try {
      const endpoint = `${ML_SERVICE_URL.replace(/\/$/, "")}/analyze-report`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        return await response.json();
      }
      const errorBody = await response.text();
      console.error("ML service returned error:", response.status, errorBody);
    } catch (err) {
      console.error("ML service request failed:", err);
    }
  }

  const pickupAnalysis = (runAIDetection(payload.pickupImageBase64) || {}) as WasteDetection;
  const dustbinBeforeAnalysis = payload.dustbinBeforeImageBase64
    ? ((runAIDetection(payload.dustbinBeforeImageBase64) || {}) as WasteDetection)
    : ({ wasteItems: [], totalPoints: 0, confidenceMet: false } as WasteDetection);
  const dustbinAfterAnalysis = payload.dustbinAfterImageBase64
    ? ((runAIDetection(payload.dustbinAfterImageBase64) || {}) as WasteDetection)
    : ({ wasteItems: [], totalPoints: 0, confidenceMet: false } as WasteDetection);

  const genuinity = computeGenuinity(
    pickupAnalysis,
    dustbinBeforeAnalysis,
    dustbinAfterAnalysis,
    {
      weightBeforeKg: payload.dustbinWeightBeforeKg,
      weightAfterKg: payload.dustbinWeightAfterKg,
      depthBefore: payload.dustbinDepthBefore,
      depthAfter: payload.dustbinDepthAfter,
      depthUnit: payload.dustbinDepthUnit
    }
  );

  return {
    pickupAnalysis,
    dustbinBeforeAnalysis,
    dustbinAfterAnalysis,
    genuinity,
    totalPoints: normalizeNumber((pickupAnalysis as any)?.totalPoints, 0)
  };
}

function applyAnalysisToReport(report: any, analysis: any) {
  const pickupAnalysis = analysis?.pickupAnalysis || {};
  report.aiAnalysis = report.aiAnalysis || {};
  report.aiAnalysis.wasteItems = Array.isArray(pickupAnalysis.wasteItems) ? pickupAnalysis.wasteItems : [];
  report.aiAnalysis.totalPoints = normalizeNumber(pickupAnalysis.totalPoints, 0);
  report.aiAnalysis.confidenceMet = Boolean(pickupAnalysis.confidenceMet);
  report.aiAnalysis.estimatedWeightRangeGrams = pickupAnalysis.estimatedWeightRangeGrams || { min: 0, max: 0 };
  report.aiAnalysis.dustbinBeforeAnalysis = analysis?.dustbinBeforeAnalysis || {};
  report.aiAnalysis.dustbinAfterAnalysis = analysis?.dustbinAfterAnalysis || {};
  report.aiAnalysis.genuinity = analysis?.genuinity || {};
}

// Create a report
router.post("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      pickupImageBase64,
      pickupLocation,
      disposalImageBase64,
      disposalLocation,
      dustbinId,
      materialType,
      wasteWeightKg,
      dustbinSignals
    } = req.body || {};

    if (!pickupImageBase64 || !pickupLocation || !disposalImageBase64 || !disposalLocation) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const collectorEmail = req.authUser?.email || req.body.collectorEmail;

    const inputDustbinSignals = {
      beforeImageBase64: dustbinSignals?.beforeImageBase64 || undefined,
      afterImageBase64: dustbinSignals?.afterImageBase64 || undefined,
      weightBeforeKg: normalizeNumber(dustbinSignals?.weightBeforeKg, 0),
      weightAfterKg: normalizeNumber(dustbinSignals?.weightAfterKg, 0),
      depthBefore: normalizeNumber(dustbinSignals?.depthBefore, 0),
      depthAfter: normalizeNumber(dustbinSignals?.depthAfter, 0),
      depthUnit: dustbinSignals?.depthUnit === "percent" ? "percent" : "meter",
      source: dustbinSignals?.source || "collector-app",
      submittedAt: dustbinSignals?.submittedAt ? new Date(dustbinSignals.submittedAt) : new Date()
    };

    const mlAnalysis = await runMLAnalysis({
      pickupImageBase64,
      dustbinBeforeImageBase64: inputDustbinSignals.beforeImageBase64,
      dustbinAfterImageBase64: inputDustbinSignals.afterImageBase64,
      dustbinWeightBeforeKg: inputDustbinSignals.weightBeforeKg,
      dustbinWeightAfterKg: inputDustbinSignals.weightAfterKg,
      dustbinDepthBefore: inputDustbinSignals.depthBefore,
      dustbinDepthAfter: inputDustbinSignals.depthAfter,
      dustbinDepthUnit: inputDustbinSignals.depthUnit
    });

    const aiAnalysis: any = {
      wasteItems: Array.isArray(mlAnalysis?.pickupAnalysis?.wasteItems) ? mlAnalysis.pickupAnalysis.wasteItems : [],
      totalPoints: normalizeNumber(mlAnalysis?.totalPoints, 0),
      confidenceMet: Boolean(mlAnalysis?.pickupAnalysis?.confidenceMet),
      estimatedWeightRangeGrams: mlAnalysis?.pickupAnalysis?.estimatedWeightRangeGrams || { min: 0, max: 0 },
      dustbinBeforeAnalysis: mlAnalysis?.dustbinBeforeAnalysis || {},
      dustbinAfterAnalysis: mlAnalysis?.dustbinAfterAnalysis || {},
      genuinity: mlAnalysis?.genuinity || {}
    };

    if (dustbinId) {
      try {
        const dustbin = await Dustbin.findById(dustbinId).lean();
        if (dustbin && dustbin.coordinates) {
          const distance = getDistanceMeters(disposalLocation, {
            lat: dustbin.coordinates.lat,
            lng: dustbin.coordinates.lng
          });

          if (distance !== null) {
            aiAnalysis.disposalDistance = distance;
            aiAnalysis.verificationThresholdMeters = DUSTBIN_VERIFICATION_DISTANCE_METERS;
            aiAnalysis.withinVerificationRange = distance <= DUSTBIN_VERIFICATION_DISTANCE_METERS;
            aiAnalysis.nearestDustbin = {
              _id: dustbin._id,
              name: dustbin.name,
              lat: dustbin.coordinates.lat,
              lng: dustbin.coordinates.lng
            };
          }
        }
      } catch (err) {
        console.error("Failed to compute disposal distance:", err);
      }
    }

    const report = await Report.create({
      pickupImageBase64,
      pickupLocation,
      disposalImageBase64,
      disposalLocation,
      dustbinId: dustbinId || undefined,
      status: "pending",
      collectorEmail,
      collectorId: req.authUser?._id,
      points: aiAnalysis?.totalPoints || 0,
      wasteWeightKg: typeof wasteWeightKg === "number" ? wasteWeightKg : 0,
      materialType: materialType || undefined,
      dustbinSignals: inputDustbinSignals,
      aiAnalysis
    });

    return res.json({
      id: report._id,
      points: aiAnalysis?.totalPoints || 0,
      genuinity: aiAnalysis?.genuinity || null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create report" });
  }
});

// Virtual dustbin app update for a report
router.post("/:id/virtual-dustbin", async (req, res) => {
  try {
    if (VIRTUAL_DUSTBIN_KEY) {
      const key = req.header("x-virtual-dustbin-key");
      if (!key || key !== VIRTUAL_DUSTBIN_KEY) {
        return res.status(401).json({ error: "Invalid virtual dustbin key" });
      }
    }

    const {
      beforeImageBase64,
      afterImageBase64,
      weightBeforeKg,
      weightAfterKg,
      depthBefore,
      depthAfter,
      depthUnit
    } = req.body || {};

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    const mergedSignals = {
      ...(report as any).dustbinSignals,
      beforeImageBase64: beforeImageBase64 || (report as any).dustbinSignals?.beforeImageBase64,
      afterImageBase64: afterImageBase64 || (report as any).dustbinSignals?.afterImageBase64,
      weightBeforeKg: normalizeNumber(weightBeforeKg, normalizeNumber((report as any).dustbinSignals?.weightBeforeKg, 0)),
      weightAfterKg: normalizeNumber(weightAfterKg, normalizeNumber((report as any).dustbinSignals?.weightAfterKg, 0)),
      depthBefore: normalizeNumber(depthBefore, normalizeNumber((report as any).dustbinSignals?.depthBefore, 0)),
      depthAfter: normalizeNumber(depthAfter, normalizeNumber((report as any).dustbinSignals?.depthAfter, 0)),
      depthUnit: depthUnit === "percent" ? "percent" : ((report as any).dustbinSignals?.depthUnit || "meter"),
      source: "virtual-dustbin",
      submittedAt: new Date()
    };

    (report as any).dustbinSignals = mergedSignals;

    const mlAnalysis = await runMLAnalysis({
      pickupImageBase64: report.pickupImageBase64,
      dustbinBeforeImageBase64: mergedSignals.beforeImageBase64,
      dustbinAfterImageBase64: mergedSignals.afterImageBase64,
      dustbinWeightBeforeKg: mergedSignals.weightBeforeKg,
      dustbinWeightAfterKg: mergedSignals.weightAfterKg,
      dustbinDepthBefore: mergedSignals.depthBefore,
      dustbinDepthAfter: mergedSignals.depthAfter,
      dustbinDepthUnit: mergedSignals.depthUnit
    });

    applyAnalysisToReport(report, mlAnalysis);
    if (typeof report.points === "number" && report.points <= 0) {
      report.points = normalizeNumber(mlAnalysis?.totalPoints, 0);
    }

    await report.save();

    return res.json({
      success: true,
      reportId: report._id,
      genuinity: (report as any).aiAnalysis?.genuinity || null,
      aiPoints: (report as any).aiAnalysis?.totalPoints || 0
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update report with virtual dustbin data" });
  }
});

// Virtual dustbin app context bootstrap for a report
router.get("/:id/virtual-dustbin/context", async (req, res) => {
  try {
    if (VIRTUAL_DUSTBIN_KEY) {
      const key = req.header("x-virtual-dustbin-key");
      if (!key || key !== VIRTUAL_DUSTBIN_KEY) {
        return res.status(401).json({ error: "Invalid virtual dustbin key" });
      }
    }

    const report = await Report.findById(req.params.id)
      .select("_id status collectorEmail submittedAt pickupImageBase64 pickupLocation disposalLocation points dustbinSignals aiAnalysis.genuinity")
      .lean();

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    return res.json({
      reportId: report._id,
      status: report.status,
      collectorEmail: report.collectorEmail,
      submittedAt: report.submittedAt,
      pickupImageBase64: report.pickupImageBase64,
      pickupLocation: report.pickupLocation,
      disposalLocation: report.disposalLocation,
      points: report.points || 0,
      dustbinSignals: (report as any).dustbinSignals || {},
      genuinity: (report as any).aiAnalysis?.genuinity || null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load report context for virtual dustbin" });
  }
});

// List reports (most recent first)
router.get("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const scope = req.query.scope;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const selectFields = "-pickupImageBase64 -disposalImageBase64 -dustbinSignals.beforeImageBase64 -dustbinSignals.afterImageBase64";

    if (scope === "collector") {
      const email = req.authUser?.email;
      if (!email) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const [reports, total] = await Promise.all([
        Report.find({ collectorEmail: email })
          .select(selectFields)
          .sort({ submittedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Report.countDocuments({ collectorEmail: email })
      ]);
      return res.json({ reports, total, page, limit, totalPages: Math.ceil(total / limit) });
    }

    const [reports, total] = await Promise.all([
      Report.find()
        .select(selectFields)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments()
    ]);
    return res.json({ reports, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.get("/latest-disposal-image", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { dustbinId } = req.query;
    if (!dustbinId || typeof dustbinId !== "string") {
      return res.status(400).json({ error: "dustbinId query parameter is required" });
    }
    const query: any = { dustbinId, status: "approved" };

    const report = await Report.findOne(query)
      .sort({ verifiedAt: -1, submittedAt: -1 })
      .select("disposalImageBase64 submittedAt verifiedAt aiAnalysis.nearestDustbin dustbinId")
      .lean();

    if (!report) {
      return res.status(404).json({ error: "No disposal reports found for this dustbin" });
    }

    return res.json({
      disposalImageBase64: report.disposalImageBase64,
      submittedAt: report.submittedAt,
      verifiedAt: (report as any).verifiedAt,
      nearestDustbin: report.aiAnalysis?.nearestDustbin || null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch latest disposal image" });
  }
});

// Get single report details
router.get("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });
    return res.json(report);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.patch("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { status, points, verificationComment, verifiedBy } = req.body || {};
    if (!status || !["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }
    report.status = status;
    if (typeof points === "number") {
      report.points = points;
      if (status === "approved" && (!report.wasteWeightKg || report.wasteWeightKg === 0)) {
        report.wasteWeightKg = inferWeightFromPoints(points);
      }
    }
    if (verificationComment !== undefined) {
      report.verificationComment = verificationComment;
    }
    if (verifiedBy !== undefined) {
      report.verifiedBy = verifiedBy;
    }
    if (status === "approved") {
      (report as any).verifiedAt = new Date();
    }
    await report.save();

    if (status === "approved" && report.dustbinId) {
      const dustbin = await Dustbin.findById(report.dustbinId);
      if (dustbin) {
        if (dustbin.photoBase64) {
          dustbin.photoHistory.push({
            photo: dustbin.photoBase64,
            updatedAt: new Date(),
            reportId: report._id as any
          });
        }
        dustbin.photoBase64 = report.disposalImageBase64;

        if (dustbin.photoHistory.length > 20) {
          const removeCount = dustbin.photoHistory.length - 20;
          dustbin.photoHistory.splice(0, removeCount);
        }

        await dustbin.save();
      }
    }

    return res.json(report);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update report" });
  }
});

export default router;
