import { neon } from '@neondatabase/serverless'

let _sql = null
let _initialized = false

function getConnectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.NEON_DATABASE_URL
  )
}

export function getSql() {
  if (_sql) return _sql
  const url = getConnectionString()
  if (!url) {
    throw new Error('Falta DATABASE_URL / POSTGRES_URL en las variables de entorno.')
  }
  _sql = neon(url)
  return _sql
}

export async function ensureSchema() {
  if (_initialized) return
  const sql = getSql()
  await sql`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      fecha DATE NOT NULL,
      cliente_nombre TEXT,
      cliente_apellido TEXT,
      patente TEXT,
      total INTEGER NOT NULL DEFAULT 0,
      item_count INTEGER NOT NULL DEFAULT 0,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_quotes_fecha ON quotes(fecha DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_quotes_patente ON quotes(patente)`
  await sql`CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes(created_at DESC)`
  _initialized = true
}
