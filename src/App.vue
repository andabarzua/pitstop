<script setup>
import { onMounted, ref, computed, watch, nextTick } from 'vue'
import StepIndicator from './components/StepIndicator.vue'
import ClientForm from './components/ClientForm.vue'
import ItemsTable from './components/ItemsTable.vue'
import FinalStep from './components/FinalStep.vue'
import HomeView from './components/HomeView.vue'
import HistoryView from './components/HistoryView.vue'
import ServicesView from './components/ServicesView.vue'
import PublicQuoteView from './components/PublicQuoteView.vue'
import PasswordGate from './components/PasswordGate.vue'
import { useQuote, readHashMode } from './composables/useQuote.js'
import { useAuth } from './composables/useAuth.js'

const q = useQuote()
const auth = useAuth()
const toast = ref(null)
const direction = ref('forward')

const view = ref('home') // 'home' | 'stepper' | 'public'
const publicQuoteId = ref('')
const homeRef = ref(null)
const showHistory = ref(false)
const showServices = ref(false)
const showPasswordGate = ref(false)
const pendingAction = ref(null) // 'history' | 'home' | 'services' | null

function showToast(message, type = 'info') {
  toast.value = { message, type }
  setTimeout(() => { toast.value = null }, 3200)
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
  setTimeout(() => homeRef.value?.refresh?.(), 50)
}

function goToStep(n) {
  direction.value = n > q.currentStep.value ? 'forward' : 'back'
  q.setStep(n)
}

const stepKey = computed(() => q.currentStep.value)

function scrollToTop() {
  nextTick(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  })
}

watch([stepKey, view], () => scrollToTop())

function openHistory() {
  if (auth.isAuthenticated.value) {
    showHistory.value = true
  } else {
    pendingAction.value = 'history'
    showPasswordGate.value = true
  }
}

function openServices() {
  if (auth.isAuthenticated.value) {
    showServices.value = true
  } else {
    pendingAction.value = 'services'
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
  } else if (pendingAction.value === 'services') {
    showServices.value = true
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

onMounted(async () => {
  const hashInfo = readHashMode()
  if (hashInfo.mode === 'view' && hashInfo.id) {
    publicQuoteId.value = hashInfo.id
    view.value = 'public'
    return
  }
  if (hashInfo.mode === 'load') {
    const ok = await q.tryLoadFromHash()
    if (ok) {
      view.value = 'stepper'
      q.setStep(3)
    }
  }
})
</script>

<template>
  <!-- Vista pública del cliente (URL #v=...): UI minimal sin navbar/app -->
  <PublicQuoteView v-if="view === 'public'" :quote-id="publicQuoteId" />

  <div v-else class="min-h-screen bg-pit-bg text-pit-text">
    <!-- Background ambient gradient -->
    <div aria-hidden="true" class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div class="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full"
           style="background: radial-gradient(closest-side, rgba(232,93,4,0.18), transparent 70%);"></div>
      <div class="absolute -bottom-60 -left-40 w-[520px] h-[520px] rounded-full"
           style="background: radial-gradient(closest-side, rgba(244,140,6,0.10), transparent 70%);"></div>
    </div>

    <!-- Floating Navbar -->
    <header class="sticky top-0 z-30 pt-3 md:pt-5 px-3 md:px-6">
      <div class="max-w-4xl mx-auto rounded-2xl border border-pit-border bg-pit-surface/85 backdrop-blur-xl shadow-soft">
        <div class="flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-3">
          <!-- Logo (clickable: goes home) -->
          <button class="flex items-center gap-2.5 min-w-0 group" @click="goHome" :title="view === 'home' ? '' : 'Inicio'">
            <div class="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                 style="background: linear-gradient(135deg, #E85D04, #B14302); box-shadow: 0 6px 18px rgba(232,93,4,0.35);">
              <svg viewBox="0 0 24 24" class="w-5 h-5 md:w-5.5 md:h-5.5 text-white" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <div class="min-w-0 text-left hidden xs:block sm:block">
              <h1 class="pit-display text-xl md:text-2xl leading-none">
                Pit<span class="text-pit-accent">Stop</span>
              </h1>
            </div>
          </button>

          <div class="ml-auto flex items-center gap-1.5 md:gap-2">
            <!-- Cotizaciones -->
            <button
              class="flex items-center gap-2 px-2.5 md:px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
              :class="showHistory
                ? 'bg-pit-accent/15 border border-pit-accent/30 text-pit-accentLight'
                : 'text-pit-text hover:bg-white/5 border border-transparent'"
              @click="openHistory"
              title="Cotizaciones"
            >
              <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 3h18v4H3zM3 11h18v10H3zM7 7v4M17 7v4" />
              </svg>
              <span class="hidden md:inline">Cotizaciones</span>
              <span v-if="auth.isAuthenticated.value" class="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Autenticado"></span>
            </button>

            <!-- Catálogo -->
            <button
              class="flex items-center gap-2 px-2.5 md:px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
              :class="showServices
                ? 'bg-pit-accent/15 border border-pit-accent/30 text-pit-accentLight'
                : 'text-pit-text hover:bg-white/5 border border-transparent'"
              @click="openServices"
              title="Catálogo de servicios"
            >
              <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <span class="hidden md:inline">Catálogo</span>
            </button>

            <!-- Crear -->
            <button
              class="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-sm font-semibold text-white bg-pit-accent hover:bg-pit-accentLight transition-all duration-200"
              style="box-shadow: 0 6px 16px rgba(232,93,4,0.3);"
              @click="startNewQuote"
            >
              <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span class="hidden sm:inline">Crear</span>
            </button>
          </div>
        </div>

        <!-- Step indicator (only in stepper view) -->
        <div v-if="view === 'stepper'" class="px-4 md:px-5 pb-3 pt-1 border-t border-pit-border/50">
          <StepIndicator :current="q.currentStep.value" @go="goToStep" />
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10 pb-32">
      <Transition name="modal" mode="out-in">
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

        <div v-else key="stepper" class="stepper-stage">
          <Transition :name="direction === 'forward' ? 'slide' : 'slide'" mode="out-in">
            <ClientForm v-if="stepKey === 1" key="step-1" @next="goToStep(2)" />
            <ItemsTable v-else-if="stepKey === 2" key="step-2" @next="goToStep(3)" @back="goToStep(1)" />
            <FinalStep v-else key="step-3" @back="goToStep(2)" @edit-client="goToStep(1)" @reset="onResetFromFinal" @toast="(msg, type) => showToast(msg, type)" />
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

    <!-- Services catalog -->
    <ServicesView
      v-if="showServices"
      @close="showServices = false"
      @toast="(m, t) => showToast(m, t)"
    />

    <!-- Toast -->
    <Transition name="modal">
      <div v-if="toast"
           class="fixed left-1/2 -translate-x-1/2 top-20 z-50 max-w-[92vw] px-4 py-3 rounded-xl border text-sm shadow-soft"
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
