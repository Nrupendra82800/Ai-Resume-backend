import prisma from '../prismaClient.js';
import { renderTemplate } from '../services/templateRenderer.js';
import { generatePDF } from '../services/pdfGenerator.js';

const getResumeLimit = (isPremium) =>
  isPremium
    ? parseInt(process.env.MAX_RESUMES_PRO || 10)
    : parseInt(process.env.MAX_RESUMES_FREE || 3);

// GET /api/resumes
export const getResumes = async (req, res) => {
  try {
    const resumes = await prisma.resume.findMany({
      where: { userId: req.user.id },
      include: { template: { select: { name: true, category: true, accentColor: true, thumbnailColor: true } } },
      orderBy: { updatedAt: 'desc' }
    });
    const limit = getResumeLimit(req.user.isPremium);
    res.json({ success: true, resumes, count: resumes.length, limit });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/resumes
export const createResume = async (req, res) => {
  try {
    const { templateId, title } = req.body;
    const limit = getResumeLimit(req.user.isPremium);

    const count = await prisma.resume.count({ where: { userId: req.user.id } });
    if (count >= limit) {
      return res.status(400).json({
        error: `Resume limit reached (${limit}). ${!req.user.isPremium ? 'Upgrade to Pro for more.' : 'Delete one to create new.'}`
      });
    }

    const template = await prisma.template.findFirst({
      where: { id: parseInt(templateId), isActive: true }
    });
    if (!template) return res.status(404).json({ error: 'Template not found' });

    // Get full profile
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
      include: { workExperiences: true, educations: true, skills: true, languages: true, certifications: true }
    });
    if (!profile) return res.status(400).json({ error: 'Complete your profile first' });

    // Build snapshot
    const snapshot = {
      fullName: profile.fullName,
      jobTitle: profile.jobTitle,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      linkedin: profile.linkedin,
      github: profile.github,
      website: profile.website,
      professionalSummary: profile.professionalSummary,
      workExperience: profile.workExperiences,
      education: profile.educations,
      skills: profile.skills.map(s => s.skill),
      languages: profile.languages.map(l => l.language),
      certifications: profile.certifications
    };

    const completion = calcCompletion(profile);

    const resume = await prisma.resume.create({
      data: {
        userId: req.user.id,
        templateId: template.id,
        templateName: template.name,
        title: title || `${template.name} Resume`,
        completionStatus: completion,
        profileSnapshot: snapshot
      }
    });

    await prisma.analytics.create({
      data: { userId: req.user.id, resumeId: resume.id, event: 'RESUME_CREATED', metadata: { templateName: template.name } }
    });

    res.status(201).json({ success: true, resume });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/resumes/:id/sync
export const syncResume = async (req, res) => {
  try {
    const resume = await prisma.resume.findFirst({ where: { id: parseInt(req.params.id), userId: req.user.id } });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
      include: { workExperiences: true, educations: true, skills: true, languages: true, certifications: true }
    });

    const snapshot = {
      fullName: profile.fullName, jobTitle: profile.jobTitle,
      email: profile.email, phone: profile.phone, location: profile.location,
      linkedin: profile.linkedin, github: profile.github, website: profile.website,
      professionalSummary: profile.professionalSummary,
      workExperience: profile.workExperiences, education: profile.educations,
      skills: profile.skills.map(s => s.skill), languages: profile.languages.map(l => l.language),
      certifications: profile.certifications
    };

    const updated = await prisma.resume.update({
      where: { id: resume.id },
      data: { profileSnapshot: snapshot, completionStatus: calcCompletion(profile) }
    });

    res.json({ success: true, resume: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// DELETE /api/resumes/:id
export const deleteResume = async (req, res) => {
  try {
    const resume = await prisma.resume.findFirst({ where: { id: parseInt(req.params.id), userId: req.user.id } });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    await prisma.resume.delete({ where: { id: resume.id } });

    await prisma.analytics.create({
      data: { userId: req.user.id, event: 'RESUME_DELETED' }
    });

    res.json({ success: true, message: 'Resume deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/resumes/:id/preview
export const previewResume = async (req, res) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
      include: { template: true }
    });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const html = renderTemplate(resume.template.htmlTemplate, resume.profileSnapshot);

    await prisma.analytics.create({
      data: { userId: req.user.id, resumeId: resume.id, event: 'RESUME_PREVIEWED' }
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/resumes/:id/download
export const downloadResume = async (req, res) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
      include: { template: true }
    });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });

    const html = renderTemplate(resume.template.htmlTemplate, resume.profileSnapshot);
    const pdf = await generatePDF(html);

    const snapshot = resume.profileSnapshot;
    const name = (snapshot.fullName || 'resume').replace(/\s+/g, '_');
    const filename = `${name}_${resume.templateName}.pdf`;

    await prisma.analytics.create({
      data: { userId: req.user.id, resumeId: resume.id, event: 'RESUME_DOWNLOADED', metadata: { filename } }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

function calcCompletion(profile) {
  let score = 0;
  if (profile.fullName) score += 15;
  if (profile.jobTitle) score += 10;
  if (profile.email) score += 10;
  if (profile.phone) score += 5;
  if (profile.location) score += 5;
  if (profile.professionalSummary) score += 15;
  if (profile.workExperiences?.length > 0) score += 20;
  if (profile.educations?.length > 0) score += 10;
  if (profile.skills?.length >= 3) score += 10;
  return Math.min(score, 100);
}
