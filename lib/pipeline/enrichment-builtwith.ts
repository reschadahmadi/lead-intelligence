/**
 * BuiltWith Enrichment Client
 *
 * Called only for companies with >500 employees.
 * Provides: tech stack detection + competitive AI tool intelligence.
 * Uses NOPII=yes flag — no personal data returned.
 *
 * To enable real API calls:
 * 1. Set BUILTWITH_API_KEY in .env.local
 * 2. Set USE_MOCK_ENRICHMENT=false in .env.local
 */

// ── Types matching BuiltWith API response shape ──

export interface BuiltWithResponse {
  domain: string
  technologies: {
    name: string
    tag: string
    category: string
    first_detected: string | null
    last_detected: string | null
  }[]
  competitor_tools: {
    name: string
    category: string
  }[]
  match_confidence: 'high' | 'medium' | 'low' | 'none'
}

// ── Seeded random ──

function domainHash(domain: string): number {
  let hash = 0
  for (let i = 0; i < domain.length; i++) {
    hash = ((hash << 5) - hash + domain.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ── Mock Data Pools ──

const TECH_STACKS: { name: string; tag: string; category: string }[][] = [
  [
    { name: 'AWS', tag: 'aws', category: 'Cloud Infrastructure' },
    { name: 'React', tag: 'react', category: 'Frontend Framework' },
    { name: 'Node.js', tag: 'nodejs', category: 'Backend Runtime' },
    { name: 'PostgreSQL', tag: 'postgresql', category: 'Database' },
    { name: 'Docker', tag: 'docker', category: 'Containerization' },
    { name: 'Kubernetes', tag: 'kubernetes', category: 'Orchestration' },
  ],
  [
    { name: 'Azure', tag: 'azure', category: 'Cloud Infrastructure' },
    { name: 'Angular', tag: 'angular', category: 'Frontend Framework' },
    { name: 'Python', tag: 'python', category: 'Programming Language' },
    { name: 'MongoDB', tag: 'mongodb', category: 'Database' },
    { name: 'Terraform', tag: 'terraform', category: 'IaC' },
    { name: 'Jenkins', tag: 'jenkins', category: 'CI/CD' },
  ],
  [
    { name: 'GCP', tag: 'gcp', category: 'Cloud Infrastructure' },
    { name: 'Vue.js', tag: 'vuejs', category: 'Frontend Framework' },
    { name: 'Go', tag: 'go', category: 'Programming Language' },
    { name: 'Redis', tag: 'redis', category: 'Cache' },
    { name: 'Helm', tag: 'helm', category: 'Package Manager' },
    { name: 'Datadog', tag: 'datadog', category: 'Observability' },
  ],
  [
    { name: 'AWS', tag: 'aws', category: 'Cloud Infrastructure' },
    { name: 'Next.js', tag: 'nextjs', category: 'Full-Stack Framework' },
    { name: 'TypeScript', tag: 'typescript', category: 'Programming Language' },
    { name: 'Supabase', tag: 'supabase', category: 'BaaS' },
    { name: 'Vercel', tag: 'vercel', category: 'Hosting' },
    { name: 'Sentry', tag: 'sentry', category: 'Error Tracking' },
  ],
  [
    { name: 'Azure', tag: 'azure', category: 'Cloud Infrastructure' },
    { name: 'Django', tag: 'django', category: 'Web Framework' },
    { name: 'Python', tag: 'python', category: 'Programming Language' },
    { name: 'MySQL', tag: 'mysql', category: 'Database' },
    { name: 'GitHub Actions', tag: 'github-actions', category: 'CI/CD' },
    { name: 'Grafana', tag: 'grafana', category: 'Monitoring' },
  ],
]

const AI_COMPETITOR_TOOLS: { name: string; category: string }[] = [
  { name: 'OpenAI GPT-4', category: 'Large Language Model' },
  { name: 'OpenAI GPT-4o', category: 'Large Language Model' },
  { name: 'Google Gemini', category: 'Large Language Model' },
  { name: 'Google Vertex AI', category: 'AI Platform' },
  { name: 'Cohere Command', category: 'Large Language Model' },
  { name: 'Cohere Embed', category: 'Embeddings' },
  { name: 'Mistral AI', category: 'Large Language Model' },
  { name: 'Hugging Face Inference', category: 'Model Hosting' },
  { name: 'AWS Bedrock', category: 'AI Platform' },
  { name: 'Azure OpenAI Service', category: 'AI Platform' },
]

// ── Mock Implementation ──

function generateMockBuiltWith(domain: string): BuiltWithResponse {
  // Use different seed offset from Cognism/Crunchbase
  const seed = domainHash(domain) + 13337
  const rand = seededRandom(seed)
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
  const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min

  const stack = pick(TECH_STACKS)
  // Randomly include 4-6 technologies from the selected stack
  const numTech = randInt(4, stack.length)
  const technologies = stack.slice(0, numTech).map((t) => ({
    ...t,
    first_detected: `${randInt(2019, 2023)}-${String(randInt(1, 12)).padStart(2, '0')}-01`,
    last_detected: `2026-${String(randInt(1, 4)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
  }))

  // ~35% chance of detecting competitor AI tools
  const hasCompetitorTools = rand() < 0.35
  const competitorTools: { name: string; category: string }[] = []
  if (hasCompetitorTools) {
    const numTools = randInt(1, 3)
    const shuffled = [...AI_COMPETITOR_TOOLS].sort(() => rand() - 0.5)
    competitorTools.push(...shuffled.slice(0, numTools))
  }

  return {
    domain,
    technologies,
    competitor_tools: competitorTools,
    match_confidence: rand() < 0.6 ? 'high' : rand() < 0.85 ? 'medium' : 'low',
  }
}

// ── Public API ──

const USE_MOCK = process.env.USE_MOCK_ENRICHMENT !== 'false'

export async function builtwithLookupDomain(domain: string): Promise<BuiltWithResponse> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 60))
    return generateMockBuiltWith(domain)
  }

  // ── Real API call (swap in when ready) ──
  const apiKey = process.env.BUILTWITH_API_KEY
  if (!apiKey) throw new Error('BUILTWITH_API_KEY not configured')

  const url = `https://api.builtwith.com/free1/api.json?KEY=${apiKey}&LOOKUP=${domain}&NOPII=yes`
  const res = await fetch(url)

  if (!res.ok) {
    console.error(`BuiltWith lookup failed: ${res.status} ${res.statusText}`)
    return { domain, technologies: [], competitor_tools: [], match_confidence: 'none' }
  }

  return res.json()
}
