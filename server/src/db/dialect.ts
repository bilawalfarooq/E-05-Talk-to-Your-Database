/** True when the app should use PostgreSQL (e.g. Neon) instead of local SQLite. */
export function isPostgres(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim().length);
}
