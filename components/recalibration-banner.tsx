"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangleIcon, Loader2Icon, CheckCircleIcon } from "lucide-react"
import { toast } from "sonner"

type BannerState = "hidden" | "due" | "loading" | "done"

export function RecalibrationBanner() {
  const [state, setState] = useState<BannerState>("hidden")

  useEffect(() => {
    fetch("/api/recalibration")
      .then((res) => res.json())
      .then((data) => {
        if (data.due) setState("due")
      })
      .catch(() => {})
  }, [])

  async function handleGenerate() {
    setState("loading")
    try {
      const res = await fetch("/api/recalibration", { method: "POST" })
      const data = await res.json()

      if (data.error) {
        toast.error(data.error)
        setState("due")
        return
      }

      toast.success(
        `Recalibration report generated for ${data.quarter}. ${data.leads_with_outcomes} leads analyzed, ${data.recommendations.length} recommendations.`
      )
      setState("done")
    } catch {
      toast.error("Failed to generate recalibration report.")
      setState("due")
    }
  }

  if (state === "hidden") return null

  if (state === "done") {
    return (
      <div className="px-4 lg:px-6">
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardHeader className="py-3">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="size-5 text-green-600" />
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Recalibration report generated. Review it in the Reports section.
              </p>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-6">
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangleIcon className="size-5 text-amber-600" />
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Quarterly recalibration is due. Review scoring accuracy against actual outcomes.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              disabled={state === "loading"}
            >
              {state === "loading" ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Report"
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}
