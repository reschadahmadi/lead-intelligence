import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('recalibration_reports')
      .select('*')
      .order('report_date', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return NextResponse.json({ report: null })
    }

    return NextResponse.json({
      report: {
        quarter: data.quarter,
        report_date: data.report_date,
        total_leads_analyzed: data.report_data.total_leads_analyzed,
        leads_with_outcomes: data.report_data.leads_with_outcomes,
        tier_accuracy: data.report_data.tier_accuracy,
        scoring_analysis: data.report_data.scoring_analysis,
        recommendations: data.recommendations,
      },
    })
  } catch {
    return NextResponse.json({ report: null })
  }
}
