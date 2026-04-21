import type { InquiryType, GeoRegion, Segment, LeadTier, EnrichmentStatus } from '../types/lead'

/** Raw row parsed from Google Sheet */
export interface SheetRow {
  email: string
  first_name: string
  last_name: string
  inquiry_type: string
  job_title: string
  free_text: string
  evaluation_journey: string
  product_interest: string
  rate_limit_tier: string
  tokens_per_minute: string
  uk_eu_ch_entity: string
  expected_spend: string
  company_name: string
  employee_count: string
  country: string
  timestamp: string
}

/** Lead after ingestion normalization */
export interface NormalizedLead {
  email: string
  email_domain: string
  first_name: string | null
  last_name: string | null
  inquiry_type: InquiryType
  job_title: string | null
  free_text: string | null
  evaluation_journey: string | null
  product_interest: string | null
  rate_limit_tier: string | null
  tokens_per_minute: string | null
  uk_eu_ch_entity: string | null
  expected_spend: string | null
  company_name: string | null
  self_reported_employee_count: number | null
  self_reported_country: string | null
  timestamp: string
}

/** Enrichment data attached to lead */
export interface EnrichmentData {
  enrichment_status: EnrichmentStatus
  company_name: string | null
  company_domain: string | null
  company_type: string | null
  industry: string | null
  employee_count: number | null
  revenue_estimate: number | null
  founded_year: number | null
  hq_country: string | null
  hq_region: string | null
  hq_city: string | null
  company_funding_event_flag: boolean
  company_hiring_event_flag: boolean
  operating_status: string | null
  funding_status: string | null
  number_of_funding_rounds: number | null
  tech_spend_estimate: number | null
  number_of_acquisitions: number | null
  ipo_status: string | null
  last_funding_type: string | null
  last_funding_amount: number | null
  last_funding_date: string | null
  total_funding_amount: number | null
  number_of_investors: number | null
  technology_name: string[] | null
  technology_tag: string[] | null
  technology_categories: string[] | null
  technology_first_detected: string | null
  technology_last_detected: string | null
  is_global_2000: boolean
  competitor_tool_detected: boolean
  competitor_tools_list: string[] | null
}

/** Routing result */
export interface RoutingResult {
  geo_region: GeoRegion
  segment: Segment
  assigned_rep: string
}

/** Scoring breakdown */
export interface ScoringResult {
  base_score: number
  field_score_evaluation_journey: number
  field_score_product_interest: number
  field_score_rate_limit_tier: number
  field_score_tokens_per_minute: number
  field_score_uk_eu_ch_entity: number
  field_score_expected_spend: number
  claude_score_job_title: number
  claude_score_free_text: number
  claude_input_job_title: string | null
  claude_input_free_text: string | null
  total_form_score: number
}

/** Multiplier breakdown */
export interface MultiplierResult {
  multiplier_firmographic: number
  multiplier_financial: number
  multiplier_tech_competitive: number
  multiplier_organizational: number
  multiplier_individual: number
  total_multiplier_score: number
}

/** Final actioning result */
export interface ActioningResult {
  final_score: number
  tier: LeadTier
  sla_deadline: string | null
}

/** Rejection info for failed ingestion */
export interface RejectionResult {
  rejected: true
  reason: string
  email: string
  email_domain: string
  inquiry_type: InquiryType
}

/** Pipeline processing summary */
export interface ProcessingSummary {
  processed: number
  rejected: number
  accelerate: number
  engage: number
  nurture: number
  errors: string[]
}
