// Agent scaffolds: reusable system prompts / templates that seed a new agent
// (e.g. battlecard writer, content-calendar planner, positioning generator).
// Add one scaffold per agent type and register it here.

export type Scaffold = {
  id: string;
  name: string;
  description: string;
  system: string;
};

export const scaffolds: Scaffold[] = [];
