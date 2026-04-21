-- =============================================================================
-- Dummy Leads: Hot / Warm / Cold
-- =============================================================================
-- Hot:  final_score >= 130 → 2-hour SLA
-- Warm: final_score 55–129 → 1 business day SLA
-- Cold: final_score < 55   → monthly review
-- =============================================================================

INSERT INTO leads (
    -- Identity
    email, email_domain, first_name, last_name,
    inquiry_type, form_data, free_text, job_title,

    -- Form-specific
    evaluation_journey, product_interest,

    -- Ingestion
    ingestion_status,

    -- Enrichment
    enrichment_status,
    company_name, company_domain, company_type, industry,
    employee_count, revenue_estimate, founded_year,
    hq_country, hq_region, hq_city,
    company_funding_event_flag, company_hiring_event_flag,
    operating_status, funding_status, number_of_funding_rounds,
    tech_spend_estimate,
    last_funding_type, last_funding_amount, last_funding_date,
    total_funding_amount, number_of_investors,
    technology_name, technology_tag, technology_categories,
    is_global_2000,
    competitor_tool_detected, competitor_tools_list,

    -- Routing
    geo_region, segment, assigned_rep,

    -- Scoring: Form-Level
    base_score,
    field_score_evaluation_journey, field_score_product_interest,
    claude_score_job_title, claude_score_free_text,
    claude_input_job_title, claude_input_free_text,
    total_form_score,

    -- Scoring: Multipliers
    multiplier_firmographic, multiplier_financial,
    multiplier_tech_competitive, multiplier_organizational,
    multiplier_individual,
    total_multiplier_score,

    -- Final
    final_score, tier,
    sla_deadline, slack_notified,

    -- Outcome
    outcome
)
VALUES

-- ─── 1. HOT LEAD ─────────────────────────────────────────────────────────────
-- VP Engineering at Siemens AG (Global 2000 enterprise), Series D funded,
-- actively evaluating Claude for internal tooling, large tech spend
(
    'james.hartwell@siemens.com', 'siemens.com', 'James', 'Hartwell',
    'contact_sales',
    '{"evaluation_journey": "active_eval", "product_interest": "api_access"}',
    'We are evaluating Claude API for our internal developer tooling across 8 BUs. Currently using GPT-4 but looking to migrate. Need enterprise BAA and volume pricing.',
    'VP Engineering',

    'active_eval', 'api_access',

    'passed',

    'complete',
    'Siemens AG', 'siemens.com', 'public', 'Industrial Technology',
    320000, 87000000000, 1847,
    'DE', 'Bavaria', 'Munich',
    false, true,
    'active', 'public', 0,
    15000000,
    NULL, NULL, NULL,
    NULL, NULL,
    ARRAY['AWS', 'Azure', 'Kubernetes', 'Terraform', 'GitHub Enterprise'],
    ARRAY['cloud', 'devops', 'enterprise'],
    ARRAY['Cloud Infrastructure', 'DevOps', 'Version Control'],
    true,
    true, ARRAY['ChatGPT'],

    'central', 'enterprise', 'central_enterprise',

    30,
    25, 20,
    18, 17,
    'VP Engineering', 'We are evaluating Claude API for our internal developer tooling across 8 BUs. Currently using GPT-4 but looking to migrate. Need enterprise BAA and volume pricing.',
    110,

    18, 15,
    14, 10,
    8,
    65,

    175, 'hot',
    now() + interval '2 hours', false,

    'in_progress'
),

-- ─── 2. WARM LEAD ────────────────────────────────────────────────────────────
-- Senior ML Engineer at a Series B SaaS startup in London, exploring Claude
-- for product features, decent employee count but limited enrichment signals
(
    'priya.nair@stackflow.io', 'stackflow.io', 'Priya', 'Nair',
    'contact_sales',
    '{"evaluation_journey": "early_research", "product_interest": "api_access"}',
    'Looking to integrate an LLM into our data pipeline product for automated report generation. Claude seems to have better instruction following than alternatives.',
    'Senior ML Engineer',

    'early_research', 'api_access',

    'passed',

    'partial',
    'Stackflow', 'stackflow.io', 'private', 'SaaS / Data Analytics',
    180, 12000000, 2019,
    'GB', 'England', 'London',
    false, false,
    'active', 'venture', 3,
    850000,
    'series_b', 22000000, '2023-09-15',
    38000000, 12,
    ARRAY['Python', 'dbt', 'Snowflake', 'AWS'],
    ARRAY['data', 'cloud', 'analytics'],
    ARRAY['Data Engineering', 'Cloud Infrastructure'],
    false,
    false, NULL,

    'uki', 'startup', 'uki_startup',

    30,
    10, 20,
    8, 12,
    'Senior ML Engineer', 'Looking to integrate an LLM into our data pipeline product for automated report generation.',
    80,

    8, 10,
    9, 4,
    3,
    34,

    114, 'warm',
    now() + interval '1 day', false,

    'in_progress'
),

-- ─── 3. COLD LEAD ────────────────────────────────────────────────────────────
-- Marketing Manager at a small consultancy in Spain, vague inquiry,
-- low employee count, no funding signals, no tech stack overlap
(
    'carlos.mendez@brightwave-consulting.es', 'brightwave-consulting.es', 'Carlos', 'Mendez',
    'contact_sales',
    '{"evaluation_journey": "just_browsing", "product_interest": "unsure"}',
    'We are interested in AI tools for our team.',
    'Marketing Manager',

    'just_browsing', 'unsure',

    'passed',

    'minimal',
    'Brightwave Consulting', 'brightwave-consulting.es', 'private', 'Management Consulting',
    22, NULL, 2015,
    'ES', 'Catalonia', 'Barcelona',
    false, false,
    'active', 'bootstrapped', 0,
    NULL,
    NULL, NULL, NULL,
    NULL, NULL,
    NULL, NULL, NULL,
    false,
    false, NULL,

    'southern', 'startup', 'southern_startup',

    30,
    0, 0,
    3, 2,
    'Marketing Manager', 'We are interested in AI tools for our team.',
    35,

    2, 0,
    0, 2,
    1,
    5,

    40, 'cold',
    NULL, false,

    NULL
);
