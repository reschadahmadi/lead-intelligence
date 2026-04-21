"use client"

import * as React from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"

type Lead = {
  id: string
  created_at: string
  tier: string
  [key: string]: unknown
}

function filterByTimeRange(leads: Lead[], range: string): Lead[] {
  const now = new Date()
  const start = new Date()

  if (range === "today") {
    start.setHours(0, 0, 0, 0)
  } else if (range === "week") {
    const day = now.getDay()
    start.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    start.setHours(0, 0, 0, 0)
  } else {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
  }

  return leads.filter((l) => new Date(l.created_at) >= start)
}

export function LeadTables({ leads }: { leads: Lead[] }) {
  const [range, setRange] = React.useState("month")
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const filtered = range === "all" ? leads : filterByTimeRange(leads, range)
  const hotCount = filtered.filter((l) => l.tier === "hot").length
  const warmCount = filtered.filter((l) => l.tier === "warm").length
  const coldCount = filtered.filter((l) => l.tier === "cold").length

  if (!mounted) return null

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <Tabs value={range} onValueChange={setRange}>
          <TabsList>
            <TabsTrigger value="today">
              Today
              {range === "today" && hotCount + warmCount + coldCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 px-1.5 text-xs">
                  {hotCount + warmCount + coldCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="week">
              This Week
              {range === "week" && hotCount + warmCount + coldCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 px-1.5 text-xs">
                  {hotCount + warmCount + coldCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="month">
              This Month
              {range === "month" && hotCount + warmCount + coldCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 px-1.5 text-xs">
                  {hotCount + warmCount + coldCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">
              All Leads
              {range === "all" && hotCount + warmCount + coldCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 px-1.5 text-xs">
                  {hotCount + warmCount + coldCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {range === "all" ? (
        <DataTable data={filtered as any} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          <div style={{ minWidth: 0, overflow: "hidden" }} className="rounded-lg border bg-card p-4">
            <DataTable data={filtered as any} title="Accelerate" tier="hot" />
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }} className="rounded-lg border bg-card p-4">
            <DataTable data={filtered as any} title="Engage" tier="warm" />
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }} className="rounded-lg border bg-card p-4">
            <DataTable data={filtered as any} title="Nurture" tier="cold" />
          </div>
        </div>
      )}
    </div>
  )
}
