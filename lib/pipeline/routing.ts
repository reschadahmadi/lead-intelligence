import type { GeoRegion, Segment } from '../types/lead'
import type { NormalizedLead, EnrichmentData, RoutingResult } from './types'

const COUNTRY_TO_REGION: Record<string, GeoRegion> = {
  // Central (DACH + Eastern Europe)
  DE: 'central', AT: 'central', CH: 'central', PL: 'central', CZ: 'central',
  SK: 'central', HU: 'central', RO: 'central', BG: 'central', HR: 'central',
  SI: 'central', RS: 'central', BA: 'central', ME: 'central', MK: 'central',
  AL: 'central', MD: 'central', UA: 'central',
  // UKI
  GB: 'uki', IE: 'uki',
  // Northern (Nordics / Baltics / Benelux)
  SE: 'northern', NO: 'northern', DK: 'northern', FI: 'northern', IS: 'northern',
  EE: 'northern', LV: 'northern', LT: 'northern', NL: 'northern', BE: 'northern',
  LU: 'northern',
  // Southern (Mediterranean / Middle East / North Africa)
  FR: 'southern', ES: 'southern', PT: 'southern', IT: 'southern', GR: 'southern',
  MT: 'southern', CY: 'southern', AD: 'southern', MC: 'southern', IL: 'southern',
  TR: 'southern', AE: 'southern', SA: 'southern', QA: 'southern', BH: 'southern',
  KW: 'southern', OM: 'southern', JO: 'southern', LB: 'southern', EG: 'southern',
  MA: 'southern', TN: 'southern',
}

// Also support full country names
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'germany': 'DE', 'austria': 'AT', 'switzerland': 'CH', 'poland': 'PL',
  'czech republic': 'CZ', 'slovakia': 'SK', 'hungary': 'HU', 'romania': 'RO',
  'bulgaria': 'BG', 'croatia': 'HR', 'slovenia': 'SI', 'serbia': 'RS',
  'bosnia and herzegovina': 'BA', 'montenegro': 'ME', 'north macedonia': 'MK',
  'albania': 'AL', 'moldova': 'MD', 'ukraine': 'UA',
  'united kingdom': 'GB', 'uk': 'GB', 'ireland': 'IE',
  'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK', 'finland': 'FI', 'iceland': 'IS',
  'estonia': 'EE', 'latvia': 'LV', 'lithuania': 'LT', 'netherlands': 'NL',
  'belgium': 'BE', 'luxembourg': 'LU',
  'france': 'FR', 'spain': 'ES', 'portugal': 'PT', 'italy': 'IT', 'greece': 'GR',
  'malta': 'MT', 'cyprus': 'CY', 'andorra': 'AD', 'monaco': 'MC', 'israel': 'IL',
  'turkey': 'TR', 'united arab emirates': 'AE', 'uae': 'AE', 'saudi arabia': 'SA',
  'qatar': 'QA', 'bahrain': 'BH', 'kuwait': 'KW', 'oman': 'OM', 'jordan': 'JO',
  'lebanon': 'LB', 'egypt': 'EG', 'morocco': 'MA', 'tunisia': 'TN',
}

function resolveCountryCode(country: string | null): string | null {
  if (!country) return null
  const upper = country.trim().toUpperCase()
  if (COUNTRY_TO_REGION[upper]) return upper
  const lower = country.trim().toLowerCase()
  return COUNTRY_NAME_TO_CODE[lower] ?? null
}

function resolveGeoRegion(countryCode: string | null): GeoRegion {
  if (!countryCode) return 'other_emea'
  return COUNTRY_TO_REGION[countryCode] ?? 'other_emea'
}

function resolveSegment(employeeCount: number | null): Segment {
  if (employeeCount === null) return 'startup'
  return employeeCount >= 2500 ? 'enterprise' : 'startup'
}

export function runRouting(lead: NormalizedLead, enrichment: EnrichmentData): RoutingResult {
  // Prefer enriched country, fallback to self-reported
  const country = enrichment.hq_country ?? lead.self_reported_country
  const countryCode = resolveCountryCode(country)
  const geoRegion = resolveGeoRegion(countryCode)

  // Prefer enriched employee count, fallback to self-reported
  const employeeCount = enrichment.employee_count ?? lead.self_reported_employee_count
  const segment = resolveSegment(employeeCount)

  const assignedRep = `${geoRegion}_${segment}`

  return {
    geo_region: geoRegion,
    segment,
    assigned_rep: assignedRep,
  }
}
