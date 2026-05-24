import prisma from '../prismaClient.js';

// GET /api/subscription
export const getSubscription = async (req, res) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { userId: req.user.id }
    });
    res.json({ success: true, subscription: sub });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/subscription/upgrade
// Call this after payment is confirmed on frontend (Razorpay/Stripe)
export const upgradeToPro = async (req, res) => {
  try {
    const { paymentId, plan, amountPaid } = req.body;

    if (!paymentId) return res.status(400).json({ error: 'Payment ID is required' });

    const endDate = plan === 'LIFETIME' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

    const sub = await prisma.$transaction(async (tx) => {
      const s = await tx.subscription.update({
        where: { userId: req.user.id },
        data: {
          plan: plan || 'PRO',
          status: 'ACTIVE',
          startDate: new Date(),
          endDate,
          paymentId,
          amountPaid: amountPaid || 0
        }
      });
      await tx.user.update({ where: { id: req.user.id }, data: { isPremium: true } });
      return s;
    });

    res.json({ success: true, subscription: sub, message: 'Upgraded to Pro!' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/subscription/cancel
export const cancelSubscription = async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { userId: req.user.id },
        data: { status: 'CANCELLED' }
      });
      await tx.user.update({ where: { id: req.user.id }, data: { isPremium: false } });
    });
    res.json({ success: true, message: 'Subscription cancelled' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
