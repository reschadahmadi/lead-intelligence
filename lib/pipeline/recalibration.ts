/**
 * Quarterly Recalibration — Layer 6
 *
 * Analyzes lead outcomes vs predicted tiers to identify scoring accuracy.
 * Generates recommendations for weight adjustments.
 * Does NOT auto-apply changes — human review required.
 */

import { createClient } from '../supabase/server'

interface TierAccuracy {
  tier: string
  total: number
  converted: number
  lost: number
  no_response: number
  in_progress: number
  conversion_rate: number
}

interface ScoringComponentAnalysis {
  component: string
  avg_score_converted: number
  avg_score_lost: number
  avg_score_no_response: number
  correlation: 'strong' | 'moderate' | 'weak' | 'inverse'
}

interface Recommendation {
  component: string
  current_impact: string
  suggestion: string
  reason: string
}

export interface RecalibrationReport {
  quarter: string
  report_date: string
  total_leads_analyzed: number
  leads_with_outcomes: number
  tier_accuracy: TierAccuracy[]
  scoring_analysis: ScoringComponentAnalysis[]
  recommendations: Recommendation[]
}

function getCurrentQuarter(): string {
  const now = new Date()
  const q = Math.ceil((now.getMonth() + 1) / 3)
  return `${now.getFullYear()}-Q${q}`
}

function classifyCorrelation(avgConverted: number, avgLost: number): ScoringComponentAnalysis['correlation'] {
  if (avgConverted === 0 && avgLost === 0) return 'weak'
  const diff = avgConverted - avgLost
  const magnitude = Math.abs(diff)
  if (diff > 0 && magnitude > 3) return 'strong'
  if (diff > 0 && magnitude > 1) return 'moderate'
  if (diff < 0) return 'inverse'
  return 'weak'
}

function generateRecommendation(analysis: ScoringComponentAnalysis): Recommendation | null {
  if (analysis.correlation === 'inverse') {
    return {
      component: analysis.component,
      current_impact: `Avg converted: ${analysis.avg_score_converted.toFixed(1)}, Avg lost: ${analysis.avg_score_lost.toFixed(1)}`,
      suggestion: `Reduce weight for ${analysis.component}`,
      reason: `Leads that scored higher on ${analysis.component} actually converted LESS — this scoring component is counter-predictive.`,
    }
  }
  if (analysis.correlation === 'weak') {
    return {
      component: analysis.component,
      current_impact: `Avg converted: ${analysis.avg_score_converted.toFixed(1)}, Avg lost: ${analysis.avg_score_lost.toFixed(1)}`,
      suggestion: `Consider reducing weight for ${analysis.component}`,
      reason: `No meaningful difference in ${analysis.component} scores between converted and lost leads — this component is not differentiating.`,
    }
  }
  if (analysis.correlation === 'strong') {
    return {
      component: analysis.component,
      current_impact: `Avg converted: ${analysis.avg_score_converted.toFixed(1)}, Avg lost: ${analysis.avg_score_lost.toFixed(1)}`,
      suggestion: `${analysis.component} is working well — consider increasing weight`,
      reason: `Strong positive correlation between ${analysis.component} scores and actual conversions.`,
    }
  }
  return null
}

export async function generateRecalibrationReport(): Promise<RecalibrationReport> {
  const supabase = await createClient()
  const quarter = getCurrentQuarter()

  // Fetch all leads with outcomes from the last 3 months
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('ingestion_status', 'passed')
    .gte('created_at', threeMonthsAgo.toISOString())

  if (error) throw new Error(`Failed to fetch leads: ${error.message}`)

  const allLeads = leads ?? []
  const leadsWithOutcomes = allLeads.filter((l) => l.outcome && l.outcome !== 'in_progress')

  // ── Tier Accuracy ──
  const tierMap: Record<string, { total: number; converted: number; lost: number; no_response: number; in_progress: number }> = {
    hot: { total: 0, converted: 0, lost: 0, no_response: 0, in_progress: 0 },
    warm: { total: 0, converted: 0, lost: 0, no_response: 0, in_progress: 0 },
    cold: { total: 0, converted: 0, lost: 0, no_response: 0, in_progress: 0 },
  }

  for (const lead of allLeads) {
    const tier = lead.tier ?? 'cold'
    tierMap[tier].total++
    if (lead.outcome === 'converted') tierMap[tier].converted++
    else if (lead.outcome === 'lost') tierMap[tier].lost++
    else if (lead.outcome === 'no_response') tierMap[tier].no_response++
    else tierMap[tier].in_progress++
  }

  const tierLabels: Record<string, string> = { hot: 'Accelerate', warm: 'Engage', cold: 'Nurture' }
  const tierAccuracy: TierAccuracy[] = Object.entries(tierMap).map(([tier, counts]) => ({
    tier: tierLabels[tier] ?? tier,
    ...counts,
    conversion_rate: counts.total > 0 ? Math.round((counts.converted / counts.total) * 100) : 0,
  }))

  // ── Scoring Component Analysis ──
  const scoringComponents = [
    { key: 'claude_score_job_title', label: 'Job Title (Claude)' },
    { key: 'claude_score_free_text', label: 'Free Text (Claude)' },
    { key: 'field_score_evaluation_journey', label: 'Evaluation Journey' },
    { key: 'field_score_product_interest', label: 'Product Interest' },
    { key: 'multiplier_firmographic', label: 'Firmographic Multiplier' },
    { key: 'multiplier_financial', label: 'Financial Multiplier' },
    { key: 'multiplier_tech_competitive', label: 'Tech/Competitive Multiplier' },
    { key: 'multiplier_organizational', label: 'Organizational Multiplier' },
    { key: 'multiplier_individual', label: 'Individual Multiplier' },
  ]

  const scoringAnalysis: ScoringComponentAnalysis[] = scoringComponents.map(({ key, label }) => {
    const converted = leadsWithOutcomes.filter((l) => l.outcome === 'converted')
    const lost = leadsWithOutcomes.filter((l) => l.outcome === 'lost')
    const noResponse = leadsWithOutcomes.filter((l) => l.outcome === 'no_response')

    const avg = (arr: typeof leads, field: string) => {
      if (!arr || arr.length === 0) return 0
      return arr.reduce((sum, l) => sum + (l[field] ?? 0), 0) / arr.length
    }

    const avgConverted = avg(converted, key)
    const avgLost = avg(lost, key)
    const avgNoResponse = avg(noResponse, key)

    return {
      component: label,
      avg_score_converted: avgConverted,
      avg_score_lost: avgLost,
      avg_score_no_response: avgNoResponse,
      correlation: classifyCorrelation(avgConverted, avgLost),
    }
  })

  // ── Recommendations ──
  const recommendations: Recommendation[] = scoringAnalysis
    .map(generateRecommendation)
    .filter((r): r is Recommendation => r !== null)

  // Add tier-level recommendations
  for (const ta of tierAccuracy) {
    if (ta.tier === 'Accelerate' && ta.conversion_rate < 40 && ta.total >= 5) {
      recommendations.push({
        component: 'Tier Thresholds',
        current_impact: `Accelerate conversion rate is only ${ta.conversion_rate}%`,
        suggestion: 'Consider raising the Accelerate threshold above 110',
        reason: 'Too many leads are being classified as Accelerate but not converting — the bar may be too low.',
      })
    }
    if (ta.tier === 'Nurture' && ta.conversion_rate > 30 && ta.total >= 5) {
      recommendations.push({
        component: 'Tier Thresholds',
        current_impact: `Nurture conversion rate is ${ta.conversion_rate}%`,
        suggestion: 'Consider lowering the Engage threshold below 50',
        reason: 'Leads classified as Nurture are converting at a high rate — the scoring is under-valuing them.',
      })
    }
  }

  const report: RecalibrationReport = {
    quarter,
    report_date: new Date().toISOString().split('T')[0],
    total_leads_analyzed: allLeads.length,
    leads_with_outcomes: leadsWithOutcomes.length,
    tier_accuracy: tierAccuracy,
    scoring_analysis: scoringAnalysis,
    recommendations,
  }

  // ── Save to recalibration_reports table ──
  await supabase.from('recalibration_reports').insert({
    report_date: report.report_date,
    quarter: report.quarter,
    report_data: {
      total_leads_analyzed: report.total_leads_analyzed,
      leads_with_outcomes: report.leads_with_outcomes,
      tier_accuracy: report.tier_accuracy,
      scoring_analysis: report.scoring_analysis,
    },
    recommendations: report.recommendations,
    status: 'pending_review',
  })

  return report
}

export async function getLastRecalibrationDate(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('recalibration_reports')
    .select('report_date')
    .order('report_date', { ascending: false })
    .limit(1)
    .single()

  return data?.report_date ?? null
}

export async function isRecalibrationDue(): Promise<boolean> {
  const lastDate = await getLastRecalibrationDate()
  if (!lastDate) return true
  const last = new Date(lastDate)
  const now = new Date()
  const diffDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 90
}
