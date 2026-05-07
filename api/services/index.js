import { getSql, ensureSchema } from '../_lib/db.js'
import { checkPassword, setCors } from '../_lib/auth.js'

function uid() {
  return 'srv_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
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
      const rows = await sql`
        SELECT id, descripcion, precio_unitario, created_at, updated_at
        FROM services
        ORDER BY LOWER(descripcion) ASC
      `
      res.status(200).json({ services: rows })
      return
    }

    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : null
      if (!body || !body.descripcion) {
        res.status(400).json({ error: 'Falta descripcion' })
        return
      }
      const descripcion = String(body.descripcion).trim()
      if (!descripcion) {
        res.status(400).json({ error: 'Descripción vacía' })
        return
      }
      const precio = Math.max(0, Math.round(Number(body.precio_unitario) || 0))
      const id = body.id || uid()

      await sql`
        INSERT INTO services (id, descripcion, precio_unitario, updated_at)
        VALUES (${id}, ${descripcion}, ${precio}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          descripcion = EXCLUDED.descripcion,
          precio_unitario = EXCLUDED.precio_unitario,
          updated_at = NOW()
      `
      res.status(200).json({ ok: true, id })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('services error', err)
    res.status(500).json({ error: err.message || 'Error interno' })
  }
}
