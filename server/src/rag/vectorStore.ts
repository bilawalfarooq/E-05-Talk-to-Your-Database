export interface VectorEntry<TMeta = unknown> {
  id: string;
  text: string;
  vector: number[];
  meta: TMeta;
}

export class InMemoryVectorStore<TMeta = unknown> {
  private entries: VectorEntry<TMeta>[] = [];

  add(entry: VectorEntry<TMeta>): void {
    this.entries.push(entry);
  }

  addMany(entries: VectorEntry<TMeta>[]): void {
    this.entries.push(...entries);
  }

  size(): number {
    return this.entries.length;
  }

  search(query: number[], k = 5): { entry: VectorEntry<TMeta>; score: number }[] {
    return this.entries
      .map((entry) => ({ entry, score: cosine(entry.vector, query) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  all(): VectorEntry<TMeta>[] {
    return this.entries;
  }
}

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
