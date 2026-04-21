import { createClient } from '../supabase/server'
import type { NormalizedLead, EnrichmentData, MultiplierResult } from './types'

// Domain 1: Firmographic Intelligence — Max 18
function scoreFirmographic(enrichment: EnrichmentData): number {
  let score = 0

  // is_global_2000 (max 5)
  if (enrichment.is_global_2000) score += 5

  // employee_count (max 4)
  const emp = enrichment.employee_count ?? 0
  if (emp >= 50000) score += 4
  else if (emp >= 10000) score += 3
  else if (emp >= 2500) score += 2
  else if (emp >= 500) score += 1

  // revenue_estimate (max 3)
  const rev = enrichment.revenue_estimate ?? 0
  if (rev > 1_000_000_000) score += 3
  else if (rev >= 100_000_000) score += 2
  else if (rev >= 10_000_000) score += 1

  // industry (max 4)
  const industry = (enrichment.industry ?? '').toLowerCase()
  if (industry.includes('healthtech') || industry.includes('fintech')) score += 4
  else if (industry.includes('cybersecurity')) score += 3
  else if (industry.includes('healthcare') || industry.includes('life sciences')) score += 3
  else if (industry.includes('financial services')) score += 3
  else if (industry === 'software') score += 2
  else if (industry.includes('legal')) score += 2
  else if (industry.includes('telecom')) score += 1
  else if (industry.includes('professional services')) score += 1
  else if (industry.includes('government') || industry.includes('public sector')) score += 1
  else if (industry.includes('manufacturing')) score += 1

  return Math.min(18, score)
}

// Domain 2: Financial Momentum — Max 15
function scoreFinancial(enrichment: EnrichmentData): number {
  let score = 0

  // last_funding_date (max 4)
  if (enrichment.last_funding_date) {
    const fundingDate = new Date(enrichment.last_funding_date)
    const monthsAgo = (Date.now() - fundingDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (monthsAgo <= 6) score += 4
    else if (monthsAgo <= 12) score += 2
    else if (monthsAgo <= 24) score += 1
  }

  // last_funding_amount (max 3)
  const amount = enrichment.last_funding_amount ?? 0
  if (amount > 100_000_000) score += 3
  else if (amount >= 10_000_000) score += 2
  else if (amount > 0) score += 1

  // total_funding_amount (max 2)
  const total = enrichment.total_funding_amount ?? 0
  if (total > 500_000_000) score += 2
  else if (total > 100_000_000) score += 1

  // number_of_funding_rounds (max 1)
  if ((enrichment.number_of_funding_rounds ?? 0) >= 5) score += 1

  // company_hiring_event_flag (max 2)
  if (enrichment.company_hiring_event_flag) score += 2

  // last_funding_type (max 3)
  const fundingType = (enrichment.last_funding_type ?? '').toLowerCase()
  if (fundingType.includes('series d') || fundingType.includes('series e') || fundingType.includes('series c')) {
    score += 3
  } else if (fundingType.includes('series b') || fundingType.includes('series a')) {
    score += 1
  }

  return Math.min(15, score)
}

// Domain 3: Technology & Competitive Landscape — Max 14
function scoreTechCompetitive(enrichment: EnrichmentData): number {
  let score = 0

  // competitor_tool_detected (max 6)
  if (enrichment.competitor_tool_detected) score += 6

  // competitor_tools_list specifics (max ~6 additional but capped by domain max)
  const competitors = (enrichment.competitor_tools_list ?? []).map((c) => c.toLowerCase())
  if (competitors.some((c) => c.includes('openai'))) score += 2
  if (competitors.some((c) => c.includes('google'))) score += 2
  if (competitors.some((c) => c.includes('cohere'))) score += 1
  if (competitors.some((c) => c.includes('hugging face'))) score += 1
  if (competitors.length > 1) score += 1 // multiple competitors bonus

  // technology_categories — Claude-ready infra (max 3)
  const categories = (enrichment.technology_categories ?? []).map((c) => c.toLowerCase())
  const hasCloud = categories.some((c) => c.includes('cloud'))
  const hasFramework = categories.some((c) => c.includes('framework') || c.includes('api'))
  const hasData = categories.some((c) => c.includes('database') || c.includes('data'))
  if (hasCloud && hasFramework && hasData) score += 3
  else if (hasCloud || hasFramework) score += 1

  // technology_first_detected — maturity (max 2)
  if (enrichment.technology_first_detected) {
    const firstDetected = new Date(enrichment.technology_first_detected)
    const yearsAgo = (Date.now() - firstDetected.getTime()) / (1000 * 60 * 60 * 24 * 365)
    if (yearsAgo >= 3) score += 2
    else if (yearsAgo >= 1) score += 1
  }

  return Math.min(14, score)
}

// Domain 4: Organizational Buying Behavior — Max 10
async function scoreOrganizational(emailDomain: string): Promise<number> {
  let score = 0

  const supabase = await createClient()

  // Count commercial leads from same domain (excluding support)
  const { data: domainLeads } = await supabase
    .from('leads')
    .select('created_at')
    .eq('email_domain', emailDomain)
    .eq('ingestion_status', 'passed')
    .neq('inquiry_type', 'support')
    .order('created_at', { ascending: false })

  const count = domainLeads?.length ?? 0

  // account_commercial_lead_count (max 5)
  if (count >= 5) score += 5
  else if (count >= 3) score += 4
  else if (count >= 2) score += 3

  // account_time_concentration (max 5)
  if (domainLeads && domainLeads.length >= 2) {
    const now = Date.now()
    const within7d = domainLeads.filter(
      (l) => (now - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 7
    ).length
    const within30d = domainLeads.filter(
      (l) => (now - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24) <= 30
    ).length

    if (within7d >= 3) score += 5
    else if (within30d >= 3) score += 3
    else if (within7d >= 2) score += 3
    else if (within30d >= 2) score += 1
  }

  return Math.min(10, score)
}

// Domain 5: Individual Engagement Pattern — Max 8
async function scoreIndividual(email: string, currentInquiryType: string): Promise<number> {
  let score = 0

  const supabase = await createClient()

  const { data: previousLeads } = await supabase
    .from('leads')
    .select('inquiry_type, created_at')
    .eq('email', email)
    .eq('ingestion_status', 'passed')
    .order('created_at', { ascending: true })

  const prevCount = previousLeads?.length ?? 0

  // multi_touch_count (max 3)
  if (prevCount >= 3) score += 3
  else if (prevCount >= 2) score += 2

  // multi_touch_progression (max 5)
  if (prevCount > 0 && currentInquiryType === 'contact_sales') {
    const previousTypes = previousLeads!.map((l) => l.inquiry_type)
    if (previousTypes.includes('support')) score += 5
    else if (previousTypes.includes('rate_limit')) score += 4
    else if (previousTypes.some((t) => ['zdr', 'baa', 'invoicing'].includes(t))) score += 3
  } else if (prevCount > 0) {
    // Same form repeated
    score += 1
  }

  return Math.min(8, score)
}

export async function runMultipliers(
  lead: NormalizedLead,
  enrichment: EnrichmentData
): Promise<MultiplierResult> {
  const firmographic = scoreFirmographic(enrichment)
  const financial = scoreFinancial(enrichment)
  const techCompetitive = scoreTechCompetitive(enrichment)

  const [organizational, individual] = await Promise.all([
    scoreOrganizational(lead.email_domain),
    scoreIndividual(lead.email, lead.inquiry_type),
  ])

  return {
    multiplier_firmographic: firmographic,
    multiplier_financial: financial,
    multiplier_tech_competitive: techCompetitive,
    multiplier_organizational: organizational,
    multiplier_individual: individual,
    total_multiplier_score: firmographic + financial + techCompetitive + organizational + individual,
  }
}
