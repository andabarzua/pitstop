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

  try {
    await ensureSchema()
    const sql = getSql()

    const aggRows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE fecha = CURRENT_DATE)::int AS today_count,
        COUNT(*) FILTER (WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE))::int AS month_count,
        COUNT(*)::int AS total_count,
        COALESCE(AVG(total), 0)::bigint AS avg_total,
        COALESCE(SUM(total) FILTER (WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE)), 0)::bigint AS month_total,
        COALESCE(SUM(total) FILTER (WHERE fecha = CURRENT_DATE), 0)::bigint AS today_total
      FROM quotes
    `
    const stats = aggRows[0] || {}

    const recent = await sql`
      SELECT id, fecha, cliente_nombre, cliente_apellido, patente, total, item_count, created_at
      FROM quotes
      ORDER BY created_at DESC
      LIMIT 6
    `

    res.status(200).json({
      stats: {
        today: Number(stats.today_count) || 0,
        month: Number(stats.month_count) || 0,
        all: Number(stats.total_count) || 0,
        avgTotal: Math.round(Number(stats.avg_total) || 0),
        monthTotal: Number(stats.month_total) || 0,
        todayTotal: Number(stats.today_total) || 0
      },
      recent
    })
  } catch (err) {
    console.error('stats error', err)
    res.status(500).json({ error: err.message || 'Error interno' })
  }
}
