/**
 * Enrichment Orchestrator
 *
 * Per PRD — company-level enrichment only, no personal data:
 *
 * | Source    | When Called         | Returns                         |
 * |-----------|---------------------|---------------------------------|
 * | Cognism   | Every lead          | Firmographics + geography       |
 * | Crunchbase| >500 employees      | Funding + growth signals        |
 * | BuiltWith | >500 employees      | Tech stack + competitive intel  |
 *
 * Data priority:
 * - Company basics: Cognism primary
 * - Funding & financials: Crunchbase (authoritative)
 * - Tech stack & competitors: BuiltWith (authoritative)
 * - Hiring signals: Cognism
 * - Global 2000 / IPO: Crunchbase
 */

import type { NormalizedLead, EnrichmentData } from './types'
import type { EnrichmentStatus } from '../types/lead'
import { cognismLookupCompany } from './enrichment-cognism'
import { crunchbaseLookupOrganization } from './enrichment-crunchbase'
import { builtwithLookupDomain } from './enrichment-builtwith'

function determineEnrichmentStatus(
  hasCognism: boolean,
  hasCrunchbase: boolean,
  hasBuiltWith: boolean,
  qualifiesForDeep: boolean
): EnrichmentStatus {
  if (!hasCognism) return 'minimal'
  if (!qualifiesForDeep) return hasCognism ? 'complete' : 'partial' // Small companies only get Cognism
  if (hasCrunchbase && hasBuiltWith) return 'complete'
  if (hasCrunchbase || hasBuiltWith) return 'partial'
  return 'partial'
}

export async function runEnrichment(lead: NormalizedLead): Promise<EnrichmentData> {
  // Step 1: Always call Cognism for firmographics
  const cognismResult = await cognismLookupCompany(lead.email_domain, lead.self_reported_country)
  const company = cognismResult.company

  // Determine employee count for conditional enrichment
  const employeeCount = company?.employee_count ?? lead.self_reported_employee_count ?? 0
  const qualifiesForDeep = employeeCount > 500

  // Step 2: Conditionally call Crunchbase + BuiltWith (>500 employees)
  let crunchbaseResult = null
  let builtwithResult = null

  if (qualifiesForDeep) {
    const [cbResult, bwResult] = await Promise.all([
      crunchbaseLookupOrganization(lead.email_domain),
      builtwithLookupDomain(lead.email_domain),
    ])
    crunchbaseResult = cbResult
    builtwithResult = bwResult
  }

  const org = crunchbaseResult?.organization ?? null
  const bw = builtwithResult

  // Determine enrichment quality
  const enrichmentStatus = determineEnrichmentStatus(
    cognismResult.match_confidence !== 'none',
    crunchbaseResult?.match_confidence !== 'none' && crunchbaseResult?.match_confidence !== undefined,
    builtwithResult?.match_confidence !== 'none' && builtwithResult?.match_confidence !== undefined,
    qualifiesForDeep
  )

  // ── Company Basics (Cognism primary) ──
  const companyName = company?.name ?? lead.company_name ?? `${lead.email_domain.split('.')[0]} Inc.`
  const industry = company?.industry ?? (org?.categories?.[0] ?? null)
  const revenueEstimate = company?.revenue_estimate ?? null
  const foundedYear = company?.founded_year ?? (org?.founded_on ? parseInt(org.founded_on.split('-')[0], 10) : null)

  // ── HQ Location (Cognism primary) ──
  const hqCountry = company?.hq.country_code ?? lead.self_reported_country
  const hqRegion = company?.hq.region ?? null
  const hqCity = company?.hq.city ?? null

  // ── Funding (Crunchbase, only for >500 employees) ──
  const funding = org?.funding_summary ?? null
  const hasFunding = (funding?.funding_total_usd ?? 0) > 0

  // ── Tech Stack (BuiltWith, only for >500 employees) ──
  const technologies = bw?.technologies ?? null

  // ── Competitor Tools (BuiltWith, only for >500 employees) ──
  const competitorTools = bw?.competitor_tools ?? []
  const competitorToolNames = competitorTools.map((t) => t.name)

  // ── Signals ──
  const isHiring = company?.hiring_signals.is_hiring ?? false
  const isGlobal2000 = org?.is_global_2000 ?? false
  const ipoStatus = org?.ipo_status ?? null
  const companyType = company?.type ?? org?.company_type ?? (employeeCount >= 2500 ? 'Enterprise' : 'Startup')

  return {
    enrichment_status: enrichmentStatus,
    company_name: companyName,
    company_domain: lead.email_domain,
    company_type: companyType,
    industry,
    employee_count: employeeCount > 0 ? employeeCount : null,
    revenue_estimate: revenueEstimate,
    founded_year: foundedYear,
    hq_country: hqCountry,
    hq_region: hqRegion,
    hq_city: hqCity,

    // Hiring / funding event flags
    company_funding_event_flag: hasFunding && funding?.last_funding_at
      ? (Date.now() - new Date(funding.last_funding_at).getTime()) / (1000 * 60 * 60 * 24) < 180
      : false,
    company_hiring_event_flag: isHiring,

    // Operating status
    operating_status: company?.operating_status ?? org?.operating_status ?? 'Active',

    // Funding details (Crunchbase — null for small companies)
    funding_status: hasFunding ? 'Funded' : (qualifiesForDeep ? 'Bootstrapped' : null),
    number_of_funding_rounds: funding?.num_funding_rounds ?? null,
    tech_spend_estimate: revenueEstimate ? Math.round(revenueEstimate * 0.05) : null,
    number_of_acquisitions: org?.acquisitions.length ?? 0,
    ipo_status: ipoStatus === 'public' ? 'Public' : ipoStatus === 'private' ? 'Private' : null,
    last_funding_type: funding?.last_funding_type ?? null,
    last_funding_amount: funding?.last_funding_amount_usd ?? null,
    last_funding_date: funding?.last_funding_at ?? null,
    total_funding_amount: funding?.funding_total_usd ?? null,
    number_of_investors: org?.investors.length ?? null,

    // Tech stack (BuiltWith — null for small companies)
    technology_name: technologies?.map((t) => t.name) ?? null,
    technology_tag: technologies?.map((t) => t.tag) ?? null,
    technology_categories: technologies?.map((t) => t.category) ?? null,
    technology_first_detected: technologies?.[0]?.first_detected ?? null,
    technology_last_detected: technologies?.[0]?.last_detected ?? null,

    // Competitive intelligence (BuiltWith)
    is_global_2000: isGlobal2000,
    competitor_tool_detected: competitorToolNames.length > 0,
    competitor_tools_list: competitorToolNames.length > 0 ? competitorToolNames : null,
  }
}
