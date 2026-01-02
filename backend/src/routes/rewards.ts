import express from "express";
import jwt from "jsonwebtoken";
import { Report } from "../models/report";
import { User } from "../models/user";
import { Withdrawal } from "../models/withdrawal";
import { IncidentReward } from "../models/incidentReward";

const router = express.Router();

const POINTS_PER_RUPEE = Number(process.env.POINTS_PER_RUPEE || "100");

function getEmailFromAuthHeader(authHeader?: string | null): string | undefined {
  try {
    if (!authHeader) return undefined;
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const payload: any = jwt.decode(token);
    return payload?.email;
  } catch {
    return undefined;
  }
}

async function buildSummary(email: string) {
  const user = await User.findOne({ email }).lean();
  if (!user) {
    throw new Error("User not found");
  }

  // Use aggregation pipeline for much faster calculations
  const [approvedStats, pendingCount, recentEarnings, transactions, incidentRewardsAgg, recentIncidentRewards] = await Promise.all([
    // Calculate lifetime points using aggregation (much faster)
    Report.aggregate([
      { $match: { collectorEmail: email, status: "approved" } },
      { $group: { _id: null, totalPoints: { $sum: "$points" } } }
    ]),
    // Count pending reports
    Report.countDocuments({ collectorEmail: email, status: "pending" }),
    // Get recent earning transactions (limit fields for speed)
    Report.find({ collectorEmail: email, status: "approved" })
      .select('points verificationComment submittedAt')
      .sort({ submittedAt: -1 })
      .limit(10)
      .lean(),
    // Get withdrawal transactions
    Withdrawal.find({ collectorEmail: email })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    // Incident rewards lifetime sum
    IncidentReward.aggregate([
      { $match: { } },
      // Join user to filter by email
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.email': email } },
      { $group: { _id: null, totalPoints: { $sum: '$points' } } }
    ]),
    // Recent incident rewards
    IncidentReward.aggregate([
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $match: { 'user.email': email } },
      { $sort: { createdAt: -1 } },
      { $limit: 10 }
    ])
  ]);

  const lifetimeReportPoints = approvedStats[0]?.totalPoints || 0;
  const lifetimeIncidentPoints = incidentRewardsAgg[0]?.totalPoints || 0;
  const lifetimePoints = lifetimeReportPoints + lifetimeIncidentPoints;
  const withdrawnPoints = user.withdrawnPoints || 0;
  const availablePoints = Math.max(lifetimePoints - withdrawnPoints, 0);
  const availableRupees = availablePoints / POINTS_PER_RUPEE;
  const withdrawnRupees = withdrawnPoints / POINTS_PER_RUPEE;

  const withdrawalTransactions = transactions.map(t => ({
    id: t._id,
    type: "withdrawn" as const,
    amountPoints: t.amountPoints,
    amountRupees: t.amountRupees,
    status: t.status,
    description: "Withdrawal processed",
    createdAt: t.createdAt
  }));

  const earningTransactions = recentEarnings.map(report => ({
    id: report._id,
    type: "earned" as const,
    amountPoints: report.points || 0,
    amountRupees: (report.points || 0) / POINTS_PER_RUPEE,
    status: "completed",
    description: report.verificationComment || "Approved waste collection report",
    createdAt: report.submittedAt
  }));

  const incidentTransactions = recentIncidentRewards.map((r: any) => ({
    id: r._id,
    type: "earned" as const,
    amountPoints: r.points || 0,
    amountRupees: (r.points || 0) / POINTS_PER_RUPEE,
    status: "completed",
    description: r.note || "Incident reward",
    createdAt: r.createdAt
  }));

  const combinedTransactions = [...earningTransactions, ...incidentTransactions, ...withdrawalTransactions]
    .sort((a, b) => (b.createdAt?.getTime?.() || new Date(b.createdAt).getTime()) - (a.createdAt?.getTime?.() || new Date(a.createdAt).getTime()))
    .slice(0, 10);

  return {
    lifetimePoints,
    withdrawnPoints,
    availablePoints,
    availableRupees,
    withdrawnRupees,
    pendingReports: pendingCount,
    conversion: {
      pointsPerRupee: POINTS_PER_RUPEE,
      rupeesPerPoint: 1 / POINTS_PER_RUPEE
    },
    transactions: combinedTransactions
  };
}

router.get("/summary", async (req, res) => {
  try {
    const email = getEmailFromAuthHeader(req.headers.authorization || undefined);
    if (!email) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const summary = await buildSummary(email);
    return res.json(summary);
  } catch (err: any) {
    console.error(err);
    if (err.message === "User not found") {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(500).json({ error: "Failed to load rewards summary" });
  }
});

router.post("/withdraw", async (req, res) => {
  try {
    const email = getEmailFromAuthHeader(req.headers.authorization || undefined);
    if (!email) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { amountPoints: rawPoints, amountRupees: rawRupees, paymentMethod, paymentDetails } = req.body || {};
    let amountPoints = Number(rawPoints) || 0;
    let amountRupees = Number(rawRupees) || 0;

    if (amountPoints <= 0 && amountRupees <= 0) {
      return res.status(400).json({ error: "Amount required" });
    }

    if (amountPoints > 0 && amountRupees === 0) {
      amountRupees = amountPoints / POINTS_PER_RUPEE;
    } else if (amountRupees > 0 && amountPoints === 0) {
      amountPoints = Math.round(amountRupees * POINTS_PER_RUPEE);
    }

    if (amountPoints <= 0 || amountRupees <= 0) {
      return res.status(400).json({ error: "Invalid withdrawal amount" });
    }

    const summary = await buildSummary(email);
    if (amountPoints > summary.availablePoints) {
      return res.status(400).json({ error: "Insufficient points for withdrawal" });
    }

    await User.updateOne({ email }, { $inc: { withdrawnPoints: amountPoints } });
    await Withdrawal.create({
      collectorEmail: email,
      amountPoints,
      amountRupees,
      paymentMethod,
      paymentDetails,
      status: "completed" // In a real app, this might be "pending" until webhook confirmation
    });

    const updatedSummary = await buildSummary(email);
    return res.json(updatedSummary);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to process withdrawal" });
  }
});

export default router;


