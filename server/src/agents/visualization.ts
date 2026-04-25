import type { ExecutorResult } from "./executor.js";

export type ChartType = "line" | "bar" | "pie" | "table";

export interface VisualizationResult {
  type: ChartType;
  x?: string;
  y?: string;
  reason: string;
}

const DATE_RE = /^\d{4}-\d{2}(-\d{2})?(T.*)?$/;

function isLikelyDate(value: unknown): boolean {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return true;
  if (typeof value === "string") return DATE_RE.test(value);
  return false;
}

function isNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

const DISTRIBUTION_HINTS = /^(reason|category|segment|type|status|channel|model|region)$/i;
const RANKING_HINTS = /^(branch|name|city|customer|product|atm|account)$/i;
const DETAIL_HINTS = /^(id|customer|amount)$/i;

export function visualizationAgent(result: ExecutorResult): VisualizationResult {
  const { columns, rows } = result;
  if (rows.length === 0 || columns.length === 0) {
    return { type: "table", reason: "No rows returned — falling back to a table view." };
  }
  if (columns.length === 1) {
    return { type: "table", reason: "Single-column result is best shown as a table." };
  }

  const sample = rows[0];

  let numericIdx = -1;
  let labelIdx = -1;
  let dateIdx = -1;

  for (let i = 0; i < columns.length; i++) {
    const v = sample[i];
    if (isLikelyDate(v) && dateIdx === -1) dateIdx = i;
    else if (isNumber(v) && numericIdx === -1) numericIdx = i;
    else if (typeof v === "string" && labelIdx === -1 && dateIdx !== i) labelIdx = i;
  }

  // 0. Detail rows: many columns + id-like primary column + numeric "amount" → table.
  const hasIdCol = columns.some((c) => /^id$/i.test(c));
  const hasAmountCol = columns.some((c) => /amount/i.test(c));
  if (columns.length >= 4 && hasIdCol && hasAmountCol) {
    return {
      type: "table",
      reason: "Detail rows detected (id + amount + multiple descriptive columns) → table view.",
    };
  }

  // 1. Time series → line. Only when there are multiple time points AND the result is
  //    clearly an aggregation (2 columns: date + measure).
  if (dateIdx !== -1 && numericIdx !== -1 && columns.length === 2 && rows.length >= 3) {
    return {
      type: "line",
      x: columns[dateIdx],
      y: columns[numericIdx],
      reason: `Date dimension (${columns[dateIdx]}) with a numeric measure (${columns[numericIdx]}) → line chart for trends over time.`,
    };
  }

  if (labelIdx !== -1 && numericIdx !== -1) {
    const labelName = columns[labelIdx];
    const isDistribution = DISTRIBUTION_HINTS.test(labelName) && rows.length <= 8;
    const isRanking = RANKING_HINTS.test(labelName) || (!isDistribution && rows.length > 5);

    // 2. Distribution-style category (reason/segment/etc.) with few rows → pie.
    if (isDistribution && !isRanking) {
      return {
        type: "pie",
        x: labelName,
        y: columns[numericIdx],
        reason: `"${labelName}" is a distribution-style dimension with ${rows.length} categories → pie chart for share.`,
      };
    }

    // 3. Otherwise bar chart for comparison/ranking.
    return {
      type: "bar",
      x: labelName,
      y: columns[numericIdx],
      reason: `Ranking/comparison across "${labelName}" with measure "${columns[numericIdx]}" → bar chart.`,
    };
  }

  return {
    type: "table",
    reason: "Result has mixed columns with no clear single dimension+measure → table.",
  };
}

// Reference exported to silence linter for unused exports.
export const _hints = { DISTRIBUTION_HINTS, RANKING_HINTS, DETAIL_HINTS };
