import prisma from '../prismaClient.js';

// GET /api/profile
export const getProfile = async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
      include: {
        workExperiences: { orderBy: { sortOrder: 'asc' } },
        educations: { orderBy: { sortOrder: 'asc' } },
        skills: { orderBy: { sortOrder: 'asc' } },
        languages: true,
        certifications: true
      }
    });
    res.json({ success: true, profile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/profile
export const updateProfile = async (req, res) => {
  try {
    const {
      fullName, jobTitle, email, phone, location,
      linkedin, github, website, professionalSummary,
      workExperiences, educations, skills, languages, certifications
    } = req.body;

    const profile = await prisma.$transaction(async (tx) => {
      // Update basic fields
      const p = await tx.profile.update({
        where: { userId: req.user.id },
        data: {
          fullName: fullName ?? undefined,
          jobTitle: jobTitle ?? undefined,
          email: email ?? undefined,
          phone: phone ?? undefined,
          location: location ?? undefined,
          linkedin: linkedin ?? undefined,
          github: github ?? undefined,
          website: website ?? undefined,
          professionalSummary: professionalSummary ?? undefined,
        }
      });

      // Replace work experiences if provided
      if (workExperiences !== undefined) {
        await tx.workExperience.deleteMany({ where: { profileId: p.id } });
        if (workExperiences.length > 0) {
          await tx.workExperience.createMany({
            data: workExperiences.map((w, i) => ({ ...w, profileId: p.id, sortOrder: i }))
          });
        }
      }

      // Replace educations if provided
      if (educations !== undefined) {
        await tx.education.deleteMany({ where: { profileId: p.id } });
        if (educations.length > 0) {
          await tx.education.createMany({
            data: educations.map((e, i) => ({ ...e, profileId: p.id, sortOrder: i }))
          });
        }
      }

      // Replace skills if provided
      if (skills !== undefined) {
        await tx.profileSkill.deleteMany({ where: { profileId: p.id } });
        if (skills.length > 0) {
          await tx.profileSkill.createMany({
            data: skills.map((s, i) => ({ skill: s, profileId: p.id, sortOrder: i }))
          });
        }
      }

      // Replace languages if provided
      if (languages !== undefined) {
        await tx.profileLanguage.deleteMany({ where: { profileId: p.id } });
        if (languages.length > 0) {
          await tx.profileLanguage.createMany({
            data: languages.map(l => ({ language: l, profileId: p.id }))
          });
        }
      }

      // Replace certifications if provided
      if (certifications !== undefined) {
        await tx.certification.deleteMany({ where: { profileId: p.id } });
        if (certifications.length > 0) {
          await tx.certification.createMany({
            data: certifications.map(c => ({ ...c, profileId: p.id }))
          });
        }
      }

      return p;
    });

    // Recalculate strength
    const fullProfile = await prisma.profile.findUnique({
      where: { id: profile.id },
      include: { workExperiences: true, educations: true, skills: true }
    });
    const strength = calcStrength(fullProfile);
    await prisma.user.update({ where: { id: req.user.id }, data: { profileStrength: strength } });

    // Return full updated profile
    const result = await prisma.profile.findUnique({
      where: { userId: req.user.id },
      include: {
        workExperiences: { orderBy: { sortOrder: 'asc' } },
        educations: { orderBy: { sortOrder: 'asc' } },
        skills: { orderBy: { sortOrder: 'asc' } },
        languages: true,
        certifications: true
      }
    });

    // Track analytics
    await prisma.analytics.create({
      data: { userId: req.user.id, event: 'PROFILE_UPDATED' }
    });

    res.json({ success: true, profile: result, profileStrength: strength });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// PUT /api/profile/ai — save AI-generated profile
export const updateProfileFromAI = async (req, res) => {
  try {
    const { aiData, prompt } = req.body;

    // Map AI data into profile update format
    req.body = {
      ...aiData,
      workExperiences: aiData.workExperience || [],
      educations: aiData.education || [],
      skills: aiData.skills || [],
      languages: aiData.languages || [],
      certifications: aiData.certifications || []
    };

    // Also set AI flags
    await prisma.profile.update({
      where: { userId: req.user.id },
      data: { isAiGenerated: true, aiPromptUsed: prompt || '' }
    });

    await prisma.analytics.create({
      data: { userId: req.user.id, event: 'AI_GENERATED' }
    });

    return updateProfile(req, res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

function calcStrength(profile) {
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
