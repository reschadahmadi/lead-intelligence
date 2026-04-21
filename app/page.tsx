import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { LeadTables } from "@/components/lead-tables"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getLeads, getTierCounts, getLeadVolumeByDay, getLastIngestTime } from "@/lib/supabase/leads"
import type { ChartDataPoint } from "@/lib/types/lead"

import mockLeads from "./dashboard/data.json"

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function getDateLine() {
  const now = new Date()
  const day = now.toLocaleDateString("en-US", { weekday: "long" })
  const date = now.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
  const week = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7)
  return `BDR CONSOLE \u00B7 ${day.toUpperCase()}, ${date.toUpperCase()} \u00B7 WEEK ${week}`
}

function formatLastIngest(iso: string | null): string {
  if (!iso) return "No data yet"
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  return isToday ? `Today, ${time}` : `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`
}

function GreetingBar({ hotCount, lastIngest }: { hotCount: number; lastIngest: string | null }) {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardDescription className="text-xs tracking-widest uppercase">
                {getDateLine()}
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tracking-tight">
                {getGreeting()}, <em>Reschad.</em>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                You have{" "}
                <span className="font-semibold text-primary">{hotCount} leads needing action</span>
                {" \u2014 "}
                {hotCount > 0
                  ? `${hotCount} SLA breaching in under 2 hours.`
                  : "all clear for now."}
              </p>
            </div>
            <div className="hidden flex-col items-end gap-2 sm:flex">
              <Badge variant="outline" className="gap-1.5 px-3 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                ENGINE LIVE
              </Badge>
              <span className="text-xs text-muted-foreground">
                Last ingest &middot; {formatLastIngest(lastIngest)}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}

function deriveMockTierCounts(leads: typeof mockLeads) {
  const today = new Date().toISOString().split("T")[0]
  return {
    accelerate: leads.filter((l) => l.tier === "hot").length,
    engage: leads.filter((l) => l.tier === "warm").length,
    nurture: leads.filter((l) => l.tier === "cold").length,
    today: leads.filter((l) => l.created_at.startsWith(today)).length,
  }
}

function deriveMockChartData(): ChartDataPoint[] {
  const data: ChartDataPoint[] = []
  const now = new Date()
  for (let i = 90; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const date = d.toISOString().split("T")[0]
    // Simulate realistic wave patterns
    const wave = Math.sin(i / 7) * 2
    const trend = (90 - i) / 90 // slight upward trend
    data.push({
      date,
      hot: Math.max(0, Math.round(3 + wave + trend * 2 + Math.random() * 4)),
      warm: Math.max(0, Math.round(5 + Math.sin(i / 5) * 3 + trend * 3 + Math.random() * 5)),
      cold: Math.max(0, Math.round(2 + Math.cos(i / 6) * 2 + Math.random() * 3)),
    })
  }
  return data
}

export default async function Page() {
  let leads
  let tierCounts
  let chartData
  let lastIngest: string | null = null

  try {
    const [supabaseLeads, supabaseCounts, supabaseChart, supabaseLastIngest] = await Promise.all([
      getLeads(),
      getTierCounts(),
      getLeadVolumeByDay(90),
      getLastIngestTime(),
    ])

    lastIngest = supabaseLastIngest
    if (supabaseLeads.length > 0) {
      leads = supabaseLeads
      tierCounts = supabaseCounts
      chartData = deriveMockChartData()
    } else {
      // Supabase returned no data — use mock
      leads = mockLeads
      tierCounts = deriveMockTierCounts(mockLeads)
      chartData = deriveMockChartData()
      lastIngest = mockLeads[0]?.created_at ?? null
    }
  } catch {
    // Supabase unavailable — use mock data
    leads = mockLeads
    tierCounts = deriveMockTierCounts(mockLeads)
    chartData = deriveMockChartData()
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <GreetingBar hotCount={tierCounts.accelerate} lastIngest={lastIngest} />
              <SectionCards
                hotCount={tierCounts.accelerate}
                warmCount={tierCounts.engage}
                coldCount={tierCounts.nurture}
                todayCount={tierCounts.today}
              />
              <LeadTables leads={leads as any} />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive data={chartData} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
