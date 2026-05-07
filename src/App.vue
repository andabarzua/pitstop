<script setup>
import { onMounted, ref, computed } from 'vue'
import StepIndicator from './components/StepIndicator.vue'
import ClientForm from './components/ClientForm.vue'
import ItemsTable from './components/ItemsTable.vue'
import FinalStep from './components/FinalStep.vue'
import HomeView from './components/HomeView.vue'
import HistoryView from './components/HistoryView.vue'
import PasswordGate from './components/PasswordGate.vue'
import { useQuote } from './composables/useQuote.js'
import { useAuth } from './composables/useAuth.js'

const q = useQuote()
const auth = useAuth()
const fileInput = ref(null)
const toast = ref(null)
const direction = ref('forward')

const view = ref('home') // 'home' | 'stepper'
const homeRef = ref(null)
const showHistory = ref(false)
const showPasswordGate = ref(false)
const pendingAction = ref(null) // 'history' | 'home' | null

function showToast(message, type = 'info') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3200)
}

function pickFile() {
  fileInput.value?.click()
}

function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (!/\.json$/i.test(file.name)) {
    showToast('Selecciona un archivo .json válido', 'error')
    e.target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result))
      q.loadFromJson(data)
      view.value = 'stepper'
      showToast('Cotización cargada correctamente', 'success')
    } catch (err) {
      showToast(err.message || 'Error al leer el archivo', 'error')
    }
  }
  reader.onerror = () => showToast('No se pudo leer el archivo', 'error')
  reader.readAsText(file)
  e.target.value = ''
}

function startNewQuote() {
  if (q.itemCount.value > 0 || q.quote.cliente.nombre || q.quote.cliente.apellido || q.quote.cliente.patente) {
    if (!confirm('¿Iniciar una nueva cotización? Los datos actuales se perderán.')) return
  }
  q.resetQuote()
  view.value = 'stepper'
  direction.value = 'forward'
}

function goHome() {
  view.value = 'home'
  // Refresh stats if home is already authenticated
  setTimeout(() => homeRef.value?.refresh?.(), 50)
}

function goToStep(n) {
  direction.value = n > q.currentStep.value ? 'forward' : 'back'
  q.setStep(n)
}

const stepKey = computed(() => q.currentStep.value)

function openHistory() {
  if (auth.isAuthenticated.value) {
    showHistory.value = true
  } else {
    pendingAction.value = 'history'
    showPasswordGate.value = true
  }
}

function requestAuthForHome() {
  pendingAction.value = 'home'
  showPasswordGate.value = true
}

function onAuthSuccess() {
  showPasswordGate.value = false
  if (pendingAction.value === 'history') {
    showHistory.value = true
  } else if (pendingAction.value === 'home') {
    homeRef.value?.refresh?.()
  }
  pendingAction.value = null
}

function onLoadedFromHistory() {
  showHistory.value = false
  view.value = 'stepper'
  q.setStep(3)
  showToast('Cotización cargada del historial', 'success')
}

function onLoadedFromHome() {
  view.value = 'stepper'
  q.setStep(3)
  showToast('Cotización cargada', 'success')
}

function onResetFromFinal() {
  q.resetQuote()
  goHome()
}

onMounted(() => {
  const restoredFromHash = q.tryLoadFromHash()
  if (restoredFromHash) {
    view.value = 'stepper'
    q.setStep(3)
  }
})
</script>

<template>
  <div class="min-h-screen bg-pit-bg text-pit-text">
    <!-- Background ambient gradient -->
    <div aria-hidden="true" class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div class="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full"
           style="background: radial-gradient(closest-side, rgba(232,93,4,0.18), transparent 70%);"></div>
      <div class="absolute -bottom-60 -left-40 w-[520px] h-[520px] rounded-full"
           style="background: radial-gradient(closest-side, rgba(244,140,6,0.10), transparent 70%);"></div>
    </div>

    <!-- Header -->
    <header class="sticky top-0 z-30 backdrop-blur-md bg-pit-bg/70 border-b border-pit-border">
      <div class="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
        <!-- Logo (clickable, goes home) -->
        <button class="flex items-center gap-3 min-w-0 group" @click="goHome" :title="view === 'home' ? '' : 'Ir al inicio'">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
               style="background: linear-gradient(135deg, #E85D04, #B14302); box-shadow: 0 6px 18px rgba(232,93,4,0.35);">
            <svg viewBox="0 0 24 24" class="w-6 h-6 text-white" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <div class="min-w-0 text-left">
            <h1 class="pit-display text-2xl md:text-3xl leading-none">
              Pit<span class="text-pit-accent">Stop</span>
            </h1>
            <p class="text-[11px] md:text-xs text-pit-muted tracking-wide">Cotizaciones Profesionales</p>
          </div>
        </button>

        <div class="ml-auto flex items-center gap-2">
          <button
            v-if="view === 'stepper'"
            class="pit-btn-ghost !px-3 !py-2 text-sm"
            @click="goHome"
            title="Inicio"
          >
            <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
            </svg>
            <span class="hidden sm:inline">Inicio</span>
          </button>
          <button class="pit-btn-ghost !px-3 !py-2 text-sm" @click="openHistory" title="Historial cloud">
            <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3h18v4H3zM3 11h18v10H3zM7 7v4M17 7v4" />
            </svg>
            <span class="hidden sm:inline">Historial</span>
            <span v-if="auth.isAuthenticated.value" class="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" title="Autenticado"></span>
          </button>
          <button class="pit-btn-ghost !px-3 !py-2 text-sm" @click="pickFile" title="Cargar cotización (.json)">
            <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
            </svg>
            <span class="hidden sm:inline">Cargar</span>
          </button>
          <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onFileSelected" />
        </div>
      </div>

      <!-- Step indicator (only in stepper view) -->
      <div v-if="view === 'stepper'" class="max-w-5xl mx-auto px-4 md:px-6 pb-4">
        <StepIndicator :current="q.currentStep.value" @go="goToStep" />
      </div>
    </header>

    <!-- Main -->
    <main class="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 pb-32">
      <Transition name="modal" mode="out-in">
        <!-- HOME -->
        <HomeView
          v-if="view === 'home'"
          ref="homeRef"
          key="home"
          @new-quote="startNewQuote"
          @open-quote="onLoadedFromHome"
          @open-history="openHistory"
          @request-auth="requestAuthForHome"
          @toast="(m, t) => showToast(m, t)"
        />

        <!-- STEPPER -->
        <div v-else key="stepper" class="stepper-stage">
          <Transition :name="direction === 'forward' ? 'slide' : 'slide'" mode="out-in">
            <ClientForm v-if="stepKey === 1" key="step-1" @next="goToStep(2)" />
            <ItemsTable v-else-if="stepKey === 2" key="step-2" @next="goToStep(3)" @back="goToStep(1)" />
            <FinalStep v-else key="step-3" @back="goToStep(2)" @reset="onResetFromFinal" @toast="(msg, type) => showToast(msg, type)" />
          </Transition>
        </div>
      </Transition>
    </main>

    <!-- Password gate -->
    <PasswordGate
      :open="showPasswordGate"
      @close="showPasswordGate = false; pendingAction = null"
      @success="onAuthSuccess"
    />

    <!-- History -->
    <HistoryView
      v-if="showHistory"
      @close="showHistory = false"
      @loaded="onLoadedFromHistory"
      @toast="(m, t) => showToast(m, t)"
    />

    <!-- Toast -->
    <Transition name="modal">
      <div v-if="toast"
           class="fixed left-1/2 -translate-x-1/2 top-4 z-50 max-w-[92vw] px-4 py-3 rounded-xl border text-sm shadow-soft"
           :class="toast.type === 'error'
             ? 'bg-red-950/90 border-red-700/40 text-red-100'
             : toast.type === 'success'
               ? 'bg-emerald-950/90 border-emerald-700/40 text-emerald-100'
               : 'bg-pit-surface2/95 border-pit-border text-pit-text'">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>
