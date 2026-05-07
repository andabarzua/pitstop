import { getSql, ensureSchema } from './_lib/db.js'
import { checkPassword, setCors } from './_lib/auth.js'

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const auth = checkPassword(req)
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.message })
    return
  }

  const patente = String(req.query?.patente || '').toUpperCase().trim()
  if (!patente) {
    res.status(400).json({ error: 'Falta parámetro patente' })
    return
  }

  try {
    await ensureSchema()
    const sql = getSql()

    const rows = await sql`
      SELECT
        data,
        id,
        fecha,
        created_at,
        COUNT(*) OVER () AS total
      FROM quotes
      WHERE UPPER(patente) = ${patente}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (!rows.length) {
      res.status(200).json({ found: false, quoteCount: 0 })
      return
    }

    const row = rows[0]
    const cliente = row.data?.cliente || null

    res.status(200).json({
      found: true,
      cliente,
      quoteCount: Number(row.total) || 1,
      lastQuoteId: row.id,
      lastQuoteFecha: row.fecha,
      lastCreatedAt: row.created_at
    })
  } catch (err) {
    console.error('clients lookup error', err)
    res.status(500).json({ error: err.message || 'Error interno' })
  }
}
