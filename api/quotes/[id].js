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

    if (req.method === 'GET') {
      const rows = await sql`SELECT data FROM quotes WHERE id = ${id} LIMIT 1`
      if (!rows.length) {
        res.status(404).json({ error: 'No encontrada' })
        return
      }
      res.status(200).json(rows[0].data)
      return
    }

    if (req.method === 'DELETE') {
      const result = await sql`DELETE FROM quotes WHERE id = ${id}`
      res.status(200).json({ ok: true, deleted: result.length || 0 })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('quote [id] error', err)
    res.status(500).json({ error: err.message || 'Error interno' })
  }
}
