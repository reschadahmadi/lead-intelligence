import { NextRequest, NextResponse } from 'next/server'
import { updateLeadOutcome } from '@/lib/supabase/leads'

export async function PATCH(request: NextRequest) {
  try {
    const { id, outcome } = await request.json()

    if (!id || !outcome) {
      return NextResponse.json({ error: 'Missing id or outcome' }, { status: 400 })
    }

    const validOutcomes = ['converted', 'lost', 'no_response', 'in_progress']
    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
    }

    const success = await updateLeadOutcome(id, outcome)

    if (!success) {
      return NextResponse.json({ error: 'Failed to update outcome' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
