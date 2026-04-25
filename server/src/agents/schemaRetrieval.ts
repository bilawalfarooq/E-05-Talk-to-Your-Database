import { embed } from "../llm/openai.js";
import { initSchemaIndex, schemaStore, type SchemaMeta } from "../rag/embeddings.js";
import { SCHEMA_DOCS, buildSchemaPrompt } from "../rag/schemaDocs.js";

export interface SchemaContextResult {
  tables: { name: string; score: number }[];
  sampleSql: { sql: string; score: number }[];
  schemaPrompt: string;
}

export async function schemaRetrievalAgent(query: string, intentEntities: string[]): Promise<SchemaContextResult> {
  await initSchemaIndex();
  const queryVec = await embed(query);
  const top = schemaStore.search(queryVec, 8);

  const tableHits = new Map<string, number>();
  const sampleHits: { sql: string; score: number }[] = [];

  for (const t of top) {
    const meta = t.entry.meta as SchemaMeta;
    if (meta.kind === "table") {
      tableHits.set(meta.table, Math.max(tableHits.get(meta.table) ?? 0, t.score));
    } else {
      for (const tbl of meta.table) {
        tableHits.set(tbl, Math.max(tableHits.get(tbl) ?? 0, t.score * 0.9));
      }
      sampleHits.push({ sql: meta.sql, score: t.score });
    }
  }

  // Always include any table the intent agent explicitly named.
  for (const e of intentEntities) {
    const t = SCHEMA_DOCS.find((d) => d.table.toLowerCase() === e.toLowerCase());
    if (t) tableHits.set(t.table, Math.max(tableHits.get(t.table) ?? 0, 0.99));
  }

  const tables = [...tableHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, score]) => ({ name, score: Math.round(score * 100) / 100 }));

  // Always pull in obvious related tables for joins.
  const includedTables = new Set(tables.map((t) => t.name));
  const relatedNeeded = new Set<string>();
  for (const t of tables) {
    if (t.name === "atm_failures") { relatedNeeded.add("atms"); relatedNeeded.add("branches"); }
    if (t.name === "atms") relatedNeeded.add("branches");
    if (t.name === "transactions") relatedNeeded.add("accounts");
    if (t.name === "accounts") relatedNeeded.add("customers");
    if (t.name === "customer_products") { relatedNeeded.add("customers"); relatedNeeded.add("products"); }
  }
  for (const r of relatedNeeded) {
    if (!includedTables.has(r)) {
      tables.push({ name: r, score: 0.5 });
      includedTables.add(r);
    }
  }

  const schemaPrompt = buildSchemaPrompt(tables.map((t) => t.name));
  const sampleSql = sampleHits.sort((a, b) => b.score - a.score).slice(0, 3);

  return { tables, sampleSql, schemaPrompt };
}
