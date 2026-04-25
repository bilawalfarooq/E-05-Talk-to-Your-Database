import { embed, embedMany } from "../llm/openai.js";
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
