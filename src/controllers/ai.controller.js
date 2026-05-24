import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/ai/generate
export const generateProfileFromPrompt = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || prompt.length < 20)
      return res.status(400).json({ error: 'Please provide a detailed career description (min 20 chars)' });

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

    const systemPrompt = `You are a professional resume writer. Extract structured resume data from the user's career description and return ONLY valid JSON (no markdown, no explanation).

Return this exact structure:
{
  "fullName": "",
  "jobTitle": "primary job title",
  "professionalSummary": "polished 3-4 sentence summary",
  "skills": ["skill1", "skill2", ...up to 10],
  "workExperience": [{ "company": "", "role": "", "startDate": "", "endDate": "", "isCurrent": false, "description": "" }],
  "education": [],
  "languages": ["English"],
  "certifications": []
}

User's career description: ${prompt}`;

    const result = await model.generateContent(systemPrompt);
    const text = result.response.text()
      .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: 'AI returned invalid data. Try a clearer description.' });
    }

    res.json({ success: true, generatedProfile: parsed, prompt });
  } catch (e) {
    res.status(500).json({ error: 'AI generation failed: ' + e.message });
  }
};

// POST /api/ai/improve-summary
export const improveSummary = async (req, res) => {
  try {
    const { summary, jobTitle } = req.body;
    if (!summary) return res.status(400).json({ error: 'Summary is required' });

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
    const result = await model.generateContent(
      `Rewrite this professional summary for a ${jobTitle || 'professional'} to be impactful and ATS-friendly (3-4 sentences). Return only the improved text:\n\n"${summary}"`
    );

    res.json({ success: true, improvedSummary: result.response.text().trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/ai/suggest-skills
export const suggestSkills = async (req, res) => {
  try {
    const { jobTitle } = req.body;
    if (!jobTitle) return res.status(400).json({ error: 'Job title is required' });

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
    const result = await model.generateContent(
      `List top 12 skills for "${jobTitle}". Return ONLY a JSON array: ["Skill 1", "Skill 2", ...]`
    );

    const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    res.json({ success: true, suggestedSkills: JSON.parse(text) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/ai/tailor — tailor resume summary for a specific job description
export const tailorForJob = async (req, res) => {
  try {
    const { currentSummary, skills, jobDescription } = req.body;
    if (!jobDescription) return res.status(400).json({ error: 'Job description is required' });

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

    const prompt = `Given this job description:
"${jobDescription}"

And this candidate profile:
- Summary: "${currentSummary}"
- Skills: ${(skills || []).join(', ')}

Return ONLY a JSON object:
{
  "tailoredSummary": "rewritten summary targeting this specific job",
  "matchingSkills": ["skills that match this job"],
  "missingSkills": ["important skills from JD the candidate lacks"],
  "matchScore": 75
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    res.json({ success: true, ...JSON.parse(text) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
