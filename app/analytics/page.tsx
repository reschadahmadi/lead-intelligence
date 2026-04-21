import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  OutcomeBreakdown,
  ScoreDistribution,
  InquiryTypeMix,
  LeadsByRegion,
  IndustryBreakdown,
  CompanySizeDistribution,
  ConversionRateOverTime,
  MultiplierImpact,
  TopCompanies,
  CompetitorSignals,
  PipelineValue,
  RepLeaderboard,
  ClaudeConfidence,
  DecayDashboard,
} from "@/components/analytics-charts"
import type { Lead, InquiryType, GeoRegion, Segment, LeadTier, LeadOutcome, EnrichmentStatus } from "@/lib/types/lead"

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
      {children}
    </div>
  )
}

// Seeded random for consistent dummy data across renders
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function generateDummyLeads(): Lead[] {
  const rand = seededRandom(42)
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
  const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min

  const firstNames = ["Alice", "Bob", "Clara", "David", "Emma", "Frank", "Grace", "Henry", "Isla", "James", "Kate", "Liam", "Mia", "Noah", "Olivia", "Peter", "Quinn", "Ryan", "Sofia", "Tom", "Uma", "Victor", "Wendy", "Xander", "Yara", "Zach"]
  const lastNames = ["Anderson", "Brown", "Chen", "Davis", "Evans", "Fischer", "Garcia", "Hoffmann", "Ibrahim", "Jensen", "Kim", "Lopez", "Mueller", "Nakamura", "Olsson", "Patel", "Quinn", "Rossi", "Schmidt", "Tanaka", "Ueda", "Virtanen", "Wang", "Xavier", "Yamamoto", "Zhang"]
  const companies = ["TechCorp", "DataFlow AI", "CloudScale", "NeuralWorks", "Quantum Labs", "CyberShield", "InnovateTech", "Apex Systems", "BlueHorizon", "Vertex AI", "StreamLine", "Pulse Analytics", "OmniCloud", "MetaForge", "Sentinel AI", "BrightPath", "Nexus Corp", "FusionTech", "ArcLight", "PrismData"]
  const industries = ["Technology", "Financial Services", "Healthcare", "Manufacturing", "Retail", "Energy", "Telecommunications", "Education", "Media", "Automotive"]
  const inquiryTypes: InquiryType[] = ["contact_sales", "rate_limit", "baa", "zdr", "invoicing", "support"]
  const regions: GeoRegion[] = ["central", "uki", "northern", "southern", "other_emea"]
  const segments: Segment[] = ["enterprise", "startup"]
  const tiers: LeadTier[] = ["hot", "warm", "cold"]
  const outcomes: (LeadOutcome | null)[] = ["converted", "lost", "no_response", "in_progress", null]
  const enrichments: EnrichmentStatus[] = ["complete", "partial", "minimal"]
  const reps = ["Sarah M.", "James K.", "Emily R.", "Michael T.", "Ana G.", "Chris P.", "Diana L.", "Robert H."]
  const jobTitles = ["CTO", "VP Engineering", "Head of AI", "Data Scientist", "ML Engineer", "Product Manager", "Director of Technology", "Software Architect", "CEO", "Head of Platform", "DevOps Lead", "Engineering Manager"]
  const domains = ["techcorp.com", "dataflow.ai", "cloudscale.io", "neuralworks.com", "quantumlabs.co", "cybershield.net", "innovatetech.com", "apexsys.io", "bluehorizon.co", "vertexai.com", "streamline.io", "pulseanalytics.com", "omnicloud.io", "metaforge.ai", "sentinelai.com", "brightpath.co", "nexuscorp.com", "fusiontech.io", "arclight.ai", "prismdata.co"]

  const leads: Lead[] = []
  const now = new Date("2026-04-20T12:00:00Z")

  for (let i = 0; i < 150; i++) {
    const daysAgo = randInt(0, 84) // 12 weeks
    const createdAt = new Date(now.getTime() - daysAgo * 86400000)
    const firstName = pick(firstNames)
    const lastName = pick(lastNames)
    const company = pick(companies)
    const domain = pick(domains)
    const tier = pick(tiers)
    const outcome = daysAgo > 14 ? pick(outcomes) : (rand() > 0.7 ? "in_progress" : null)
    const baseScore = randInt(10, 80)
    const claudeJobTitle = randInt(0, 25)
    const claudeFreeText = randInt(0, 25)
    const totalForm = baseScore + claudeJobTitle + claudeFreeText
    const mFirm = Math.round((rand() * 1.5 + 0.5) * 10) / 10
    const mFin = Math.round((rand() * 1.5 + 0.5) * 10) / 10
    const mTech = Math.round((rand() * 1.5 + 0.5) * 10) / 10
    const mOrg = Math.round((rand() * 1.5 + 0.5) * 10) / 10
    const mInd = Math.round((rand() * 1.5 + 0.5) * 10) / 10
    const totalMult = Math.round((mFirm + mFin + mTech + mOrg + mInd) * 10) / 10
    const finalScore = Math.round(totalForm * (1 + totalMult / 10))
    const decayPoints = daysAgo > 30 ? randInt(5, 30) : (daysAgo > 14 ? randInt(0, 10) : 0)
    const empCount = pick([50, 120, 350, 800, 1500, 3000, 5000, 12000, 25000, 50000, null])

    leads.push({
      id: `dummy-${i}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
      email_domain: domain,
      first_name: firstName,
      last_name: lastName,
      inquiry_type: pick(inquiryTypes),
      job_title: pick(jobTitles),
      free_text: "Interested in Claude API integration",
      evaluation_journey: pick(["just_starting", "evaluating", "ready_to_buy", null]),
      product_interest: pick(["claude_api", "claude_enterprise", "claude_team", null]),
      rate_limit_tier: pick(["tier_1", "tier_2", "tier_3", null]),
      tokens_per_minute: pick(["10k", "50k", "100k", null]),
      uk_eu_ch_entity: pick(["yes", "no", null]),
      expected_spend: pick(["<10k", "10k-50k", "50k-100k", "100k+", null]),
      enrichment_status: pick(enrichments),
      company_name: company,
      company_domain: domain,
      company_type: pick(["private", "public", null]),
      industry: pick(industries),
      employee_count: empCount,
      revenue_estimate: empCount ? empCount * randInt(50, 200) * 1000 : null,
      founded_year: randInt(2005, 2023),
      hq_country: pick(["Germany", "UK", "France", "Netherlands", "Sweden", "Spain", "Italy", "Switzerland"]),
      hq_region: pick(["Europe", "EMEA"]),
      hq_city: pick(["London", "Berlin", "Paris", "Amsterdam", "Stockholm", "Madrid", "Milan", "Zurich"]),
      company_funding_event_flag: rand() > 0.7,
      company_hiring_event_flag: rand() > 0.6,
      operating_status: "active",
      funding_status: pick(["series_a", "series_b", "series_c", "ipo", null]),
      number_of_funding_rounds: randInt(0, 5),
      tech_spend_estimate: randInt(100000, 5000000),
      number_of_acquisitions: randInt(0, 3),
      ipo_status: pick(["private", "public", null]),
      last_funding_type: pick(["series_a", "series_b", "seed", null]),
      last_funding_amount: randInt(1000000, 50000000),
      last_funding_date: "2025-06-15",
      total_funding_amount: randInt(5000000, 200000000),
      number_of_investors: randInt(1, 10),
      technology_name: ["Python", "AWS", "Docker"],
      technology_tag: ["cloud", "ai"],
      technology_categories: ["Infrastructure", "AI/ML"],
      technology_first_detected: "2024-01-01",
      technology_last_detected: "2026-04-01",
      is_global_2000: rand() > 0.85,
      competitor_tool_detected: rand() > 0.6,
      competitor_tools_list: rand() > 0.6 ? [pick(["OpenAI", "Google Gemini", "Cohere", "Mistral"])] : null,
      geo_region: pick(regions),
      segment: pick(segments),
      assigned_rep: pick(reps),
      self_reported_employee_count: empCount,
      base_score: baseScore,
      field_score_evaluation_journey: randInt(0, 10),
      field_score_product_interest: randInt(0, 10),
      field_score_rate_limit_tier: randInt(0, 10),
      field_score_tokens_per_minute: randInt(0, 5),
      field_score_uk_eu_ch_entity: randInt(0, 5),
      field_score_expected_spend: randInt(0, 15),
      claude_score_job_title: claudeJobTitle,
      claude_score_free_text: claudeFreeText,
      claude_input_job_title: pick(jobTitles),
      claude_input_free_text: "Looking to integrate Claude API",
      total_form_score: totalForm,
      multiplier_firmographic: mFirm,
      multiplier_financial: mFin,
      multiplier_tech_competitive: mTech,
      multiplier_organizational: mOrg,
      multiplier_individual: mInd,
      total_multiplier_score: totalMult,
      final_score: finalScore,
      tier,
      sla_deadline: tier === "hot" ? new Date(createdAt.getTime() + 86400000).toISOString() : null,
      slack_notified: rand() > 0.5,
      decay_points: decayPoints,
      decayed_score: Math.max(0, finalScore - decayPoints),
      days_untouched: decayPoints > 0 ? randInt(7, 45) : randInt(0, 7),
      outcome,
      outcome_updated_at: outcome ? new Date(createdAt.getTime() + randInt(1, 14) * 86400000).toISOString() : null,
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
    })
  }

  return leads
}

export default async function AnalyticsPage() {
  const leads = generateDummyLeads()

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
          <div className="flex flex-col gap-6 py-4 px-4 lg:px-6">

            {/* Section Header */}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Deep dive into your lead pipeline, scoring, and team performance.
              </p>
            </div>

            {/* Pipeline & Revenue */}
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pipeline &amp; Revenue</h2>
            <Row>
              <OutcomeBreakdown leads={leads} />
              <PipelineValue leads={leads} />
            </Row>
            <Row>
              <ConversionRateOverTime leads={leads} />
              <ScoreDistribution leads={leads} />
            </Row>

            {/* Lead Quality */}
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Lead Quality</h2>
            <Row>
              <ClaudeConfidence leads={leads} />
              <MultiplierImpact leads={leads} />
            </Row>

            {/* Market Intelligence */}
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Market Intelligence</h2>
            <Row>
              <IndustryBreakdown leads={leads} />
              <CompanySizeDistribution leads={leads} />
            </Row>
            <Row>
              <LeadsByRegion leads={leads} />
              <InquiryTypeMix leads={leads} />
            </Row>

            {/* Inbound & Competition */}
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Inbound &amp; Competition</h2>
            <Row>
              <TopCompanies leads={leads} />
              <CompetitorSignals leads={leads} />
            </Row>

            {/* Operations & Team */}
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Operations &amp; Team</h2>
            <Row>
              <RepLeaderboard leads={leads} />
              <DecayDashboard leads={leads} />
            </Row>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
