/**
 * Founder-market-fit quiz types and scoring logic.
 */

export const DOMAIN_EXPERTISE_OPTIONS = [
  "SEO",
  "AI/ML",
  "Healthcare",
  "Finance",
  "E-commerce",
  "Marketing",
  "SaaS",
  "DevTools",
  "Design",
  "Sales",
  "Other"
] as const;

export const YEARS_EXPERIENCE_OPTIONS = ["0-2 years", "3-5 years", "6-10 years", "10+ years"] as const;

export const KEY_SKILL_OPTIONS = [
  "Technical/Engineering",
  "Product Design",
  "Marketing/Growth",
  "Sales",
  "Content Creation",
  "Operations",
  "Fundraising"
] as const;

export const BUDGET_OPTIONS = ["$0-1K", "$1-5K", "$5-20K", "$20K+", "No budget limit"] as const;

export const TIME_COMMITMENT_OPTIONS = [
  "Side hustle (5-10 hrs/week)",
  "Part-time (20-30 hrs/week)",
  "Full-time (40+ hrs/week)"
] as const;

export type DomainExpertise = (typeof DOMAIN_EXPERTISE_OPTIONS)[number];
export type YearsExperience = (typeof YEARS_EXPERIENCE_OPTIONS)[number];
export type KeySkill = (typeof KEY_SKILL_OPTIONS)[number];
export type BudgetTier = (typeof BUDGET_OPTIONS)[number];
export type TimeCommitment = (typeof TIME_COMMITMENT_OPTIONS)[number];

export interface Validation {
  id?: string;
  ideaText?: string | null;
  industry: string | null;
  stage?: string | null;
}

export interface FounderProfileDraft {
  domainExpertise: DomainExpertise[];
  yearsExperience?: YearsExperience;
  keySkills: KeySkill[];
  budget?: BudgetTier;
  timeCommitment?: TimeCommitment;
}

export interface FounderProfile {
  domainExpertise: DomainExpertise[];
  yearsExperience: YearsExperience;
  keySkills: KeySkill[];
  budget: BudgetTier;
  timeCommitment: TimeCommitment;
}

export interface FounderFitGap {
  gap: string;
  mitigation: string;
}

export interface FounderFitResult {
  score: number;
  yourEdge: string;
  strengths: string[];
  gaps: FounderFitGap[];
  recommendations: string[];
  requiredSkills: KeySkill[];
  componentScores: {
    domainScore: number;
    experienceScore: number;
    skillGapScore: number;
    resourceScore: number;
  };
}

const NORMALIZATION_PATTERN = /[^a-z0-9]+/g;

const EXPERIENCE_SCORE_MAP: Record<YearsExperience, number> = {
  "0-2 years": 40,
  "3-5 years": 70,
  "6-10 years": 90,
  "10+ years": 100
};

const BUDGET_SCORE_MAP: Record<BudgetTier, number> = {
  "$0-1K": 30,
  "$1-5K": 50,
  "$5-20K": 70,
  "$20K+": 90,
  "No budget limit": 100
};

const TIME_SCORE_MAP: Record<TimeCommitment, number> = {
  "Side hustle (5-10 hrs/week)": 40,
  "Part-time (20-30 hrs/week)": 70,
  "Full-time (40+ hrs/week)": 100
};

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(NORMALIZATION_PATTERN, "").trim();
}

function unique<T extends string>(values: readonly T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const value of values) {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    deduped.push(value);
  }

  return deduped;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Returns a normalized founder profile draft with duplicates removed.
 */
export function normalizeFounderProfileDraft(profile: FounderProfileDraft): FounderProfileDraft {
  return {
    domainExpertise: unique(profile.domainExpertise),
    yearsExperience: profile.yearsExperience,
    keySkills: unique(profile.keySkills),
    budget: profile.budget,
    timeCommitment: profile.timeCommitment
  };
}

/**
 * Returns true when all required founder profile answers are present.
 */
export function isFounderProfileComplete(profile: FounderProfileDraft): profile is FounderProfile {
  return (
    profile.domainExpertise.length > 0 &&
    profile.keySkills.length > 0 &&
    Boolean(profile.yearsExperience) &&
    Boolean(profile.budget) &&
    Boolean(profile.timeCommitment)
  );
}

function getPrimaryIndustryText(idea: Validation): string {
  const chunks = [idea.industry ?? "", idea.ideaText ?? ""];
  return chunks.join(" ").trim();
}

function domainMatchesIndustry(domain: DomainExpertise, industryText: string): boolean {
  const normalizedDomain = normalizeToken(domain);
  const normalizedIndustry = normalizeToken(industryText);

  if (!normalizedDomain || !normalizedIndustry) {
    return false;
  }

  return normalizedIndustry.includes(normalizedDomain) || normalizedDomain.includes(normalizedIndustry);
}

/**
 * Maps idea industry to the most important skill set for execution.
 */
export function determineRequiredSkills(industry: string | null | undefined): KeySkill[] {
  const normalizedIndustry = normalizeToken(industry ?? "");

  if (!normalizedIndustry) {
    return ["Technical/Engineering", "Product Design", "Marketing/Growth", "Sales"];
  }

  if (normalizedIndustry.includes("ai") || normalizedIndustry.includes("ml")) {
    return ["Technical/Engineering", "Product Design", "Marketing/Growth", "Sales"];
  }

  if (normalizedIndustry.includes("health")) {
    return ["Operations", "Sales", "Technical/Engineering", "Fundraising"];
  }

  if (normalizedIndustry.includes("fin") || normalizedIndustry.includes("bank") || normalizedIndustry.includes("payment")) {
    return ["Technical/Engineering", "Operations", "Sales", "Fundraising"];
  }

  if (normalizedIndustry.includes("commerce") || normalizedIndustry.includes("retail")) {
    return ["Marketing/Growth", "Operations", "Product Design", "Sales", "Content Creation"];
  }

  if (normalizedIndustry.includes("saas") || normalizedIndustry.includes("devtool") || normalizedIndustry.includes("software")) {
    return ["Technical/Engineering", "Product Design", "Marketing/Growth", "Sales"];
  }

  if (normalizedIndustry.includes("design")) {
    return ["Product Design", "Marketing/Growth", "Content Creation", "Sales"];
  }

  if (normalizedIndustry.includes("market") || normalizedIndustry.includes("ad")) {
    return ["Marketing/Growth", "Sales", "Content Creation", "Product Design"];
  }

  return ["Product Design", "Marketing/Growth", "Sales", "Operations"];
}

function identifyStrengths(
  profile: FounderProfile,
  requiredSkills: KeySkill[],
  scores: {
    domainScore: number;
    experienceScore: number;
    skillGapScore: number;
    resourceScore: number;
  }
): string[] {
  const strengths: string[] = [];

  if (scores.domainScore >= 90) {
    strengths.push("Strong domain context for this market.");
  }

  if (scores.experienceScore >= 90) {
    strengths.push("High relevant professional experience.");
  }

  if (scores.skillGapScore >= 75) {
    strengths.push("Core execution skills are well covered.");
  }

  if (scores.resourceScore >= 75) {
    strengths.push("Resources and time commitment support fast iteration.");
  }

  if (profile.keySkills.includes("Sales") && requiredSkills.includes("Sales")) {
    strengths.push("Sales capability aligns with go-to-market needs.");
  }

  if (strengths.length === 0) {
    strengths.push("You have enough baseline capability to run early problem interviews and prototype quickly.");
  }

  return strengths.slice(0, 5);
}

function identifyGaps(
  profile: FounderProfile,
  requiredSkills: KeySkill[],
  scores: {
    domainScore: number;
    experienceScore: number;
    skillGapScore: number;
    resourceScore: number;
  }
): FounderFitGap[] {
  const gaps: FounderFitGap[] = [];

  if (scores.domainScore < 80) {
    gaps.push({
      gap: "Domain familiarity may be limited for this market.",
      mitigation: "Run 15 customer interviews and recruit one domain advisor before locking roadmap priorities."
    });
  }

  if (scores.experienceScore < 70) {
    gaps.push({
      gap: "Relevant years of experience are still developing.",
      mitigation: "Narrow initial scope to one painful workflow and validate manually before building automation."
    });
  }

  const missingSkills = requiredSkills.filter((skill) => !profile.keySkills.includes(skill));
  if (missingSkills.length > 0) {
    gaps.push({
      gap: `Potential skill gaps in: ${missingSkills.join(", ")}.`,
      mitigation: "Fill gaps with contractors, advisors, or co-founder support during MVP build and launch."
    });
  }

  if (scores.resourceScore < 65) {
    gaps.push({
      gap: "Current budget/time constraints may slow MVP execution.",
      mitigation: "Prioritize a concierge MVP, no-code prototype, or paid design partner to validate demand with lower burn."
    });
  }

  return gaps.slice(0, 5);
}

function generateRecommendations(
  profile: FounderProfile,
  requiredSkills: KeySkill[],
  gaps: FounderFitGap[],
  scores: {
    domainScore: number;
    experienceScore: number;
    skillGapScore: number;
    resourceScore: number;
  }
): string[] {
  const recommendations: string[] = [];

  if (scores.domainScore < 80) {
    recommendations.push("Use customer calls to validate problem language and willingness-to-pay before coding.");
  }

  if (scores.skillGapScore < 75) {
    const missingSkills = requiredSkills.filter((skill) => !profile.keySkills.includes(skill));
    if (missingSkills.length > 0) {
      recommendations.push(`Cover missing execution areas first: ${missingSkills.join(", ")}.`);
    }
  }

  if (profile.budget === "$0-1K" || profile.timeCommitment === "Side hustle (5-10 hrs/week)") {
    recommendations.push("Start with a manual service-driven MVP to gather proof before investing in full product build.");
  }

  recommendations.push("Define one leading metric for the next 30 days (interview-to-waitlist conversion or paid pilot close rate).");

  for (const gap of gaps) {
    recommendations.push(gap.mitigation);
  }

  return unique(recommendations).slice(0, 6);
}

function identifyEdge(scores: {
  domainScore: number;
  experienceScore: number;
  skillGapScore: number;
  resourceScore: number;
}): string {
  const entries = [
    { name: "Domain context", value: scores.domainScore },
    { name: "Experience depth", value: scores.experienceScore },
    { name: "Execution skill coverage", value: scores.skillGapScore },
    { name: "Resource readiness", value: scores.resourceScore }
  ];

  entries.sort((a, b) => b.value - a.value);
  const strongest = entries[0];

  return `${strongest.name} is your current edge (${strongest.value}/100).`;
}

/**
 * Calculates founder-market fit score and recommendations from quiz answers.
 */
export function calculateFounderFit(idea: Validation, profile: FounderProfile): FounderFitResult {
  const industryText = getPrimaryIndustryText(idea);

  const domainScore = profile.domainExpertise.some((domain) => domainMatchesIndustry(domain, industryText)) ? 100 : 50;

  const experienceScore = EXPERIENCE_SCORE_MAP[profile.yearsExperience];

  const requiredSkills = determineRequiredSkills(idea.industry);
  const matchedSkillCount = requiredSkills.filter((skill) => profile.keySkills.includes(skill)).length;
  const skillGapScore = Number(((matchedSkillCount / requiredSkills.length) * 100).toFixed(2));

  const budgetScore = BUDGET_SCORE_MAP[profile.budget];
  const timeScore = TIME_SCORE_MAP[profile.timeCommitment];
  const resourceScore = Number((((budgetScore + timeScore) / 2) * 1).toFixed(2));

  const finalScore = clamp(
    Math.round(domainScore * 0.3 + experienceScore * 0.2 + skillGapScore * 0.3 + resourceScore * 0.2),
    0,
    100
  );

  const componentScores = {
    domainScore,
    experienceScore,
    skillGapScore,
    resourceScore
  };

  const strengths = identifyStrengths(profile, requiredSkills, componentScores);
  const gaps = identifyGaps(profile, requiredSkills, componentScores);
  const recommendations = generateRecommendations(profile, requiredSkills, gaps, componentScores);

  return {
    score: finalScore,
    yourEdge: identifyEdge(componentScores),
    strengths,
    gaps,
    recommendations,
    requiredSkills,
    componentScores
  };
}
