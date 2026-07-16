# Section 12: Fake Company Sandbox — Content Spec

Reference doc for the AI Agent-Building POC (see `agent-builder-poc-context.md`, section 12). This is the fictional company data PMM friends will practice against inside the 4 use-case workflows, before optionally swapping in their own real material.

Category chosen: **team collaboration / project management SaaS** (Slack/Asana/Notion-adjacent) — broadly relatable so any PMM can bring their own real-world instincts without needing domain knowledge.

Each asset below is tagged with which of the 4 POC use cases it primarily feeds:
UC1 = Competitive intel & battlecards · UC2 = Launch/campaign planning · UC3 = Messaging & positioning drafts · UC4 = Customer research synthesis.

---

## 1. The company: Ridgeline

**One-liner:** Ridgeline is the project workspace for cross-functional teams who are tired of stitching together five tools to ship one project.

**Category:** Team collaboration & project management software.

**Founded:** 2021. ~85 employees. Series B. Mid-market focus (50–2,000 employee companies), expanding toward enterprise.

**Target customer:** Cross-functional teams (product, marketing, ops, eng) at growing companies who've outgrown spreadsheets and Slack threads but find Jira/Asana too rigid or too eng-centric.

**Core positioning (current, imperfect — a real starting point for UC3):**
"Ridgeline brings your team's work into one place — boards, docs, and approvals, without the setup headache." *(Internal debate: is "one place" differentiated enough? Sales says prospects don't believe it anymore — three other vendors say the same thing. This tension is intentional raw material for a messaging/positioning workflow.)*

**Brand voice:** Plain-spoken, a little wry, allergic to corporate jargon. Never says "synergy" or "seamless."

---

## 2. Product details *(feeds UC1, UC3)*

**Core features:**
- **Boards & Timelines** — kanban boards that convert to Gantt-style timelines with one click.
- **Docs** — collaborative docs that live inside a project, not a separate app.
- **Approvals** — built-in sign-off flows (e.g. "creative needs legal + brand approval before it ships") — Ridgeline's most-cited differentiator.
- **Automations** — no-code "when X happens, do Y" rules (e.g. auto-assign, auto-notify).
- **Dashboards** — cross-project reporting for managers.
- **Integrations** — Slack, Google Workspace, GitHub, Figma; Zapier for the long tail.

**Known gaps (useful for honest battlecards):** no native mobile app (web-responsive only), reporting is basic compared to enterprise players, no time-tracking or resource-capacity planning.

**Pricing:**

| Tier | Price | Notes |
|---|---|---|
| Free | $0 | Up to 5 users, 3 active projects |
| Team | $12/user/mo | Unlimited projects, automations |
| Business | $24/user/mo | Approvals, dashboards, SSO |
| Enterprise | Custom | Dedicated support, custom permissions, audit logs |

---

## 3. Competitors *(feeds UC1)*

### Corkboard — the scrappy simplicity player
Positioning: "Project management that doesn't feel like homework." Beloved by small teams and agencies for being cheap ($8/user/mo flat) and fast to set up. Weaknesses: no approvals workflow, reporting is nearly nonexistent, breaks down past ~30 people on a project. Wins on price and simplicity; loses on scale.

### Fluxio — the enterprise heavyweight
Positioning: "The operating system for enterprise work." Deep customization, powerful reporting, resource/capacity planning, robust permissions. Expensive ($45+/user/mo), notoriously steep learning curve — a running joke that new hires need a two-week "Fluxio bootcamp." Wins on power and enterprise trust (SOC 2, dedicated CSMs); loses on time-to-value and cost.

### Inkwell — the flexible workspace
Positioning: "One tool for docs, wikis, and work." Infinitely flexible (databases, docs, light boards) and a cult favorite with startups. Weaknesses: not purpose-built for project management — teams build their own PM system inside it, which works great until it doesn't (30+ person teams report their Inkwell workspace becoming "a wiki nobody trusts"). Wins on flexibility and love from ICs; loses on structure and manager visibility.

**Battlecard angle Ridgeline reps actually use:** "Corkboard for structure you'll outgrow, Fluxio for power you'll never fully use, Inkwell for flexibility that becomes chaos at scale — Ridgeline is the one built to still make sense at 200 people without a bootcamp."

---

## 4. Customer feedback batch *(feeds UC4)*

A mix of reviews, support tickets, and sales-call verbatims — intentionally messy and slightly contradictory, like real feedback.

**Reviews (G2-style):**
1. ★★★★★ "Approvals alone saved our marketing team probably 5 hours a week of 'did legal see this yet' Slack pings."
2. ★★★★☆ "Clean and fast. Docked a star because there's no real mobile app — I can't approve things from my phone at a stoplight like I could in [Competitor]."
3. ★★★☆☆ "Great for 15 people. We're at 60 now and the dashboards don't give leadership what they need — we're exporting to Sheets to make real reports."
4. ★★★★★ "Switched from Inkwell because our 'project tracker' had turned into an unmaintainable wiki. Ridgeline forces just enough structure."
5. ★★☆☆☆ "Automations are powerful but the builder UI is confusing — took three tries and a support ticket to get a simple auto-assign rule working."

**Support tickets (paraphrased):**
- "Is there a way to set approval order (legal THEN brand, not both at once)? Right now it's all-or-nothing and it's causing bottlenecks." *(feature request, recurring theme)*
- "Notifications are overwhelming — I get pinged for every comment on every task I've ever touched. Need granular controls." *(recurring theme, 6 tickets in past quarter)*
- "Losing time exporting Ridgeline data into our BI tool every week. Any API or native integration coming?"
- "Love the product but our exec sponsor is asking about SOC 2 before we can go Business tier — is that on the roadmap?"

**Sales call verbatims:**
- Prospect (60-person startup, evaluating Ridgeline vs. Fluxio): "Fluxio quoted us $50/seat and a 6-week implementation. We don't have 6 weeks."
- Prospect (200-person co, evaluating Ridgeline vs. Inkwell): "Our Notion — sorry, Inkwell — workspace is basically a haunted house at this point. Nobody knows which doc is current."
- Lost deal (chose Corkboard): "Honestly we're 8 people, we don't need approvals or dashboards yet. Corkboard was half the price and did what we needed."
- Churned customer (moved to Fluxio at 400 employees): "We loved Ridgeline until we needed real resource planning across 12 teams. Grew out of it."

**Rough theme summary (for calibration, not meant to be handed to PMs directly):** Approvals is the loved, defensible differentiator → but needs more granularity (sequential approvals). Notification overload is a real churn/frustration risk. Reporting/dashboards is the ceiling that pushes growing customers toward Fluxio. Price/simplicity is why small teams choose Corkboard over Ridgeline. Inkwell customers migrate in specifically because of "workspace decay" — a strong messaging angle.

---

## 5. Past launch case study *(feeds UC2 — reference material / worked example)*

**Feature:** Approvals (launched 2 quarters ago)

**Brief (as it was written pre-launch):** Marketing and creative teams keep asking for a way to route work for sign-off without leaving Ridgeline. Ship a lightweight approval flow: assign approvers to any task, require sign-off before it can be marked done, notify on approve/reject.

**What shipped:** All-or-nothing approvals (all assigned approvers must sign off; no sequencing). Slack + email notifications.

**Results:** Fastest feature adoption in company history — 40% of Business-tier accounts used it within 30 days. Became the #1 cited reason in win/loss notes for deals closed against Corkboard and Inkwell (see feedback batch above).

**Retro notes / what was missed:** Didn't anticipate demand for sequential approval order until support tickets started stacking up post-launch (see section 4) — a scoping lesson for the next launch.

---

## 6. Upcoming launch brief *(feeds UC2 — working input material)*

This is the raw, slightly rough brief a PMM would feed into the launch-planning workflow to produce a plan/timeline/content calendar — deliberately incomplete, the way a real brief is.

**Feature:** Ridgeline AI Assist — an AI feature that drafts task summaries, flags stalled projects, and suggests next steps inside a project.

**Target launch date:** 10 weeks out.

**Why now:** Two competitors (Fluxio, Inkwell) have shipped AI features in the past two quarters; sales is fielding "do you have AI?" on ~30% of new-deal calls.

**Audience:** Existing Business/Enterprise customers first (feature gated to those tiers), secondary goal of using it as a competitive hook in active sales cycles.

**Rough messaging starting point (unpolished, meant to be workshopped):** "Ridgeline now tells you what's stuck before your team has to ask." Not final — legal wants review of any "AI" claims language before it ships.

**Known constraints:** Eng confirms feature-complete in 6 weeks, leaving ~4 weeks for GTM. No dedicated launch budget beyond existing content/social channels. CSM team wants advance notice to brief existing customers before any public announcement.

**Open questions the brief doesn't answer (intentional gaps for the PMM to resolve):** Beta/waitlist vs. straight GA? Any customer story ready in time, or does content lead with product-only messaging? How to handle the "do you have AI" sales objection in the interim 6 weeks before launch?

---

## 7. Internal tools & systems *(flavor context — feeds all 4 UCs; not a functional integration)*

Note on scope: the POC agents don't have live access to any of these tools (per section 8 of the main context doc — no external API calls, agents only reason over sandbox text or whatever the PM pastes in). This section exists purely so the sandbox *feels* like a real company's stack, and so PMs practice the same "where does this input actually come from" instinct they'd use at their real job. If a PMM later swaps in real material, this is the pattern to follow: know which system an input lives in, then paste/export from it.

**Ridgeline's internal GTM & product stack:**

| Function | Tool | What lives there |
|---|---|---|
| CRM / deal data | Salesforce | Pipeline, win/loss notes, the sales verbatims in section 4 |
| Support / ticketing | Zendesk | The support tickets in section 4 |
| Reviews | G2 | The reviews in section 4 |
| Call recording & notes | Gong | Full transcripts behind the sales call verbatims (section 4 shows the pull-quotes) |
| Internal docs / wiki | Confluence | Launch briefs (section 6), retros (section 5), positioning drafts (section 1) |
| Team chat | Slack | Where the "is 'one place' differentiated enough?" positioning debate (section 1) actually happened, in #gtm-strategy |
| Product analytics | Amplitude | Feature adoption numbers cited in section 5 (the "40% of Business-tier accounts in 30 days" stat) |
| Design | Figma | Mockups/assets referenced but not detailed in the AI Assist launch brief (section 6) |
| Project management (dogfooded) | Ridgeline itself | The launch plan a PMM builds in UC2 would, in real life, get tracked back inside Ridgeline's own boards — mildly on-the-nose, intentionally |

**How to use this while running a workflow:** when a use-case step asks "what would you gather here in real life," the answer should name a system from this table (e.g. "pull recent lost-deal reasons from Salesforce," not just "get competitive info from somewhere"). The agent still only sees whatever text the PM manually drops in — this table just trains the habit of knowing the source, same as they'd need to at a real company where tool access is often the actual bottleneck, not the analysis.
