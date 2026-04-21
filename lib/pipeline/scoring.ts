import Anthropic from '@anthropic-ai/sdk'
import type { InquiryType } from '../types/lead'
import type { NormalizedLead, ScoringResult } from './types'

const USE_MOCK = process.env.ANTHROPIC_API_KEY === 'your-anthropic-api-key-here' || !process.env.ANTHROPIC_API_KEY
const anthropic = USE_MOCK ? null : new Anthropic()

// Base scores by form type
const BASE_SCORES: Record<InquiryType, number> = {
  contact_sales: 50,
  rate_limit: 40,
  baa: 30,
  zdr: 25,
  invoicing: 20,
  support: 10,
}

// Contact Sales: evaluation_journey scoring
const EVALUATION_JOURNEY_SCORES: Record<string, number> = {
  'know what i want': 30,
  'know what i want, need sales': 30,
  'actively exploring': 18,
  'just curious': 5,
  'just curious for now': 5,
}

// Contact Sales: product_interest scoring
const CONTACT_SALES_PRODUCT_SCORES: Record<string, number> = {
  'enterprise plan': 15,
  'api': 13,
  'financials': 12,
  'healthcare': 12,
  'claude code': 8,
  'team plan': 6,
  'education': 4,
  'nonprofits': 4,
}

// BAA: product_interest scoring
const BAA_PRODUCT_SCORES: Record<string, number> = {
  'healthcare': 15,
  'enterprise plan': 12,
  'api': 11,
  'financials': 8,
  'claude code': 5,
  'team plan': 4,
  'education': 3,
  'nonprofits': 3,
}

// Rate Limit: tier scoring
const RATE_LIMIT_TIER_SCORES: Record<string, number> = {
  'beyond tier 4': 15,
  'tier 4': 8,
}

// Rate Limit: tokens per minute scoring
const TOKENS_PER_MINUTE_SCORES: Record<string, number> = {
  '5m+': 15,
  '2m-5m': 12,
  '1m-2m': 8,
  'under 1m': 4,
}

// BAA: UK/EU/CH entity scoring
const UK_EU_CH_SCORES: Record<string, number> = {
  'yes': 10,
  'no': 5,
}

function lookupScore(map: Record<string, number>, value: string | null): number {
  if (!value) return 0
  return map[value.trim().toLowerCase()] ?? 0
}

// ── Mock Scoring (keyword-based, deterministic) ──

function mockScoreJobTitle(jobTitle: string): number {
  const t = jobTitle.toLowerCase()
  if (/\b(ceo|cto|cio|ciso|cdo|cpo|coo|cfo|chief)\b/.test(t)) return 14
  if (/\b(vp|vice president|svp|evp)\b/.test(t)) return 11
  if (/\b(director)\b/.test(t)) return 10
  if (/\b(head of|senior manager|principal)\b/.test(t)) return 7
  if (/\b(manager|lead)\b/.test(t)) return 4
  if (/\b(senior|staff)\b/.test(t)) return 3
  return 2
}

function mockScoreFreeText(freeText: string, inquiryType: InquiryType): number {
  const maxScore = inquiryType === 'contact_sales' ? 20 : 15
  const t = freeText.toLowerCase()
  let score = Math.round(maxScore * 0.3) // baseline: general interest

  if (/\b(timeline|deadline|by q[1-4]|this quarter|next month|urgent)\b/.test(t)) score += Math.round(maxScore * 0.25)
  if (/\b(budget|\$|spend|invest|purchase|procure)\b/.test(t)) score += Math.round(maxScore * 0.2)
  if (/\b(enterprise|production|deploy|migrate|scale|integrate)\b/.test(t)) score += Math.round(maxScore * 0.15)
  if (/\b(evaluate|explore|curious|just looking|test)\b/.test(t)) score -= Math.round(maxScore * 0.1)

  return Math.min(maxScore, Math.max(1, score))
}

function mockScoreExpectedSpend(spendText: string): number {
  const t = spendText.toLowerCase()
  if (/\b(100k|200k|500k|1m|\$1,000,000|million)\b/.test(t)) return 19
  if (/\b(50k|\$50,000)\b/.test(t)) return 17
  if (/\b(20k|30k|40k)\b/.test(t)) return 14
  if (/\b(10k|\$10,000)\b/.test(t)) return 12
  if (/\b(5k|\$5,000)\b/.test(t)) return 8
  if (/\b(1k|2k|3k)\b/.test(t)) return 6
  return 3
}

// ── Claude API Scoring ──

async function scoreJobTitle(jobTitle: string): Promise<number> {
  if (USE_MOCK) return mockScoreJobTitle(jobTitle)

  try {
    const message = await anthropic!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: `You are a lead scoring system. Score the following job title on a scale of 1-15 based on purchasing authority and seniority.

Scale:
- 13-15: C-suite (CEO, CTO, CIO, CISO, CDO, CPO, COO, CFO)
- 9-12: VP or Director level
- 6-8: Head of department, Senior Manager
- 3-5: Manager
- 1-2: Individual contributor, unclear, or no title

Rules:
- Do NOT infer demographics from the person's name
- Do NOT penalize non-native English
- Return ONLY the integer score, nothing else

Job title: "${jobTitle}"`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const score = parseInt(text.trim(), 10)
    return isNaN(score) ? 1 : Math.min(15, Math.max(1, score))
  } catch (error) {
    console.error('Claude API error (job title):', error)
    return 1
  }
}

async function scoreFreeText(freeText: string, inquiryType: InquiryType): Promise<number> {
  if (USE_MOCK) return mockScoreFreeText(freeText, inquiryType)

  const maxScore = inquiryType === 'contact_sales' ? 20 : 15

  try {
    const message = await anthropic!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: `You are a lead scoring system. Score the following free-text form submission on a scale of 1-${maxScore} based on commercial intent and purchase readiness.

Scale for a ${inquiryType} form:
- ${Math.round(maxScore * 0.9)}-${maxScore}: Concrete requirements with timeline and/or budget mentioned
- ${Math.round(maxScore * 0.6)}-${Math.round(maxScore * 0.85)}: Specific needs but missing some details
- ${Math.round(maxScore * 0.3)}-${Math.round(maxScore * 0.55)}: General interest, exploring options
- 1-${Math.round(maxScore * 0.25)}: Vague, unclear, or minimal text

Rules:
- Do NOT infer demographics from the person's name
- Do NOT penalize non-native English
- Return ONLY the integer score, nothing else

Free text: "${freeText}"`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const score = parseInt(text.trim(), 10)
    return isNaN(score) ? 1 : Math.min(maxScore, Math.max(1, score))
  } catch (error) {
    console.error('Claude API error (free text):', error)
    return 1
  }
}

async function scoreExpectedSpend(spendText: string): Promise<number> {
  if (USE_MOCK) return mockScoreExpectedSpend(spendText)

  try {
    const message = await anthropic!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: `You are a lead scoring system. Score the following expected spend description on a scale of 1-20.

Scale:
- 17-20: $50k+/month or equivalent annual spend
- 12-16: $10k-$50k/month
- 6-11: $1k-$10k/month
- 1-5: Low spend, vague, or unclear

Rules:
- Return ONLY the integer score, nothing else

Expected spend: "${spendText}"`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const score = parseInt(text.trim(), 10)
    return isNaN(score) ? 1 : Math.min(20, Math.max(1, score))
  } catch (error) {
    console.error('Claude API error (expected spend):', error)
    return 1
  }
}

export async function runScoring(lead: NormalizedLead): Promise<ScoringResult> {
  const type = lead.inquiry_type
  const baseScore = BASE_SCORES[type]

  let fieldEvalJourney = 0
  let fieldProductInterest = 0
  let fieldRateLimitTier = 0
  let fieldTokensPerMinute = 0
  let fieldUkEuCh = 0
  let fieldExpectedSpend = 0
  let claudeJobTitle = 0
  let claudeFreeText = 0

  switch (type) {
    case 'contact_sales':
      fieldEvalJourney = lookupScore(EVALUATION_JOURNEY_SCORES, lead.evaluation_journey)
      fieldProductInterest = lookupScore(CONTACT_SALES_PRODUCT_SCORES, lead.product_interest)
      if (lead.job_title) claudeJobTitle = await scoreJobTitle(lead.job_title)
      if (lead.free_text) claudeFreeText = await scoreFreeText(lead.free_text, type)
      break

    case 'rate_limit':
      fieldRateLimitTier = lookupScore(RATE_LIMIT_TIER_SCORES, lead.rate_limit_tier)
      fieldTokensPerMinute = lookupScore(TOKENS_PER_MINUTE_SCORES, lead.tokens_per_minute)
      if (lead.free_text) claudeFreeText = await scoreFreeText(lead.free_text, type)
      break

    case 'baa':
      fieldProductInterest = lookupScore(BAA_PRODUCT_SCORES, lead.product_interest)
      fieldUkEuCh = lookupScore(UK_EU_CH_SCORES, lead.uk_eu_ch_entity)
      if (lead.free_text) claudeFreeText = await scoreFreeText(lead.free_text, type)
      break

    case 'zdr':
      if (lead.free_text) claudeFreeText = await scoreFreeText(lead.free_text, type)
      break

    case 'invoicing':
      if (lead.expected_spend) fieldExpectedSpend = await scoreExpectedSpend(lead.expected_spend)
      break

    case 'support':
      // Base score only
      break
  }

  const totalFormScore =
    baseScore +
    fieldEvalJourney +
    fieldProductInterest +
    fieldRateLimitTier +
    fieldTokensPerMinute +
    fieldUkEuCh +
    fieldExpectedSpend +
    claudeJobTitle +
    claudeFreeText

  return {
    base_score: baseScore,
    field_score_evaluation_journey: fieldEvalJourney,
    field_score_product_interest: fieldProductInterest,
    field_score_rate_limit_tier: fieldRateLimitTier,
    field_score_tokens_per_minute: fieldTokensPerMinute,
    field_score_uk_eu_ch_entity: fieldUkEuCh,
    field_score_expected_spend: fieldExpectedSpend,
    claude_score_job_title: claudeJobTitle,
    claude_score_free_text: claudeFreeText,
    claude_input_job_title: lead.job_title,
    claude_input_free_text: lead.free_text,
    total_form_score: totalFormScore,
  }
}
