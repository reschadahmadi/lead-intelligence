/**
 * Cognism Enrichment Client
 *
 * Called for EVERY lead. Provides company firmographics + geography.
 * No personal/individual data — company-level only.
 *
 * To enable real API calls:
 * 1. Set COGNISM_API_KEY in .env.local
 * 2. Set USE_MOCK_ENRICHMENT=false in .env.local
 */

// ── Types matching Cognism API response shape ──

export interface CognismCompanyResponse {
  company: {
    name: string
    domain: string
    type: 'Public' | 'Private' | 'Government' | 'Nonprofit' | null
    industry: string | null
    sub_industry: string | null
    employee_count: number | null
    employee_range: string | null
    revenue_estimate: number | null
    founded_year: number | null
    operating_status: 'Active' | 'Inactive' | 'Acquired' | null
    hq: {
      country: string | null
      country_code: string | null
      region: string | null
      city: string | null
    }
    hiring_signals: {
      is_hiring: boolean
      open_roles_count: number | null
      recent_job_categories: string[] | null
    }
  } | null
  match_confidence: 'high' | 'medium' | 'low' | 'none'
}

// ── Seeded random for consistent mock data ──

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

const INDUSTRIES = [
  'Software', 'Software – Fintech', 'Software – Healthtech', 'Software – Cybersecurity',
  'Software – DevTools', 'Software – Data Infrastructure',
  'Healthcare & Life Sciences', 'Financial Services', 'Legal Services',
  'Telecommunications', 'Professional Services', 'Government & Public Sector',
  'Manufacturing & Industrial', 'Retail & Consumer Goods', 'Education', 'Nonprofit',
  'Energy & Utilities', 'Media & Entertainment', 'Real Estate', 'Transportation & Logistics',
]

const COMPANY_TYPES: ('Public' | 'Private' | 'Government' | 'Nonprofit')[] = [
  'Private', 'Private', 'Private', 'Public', 'Private', 'Private', 'Public', 'Private', 'Government', 'Nonprofit',
]

const CITIES: { country: string; code: string; region: string; city: string }[] = [
  { country: 'Germany', code: 'DE', region: 'Bavaria', city: 'Munich' },
  { country: 'Germany', code: 'DE', region: 'Berlin', city: 'Berlin' },
  { country: 'Germany', code: 'DE', region: 'Hesse', city: 'Frankfurt' },
  { country: 'United Kingdom', code: 'GB', region: 'England', city: 'London' },
  { country: 'United Kingdom', code: 'GB', region: 'England', city: 'Manchester' },
  { country: 'United Kingdom', code: 'GB', region: 'Scotland', city: 'Edinburgh' },
  { country: 'France', code: 'FR', region: 'Île-de-France', city: 'Paris' },
  { country: 'France', code: 'FR', region: 'Auvergne-Rhône-Alpes', city: 'Lyon' },
  { country: 'Netherlands', code: 'NL', region: 'North Holland', city: 'Amsterdam' },
  { country: 'Sweden', code: 'SE', region: 'Stockholm County', city: 'Stockholm' },
  { country: 'Spain', code: 'ES', region: 'Community of Madrid', city: 'Madrid' },
  { country: 'Spain', code: 'ES', region: 'Catalonia', city: 'Barcelona' },
  { country: 'Italy', code: 'IT', region: 'Lombardy', city: 'Milan' },
  { country: 'Switzerland', code: 'CH', region: 'Zurich', city: 'Zurich' },
  { country: 'Ireland', code: 'IE', region: 'Leinster', city: 'Dublin' },
  { country: 'Denmark', code: 'DK', region: 'Capital Region', city: 'Copenhagen' },
  { country: 'Norway', code: 'NO', region: 'Oslo', city: 'Oslo' },
  { country: 'Finland', code: 'FI', region: 'Uusimaa', city: 'Helsinki' },
  { country: 'Belgium', code: 'BE', region: 'Brussels-Capital', city: 'Brussels' },
  { country: 'Austria', code: 'AT', region: 'Vienna', city: 'Vienna' },
  { country: 'Poland', code: 'PL', region: 'Masovia', city: 'Warsaw' },
  { country: 'Portugal', code: 'PT', region: 'Lisbon', city: 'Lisbon' },
  { country: 'United Arab Emirates', code: 'AE', region: 'Dubai', city: 'Dubai' },
  { country: 'Israel', code: 'IL', region: 'Tel Aviv', city: 'Tel Aviv' },
]

const JOB_CATEGORIES = [
  'Engineering', 'Data Science', 'Product Management', 'DevOps', 'Machine Learning',
  'Sales', 'Marketing', 'Customer Success', 'Design', 'Security',
]

// ── Mock Implementation ──

function generateMockCompany(domain: string, selfReportedCountry: string | null): CognismCompanyResponse {
  const seed = domainHash(domain)
  const rand = seededRandom(seed)
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
  const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min

  // Company size tier based on domain hash for consistency
  const sizeTier = rand()
  let employeeCount: number
  let revenueMultiplier: number
  if (sizeTier < 0.15) {
    employeeCount = randInt(10, 50)
    revenueMultiplier = randInt(80000, 150000)
  } else if (sizeTier < 0.40) {
    employeeCount = randInt(51, 250)
    revenueMultiplier = randInt(100000, 180000)
  } else if (sizeTier < 0.65) {
    employeeCount = randInt(251, 2000)
    revenueMultiplier = randInt(120000, 200000)
  } else if (sizeTier < 0.85) {
    employeeCount = randInt(2001, 15000)
    revenueMultiplier = randInt(150000, 250000)
  } else {
    employeeCount = randInt(15001, 100000)
    revenueMultiplier = randInt(180000, 300000)
  }

  const industry = pick(INDUSTRIES)
  const companyType = pick(COMPANY_TYPES)

  // Prefer self-reported country if available
  let location: typeof CITIES[0]
  if (selfReportedCountry) {
    const matches = CITIES.filter(
      (c) => c.code === selfReportedCountry.toUpperCase() || c.country.toLowerCase() === selfReportedCountry.toLowerCase()
    )
    location = matches.length > 0 ? pick(matches) : pick(CITIES)
  } else {
    location = pick(CITIES)
  }

  const isHiring = rand() < 0.45
  const companyName = domain.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return {
    company: {
      name: companyName,
      domain,
      type: companyType,
      industry,
      sub_industry: null,
      employee_count: employeeCount,
      employee_range: employeeCount < 50 ? '1-50' : employeeCount < 200 ? '51-200' : employeeCount < 1000 ? '201-1000' : employeeCount < 5000 ? '1001-5000' : employeeCount < 10000 ? '5001-10000' : '10000+',
      revenue_estimate: employeeCount * revenueMultiplier,
      founded_year: randInt(1985, 2023),
      operating_status: 'Active',
      hq: {
        country: location.country,
        country_code: location.code,
        region: location.region,
        city: location.city,
      },
      hiring_signals: {
        is_hiring: isHiring,
        open_roles_count: isHiring ? randInt(5, 200) : 0,
        recent_job_categories: isHiring ? JOB_CATEGORIES.filter(() => rand() < 0.3) : null,
      },
    },
    match_confidence: rand() < 0.7 ? 'high' : rand() < 0.9 ? 'medium' : 'low',
  }
}

// ── Public API ──

const USE_MOCK = process.env.USE_MOCK_ENRICHMENT !== 'false'

export async function cognismLookupCompany(
  domain: string,
  selfReportedCountry: string | null
): Promise<CognismCompanyResponse> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 50))
    return generateMockCompany(domain, selfReportedCountry)
  }

  // ── Real API call (swap in when ready) ──
  const apiKey = process.env.COGNISM_API_KEY
  if (!apiKey) throw new Error('COGNISM_API_KEY not configured')

  const res = await fetch('https://api.cognism.com/v1/company/lookup', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ domain }),
  })

  if (!res.ok) {
    console.error(`Cognism company lookup failed: ${res.status} ${res.statusText}`)
    return { company: null, match_confidence: 'none' }
  }

  return res.json()
}
