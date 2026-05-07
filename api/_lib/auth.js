function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

export function getExpectedPassword() {
  return process.env.APP_PASSWORD || ''
}

export function checkPassword(req) {
  const expected = getExpectedPassword()
  if (!expected) {
    return { ok: false, status: 500, message: 'APP_PASSWORD no está configurada en el servidor.' }
  }
  const provided =
    req.headers['x-app-password'] ||
    req.headers['X-App-Password'] ||
    ''
  if (!provided) return { ok: false, status: 401, message: 'Falta el header x-app-password.' }
  if (!timingSafeEqual(String(provided), String(expected))) {
    return { ok: false, status: 401, message: 'Password incorrecta.' }
  }
  return { ok: true }
}

export function requireAuth(handler) {
  return async (req, res) => {
    const result = checkPassword(req)
    if (!result.ok) {
      res.status(result.status).json({ error: result.message })
      return
    }
    return handler(req, res)
  }
}

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-App-Password')
}
