import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY ?? "";
export const MOCK_LLM = process.env.MOCK_LLM === "true" || !apiKey || apiKey.startsWith("sk-your-key");

export const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
export const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL ?? "text-embedding-3-small";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

export interface ChatJsonOptions<T> {
  system: string;
  user: string;
  schemaHint?: string;
  fallback: T;
  temperature?: number;
}

export async function chatJson<T>(opts: ChatJsonOptions<T>): Promise<T> {
  if (MOCK_LLM) return opts.fallback;
  try {
    const completion = await getClient().chat.completions.create({
      model: MODEL,
      temperature: opts.temperature ?? 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.system + (opts.schemaHint ? `\n\nReturn JSON matching this shape: ${opts.schemaHint}` : "") },
        { role: "user", content: opts.user },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error("[llm] chatJson failed, using fallback:", (err as Error).message);
    return opts.fallback;
  }
}

export async function chatText(opts: { system: string; user: string; fallback: string; temperature?: number }): Promise<string> {
  if (MOCK_LLM) return opts.fallback;
  try {
    const completion = await getClient().chat.completions.create({
      model: MODEL,
      temperature: opts.temperature ?? 0.3,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() ?? opts.fallback;
  } catch (err) {
    console.error("[llm] chatText failed, using fallback:", (err as Error).message);
    return opts.fallback;
  }
}

export async function embed(text: string): Promise<number[]> {
  if (MOCK_LLM) return mockEmbed(text);
  try {
    const res = await getClient().embeddings.create({ model: EMBED_MODEL, input: text });
    return res.data[0]!.embedding;
  } catch (err) {
    console.error("[llm] embed failed, using mock:", (err as Error).message);
    return mockEmbed(text);
  }
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  if (MOCK_LLM) return texts.map(mockEmbed);
  try {
    const res = await getClient().embeddings.create({ model: EMBED_MODEL, input: texts });
    return res.data.map((d) => d.embedding);
  } catch (err) {
    console.error("[llm] embedMany failed, using mock:", (err as Error).message);
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
