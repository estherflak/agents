import type { UseCase } from "@/lib/types";

// Use-case scaffolds: each seeds a new workflow with an ordered set of steps.
// Steps ship EMPTY (the PMM writes the real instructions) — `exampleInstructions`
// is the optional "see an example" worked version they can peek at for guidance.

export type ScaffoldStep = {
  title: string;
  instructions: string; // empty default — the PMM fills this in
  exampleInstructions: string; // worked example, revealed on demand
};

export type Scaffold = {
  id: UseCase;
  title: string;
  use_case: UseCase;
  steps: ScaffoldStep[];
};

export const scaffolds: Scaffold[] = [
  {
    id: "competitive_intel",
    title: "Competitive Intel & Battlecard",
    use_case: "competitive_intel",
    steps: [
      {
        title: "Research competitor",
        instructions: "",
        exampleInstructions:
          "Read the source material on the competitor and pull out the facts a battlecard needs: positioning/tagline, target customer, pricing, standout strengths, and known weaknesses. Don't compare to Ridgeline yet — build an accurate, unbiased profile. Quote specifics (prices, feature names) rather than generalizing, and flag anything the source doesn't tell you.",
      },
      {
        title: "Compare vs. Ridgeline",
        instructions: "",
        exampleInstructions:
          "Using the competitor profile from the previous step, build a head-to-head comparison with Ridgeline. For each dimension (price, setup time, approvals, reporting, scale, integrations) say who wins and why in one line. Be honest where Ridgeline is weaker — a battlecard reps don't trust is useless.",
      },
      {
        title: "Draft battlecard",
        instructions: "",
        exampleInstructions:
          "Turn the comparison into a one-page card a rep can skim mid-call: a one-line 'how we win' summary, 3 'when we win' scenarios, 3 likely objections with responses, and 2 trap-setting questions to ask the prospect. Keep it punchy and specific — no filler.",
      },
    ],
  },
  {
    id: "launch_planning",
    title: "Launch/Campaign Plan",
    use_case: "launch_planning",
    steps: [
      {
        title: "Digest the brief",
        instructions: "",
        exampleInstructions:
          "Read the launch brief and restate it crisply: what's shipping, the target date, the audience, why now, and the constraints. Then list the open questions the brief doesn't answer — the things you'd need to lock down before planning. Don't invent answers; surface the gaps.",
      },
      {
        title: "Build plan & timeline",
        instructions: "",
        exampleInstructions:
          "Working backwards from the launch date, build a week-by-week GTM timeline. Include the key workstreams (messaging, content, enablement, CSM briefing, launch day), call out dependencies (e.g. legal review of any 'AI' claims), and name an owner for each. Flag any timing risk given the stated constraints.",
      },
      {
        title: "Draft content calendar",
        instructions: "",
        exampleInstructions:
          "From the plan, draft a concrete content calendar for the launch window: for each piece give the channel, asset, angle, and target date. Stay within the stated channels and budget, lead with the angle the audience actually cares about, and note which assets depend on earlier ones.",
      },
    ],
  },
  {
    id: "messaging",
    title: "Messaging & Positioning",
    use_case: "messaging",
    steps: [
      {
        title: "Extract the inputs",
        instructions: "",
        exampleInstructions:
          "Read the source material and pull out the raw ingredients for positioning: who it's for, the top jobs-to-be-done, the differentiators customers actually mention, competitor claims to avoid echoing, and any proof points (stats, quotes). Separate what's evidenced from what's assumed.",
      },
      {
        title: "Draft value props & pillars",
        instructions: "",
        exampleInstructions:
          "Using the extracted inputs, draft 3 messaging pillars. For each: a short headline, one supporting sentence, and one proof point from the source. Aim the language at the target customer and steer clear of claims three competitors already make (e.g. 'one place', 'seamless').",
      },
      {
        title: "Refine & pressure-test",
        instructions: "",
        exampleInstructions:
          "Pressure-test the pillars from the previous step. For each, ask: is it differentiated, believable, and provable? Rewrite any a skeptical prospect wouldn't buy, and note what evidence would strengthen the weak ones. End with the single sharpest one-line positioning statement.",
      },
    ],
  },
  {
    id: "research_synthesis",
    title: "Customer Research Synthesis",
    use_case: "research_synthesis",
    steps: [
      {
        title: "Cluster the feedback",
        instructions: "",
        exampleInstructions:
          "Read the raw feedback (reviews, tickets, call notes) and group it into themes. For each theme: give it a clear name, note how many mentions support it, and quote 1–2 representative verbatims. Keep loved and painful themes separate. Don't editorialize yet — just cluster.",
      },
      {
        title: "Rank themes by impact",
        instructions: "",
        exampleInstructions:
          "Using the clusters, rank the themes by business impact. For each, weigh how often it comes up against how much it affects retention, deals, or expansion. Mark which are strengths to lean into vs. risks to fix, and justify each ranking in a line.",
      },
      {
        title: "Summarize insights",
        instructions: "",
        exampleInstructions:
          "Turn the ranked themes into an insights summary a PM could act on: the top 3 takeaways, what each implies for the roadmap, and one recommended next step per takeaway. Cite the evidence (theme + a quote) behind each so it's defensible.",
      },
    ],
  },
];
