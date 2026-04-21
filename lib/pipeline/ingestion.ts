import type { InquiryType } from '../types/lead'
import type { SheetRow, NormalizedLead, RejectionResult } from './types'
import { createClient } from '../supabase/server'

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com',
  'gmx.com', 'gmx.de', 'web.de', 'live.com', 'msn.com', 'me.com',
  'qq.com', '163.com', 'inbox.com', 'fastmail.com', 'tutanota.com',
])

const COMPETITOR_DOMAINS = new Set([
  'openai.com', 'google.com', 'deepmind.com', 'cohere.com', 'ai21.com',
  'huggingface.co', 'mistral.ai', 'meta.com', 'microsoft.com',
  'amazon.com', 'aws.amazon.com', 'inflection.ai', 'stability.ai',
])

const SPAM_TERMS = new Set([
  'buy now', 'click here', 'crypto', 'bitcoin', 'free money', 'act now',
  'limited time', 'no obligation', 'winner', 'congratulations', 'prize',
  'earn money', 'work from home', 'mlm', 'casino', 'viagra', 'lottery',
])

const VALID_INQUIRY_TYPES = new Set([
  'contact_sales', 'rate_limit', 'baa', 'zdr', 'invoicing', 'support',
])

function extractDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? ''
}

function isFreeEmail(domain: string): boolean {
  return FREE_EMAIL_DOMAINS.has(domain)
}

function isCompetitorDomain(domain: string): boolean {
  return COMPETITOR_DOMAINS.has(domain)
}

function containsSpam(text: string | null): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  for (const term of SPAM_TERMS) {
    if (lower.includes(term)) return true
  }
  return false
}

function isGibberish(text: string | null): boolean {
  if (!text || text.length < 5) return false
  const vowels = new Set('aeiouAEIOU')
  const words = text.split(/\s+/)

  // Check average word length
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length
  if (avgWordLength > 15) return true

  // Check consonant ratio (letters only)
  const letters = text.replace(/[^a-zA-Z]/g, '')
  if (letters.length === 0) return false
  const vowelCount = [...letters].filter((c) => vowels.has(c)).length
  const consonantRatio = 1 - vowelCount / letters.length
  if (consonantRatio > 0.7) return true

  return false
}

async function isDuplicate(email: string): Promise<boolean> {
  const supabase = await createClient()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('email', email.toLowerCase())
    .eq('ingestion_status', 'passed')
    .gte('created_at', sevenDaysAgo.toISOString())

  return (count ?? 0) > 0
}

export type IngestionResult =
  | { passed: true; lead: NormalizedLead }
  | { passed: false; rejection: RejectionResult }

export async function runIngestion(row: SheetRow): Promise<IngestionResult> {
  const email = row.email.trim().toLowerCase()
  const domain = extractDomain(email)
  const inquiryType = row.inquiry_type.trim().toLowerCase()

  // Validate inquiry type
  if (!VALID_INQUIRY_TYPES.has(inquiryType)) {
    return {
      passed: false,
      rejection: {
        rejected: true,
        reason: `Invalid inquiry type: ${row.inquiry_type}`,
        email,
        email_domain: domain,
        inquiry_type: 'contact_sales' as InquiryType,
      },
    }
  }

  // Check 1: Free email
  if (isFreeEmail(domain)) {
    return {
      passed: false,
      rejection: {
        rejected: true,
        reason: `Free email provider: ${domain}`,
        email,
        email_domain: domain,
        inquiry_type: inquiryType as InquiryType,
      },
    }
  }

  // Check 2: Competitor domain
  if (isCompetitorDomain(domain)) {
    return {
      passed: false,
      rejection: {
        rejected: true,
        reason: `Competitor domain: ${domain}`,
        email,
        email_domain: domain,
        inquiry_type: inquiryType as InquiryType,
      },
    }
  }

  // Check 3: Spam
  if (containsSpam(row.free_text)) {
    return {
      passed: false,
      rejection: {
        rejected: true,
        reason: 'Spam indicators detected in free text',
        email,
        email_domain: domain,
        inquiry_type: inquiryType as InquiryType,
      },
    }
  }

  // Check 4: Gibberish
  if (isGibberish(row.free_text)) {
    return {
      passed: false,
      rejection: {
        rejected: true,
        reason: 'Gibberish detected in free text',
        email,
        email_domain: domain,
        inquiry_type: inquiryType as InquiryType,
      },
    }
  }

  // Check 5: Duplicate
  if (await isDuplicate(email)) {
    return {
      passed: false,
      rejection: {
        rejected: true,
        reason: 'Duplicate submission within 7 days',
        email,
        email_domain: domain,
        inquiry_type: inquiryType as InquiryType,
      },
    }
  }

  // Normalize and pass
  const normalized: NormalizedLead = {
    email,
    email_domain: domain,
    first_name: row.first_name.trim() || null,
    last_name: row.last_name.trim() || null,
    inquiry_type: inquiryType as InquiryType,
    job_title: row.job_title.trim() || null,
    free_text: row.free_text.trim() || null,
    evaluation_journey: row.evaluation_journey.trim() || null,
    product_interest: row.product_interest.trim() || null,
    rate_limit_tier: row.rate_limit_tier.trim() || null,
    tokens_per_minute: row.tokens_per_minute.trim() || null,
    uk_eu_ch_entity: row.uk_eu_ch_entity.trim() || null,
    expected_spend: row.expected_spend.trim() || null,
    company_name: row.company_name.trim() || null,
    self_reported_employee_count: row.employee_count ? parseInt(row.employee_count, 10) || null : null,
    self_reported_country: row.country.trim() || null,
    timestamp: row.timestamp || new Date().toISOString(),
  }

  return { passed: true, lead: normalized }
}
