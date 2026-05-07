<script setup>
import { ref, computed, watch } from 'vue'
import { useQuote } from '../composables/useQuote.js'
import { useAuth } from '../composables/useAuth.js'

const emit = defineEmits(['next'])
const q = useQuote()
const auth = useAuth()
const c = q.quote.cliente

const submitted = ref(false)
const copied = ref(false)

// Lookup state
const lookupResult = ref(null) // { found, cliente, quoteCount, lastQuoteId, lastQuoteFecha }
const lookupLoading = ref(false)
const lookupBanner = ref(null) // 'available' | 'loaded' | 'dismissed' | null
let lookupDebounce = null
let lastLookedUpPatente = ''

const errors = computed(() => ({
  nombre: !c.nombre?.trim(),
  apellido: !c.apellido?.trim(),
  patente: !c.patente?.trim()
}))

const isValid = computed(() => !errors.value.nombre && !errors.value.apellido && !errors.value.patente)

function formatPatente(raw) {
  const clean = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  if (clean.length <= 2) return clean
  if (clean.length <= 4) return `${clean.slice(0, 2)}-${clean.slice(2)}`
  return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4)}`
}

watch(() => c.patente, (v) => {
  if (typeof v !== 'string') return
  const formatted = formatPatente(v)
  if (formatted !== v) {
    c.patente = formatted
    return
  }
  // Trigger lookup when patente is "complete enough" (6 chars + 2 dashes = 8)
  if (formatted.length >= 8 && auth.isAuthenticated.value) {
    if (lookupDebounce) clearTimeout(lookupDebounce)
    lookupDebounce = setTimeout(() => doLookup(formatted), 400)
  } else {
    lookupResult.value = null
    lookupBanner.value = null
  }
})

async function doLookup(patente) {
  if (patente === lastLookedUpPatente) return
  lastLookedUpPatente = patente
  lookupLoading.value = true
  try {
    const data = await q.cloudLookupClient(patente)
    if (data?.found) {
      lookupResult.value = data
      // Si los campos del cliente están vacíos, mostrar banner ofrecer cargar
      // Si ya hay datos cargados, no molestar
      const hasData = c.nombre || c.apellido || c.telefono
      lookupBanner.value = hasData ? 'available' : 'available'
    } else {
      lookupResult.value = null
      lookupBanner.value = null
    }
  } catch (e) {
    lookupResult.value = null
    lookupBanner.value = null
  } finally {
    lookupLoading.value = false
  }
}

function applyLookup() {
  if (!lookupResult.value?.cliente) return
  const data = lookupResult.value.cliente
  c.nombre = data.nombre || c.nombre || ''
  c.apellido = data.apellido || c.apellido || ''
  c.telefono = data.telefono || c.telefono || ''
  c.email = data.email || c.email || ''
  c.marca = data.marca || c.marca || ''
  c.modelo = data.modelo || c.modelo || ''
  c.anio = data.anio || c.anio || ''
  lookupBanner.value = 'loaded'
}

function dismissLookup() {
  lookupBanner.value = 'dismissed'
}

function fmtFecha(v) {
  if (!v) return ''
  try {
    return new Date(v).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' })
  } catch (e) { return '' }
}

function handleSubmit() {
  submitted.value = true
  if (!isValid.value) return
  emit('next')
}

async function copyId() {
  try {
    await navigator.clipboard.writeText(q.quote.id)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch (e) {
    /* no-op */
  }
}
</script>

<template>
  <section class="animate-fade-in">
    <!-- Header strip -->
    <div class="pit-card p-5 md:p-6 mb-5 flex flex-wrap items-center gap-4">
      <div class="flex-1 min-w-[180px]">
        <p class="text-[11px] uppercase tracking-widest text-pit-muted">N° Cotización</p>
        <div class="flex items-center gap-2 mt-1">
          <span class="pit-display text-xl md:text-2xl text-pit-accent">{{ q.quote.id }}</span>
          <button @click="copyId" class="pit-btn-ghost !p-2 !rounded-lg" title="Copiar">
            <svg v-if="!copied" viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
            <svg v-else viewBox="0 0 24 24" class="w-4 h-4 text-pit-accentLight" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </div>
      </div>
      <div class="text-right">
        <p class="text-[11px] uppercase tracking-widest text-pit-muted">Fecha</p>
        <p class="pit-display text-lg md:text-xl mt-1">{{ q.formatFechaLarga(q.quote.fecha) }}</p>
      </div>
    </div>

    <h2 class="pit-display text-3xl md:text-4xl mb-1">Datos del Cliente</h2>
    <p class="text-pit-muted text-sm mb-6">Información básica para identificar la cotización.</p>

    <form @submit.prevent="handleSubmit" novalidate class="space-y-5">
      <!-- Card 1: Persona -->
      <div class="pit-card p-5 md:p-6">
        <h3 class="text-pit-muted text-xs uppercase tracking-widest mb-4">Persona</h3>
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="pit-label">Nombre <span class="text-pit-accent">*</span></label>
            <input v-model="c.nombre" type="text" class="pit-input" :class="{ invalid: submitted && errors.nombre }" placeholder="Juan" autocomplete="given-name" />
          </div>
          <div>
            <label class="pit-label">Apellido <span class="text-pit-accent">*</span></label>
            <input v-model="c.apellido" type="text" class="pit-input" :class="{ invalid: submitted && errors.apellido }" placeholder="Pérez" autocomplete="family-name" />
          </div>
          <div>
            <label class="pit-label">Teléfono</label>
            <input v-model="c.telefono" type="tel" class="pit-input" placeholder="+56 9 1234 5678" autocomplete="tel" />
          </div>
          <div>
            <label class="pit-label">Email</label>
            <input v-model="c.email" type="email" class="pit-input" placeholder="cliente@email.com" autocomplete="email" />
          </div>
        </div>
      </div>

      <!-- Card 2: Vehículo -->
      <div class="pit-card p-5 md:p-6">
        <h3 class="text-pit-muted text-xs uppercase tracking-widest mb-4">Vehículo</h3>
        <div class="grid md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="pit-label">Patente <span class="text-pit-accent">*</span></label>
            <div class="relative">
              <input v-model="c.patente" type="text" class="pit-input pit-display tracking-widest text-lg" :class="{ invalid: submitted && errors.patente }" placeholder="AB-CD-12 o AB-12-34" maxlength="8" inputmode="text" autocapitalize="characters" />
              <span v-if="lookupLoading" class="absolute right-3 top-1/2 -translate-y-1/2">
                <svg viewBox="0 0 24 24" class="w-4 h-4 animate-spin text-pit-accent" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.2-8.5" />
                </svg>
              </span>
            </div>

            <!-- Banner cliente recurrente -->
            <Transition name="modal">
              <div
                v-if="lookupResult?.found && lookupBanner === 'available'"
                class="mt-3 rounded-xl p-3 border flex flex-wrap items-center gap-3"
                style="background: rgba(232,93,4,0.08); border-color: rgba(232,93,4,0.3);"
              >
                <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                     style="background: rgba(232,93,4,0.15); border: 1px solid rgba(232,93,4,0.3);">
                  <svg viewBox="0 0 24 24" class="w-4 h-4 text-pit-accentLight" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium">
                    Cliente recurrente
                    <span class="text-pit-muted ml-1">· {{ lookupResult.quoteCount }} {{ lookupResult.quoteCount === 1 ? 'cotización previa' : 'cotizaciones previas' }}</span>
                  </p>
                  <p class="text-xs text-pit-muted truncate">
                    {{ q.titleCase((lookupResult.cliente?.nombre || '') + ' ' + (lookupResult.cliente?.apellido || '')) }}
                    <span v-if="lookupResult.lastQuoteFecha" class="ml-1">· Última: {{ fmtFecha(lookupResult.lastQuoteFecha) }}</span>
                  </p>
                </div>
                <div class="flex gap-2 shrink-0">
                  <button type="button" class="pit-btn-ghost !px-3 !py-1.5 text-xs" @click="dismissLookup">Ignorar</button>
                  <button type="button" class="pit-btn-primary !px-3 !py-1.5 text-xs" @click="applyLookup">Cargar datos</button>
                </div>
              </div>
            </Transition>
            <Transition name="modal">
              <p
                v-if="lookupBanner === 'loaded'"
                class="mt-2 text-xs text-emerald-400 flex items-center gap-1"
              >
                <svg viewBox="0 0 24 24" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Datos cargados desde cotización previa
              </p>
            </Transition>
          </div>
          <div>
            <label class="pit-label">Marca</label>
            <input v-model="c.marca" type="text" class="pit-input" placeholder="Toyota, Chevrolet, etc." />
          </div>
          <div>
            <label class="pit-label">Modelo</label>
            <input v-model="c.modelo" type="text" class="pit-input" placeholder="Corolla, Onix, etc." />
          </div>
          <div>
            <label class="pit-label">Año</label>
            <input v-model="c.anio" type="number" min="1950" max="2099" class="pit-input" placeholder="2018" />
          </div>
        </div>
      </div>

      <!-- Validation summary -->
      <div v-if="submitted && !isValid" class="text-sm text-red-300/90 bg-red-950/40 border border-red-800/40 rounded-xl p-3">
        Completa los campos requeridos: Nombre, Apellido y Patente.
      </div>

      <!-- Submit -->
      <button type="submit" class="pit-btn-primary w-full text-lg py-4">
        Continuar
        <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </button>
    </form>
  </section>
</template>
