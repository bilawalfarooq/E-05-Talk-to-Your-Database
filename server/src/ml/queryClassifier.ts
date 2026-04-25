import { embed, embedMany, MOCK_LLM } from "../llm/openai.js";
import { cosine, InMemoryVectorStore } from "../rag/vectorStore.js";
import { TRAINING_SET, type RiskLabel } from "./trainingSet.js";

interface ClassifierMeta {
  label: RiskLabel;
}

const store = new InMemoryVectorStore<ClassifierMeta>();
let initialized = false;
let initPromise: Promise<void> | null = null;

export async function initClassifier(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const texts = TRAINING_SET.map((e) => e.text);
    const vectors = await embedMany(texts);
    TRAINING_SET.forEach((e, i) => {
      store.add({ id: `tr:${i}`, text: e.text, vector: vectors[i], meta: { label: e.label } });
    });
    initialized = true;
    console.log(`[ml] Query classifier ready (${store.size()} examples).`);
  })();
  return initPromise;
}

export interface ClassifyResult {
  label: RiskLabel;
  confidence: number;
  neighbors: { text: string; label: RiskLabel; score: number }[];
}

// Deterministic surrogate for mock mode where OpenAI embeddings are not available.
// Mock embeddings (bag-of-chars) cannot reliably separate well-formed SQL from inefficient SQL,
// so we apply a small rule-set that reflects what the kNN classifier WOULD learn given real embeddings.
function deterministicLabel(sql: string): RiskLabel {
  const s = sql.trim();
  const upper = s.toUpperCase();
  if (/\b(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|REPLACE|ATTACH|PRAGMA|VACUUM|GRANT|REVOKE)\b/.test(upper)) return "dangerous";
  if (/\bSELECT\s+\*/i.test(s) && !/\bLIMIT\s+\d+/i.test(upper)) return "inefficient";
  if (/\bSELECT\s+\*/i.test(s)) return "inefficient";
  if (!/\bSELECT\b/.test(upper)) return "ambiguous";
  return "safe";
}

export async function classifyQuery(sql: string, k = 5): Promise<ClassifyResult> {
  await initClassifier();
  const queryVec = await embed(sql);
  const neighbors = store.all()
    .map((entry) => ({
      text: entry.text,
      label: entry.meta.label,
      score: cosine(entry.vector, queryVec),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  if (MOCK_LLM) {
    // Use deterministic rules for the verdict but keep the neighbours from the kNN search
    // so the transparency UI still shows a meaningful ML view.
    const detLabel = deterministicLabel(sql);
    return {
      label: detLabel,
      confidence: detLabel === "safe" ? 0.95 : detLabel === "dangerous" ? 0.99 : 0.7,
      neighbors,
    };
  }

  const weights: Record<RiskLabel, number> = { safe: 0, ambiguous: 0, inefficient: 0, dangerous: 0 };
  for (const n of neighbors) weights[n.label] += Math.max(0, n.score);
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;

  let bestLabel: RiskLabel = "safe";
  let bestWeight = -1;
  (Object.keys(weights) as RiskLabel[]).forEach((label) => {
    if (weights[label] > bestWeight) {
      bestWeight = weights[label];
      bestLabel = label;
    }
  });

  return {
    label: bestLabel,
    confidence: Math.round((bestWeight / totalWeight) * 100) / 100,
    neighbors,
  };
}
