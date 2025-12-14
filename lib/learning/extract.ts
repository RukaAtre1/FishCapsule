import type { ConceptRef } from "@/types/learning";

const stopwords = new Set([
  "the",
  "and",
  "or",
  "of",
  "a",
  "an",
  "to",
  "in",
  "for",
  "on",
  "with",
  "is",
  "are",
  "be",
  "this",
  "that",
  "by",
  "as",
  "at",
  "from",
  "it",
  "into",
  "about",
  "you",
  "your",
  "their",
  "our",
  "we",
  "they"
]);

export function slugify(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `concept-${Math.random().toString(16).slice(2, 8)}`;
}

export function splitLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopwords.has(t));
}

export function keywordFrequency(text: string) {
  const freq = new Map<string, number>();
  tokenize(text).forEach((token) => {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  });
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([term, count]) => ({ term, count }));
}

function detectHeadings(lines: string[]) {
  return lines.filter(
    (line) =>
      /^#{1,6}\s+/.test(line) ||
      /^[A-Z0-9\s-]{6,}$/.test(line) ||
      /:\s*$/.test(line)
  );
}

function detectBullets(lines: string[]) {
  const bullets: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/);
    if (match?.[1]) {
      bullets.push(match[1].trim());
    }
  }
  return bullets;
}

function dedupeConcepts(concepts: ConceptRef[]) {
  const seen = new Set<string>();
  return concepts.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

export function extractFallbackConcepts(context: string, courseTitle?: string): ConceptRef[] {
  const lines = splitLines(context);
  const headings = detectHeadings(lines);
  const bullets = detectBullets(lines);
  const concepts: ConceptRef[] = [];

  const addConcept = (title: string, description: string) => {
    const id = slugify(title);
    concepts.push({
      id,
      title: title.trim(),
      description
    });
  };

  headings.forEach((h) => {
    const clean = h.replace(/^#+\s*/, "").replace(/:$/, "").trim();
    if (clean) {
      const idx = lines.indexOf(h);
      const neighbor = idx >= 0 && idx + 1 < lines.length ? lines[idx + 1] : "";
      addConcept(clean, neighbor ? `From syllabus: ${neighbor}` : `From syllabus: ${clean}`);
    }
  });

  bullets.forEach((b) => {
    if (!b) return;
    addConcept(b, `From bullet: ${b.slice(0, 80)}`);
  });

  if (concepts.length < 10) {
    const keywords = keywordFrequency(context).slice(0, 8);
    keywords.forEach(({ term }) => {
      const title = term.replace(/\b\w/g, (m) => m.toUpperCase());
      addConcept(title, `Derived from keywords in context mentioning "${term}".`);
    });
  }

  let unique = dedupeConcepts(concepts).slice(0, 12);
  if (unique.length === 0) {
    const base = courseTitle?.trim() || "Independent Study";
    const defaults = [
      `${base}: Core Ideas`,
      `${base}: Methods`,
      `${base}: Vocabulary`,
      `${base}: Pitfalls`,
      `${base}: Practice`
    ];
    unique = defaults.map((title) => ({
      id: slugify(title),
      title,
      description: `Generated from course context "${base}".`
    }));
  }
  return unique.slice(0, 12);
}

export function extractSnippetsAroundTerm(context: string, conceptTitle: string, windowSize = 5) {
  const lines = context.split(/\r?\n/);
  const tokens = new Set(tokenize(conceptTitle));
  const snippets: string[] = [];

  lines.forEach((line, idx) => {
    const normalized = line.toLowerCase();
    const hasTitle = conceptTitle.toLowerCase() && normalized.includes(conceptTitle.toLowerCase());
    const overlap = Array.from(tokens).some((t) => normalized.includes(t));
    if (hasTitle || overlap) {
      const start = Math.max(0, idx - windowSize);
      const end = Math.min(lines.length, idx + windowSize + 1);
      const slice = lines
        .slice(start, end)
        .map((l) => l.trim())
        .filter(Boolean)
        .join(" ");
      if (slice) snippets.push(slice);
    }
  });

  if (snippets.length === 0) {
    const dense = lines.slice(0, Math.min(lines.length, 8)).join(" ");
    if (dense) snippets.push(dense);
  }
  return snippets;
}

export function pickPrimarySnippet(context: string, conceptTitle: string) {
  const snippets = extractSnippetsAroundTerm(context, conceptTitle, 5);
  if (snippets.length === 0) return "";
  return snippets[0];
}
