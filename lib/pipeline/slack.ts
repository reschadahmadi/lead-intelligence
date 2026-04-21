/**
 * Slack Notifications
 *
 * Sends formatted alerts to a Slack channel via incoming webhook.
 * Silent when SLACK_WEBHOOK_URL is not set — no errors, no logs.
 *
 * To activate:
 * 1. Create a Slack app at api.slack.com/apps
 * 2. Enable "Incoming Webhooks" and add one to your channel
 * 3. Set SLACK_WEBHOOK_URL in your .env.local / Vercel env vars
 */

const TIER_LABELS: Record<string, string> = {
  hot: 'Accelerate',
  warm: 'Engage',
  cold: 'Nurture',
}

const TIER_EMOJI: Record<string, string> = {
  hot: ':fire:',
  warm: ':large_yellow_circle:',
  cold: ':snowflake:',
}

interface SlackLeadPayload {
  email: string
  first_name?: string
  last_name?: string
  company_name?: string
  free_text?: string
  tier: string
  final_score: number
  sla_deadline: string | null
  geo_region?: string
  inquiry_type?: string
  job_title?: string
  is_global_2000?: boolean
  competitor_tool_detected?: boolean
  expected_spend?: string
  segment?: string
  assigned_rep?: string
}

export async function notifySlack(lead: SlackLeadPayload): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const tierLabel = TIER_LABELS[lead.tier] ?? lead.tier
  const emoji = TIER_EMOJI[lead.tier] ?? ':bell:'
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email
  const slaText = lead.sla_deadline
    ? new Date(lead.sla_deadline).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
    : 'None'

  // Build signal tags
  const signals: string[] = []
  if (lead.is_global_2000) signals.push(':globe_with_meridians: Global 2000')
  if (lead.competitor_tool_detected) signals.push(':warning: Competitor Detected')
  if (lead.expected_spend) signals.push(`:moneybag: ${lead.expected_spend}`)

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} New ${tierLabel} Lead — Score ${lead.final_score}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Name*\n${name}` },
        { type: 'mrkdwn', text: `*Company*\n${lead.company_name ?? 'Unknown'}` },
        { type: 'mrkdwn', text: `*Score*\n${lead.final_score}` },
        { type: 'mrkdwn', text: `*SLA Deadline*\n${slaText}` },
        { type: 'mrkdwn', text: `*Geo*\n${lead.geo_region ?? '—'}` },
        { type: 'mrkdwn', text: `*Segment*\n${lead.segment ?? '—'}` },
      ],
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Job Title*\n${lead.job_title ?? '—'}` },
        { type: 'mrkdwn', text: `*Inquiry Type*\n${lead.inquiry_type ?? '—'}` },
      ],
    },
  ]

  // Free text — what the lead actually said
  if (lead.free_text) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*What they said*\n> ${lead.free_text.length > 300 ? lead.free_text.slice(0, 300) + '…' : lead.free_text}`,
      },
    })
  }

  // Signal tags
  if (signals.length > 0) {
    blocks.push({
      type: 'context',
      elements: signals.map((s) => ({ type: 'mrkdwn', text: s })),
    })
  }

  // Assigned rep
  if (lead.assigned_rep) {
    blocks.push({
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `:bust_in_silhouette: Assigned to *${lead.assigned_rep}*` },
      ],
    })
  }

  blocks.push({ type: 'divider' })

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${emoji} New ${tierLabel} lead: ${name} (Score: ${lead.final_score})`,
        blocks,
      }),
    })
  } catch {
    // Slack failure should never break the pipeline
  }
}
