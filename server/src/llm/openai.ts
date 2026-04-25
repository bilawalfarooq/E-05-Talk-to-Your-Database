/** Prefer Google AI key for Gemini; OpenAI key for OpenAI models; Groq key for Groq models. */
const geminiApiKey = (process.env.GEMINI_API_KEY ?? "").trim();
const openaiApiKey = (process.env.OPENAI_API_KEY ?? "").trim();
const groqApiKey = (process.env.GROQ_API_KEY ?? "").trim();

const apiKey = geminiApiKey || openaiApiKey || groqApiKey;

function isPlaceholderKey(key: string): boolean {
  if (!key) return true;
  const lower = key.toLowerCase();
  return (
    lower.startsWith("sk-your-key") ||
    lower === "sk-your-key-here" ||
    lower.includes("your-key-here") ||
    lower.startsWith("sk-placeholder") ||
    key === "AIzaSy-your-key-here"
  );
}

export const MOCK_LLM = process.env.MOCK_LLM === "true" || isPlaceholderKey(apiKey);

const rawModel = process.env.OPENAI_MODEL ?? "gemini-2.0-flash";
export const MODEL = rawModel;

export function isGeminiModel(): boolean {
  return MODEL.toLowerCase().includes("gemini");
}

export function isGroqModel(): boolean {
  const m = MODEL.toLowerCase();
  return (
    m.includes("llama") ||
    m.includes("mixtral") ||
    m.includes("gemma") ||
    m.includes("groq") ||
    (!!groqApiKey && !isGeminiModel())
  );
}

export function llmProvider(): "gemini" | "openai" | "groq" {
  if (isGeminiModel()) return "gemini";
  if (isGroqModel()) return "groq";
  return "openai";
}

/** Embedding model id: OpenAI name or Gemini embedding model name. */
/** For Gemini (Google AI), use a model that supports embedContent on v1beta (e.g. gemini-embedding-001). */
export const EMBED_MODEL =
  process.env.OPENAI_EMBED_MODEL ?? (isGeminiModel() ? "gemini-embedding-001" : "text-embedding-3-small");

export function mockLlmReasons(): string[] {
  const reasons: string[] = [];
  if (process.env.MOCK_LLM === "true") reasons.push("MOCK_LLM=true");
  if (!apiKey) reasons.push("missing GEMINI_API_KEY / OPENAI_API_KEY / GROQ_API_KEY");
  else if (isPlaceholderKey(apiKey)) reasons.push("API key looks like a placeholder");
  return reasons;
}

/** RAG / classifier vectors: live only when not mock LLM and we call a real embedding API. */
export function embeddingsMode(): "live" | "mock" {
  if (MOCK_LLM) return "mock";
  if (isGeminiModel()) return "live";
  return "live";
}

export interface ChatJsonOptions<T> {
  system: string;
  user: string;
  schemaHint?: string;
  fallback: T;
  temperature?: number;
}

function geminiModelPath(): string {
  const m = MODEL.startsWith("models/") ? MODEL.slice("models/".length) : MODEL;
  return m;
}

async function getOpenAIClient() {
  const { default: OpenAI } = await import("openai");
  const provider = llmProvider();
  if (provider === "groq") {
    return new OpenAI({
      apiKey: groqApiKey || apiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return new OpenAI({ apiKey: openaiApiKey || apiKey });
}

/**
 * Calls Gemini REST API natively for maximum compatibility and free tier access.
 */
async function callGeminiRest(method: string, body: unknown): Promise<unknown> {
  const path = `models/${geminiModelPath()}:${method}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/${path}?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${text.slice(0, 500)}`);
  }
  return res.json();
}

function geminiEmbedModelId(): string {
  return EMBED_MODEL.replace(/^models\//, "");
}

async function callGeminiEmbeddingRest(method: "embedContent" | "batchEmbedContents", body: unknown, overrideModelId?: string): Promise<unknown> {
  const modelId = overrideModelId ?? geminiEmbedModelId();
  const path = `models/${modelId}:${method}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/${path}?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini Embedding API error (${res.status}): ${text.slice(0, 500)}`);
  }
  return res.json();
}

const geminiEmbedModelResource = (): string =>
  EMBED_MODEL.startsWith("models/") ? EMBED_MODEL : `models/${EMBED_MODEL}`;

async function geminiEmbedOne(text: string): Promise<number[]> {
  const data = (await callGeminiEmbeddingRest("embedContent", {
    model: geminiEmbedModelResource(),
    content: { parts: [{ text }] },
  })) as { embedding?: { values?: number[] } };
  const values = data.embedding?.values;
  if (!values?.length) throw new Error("Gemini embedContent returned no embedding.values");
  return values;
}

const GEMINI_BATCH_SIZE = 32;

async function geminiEmbedMany(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  try {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += GEMINI_BATCH_SIZE) {
      const chunk = texts.slice(i, i + GEMINI_BATCH_SIZE);
      const data = (await callGeminiEmbeddingRest("batchEmbedContents", {
        requests: chunk.map((text) => ({
          model: geminiEmbedModelResource(),
          content: { parts: [{ text }] },
        })),
      })) as { embeddings?: { values?: number[] }[] };
      const embeddings = data.embeddings;
      if (!embeddings || embeddings.length !== chunk.length) {
        throw new Error("Gemini batchEmbedContents size mismatch");
      }
      for (const e of embeddings) {
        const values = e.values;
        if (!values?.length) throw new Error("Gemini batch embedding missing values");
        out.push(values);
      }
    }
    return out;
  } catch (err) {
    console.warn("[llm] Gemini batchEmbedContents failed, using sequential embedContent:", (err as Error).message);
    return Promise.all(texts.map((t) => geminiEmbedOne(t)));
  }
}

export async function chatJson<T>(opts: ChatJsonOptions<T>): Promise<T> {
  if (MOCK_LLM) return opts.fallback;
  if (!isGeminiModel()) {
    try {
      const client = await getOpenAIClient();
      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: opts.temperature ?? 0.1,
        response_format: llmProvider() === "groq" ? undefined : { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              opts.system +
              (opts.schemaHint ? `\n\nReturn JSON matching this shape: ${opts.schemaHint}` : "") +
              (llmProvider() === "groq" ? "\n\nSTRICT: Return ONLY valid JSON. No markdown." : ""),
          },
          { role: "user", content: opts.user },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? "{}";
      const cleaned = raw.replace(/```json\s?|```/g, "").trim();
      return JSON.parse(cleaned) as T;
    } catch (err) {
      console.error(`[llm] ${llmProvider()} chatJson failed:`, (err as Error).message);
      console.warn(
        `[llm] Returning fallback JSON — pipeline may produce weak SQL. Check keys and model name (${MODEL}).`
      );
      return opts.fallback;
    }
  }

  try {
    const prompt = `${opts.system}\n\n${opts.user}\n\nSTRICT: Return ONLY a valid JSON object matching this schema: ${opts.schemaHint ?? "JSON"}. No extra text or markdown.`;
    const data = (await callGeminiRest("generateContent", {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.1,
      },
    })) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const cleaned = raw.replace(/```json\s?|```/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error("[llm] Gemini chatJson failed:", (err as Error).message);
    console.warn("[llm] Returning fallback JSON — check GEMINI_API_KEY / OPENAI_API_KEY and OPENAI_MODEL (Gemini id).");
    return opts.fallback;
  }
}

export async function chatText(opts: {
  system: string;
  user: string;
  fallback: string;
  temperature?: number;
}): Promise<string> {
  if (MOCK_LLM) return opts.fallback;
  if (!isGeminiModel()) {
    try {
      const client = await getOpenAIClient();
      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: opts.temperature ?? 0.3,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
      });
      return completion.choices[0]?.message?.content?.trim() ?? opts.fallback;
    } catch (err) {
      console.error(`[llm] ${llmProvider()} chatText failed:`, (err as Error).message);
      return opts.fallback;
    }
  }

  try {
    const prompt = `${opts.system}\n\n${opts.user}`;
    const data = (await callGeminiRest("generateContent", {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: opts.temperature ?? 0.3 },
    })) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? opts.fallback;
  } catch (err) {
    console.error("[llm] Gemini chatText failed:", (err as Error).message);
    return opts.fallback;
  }
}

export async function embed(text: string): Promise<number[]> {
  if (MOCK_LLM) return mockEmbed(text);
  
  if (geminiApiKey) {
    try {
      const backupModel = EMBED_MODEL.includes("embedding-3") ? "text-embedding-004" : EMBED_MODEL;
      const parsedModel = backupModel.replace(/^models\//, "");
      const data = (await callGeminiEmbeddingRest("embedContent", {
        model: `models/${parsedModel}`,
        content: { parts: [{ text }] },
      }, parsedModel)) as { embedding?: { values?: number[] } };
      if (data.embedding?.values?.length) return data.embedding.values;
    } catch (err) {
      console.error("[llm] Gemini embed failed:", (err as Error).message);
    }
  }

  if (openaiApiKey) {
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: openaiApiKey });
      const res = await client.embeddings.create({ model: EMBED_MODEL, input: text });
      return res.data[0]!.embedding;
    } catch (err) {
      console.error(`[llm] OpenAI embed failed:`, (err as Error).message);
    }
  }
  
  return mockEmbed(text);
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  if (MOCK_LLM || texts.length === 0) return texts.map(mockEmbed);
  
  if (geminiApiKey) {
    try {
      const backupModel = EMBED_MODEL.includes("embedding-3") ? "text-embedding-004" : EMBED_MODEL;
      const parsedModel = backupModel.replace(/^models\//, "");
      const out: number[][] = [];
      for (let i = 0; i < texts.length; i += GEMINI_BATCH_SIZE) {
        const chunk = texts.slice(i, i + GEMINI_BATCH_SIZE);
        const data = (await callGeminiEmbeddingRest("batchEmbedContents", {
          requests: chunk.map((text) => ({
            model: `models/${parsedModel}`,
            content: { parts: [{ text }] },
          })),
        }, parsedModel)) as { embeddings?: { values?: number[] }[] };
        
        if (data.embeddings && data.embeddings.length === chunk.length) {
           out.push(...data.embeddings.map(e => e.values ?? mockEmbed("")));
        } else {
           throw new Error("Batch mismatch");
        }
      }
      return out;
    } catch (err) {
      console.error("[llm] Gemini embedMany failed:", (err as Error).message);
    }
  }

  if (openaiApiKey) {
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: openaiApiKey });
      const res = await client.embeddings.create({ model: EMBED_MODEL, input: texts });
      return res.data.map((d) => d.embedding);
    } catch (err) {
      console.error(`[llm] OpenAI embedMany failed:`, (err as Error).message);
    }
  }
  
  return texts.map(mockEmbed);
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
