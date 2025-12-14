export function conceptMessages(courseTitle: string | undefined, context: string) {
  const title = courseTitle?.trim() || "Study Notes";
  return [
    {
      role: "system" as const,
      content:
        "You are a concise study planner. Output ONLY valid JSON with keys {\"concepts\": [{\"id\": \"slug\", \"title\": \"string\", \"description\": \"string\"}]} with up to 12 entries. No prose, no markdown."
    },
    {
      role: "user" as const,
      content: `Course Title: ${title}\nContext:\n${context}\nReturn specific concepts with short descriptions pulled from the context.`
    }
  ];
}

export function cornellMessages(conceptId: string, conceptTitle: string, context: string) {
  return [
    {
      role: "system" as const,
      content:
        'You are a teaching-focused CornellCard generator for a programming course. Return ONLY valid JSON matching { "card": { "conceptId": string, "conceptTitle": string, "cues": string[], "notes": string[], "summary": string, "misconceptions": [{ "misconception": string, "correction": string }], "quickCheck": [{ "id": string, "type": "mcq"|"short", "prompt": string, "choices"?: string[], "answer": string, "rubric": string[], "hints": string[] }] } }. No markdown or extra text. Requirements: cues 4-6 questions; notes 6-10 items including at least 2 exam patterns, 2 common bugs, 1 mini example (<=6 lines), and 2 checklists; summary <=500 chars on mastery; misconceptions 2-4 realistic; quickCheck exactly 3 items (1 mcq with 4 choices, 1 short explanation, 1 short or mcq micro task). Every quickCheck must have rubric>=2 and hints>=2. Use only information inferred from context/title; include at least one note quoting context as: "From context: ...".'
    },
    {
      role: "user" as const,
      content: `Concept Id: ${conceptId}\nConcept Title: ${conceptTitle}\nContext:\n${context}`
    }
  ];
}
