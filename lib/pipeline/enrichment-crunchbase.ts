/**
 * Crunchbase Enrichment Client
 *
 * Crunchbase provides: funding history, investor data, acquisitions,
 * IPO status, Global 2000 membership, and financial signals.
 *
 * To enable real API calls:
 * 1. Set CRUNCHBASE_API_KEY in .env.local
 * 2. Set USE_MOCK_ENRICHMENT=false in .env.local
 * 3. The mock layer automatically disengages
 */

// ── Types matching Crunchbase API response shape ──

export interface CrunchbaseOrgResponse {
  organization: {
    name: string
    domain: string
    short_description: string | null
    founded_on: string | null
    ipo_status: 'private' | 'public' | 'delisted' | null
    company_type: string | null
    num_employees_enum: string | null
    revenue_range: string | null
    operating_status: 'active' | 'closed' | 'acquired' | null
    categories: string[] | null
    category_groups: string[] | null
    is_global_2000: boolean
    funding_summary: {
      funding_total_usd: number | null
      num_funding_rounds: number | null
      last_funding_type: string | null
      last_funding_at: string | null
      last_funding_amount_usd: number | null
    }
    investors: {
      name: string
      type: 'organization' | 'person'
      lead: boolean
    }[]
    acquisitions: {
      acquiree_name: string
      announced_on: string | null
      price_usd: number | null
    }[]
    competitor_tools: {
      name: string
      category: string | null
    }[]
  } | null
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

const FUNDING_TYPES = ['pre_seed', 'seed', 'series_a', 'series_b', 'series_c', 'series_d', 'series_e', 'private_equity', 'debt_financing', 'grant']

const INVESTOR_NAMES = [
  'Sequoia Capital', 'Andreessen Horowitz', 'Accel Partners', 'Index Ventures',
  'Balderton Capital', 'Atomico', 'Northzone', 'EQT Ventures', 'Lakestar',
  'Cherry Ventures', 'HV Capital', 'Earlybird Venture Capital', 'Speedinvest',
  'Point Nine Capital', 'Creandum', 'General Catalyst', 'Lightspeed Venture Partners',
  'Tiger Global', 'SoftBank Vision Fund', 'Insight Partners', 'Coatue Management',
  'Battery Ventures', 'Bessemer Venture Partners', 'GV (Google Ventures)',
  'Microsoft M12', 'Salesforce Ventures', 'Sapphire Ventures',
]

const ACQUIREE_NAMES = [
  'DataSync Labs', 'CloudNine Analytics', 'ML Studio', 'SecureVault',
  'APIConnect', 'DevMetrics', 'StreamProcess', 'InsightAI', 'AutoScale',
  'NeuralOps', 'QuantumData', 'FlowEngine', 'CacheLayer', 'EdgeCompute',
]

const AI_COMPETITOR_TOOLS = [
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
  { name: 'Databricks ML', category: 'ML Platform' },
  { name: 'Snowflake Cortex', category: 'AI Platform' },
]

const CATEGORY_GROUPS = [
  'Artificial Intelligence', 'SaaS', 'Enterprise Software', 'Data Analytics',
  'Cloud Computing', 'Cybersecurity', 'FinTech', 'HealthTech', 'DevOps',
  'Machine Learning', 'Natural Language Processing', 'Computer Vision',
]

// ── Mock Implementation ──

function generateMockOrg(domain: string): CrunchbaseOrgResponse {
  // Use a different seed offset from Cognism so data varies but is still deterministic
  const seed = domainHash(domain) + 7919
  const rand = seededRandom(seed)
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
  const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
  const pickN = <T,>(arr: T[], n: number): T[] => {
    const shuffled = [...arr].sort(() => rand() - 0.5)
    return shuffled.slice(0, n)
  }

  const companyName = domain.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  // Funding profile
  const hasFunding = rand() < 0.65
  const fundingTypeIdx = hasFunding ? randInt(0, FUNDING_TYPES.length - 1) : -1
  const fundingType = hasFunding ? FUNDING_TYPES[fundingTypeIdx] : null
  const fundingStage = fundingTypeIdx // higher index = later stage

  // Scale funding amounts by stage
  let lastFundingAmount: number | null = null
  let totalFunding: number | null = null
  let numRounds: number | null = null

  if (hasFunding) {
    if (fundingStage <= 1) {
      // Pre-seed / Seed
      lastFundingAmount = randInt(500000, 5000000)
      numRounds = randInt(1, 2)
      totalFunding = lastFundingAmount * randInt(1, 2)
    } else if (fundingStage <= 3) {
      // Series A-B
      lastFundingAmount = randInt(5000000, 50000000)
      numRounds = randInt(2, 4)
      totalFunding = lastFundingAmount + randInt(2000000, 20000000)
    } else if (fundingStage <= 5) {
      // Series C-D
      lastFundingAmount = randInt(30000000, 200000000)
      numRounds = randInt(3, 6)
      totalFunding = lastFundingAmount + randInt(50000000, 150000000)
    } else {
      // Series E+ / PE / Debt
      lastFundingAmount = randInt(100000000, 500000000)
      numRounds = randInt(5, 10)
      totalFunding = lastFundingAmount + randInt(200000000, 800000000)
    }
  }

  // Funding recency
  const monthsAgoFunding = hasFunding ? randInt(1, 36) : null
  const lastFundingDate = monthsAgoFunding
    ? new Date(Date.now() - monthsAgoFunding * 30 * 86400000).toISOString().split('T')[0]
    : null

  // Investors
  const numInvestors = hasFunding ? randInt(1, Math.min(8, numRounds! + 3)) : 0
  const investors = pickN(INVESTOR_NAMES, numInvestors).map((name, i) => ({
    name,
    type: 'organization' as const,
    lead: i === 0,
  }))

  // Acquisitions
  const hasAcquisitions = rand() < 0.25
  const numAcquisitions = hasAcquisitions ? randInt(1, 4) : 0
  const acquisitions = pickN(ACQUIREE_NAMES, numAcquisitions).map((name) => ({
    acquiree_name: name,
    announced_on: `${randInt(2020, 2025)}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
    price_usd: rand() < 0.4 ? randInt(5000000, 200000000) : null, // Often undisclosed
  }))

  // Competitor tools (~35% chance of detecting AI tools)
  const hasCompetitorTools = rand() < 0.35
  const competitorTools = hasCompetitorTools ? pickN(AI_COMPETITOR_TOOLS, randInt(1, 3)) : []

  // IPO status
  const ipoStatus: 'private' | 'public' | null = rand() < 0.12 ? 'public' : 'private'

  // Global 2000
  const isGlobal2000 = ipoStatus === 'public' && rand() < 0.4

  // Categories
  const categories = pickN(CATEGORY_GROUPS, randInt(1, 3))

  return {
    organization: {
      name: companyName,
      domain,
      short_description: `${companyName} is a ${pick(['leading', 'fast-growing', 'innovative', 'established'])} ${pick(['technology', 'software', 'enterprise', 'platform'])} company.`,
      founded_on: `${randInt(1990, 2023)}-01-01`,
      ipo_status: ipoStatus,
      company_type: ipoStatus === 'public' ? 'Public' : 'Private',
      num_employees_enum: null,
      revenue_range: null,
      operating_status: 'active',
      categories,
      category_groups: categories,
      is_global_2000: isGlobal2000,
      funding_summary: {
        funding_total_usd: totalFunding,
        num_funding_rounds: numRounds,
        last_funding_type: fundingType,
        last_funding_at: lastFundingDate,
        last_funding_amount_usd: lastFundingAmount,
      },
      investors,
      acquisitions,
      competitor_tools: competitorTools,
    },
    match_confidence: rand() < 0.6 ? 'high' : rand() < 0.85 ? 'medium' : 'low',
  }
}

// ── Public API ──

const USE_MOCK = process.env.USE_MOCK_ENRICHMENT !== 'false'

export async function crunchbaseLookupOrganization(domain: string): Promise<CrunchbaseOrgResponse> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 80))
    return generateMockOrg(domain)
  }

  // ── Real API call (swap in when ready) ──
  const apiKey = process.env.CRUNCHBASE_API_KEY
  if (!apiKey) throw new Error('CRUNCHBASE_API_KEY not configured')

  const res = await fetch(`https://api.crunchbase.com/api/v4/entities/organizations/${domain}?user_key=${apiKey}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    console.error(`Crunchbase lookup failed: ${res.status} ${res.statusText}`)
    return { organization: null, match_confidence: 'none' }
  }

  return res.json()
}
