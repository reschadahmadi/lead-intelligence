export type InquiryType = 'contact_sales' | 'rate_limit' | 'baa' | 'zdr' | 'invoicing' | 'support'
export type GeoRegion = 'central' | 'uki' | 'northern' | 'southern' | 'other_emea'
export type Segment = 'enterprise' | 'startup'
export type LeadTier = 'hot' | 'warm' | 'cold'
export type LeadOutcome = 'converted' | 'lost' | 'no_response' | 'in_progress'
export type EnrichmentStatus = 'complete' | 'partial' | 'minimal'

export interface Lead {
  id: string
  email: string
  email_domain: string
  first_name: string | null
  last_name: string | null
  inquiry_type: InquiryType
  job_title: string | null
  free_text: string | null

  // Form-specific
  evaluation_journey: string | null
  product_interest: string | null
  rate_limit_tier: string | null
  tokens_per_minute: string | null
  uk_eu_ch_entity: string | null
  expected_spend: string | null

  // Enrichment
  enrichment_status: EnrichmentStatus | null
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

  // Routing
  geo_region: GeoRegion | null
  segment: Segment | null
  assigned_rep: string | null
  self_reported_employee_count: number | null

  // Scoring
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
  multiplier_firmographic: number
  multiplier_financial: number
  multiplier_tech_competitive: number
  multiplier_organizational: number
  multiplier_individual: number
  total_multiplier_score: number
  final_score: number
  tier: LeadTier | null
  sla_deadline: string | null
  slack_notified: boolean

  // Decay
  decay_points: number
  decayed_score: number
  days_untouched: number | null

  // Outcome
  outcome: LeadOutcome | null
  outcome_updated_at: string | null

  // Timestamps
  created_at: string
  updated_at: string
}

export interface TierCounts {
  accelerate: number
  engage: number
  nurture: number
  today: number
}

export interface ChartDataPoint {
  date: string
  hot: number
  warm: number
  cold: number
}
