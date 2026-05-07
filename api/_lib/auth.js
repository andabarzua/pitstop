import crypto from 'node:crypto'

const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000 // 90 días

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

function getSecret() {
  // Si existe APP_SECRET, se usa; si no, fallback a APP_PASSWORD.
  return process.env.APP_SECRET || process.env.APP_PASSWORD || ''
}

export function signToken(payload = {}, ttlMs = TOKEN_TTL_MS) {
  const secret = getSecret()
  if (!secret) throw new Error('APP_PASSWORD/APP_SECRET no configurada en el servidor')
  const exp = Date.now() + ttlMs
  const data = JSON.stringify({ ...payload, exp })
  const b64 = Buffer.from(data, 'utf8').toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(b64).digest('base64url')
  return `${b64}.${sig}`
}

export function verifyToken(token) {
  if (typeof token !== 'string' || !token) return null
  const secret = getSecret()
  if (!secret) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [b64, sig] = parts
  const expectedSig = crypto.createHmac('sha256', secret).update(b64).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expectedSig)
  if (a.length !== b.length) return null
  if (!crypto.timingSafeEqual(a, b)) return null
  try {
    const data = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'))
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null
    return data
  } catch (e) {
    return null
  }
}

export function checkPassword(req) {
  // 1) Token JWT-style (preferido, dura 90 días)
  const token = req.headers['x-auth-token'] || req.headers['X-Auth-Token']
  if (token) {
    const decoded = verifyToken(String(token))
    if (decoded) return { ok: true, decoded }
    return { ok: false, status: 401, message: 'Sesión expirada. Vuelve a iniciar sesión.' }
  }

  // 2) Fallback legacy: header x-app-password (compat con clientes viejos)
  const expected = getExpectedPassword()
  if (!expected) {
    return { ok: false, status: 500, message: 'APP_PASSWORD no está configurada en el servidor.' }
  }
  const provided =
    req.headers['x-app-password'] ||
    req.headers['X-App-Password'] ||
    ''
  if (!provided) return { ok: false, status: 401, message: 'Falta autenticación.' }
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
