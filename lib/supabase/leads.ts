import { createClient } from './server'
import type { Lead, TierCounts, ChartDataPoint } from '../types/lead'

export async function getLeads(): Promise<Lead[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('ingestion_status', 'passed')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching leads:', error)
      return []
    }

    return (data as Lead[]) ?? []
  } catch (error) {
    console.error('Error fetching leads:', error)
    return []
  }
}

export async function getTierCounts(): Promise<TierCounts> {
  const defaultCounts: TierCounts = { accelerate: 0, engage: 0, nurture: 0, today: 0 }

  try {
    const supabase = await createClient()

    const [hotResult, warmResult, coldResult, todayResult] = await Promise.all([
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('ingestion_status', 'passed')
        .eq('tier', 'hot'),
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('ingestion_status', 'passed')
        .eq('tier', 'warm'),
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('ingestion_status', 'passed')
        .eq('tier', 'cold'),
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('ingestion_status', 'passed')
        .gte('created_at', new Date().toISOString().split('T')[0]),
    ])

    return {
      accelerate: hotResult.count ?? 0,
      engage: warmResult.count ?? 0,
      nurture: coldResult.count ?? 0,
      today: todayResult.count ?? 0,
    }
  } catch (error) {
    console.error('Error fetching tier counts:', error)
    return defaultCounts
  }
}

export async function getLeadVolumeByDay(days: number = 90): Promise<ChartDataPoint[]> {
  try {
    const supabase = await createClient()
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - days)

    const { data, error } = await supabase
      .from('leads')
      .select('created_at, tier')
      .eq('ingestion_status', 'passed')
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching lead volume:', error)
      return []
    }

    const grouped: Record<string, ChartDataPoint> = {}

    for (const lead of data ?? []) {
      const date = lead.created_at.split('T')[0]
      if (!grouped[date]) {
        grouped[date] = { date, hot: 0, warm: 0, cold: 0 }
      }
      const tier = lead.tier as 'hot' | 'warm' | 'cold'
      if (tier && grouped[date][tier] !== undefined) {
        grouped[date][tier]++
      }
    }

    return Object.values(grouped)
  } catch (error) {
    console.error('Error fetching lead volume:', error)
    return []
  }
}

export async function getLastIngestTime(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('leads')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null
    return data.created_at
  } catch {
    return null
  }
}

export async function updateLeadOutcome(
  id: string,
  outcome: 'converted' | 'lost' | 'no_response' | 'in_progress'
): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('leads')
      .update({ outcome, outcome_updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error updating lead outcome:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('Error updating lead outcome:', error)
    return false
  }
}

export async function getLeadById(id: string): Promise<Lead | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching lead by ID:', error)
      return null
    }

    return data as Lead
  } catch (error) {
    console.error('Error fetching lead by ID:', error)
    return null
  }
}
