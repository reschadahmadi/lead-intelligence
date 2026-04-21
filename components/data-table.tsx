"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { toast } from "sonner"
import { z } from "zod"

import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
// Tabs removed — using 3 separate tables
import {
  GripVerticalIcon,
  CircleCheckIcon,
  LoaderIcon,
  EllipsisVerticalIcon,
  Columns3Icon,
  ChevronDownIcon,
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
  PhoneIcon,
  MailIcon,
  StickyNoteIcon,
  MessageSquareIcon,
} from "lucide-react"

export const schema = z.object({
  id: z.string(),
  email: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  job_title: z.string().nullable(),
  free_text: z.string().nullable(),
  company_name: z.string().nullable(),
  company_domain: z.string().nullable(),
  industry: z.string().nullable(),
  employee_count: z.number().nullable(),
  revenue_estimate: z.number().nullable(),
  tier: z.enum(["hot", "warm", "cold"]).nullable(),
  final_score: z.number(),
  inquiry_type: z.enum(["contact_sales", "rate_limit", "baa", "zdr", "invoicing", "support"]),
  geo_region: z.enum(["central", "uki", "northern", "southern", "other_emea"]).nullable(),
  segment: z.enum(["enterprise", "startup"]).nullable(),
  assigned_rep: z.string().nullable(),
  outcome: z.enum(["converted", "lost", "no_response", "in_progress"]).nullable(),
  created_at: z.string(),
  // Score breakdown fields for drawer
  base_score: z.number(),
  total_form_score: z.number(),
  total_multiplier_score: z.number(),
  multiplier_firmographic: z.number(),
  multiplier_financial: z.number(),
  multiplier_tech_competitive: z.number(),
  multiplier_organizational: z.number(),
  multiplier_individual: z.number(),
  claude_score_job_title: z.number(),
  claude_score_free_text: z.number(),
  decay_points: z.number(),
  decayed_score: z.number(),
  days_untouched: z.number().nullable(),
  // Enrichment for drawer
  enrichment_status: z.enum(["complete", "partial", "minimal"]).nullable(),
  last_funding_type: z.string().nullable(),
  total_funding_amount: z.number().nullable(),
  technology_name: z.array(z.string()).nullable(),
  competitor_tool_detected: z.boolean(),
  competitor_tools_list: z.array(z.string()).nullable(),
  hq_country: z.string().nullable(),
  sla_deadline: z.string().nullable(),
})

// Create a separate component for the drag handle
function DragHandle({ id }: { id: string }) {
  const { attributes, listeners } = useSortable({
    id,
  })

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent"
    >
      <GripVerticalIcon className="size-3 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

function getTierClassName(tier: string): string {
  switch (tier) {
    case "hot":
      return "bg-red-500/10 text-red-600 border-red-200 dark:text-red-400 dark:border-red-800"
    case "warm":
      return "bg-amber-500/10 text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800"
    case "cold":
      return "bg-blue-500/10 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800"
    default:
      return ""
  }
}

function formatSnakeCase(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function formatRegion(region: string | null): string {
  if (!region) return "\u2014"
  if (region === "uki") return "UKI"
  if (region === "other_emea") return "Other EMEA"
  return region.charAt(0).toUpperCase() + region.slice(1)
}

function getSlaStatus(slaDeadline: string | null, tier: string | null): { label: string; className: string } | null {
  if (!slaDeadline || tier === "cold") return null
  const now = new Date()
  const deadline = new Date(slaDeadline)
  const diffMs = deadline.getTime() - now.getTime()

  if (diffMs <= 0) {
    const overdueMins = Math.abs(Math.floor(diffMs / 60000))
    const hours = Math.floor(overdueMins / 60)
    const mins = overdueMins % 60
    return {
      label: `Overdue ${hours > 0 ? `${hours}h ` : ""}${mins}m`,
      className: "bg-red-500/10 text-red-600 border-red-300 dark:text-red-400 dark:border-red-800 animate-pulse",
    }
  }

  const minsLeft = Math.floor(diffMs / 60000)
  const hours = Math.floor(minsLeft / 60)
  const mins = minsLeft % 60

  if (minsLeft <= 30) {
    return {
      label: `${mins}m left`,
      className: "bg-red-500/10 text-red-600 border-red-300 dark:text-red-400",
    }
  }
  if (minsLeft <= 120) {
    return {
      label: `${hours}h ${mins}m left`,
      className: "bg-amber-500/10 text-amber-600 border-amber-200 dark:text-amber-400",
    }
  }

  if (hours < 24) {
    return {
      label: `${hours}h ${mins}m left`,
      className: "bg-green-500/10 text-green-600 border-green-200 dark:text-green-400",
    }
  }

  return {
    label: `${Math.floor(hours / 24)}d left`,
    className: "text-muted-foreground",
  }
}

function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`
  return `$${value}`
}

const columns: ColumnDef<z.infer<typeof schema>>[] = [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
  },
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "email",
    header: "Name",
    cell: ({ row }) => {
      return <TableCellViewer item={row.original} />
    },
    enableHiding: false,
    meta: { widthPercent: 22 },
  },
  {
    accessorKey: "company_name",
    header: "Company",
    cell: ({ row }) => (
      <div className="truncate">{row.original.company_name || "\u2014"}</div>
    ),
    meta: { widthPercent: 22 },
  },
  {
    accessorKey: "job_title",
    header: "Title",
    cell: ({ row }) => (
      <div className="truncate">{row.original.job_title || "\u2014"}</div>
    ),
    meta: { widthPercent: 24 },
  },
  {
    accessorKey: "tier",
    header: "Tier",
    cell: ({ row }) => {
      const tier = row.original.tier
      if (!tier) return "\u2014"
      const tierLabel = tier === "hot" ? "Accelerate" : tier === "warm" ? "Engage" : "Nurture"
      return (
        <Badge variant="outline" className={getTierClassName(tier)}>
          {tierLabel}
        </Badge>
      )
    },
  },
  {
    accessorKey: "final_score",
    header: () => <div className="w-full text-right">Score</div>,
    cell: ({ row }) => (
      <div className="text-right font-mono">{row.original.final_score}</div>
    ),
    meta: { widthPercent: 10 },
  },
  {
    accessorKey: "inquiry_type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline" className="px-1.5 text-muted-foreground">
        {formatSnakeCase(row.original.inquiry_type)}
      </Badge>
    ),
  },
  {
    accessorKey: "geo_region",
    header: "Region",
    cell: ({ row }) => formatRegion(row.original.geo_region),
    size: 15,
  },
  {
    accessorKey: "assigned_rep",
    header: "Rep",
    cell: ({ row }) => {
      const rep = row.original.assigned_rep
      if (rep) return rep
      return <span className="text-muted-foreground">Unassigned</span>
    },
  },
  {
    accessorKey: "outcome",
    header: "Outcome",
    cell: ({ row }) => {
      const outcome = row.original.outcome
      if (!outcome) return "\u2014"
      switch (outcome) {
        case "converted":
          return (
            <Badge variant="outline">
              <CircleCheckIcon className="fill-green-500 dark:fill-green-400" />
              Converted
            </Badge>
          )
        case "in_progress":
          return (
            <Badge variant="outline">
              <LoaderIcon />
              In Progress
            </Badge>
          )
        case "lost":
          return (
            <Badge variant="outline" className="text-muted-foreground">
              Lost
            </Badge>
          )
        case "no_response":
          return <Badge variant="outline">No Response</Badge>
        default:
          return "\u2014"
      }
    },
  },
  {
    accessorKey: "created_at",
    header: "Contact Date",
    meta: { widthPercent: 22 },
    cell: ({ row }) => {
      const value = row.original.created_at
      return (
        <div className="whitespace-nowrap">
          {new Date(value).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
            size="icon"
          >
            <EllipsisVerticalIcon />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem>View Details</DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(row.original.email)
              toast.success("Email copied to clipboard")
            }}
          >
            Copy Email
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Update Outcome</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

function DraggableRow({ row }: { row: Row<z.infer<typeof schema>> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

export function DataTable({
  data: initialData,
  title,
  tier,
  badgeVariant,
}: {
  data: z.infer<typeof schema>[]
  title?: string
  tier?: "hot" | "warm" | "cold"
  badgeVariant?: string
}) {
  const filteredInitial = React.useMemo(
    () => (tier ? initialData.filter((d) => d.tier === tier) : initialData),
    [initialData, tier]
  )
  const [data, setData] = React.useState(() => filteredInitial)
  React.useEffect(() => setData(filteredInitial), [filteredInitial])
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(tier ? {
      select: false,
      drag: false,
      tier: false,
      assigned_rep: false,
      outcome: false,
      inquiry_type: false,
      geo_region: false,
      actions: false,
    } : {})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: tier ? 5 : 10,
  })
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data]
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(data, oldIndex, newIndex)
      })
    }
  }

  if (!mounted) {
    return null
  }

  const tierColors: Record<string, string> = {
    hot: "text-red-600 dark:text-red-400",
    warm: "text-amber-600 dark:text-amber-400",
    cold: "text-blue-600 dark:text-blue-400",
  }

  return (
    <div className="min-w-0 w-full flex-col justify-start gap-6">
      {title && (
        <div className="flex items-center gap-3 pb-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Badge variant="outline" className={tier ? tierColors[tier] : ""}>
            {data.length}
          </Badge>
        </div>
      )}
      <div className="relative flex flex-col gap-4 overflow-auto">
        <div className={tier ? "overflow-hidden rounded-lg" : "overflow-hidden rounded-lg border"}>
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table className={tier ? "text-xs" : ""} style={tier ? { tableLayout: "fixed", width: "100%" } : undefined}>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const wp = (header.column.columnDef.meta as any)?.widthPercent
                      return (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          style={tier && wp ? { width: `${wp}%` } : undefined}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
        {tier ? (
          <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
            <span>{table.getFilteredRowModel().rows.length} rows</span>
            {table.getPageCount() > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeftIcon className="size-3" />
                </Button>
                <span>{table.getState().pagination.pageIndex + 1}/{table.getPageCount()}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRightIcon className="size-3" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between px-4">
            <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="flex w-full items-center gap-8 lg:w-fit">
              <div className="hidden items-center gap-2 lg:flex">
                <Label htmlFor="rows-per-page" className="text-sm font-medium">
                  Rows per page
                </Label>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value))
                  }}
                >
                  <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                    <SelectValue
                      placeholder={table.getState().pagination.pageSize}
                    />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectGroup>
                      {[10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-fit items-center justify-center text-sm font-medium">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </div>
              <div className="ml-auto flex items-center gap-2 lg:ml-0">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronsLeftIcon />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeftIcon />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRightIcon />
                </Button>
                <Button
                  variant="outline"
                  className="hidden size-8 lg:flex"
                  size="icon"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronsRightIcon />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
  const isMobile = useIsMobile()

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="w-fit max-w-full truncate px-0 text-left text-foreground">
          {item.first_name && item.last_name
            ? `${item.first_name} ${item.last_name}`
            : item.email}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>
            {item.first_name && item.last_name
              ? `${item.first_name} ${item.last_name}`
              : item.email}
          </DrawerTitle>
          <DrawerDescription className="flex items-center gap-2">
            {item.company_name || "Unknown Company"}
            {item.tier && (
              <Badge variant="outline" className={getTierClassName(item.tier)}>
                {item.tier.charAt(0).toUpperCase() + item.tier.slice(1)}
              </Badge>
            )}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {/* Section 1: Score Breakdown */}
          <div className="grid gap-2">
            <div className="font-medium">Score Breakdown</div>
            <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
              <div>
                <div className="text-muted-foreground text-xs">Final Score</div>
                <div className="text-2xl font-bold">{item.final_score}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">
                  Decayed Score
                </div>
                <div className="text-2xl font-bold">{item.decayed_score}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Score</span>
                <span>{item.base_score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Form Score</span>
                <span>{item.total_form_score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Claude (Title)</span>
                <span>{item.claude_score_job_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Claude (Text)</span>
                <span>{item.claude_score_free_text}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 2: Multipliers */}
          <div className="grid gap-2">
            <div className="flex justify-between font-medium">
              <span>Multipliers</span>
              <span className="text-muted-foreground">
                {item.total_multiplier_score} pts
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Firmographic</span>
                <span>{item.multiplier_firmographic}/18</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Financial</span>
                <span>{item.multiplier_financial}/15</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Tech & Competitive
                </span>
                <span>{item.multiplier_tech_competitive}/14</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Organizational</span>
                <span>{item.multiplier_organizational}/10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Individual</span>
                <span>{item.multiplier_individual}/8</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 3: Enrichment */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between font-medium">
              <span>Enrichment</span>
              {item.enrichment_status && (
                <Badge variant="outline" className="text-xs">
                  {item.enrichment_status}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Industry</span>
                <span>{item.industry || "\u2014"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employees</span>
                <span>
                  {item.employee_count?.toLocaleString() || "\u2014"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revenue</span>
                <span>
                  {item.revenue_estimate
                    ? formatCurrency(item.revenue_estimate)
                    : "\u2014"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Country</span>
                <span>{item.hq_country || "\u2014"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Funding</span>
                <span>{item.last_funding_type || "\u2014"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Raised</span>
                <span>
                  {item.total_funding_amount
                    ? formatCurrency(item.total_funding_amount)
                    : "\u2014"}
                </span>
              </div>
            </div>
            {item.technology_name && item.technology_name.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {item.technology_name.slice(0, 6).map((tech) => (
                  <Badge key={tech} variant="secondary" className="text-xs">
                    {tech}
                  </Badge>
                ))}
              </div>
            )}
            {item.competitor_tool_detected && item.competitor_tools_list && (
              <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Competitor tools: {item.competitor_tools_list.join(", ")}
              </div>
            )}
          </div>

          <Separator />

          {/* Section 4: Routing & Decay */}
          <div className="grid gap-2">
            <div className="font-medium">Routing & Status</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Region</span>
                <span>{formatRegion(item.geo_region)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Segment</span>
                <span>
                  {item.segment
                    ? item.segment.charAt(0).toUpperCase() +
                      item.segment.slice(1)
                    : "\u2014"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rep</span>
                <span>{item.assigned_rep || "Unassigned"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inquiry</span>
                <span>{formatSnakeCase(item.inquiry_type)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Decay</span>
                <span>
                  {item.decay_points > 0
                    ? `-${item.decay_points} pts`
                    : "None"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days Untouched</span>
                <span>{item.days_untouched ?? "\u2014"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outcome</span>
                <span>
                  {item.outcome ? formatSnakeCase(item.outcome) : "\u2014"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SLA</span>
                <span>
                  {item.sla_deadline
                    ? new Date(item.sla_deadline).toLocaleString()
                    : "\u2014"}
                </span>
              </div>
            </div>
          </div>
          <Separator />

          {/* Section 5: Free Text */}
          <div className="grid gap-2">
            <div className="font-medium">Submission Message</div>
            {item.free_text ? (
              <div className="rounded-lg border bg-muted/50 p-3 text-xs leading-relaxed whitespace-pre-wrap">
                {item.free_text}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic">
                No message provided.
              </div>
            )}
          </div>

          <Separator />

          {/* Section 6: Actions */}
          <div className="grid gap-2">
            <div className="font-medium">Actions</div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  toast.success(`Call logged for ${item.email}`)
                }}
              >
                <PhoneIcon className="size-3.5" />
                Call
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  window.open(`mailto:${item.email}`, "_blank")
                  toast.success(`Email opened for ${item.email}`)
                }}
              >
                <MailIcon className="size-3.5" />
                Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  toast.info("Notes feature coming soon")
                }}
              >
                <StickyNoteIcon className="size-3.5" />
                Note
              </Button>
            </div>
          </div>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
