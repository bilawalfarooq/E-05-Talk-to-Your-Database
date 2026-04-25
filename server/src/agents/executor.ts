import { runQuery } from "../db/query.js";

export interface ExecutorResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  durationMs: number;
}

export async function executorAgent(sql: string): Promise<ExecutorResult> {
  return runQuery(sql);
}