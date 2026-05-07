import { ref, computed } from 'vue'

const TOKEN_KEY = 'pitstop:authToken'
const PASSWORD_KEY_OLD = 'pitstop:authPassword' // legacy

const token = ref('')
const verifying = ref(false)
const lastError = ref('')

function safeGet(k) {
  try { return localStorage.getItem(k) } catch (e) { return null }
}
function safeSet(k, v) {
  try { localStorage.setItem(k, v) } catch (e) {}
}
function safeDel(k) {
  try { localStorage.removeItem(k) } catch (e) {}
}

// Cargar token guardado
const saved = safeGet(TOKEN_KEY)
if (saved) token.value = saved

const isAuthenticated = computed(() => !!token.value)

// Migración silenciosa: si hay password vieja pero no token, intentar upgrade
async function migrateIfNeeded() {
  if (token.value) return
  const oldPwd = safeGet(PASSWORD_KEY_OLD)
  if (!oldPwd) return
  try {
    const res = await fetch('/api/auth-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-app-password': oldPwd }
    })
    if (res.ok) {
      const data = await res.json()
      if (data?.token) {
        token.value = data.token
        safeSet(TOKEN_KEY, data.token)
        safeDel(PASSWORD_KEY_OLD)
      }
    } else {
      // password ya no es válida → limpiar
      safeDel(PASSWORD_KEY_OLD)
    }
  } catch (e) {
    /* offline: dejar la password antigua, fallback en backend la acepta */
  }
}
migrateIfNeeded()

async function verify(password) {
  verifying.value = true
  lastError.value = ''
  try {
    const res = await fetch('/api/auth-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-app-password': password }
    })
    if (res.ok) {
      const data = await res.json()
      if (data?.token) {
        token.value = data.token
        safeSet(TOKEN_KEY, data.token)
        safeDel(PASSWORD_KEY_OLD)
        return true
      }
      lastError.value = 'Respuesta inválida del servidor'
      return false
    }
    let msg = 'Password incorrecta'
    try {
      const j = await res.json()
      if (j?.error) msg = j.error
    } catch (e) {}
    lastError.value = msg
    return false
  } catch (e) {
    lastError.value = 'No se pudo conectar con el servidor.'
    return false
  } finally {
    verifying.value = false
  }
}

function logout() {
  token.value = ''
  safeDel(TOKEN_KEY)
  safeDel(PASSWORD_KEY_OLD)
}

function authHeaders() {
  return token.value ? { 'x-auth-token': token.value } : {}
}

// Verifica el token guardado en background; si está expirado/inválido, hace logout
async function refreshIfStale() {
  if (!token.value) return
  try {
    const res = await fetch('/api/auth-check', {
      method: 'GET',
      headers: { 'x-auth-token': token.value }
    })
    if (res.status === 401) {
      logout()
    }
  } catch (e) {
    /* offline: ignorar */
  }
}

export function useAuth() {
  return {
    token,
    isAuthenticated,
    verifying,
    lastError,
    verify,
    logout,
    authHeaders,
    refreshIfStale
  }
}
