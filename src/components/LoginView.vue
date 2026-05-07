<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useAuth } from '../composables/useAuth.js'

const emit = defineEmits(['success'])
const auth = useAuth()

const password = ref('')
const inputRef = ref(null)
const submitting = ref(false)

async function submit() {
  if (!password.value.trim() || submitting.value) return
  submitting.value = true
  try {
    const ok = await auth.verify(password.value.trim())
    if (ok) {
      password.value = ''
      emit('success')
    }
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  auth.lastError.value = ''
  await nextTick()
  inputRef.value?.focus()
})
</script>

<template>
  <div class="min-h-screen bg-pit-bg text-pit-text flex flex-col items-center justify-center px-4 relative overflow-hidden">
    <!-- Background glow -->
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
      <div class="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full"
           style="background: radial-gradient(closest-side, rgba(232,93,4,0.22), transparent 70%);"></div>
      <div class="absolute -bottom-40 -left-40 w-[520px] h-[520px] rounded-full"
           style="background: radial-gradient(closest-side, rgba(244,140,6,0.15), transparent 70%);"></div>
    </div>

    <!-- Brand -->
    <div class="flex items-center gap-3 mb-10 animate-fade-in">
      <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
           style="background: linear-gradient(135deg, #E85D04, #B14302); box-shadow: 0 12px 32px rgba(232,93,4,0.45);">
        <svg viewBox="0 0 24 24" class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </div>
      <h1 class="pit-display text-4xl md:text-5xl leading-none">
        Pit<span class="text-pit-accent">Stop</span>
      </h1>
    </div>

    <!-- Login card -->
    <div class="w-full max-w-sm pit-card p-6 md:p-7 animate-slide-up"
         style="background: linear-gradient(160deg, #1C1C1C, #141414);">
      <div class="flex items-start gap-3 mb-5">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
             style="background: rgba(232,93,4,0.12); border: 1px solid rgba(232,93,4,0.25);">
          <svg viewBox="0 0 24 24" class="w-5 h-5 text-pit-accentLight" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div>
          <h2 class="pit-display text-2xl">Iniciar sesión</h2>
          <p class="text-pit-muted text-xs mt-1">Ingresa la password del taller para continuar.</p>
        </div>
      </div>

      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="pit-label">Password</label>
          <input
            ref="inputRef"
            v-model="password"
            type="password"
            class="pit-input"
            :class="{ invalid: !!auth.lastError.value }"
            autocomplete="current-password"
            placeholder="••••••••"
          />
        </div>

        <Transition name="modal">
          <p v-if="auth.lastError.value" class="text-sm text-red-300/90 bg-red-950/40 border border-red-800/40 rounded-xl p-3">
            {{ auth.lastError.value }}
          </p>
        </Transition>

        <button
          type="submit"
          class="pit-btn-primary w-full py-3 text-base"
          :disabled="submitting || !password.trim()"
        >
          <span v-if="submitting" class="flex items-center gap-2">
            <svg viewBox="0 0 24 24" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-6.2-8.5" />
            </svg>
            Verificando…
          </span>
          <span v-else class="flex items-center gap-2">
            Entrar
            <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </span>
        </button>
      </form>
    </div>

    <p class="text-xs text-pit-muted mt-8 text-center">
      Cotizaciones automotrices profesionales
    </p>
  </div>
</template>
