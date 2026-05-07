import { getSql, ensureSchema } from '../_lib/db.js'
import { checkPassword, setCors } from '../_lib/auth.js'

function summarize(data) {
  const items = Array.isArray(data?.items) ? data.items : []
  const total = items.reduce(
    (s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0),
    0
  )
  return {
    cliente_nombre: data?.cliente?.nombre || null,
    cliente_apellido: data?.cliente?.apellido || null,
    patente: (data?.cliente?.patente || '').toUpperCase() || null,
    total: Math.round(total),
    item_count: items.length,
    fecha: data?.fecha || new Date().toISOString().slice(0, 10)
  }
}

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const auth = checkPassword(req)
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.message })
    return
  }

  try {
    await ensureSchema()
    const sql = getSql()

    if (req.method === 'GET') {
      const limit = Math.min(parseInt(req.query?.limit) || 200, 500)
      const rows = await sql`
        SELECT id, fecha, cliente_nombre, cliente_apellido, patente, total, item_count, created_at, updated_at
        FROM quotes
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
      res.status(200).json({ quotes: rows })
      return
    }

    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : null
      if (!body || !body.id || !body.cliente || !Array.isArray(body.items)) {
        res.status(400).json({ error: 'Payload inválido. Esperado: { id, cliente, items, ... }' })
        return
      }
      const s = summarize(body)
      await sql`
        INSERT INTO quotes (id, fecha, cliente_nombre, cliente_apellido, patente, total, item_count, data, updated_at)
        VALUES (${body.id}, ${s.fecha}, ${s.cliente_nombre}, ${s.cliente_apellido}, ${s.patente},
                ${s.total}, ${s.item_count}, ${JSON.stringify(body)}::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
          fecha = EXCLUDED.fecha,
          cliente_nombre = EXCLUDED.cliente_nombre,
          cliente_apellido = EXCLUDED.cliente_apellido,
          patente = EXCLUDED.patente,
          total = EXCLUDED.total,
          item_count = EXCLUDED.item_count,
          data = EXCLUDED.data,
          updated_at = NOW()
      `
      res.status(200).json({ ok: true, id: body.id })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('quotes error', err)
    res.status(500).json({ error: err.message || 'Error interno' })
  }
}
