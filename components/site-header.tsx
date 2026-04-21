"use client"

import { useState } from "react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Loader2Icon, DownloadIcon } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ProcessResult {
  processed: number
  rejected: number
  accelerate: number
  engage: number
  nurture: number
  errors: string[]
  message?: string
  error?: string
}

export function SiteHeader() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleProcessLeads() {
    setLoading(true)
    try {
      const res = await fetch("/api/process-leads", { method: "POST" })
      const data: ProcessResult = await res.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      if (data.message) {
        toast.info(data.message)
        return
      }

      toast.success(
        `Processed ${data.processed} leads (${data.accelerate} accelerate, ${data.engage} engage, ${data.nurture} nurture). Rejected: ${data.rejected}.`
      )

      if (data.errors.length > 0) {
        toast.warning(`${data.errors.length} errors occurred during processing.`)
      }

      // Refresh dashboard data
      router.refresh()
    } catch {
      toast.error("Failed to process leads. Check the console for details.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">Lead Intelligence Dashboard</h1>
        <div className="ml-auto">
          <Button
            size="sm"
            onClick={handleProcessLeads}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <DownloadIcon className="mr-2 size-4" />
                Process New Leads
              </>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
