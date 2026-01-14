import { env, validateEnv } from "@/lib/env";

type Message = { role: "system" | "user" | "assistant"; content: string };

type LlmResult =
  | { ok: true; value: any }
  | { ok: false; error: { code: string; message: string } };

const defaultModel = env.GLM_MODEL;
const defaultBase = env.GLM_BASE_URL;

/**
 * Extract JSON from a string that may have extra text before/after
 */
function extractJSON(raw: string): string | null {
  // Find the first { or [
  const braceIndex = raw.indexOf("{");
  const bracketIndex = raw.indexOf("[");

  if (braceIndex < 0 && bracketIndex < 0) return null;

  // Determine which comes first
  let start: number;
  let openChar: string;
  let closeChar: string;

  if (braceIndex >= 0 && (bracketIndex < 0 || braceIndex < bracketIndex)) {
    start = braceIndex;
    openChar = "{";
    closeChar = "}";
  } else {
    start = bracketIndex;
    openChar = "[";
    closeChar = "]";
  }

  // Find matching closing bracket
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < raw.length; i++) {
    const char = raw[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === "\\") {
      escape = true;
      continue;
    }

    if (char === '"' && !escape) {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === openChar) {
      depth++;
    } else if (char === closeChar) {
      depth--;
      if (depth === 0) {
        return raw.slice(start, i + 1);
      }
    }
  }

  // If we didn't find a match, return from start to end
  return raw.slice(start);
}

export async function callGLM(
  messages: Message[],
  model = defaultModel,
  options: { timeoutMs?: number } = {}
): Promise<LlmResult> {
  // Validate env before proceeding
  try {
    validateEnv();
  } catch (err: any) {
    return { ok: false, error: { code: "MISSING_ENV", message: err.message } };
  }

  const apiKey = env.ZAI_API_KEY;

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 12000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${defaultBase}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: { code: "http_error", message: `HTTP ${res.status}: ${text}` } };
    }

    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content as string | undefined;
    if (!raw || typeof raw !== "string") {
      return { ok: false, error: { code: "empty_response", message: "No content from GLM." } };
    }

    // Extract JSON, handling extra text before/after
    const jsonText = extractJSON(raw);
    if (!jsonText) {
      return { ok: false, error: { code: "no_json", message: "No JSON found in response" } };
    }

    try {
      const value = JSON.parse(jsonText);
      return { ok: true, value };
    } catch (err) {
      // Log the raw content for debugging
      console.error("JSON parse error. Raw content:", raw.slice(0, 500));
      return {
        ok: false,
        error: { code: "parse_error", message: `Failed to parse GLM JSON: ${(err as Error).message}` }
      };
    }
  } catch (err) {
    clearTimeout(timeout);
    const message = (err as Error).message;
    if ((err as Error).name === "AbortError") {
      return { ok: false, error: { code: "timeout", message: `GLM request timed out (${timeoutMs}ms)` } };
    }
    return { ok: false, error: { code: "network_error", message } };
  }
}
