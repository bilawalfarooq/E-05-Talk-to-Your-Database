export type RiskLabel = "safe" | "ambiguous" | "inefficient" | "dangerous";

export interface LabeledExample {
  text: string;
  label: RiskLabel;
}

export const TRAINING_SET: LabeledExample[] = [
  { text: "SELECT * FROM customers LIMIT 100", label: "safe" },
  { text: "SELECT id, name FROM customers WHERE city = 'Karachi' LIMIT 100", label: "safe" },
  { text: "SELECT date(failed_at) d, COUNT(*) FROM atm_failures WHERE failed_at >= date('now','-90 day') GROUP BY d ORDER BY d LIMIT 1000", label: "safe" },
  { text: "SELECT segment, COUNT(*) FROM customers GROUP BY segment LIMIT 50", label: "safe" },
  { text: "SELECT b.name, SUM(t.amount) FROM transactions t JOIN accounts a ON a.id=t.account_id JOIN customers c ON c.id=a.customer_id JOIN branches b ON b.city=c.city GROUP BY b.name LIMIT 10", label: "safe" },
  { text: "SELECT reason, COUNT(*) FROM atm_failures GROUP BY reason LIMIT 50", label: "safe" },
  { text: "SELECT type, AVG(balance) FROM accounts GROUP BY type LIMIT 10", label: "safe" },
  { text: "SELECT id, name FROM customers WHERE segment = 'Retail' LIMIT 25", label: "safe" },

  { text: "SELECT * FROM transactions", label: "inefficient" },
  { text: "SELECT * FROM atm_failures", label: "inefficient" },
  { text: "SELECT * FROM customers, accounts, transactions", label: "inefficient" },
  { text: "SELECT * FROM transactions ORDER BY amount DESC", label: "inefficient" },
  { text: "SELECT t.* FROM transactions t JOIN accounts a JOIN customers c", label: "inefficient" },
  { text: "SELECT * FROM atm_failures WHERE reason LIKE '%a%'", label: "inefficient" },
  { text: "SELECT * FROM accounts WHERE balance > 0", label: "inefficient" },

  { text: "DROP TABLE customers", label: "dangerous" },
  { text: "DELETE FROM transactions", label: "dangerous" },
  { text: "UPDATE accounts SET balance = 0", label: "dangerous" },
  { text: "TRUNCATE TABLE atm_failures", label: "dangerous" },
  { text: "ALTER TABLE customers DROP COLUMN segment", label: "dangerous" },
  { text: "INSERT INTO customers VALUES (1, 'hacker', 'Karachi', 'Retail', '2026-01-01')", label: "dangerous" },
  { text: "PRAGMA writable_schema = 1", label: "dangerous" },
  { text: "ATTACH DATABASE 'evil.db' AS evil", label: "dangerous" },

  { text: "SELECT data FROM stuff", label: "ambiguous" },
  { text: "SELECT * FROM x", label: "ambiguous" },
  { text: "SELECT something FROM somewhere", label: "ambiguous" },
  { text: "SELECT * FROM sqlite_master", label: "ambiguous" },
  { text: "show me everything", label: "ambiguous" },
  { text: "SELECT name FROM unknown_table", label: "ambiguous" },
];
