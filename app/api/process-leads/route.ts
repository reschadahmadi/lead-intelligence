import { NextResponse } from 'next/server'
import { fetchSheetRows } from '@/lib/sheets/reader'
import { runIngestion } from '@/lib/pipeline/ingestion'
import { runEnrichment } from '@/lib/pipeline/enrichment'
import { runRouting } from '@/lib/pipeline/routing'
import { runScoring } from '@/lib/pipeline/scoring'
import { runMultipliers } from '@/lib/pipeline/multipliers'
import { runActioning, writeRejection } from '@/lib/pipeline/actioning'
import type { ProcessingSummary } from '@/lib/pipeline/types'

export async function POST() {
  const summary: ProcessingSummary = {
    processed: 0,
    rejected: 0,
    accelerate: 0,
    engage: 0,
    nurture: 0,
    errors: [],
  }

  try {
    // Step 1: Fetch rows from Google Sheet
    const rows = await fetchSheetRows()

    if (rows.length === 0) {
      return NextResponse.json({ ...summary, message: 'No rows found in Google Sheet' })
    }

    // Step 2: Process each row through the pipeline
    for (const row of rows) {
      try {
        // Layer 0: Ingestion
        const ingestionResult = await runIngestion(row)

        if (!ingestionResult.passed) {
          const { rejection } = ingestionResult
          await writeRejection(rejection.email, rejection.email_domain, rejection.inquiry_type, rejection.reason)
          summary.rejected++
          continue
        }

        const lead = ingestionResult.lead

        // Layer 1: Enrichment (mocked)
        const enrichment = await runEnrichment(lead)

        // Layer 2: Routing
        const routing = runRouting(lead, enrichment)

        // Layer 3: Scoring (includes Claude API calls)
        const scoring = await runScoring(lead)

        // Layer 4: Multipliers
        const multipliers = await runMultipliers(lead, enrichment)

        // Layer 5: Actioning (writes to Supabase)
        const actioning = await runActioning(lead, enrichment, routing, scoring, multipliers)

        summary.processed++
        if (actioning.tier === 'hot') summary.accelerate++
        else if (actioning.tier === 'warm') summary.engage++
        else summary.nurture++
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        summary.errors.push(`Row ${row.email}: ${message}`)
      }
    }

    return NextResponse.json(summary)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Pipeline failed: ${message}`, ...summary },
      { status: 500 }
    )
  }
}
