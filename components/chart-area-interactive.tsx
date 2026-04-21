"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import type { ChartDataPoint } from "@/lib/types/lead"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

const chartConfig = {
  hot: {
    label: "Accelerate",
    color: "oklch(0.52 0.13 45)",
  },
  warm: {
    label: "Engage",
    color: "oklch(0.65 0.10 55)",
  },
  cold: {
    label: "Nurture",
    color: "oklch(0.78 0.06 65)",
  },
} satisfies ChartConfig

const timeRangeLabel: Record<string, string> = {
  "90d": "Total for the last 3 months",
  "30d": "Total for the last 30 days",
  "7d": "Total for the last 7 days",
}

interface ChartAreaInteractiveProps {
  data: ChartDataPoint[]
}

export function ChartAreaInteractive({ data }: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = data.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date()
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <div>
          <CardTitle>Total Leads</CardTitle>
          <CardDescription>{timeRangeLabel[timeRange]}</CardDescription>
        </div>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(v) => v && setTimeRange(v)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          {mounted && (
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger
                className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                size="sm"
                aria-label="Select a value"
              >
                <SelectValue placeholder="Last 3 months" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="90d" className="rounded-lg">
                  Last 3 months
                </SelectItem>
                <SelectItem value="30d" className="rounded-lg">
                  Last 30 days
                </SelectItem>
                <SelectItem value="7d" className="rounded-lg">
                  Last 7 days
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          id="lead-volume"
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillHot" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.52 0.13 45)" stopOpacity={0.6} />
                <stop offset="95%" stopColor="oklch(0.52 0.13 45)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillWarm" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.65 0.10 55)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="oklch(0.65 0.10 55)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillCold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.78 0.06 65)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="oklch(0.78 0.06 65)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="oklch(0.92 0.005 70)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tick={{ fill: "oklch(0.65 0.02 50)", fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="cold"
              type="natural"
              fill="url(#fillCold)"
              stroke="oklch(0.78 0.06 65)"
              strokeWidth={1.5}
              stackId="a"
            />
            <Area
              dataKey="warm"
              type="natural"
              fill="url(#fillWarm)"
              stroke="oklch(0.65 0.10 55)"
              strokeWidth={1.5}
              stackId="a"
            />
            <Area
              dataKey="hot"
              type="natural"
              fill="url(#fillHot)"
              stroke="oklch(0.52 0.13 45)"
              strokeWidth={1.5}
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
