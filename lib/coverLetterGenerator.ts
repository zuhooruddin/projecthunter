export type TemplateStyle = "Professional" | "Casual" | "Technical" | "Startup" | "Agency";

export interface Profile {
  name: string;
  skills: string[];
  portfolioUrl: string;
  yearsExperience: number;
  hourlyRate?: number;
}

export interface CoverLetterVars {
  company: string;
  role: string;
  techStack: string[];
}

const DEFAULT_TEMPLATES: Record<TemplateStyle, string> = {
  Professional: `Dear {company} team,

I'm writing to express my interest in the {role} position. With {years} years of experience building software and a strong background in {techStack}, I believe I can contribute meaningfully to your team.

My relevant skills include {mySkills}. You can review my work at {portfolioUrl}.

I'd welcome the chance to discuss how I can help {company} succeed.

Best regards,
{name}`,

  Casual: `Hey {company} folks,

Saw your post about the {role} role and figured I'd reach out — it looks like a great fit for what I do. I've spent the last {years} years working with {techStack}, and I think I could jump in and add value quickly.

Here's a bit about me: {mySkills}. Feel free to check out my portfolio: {portfolioUrl}.

Would love to chat if you think there's a fit!

Cheers,
{name}`,

  Technical: `Hello {company},

Regarding the {role} opening: I have {years} years of hands-on experience with {techStack}, and have shipped production systems involving {mySkills}.

A representative sample of my work is available at {portfolioUrl}. I'd be glad to walk through the architecture and tradeoffs of any of these projects in more detail.

Looking forward to connecting,
{name}`,

  Startup: `Hi {company} team,

I love what you're building. The {role} role caught my eye because it lines up directly with my background in {techStack} — {years} years of moving fast and shipping things that work.

Quick highlights: {mySkills}. Portfolio here: {portfolioUrl}.

Happy to hop on a quick call whenever works for you.

— {name}`,

  Agency: `Hello,

I'd like to be considered for the {role} engagement at {company}. I bring {years} years of experience delivering client projects using {techStack}, with a track record covering {mySkills}.

Portfolio: {portfolioUrl}{rateClause}

I'm available to start promptly and happy to provide references on request.

Regards,
{name}`,
};

function fillTemplate(template: string, profile: Profile, vars: CoverLetterVars): string {
  const rateClause = profile.hourlyRate ? ` | Rate: $${profile.hourlyRate}/hr` : "";
  return template
    .replaceAll("{company}", vars.company || "your company")
    .replaceAll("{role}", vars.role || "this role")
    .replaceAll("{techStack}", vars.techStack.length ? vars.techStack.join(", ") : "modern web technologies")
    .replaceAll("{mySkills}", profile.skills.join(", "))
    .replaceAll("{name}", profile.name)
    .replaceAll("{portfolioUrl}", profile.portfolioUrl)
    .replaceAll("{years}", String(profile.yearsExperience))
    .replaceAll("{rateClause}", rateClause);
}

export function getDefaultTemplate(style: TemplateStyle): string {
  return DEFAULT_TEMPLATES[style];
}

export function getDefaultTemplates(): Record<TemplateStyle, string> {
  return { ...DEFAULT_TEMPLATES };
}

export function generateCoverLetter(
  style: TemplateStyle,
  profile: Profile,
  vars: CoverLetterVars,
  customTemplates?: Partial<Record<TemplateStyle, string>>
): string {
  const template = customTemplates?.[style] ?? DEFAULT_TEMPLATES[style];
  return fillTemplate(template, profile, vars);
}
