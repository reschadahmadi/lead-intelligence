# Lead Intelligence Engine — Product Requirements Document

## Tech Stack

- **Runtime**: Next.js 16 on Vercel (serverless functions)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI Scoring**: Claude API (`@anthropic-ai/sdk`)
- **Data Source**: Google Sheets (public CSV export)
- **Notifications**: Slack (v2)
- **Enrichment**: Cognism · Crunchbase · BuiltWith (v2 — mocked in v1)

## Pipeline Flow

```
Google Sheet → Ingestion → Enrichment (mock) → Routing → Scoring → Multipliers → Actioning → Supabase
```

Triggered manually via dashboard button. Each layer is a TypeScript module in `lib/pipeline/`.

---

## Google Sheet Schema

Source: `https://docs.google.com/spreadsheets/d/1WMjYkAnkHKO-x05GDnOlQYPnrGhhHC_t1G-M5VX11_A`

| Column | Field | Required | Notes |
|--------|-------|----------|-------|
| email | `email` | Yes | |
| first_name | `first_name` | No | |
| last_name | `last_name` | No | |
| inquiry_type | `inquiry_type` | Yes | contact_sales / rate_limit / baa / zdr / invoicing / support |
| job_title | `job_title` | No | Scored by Claude API |
| free_text | `free_text` | No | Scored by Claude API |
| evaluation_journey | `evaluation_journey` | No | Contact Sales only |
| product_interest | `product_interest` | No | Contact Sales, BAA |
| rate_limit_tier | `rate_limit_tier` | No | Rate Limit only |
| tokens_per_minute | `tokens_per_minute` | No | Rate Limit only |
| uk_eu_ch_entity | `uk_eu_ch_entity` | No | BAA only |
| expected_spend | `expected_spend` | No | Invoicing only |
| company_name | `company_name` | No | Self-reported |
| employee_count | `employee_count` | No | Self-reported |
| country | `country` | No | Self-reported HQ country |
| timestamp | submission time | Auto | ISO 8601 |

---

## Layer 0 — Ingestion

**Purpose**: Filter out invalid submissions before processing.

**Endpoint**: `POST /api/process-leads` (reads from Google Sheet)

### Disqualification Checks (sequential)

1. **Free email**: Reject if domain is gmail.com, yahoo.com, hotmail.com, outlook.com, etc.
2. **Competitor domain**: Reject if domain matches known competitors (openai.com, google.com, cohere.com, etc.)
3. **Spam indicators**: Reject if free_text contains spam terms (buy now, click here, crypto, etc.)
4. **Gibberish detection**: Reject if free_text has >70% consonants or avg word length >15
5. **Duplicate**: Reject if same email submitted within past 7 days (query Supabase)

**On rejection**: Log to Supabase with `ingestion_status = 'rejected'` and `rejection_reason`.

**On pass**: Normalize (lowercase email, trim whitespace, extract domain) and continue pipeline.

---

## Layer 1 — Enrichment (MOCKED in v1)

**Purpose**: Add verified company data from external sources.

**v1**: Returns realistic mock data. **v2**: Real API calls to Cognism, Crunchbase, BuiltWith.

### Enrichment Fields (32 fields, 10 categories)

**Company basics**: `company_name`, `company_domain`, `company_type`, `industry`, `employee_count`, `revenue_estimate`, `founded_year`

**Geography**: `hq_country`, `hq_region`, `hq_city`

**Event flags**: `company_funding_event_flag`, `company_hiring_event_flag`

**Growth signals**: `operating_status`, `funding_status`, `number_of_funding_rounds`, `tech_spend_estimate`

**M&A / IPO**: `number_of_acquisitions`, `ipo_status`

**Funding detail**: `last_funding_type`, `last_funding_amount`, `last_funding_date`, `total_funding_amount`, `number_of_investors`

**Tech stack**: `technology_name`, `technology_tag`, `technology_categories`, `technology_first_detected`, `technology_last_detected`

**Domain reputation**: `is_global_2000`

**Competitive intelligence**: `competitor_tool_detected`, `competitor_tools_list`

### Enrichment Sources (v2)

| Source | When Called | Returns |
|--------|-----------|---------|
| Cognism | Every lead | Firmographics + geography |
| Crunchbase | >500 employees | Funding + growth signals |
| BuiltWith | >500 employees (NOPII=yes) | Tech stack + competitive intel |

---

## Layer 2 — Routing

**Purpose**: Assign each lead to a rep by geography + segment.

### Geographic Sub-Regions

| Region | Countries |
|--------|-----------|
| Central | Germany, Austria, Switzerland, Poland, Czech Republic, Hungary, Romania, Slovakia, Slovenia, Croatia, Bulgaria, Serbia, Bosnia and Herzegovina, Montenegro, North Macedonia, Albania, Moldova, Ukraine |
| UKI | United Kingdom, Ireland |
| Northern | Sweden, Norway, Denmark, Finland, Iceland, Estonia, Latvia, Lithuania, Netherlands, Belgium, Luxembourg |
| Southern | France, Spain, Italy, Portugal, Greece, Malta, Cyprus, Andorra, Monaco, Israel, Turkey, UAE, Saudi Arabia, Qatar, Bahrain, Kuwait, Oman, Jordan, Lebanon, Egypt, Morocco, Tunisia |

### Segment Rules

- **Enterprise**: ≥2,500 employees
- **Startup**: <2,500 employees
- Fallback: use self-reported employee count if enrichment unavailable

### Rep Mapping

| Geography | Segment | Assignment Key |
|-----------|---------|---------------|
| Central | Enterprise | central_enterprise |
| Central | Startup | central_startup |
| UKI | Enterprise | uki_enterprise |
| UKI | Startup | uki_startup |
| Northern | Enterprise | northern_enterprise |
| Northern | Startup | northern_startup |
| Southern | Enterprise | southern_enterprise |
| Southern | Startup | southern_startup |
| Other EMEA | Enterprise | dublin_enterprise |
| Other EMEA | Startup | dublin_startup |

---

## Layer 3 — Intent-Based Scoring

**Purpose**: Score each lead based on form data. Pure addition, fully decomposable.

### Base Scores by Form Type

| Form | Base | Max Total |
|------|------|-----------|
| Contact Sales | 50 | 130 |
| Rate Limit | 40 | 85 |
| BAA | 30 | 70 |
| ZDR | 25 | 40 |
| Invoicing | 20 | 40 |
| Support | 10 | 10 |

### Contact Sales — Field Scoring

| Field | Value | Points |
|-------|-------|--------|
| evaluation_journey | Know what I want | 30 |
| | Actively exploring | 18 |
| | Just curious | 5 |
| product_interest | Enterprise Plan | 15 |
| | API | 13 |
| | Financials | 12 |
| | Healthcare | 12 |
| | Claude Code | 8 |
| | Team Plan | 6 |
| | Education | 4 |
| | Nonprofits | 4 |
| job_title (Claude API) | C-suite | 13–15 |
| | VP/Director | 9–12 |
| | Head of/Sr Mgr | 6–8 |
| | Manager | 3–5 |
| | IC/Unclear | 1–2 |
| free_text (Claude API) | Concrete + timeline + budget | 18–20 |
| | Specific missing details | 12–17 |
| | General interest | 6–11 |
| | Vague | 1–5 |

### Rate Limit — Field Scoring

| Field | Value | Points |
|-------|-------|--------|
| rate_limit_tier | Beyond Tier 4 | 15 |
| | Tier 4 | 8 |
| tokens_per_minute | 5M+ | 15 |
| | 2M–5M | 12 |
| | 1M–2M | 8 |
| | Under 1M | 4 |
| free_text (Claude API) | 0–15 | |

### BAA — Field Scoring

| Field | Value | Points |
|-------|-------|--------|
| product_interest | Healthcare | 15 |
| | Enterprise Plan | 12 |
| | API | 11 |
| | Financials | 8 |
| | Claude Code | 5 |
| | Team Plan | 4 |
| | Education | 3 |
| | Nonprofits | 3 |
| uk_eu_ch_entity | Yes | 10 |
| | No | 5 |
| free_text (Claude API) | 0–15 | |

### ZDR — Field Scoring

| Field | Value | Points |
|-------|-------|--------|
| free_text (Claude API) | 0–15 | |

### Invoicing — Field Scoring

| Field | Value | Points |
|-------|-------|--------|
| expected_spend (Claude API) | $50k+/month | 17–20 |
| | $10k–$50k | 12–16 |
| | $1k–$10k | 6–11 |
| | Low/vague | 1–5 |

### Support

Base score only (10). No additional fields.

### Claude API Scoring Rules

- Send job_title and free_text to Claude with constrained prompts
- Prompts must include: exact scale, evaluation criteria, bias prevention (no demographic inference from names, no penalty for non-native English)
- Return integer score only
- Store both input and output on lead record for audit

---

## Layer 4 — Intelligence Multipliers

**Purpose**: Add context from enrichment data and historical patterns. Capped at ~half of max intent score (65 vs 130).

### Domain 1: Firmographic Intelligence — Max 18

| Field | Condition | Points |
|-------|-----------|--------|
| is_global_2000 | Yes | +5 |
| | No | 0 |
| employee_count | 50,000+ | +4 |
| | 10,000–49,999 | +3 |
| | 2,500–9,999 | +2 |
| | 500–2,499 | +1 |
| | Under 500 | 0 |
| revenue_estimate | Above $1B | +3 |
| | $100M–$1B | +2 |
| | $10M–$100M | +1 |
| | Under $10M | 0 |
| industry | Software – Healthtech/Fintech | +4 |
| | Software – Cybersecurity | +3 |
| | Healthcare & Life Sciences | +3 |
| | Financial Services | +3 |
| | Software | +2 |
| | Legal Services | +2 |
| | Telecommunications | +1 |
| | Professional Services | +1 |
| | Government & Public Sector | +1 |
| | Manufacturing & Industrial | +1 |
| | Other | 0 |

### Domain 2: Financial Momentum — Max 15

| Field | Condition | Points |
|-------|-----------|--------|
| last_funding_date | Within 6 months | +4 |
| | Within 12 months | +2 |
| | Within 24 months | +1 |
| | Older or no data | 0 |
| last_funding_amount | Above $100M | +3 |
| | $10M–$100M | +2 |
| | Under $10M | +1 |
| | No data | 0 |
| total_funding_amount | Above $500M | +2 |
| | Above $100M | +1 |
| | Under $100M | 0 |
| number_of_funding_rounds | 5+ rounds | +1 |
| | Under 5 | 0 |
| company_hiring_event_flag | Actively hiring | +2 |
| | No event | 0 |
| last_funding_type | Series D+ or Series C | +3 |
| | Series B or Series A | +1 |
| | Earlier or no data | 0 |

### Domain 3: Technology & Competitive Landscape — Max 14

| Field | Condition | Points |
|-------|-----------|--------|
| competitor_tool_detected | Yes | +6 |
| | No | 0 |
| competitor_tools_list | OpenAI detected | +2 |
| | Google AI detected | +2 |
| | Cohere detected | +1 |
| | Hugging Face detected | +1 |
| | Multiple competitors | +1 bonus |
| technology_categories | Full Claude-ready infra | +3 |
| | Partial modern stack | +1 |
| | None | 0 |
| technology_first_detected | Core tech 3+ years | +2 |
| | 1–3 years | +1 |
| | Under 1 year | 0 |

### Domain 4: Organizational Buying Behavior — Max 10

Support submissions excluded from counts.

| Signal | Condition | Points |
|--------|-----------|--------|
| account_commercial_lead_count | 5+ from same domain | +5 |
| | 3–4 leads | +4 |
| | 2 leads | +3 |
| | First lead | 0 |
| account_time_concentration | 3+ within 7 days | +5 |
| | 3+ within 30 days | +3 |
| | 2 within 7 days | +3 |
| | 2 within 30 days | +1 |
| | Spread or first | 0 |

### Domain 5: Individual Engagement Pattern — Max 8

| Signal | Condition | Points |
|--------|-----------|--------|
| multi_touch_count | 3+ submissions | +3 |
| | 2 submissions | +2 |
| | First submission | 0 |
| multi_touch_progression | Support → Contact Sales | +5 |
| | Rate Limit → Contact Sales | +4 |
| | ZDR/BAA/Invoicing → Contact Sales | +3 |
| | Same form repeated | +1 |
| | First submission | 0 |

### Multiplier Summary

| Domain | Max |
|--------|-----|
| Firmographic Intelligence | 18 |
| Financial Momentum | 15 |
| Technology & Competitive | 14 |
| Organizational Buying | 10 |
| Individual Engagement | 8 |
| **Total** | **65** |

---

## Layer 5 — Actioning

**Purpose**: Assign tier, set SLA, write to Supabase.

### Tier Thresholds

| Tier | Score | SLA | Notification |
|------|-------|-----|-------------|
| Hot | 130+ | 2-hour response | Slack alert (v2) |
| Warm | 55–129 | 1 business day | Queue-based |
| Cold | Under 55 | Monthly review | Parked |

### Actions

1. Calculate `final_score = total_form_score + total_multiplier_score`
2. Assign tier based on thresholds
3. Set `sla_deadline` based on tier
4. Write complete lead record to Supabase `leads` table
5. **(v2)** Send Slack notification for hot leads

---

## Layer 6 — Learning (v2)

### Decay — Nightly Cron (v2)

| Days Untouched | Decay Points |
|----------------|-------------|
| 3 days | -5 |
| 7 days | -15 |
| 14 days | -30 |

Decay is cumulative. Stops when rep logs any activity.

### Recalibration — Quarterly (v2)

Script analyzes past 90 days: scoring accuracy, multiplier effectiveness, tier accuracy, ratio validation. Produces report — human approves changes.

---

## Final Score Formula

```
Final Score = Base Score + Field Scores + Claude API Scores + Multiplier Scores
```

| Component | Max |
|-----------|-----|
| Base Score | 50 |
| Field Scores | 80 |
| Claude API Scores | 35 |
| **Total Form Score** | **130** |
| Multiplier Score | **65** |
| **Maximum Final Score** | **195** |

**Tier Assignment**: Hot ≥ 130 · Warm 55–129 · Cold < 55

**Ratio**: Intent 2 : Multiplier 1

---

## File Structure

```
app/
  api/
    process-leads/route.ts    — Main pipeline endpoint
  page.tsx                     — Dashboard
lib/
  pipeline/
    types.ts                   — Pipeline-internal types
    ingestion.ts               — Layer 0
    enrichment.ts              — Layer 1 (mock)
    routing.ts                 — Layer 2
    scoring.ts                 — Layer 3
    multipliers.ts             — Layer 4
    actioning.ts               — Layer 5
  sheets/
    reader.ts                  — Google Sheets CSV reader
  supabase/
    server.ts                  — Supabase server client
    leads.ts                   — Lead queries
  types/
    lead.ts                    — Lead type definition
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
ANTHROPIC_API_KEY=...
```
