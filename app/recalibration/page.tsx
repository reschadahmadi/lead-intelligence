"use client"

import { useEffect, useState } from "react"
import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Loader2Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  UsersIcon,
  TargetIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ActivityIcon,
  FlameIcon,
  GaugeIcon,
  SparklesIcon,
  ChevronRightIcon,
} from "lucide-react"

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
  correlation: "strong" | "moderate" | "weak" | "inverse"
}

interface Recommendation {
  component: string
  current_impact: string
  suggestion: string
  reason: string
}

interface Report {
  quarter: string
  report_date: string
  total_leads_analyzed: number
  leads_with_outcomes: number
  tier_accuracy: TierAccuracy[]
  scoring_analysis: ScoringComponentAnalysis[]
  recommendations: Recommendation[]
}

const tierColors: Record<string, { bg: string; text: string; border: string; bar: string; dot: string }> = {
  Accelerate: {
    bg: "bg-red-50 dark:bg-red-500/10",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    bar: "bg-red-500",
    dot: "bg-red-500",
  },
  Engage: {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
  },
  Nurture: {
    bg: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    bar: "bg-blue-500",
    dot: "bg-blue-500",
  },
}

const correlationConfig: Record<string, { icon: React.ReactNode; color: string; badgeColor: string; label: string }> = {
  strong: {
    icon: <TrendingUpIcon className="size-3" />,
    color: "text-green-600 dark:text-green-400",
    badgeColor: "text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
    label: "Strong",
  },
  moderate: {
    icon: <ActivityIcon className="size-3" />,
    color: "text-blue-600 dark:text-blue-400",
    badgeColor: "text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    label: "Moderate",
  },
  weak: {
    icon: <MinusIcon className="size-3" />,
    color: "text-muted-foreground",
    badgeColor: "text-muted-foreground border-border",
    label: "Weak",
  },
  inverse: {
    icon: <TrendingDownIcon className="size-3" />,
    color: "text-red-600 dark:text-red-400",
    badgeColor: "text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
    label: "Inverse",
  },
}

export default function RecalibrationPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadLatestReport() {
    setLoading(true)
    try {
      const res = await fetch("/api/recalibration/latest")
      const data = await res.json()
      if (data.report) setReport(data.report)
    } catch {
      // No report yet
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch("/api/recalibration", { method: "POST" })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setReport(data)
      }
    } catch {
      setError("Failed to generate report")
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    loadLatestReport()
  }, [])

  const overallConversionRate = report
    ? report.tier_accuracy.reduce((sum, t) => sum + t.converted, 0) /
      Math.max(report.tier_accuracy.reduce((sum, t) => sum + t.total, 0), 1) * 100
    : 0

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

              {/* Header Bar — matches dashboard GreetingBar style */}
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardDescription className="text-xs tracking-widest uppercase">
                          SCORING RECALIBRATION ENGINE
                        </CardDescription>
                        <CardTitle className="text-2xl font-semibold tracking-tight">
                          Quarterly Recalibration Report
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Scoring accuracy analysis and weight adjustment recommendations
                        </p>
                      </div>
                      <div className="hidden flex-col items-end gap-2 sm:flex">
                        <Button onClick={handleGenerate} disabled={generating} className="gap-2">
                          {generating ? (
                            <>
                              <Loader2Icon className="size-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <RefreshCwIcon className="size-4" />
                              Generate New Report
                            </>
                          )}
                        </Button>
                        {report && (
                          <span className="text-xs text-muted-foreground">
                            Last generated &middot; {report.report_date}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>

              {error && (
                <div className="px-4 lg:px-6">
                  <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                    <XCircleIcon className="size-5 shrink-0 text-red-600" />
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {!loading && !report && (
                <div className="px-4 lg:px-6">
                  <Card className="border-dashed">
                    <CardHeader className="items-center py-16">
                      <div className="mb-4 rounded-full bg-muted p-4">
                        <GaugeIcon className="size-8 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-lg">No Reports Yet</CardTitle>
                      <CardDescription className="text-center">
                        Generate your first recalibration report to analyze scoring accuracy against lead outcomes.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              )}

              {report && (
                <>
                  {/* Summary Cards — same style as dashboard SectionCards */}
                  <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
                    <Card className="@container/card">
                      <CardHeader>
                        <CardDescription>Quarter</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                          {report.quarter}
                        </CardTitle>
                        <CardAction>
                          <Badge variant="outline">
                            <CalendarIcon />
                            Period
                          </Badge>
                        </CardAction>
                      </CardHeader>
                      <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                          Report generated {report.report_date}
                        </div>
                        <div className="text-muted-foreground">
                          3-month rolling analysis
                        </div>
                      </CardFooter>
                    </Card>
                    <Card className="@container/card">
                      <CardHeader>
                        <CardDescription>Leads Analyzed</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                          {report.total_leads_analyzed}
                        </CardTitle>
                        <CardAction>
                          <Badge variant="outline">
                            <UsersIcon />
                            Total
                          </Badge>
                        </CardAction>
                      </CardHeader>
                      <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                          All ingested leads in window
                        </div>
                        <div className="text-muted-foreground">
                          Passed ingestion validation
                        </div>
                      </CardFooter>
                    </Card>
                    <Card className="@container/card">
                      <CardHeader>
                        <CardDescription>With Outcomes</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                          {report.leads_with_outcomes}
                        </CardTitle>
                        <CardAction>
                          <Badge variant="outline">
                            <TargetIcon />
                            {report.total_leads_analyzed > 0
                              ? `${Math.round((report.leads_with_outcomes / report.total_leads_analyzed) * 100)}%`
                              : "0%"}
                          </Badge>
                        </CardAction>
                      </CardHeader>
                      <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                          Leads with known outcomes
                        </div>
                        <div className="text-muted-foreground">
                          Converted, lost, or no response
                        </div>
                      </CardFooter>
                    </Card>
                    <Card className="@container/card">
                      <CardHeader>
                        <CardDescription>Conversion Rate</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                          {Math.round(overallConversionRate)}%
                        </CardTitle>
                        <CardAction>
                          <Badge variant="outline" className={overallConversionRate >= 30 ? "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800" : ""}>
                            <TrendingUpIcon />
                            Overall
                          </Badge>
                        </CardAction>
                      </CardHeader>
                      <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                          Across all tiers{" "}
                          <FlameIcon className="size-4" />
                        </div>
                        <div className="text-muted-foreground">
                          Weighted average conversion
                        </div>
                      </CardFooter>
                    </Card>
                  </div>

                  {/* Tier Accuracy */}
                  <div className="px-4 lg:px-6">
                    <Card>
                      <CardHeader className="border-b">
                        <CardTitle>Tier Prediction Accuracy</CardTitle>
                        <CardDescription>
                          How well did each tier predict actual conversion outcomes?
                        </CardDescription>
                        <CardAction>
                          <Badge variant="outline">
                            <TargetIcon />
                            {report.tier_accuracy.length} tiers
                          </Badge>
                        </CardAction>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="grid gap-6 @lg/main:grid-cols-3">
                          {report.tier_accuracy.map((ta) => {
                            const colors = tierColors[ta.tier] ?? tierColors.Nurture
                            return (
                              <div key={ta.tier} className={`relative overflow-hidden rounded-xl border ${colors.border} p-6`}>
                                {/* Subtle colored top edge */}
                                <div className={`absolute inset-x-0 top-0 h-1 ${colors.bar}`} />

                                <div className="flex items-start justify-between">
                                  <div>
                                    <Badge variant="outline" className={`${colors.text} ${colors.border} mb-3`}>
                                      {ta.tier}
                                    </Badge>
                                    <p className="text-3xl font-bold tabular-nums">{ta.total}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">total leads</p>
                                  </div>
                                  <div className="text-right">
                                    <p className={`text-2xl font-bold tabular-nums ${ta.conversion_rate >= 50 ? "text-green-600" : ta.conversion_rate >= 25 ? "text-amber-600" : "text-muted-foreground"}`}>
                                      {ta.conversion_rate}%
                                    </p>
                                    <p className="text-xs text-muted-foreground">conversion</p>
                                  </div>
                                </div>

                                {/* Conversion bar */}
                                <div className="mt-4 mb-4">
                                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                      className={`h-full rounded-full transition-all ${colors.bar}`}
                                      style={{ width: `${Math.min(ta.conversion_rate, 100)}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Outcome breakdown */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="rounded-lg bg-green-50/50 dark:bg-green-500/5 px-3 py-2">
                                    <p className="text-xs text-muted-foreground">Converted</p>
                                    <p className="text-lg font-semibold tabular-nums text-green-600 dark:text-green-400">{ta.converted}</p>
                                  </div>
                                  <div className="rounded-lg bg-red-50/50 dark:bg-red-500/5 px-3 py-2">
                                    <p className="text-xs text-muted-foreground">Lost</p>
                                    <p className="text-lg font-semibold tabular-nums text-red-500 dark:text-red-400">{ta.lost}</p>
                                  </div>
                                  <div className="rounded-lg bg-muted/50 px-3 py-2">
                                    <p className="text-xs text-muted-foreground">No Response</p>
                                    <p className="text-lg font-semibold tabular-nums">{ta.no_response}</p>
                                  </div>
                                  <div className="rounded-lg bg-muted/50 px-3 py-2">
                                    <p className="text-xs text-muted-foreground">In Progress</p>
                                    <p className="text-lg font-semibold tabular-nums">{ta.in_progress}</p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Scoring Component Analysis */}
                  <div className="px-4 lg:px-6">
                    <Card>
                      <CardHeader className="border-b">
                        <CardTitle>Scoring Component Analysis</CardTitle>
                        <CardDescription>
                          Average score per component for converted vs lost leads
                        </CardDescription>
                        <CardAction>
                          <Badge variant="outline">
                            <ActivityIcon />
                            {report.scoring_analysis.length} components
                          </Badge>
                        </CardAction>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="divide-y">
                          {report.scoring_analysis.map((sa) => {
                            const config = correlationConfig[sa.correlation] ?? correlationConfig.weak
                            const maxScore = Math.max(sa.avg_score_converted, sa.avg_score_lost, sa.avg_score_no_response, 1)
                            return (
                              <div key={sa.component} className="flex items-center gap-6 py-4 first:pt-6">
                                {/* Component name */}
                                <div className="w-48 shrink-0">
                                  <p className="text-sm font-medium">{sa.component}</p>
                                  <Badge variant="outline" className={`mt-1 text-[10px] ${config.badgeColor}`}>
                                    {config.icon}
                                    {config.label}
                                  </Badge>
                                </div>

                                {/* Score bars */}
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-3">
                                    <span className="w-20 text-xs text-muted-foreground">Converted</span>
                                    <div className="flex-1 h-2 overflow-hidden rounded-full bg-muted">
                                      <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(sa.avg_score_converted / maxScore) * 100}%` }} />
                                    </div>
                                    <span className="w-10 text-right text-xs font-semibold tabular-nums text-green-600">{sa.avg_score_converted.toFixed(1)}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="w-20 text-xs text-muted-foreground">Lost</span>
                                    <div className="flex-1 h-2 overflow-hidden rounded-full bg-muted">
                                      <div className="h-full rounded-full bg-red-400 transition-all" style={{ width: `${(sa.avg_score_lost / maxScore) * 100}%` }} />
                                    </div>
                                    <span className="w-10 text-right text-xs font-semibold tabular-nums text-red-500">{sa.avg_score_lost.toFixed(1)}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="w-20 text-xs text-muted-foreground">No Reply</span>
                                    <div className="flex-1 h-2 overflow-hidden rounded-full bg-muted">
                                      <div className="h-full rounded-full bg-gray-400 transition-all" style={{ width: `${(sa.avg_score_no_response / maxScore) * 100}%` }} />
                                    </div>
                                    <span className="w-10 text-right text-xs font-semibold tabular-nums">{sa.avg_score_no_response.toFixed(1)}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recommendations */}
                  <div className="px-4 lg:px-6">
                    <Card>
                      <CardHeader className="border-b">
                        <CardTitle>Weight Adjustment Recommendations</CardTitle>
                        <CardDescription>
                          Suggested changes based on outcome analysis — human review required
                        </CardDescription>
                        <CardAction>
                          {report.recommendations.length > 0 ? (
                            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                              <AlertTriangleIcon />
                              {report.recommendations.length} suggestion{report.recommendations.length !== 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                              <CheckCircleIcon />
                              All clear
                            </Badge>
                          )}
                        </CardAction>
                      </CardHeader>
                      <CardContent className="pt-6">
                        {report.recommendations.length === 0 ? (
                          <div className="flex flex-col items-center gap-4 py-10">
                            <div className="rounded-full bg-green-50 p-4 dark:bg-green-500/10">
                              <CheckCircleIcon className="size-8 text-green-600" />
                            </div>
                            <div className="text-center">
                              <p className="font-medium">Scoring is well calibrated</p>
                              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                                All components are performing as expected. No weight adjustments needed this quarter.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {report.recommendations.map((rec, i) => {
                              const isReduce = rec.suggestion.toLowerCase().includes("reduce")
                              const isIncrease = rec.suggestion.toLowerCase().includes("increase") || rec.suggestion.toLowerCase().includes("working well")
                              return (
                                <div key={i} className={`relative overflow-hidden rounded-xl border p-5 ${isReduce ? "border-red-200 dark:border-red-900" : isIncrease ? "border-green-200 dark:border-green-900" : "border-amber-200 dark:border-amber-900"}`}>
                                  <div className={`absolute inset-y-0 left-0 w-1 ${isReduce ? "bg-red-500" : isIncrease ? "bg-green-500" : "bg-amber-500"}`} />
                                  <div className="pl-4">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold">{rec.component}</span>
                                          {isReduce ? (
                                            <Badge variant="outline" className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 text-[10px]">
                                              <ArrowDownIcon />Reduce
                                            </Badge>
                                          ) : isIncrease ? (
                                            <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 text-[10px]">
                                              <ArrowUpIcon />Increase
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-[10px]">
                                              <AlertTriangleIcon />Review
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-sm font-medium text-primary">{rec.suggestion}</p>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{rec.reason}</p>
                                      </div>
                                      <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground/30 mt-1" />
                                    </div>
                                    <div className="mt-3 inline-flex items-center rounded-md bg-muted/50 px-2.5 py-1 text-xs font-mono text-muted-foreground">
                                      {rec.current_impact}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
