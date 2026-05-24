import prisma from '../prismaClient.js';

// GET /api/templates
export const getTemplates = async (req, res) => {
  try {
    const { category } = req.query;
    const where = { isActive: true };
    if (category && category !== 'All') where.category = category;

    const templates = await prisma.template.findMany({
      where,
      select: {
        id: true, name: true, category: true, price: true,
        isPremium: true, accentColor: true, thumbnailColor: true,
        description: true, sortOrder: true
        // htmlTemplate excluded from list view
      },
      orderBy: { sortOrder: 'asc' }
    });

    res.json({ success: true, templates });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/templates/:id
export const getTemplate = async (req, res) => {
  try {
    const template = await prisma.template.findFirst({
      where: { id: parseInt(req.params.id), isActive: true },
      select: {
        id: true, name: true, category: true, price: true,
        isPremium: true, accentColor: true, thumbnailColor: true, description: true
      }
    });
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ success: true, template });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/templates/admin
export const createTemplate = async (req, res) => {
  try {
    const { name, category, price, isPremium, accentColor, thumbnailColor, htmlTemplate, description, sortOrder } = req.body;
    if (!name || !category || !htmlTemplate)
      return res.status(400).json({ error: 'name, category and htmlTemplate are required' });

    const template = await prisma.template.create({
      data: { name, category, price: price || 0, isPremium: isPremium || false, accentColor, thumbnailColor, htmlTemplate, description, sortOrder: sortOrder || 0 }
    });
    res.status(201).json({ success: true, template });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/templates/admin/:id
export const updateTemplate = async (req, res) => {
  try {
    const template = await prisma.template.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json({ success: true, template });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// DELETE /api/templates/admin/:id
export const deleteTemplate = async (req, res) => {
  try {
    await prisma.template.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false }
    });
    res.json({ success: true, message: 'Template deactivated' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/templates/admin/all
export const getAllTemplatesAdmin = async (req, res) => {
  try {
    const templates = await prisma.template.findMany({
      select: { id: true, name: true, category: true, price: true, isPremium: true, isActive: true, sortOrder: true, createdAt: true },
      orderBy: { sortOrder: 'asc' }
    });
    res.json({ success: true, templates });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
