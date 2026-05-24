import prisma from '../prismaClient.js';

// GET /api/analytics/me — user's own stats
export const getMyAnalytics = async (req, res) => {
  try {
    const [totalResumes, totalDownloads, totalAiGenerations, recentEvents] = await Promise.all([
      prisma.analytics.count({ where: { userId: req.user.id, event: 'RESUME_CREATED' } }),
      prisma.analytics.count({ where: { userId: req.user.id, event: 'RESUME_DOWNLOADED' } }),
      prisma.analytics.count({ where: { userId: req.user.id, event: 'AI_GENERATED' } }),
      prisma.analytics.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { event: true, createdAt: true, metadata: true }
      })
    ]);

    res.json({
      success: true,
      stats: { totalResumes, totalDownloads, totalAiGenerations },
      recentEvents
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/analytics/admin — global stats (admin only)
export const getAdminAnalytics = async (req, res) => {
  try {
    const [totalUsers, totalResumes, totalDownloads, totalAiGenerations, premiumUsers] = await Promise.all([
      prisma.user.count(),
      prisma.resume.count(),
      prisma.analytics.count({ where: { event: 'RESUME_DOWNLOADED' } }),
      prisma.analytics.count({ where: { event: 'AI_GENERATED' } }),
      prisma.user.count({ where: { isPremium: true } })
    ]);

    res.json({
      success: true,
      stats: { totalUsers, totalResumes, totalDownloads, totalAiGenerations, premiumUsers }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
