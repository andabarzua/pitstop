import { checkPassword, setCors } from './_lib/auth.js'

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const result = checkPassword(req)
  if (!result.ok) {
    res.status(result.status).json({ error: result.message })
    return
  }
  res.status(200).json({ ok: true })
}
