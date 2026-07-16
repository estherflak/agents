// Ridgeline sandbox: static practice material a PMM can drop into a step's
// input, mirroring "where would this come from at my real job." The agents only
// ever reason over this text (or whatever the PMM pastes) — no live data.

export type SandboxAsset = {
  id: string;
  label: string;
  category: string;
  text: string;
};

export const sandboxAssets: SandboxAsset[] = [
  {
    id: "company_overview",
    label: "Company overview",
    category: "Company",
    text: `Ridgeline — company overview

One-liner: Ridgeline is the project workspace for cross-functional teams who are tired of stitching together five tools to ship one project.

Category: Team collaboration & project management software.

Founded 2021. ~85 employees. Series B. Mid-market focus (50–2,000 employee companies), expanding toward enterprise.

Target customer: Cross-functional teams (product, marketing, ops, eng) at growing companies who've outgrown spreadsheets and Slack threads but find Jira/Asana too rigid or too eng-centric.

Current positioning (imperfect, a real starting point): "Ridgeline brings your team's work into one place — boards, docs, and approvals, without the setup headache." Internal debate: is "one place" differentiated enough? Sales says prospects don't believe it anymore — three other vendors say the same thing.

Brand voice: Plain-spoken, a little wry, allergic to corporate jargon. Never says "synergy" or "seamless."

How Ridgeline reps frame the field: "Corkboard for structure you'll outgrow, Fluxio for power you'll never fully use, Inkwell for flexibility that becomes chaos at scale — Ridgeline is the one built to still make sense at 200 people without a bootcamp."`,
  },
  {
    id: "product_pricing",
    label: "Product & pricing",
    category: "Company",
    text: `Ridgeline — product & pricing

Core features:
- Boards & Timelines — kanban boards that convert to Gantt-style timelines with one click.
- Docs — collaborative docs that live inside a project, not a separate app.
- Approvals — built-in sign-off flows (e.g. "creative needs legal + brand approval before it ships"). Ridgeline's most-cited differentiator.
- Automations — no-code "when X happens, do Y" rules (e.g. auto-assign, auto-notify).
- Dashboards — cross-project reporting for managers.
- Integrations — Slack, Google Workspace, GitHub, Figma; Zapier for the long tail.

Known gaps (useful for honest battlecards): no native mobile app (web-responsive only), reporting is basic compared to enterprise players, no time-tracking or resource-capacity planning.

Pricing:
- Free — $0 — up to 5 users, 3 active projects.
- Team — $12/user/mo — unlimited projects, automations.
- Business — $24/user/mo — approvals, dashboards, SSO.
- Enterprise — custom — dedicated support, custom permissions, audit logs.`,
  },
  {
    id: "competitor_corkboard",
    label: "Competitor: Corkboard",
    category: "Competitor",
    text: `Competitor: Corkboard — the scrappy simplicity player

Positioning: "Project management that doesn't feel like homework."

Beloved by small teams and agencies for being cheap ($8/user/mo flat) and fast to set up.

Weaknesses: no approvals workflow, reporting is nearly nonexistent, breaks down past ~30 people on a project.

Wins on price and simplicity; loses on scale.`,
  },
  {
    id: "competitor_fluxio",
    label: "Competitor: Fluxio",
    category: "Competitor",
    text: `Competitor: Fluxio — the enterprise heavyweight

Positioning: "The operating system for enterprise work."

Deep customization, powerful reporting, resource/capacity planning, robust permissions. Expensive ($45+/user/mo), notoriously steep learning curve — a running joke that new hires need a two-week "Fluxio bootcamp."

Wins on power and enterprise trust (SOC 2, dedicated CSMs); loses on time-to-value and cost.`,
  },
  {
    id: "competitor_inkwell",
    label: "Competitor: Inkwell",
    category: "Competitor",
    text: `Competitor: Inkwell — the flexible workspace

Positioning: "One tool for docs, wikis, and work."

Infinitely flexible (databases, docs, light boards) and a cult favorite with startups.

Weaknesses: not purpose-built for project management — teams build their own PM system inside it, which works great until it doesn't (30+ person teams report their Inkwell workspace becoming "a wiki nobody trusts").

Wins on flexibility and love from individual contributors; loses on structure and manager visibility.`,
  },
  {
    id: "customer_feedback",
    label: "Customer feedback batch",
    category: "Feedback",
    text: `Ridgeline — customer feedback batch (reviews, tickets, sales verbatims; intentionally messy and slightly contradictory)

Reviews (G2-style):
1. ★★★★★ "Approvals alone saved our marketing team probably 5 hours a week of 'did legal see this yet' Slack pings."
2. ★★★★☆ "Clean and fast. Docked a star because there's no real mobile app — I can't approve things from my phone at a stoplight like I could in [Competitor]."
3. ★★★☆☆ "Great for 15 people. We're at 60 now and the dashboards don't give leadership what they need — we're exporting to Sheets to make real reports."
4. ★★★★★ "Switched from Inkwell because our 'project tracker' had turned into an unmaintainable wiki. Ridgeline forces just enough structure."
5. ★★☆☆☆ "Automations are powerful but the builder UI is confusing — took three tries and a support ticket to get a simple auto-assign rule working."

Support tickets (paraphrased):
- "Is there a way to set approval order (legal THEN brand, not both at once)? Right now it's all-or-nothing and it's causing bottlenecks." (recurring feature request)
- "Notifications are overwhelming — I get pinged for every comment on every task I've ever touched. Need granular controls." (recurring theme, 6 tickets in past quarter)
- "Losing time exporting Ridgeline data into our BI tool every week. Any API or native integration coming?"
- "Love the product but our exec sponsor is asking about SOC 2 before we can go Business tier — is that on the roadmap?"

Sales call verbatims:
- Prospect (60-person startup, Ridgeline vs. Fluxio): "Fluxio quoted us $50/seat and a 6-week implementation. We don't have 6 weeks."
- Prospect (200-person co, Ridgeline vs. Inkwell): "Our Notion — sorry, Inkwell — workspace is basically a haunted house at this point. Nobody knows which doc is current."
- Lost deal (chose Corkboard): "Honestly we're 8 people, we don't need approvals or dashboards yet. Corkboard was half the price and did what we needed."
- Churned customer (moved to Fluxio at 400 employees): "We loved Ridgeline until we needed real resource planning across 12 teams. Grew out of it."`,
  },
  {
    id: "past_launch_approvals",
    label: "Past launch: Approvals",
    category: "Launch",
    text: `Ridgeline — past launch case study: Approvals (launched 2 quarters ago)

Brief (as written pre-launch): Marketing and creative teams keep asking for a way to route work for sign-off without leaving Ridgeline. Ship a lightweight approval flow: assign approvers to any task, require sign-off before it can be marked done, notify on approve/reject.

What shipped: All-or-nothing approvals (all assigned approvers must sign off; no sequencing). Slack + email notifications.

Results: Fastest feature adoption in company history — 40% of Business-tier accounts used it within 30 days. Became the #1 cited reason in win/loss notes for deals closed against Corkboard and Inkwell.

Retro / what was missed: Didn't anticipate demand for sequential approval order until support tickets started stacking up post-launch — a scoping lesson for the next launch.`,
  },
  {
    id: "upcoming_launch_ai_assist",
    label: "Upcoming launch: AI Assist brief",
    category: "Launch",
    text: `Ridgeline — upcoming launch brief (raw, deliberately incomplete)

Feature: Ridgeline AI Assist — an AI feature that drafts task summaries, flags stalled projects, and suggests next steps inside a project.

Target launch date: 10 weeks out.

Why now: Two competitors (Fluxio, Inkwell) have shipped AI features in the past two quarters; sales is fielding "do you have AI?" on ~30% of new-deal calls.

Audience: Existing Business/Enterprise customers first (feature gated to those tiers), secondary goal of using it as a competitive hook in active sales cycles.

Rough messaging starting point (unpolished): "Ridgeline now tells you what's stuck before your team has to ask." Not final — legal wants review of any "AI" claims language before it ships.

Known constraints: Eng confirms feature-complete in 6 weeks, leaving ~4 weeks for GTM. No dedicated launch budget beyond existing content/social channels. CSM team wants advance notice to brief existing customers before any public announcement.

Open questions (intentional gaps): Beta/waitlist vs. straight GA? Any customer story ready in time, or does content lead with product-only messaging? How to handle the "do you have AI" sales objection in the interim 6 weeks before launch?`,
  },
];
