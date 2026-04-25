import { embedMany } from "../llm/openai.js";
import { InMemoryVectorStore } from "./vectorStore.js";
import { SCHEMA_DOCS } from "./schemaDocs.js";
import { SAMPLE_QUERIES } from "./sampleQueries.js";

export type SchemaMeta =
  | { kind: "table"; table: string; sampleQuestions: string[] }
  | { kind: "sample"; table: string[]; sql: string };

export const schemaStore = new InMemoryVectorStore<SchemaMeta>();

let initialized = false;
let initPromise: Promise<void> | null = null;

export async function initSchemaIndex(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const tableTexts = SCHEMA_DOCS.map((d) => {
      const cols = d.columns.map((c) => `${c.name} (${c.type}): ${c.description}`).join("; ");
      const samples = d.sampleQuestions.join(" | ");
      return `Table ${d.table}: ${d.description}. Columns: ${cols}. Sample questions: ${samples}`;
    });
    const sampleTexts = SAMPLE_QUERIES.map((s) => `Question: ${s.question}. Tables: ${s.tables.join(", ")}.`);

    const allTexts = [...tableTexts, ...sampleTexts];
    const vectors = await embedMany(allTexts);

    SCHEMA_DOCS.forEach((d, i) => {
      schemaStore.add({
        id: `table:${d.table}`,
        text: tableTexts[i],
        vector: vectors[i],
        meta: { kind: "table", table: d.table, sampleQuestions: d.sampleQuestions },
      });
    });
    SAMPLE_QUERIES.forEach((s, i) => {
      schemaStore.add({
        id: `sample:${i}`,
        text: sampleTexts[i],
        vector: vectors[SCHEMA_DOCS.length + i],
        meta: { kind: "sample", table: s.tables, sql: s.sql },
      });
    });

    initialized = true;
    console.log(`[rag] Schema index ready (${schemaStore.size()} entries).`);
  })();
  return initPromise;
}
