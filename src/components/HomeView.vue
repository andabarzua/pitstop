<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuote } from '../composables/useQuote.js'
import { useAuth } from '../composables/useAuth.js'

const emit = defineEmits(['new-quote', 'open-quote', 'open-history', 'request-auth', 'toast'])
const q = useQuote()
const auth = useAuth()

const loading = ref(false)
const stats = ref({ today: 0, month: 0, all: 0, avgTotal: 0, monthTotal: 0, todayTotal: 0 })
const recent = ref([])
const error = ref('')

const today = new Date()
const greeting = computed(() => {
  const h = today.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
})
const dateStr = computed(() => {
  const s = today.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
})

async function loadDashboard() {
  if (!auth.isAuthenticated.value) return
  loading.value = true
  error.value = ''
  try {
    const data = await q.cloudStats()
    stats.value = data.stats
    recent.value = data.recent || []
  } catch (e) {
    if (String(e.message).toLowerCase().includes('password')) {
      auth.logout()
      emit('toast', 'Sesión expirada, ingresa la password de nuevo', 'error')
    } else {
      error.value = e.message || 'Error al cargar el dashboard'
    }
  } finally {
    loading.value = false
  }
}

async function openRecent(item) {
  try {
    await q.cloudLoad(item.id)
    emit('open-quote')
  } catch (e) {
    emit('toast', e.message || 'No se pudo cargar', 'error')
  }
}

function fmtDate(v) {
  if (!v) return ''
  try {
    return new Date(v).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
  } catch (e) {
    return String(v).slice(0, 10)
  }
}

function fmtCreated(v) {
  if (!v) return ''
  try {
    const d = new Date(v)
    const date = d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' })
    const time = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })
    return `${date} · ${time}`
  } catch (e) {
    return ''
  }
}

onMounted(loadDashboard)
defineExpose({ refresh: loadDashboard })
</script>

<template>
  <section class="animate-fade-in">
    <!-- Greeting -->
    <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <p class="text-pit-muted text-sm">{{ dateStr }}</p>
        <h2 class="pit-display text-3xl md:text-4xl mt-1">
          {{ greeting }}<span class="text-pit-accent">.</span>
        </h2>
      </div>
      <button
        v-if="auth.isAuthenticated.value"
        class="pit-btn-ghost !px-3 !py-2 text-sm"
        @click="loadDashboard"
        :disabled="loading"
        title="Refrescar"
      >
        <svg viewBox="0 0 24 24" class="w-4 h-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5" />
        </svg>
      </button>
    </div>

    <!-- Stats grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
      <!-- Hoy -->
      <div class="pit-card p-4 md:p-5 relative overflow-hidden">
        <div class="absolute -right-4 -top-4 w-20 h-20 rounded-full"
             style="background: radial-gradient(closest-side, rgba(232,93,4,0.18), transparent 70%);"></div>
        <div class="relative">
          <div class="flex items-center gap-2 mb-2">
            <svg viewBox="0 0 24 24" class="w-4 h-4 text-pit-accentLight" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
              <circle cx="12" cy="15" r="2" fill="currentColor" stroke="none" />
            </svg>
            <p class="text-[10px] uppercase tracking-widest text-pit-muted font-medium">Hoy</p>
          </div>
          <p class="pit-display text-4xl md:text-5xl text-pit-text leading-none">{{ stats.today }}</p>
          <p class="text-xs text-pit-muted mt-2 capitalize">
            {{ stats.today === 1 ? 'Cotización' : 'Cotizaciones' }}
          </p>
        </div>
      </div>

      <!-- Mes -->
      <div class="pit-card p-4 md:p-5 relative overflow-hidden">
        <div class="absolute -right-4 -top-4 w-20 h-20 rounded-full"
             style="background: radial-gradient(closest-side, rgba(244,140,6,0.18), transparent 70%);"></div>
        <div class="relative">
          <div class="flex items-center gap-2 mb-2">
            <svg viewBox="0 0 24 24" class="w-4 h-4 text-pit-accentLight" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M3 10h18M16 2v4M8 2v4" />
            </svg>
            <p class="text-[10px] uppercase tracking-widest text-pit-muted font-medium">Este mes</p>
          </div>
          <p class="pit-display text-4xl md:text-5xl text-pit-text leading-none">{{ stats.month }}</p>
          <p class="text-xs text-pit-muted mt-2 capitalize">
            {{ stats.month === 1 ? 'Cotización' : 'Cotizaciones' }}
          </p>
        </div>
      </div>

      <!-- Total del mes (spans 2 cols on mobile, 1 on desktop) -->
      <div class="pit-card p-4 md:p-5 relative overflow-hidden col-span-2 sm:col-span-1"
           style="background: linear-gradient(135deg, rgba(232,93,4,0.10), rgba(20,20,20,1));">
        <div class="absolute -right-6 -top-6 w-24 h-24 rounded-full"
             style="background: radial-gradient(closest-side, rgba(232,93,4,0.28), transparent 70%);"></div>
        <div class="relative">
          <div class="flex items-center gap-2 mb-2">
            <svg viewBox="0 0 24 24" class="w-4 h-4 text-pit-accentLight" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 17l6-6 4 4 8-8M14 7h7v7" />
            </svg>
            <p class="text-[10px] uppercase tracking-widest text-pit-muted font-medium">Total del mes</p>
          </div>
          <p class="pit-display text-3xl md:text-4xl text-pit-accentLight leading-none break-words">{{ q.formatCLP(stats.monthTotal) }}</p>
          <p class="text-xs text-pit-muted mt-2 capitalize">Cotizaciones del mes</p>
        </div>
      </div>

    </div>

    <!-- Error -->
    <p v-if="error" class="text-sm text-red-300/90 bg-red-950/40 border border-red-800/40 rounded-xl p-3 mb-4">
      {{ error }}
    </p>

    <!-- Actions -->
    <div class="grid sm:grid-cols-3 gap-3 mb-8">
      <button
        @click="emit('new-quote')"
        class="sm:col-span-2 pit-btn-primary text-lg py-5 hover-lift"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nueva Cotización
      </button>
      <button
        class="pit-btn-ghost py-5 hover-lift"
        @click="emit('open-history')"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 3h18v4H3zM3 11h18v10H3zM7 7v4M17 7v4" />
        </svg>
        Ver historial completo
      </button>
    </div>

    <!-- Recent -->
    <div>
      <div class="flex items-baseline justify-between mb-3">
        <h3 class="pit-display text-2xl">Recientes</h3>
        <span v-if="recent.length" class="text-xs text-pit-muted capitalize">Últimas {{ recent.length }}</span>
      </div>

      <div v-if="loading && !recent.length" class="text-center text-pit-muted text-sm py-8">
        Cargando…
      </div>
      <div v-else-if="!recent.length" class="pit-card p-6 text-center">
        <p class="text-pit-muted text-sm">Aún no hay cotizaciones guardadas. La primera que generes aparecerá aquí.</p>
      </div>
      <ul v-else class="space-y-2">
        <li
          v-for="item in recent"
          :key="item.id"
          class="pit-card p-4 hover-lift cursor-pointer transition-colors hover:border-pit-borderHover"
          @click="openRecent(item)"
        >
          <div class="flex flex-wrap items-start gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-baseline gap-2">
                <span class="pit-display text-pit-accent">{{ item.id }}</span>
              </div>
              <p class="text-sm mt-1 truncate">
                <span class="font-medium">{{ q.titleCase((item.cliente_nombre || '') + ' ' + (item.cliente_apellido || '')) }}</span>
                <span v-if="item.patente" class="text-pit-muted ml-2 pit-display tracking-widest text-xs">{{ item.patente }}</span>
              </p>
              <p class="text-[11px] text-pit-muted mt-1 flex items-center gap-1">
                <svg viewBox="0 0 24 24" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                Creada {{ fmtCreated(item.created_at) }}
              </p>
            </div>
            <div class="text-right">
              <p class="pit-display text-lg text-pit-accentLight">{{ q.formatCLP(item.total) }}</p>
              <p class="text-[10px] text-pit-muted mt-0.5 capitalize">{{ item.item_count }} {{ item.item_count === 1 ? 'Item' : 'Items' }}</p>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
