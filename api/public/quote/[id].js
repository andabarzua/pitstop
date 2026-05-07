import { getSql, ensureSchema } from '../../_lib/db.js'

// Public read-only endpoint — no auth required.
// Customers receive a link like https://app/#q=COT-... to view their quote.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Cache-Control', 'public, max-age=60')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const id = req.query?.id
  if (!id) {
    res.status(400).json({ error: 'Falta id' })
    return
  }

  try {
    await ensureSchema()
    const sql = getSql()
    const rows = await sql`SELECT data FROM quotes WHERE id = ${id} LIMIT 1`
    if (!rows.length) {
      res.status(404).json({ error: 'Cotización no encontrada' })
      return
    }
    res.status(200).json(rows[0].data)
  } catch (err) {
    console.error('public quote error', err)
    res.status(500).json({ error: 'Error interno' })
  }
}
