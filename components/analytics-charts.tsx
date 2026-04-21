"use client"

import * as React from "react"
// icons removed with footers
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { Lead } from "@/lib/types/lead"

// ── Helpers ──

function formatSnakeCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatCurrency(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n}`
}

// ── 1. Outcome Breakdown — Stacked Pie ──

const outcomeConfig = {
  count: { label: "Leads" },
  converted: { label: "Converted", color: "var(--chart-1)" },
  in_progress: { label: "In Progress", color: "var(--chart-2)" },
  no_response: { label: "No Response", color: "var(--chart-3)" },
  lost: { label: "Lost", color: "var(--chart-4)" },
  unset: { label: "Not Set", color: "var(--chart-5)" },
} satisfies ChartConfig

export function OutcomeBreakdown({ leads }: { leads: Lead[] }) {
  const counts: Record<string, number> = { converted: 0, in_progress: 0, no_response: 0, lost: 0, unset: 0 }
  leads.forEach((l) => { counts[l.outcome || "unset"]++ })

  const outerData = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([name, count]) => ({ name, count, fill: `var(--color-${name})` }))

  // Inner ring: by tier
  const tierCounts: Record<string, number> = { hot: 0, warm: 0, cold: 0 }
  leads.forEach((l) => { tierCounts[l.tier || "cold"]++ })
  const innerData = Object.entries(tierCounts)
    .filter(([, v]) => v > 0)
    .map(([name, count]) => ({ name, count, fill: `var(--color-${name === "hot" ? "converted" : name === "warm" ? "in_progress" : "no_response"})` }))

  const total = leads.length
  const convertedPct = total > 0 ? Math.round((counts.converted / total) * 100) : 0

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle >Outcome Breakdown</CardTitle>
        <CardDescription>Pipeline status of all leads</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={outcomeConfig}>
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelKey="count"
                  nameKey="name"
                  indicator="line"
                />
              }
            />
            <Pie data={innerData} dataKey="count" outerRadius={60} />
            <Pie data={outerData} dataKey="count" nameKey="name" innerRadius={70} outerRadius={90} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── 2. Leads by Region — Radial Grid ──

const regionConfig = {
  count: { label: "Leads" },
  central: { label: "Central", color: "var(--chart-1)" },
  uki: { label: "UKI", color: "var(--chart-2)" },
  northern: { label: "Northern", color: "var(--chart-3)" },
  southern: { label: "Southern", color: "var(--chart-4)" },
  other_emea: { label: "Other EMEA", color: "var(--chart-5)" },
} satisfies ChartConfig

export function LeadsByRegion({ leads }: { leads: Lead[] }) {
  const grouped: Record<string, number> = {}
  leads.forEach((l) => { grouped[l.geo_region || "other_emea"] = (grouped[l.geo_region || "other_emea"] || 0) + 1 })
  const data = Object.entries(grouped)
    .map(([region, count]) => ({ region, count, fill: `var(--color-${region})` }))
    .sort((a, b) => b.count - a.count)

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle >Leads by Region</CardTitle>
        <CardDescription>Geographic distribution</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={regionConfig}>
          <RadialBarChart data={data} innerRadius={30} outerRadius={100}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="region" />} />
            <PolarGrid gridType="circle" />
            <RadialBar dataKey="count" />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── 3. Score Composition — Multiple Bar ──

const compConfig = {
  base: { label: "Base Score", color: "var(--chart-1)" },
  claude: { label: "Claude AI", color: "var(--chart-2)" },
} satisfies ChartConfig

export function ClaudeConfidence({ leads }: { leads: Lead[] }) {
  const buckets = ["0-25", "26-50", "51-75", "76-100", "101-130", "130+"]
  const ranges = [[0, 25], [26, 50], [51, 75], [76, 100], [101, 130], [131, Infinity]]

  const data = buckets.map((range, i) => {
    const inRange = leads.filter((l) => l.final_score >= ranges[i][0] && l.final_score <= ranges[i][1])
    const n = inRange.length || 1
    return {
      range,
      base: Math.round(inRange.reduce((s, l) => s + l.base_score, 0) / n),
      claude: Math.round(inRange.reduce((s, l) => s + l.claude_score_job_title + l.claude_score_free_text, 0) / n),
    }
  })

  return (
    <Card>
      <CardHeader >
        <CardTitle >Score Composition</CardTitle>
        <CardDescription>Base score vs Claude AI contribution</CardDescription>
      </CardHeader>
      <CardContent >
        <ChartContainer config={compConfig}>
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="range" tickLine={false} tickMargin={10} axisLine={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
            <Bar dataKey="base" fill="var(--color-base)" radius={4} />
            <Bar dataKey="claude" fill="var(--color-claude)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── 4. Conversion Rate — Linear Line ──

const convConfig = {
  rate: { label: "Conv. Rate", color: "var(--chart-1)" },
} satisfies ChartConfig

export function ConversionRateOverTime({ leads }: { leads: Lead[] }) {
  const weekly: Record<string, { total: number; converted: number }> = {}
  leads.forEach((l) => {
    const d = new Date(l.created_at)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().split("T")[0]
    if (!weekly[key]) weekly[key] = { total: 0, converted: 0 }
    weekly[key].total++
    if (l.outcome === "converted") weekly[key].converted++
  })

  const data = Object.entries(weekly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, { total, converted }]) => ({
      week: new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      rate: total > 0 ? Math.round((converted / total) * 100) : 0,
    }))

  const trend = data.length >= 2 ? data[data.length - 1].rate - data[data.length - 2].rate : 0

  return (
    <Card>
      <CardHeader >
        <CardTitle >Conversion Rate</CardTitle>
        <CardDescription>Weekly conversion trend</CardDescription>
      </CardHeader>
      <CardContent >
        <ChartContainer config={convConfig}>
          <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Line dataKey="rate" type="linear" stroke="var(--color-rate)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── 5. Competitor Signals — Gradient Area ──

const competitorConfig = {
  withCompetitor: { label: "With Competitor", color: "var(--chart-1)" },
  without: { label: "Without", color: "var(--chart-2)" },
} satisfies ChartConfig

export function CompetitorSignals({ leads }: { leads: Lead[] }) {
  const weekly: Record<string, { withComp: number; without: number }> = {}
  leads.forEach((l) => {
    const d = new Date(l.created_at)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().split("T")[0]
    if (!weekly[key]) weekly[key] = { withComp: 0, without: 0 }
    if (l.competitor_tool_detected) weekly[key].withComp++
    else weekly[key].without++
  })
  const data = Object.entries(weekly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => ({
      week: new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      withCompetitor: v.withComp,
      without: v.without,
    }))

  const totalWith = leads.filter((l) => l.competitor_tool_detected).length

  return (
    <Card>
      <CardHeader >
        <CardTitle >Competitor Signals</CardTitle>
        <CardDescription>Leads with vs without competitor tools</CardDescription>
      </CardHeader>
      <CardContent >
        <ChartContainer config={competitorConfig}>
          <AreaChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillWith" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-withCompetitor)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-withCompetitor)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillWithout" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-without)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-without)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area dataKey="without" type="natural" fill="url(#fillWithout)" fillOpacity={0.4} stroke="var(--color-without)" stackId="a" />
            <Area dataKey="withCompetitor" type="natural" fill="url(#fillWith)" fillOpacity={0.4} stroke="var(--color-withCompetitor)" stackId="a" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── 6. Inquiry Type — Stacked Bar ──

const inquiryConfig = {
  accelerate: { label: "Accelerate", color: "var(--chart-1)" },
  engage: { label: "Engage", color: "var(--chart-2)" },
} satisfies ChartConfig

export function InquiryTypeMix({ leads }: { leads: Lead[] }) {
  const grouped: Record<string, { accelerate: number; engage: number }> = {}
  leads.forEach((l) => {
    const type = formatSnakeCase(l.inquiry_type)
    if (!grouped[type]) grouped[type] = { accelerate: 0, engage: 0 }
    if (l.tier === "hot") grouped[type].accelerate++
    else grouped[type].engage++
  })
  const data = Object.entries(grouped)
    .map(([type, counts]) => ({ type, ...counts }))
    .sort((a, b) => (b.accelerate + b.engage) - (a.accelerate + a.engage))

  return (
    <Card>
      <CardHeader >
        <CardTitle >Inquiry Type Mix</CardTitle>
        <CardDescription>By type and tier</CardDescription>
      </CardHeader>
      <CardContent >
        <ChartContainer config={inquiryConfig}>
          <BarChart accessibilityLayer data={data}>
            <XAxis dataKey="type" tickLine={false} tickMargin={10} axisLine={false} tick={{ fontSize: 10 }} />
            <Bar dataKey="accelerate" stackId="a" fill="var(--color-accelerate)" radius={[0, 0, 4, 4]} />
            <Bar dataKey="engage" stackId="a" fill="var(--color-engage)" radius={[4, 4, 0, 0]} />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── 7. Multiplier Impact — Radar ──

const radarConfig = {
  score: { label: "Avg Score", color: "var(--chart-1)" },
} satisfies ChartConfig

export function MultiplierImpact({ leads }: { leads: Lead[] }) {
  const n = leads.length || 1
  const data = [
    { factor: "Firmographic", score: Math.round(leads.reduce((s, l) => s + l.multiplier_firmographic, 0) / n * 10) / 10 },
    { factor: "Financial", score: Math.round(leads.reduce((s, l) => s + l.multiplier_financial, 0) / n * 10) / 10 },
    { factor: "Tech/Comp.", score: Math.round(leads.reduce((s, l) => s + l.multiplier_tech_competitive, 0) / n * 10) / 10 },
    { factor: "Organizational", score: Math.round(leads.reduce((s, l) => s + l.multiplier_organizational, 0) / n * 10) / 10 },
    { factor: "Individual", score: Math.round(leads.reduce((s, l) => s + l.multiplier_individual, 0) / n * 10) / 10 },
  ]

  const topFactor = [...data].sort((a, b) => b.score - a.score)[0]

  return (
    <Card>
      <CardHeader className="items-center pb-4">
        <CardTitle >Multiplier Impact</CardTitle>
        <CardDescription>Which scoring multipliers contribute most</CardDescription>
      </CardHeader>
      <CardContent >
        <ChartContainer config={radarConfig}>
          <RadarChart data={data}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <PolarGrid radialLines={false} polarRadius={[60]} strokeWidth={1} />
            <PolarAngleAxis dataKey="factor" />
            <Radar dataKey="score" fill="var(--color-score)" fillOpacity={0.6} />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── 8. Top Companies — Horizontal Bar ──

const companyConfig = {
  count: { label: "Leads", color: "var(--chart-1)" },
} satisfies ChartConfig

export function TopCompanies({ leads }: { leads: Lead[] }) {
  const grouped: Record<string, number> = {}
  leads.forEach((l) => { grouped[l.company_name || "Unknown"] = (grouped[l.company_name || "Unknown"] || 0) + 1 })
  const data = Object.entries(grouped)
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  return (
    <Card>
      <CardHeader >
        <CardTitle >Top Companies</CardTitle>
        <CardDescription>Most inbound leads</CardDescription>
      </CardHeader>
      <CardContent >
        <ChartContainer config={companyConfig}>
          <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: -20 }}>
            <XAxis type="number" dataKey="count" hide />
            <YAxis dataKey="company" type="category" tickLine={false} tickMargin={10} axisLine={false} tick={{ fontSize: 10 }} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── 9. Lead Volume by Tier — Multiple Line ──

const volumeConfig = {
  accelerate: { label: "Accelerate", color: "var(--chart-1)" },
  engage: { label: "Engage", color: "var(--chart-2)" },
} satisfies ChartConfig

export function PipelineValue({ leads }: { leads: Lead[] }) {
  const weekly: Record<string, { accelerate: number; engage: number }> = {}
  leads.forEach((l) => {
    const d = new Date(l.created_at)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().split("T")[0]
    if (!weekly[key]) weekly[key] = { accelerate: 0, engage: 0 }
    if (l.tier === "hot") weekly[key].accelerate++
    else weekly[key].engage++
  })

  const data = Object.entries(weekly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v]) => ({
      week: new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      accelerate: v.accelerate,
      engage: v.engage,
    }))

  return (
    <Card>
      <CardHeader >
        <CardTitle >Lead Volume by Tier</CardTitle>
        <CardDescription>Weekly lead intake</CardDescription>
      </CardHeader>
      <CardContent >
        <ChartContainer config={volumeConfig}>
          <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line dataKey="accelerate" type="monotone" stroke="var(--color-accelerate)" strokeWidth={2} dot={false} />
            <Line dataKey="engage" type="monotone" stroke="var(--color-engage)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── 10. Decay Impact — Negative Bar ──

const decayBarConfig = {
  points: { label: "Points" },
} satisfies ChartConfig

export function DecayDashboard({ leads }: { leads: Lead[] }) {
  const decaying = leads
    .filter((l) => l.decay_points > 0)
    .sort((a, b) => b.decay_points - a.decay_points)
    .slice(0, 6)

  const data = decaying.map((l) => ({
    name: l.first_name && l.last_name ? `${l.first_name} ${l.last_name.charAt(0)}.` : l.email.split("@")[0],
    points: -l.decay_points,
  }))

  // Add some non-decaying leads for contrast
  const active = leads
    .filter((l) => l.decay_points === 0)
    .slice(0, Math.max(0, 6 - data.length))
    .map((l) => ({
      name: l.first_name && l.last_name ? `${l.first_name} ${l.last_name.charAt(0)}.` : l.email.split("@")[0],
      points: Math.round(l.final_score / 10),
    }))

  const allData = [...active, ...data]

  return (
    <Card>
      <CardHeader >
        <CardTitle >Lead Decay</CardTitle>
        <CardDescription>Active vs decaying leads</CardDescription>
      </CardHeader>
      <CardContent >
        <ChartContainer config={decayBarConfig}>
          <BarChart accessibilityLayer data={allData}>
            <CartesianGrid vertical={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel hideIndicator />} />
            <Bar dataKey="points">
              <LabelList position="top" dataKey="name" fillOpacity={1} />
              {allData.map((item, i) => (
                <Cell key={i} fill={item.points > 0 ? "var(--chart-1)" : "var(--chart-2)"} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── 11. Score Distribution — Bar with Label ──

const scoreConfig = {
  count: { label: "Leads", color: "var(--chart-1)" },
} satisfies ChartConfig

export function ScoreDistribution({ leads }: { leads: Lead[] }) {
  const buckets = [
    { range: "0-25", min: 0, max: 25 },
    { range: "26-50", min: 26, max: 50 },
    { range: "51-75", min: 51, max: 75 },
    { range: "76-100", min: 76, max: 100 },
    { range: "101-130", min: 101, max: 130 },
    { range: "130+", min: 131, max: Infinity },
  ]
  const data = buckets.map((b) => ({
    range: b.range,
    count: leads.filter((l) => l.final_score >= b.min && l.final_score <= b.max).length,
  }))

  const avgScore = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.final_score, 0) / leads.length) : 0

  return (
    <Card>
      <CardHeader >
        <CardTitle >Score Distribution</CardTitle>
        <CardDescription>How leads cluster by final score</CardDescription>
      </CardHeader>
      <CardContent >
        <ChartContainer config={scoreConfig}>
          <BarChart accessibilityLayer data={data} margin={{ top: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="range" tickLine={false} tickMargin={10} axisLine={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={8}>
              <LabelList position="top" offset={12} className="fill-foreground" fontSize={12} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── 12. Industry Breakdown — Area chart ──

const industryConfig = {
  count: { label: "Leads", color: "var(--chart-1)" },
} satisfies ChartConfig

export function IndustryBreakdown({ leads }: { leads: Lead[] }) {
  const grouped: Record<string, number> = {}
  leads.forEach((l) => { grouped[l.industry || "Unknown"] = (grouped[l.industry || "Unknown"] || 0) + 1 })
  const data = Object.entries(grouped)
    .map(([industry, count]) => ({ industry, count }))
    .sort((a, b) => a.industry.localeCompare(b.industry))

  return (
    <Card>
      <CardHeader >
        <CardTitle >Industry Breakdown</CardTitle>
        <CardDescription>Leads by industry</CardDescription>
      </CardHeader>
      <CardContent >
        <ChartContainer config={industryConfig}>
          <AreaChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="industry" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 9 }} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Area dataKey="count" type="natural" fill="var(--color-count)" fillOpacity={0.4} stroke="var(--color-count)" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── 13. Rep Workload — Area chart ──

const repConfig = {
  leads: { label: "Leads", color: "var(--chart-1)" },
} satisfies ChartConfig

export function RepLeaderboard({ leads }: { leads: Lead[] }) {
  const grouped: Record<string, number> = {}
  leads.forEach((l) => { grouped[l.assigned_rep || "Unassigned"] = (grouped[l.assigned_rep || "Unassigned"] || 0) + 1 })
  const data = Object.entries(grouped)
    .map(([rep, leads]) => ({ rep, leads }))
    .sort((a, b) => b.leads - a.leads)

  return (
    <Card>
      <CardHeader >
        <CardTitle >Rep Workload</CardTitle>
        <CardDescription>Lead distribution across reps</CardDescription>
      </CardHeader>
      <CardContent >
        <ChartContainer config={repConfig}>
          <AreaChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="rep" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Area dataKey="leads" type="natural" fill="var(--color-leads)" fillOpacity={0.4} stroke="var(--color-leads)" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ── 14. Company Size — Pie (no separator) ──

const sizeConfig = {
  count: { label: "Leads" },
  small: { label: "1-200", color: "var(--chart-1)" },
  medium: { label: "201-1K", color: "var(--chart-2)" },
  large: { label: "1K-10K", color: "var(--chart-3)" },
  enterprise: { label: "10K+", color: "var(--chart-4)" },
  unknown: { label: "Unknown", color: "var(--chart-5)" },
} satisfies ChartConfig

export function CompanySizeDistribution({ leads }: { leads: Lead[] }) {
  const buckets = [
    { key: "small", label: "1-200", min: 1, max: 200 },
    { key: "medium", label: "201-1K", min: 201, max: 1000 },
    { key: "large", label: "1K-10K", min: 1001, max: 10000 },
    { key: "enterprise", label: "10K+", min: 10001, max: Infinity },
  ]

  const data = buckets
    .map((b) => ({
      size: b.key,
      count: leads.filter((l) => l.employee_count && l.employee_count >= b.min && l.employee_count <= b.max).length,
      fill: `var(--color-${b.key})`,
    }))
    .filter((d) => d.count > 0)

  const noCount = leads.filter((l) => !l.employee_count).length
  if (noCount > 0) data.push({ size: "unknown", count: noCount, fill: "var(--color-unknown)" })

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle >Company Size</CardTitle>
        <CardDescription>By employee count</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={sizeConfig}>
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie data={data} dataKey="count" nameKey="size" stroke="0" />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
