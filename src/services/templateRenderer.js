/**
 * Template Renderer
 * Replaces {{placeholder}} tokens in HTML templates with real user data
 */

export const renderTemplate = (htmlTemplate, profileData) => {
  const {
    fullName = 'Your Name',
    jobTitle = 'Professional',
    email = '',
    phone = '',
    location = '',
    linkedin = '',
    github = '',
    website = '',
    professionalSummary = '',
    workExperience = [],
    education = [],
    skills = [],
    languages = [],
    certifications = []
  } = profileData;

  let html = htmlTemplate;

  // Simple scalar replacements
  const replacements = {
    '{{fullName}}': fullName,
    '{{jobTitle}}': jobTitle,
    '{{email}}': email,
    '{{phone}}': phone,
    '{{location}}': location,
    '{{linkedin}}': linkedin,
    '{{github}}': github,
    '{{website}}': website,
    '{{professionalSummary}}': professionalSummary
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.replaceAll(placeholder, value || '');
  }

  // Skills list
  const skillsHtml = skills.map(s => `<span class="skill-tag">${s}</span>`).join('');
  html = html.replaceAll('{{skillsList}}', skillsHtml);

  // Languages list
  const langHtml = languages.map(l => `<span class="lang-tag">${l}</span>`).join('');
  html = html.replaceAll('{{languagesList}}', langHtml);

  // Work Experience section
  const workHtml = workExperience.map(exp => `
    <div class="experience-item">
      <div class="exp-header">
        <div>
          <h3 class="exp-role">${exp.role || ''}</h3>
          <p class="exp-company">${exp.company || ''}</p>
        </div>
        <span class="exp-date">${exp.startDate || ''} – ${exp.isCurrent ? 'Present' : (exp.endDate || '')}</span>
      </div>
      <p class="exp-desc">${exp.description || ''}</p>
    </div>
  `).join('');
  html = html.replaceAll('{{workExperienceList}}', workHtml);

  // Education section
  const eduHtml = education.map(edu => `
    <div class="education-item">
      <div class="edu-header">
        <div>
          <h3 class="edu-degree">${edu.degree || ''} ${edu.field ? 'in ' + edu.field : ''}</h3>
          <p class="edu-institution">${edu.institution || ''}</p>
        </div>
        <span class="edu-year">${edu.startYear || ''} – ${edu.endYear || ''}</span>
      </div>
      ${edu.grade ? `<p class="edu-grade">Grade: ${edu.grade}</p>` : ''}
    </div>
  `).join('');
  html = html.replaceAll('{{educationList}}', eduHtml);

  // Certifications
  const certHtml = certifications.map(cert => `
    <div class="cert-item">
      <span class="cert-name">${cert.name}</span>
      <span class="cert-issuer">${cert.issuer || ''} ${cert.year ? '· ' + cert.year : ''}</span>
    </div>
  `).join('');
  html = html.replaceAll('{{certificationsList}}', certHtml);

  // Contact links (conditional)
  html = html.replaceAll('{{linkedinLink}}', linkedin ? `<a href="${linkedin}">${linkedin}</a>` : '');
  html = html.replaceAll('{{githubLink}}', github ? `<a href="${github}">${github}</a>` : '');
  html = html.replaceAll('{{websiteLink}}', website ? `<a href="${website}">${website}</a>` : '');

  return html;
};
