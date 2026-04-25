export interface SchemaDoc {
  table: string;
  description: string;
  columns: { name: string; type: string; description: string }[];
  relationships: string[];
  sampleQuestions: string[];
}

export const SCHEMA_DOCS: SchemaDoc[] = [
  {
    table: "branches",
    description: "Bank branch locations across Pakistan. Each branch belongs to a city and region.",
    columns: [
      { name: "id", type: "INTEGER", description: "Primary key" },
      { name: "name", type: "TEXT", description: "Branch display name, e.g. 'Karachi Branch 1'" },
      { name: "city", type: "TEXT", description: "City: Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar" },
      { name: "region", type: "TEXT", description: "Region: Sindh, Punjab, Capital, KPK" },
      { name: "opened_at", type: "TEXT", description: "ISO date the branch opened" },
    ],
    relationships: ["atms.branch_id -> branches.id"],
    sampleQuestions: ["List all branches in Karachi", "How many branches per region?"],
  },
  {
    table: "atms",
    description: "ATM machines installed across branches. Models include NCR-X1, NCR-X2, Diebold-S2, Wincor-P3, GRG-H22.",
    columns: [
      { name: "id", type: "INTEGER", description: "Primary key" },
      { name: "branch_id", type: "INTEGER", description: "FK -> branches.id" },
      { name: "model", type: "TEXT", description: "ATM model" },
      { name: "installed_at", type: "TEXT", description: "ISO date the ATM was installed" },
    ],
    relationships: ["atms.branch_id -> branches.id", "atm_failures.atm_id -> atms.id"],
    sampleQuestions: ["How many ATMs per model?", "List ATMs in Lahore"],
  },
  {
    table: "atm_failures",
    description: "Records of ATM failures with reason and time-to-resolve. Reasons: Cash Out, Network, Hardware, Software, Power.",
    columns: [
      { name: "id", type: "INTEGER", description: "Primary key" },
      { name: "atm_id", type: "INTEGER", description: "FK -> atms.id" },
      { name: "failed_at", type: "TEXT", description: "ISO timestamp of failure" },
      { name: "reason", type: "TEXT", description: "Failure reason" },
      { name: "resolution_minutes", type: "INTEGER", description: "Minutes until resolved" },
    ],
    relationships: ["atm_failures.atm_id -> atms.id (atms.branch_id -> branches.id for city)"],
    sampleQuestions: [
      "ATM failures trend in last 90 days",
      "Distribution of ATM failure reasons in Karachi",
      "Top failing ATM models",
      "Average resolution time by city",
    ],
  },
  {
    table: "customers",
    description: "Bank customers segmented as Retail, Premier, SME, Corporate. Each has a city.",
    columns: [
      { name: "id", type: "INTEGER", description: "Primary key" },
      { name: "name", type: "TEXT", description: "Customer full name" },
      { name: "city", type: "TEXT", description: "Customer city" },
      { name: "segment", type: "TEXT", description: "Retail | Premier | SME | Corporate" },
      { name: "opened_at", type: "TEXT", description: "ISO date account opened" },
    ],
    relationships: ["accounts.customer_id -> customers.id", "customer_products.customer_id -> customers.id"],
    sampleQuestions: ["Customer count by segment", "Customers in Lahore by segment"],
  },
  {
    table: "accounts",
    description: "Customer accounts. Types: Savings, Current, Term Deposit, Loan.",
    columns: [
      { name: "id", type: "INTEGER", description: "Primary key" },
      { name: "customer_id", type: "INTEGER", description: "FK -> customers.id" },
      { name: "type", type: "TEXT", description: "Savings | Current | Term Deposit | Loan" },
      { name: "balance", type: "REAL", description: "Current balance in PKR" },
      { name: "opened_at", type: "TEXT", description: "ISO date account opened" },
    ],
    relationships: ["accounts.customer_id -> customers.id", "transactions.account_id -> accounts.id"],
    sampleQuestions: [
      "Which customer segment opens the most savings accounts?",
      "Total balance by account type",
    ],
  },
  {
    table: "transactions",
    description: "Money movements on accounts. Channels: ATM, Branch, Online, Mobile. Status: Success, Failed, Pending.",
    columns: [
      { name: "id", type: "INTEGER", description: "Primary key" },
      { name: "account_id", type: "INTEGER", description: "FK -> accounts.id" },
      { name: "amount", type: "REAL", description: "Transaction amount in PKR" },
      { name: "type", type: "TEXT", description: "Debit | Credit" },
      { name: "channel", type: "TEXT", description: "ATM | Branch | Online | Mobile" },
      { name: "occurred_at", type: "TEXT", description: "ISO timestamp" },
      { name: "status", type: "TEXT", description: "Success | Failed | Pending" },
    ],
    relationships: ["transactions.account_id -> accounts.id"],
    sampleQuestions: [
      "Top 5 branches by transaction volume this month",
      "High-value transactions over 1M PKR in last 7 days",
      "Failed transaction count by channel",
    ],
  },
  {
    table: "products",
    description: "Bank products: cards, loans, insurance, investments.",
    columns: [
      { name: "id", type: "INTEGER", description: "Primary key" },
      { name: "name", type: "TEXT", description: "Product name" },
      { name: "category", type: "TEXT", description: "Card | Loan | Insurance | Investment" },
    ],
    relationships: ["customer_products.product_id -> products.id"],
    sampleQuestions: ["Most popular product categories"],
  },
  {
    table: "customer_products",
    description: "Junction table linking customers to the products they have purchased.",
    columns: [
      { name: "customer_id", type: "INTEGER", description: "FK -> customers.id" },
      { name: "product_id", type: "INTEGER", description: "FK -> products.id" },
      { name: "opened_at", type: "TEXT", description: "ISO date product was opened" },
    ],
    relationships: ["customer_products.customer_id -> customers.id", "customer_products.product_id -> products.id"],
    sampleQuestions: ["Top products by adoption"],
  },
];

export function buildSchemaPrompt(tables?: string[]): string {
  const docs = tables ? SCHEMA_DOCS.filter((d) => tables.includes(d.table)) : SCHEMA_DOCS;
  return docs
    .map((d) => {
      const cols = d.columns.map((c) => `  ${c.name} ${c.type} -- ${c.description}`).join("\n");
      const rels = d.relationships.length ? `Relationships:\n  ${d.relationships.join("\n  ")}` : "";
      return `TABLE ${d.table} -- ${d.description}\n${cols}\n${rels}`;
    })
    .join("\n\n");
}

export function fullSchemaDdl(): string {
  return buildSchemaPrompt();
}
