<script setup>
import { ref, watch, nextTick } from 'vue'
import { useAuth } from '../composables/useAuth.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Acceso al historial' },
  message: { type: String, default: 'Ingresa la password para acceder al historial cloud.' }
})
const emit = defineEmits(['close', 'success'])

const auth = useAuth()
const input = ref('')
const inputRef = ref(null)

watch(() => props.open, async (v) => {
  if (v) {
    input.value = ''
    auth.lastError.value = ''
    await nextTick()
    inputRef.value?.focus()
  }
})

async function submit() {
  if (!input.value.trim()) return
  const ok = await auth.verify(input.value.trim())
  if (ok) emit('success')
}

function onBackdrop(e) {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <Transition name="modal">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
      @click="onBackdrop"
    >
      <div class="modal-panel w-full md:max-w-md bg-pit-surface border border-pit-border md:rounded-2xl rounded-t-3xl shadow-soft p-6"
           style="padding-bottom: max(24px, env(safe-area-inset-bottom));">
        <div class="md:hidden flex justify-center -mt-2 mb-3">
          <span class="block w-10 h-1.5 rounded-full bg-white/15"></span>
        </div>

        <div class="flex items-start gap-3 mb-5">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
               style="background: rgba(232,93,4,0.12); border: 1px solid rgba(232,93,4,0.25);">
            <svg viewBox="0 0 24 24" class="w-5 h-5 text-pit-accentLight" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="pit-display text-2xl">{{ title }}</h3>
            <p class="text-pit-muted text-sm mt-1">{{ message }}</p>
          </div>
          <button @click="emit('close')" class="pit-btn-ghost !p-2 !rounded-lg" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="submit" class="space-y-4">
          <div>
            <label class="pit-label">Password</label>
            <input
              ref="inputRef"
              v-model="input"
              type="password"
              class="pit-input"
              :class="{ invalid: !!auth.lastError.value }"
              autocomplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <p v-if="auth.lastError.value" class="text-sm text-red-300/90 bg-red-950/40 border border-red-800/40 rounded-xl p-3">
            {{ auth.lastError.value }}
          </p>

          <button type="submit" class="pit-btn-primary w-full py-3" :disabled="auth.verifying.value || !input.trim()">
            <span v-if="auth.verifying.value">Verificando…</span>
            <span v-else>Ingresar</span>
          </button>
        </form>
      </div>
    </div>
  </Transition>
</template>
