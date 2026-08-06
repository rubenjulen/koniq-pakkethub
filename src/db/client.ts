import "server-only";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import { seedDatabase } from "./seed";
import { SCHEMA_SQL } from "./schema-sql";

/**
 * Dual database driver:
 *  - Productie: echte Postgres/Supabase via process.env.DATABASE_URL (postgres.js).
 *  - Lokaal/demo: ingebedde PGlite (buiten OneDrive), geen setup nodig.
 * Beide gebruiken dezelfde parameterized SQL ($1, $2, ...).
 * Zet SEED_ON_BOOT=false om automatisch seeden uit te schakelen.
 */

type Row = Record<string, unknown>;
type Adapter = {
  query: <T = Row>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }>;
  exec: (sql: string) => Promise<void>;
};

declare global {
  // eslint-disable-next-line no-var
  var __pakkethub_pg: { db: Adapter; ready: Promise<void> } | undefined;
}

function makePglite(): Adapter {
  // Buiten OneDrive houden: OneDrive synct/lockt de PGlite-bestanden → corruptie.
  const dataDir = process.env.PGLITE_DIR || join(tmpdir(), "pakkethub-app-pgdata");
  mkdirSync(dataDir, { recursive: true });
  const pg = new PGlite(dataDir);
  return {
    query: (sql, params = []) => pg.query(sql, params) as Promise<{ rows: any[] }>,
    exec: (sql) => pg.exec(sql).then(() => undefined),
  };
}

function makePostgres(url: string): Adapter {
  const sql = postgres(url, { max: 10, prepare: false, idle_timeout: 20 });
  return {
    query: async (text, params = []) => ({ rows: (await sql.unsafe(text, params as any[])) as any[] }),
    exec: async (text) => { await sql.unsafe(text); },
  };
}

function bootstrap() {
  const url = process.env.DATABASE_URL;
  const db = url ? makePostgres(url) : makePglite();
  const ready = (async () => {
    await db.exec(SCHEMA_SQL);
    if (process.env.SEED_ON_BOOT !== "false") {
      await seedDatabase(db);
    }
  })();
  return { db, ready };
}

function getPg() {
  return globalThis.__pakkethub_pg ?? (globalThis.__pakkethub_pg = bootstrap());
}

export async function query<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pg = getPg();
  await pg.ready;
  const res = await pg.db.query<T>(sql, params);
  return res.rows;
}

export async function queryOne<T = Row>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function exec(sql: string): Promise<void> {
  const pg = getPg();
  await pg.ready;
  await pg.db.exec(sql);
}

export type DbAdapter = Adapter;
