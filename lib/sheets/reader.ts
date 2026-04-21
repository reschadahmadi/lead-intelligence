import type { SheetRow } from '../pipeline/types'

const SHEET_ID = '1WMjYkAnkHKO-x05GDnOlQYPnrGhhHC_t1G-M5VX11_A'
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`

/** Parse a CSV line handling quoted fields */
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current.trim())
  return fields
}

/** Fetch and parse the Google Sheet as CSV */
export async function fetchSheetRows(): Promise<SheetRow[]> {
  const response = await fetch(CSV_URL, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`Failed to fetch Google Sheet: ${response.status} ${response.statusText}`)
  }

  const text = await response.text()
  const lines = text.split('\n').filter((line) => line.trim().length > 0)

  if (lines.length < 2) {
    return [] // Only header or empty
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim())
  const rows: SheetRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? ''
    }

    // Skip rows without required fields
    if (!row.email || !row.inquiry_type) continue

    rows.push({
      email: row.email ?? '',
      first_name: row.first_name ?? '',
      last_name: row.last_name ?? '',
      inquiry_type: row.inquiry_type ?? '',
      job_title: row.job_title ?? '',
      free_text: row.free_text ?? '',
      evaluation_journey: row.evaluation_journey ?? '',
      product_interest: row.product_interest ?? '',
      rate_limit_tier: row.rate_limit_tier ?? '',
      tokens_per_minute: row.tokens_per_minute ?? '',
      uk_eu_ch_entity: row.uk_eu_ch_entity ?? '',
      expected_spend: row.expected_spend ?? '',
      company_name: row.company_name ?? '',
      employee_count: row.employee_count ?? '',
      country: row.country ?? '',
      timestamp: row.timestamp ?? new Date().toISOString(),
    })
  }

  return rows
}
