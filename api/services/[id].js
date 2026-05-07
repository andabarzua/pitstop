import { getSql, ensureSchema } from '../_lib/db.js'
import { checkPassword, setCors } from '../_lib/auth.js'

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

  const id = req.query?.id
  if (!id) {
    res.status(400).json({ error: 'Falta id' })
    return
  }

  try {
    await ensureSchema()
    const sql = getSql()

    if (req.method === 'DELETE') {
      await sql`DELETE FROM services WHERE id = ${id}`
      res.status(200).json({ ok: true })
      return
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = req.body && typeof req.body === 'object' ? req.body : null
      if (!body) {
        res.status(400).json({ error: 'Body requerido' })
        return
      }
      const descripcion = String(body.descripcion || '').trim()
      const precio = Math.max(0, Math.round(Number(body.precio_unitario) || 0))
      if (!descripcion) {
        res.status(400).json({ error: 'Descripción vacía' })
        return
      }
      await sql`
        UPDATE services
        SET descripcion = ${descripcion},
            precio_unitario = ${precio},
            updated_at = NOW()
        WHERE id = ${id}
      `
      res.status(200).json({ ok: true })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('service [id] error', err)
    res.status(500).json({ error: err.message || 'Error interno' })
  }
}
