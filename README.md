# AI Data Copilot for Banks

> A multi-agent AI analyst that turns natural-language questions into validated SQL, charts, business insights, and recommended actions — in seconds.

This is the hackathon entry for **E-05 · Talk to Your Database**. We didn't build a "text-to-SQL" tool — we built a 9-agent pipeline that thinks, validates, explains, and recommends.

## The pitch (60 seconds)

In banks, 70% of business users can't query data themselves. SQL turnaround is 2-5 days, and ~40% of engineering time is wasted on ad-hoc requests. A branch manager asking "ATM failures in the last 90 days?" waits days while customers churn.

The **AI Data Copilot** runs every question through a transparent multi-agent pipeline:

1. **Memory** — recalls prior turns for follow-ups ("break that by city")
2. **Intent** — extracts entities, metrics, filters, time range (LLM, JSON-mode)
3. **Schema RAG** — embedding-based table/sample-query retrieval
4. **SQL Generator** — LLM produces parameterised SQL (SQLite or PostgreSQL)
5. **Validator** — rule-based safety guard + ML kNN risk classifier + LLM-as-judge
6. **Executor** — read-only database with `EXPLAIN`-validated plans
7. **Visualization** — auto-picks line / bar / pie / table with a "why this chart?" reason
8. **Explanation** — turns the table into one crisp business sentence + key numbers
9. **Recommendation** — suggests one concrete action

The judges see the full SQL, every agent's confidence, the EXPLAIN plan, and the kNN nearest-neighbour reasoning — radical transparency.

## Architecture

```
React + Vite (chat + dashboard + transparency drawer)
        |  /api/query
        v
Express (Node, TypeScript)
   Orchestrator -> 9 Agents -> SQLite (local) or PostgreSQL (e.g. Neon)
                        |
                        +-- OpenAI (chat + embeddings, JSON mode)
                        +-- In-memory cosine vector store (RAG + ML classifier)
                        +-- sqlGuard (rules) + EXPLAIN (PostgreSQL) / EXPLAIN QUERY PLAN (SQLite)
```

### PostgreSQL (Neon, RDS, etc.)

If you set `DATABASE_URL` in `server/.env` (a full `postgresql://…` connection string with `sslmode=require` for hosted providers), the app **uses PostgreSQL instead of the local SQLite file**. Tables are created on first connect and the same mock data is loaded when the database is empty. Mock LLM and RAG use PostgreSQL date syntax automatically.

- **Never commit** a real connection string or push `server/.env` to git.
- **Rotate the password** in your Neon (or other) project if a URL was ever pasted into chat, logs, or a ticket.

## Run it

Prereqs: Node 18+ (this repo was tested on Node 22) and npm 9+.

```bash
# 1) install everything (workspaces)
npm install

# 2) (optional) configure OpenAI
copy server\.env.example server\.env
# edit server\.env, set OPENAI_API_KEY=sk-... and MOCK_LLM=false
# WITHOUT a key, the app uses MOCK_LLM=true and ships canned responses
# for the 6 demo questions below — the demo can never break.

# 3) start backend + frontend together
npm run dev
```

Backend listens on http://localhost:3001 and seeds the mock-bank data on first boot (SQLite file, or empty PostgreSQL). Frontend opens at http://localhost:5173 (Vite proxies `/api` to the backend).

## Demo script (rehearsed queries)

Click each chip in order — each one demonstrates a different chart type and agent capability:

1. **"ATM failures trend in the last 90 days"** → line chart, 18% spike call-out, NCR-X1 maintenance recommendation.
2. **"Top 5 branches by transaction volume this month"** → bar chart, leaderboard insight.
3. **"Distribution of ATM failure reasons in Karachi"** → pie chart, dominant-reason recommendation.
4. **"High-value transactions over 1M PKR in the last 7 days"** → table view, AML escalation alert banner.
5. **"Which customer segment opens the most savings accounts?"** → bar chart, cross-sell recommendation.
6. **(Follow-up after #1)** — type **"break that by city"** → Memory agent reuses context, returns Karachi-leading bar chart.

Open the **AI transparency** drawer below any answer to show judges:
- the generated SQL,
- the kNN classifier's nearest training examples (with cosine scores),
- the LLM judge's verdict,
- `EXPLAIN QUERY PLAN`,
- the per-agent timing trace.

Click the **Schema** button (top right) to show the full bank schema with row counts.

## Why we win

- **Multi-agent, not single-shot.** 9 transparent agents, each visible in the trace UI.
- **Real ML, not just LLM.** Embedding-based kNN classifier with confidence scoring for query risk.
- **Judge-grade transparency.** Every SQL, every score, every plan is one click away.
- **Bullet-proof demo.** `MOCK_LLM=true` ships canned responses for all rehearsed queries — the demo cannot fail on a network blip.
- **Voice + alerts + recommendations + memory** — the full "AI analyst" experience, not just a query box.

## Tech

- **Frontend:** React 18, Vite 5, Tailwind 3, Recharts, Zustand, Lucide icons.
- **Backend:** Node 22, Express, TypeScript (tsx), better-sqlite3, OpenAI SDK, Zod.
- **AI:** OpenAI `gpt-4o-mini` + `text-embedding-3-small`, in-memory cosine vector store.

## Repo layout

```
/
├── server/   # Express backend, 9 agents, SQLite mock bank
└── web/      # React chat + dashboard + transparency UI
```

## Safety

The Validator agent enforces, in order:
- `SELECT`-only (or `WITH ... SELECT`)
- single statement (no `;` chains)
- no DDL/DML keywords (`DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE`, `CREATE`, `REPLACE`, `ATTACH`, `DETACH`, `PRAGMA`, `VACUUM`, `REINDEX`, `GRANT`, `REVOKE`)
- no system tables (`sqlite_master`, `sqlite_sequence`, …)
- mandatory `LIMIT` (auto-added if missing, capped at 1000)
- runs `EXPLAIN QUERY PLAN` before execution to reject malformed SQL

In addition, the ML query classifier (kNN over OpenAI embeddings of ~30 labelled examples) and the LLM-as-judge agent each emit independent `{label, confidence}` votes. The pipeline takes the more cautious of the two.

---

Built for the E-05 hackathon. **"We didn't build a query tool — we built an AI analyst that thinks, explains, and recommends."**
