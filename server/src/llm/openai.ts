import { isPostgres } from "../db/dialect.js";

const apiKey = process.env.OPENAI_API_KEY ?? "";
export const MOCK_LLM = process.env.MOCK_LLM === "true" || !apiKey || apiKey.startsWith("sk-your-key");

const rawModel = process.env.OPENAI_MODEL ?? "gemini-1.5-flash";
export const MODEL = rawModel;
const isGemini = MODEL.includes("gemini-");
export const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL ?? (isGemini ? "text-embedding-004" : "text-embedding-3-small");

export interface ChatJsonOptions<T> {
  system: string;
  user: string;
  schemaHint?: string;
  fallback: T;
  temperature?: number;
}

/** 
 * Calls Gemini REST API natively for maximum compatibility and free tier access.
 */
async function callGeminiRest(method: string, body: any): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:${method}?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${text}`);
  }
  return res.json();
}

export async function chatJson<T>(opts: ChatJsonOptions<T>): Promise<T> {
  if (MOCK_LLM) return opts.fallback;
  if (!isGemini) {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });
    try {
      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: opts.temperature ?? 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: opts.system + (opts.schemaHint ? `\n\nReturn JSON matching this shape: ${opts.schemaHint}` : "") },
          { role: "user", content: opts.user },
        ],
      });
      return JSON.parse(completion.choices[0]?.message?.content ?? "{}") as T;
    } catch (err) {
      console.error("[llm] OpenAI chatJson failed:", (err as Error).message);
      return opts.fallback;
    }
  }

  try {
    const prompt = `${opts.system}\n\n${opts.user}\n\nSTRICT: Return ONLY a valid JSON object matching this schema: ${opts.schemaHint ?? "JSON"}. No extra text or markdown.`;
    const data = await callGeminiRest("generateContent", {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.1,
      },
    });
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const cleaned = raw.replace(/```json\s?|```/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error("[llm] Gemini chatJson failed:", (err as Error).message);
    return opts.fallback;
  }
}

export async function chatText(opts: { system: string; user: string; fallback: string; temperature?: number }): Promise<string> {
  if (MOCK_LLM) return opts.fallback;
  if (!isGemini) {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });
    try {
      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: opts.temperature ?? 0.3,
        messages: [{ role: "system", content: opts.system }, { role: "user", content: opts.user }],
      });
      return completion.choices[0]?.message?.content?.trim() ?? opts.fallback;
    } catch (err) {
      return opts.fallback;
    }
  }

  try {
    const prompt = `${opts.system}\n\n${opts.user}`;
    const data = await callGeminiRest("generateContent", {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: opts.temperature ?? 0.3 },
    });
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? opts.fallback;
  } catch (err) {
    return opts.fallback;
  }
}

export async function embed(text: string): Promise<number[]> {
  const isGemini = MODEL.includes("gemini-");
  if (MOCK_LLM || isGemini) return mockEmbed(text);
  
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  try {
    const res = await client.embeddings.create({ model: EMBED_MODEL, input: text });
    return res.data[0]!.embedding;
  } catch (err) {
    return mockEmbed(text);
  }
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  const isGemini = MODEL.includes("gemini-");
  if (MOCK_LLM || isGemini) return texts.map(mockEmbed);

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  try {
    const res = await client.embeddings.create({ model: EMBED_MODEL, input: texts });
    return res.data.map((d) => d.embedding);
  } catch (err) {
    return texts.map(mockEmbed);
  }
}

const MOCK_EMBED_DIM = 128;
function mockEmbed(text: string): number[] {
  const v = new Array<number>(MOCK_EMBED_DIM).fill(0);
  const lower = text.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const c = lower.charCodeAt(i);
    v[c % MOCK_EMBED_DIM] += 1;
    v[(c * 7 + i) % MOCK_EMBED_DIM] += 0.5;
  }
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum) || 1;
  return v.map((x) => x / norm);
}
