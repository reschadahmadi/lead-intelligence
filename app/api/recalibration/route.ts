import { NextResponse } from 'next/server'
import { generateRecalibrationReport, isRecalibrationDue } from '@/lib/pipeline/recalibration'

export async function POST() {
  try {
    const report = await generateRecalibrationReport()
    return NextResponse.json(report)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Recalibration failed: ${message}` }, { status: 500 })
  }
}

export async function GET() {
  try {
    const due = await isRecalibrationDue()
    return NextResponse.json({ due })
  } catch {
    return NextResponse.json({ due: false })
  }
}
