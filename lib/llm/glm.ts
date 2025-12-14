type Message = { role: "system" | "user" | "assistant"; content: string };

type LlmResult =
  | { ok: true; value: any }
  | { ok: false; error: { code: string; message: string } };

const defaultModel = process.env.GLM_MODEL ?? "glm-4.5-flash";
const defaultBase = process.env.GLM_BASE_URL ?? "https://api.z.ai/api/paas/v4";

export async function callGLM(
  messages: Message[],
  model = defaultModel,
  options: { timeoutMs?: number } = {}
): Promise<LlmResult> {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) {
    throw new Error("ZAI_API_KEY missing");
  }

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

    const braceIndex = raw.indexOf("{");
    const bracketIndex = raw.indexOf("[");
    const candidates = [braceIndex, bracketIndex].filter((i) => i >= 0);
    const start = candidates.length ? Math.min(...candidates) : -1;
    const payloadText = start >= 0 && start < raw.length ? raw.slice(start) : raw.trim();

    try {
      const value = JSON.parse(payloadText);
      return { ok: true, value };
    } catch (err) {
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
