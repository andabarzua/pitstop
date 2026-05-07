import { ref, computed } from 'vue'

const STORAGE_KEY = 'pitstop:authPassword'

const password = ref('')
const verifying = ref(false)
const lastError = ref('')

try {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) password.value = saved
} catch (e) { /* no-op */ }

const isAuthenticated = computed(() => !!password.value)

async function verify(pw) {
  verifying.value = true
  lastError.value = ''
  try {
    const res = await fetch('/api/auth-check', {
      method: 'GET',
      headers: { 'x-app-password': pw }
    })
    if (res.ok) {
      password.value = pw
      try { localStorage.setItem(STORAGE_KEY, pw) } catch (e) {}
      return true
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
  password.value = ''
  try { localStorage.removeItem(STORAGE_KEY) } catch (e) {}
}

function authHeaders() {
  return password.value ? { 'x-app-password': password.value } : {}
}

export function useAuth() {
  return {
    password,
    isAuthenticated,
    verifying,
    lastError,
    verify,
    logout,
    authHeaders
  }
}
