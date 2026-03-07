import express from "express";
import { Report } from "../models/report";
import { Dustbin } from "../models/dustbin";
import { PickupSession } from "../models/pickupSession";
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
const TEMP_PICKUP_TTL_HOURS = Number(process.env.TEMP_PICKUP_TTL_HOURS || "12");

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

type LatLng = { lat: number; lng: number };
type ManualWasteEntry = {
  type?: string;
  subtype?: string;
  quantity?: number;
  unitWeightGrams?: number;
};

const WASTE_WEIGHT_GRAMS: Record<string, number> = {
  "plastic:water bottle": 15,
  "plastic:soft drink bottle": 22,
  "plastic:milk packet": 8,
  "plastic:food wrapper": 5,
  "plastic:carry bag": 6,
  "metal:aluminum can": 14,
  "metal:tin can": 28,
  "glass:glass bottle": 250,
  "paper:newspaper": 50,
  "paper:cardboard": 120,
  "paper:paper cup": 10,
  "organic:food scraps": 120,
  "organic:fruit peel": 80,
  "textile:cloth piece": 90,
  "ewaste:small cable": 35,
  "ewaste:charger": 70
};

function normalizeKey(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function manualEntriesToWeightKg(entries: ManualWasteEntry[]) {
  let totalGrams = 0;
  for (const entry of entries) {
    const type = normalizeKey(entry.type || "");
    const subtype = normalizeKey(entry.subtype || "");
    const key = `${type}:${subtype}`;
    const quantity = Math.max(0, normalizeNumber(entry.quantity, 0));
    const fallbackUnit = WASTE_WEIGHT_GRAMS[key] || 0;
    const unitWeightGrams = Math.max(0, normalizeNumber(entry.unitWeightGrams, fallbackUnit));
    if (quantity > 0 && unitWeightGrams > 0) {
      totalGrams += quantity * unitWeightGrams;
    }
  }
  return Number((totalGrams / 1000).toFixed(4));
}

function aiClassToSubtype(aiClassName: string) {
  const c = normalizeKey(aiClassName);
  if (c.includes("water") && c.includes("bottle")) return "plastic:water bottle";
  if (c.includes("bottle") && c.includes("glass")) return "glass:glass bottle";
  if (c.includes("bottle")) return "plastic:soft drink bottle";
  if (c.includes("can")) return "metal:aluminum can";
  if (c.includes("wrapper")) return "plastic:food wrapper";
  if (c.includes("bag")) return "plastic:carry bag";
  if (c.includes("cardboard")) return "paper:cardboard";
  if (c.includes("newspaper")) return "paper:newspaper";
  if (c.includes("paper cup") || c.includes("cup")) return "paper:paper cup";
  if (c.includes("fruit") || c.includes("peel")) return "organic:fruit peel";
  if (c.includes("food")) return "organic:food scraps";
  if (c.includes("cloth") || c.includes("textile")) return "textile:cloth piece";
  if (c.includes("wire") || c.includes("cable")) return "ewaste:small cable";
  if (c.includes("charger")) return "ewaste:charger";
  return "";
}

function aiWasteItemsToWeightKg(wasteItems: any[]) {
  if (!Array.isArray(wasteItems) || wasteItems.length === 0) return 0;
  let totalGrams = 0;
  for (const item of wasteItems) {
    const subtypeKey = aiClassToSubtype(String(item?.class_name || ""));
    if (!subtypeKey) continue;
    totalGrams += WASTE_WEIGHT_GRAMS[subtypeKey] || 0;
  }
  return Number((totalGrams / 1000).toFixed(4));
}

function parseMaterialTypeFallbackToWeightKg(materialType: string) {
  const tokens = String(materialType || "")
    .split(/[|,;/]/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return 0;
  let grams = 0;
  for (const token of tokens) {
    const subtypeKey = aiClassToSubtype(token);
    grams += subtypeKey ? (WASTE_WEIGHT_GRAMS[subtypeKey] || 0) : 50;
  }
  return Number((grams / 1000).toFixed(4));
}

function estimateReportWasteKg(report: any) {
  const explicitWeight = normalizeNumber(report?.wasteWeightKg, 0);
  if (explicitWeight > 0) return explicitWeight;
  const aiWeight = aiWasteItemsToWeightKg(report?.aiAnalysis?.wasteItems || []);
  if (aiWeight > 0) return aiWeight;
  const materialFallback = parseMaterialTypeFallbackToWeightKg(report?.materialType || "");
  if (materialFallback > 0) return materialFallback;
  return inferWeightFromPoints(normalizeNumber(report?.points, 0));
}

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

function normalizeLocation(value: any): LatLng | null {
  if (!value || typeof value !== "object") return null;
  const lat = normalizeNumber(value.lat, NaN);
  const lng = normalizeNumber(value.lng, NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function ensureVirtualDustbinAccess(req: express.Request, res: express.Response) {
  if (!VIRTUAL_DUSTBIN_KEY) return true;
  const key = req.header("x-virtual-dustbin-key");
  if (!key || key !== VIRTUAL_DUSTBIN_KEY) {
    res.status(401).json({ error: "Invalid virtual dustbin key" });
    return false;
  }
  return true;
}

function getVirtualRequestStage(signals: any) {
  const beforeSubmitted = Boolean(signals?.beforeSubmittedAt || signals?.beforeImageBase64);
  const mainDisposalSubmitted = Boolean(signals?.mainDisposalSubmitted);
  const afterSubmitted = Boolean(signals?.afterSubmittedAt || signals?.afterImageBase64);

  if (!beforeSubmitted) return "before_pending";
  if (!mainDisposalSubmitted) return "waiting_main_disposal";
  if (!afterSubmitted) return "after_pending";
  return "completed";
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

// Finalize an existing report from collector app (used with temp-pickup -> report flow)
router.post("/:id/collector-finalize", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      disposalImageBase64,
      disposalLocation,
      dustbinId,
      materialType,
      wasteWeightKg
    } = req.body || {};

    const normalizedDisposalLocation = normalizeLocation(disposalLocation);
    if (!disposalImageBase64 || !normalizedDisposalLocation) {
      return res.status(400).json({ error: "disposalImageBase64 and disposalLocation are required" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    report.disposalImageBase64 = disposalImageBase64;
    report.disposalLocation = normalizedDisposalLocation as any;
    (report as any).dustbinSignals = {
      ...((report as any).dustbinSignals || {}),
      mainDisposalSubmitted: true
    };
    if (dustbinId) {
      report.dustbinId = dustbinId;
    }
    if (materialType !== undefined) {
      report.materialType = materialType;
    }
    if (typeof wasteWeightKg === "number") {
      report.wasteWeightKg = wasteWeightKg;
    }
    if (!report.collectorEmail && req.authUser?.email) {
      report.collectorEmail = req.authUser.email;
    }
    if (!report.collectorId && req.authUser?._id) {
      report.collectorId = req.authUser._id;
    }

    const signals = (report as any).dustbinSignals || {};
    const mlAnalysis = await runMLAnalysis({
      pickupImageBase64: report.pickupImageBase64,
      dustbinBeforeImageBase64: signals.beforeImageBase64,
      dustbinAfterImageBase64: signals.afterImageBase64,
      dustbinWeightBeforeKg: signals.weightBeforeKg,
      dustbinWeightAfterKg: signals.weightAfterKg,
      dustbinDepthBefore: signals.depthBefore,
      dustbinDepthAfter: signals.depthAfter,
      dustbinDepthUnit: signals.depthUnit
    });

    applyAnalysisToReport(report, mlAnalysis);
    if (typeof report.points === "number" && report.points <= 0) {
      report.points = normalizeNumber(mlAnalysis?.totalPoints, 0);
    }

    if (report.dustbinId) {
      try {
        const dustbin = await Dustbin.findById(report.dustbinId).lean();
        if (dustbin?.coordinates) {
          const distance = getDistanceMeters(normalizedDisposalLocation, {
            lat: dustbin.coordinates.lat,
            lng: dustbin.coordinates.lng
          });
          if (distance !== null) {
            (report as any).aiAnalysis = (report as any).aiAnalysis || {};
            (report as any).aiAnalysis.disposalDistance = distance;
            (report as any).aiAnalysis.verificationThresholdMeters = DUSTBIN_VERIFICATION_DISTANCE_METERS;
            (report as any).aiAnalysis.withinVerificationRange = distance <= DUSTBIN_VERIFICATION_DISTANCE_METERS;
            (report as any).aiAnalysis.nearestDustbin = {
              _id: dustbin._id,
              name: dustbin.name,
              lat: dustbin.coordinates.lat,
              lng: dustbin.coordinates.lng
            };
          }
        }
      } catch (err) {
        console.error("Failed to update disposal distance on collector finalize:", err);
      }
    }

    await report.save();

    return res.json({
      id: report._id,
      points: report.points || 0,
      genuinity: (report as any).aiAnalysis?.genuinity || null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to finalize report from collector app" });
  }
});

// Create a temporary pickup session right after pickup capture
router.post("/pickup-temp", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const pickupImageBase64 = req.body?.pickupImageBase64;
    const pickupLocation = normalizeLocation(req.body?.pickupLocation);
    if (!pickupImageBase64 || !pickupLocation) {
      return res.status(400).json({ error: "pickupImageBase64 and pickupLocation are required" });
    }

    const expiresAt = new Date(Date.now() + Math.max(1, TEMP_PICKUP_TTL_HOURS) * 60 * 60 * 1000);
    const session = await PickupSession.create({
      pickupImageBase64,
      pickupLocation,
      collectorEmail: req.authUser?.email,
      collectorId: req.authUser?._id,
      status: "active",
      expiresAt
    });

    return res.status(201).json({
      tempPickupId: session._id,
      status: session.status,
      expiresAt: session.expiresAt
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create temporary pickup session" });
  }
});

// Virtual dustbin context bootstrap for temporary pickup session
router.get("/pickup-temp/:tempId/virtual-dustbin/context", async (req, res) => {
  try {
    if (!ensureVirtualDustbinAccess(req, res)) {
      return;
    }

    const session = await PickupSession.findById(req.params.tempId)
      .select("_id status pickupImageBase64 pickupLocation collectorEmail expiresAt linkedReportId createdAt")
      .lean();

    if (!session) {
      return res.status(404).json({ error: "Temporary pickup session not found" });
    }

    if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ error: "Temporary pickup session has expired" });
    }

    return res.json({
      tempPickupId: session._id,
      status: session.status,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      collectorEmail: session.collectorEmail,
      pickupImageBase64: session.pickupImageBase64,
      pickupLocation: session.pickupLocation,
      linkedReportId: session.linkedReportId || null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load temporary pickup context" });
  }
});

// Virtual dustbin public dustbin list (secured via key if configured)
router.get("/virtual-dustbin/dustbins", async (req, res) => {
  try {
    if (!ensureVirtualDustbinAccess(req, res)) {
      return;
    }
    const dustbins = await Dustbin.find({ status: { $ne: "maintenance" } })
      .select("_id name sector type coordinates status verificationRadius")
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ dustbins });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load dustbins for virtual dustbin" });
  }
});

// Virtual dustbin dashboard: requests and progress by dustbin
router.get("/virtual-dustbin/dashboard", async (req, res) => {
  try {
    if (!ensureVirtualDustbinAccess(req, res)) {
      return;
    }

    const dustbinId = typeof req.query.dustbinId === "string" ? req.query.dustbinId.trim() : "";
    const limitRaw = Number(req.query.limit || 50);
    const limit = Math.max(1, Math.min(200, Number.isFinite(limitRaw) ? limitRaw : 50));

    const dustbinQuery: any = { status: { $ne: "maintenance" } };
    if (dustbinId) {
      dustbinQuery._id = dustbinId;
    }

    const dustbins = await Dustbin.find(dustbinQuery)
      .select("_id name sector type status coordinates")
      .sort({ updatedAt: -1 })
      .lean();

    const reportQuery: any = {
      dustbinId: { $in: dustbins.map((d: any) => d._id) }
    };

    const reports = await Report.find(reportQuery)
      .select("_id dustbinId collectorEmail status submittedAt verifiedAt points dustbinSignals")
      .sort({ submittedAt: -1 })
      .limit(limit)
      .lean();

    const byDustbin = new Map<string, any>();
    for (const dustbin of dustbins as any[]) {
      byDustbin.set(String(dustbin._id), {
        dustbinId: String(dustbin._id),
        name: dustbin.name,
        sector: dustbin.sector,
        type: dustbin.type,
        status: dustbin.status,
        coordinates: dustbin.coordinates,
        counts: {
          total: 0,
          before_pending: 0,
          waiting_main_disposal: 0,
          after_pending: 0,
          completed: 0
        }
      });
    }

    const requestItems = (reports as any[]).map((report) => {
      const stage = getVirtualRequestStage(report.dustbinSignals || {});
      const dustbinKey = String(report.dustbinId || "");
      const bucket = byDustbin.get(dustbinKey);
      if (bucket) {
        bucket.counts.total += 1;
        bucket.counts[stage] += 1;
      }

      return {
        reportId: String(report._id),
        dustbinId: dustbinKey,
        collectorEmail: report.collectorEmail || "Unknown",
        status: report.status || "pending",
        stage,
        submittedAt: report.submittedAt || null,
        verifiedAt: report.verifiedAt || null,
        points: typeof report.points === "number" ? report.points : 0,
        beforeSubmittedAt: report.dustbinSignals?.beforeSubmittedAt || null,
        afterSubmittedAt: report.dustbinSignals?.afterSubmittedAt || null,
        mainDisposalSubmitted: Boolean(report.dustbinSignals?.mainDisposalSubmitted)
      };
    });

    return res.json({
      dustbinFilter: dustbinId || null,
      totalRequests: requestItems.length,
      dustbins: Array.from(byDustbin.values()),
      requests: requestItems
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load virtual dustbin dashboard data" });
  }
});

// Convert temporary pickup session to a proper report once dustbin is selected
router.post("/pickup-temp/:tempId/finalize", async (req, res) => {
  try {
    if (!ensureVirtualDustbinAccess(req, res)) {
      return;
    }

    const dustbinId = typeof req.body?.dustbinId === "string" ? req.body.dustbinId : "";
    if (!dustbinId) {
      return res.status(400).json({ error: "dustbinId is required" });
    }

    const session = await PickupSession.findById(req.params.tempId);
    if (!session) {
      return res.status(404).json({ error: "Temporary pickup session not found" });
    }
    if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
      session.status = "expired";
      await session.save();
      return res.status(410).json({ error: "Temporary pickup session has expired" });
    }
    if (session.linkedReportId) {
      return res.json({ reportId: session.linkedReportId, tempPickupId: session._id, reused: true });
    }

    const dustbin = await Dustbin.findById(dustbinId).lean();
    if (!dustbin || !dustbin.coordinates) {
      return res.status(404).json({ error: "Dustbin not found" });
    }

    const disposalLocation = normalizeLocation(req.body?.disposalLocation) || {
      lat: dustbin.coordinates.lat,
      lng: dustbin.coordinates.lng
    };

    const mlAnalysis = await runMLAnalysis({
      pickupImageBase64: session.pickupImageBase64,
      dustbinBeforeImageBase64: undefined,
      dustbinAfterImageBase64: undefined,
      dustbinWeightBeforeKg: 0,
      dustbinWeightAfterKg: 0,
      dustbinDepthBefore: 0,
      dustbinDepthAfter: 0,
      dustbinDepthUnit: "meter"
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

    const report = await Report.create({
      pickupImageBase64: session.pickupImageBase64,
      pickupLocation: session.pickupLocation,
      // Placeholder until virtual dustbin before/after is submitted.
      disposalImageBase64: session.pickupImageBase64,
      disposalLocation,
      dustbinId: dustbin._id,
      status: "pending",
      collectorEmail: session.collectorEmail,
      collectorId: session.collectorId,
      points: aiAnalysis?.totalPoints || 0,
      wasteWeightKg: 0,
      dustbinSignals: {
        weightBeforeKg: 0,
        weightAfterKg: 0,
        depthBefore: 0,
        depthAfter: 0,
        depthUnit: "meter",
        mainDisposalSubmitted: false,
        source: "virtual-dustbin",
        submittedAt: new Date()
      },
      aiAnalysis
    });

    session.linkedReportId = report._id as any;
    session.status = "converted";
    await session.save();

    return res.status(201).json({
      tempPickupId: session._id,
      reportId: report._id,
      status: session.status
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to finalize temporary pickup into report" });
  }
});

// Virtual dustbin app update for a report
router.post("/:id/virtual-dustbin", async (req, res) => {
  try {
    if (!ensureVirtualDustbinAccess(req, res)) {
      return;
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
      beforeSubmittedAt: beforeImageBase64 ? new Date() : (report as any).dustbinSignals?.beforeSubmittedAt,
      afterSubmittedAt: afterImageBase64 ? new Date() : (report as any).dustbinSignals?.afterSubmittedAt,
      source: "virtual-dustbin",
      submittedAt: new Date()
    };

    (report as any).dustbinSignals = mergedSignals;
    // Keep disposalImageBase64 as collector-captured disposal evidence.
    // Virtual dustbin after image is stored only in dustbinSignals.afterImageBase64.

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
    if (!ensureVirtualDustbinAccess(req, res)) {
      return;
    }

    const report = await Report.findById(req.params.id)
      .select("_id status collectorEmail submittedAt pickupImageBase64 pickupLocation disposalLocation points dustbinId dustbinSignals aiAnalysis.genuinity")
      .lean();

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    const dustbin = report.dustbinId
      ? await Dustbin.findById(report.dustbinId).select("_id name sector type coordinates status").lean()
      : null;

    return res.json({
      reportId: report._id,
      status: report.status,
      collectorEmail: report.collectorEmail,
      submittedAt: report.submittedAt,
      pickupImageBase64: report.pickupImageBase64,
      pickupLocation: report.pickupLocation,
      disposalLocation: report.disposalLocation,
      dustbinId: report.dustbinId || undefined,
      dustbin: dustbin || undefined,
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
    const query: any = {
      dustbinId,
      status: "approved",
      "dustbinSignals.afterImageBase64": { $exists: true, $ne: "" }
    };

    const report = await Report.findOne(query)
      .sort({ verifiedAt: -1, submittedAt: -1 })
      .select("dustbinSignals.afterImageBase64 submittedAt verifiedAt aiAnalysis.nearestDustbin dustbinId")
      .lean();

    if (!report) {
      return res.status(404).json({ error: "No approved virtual after image found for this dustbin" });
    }

    const afterImageBase64 = (report as any).dustbinSignals?.afterImageBase64 || null;
    return res.json({
      afterImageBase64,
      // Backward compatibility for existing frontend usage
      disposalImageBase64: afterImageBase64,
      submittedAt: report.submittedAt,
      verifiedAt: (report as any).verifiedAt,
      nearestDustbin: report.aiAnalysis?.nearestDustbin || null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch latest disposal image" });
  }
});

router.get("/analytics/progress", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const period = String(req.query.period || "month").toLowerCase();
    const now = new Date();
    let fromDate: Date | null = null;
    if (period === "week") fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (period === "month") fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else if (period === "quarter") fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    else if (period === "year") fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const query: any = {};
    if (fromDate) {
      query.submittedAt = { $gte: fromDate };
    }

    const reports = await Report.find(query)
      .select("_id status submittedAt points wasteWeightKg materialType collectorEmail dustbinId aiAnalysis.wasteItems")
      .sort({ submittedAt: -1 })
      .lean();

    const dustbinIds = Array.from(new Set(reports.map((r: any) => String(r.dustbinId || "")).filter(Boolean)));
    const dustbins = await Dustbin.find({ _id: { $in: dustbinIds } })
      .select("_id name sector type")
      .lean();
    const dustbinMap = new Map<string, any>(dustbins.map((d: any) => [String(d._id), d]));

    const approvedReports = reports.filter((r: any) => r.status === "approved");
    const pendingReports = reports.filter((r: any) => r.status === "pending");
    const rejectedReports = reports.filter((r: any) => r.status === "rejected");

    const bySector = new Map<string, { sector: string; reports: number; totalKg: number }>();
    const byDustbin = new Map<string, { dustbinId: string; name: string; sector: string; reports: number; totalKg: number }>();
    const wasteDistribution = new Map<string, { wasteType: string; subtype: string; reports: number; totalKg: number }>();

    const verifiedRows = approvedReports.map((report: any) => {
      const dustbin = report.dustbinId ? dustbinMap.get(String(report.dustbinId)) : null;
      const sector = dustbin?.sector || "Unknown";
      const dustbinName = dustbin?.name || "Unknown Dustbin";
      const weightKg = estimateReportWasteKg(report);
      const reportId = String(report._id);

      const sectorBucket = bySector.get(sector) || { sector, reports: 0, totalKg: 0 };
      sectorBucket.reports += 1;
      sectorBucket.totalKg += weightKg;
      bySector.set(sector, sectorBucket);

      const dustbinKey = String(report.dustbinId || "unknown");
      const dustbinBucket = byDustbin.get(dustbinKey) || {
        dustbinId: dustbinKey,
        name: dustbinName,
        sector,
        reports: 0,
        totalKg: 0
      };
      dustbinBucket.reports += 1;
      dustbinBucket.totalKg += weightKg;
      byDustbin.set(dustbinKey, dustbinBucket);

      const aiItems = Array.isArray(report.aiAnalysis?.wasteItems) ? report.aiAnalysis.wasteItems : [];
      if (aiItems.length > 0) {
        for (const item of aiItems) {
          const key = aiClassToSubtype(String(item?.class_name || ""));
          if (!key) continue;
          const [type, subtype] = key.split(":");
          const unitKg = (WASTE_WEIGHT_GRAMS[key] || 0) / 1000;
          const dist = wasteDistribution.get(key) || { wasteType: type, subtype, reports: 0, totalKg: 0 };
          dist.reports += 1;
          dist.totalKg += unitKg;
          wasteDistribution.set(key, dist);
        }
      } else if (report.materialType) {
        const key = "manual:manual entry";
        const dist = wasteDistribution.get(key) || { wasteType: "manual", subtype: "manual entry", reports: 0, totalKg: 0 };
        dist.reports += 1;
        dist.totalKg += weightKg;
        wasteDistribution.set(key, dist);
      }

      return {
        reportId,
        submittedAt: report.submittedAt,
        collectorEmail: report.collectorEmail || "Unknown",
        dustbinId: String(report.dustbinId || ""),
        dustbinName,
        sector,
        weightKg: Number(weightKg.toFixed(4)),
        wasteLabel: report.materialType || (aiItems.map((w: any) => String(w.class_name || "")).filter(Boolean).join(", ") || "Unclassified")
      };
    });

    return res.json({
      generatedAt: new Date().toISOString(),
      period,
      counts: {
        total: reports.length,
        verified: approvedReports.length,
        unverified: pendingReports.length + rejectedReports.length,
        pending: pendingReports.length,
        rejected: rejectedReports.length
      },
      totals: {
        verifiedWasteKg: Number(verifiedRows.reduce((sum, r) => sum + r.weightKg, 0).toFixed(4))
      },
      bySector: Array.from(bySector.values()).map((x) => ({ ...x, totalKg: Number(x.totalKg.toFixed(4)) })),
      byDustbin: Array.from(byDustbin.values()).map((x) => ({ ...x, totalKg: Number(x.totalKg.toFixed(4)) })),
      wasteDistribution: Array.from(wasteDistribution.values()).map((x) => ({ ...x, totalKg: Number(x.totalKg.toFixed(4)) })),
      verifiedReports: verifiedRows
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load progress analytics" });
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
    const {
      status,
      points,
      verificationComment,
      verifiedBy,
      materialType,
      wasteWeightKg,
      manualWasteEntries
    } = req.body || {};
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
    }
    if (verificationComment !== undefined) {
      report.verificationComment = verificationComment;
    }
    if (verifiedBy !== undefined) {
      report.verifiedBy = verifiedBy;
    }
    if (materialType !== undefined && typeof materialType === "string") {
      report.materialType = materialType;
    }
    if (typeof wasteWeightKg === "number" && Number.isFinite(wasteWeightKg) && wasteWeightKg >= 0) {
      report.wasteWeightKg = wasteWeightKg;
    }

    if (Array.isArray(manualWasteEntries) && manualWasteEntries.length > 0) {
      const manualWeight = manualEntriesToWeightKg(manualWasteEntries);
      if (manualWeight > 0) {
        report.wasteWeightKg = manualWeight;
      }
      if (!report.materialType) {
        const compact = manualWasteEntries
          .map((e: any) => `${e?.type || "Unknown"} > ${e?.subtype || "Unknown"} x${normalizeNumber(e?.quantity, 0)}`)
          .join(" | ");
        report.materialType = compact;
      }
    }
    if (status === "approved") {
      (report as any).verifiedAt = new Date();
      if (!report.wasteWeightKg || report.wasteWeightKg <= 0) {
        const aiWeight = aiWasteItemsToWeightKg((report as any)?.aiAnalysis?.wasteItems || []);
        if (aiWeight > 0) {
          report.wasteWeightKg = aiWeight;
        } else if (report.materialType) {
          report.wasteWeightKg = parseMaterialTypeFallbackToWeightKg(report.materialType);
        } else if (typeof points === "number") {
          report.wasteWeightKg = inferWeightFromPoints(points);
        }
      }
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
