import type { LeadTier } from '../types/lead'
import type {
  NormalizedLead,
  EnrichmentData,
  RoutingResult,
  ScoringResult,
  MultiplierResult,
  ActioningResult,
} from './types'
import { createClient } from '../supabase/server'

// Accelerate 110+  |  Engage 50-109  |  Nurture <50
function assignTier(finalScore: number): LeadTier {
  if (finalScore >= 110) return 'hot'       // Accelerate
  if (finalScore >= 50) return 'warm'       // Engage
  return 'cold'                             // Nurture
}

function calculateSlaDeadline(tier: LeadTier): string | null {
  const now = new Date()
  switch (tier) {
    case 'hot':
      // Accelerate: 2-hour response window
      now.setHours(now.getHours() + 2)
      return now.toISOString()
    case 'warm':
      // Engage: 1 business day response window
      now.setDate(now.getDate() + 1)
      // Skip weekends
      while (now.getDay() === 0 || now.getDay() === 6) {
        now.setDate(now.getDate() + 1)
      }
      return now.toISOString()
    case 'cold':
      // Nurture: No outreach, park in CRM
      return null
  }
}

export async function runActioning(
  lead: NormalizedLead,
  enrichment: EnrichmentData,
  routing: RoutingResult,
  scoring: ScoringResult,
  multipliers: MultiplierResult
): Promise<ActioningResult> {
  const finalScore = scoring.total_form_score + multipliers.total_multiplier_score
  const tier = assignTier(finalScore)
  const slaDeadline = calculateSlaDeadline(tier)

  const supabase = await createClient()

  const { error } = await supabase.from('leads').insert({
    // Form / ingestion data
    email: lead.email,
    email_domain: lead.email_domain,
    first_name: lead.first_name,
    last_name: lead.last_name,
    inquiry_type: lead.inquiry_type,
    job_title: lead.job_title,
    free_text: lead.free_text,
    evaluation_journey: lead.evaluation_journey,
    product_interest: lead.product_interest,
    rate_limit_tier: lead.rate_limit_tier,
    tokens_per_minute: lead.tokens_per_minute,
    uk_eu_ch_entity: lead.uk_eu_ch_entity,
    expected_spend: lead.expected_spend,
    ingestion_status: 'passed',

    // Enrichment
    enrichment_status: enrichment.enrichment_status,
    company_name: enrichment.company_name,
    company_domain: enrichment.company_domain,
    company_type: enrichment.company_type,
    industry: enrichment.industry,
    employee_count: enrichment.employee_count,
    revenue_estimate: enrichment.revenue_estimate,
    founded_year: enrichment.founded_year,
    hq_country: enrichment.hq_country,
    hq_region: enrichment.hq_region,
    hq_city: enrichment.hq_city,
    company_funding_event_flag: enrichment.company_funding_event_flag,
    company_hiring_event_flag: enrichment.company_hiring_event_flag,
    operating_status: enrichment.operating_status,
    funding_status: enrichment.funding_status,
    number_of_funding_rounds: enrichment.number_of_funding_rounds,
    tech_spend_estimate: enrichment.tech_spend_estimate,
    number_of_acquisitions: enrichment.number_of_acquisitions,
    ipo_status: enrichment.ipo_status,
    last_funding_type: enrichment.last_funding_type,
    last_funding_amount: enrichment.last_funding_amount,
    last_funding_date: enrichment.last_funding_date,
    total_funding_amount: enrichment.total_funding_amount,
    number_of_investors: enrichment.number_of_investors,
    technology_name: enrichment.technology_name,
    technology_tag: enrichment.technology_tag,
    technology_categories: enrichment.technology_categories,
    technology_first_detected: enrichment.technology_first_detected,
    technology_last_detected: enrichment.technology_last_detected,
    is_global_2000: enrichment.is_global_2000,
    competitor_tool_detected: enrichment.competitor_tool_detected,
    competitor_tools_list: enrichment.competitor_tools_list,

    // Routing
    geo_region: routing.geo_region,
    segment: routing.segment,
    assigned_rep: routing.assigned_rep,
    self_reported_employee_count: lead.self_reported_employee_count,

    // Scoring
    base_score: scoring.base_score,
    field_score_evaluation_journey: scoring.field_score_evaluation_journey,
    field_score_product_interest: scoring.field_score_product_interest,
    field_score_rate_limit_tier: scoring.field_score_rate_limit_tier,
    field_score_tokens_per_minute: scoring.field_score_tokens_per_minute,
    field_score_uk_eu_ch_entity: scoring.field_score_uk_eu_ch_entity,
    field_score_expected_spend: scoring.field_score_expected_spend,
    claude_score_job_title: scoring.claude_score_job_title,
    claude_score_free_text: scoring.claude_score_free_text,
    claude_input_job_title: scoring.claude_input_job_title,
    claude_input_free_text: scoring.claude_input_free_text,
    total_form_score: scoring.total_form_score,

    // Multipliers
    multiplier_firmographic: multipliers.multiplier_firmographic,
    multiplier_financial: multipliers.multiplier_financial,
    multiplier_tech_competitive: multipliers.multiplier_tech_competitive,
    multiplier_organizational: multipliers.multiplier_organizational,
    multiplier_individual: multipliers.multiplier_individual,
    total_multiplier_score: multipliers.total_multiplier_score,

    // Final
    final_score: finalScore,
    tier,
    sla_deadline: slaDeadline,
    slack_notified: false,
    decay_points: 0,
  })

  if (error) {
    throw new Error(`Failed to write lead to Supabase: ${error.message}`)
  }

  return {
    final_score: finalScore,
    tier,
    sla_deadline: slaDeadline,
  }
}

/** Write a rejected lead to Supabase for audit trail */
export async function writeRejection(
  email: string,
  emailDomain: string,
  inquiryType: string,
  reason: string
): Promise<void> {
  const supabase = await createClient()

  await supabase.from('leads').insert({
    email,
    email_domain: emailDomain,
    inquiry_type: inquiryType,
    ingestion_status: 'rejected',
    rejection_reason: reason,
  })
}
