import express from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { Report } from "../models/report";
import { Incident } from "../models/incident";
import { IncidentReward } from "../models/incidentReward";
import { User } from "../models/user";
import { Dustbin } from "../models/dustbin";
import { Complaint } from "../models/complaint";
import { RecyclingJob } from "../models/recyclingJob";
import { MarketplaceListing } from "../models/marketplaceListing";
import { GovernmentCase } from "../models/governmentCase";
import { CarbonCreditEntry } from "../models/carbonCreditEntry";

const router = express.Router();

const POINTS_PER_RUPEE = Number(process.env.POINTS_PER_RUPEE || "100");
const POINTS_PER_KG = Number(process.env.POINTS_PER_KG || "10");
const CO2_PER_KG = Number(process.env.CO2_PER_KG || "1.5");

function calculateWeightFromPoints(points: number) {
  if (POINTS_PER_KG <= 0) return 0;
  return points / POINTS_PER_KG;
}

router.get("/collector", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.authUser?.role !== "collector") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const email = req.authUser.email;
    // Use database queries instead of in-memory filtering - much faster
    const [reports, approvedReports, pendingReports, rejectedReports, recentIncidents, recentIncidentRewards] = await Promise.all([
      Report.find({ collectorEmail: email })
        .select('-pickupImageBase64 -disposalImageBase64') // Exclude large images
        .sort({ submittedAt: -1 })
        .limit(50), // Limit recent reports
      Report.find({ collectorEmail: email, status: "approved" })
        .select('points wasteWeightKg submittedAt')
        .lean(), // Use lean() for faster queries when we don't need Mongoose documents
      Report.find({ collectorEmail: email, status: "pending" })
        .select('_id submittedAt')
        .lean(),
      Report.find({ collectorEmail: email, status: "rejected" })
        .select('_id submittedAt')
        .lean(),
      Incident.find({ reporter: req.authUser._id }).sort({ updatedAt: -1 }).limit(20).lean(),
      IncidentReward.find({ userId: req.authUser._id }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const lifetimePoints = approvedReports.reduce((sum, report) => sum + (report.points || 0), 0);
    const withdrawnPoints = req.authUser.withdrawnPoints || 0;
    const availablePoints = Math.max(lifetimePoints - withdrawnPoints, 0);
    const availableRupees = availablePoints / POINTS_PER_RUPEE;
    const withdrawnRupees = withdrawnPoints / POINTS_PER_RUPEE;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // Use database query instead of filtering in memory
    const approvedThisMonth = await Report.find({
      collectorEmail: email,
      status: "approved",
      submittedAt: { $gte: startOfMonth }
    })
      .select('points submittedAt')
      .lean();

    const monthlyGoalReports = Number(process.env.MONTHLY_REPORT_GOAL || "10");
    const monthlyGoalPoints = Number(process.env.MONTHLY_POINTS_GOAL || (monthlyGoalReports * 50));
    const pointsThisMonth = approvedThisMonth.reduce((sum, report) => sum + (report.points || 0), 0);
    const reportsThisMonth = approvedThisMonth.length;

    // Optimize monthly series calculation with aggregation
    const monthlySeries = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthData = await Report.aggregate([
        {
          $match: {
            collectorEmail: email,
            status: "approved",
            submittedAt: { $gte: start, $lt: end }
          }
        },
        {
          $group: {
            _id: null,
            totalPoints: { $sum: "$points" },
            count: { $sum: 1 }
          }
        }
      ]);
      const data = monthData[0] || { totalPoints: 0, count: 0 };
      monthlySeries.push({
        month: start.toLocaleString("default", { month: "short" }),
        points: data.totalPoints || 0,
        reports: data.count || 0
      });
    }

    const recentActivity = reports.slice(0, 10).map(report => ({
      id: report._id,
      status: report.status,
      points: report.points || 0,
      submittedAt: report.submittedAt,
      verificationComment: report.verificationComment || ""
    }));

    const weightCollectedKg = approvedReports.reduce((sum, report) => sum + (report.wasteWeightKg || calculateWeightFromPoints(report.points || 0)), 0);

    return res.json({
      summary: {
        lifetimePoints,
        availablePoints,
        availableRupees,
        pendingReports: pendingReports.length,
        approvedReports: approvedReports.length,
        rejectedReports: rejectedReports.length,
        withdrawnPoints,
        withdrawnRupees
      },
      monthlyProgress: {
        reportsThisMonth,
        pointsThisMonth,
        monthlyGoalReports,
        monthlyGoalPoints,
        progressPercent: monthlyGoalReports ? Math.min((reportsThisMonth / monthlyGoalReports) * 100, 100) : 0
      },
      recentActivity,
      series: monthlySeries,
      wasteCollectedKg: weightCollectedKg,
      earnings: {
        availableRupees,
        withdrawnRupees,
        lifetimePoints
      },
      incidents: {
        recent: recentIncidents,
        recentRewards: recentIncidentRewards
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load collector dashboard" });
  }
});

router.get("/employee", authenticate, async (_req: AuthenticatedRequest, res) => {
  try {
    // Parallel queries for better performance
    const [reports, pendingCount, approvedToday, uniqueCollectors, dustbins, pendingComplaints, urgentComplaints, totalReports, approvedTotal, rejectedTotal] = await Promise.all([
      Report.find()
        .select('-pickupImageBase64 -disposalImageBase64') // Exclude large images
        .sort({ submittedAt: -1 })
        .limit(100)
        .lean(),
      Report.countDocuments({ status: "pending" }),
      Report.countDocuments({
        status: "approved",
        submittedAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }),
      Report.distinct("collectorEmail", { collectorEmail: { $ne: null } }),
      Dustbin.find().lean(),
      Complaint.countDocuments({ status: "pending" }),
      Complaint.countDocuments({ status: { $in: ["pending", "in_progress"] }, priority: { $in: ["high", "urgent"] } }),
      Report.countDocuments(),
      Report.countDocuments({ status: "approved" }),
      Report.countDocuments({ status: "rejected" }),
    ]);

    // Aggregate stats per collector
    const collectorStats = await Report.aggregate([
      { $match: { status: "approved" } },
      {
        $group: {
          _id: "$collectorEmail",
          totalReports: { $sum: 1 },
          totalPoints: { $sum: "$points" },
          totalWeight: { $sum: "$wasteWeightKg" },
          lastActive: { $max: "$submittedAt" },
          avgLat: { $avg: "$disposalLocation.lat" },
          avgLng: { $avg: "$disposalLocation.lng" },
          minLat: { $min: "$disposalLocation.lat" },
          maxLat: { $max: "$disposalLocation.lat" },
          minLng: { $min: "$disposalLocation.lng" },
          maxLng: { $max: "$disposalLocation.lng" }
        }
      },
      { $sort: { totalPoints: -1 } }
    ]);

    const dustbinStats = {
      total: dustbins.length,
      active: dustbins.filter(d => d.status === "active").length,
      full: dustbins.filter(d => d.status === "full").length,
      maintenance: dustbins.filter(d => d.status === "maintenance").length,
      urgent: dustbins.filter(d => d.urgent).length,
      averageFill: dustbins.length
        ? Math.round(dustbins.reduce((sum, d) => sum + (d.fillLevel || 0), 0) / dustbins.length)
        : 0
    };

    const recentReports = reports.slice(0, 10).map(report => ({
      id: report._id,
      status: report.status,
      collectorEmail: report.collectorEmail,
      points: report.points || 0,
      submittedAt: report.submittedAt,
      verificationComment: report.verificationComment || "",
      nearestDustbinName: report.aiAnalysis?.nearestDustbin?.name || null,
      disposalDistance: report.aiAnalysis?.disposalDistance ?? null
    }));

    // Monthly series for the last 6 months for all approved reports
    const now = new Date();
    const monthlySeries = [] as Array<{ month: string; points: number; reports: number }>;
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthData = await Report.aggregate([
        {
          $match: {
            status: "approved",
            submittedAt: { $gte: start, $lt: end }
          }
        },
        {
          $group: {
            _id: null,
            totalPoints: { $sum: { $ifNull: ["$points", 0] } },
            count: { $sum: 1 }
          }
        }
      ]);
      const data = monthData[0] || { totalPoints: 0, count: 0 };
      monthlySeries.push({
        month: start.toLocaleString("default", { month: "short" }),
        points: data.totalPoints || 0,
        reports: data.count || 0
      });
    }

    // Weekly series (last 8 ISO weeks) for approved reports
    function startOfISOWeek(d: Date) {
      const date = new Date(d);
      const day = (date.getDay() + 6) % 7; // 0=Mon..6=Sun
      date.setDate(date.getDate() - day);
      date.setHours(0, 0, 0, 0);
      return date;
    }
    const weeklySeriesData: Array<{ week: string; points: number; reports: number }> = [];
    const baseWeekStart = startOfISOWeek(now);
    for (let i = 7; i >= 0; i--) {
      const start = new Date(baseWeekStart);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const weekData = await Report.aggregate([
        { $match: { status: "approved", submittedAt: { $gte: start, $lt: end } } },
        { $group: { _id: null, totalPoints: { $sum: { $ifNull: ["$points", 0] } }, count: { $sum: 1 } } }
      ]);
      const agg = weekData[0] || { totalPoints: 0, count: 0 };
      const endMinus1 = new Date(end);
      endMinus1.setDate(endMinus1.getDate() - 1);
      const label = `${start.toLocaleString("default", { month: "short", day: "numeric" })} - ${endMinus1.toLocaleString("default", { month: "short", day: "numeric" })}`;
      weeklySeriesData.push({ week: label, points: agg.totalPoints || 0, reports: agg.count || 0 });
    }

    return res.json({
      reports: {
        pendingCount,
        approvedToday,
        totalReports,
        approvedTotal,
        rejectedTotal,
        recentReports,
        monthlySeries: monthlySeries,
        weeklySeries: weeklySeriesData
      },
      complaints: {
        pending: pendingComplaints,
        urgent: urgentComplaints
      },
      collectors: {
        activeCollectors: uniqueCollectors.length,
        stats: collectorStats
      },
      dustbins: dustbinStats
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load employee dashboard" });
  }
});

router.get("/community", authenticate, async (_req: AuthenticatedRequest, res) => {
  try {
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    
    // Parallel queries for better performance
    const [totalMembers, activeToday, approvedStats, leaderboardData] = await Promise.all([
      User.countDocuments({ role: "collector" }),
      User.countDocuments({
        role: "collector",
        lastActiveAt: { $gte: startOfDay }
      }),
      // Use aggregation for total stats (much faster than loading all reports)
      Report.aggregate([
        { $match: { status: "approved" } },
        {
          $group: {
            _id: null,
            totalPoints: { $sum: "$points" },
            totalWasteKg: { $sum: { $ifNull: ["$wasteWeightKg", { $divide: ["$points", POINTS_PER_KG] }] } }
          }
        }
      ]),
      // Use aggregation for leaderboard (much faster)
      Report.aggregate([
        { $match: { status: "approved" } },
        {
          $group: {
            _id: "$collectorEmail",
            totalPoints: { $sum: "$points" }
          }
        },
        { $sort: { totalPoints: -1 } },
        { $limit: 50 } // Limit to top 50
      ])
    ]);

    const stats = approvedStats[0] || { totalPoints: 0, totalWasteKg: 0 };
    const totalPoints = stats.totalPoints || 0;
    const totalWasteKg = stats.totalWasteKg || 0;
    const co2SavedKg = totalWasteKg * CO2_PER_KG;

    // Get collector details for leaderboard (only for top collectors)
    const collectorEmails = leaderboardData.map(item => item._id).filter(Boolean);
    const collectors = await User.find({ 
      role: "collector", 
      email: { $in: collectorEmails } 
    })
      .select('name email currentStreak longestStreak lastActiveAt')
      .lean();

    const collectorMap = new Map(collectors.map(c => [c.email, c]));
    const leaderboard = leaderboardData.map(item => {
      const collector = collectorMap.get(item._id);
      return {
        id: collector?._id || null,
        name: collector?.name || collector?.email || item._id,
        email: item._id,
        points: item.totalPoints || 0,
        currentStreak: collector?.currentStreak || 0,
        longestStreak: collector?.longestStreak || 0,
        lastActiveAt: collector?.lastActiveAt || null
      };
    });

    return res.json({
      stats: {
        totalMembers,
        activeToday,
        wasteCollectedKg: totalWasteKg,
        co2SavedKg,
        totalPoints
      },
      leaderboard
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load community data" });
  }
});

router.get("/recycling-logistics", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.authUser?.role !== "recycling_logistics") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [jobs, fullDustbins, unresolvedComplaints, approvedReports] = await Promise.all([
      RecyclingJob.find({})
        .populate("createdBy", "name email role")
        .populate("assignedTo", "name email role")
        .sort({ updatedAt: -1 })
        .limit(40)
        .lean(),
      Dustbin.find({ $or: [{ status: "full" }, { urgent: true }] })
        .select("name status fillLevel urgent coordinates updatedAt")
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean(),
      Complaint.find({ status: { $in: ["pending", "in_progress"] } })
        .select("title priority status location createdAt updatedAt")
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean(),
      Report.find({ status: "approved" })
        .select("materialType wasteWeightKg submittedAt collectorEmail")
        .sort({ submittedAt: -1 })
        .limit(120)
        .lean(),
    ]);

    const byMaterial = new Map<string, number>();
    approvedReports.forEach((r: any) => {
      const key = (r.materialType || "unknown").toString();
      const weight = Number(r.wasteWeightKg || 0);
      byMaterial.set(key, (byMaterial.get(key) || 0) + (Number.isFinite(weight) ? weight : 0));
    });

    const materialSupply = Array.from(byMaterial.entries())
      .map(([materialType, totalWeightKg]) => ({ materialType, totalWeightKg: Number(totalWeightKg.toFixed(2)) }))
      .sort((a, b) => b.totalWeightKg - a.totalWeightKg)
      .slice(0, 10);

    const statusCount = {
      pending: jobs.filter((j: any) => j.status === "pending").length,
      assigned: jobs.filter((j: any) => j.status === "assigned").length,
      inTransit: jobs.filter((j: any) => j.status === "in_transit").length,
      delivered: jobs.filter((j: any) => j.status === "delivered").length,
    };

    return res.json({
      summary: {
        totalJobs: jobs.length,
        ...statusCount,
        fullOrUrgentDustbins: fullDustbins.length,
        unresolvedComplaints: unresolvedComplaints.length,
      },
      jobs,
      demandSignals: {
        fullDustbins,
        unresolvedComplaints,
      },
      materialSupply,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load recycling logistics dashboard" });
  }
});

router.get("/waste-marketplace", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.authUser?.role !== "waste_buyer") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [listings, approvedReports, completedJobs] = await Promise.all([
      MarketplaceListing.find({})
        .populate("seller", "name email role")
        .populate("buyer", "name email role")
        .sort({ updatedAt: -1 })
        .limit(60)
        .lean(),
      Report.find({ status: "approved" })
        .select("materialType wasteWeightKg submittedAt")
        .sort({ submittedAt: -1 })
        .limit(200)
        .lean(),
      RecyclingJob.find({ status: "delivered" })
        .select("materialType quantityKg updatedAt")
        .sort({ updatedAt: -1 })
        .limit(80)
        .lean(),
    ]);

    const inventoryMap = new Map<string, number>();
    approvedReports.forEach((r: any) => {
      const key = (r.materialType || "unknown").toString();
      inventoryMap.set(key, (inventoryMap.get(key) || 0) + Number(r.wasteWeightKg || 0));
    });
    completedJobs.forEach((j: any) => {
      const key = (j.materialType || "unknown").toString();
      inventoryMap.set(key, (inventoryMap.get(key) || 0) + Number(j.quantityKg || 0));
    });

    const liveInventory = Array.from(inventoryMap.entries())
      .map(([materialType, quantityKg]) => ({ materialType, quantityKg: Number(quantityKg.toFixed(2)) }))
      .sort((a, b) => b.quantityKg - a.quantityKg)
      .slice(0, 12);

    return res.json({
      summary: {
        openListings: listings.filter((l: any) => l.status === "open").length,
        reservedListings: listings.filter((l: any) => l.status === "reserved").length,
        soldListings: listings.filter((l: any) => l.status === "sold").length,
        totalListings: listings.length,
      },
      listings,
      liveInventory,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load waste marketplace dashboard" });
  }
});

router.get("/government-integration", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.authUser?.role !== "government_officer") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [cases, incidents, complaints, reports, jobs] = await Promise.all([
      GovernmentCase.find({})
        .populate("submittedBy", "name email role")
        .populate("reviewedBy", "name email role")
        .sort({ updatedAt: -1 })
        .limit(60)
        .lean(),
      Incident.find({})
        .select("category status urgency updatedAt createdAt")
        .sort({ updatedAt: -1 })
        .limit(120)
        .lean(),
      Complaint.find({})
        .select("title status priority updatedAt createdAt")
        .sort({ updatedAt: -1 })
        .limit(120)
        .lean(),
      Report.find({})
        .select("status submittedAt verifiedAt")
        .sort({ submittedAt: -1 })
        .limit(200)
        .lean(),
      RecyclingJob.find({})
        .select("status updatedAt createdAt")
        .sort({ updatedAt: -1 })
        .limit(120)
        .lean(),
    ]);

    const unresolvedIncidents = incidents.filter((i: any) => i.status !== "resolved" && i.status !== "dismissed").length;
    const unresolvedComplaints = complaints.filter((c: any) => c.status !== "resolved" && c.status !== "rejected").length;
    const pendingVerifications = reports.filter((r: any) => r.status === "pending").length;
    const delayedJobs = jobs.filter((j: any) => j.status !== "delivered").length;

    return res.json({
      summary: {
        totalCases: cases.length,
        submittedCases: cases.filter((c: any) => c.status === "submitted").length,
        underReviewCases: cases.filter((c: any) => c.status === "under_review").length,
        approvedCases: cases.filter((c: any) => c.status === "approved").length,
        unresolvedIncidents,
        unresolvedComplaints,
        pendingVerifications,
        delayedJobs,
      },
      cases,
      operationalView: {
        incidents: incidents.slice(0, 20),
        complaints: complaints.slice(0, 20),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load government integration dashboard" });
  }
});

router.get("/carbon-credits", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.authUser?.role !== "carbon_auditor") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [ledger, approvedReports, deliveredJobs, resolvedIncidents] = await Promise.all([
      CarbonCreditEntry.find({})
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 })
        .limit(120)
        .lean(),
      Report.find({ status: "approved" }).select("wasteWeightKg submittedAt").lean(),
      RecyclingJob.find({ status: "delivered" }).select("quantityKg updatedAt").lean(),
      Incident.find({ status: "resolved" }).select("timeline updatedAt").lean(),
    ]);

    const totalLedgerCredits = ledger.reduce((sum: number, e: any) => sum + Number(e.credits || 0), 0);
    const totalLedgerCo2eKg = ledger.reduce((sum: number, e: any) => sum + Number(e.co2eKg || 0), 0);
    const reportWeightKg = approvedReports.reduce((sum: number, r: any) => sum + Number(r.wasteWeightKg || 0), 0);
    const deliveredWeightKg = deliveredJobs.reduce((sum: number, j: any) => sum + Number(j.quantityKg || 0), 0);
    const resolvedCount = resolvedIncidents.length;

    const estimatedCo2eFromOpsKg = Number((reportWeightKg * CO2_PER_KG + deliveredWeightKg * 0.8 + resolvedCount * 2).toFixed(2));
    const potentialCreditsFromOps = Number((estimatedCo2eFromOpsKg / 10).toFixed(2));

    return res.json({
      summary: {
        totalLedgerCredits: Number(totalLedgerCredits.toFixed(2)),
        totalLedgerCo2eKg: Number(totalLedgerCo2eKg.toFixed(2)),
        estimatedCo2eFromOpsKg,
        potentialCreditsFromOps,
        reportWeightKg: Number(reportWeightKg.toFixed(2)),
        deliveredWeightKg: Number(deliveredWeightKg.toFixed(2)),
        resolvedIncidents: resolvedCount,
      },
      ledger,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load carbon dashboard" });
  }
});

export default router;

