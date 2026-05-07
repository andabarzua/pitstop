import { checkPassword, signToken, getExpectedPassword, setCors } from './_lib/auth.js'

export default async function handler(req, res) {
  setCors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method === 'POST') {
    // Login: valida la password y emite un token (90 días)
    const expected = getExpectedPassword()
    if (!expected) {
      res.status(500).json({ error: 'APP_PASSWORD no configurada en el servidor.' })
      return
    }
    const provided = req.headers['x-app-password'] || req.headers['X-App-Password'] || ''
    if (!provided) {
      res.status(401).json({ error: 'Falta password' })
      return
    }
    if (String(provided) !== String(expected)) {
      res.status(401).json({ error: 'Password incorrecta.' })
      return
    }
    try {
      const token = signToken({ ts: Date.now() })
      res.status(200).json({ ok: true, token })
    } catch (e) {
      res.status(500).json({ error: e.message || 'No se pudo generar el token' })
    }
    return
  }

  if (req.method === 'GET') {
    // Verifica un token existente
    const result = checkPassword(req)
    if (!result.ok) {
      res.status(result.status).json({ error: result.message })
      return
    }
    res.status(200).json({ ok: true })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
