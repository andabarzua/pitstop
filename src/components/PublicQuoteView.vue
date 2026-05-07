<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuote } from '../composables/useQuote.js'

const props = defineProps({
  quoteId: { type: String, required: true }
})

const q = useQuote()
const loading = ref(true)
const error = ref('')
const data = ref(null)

const fmtFecha = (iso) => {
  if (!iso) return ''
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch (e) { return iso }
}

const subtotal = computed(() => {
  if (!data.value) return 0
  return data.value.items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0), 0)
})
const iva = computed(() => Math.round(subtotal.value * 0.19))
const total = computed(() => subtotal.value + iva.value)

const fullName = computed(() => {
  if (!data.value) return ''
  const c = data.value.cliente
  return q.titleCase(`${c.nombre || ''} ${c.apellido || ''}`.trim())
})

const vehicleStr = computed(() => {
  if (!data.value) return ''
  const c = data.value.cliente
  const parts = [c.marca, c.modelo].filter(Boolean).map(p => q.titleCase(p))
  if (c.anio) parts.push(String(c.anio))
  return parts.join(' ')
})

async function loadQuote() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`/api/public/quote/${encodeURIComponent(props.quoteId)}`)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j?.error || 'Cotización no encontrada')
    }
    data.value = await res.json()
    // También la cargamos al estado global para poder generar PDF
    q.loadFromJson(data.value)
  } catch (e) {
    error.value = e.message || 'No se pudo cargar la cotización'
  } finally {
    loading.value = false
  }
}

function downloadPdf() {
  try {
    q.downloadPdf()
  } catch (e) {
    error.value = 'No se pudo generar el PDF'
  }
}

const phoneLink = computed(() => {
  if (!data.value?.cliente?.telefono) return ''
  return `tel:+56981213326`
})

const waContact = computed(() => `https://wa.me/56981213326?text=${encodeURIComponent('Hola PitStop, tengo una consulta sobre la cotización ' + (data.value?.id || ''))}`)

onMounted(loadQuote)
</script>

<template>
  <div class="min-h-screen bg-pit-bg text-pit-text">
    <!-- Background ambient -->
    <div aria-hidden="true" class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div class="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full"
           style="background: radial-gradient(closest-side, rgba(232,93,4,0.18), transparent 70%);"></div>
      <div class="absolute -bottom-60 -left-40 w-[520px] h-[520px] rounded-full"
           style="background: radial-gradient(closest-side, rgba(244,140,6,0.10), transparent 70%);"></div>
    </div>

    <!-- Mini brand bar -->
    <div class="max-w-3xl mx-auto px-4 md:px-6 py-4 flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
           style="background: linear-gradient(135deg, #E85D04, #B14302); box-shadow: 0 6px 18px rgba(232,93,4,0.35);">
        <svg viewBox="0 0 24 24" class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </div>
      <span class="pit-display text-xl">Pit<span class="text-pit-accent">Stop</span></span>
    </div>

    <main class="max-w-3xl mx-auto px-4 md:px-6 pb-24">
      <!-- Loading -->
      <div v-if="loading" class="pit-card p-12 text-center">
        <svg viewBox="0 0 24 24" class="w-6 h-6 mx-auto animate-spin text-pit-accentLight" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-6.2-8.5" />
        </svg>
        <p class="text-pit-muted text-sm mt-3">Cargando cotización…</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="pit-card p-8 text-center">
        <div class="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
             style="background: rgba(220,38,38,0.15); border: 1px solid rgba(220,38,38,0.3);">
          <svg viewBox="0 0 24 24" class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <p class="pit-display text-xl mb-1">No encontramos la cotización</p>
        <p class="text-pit-muted text-sm">{{ error }}</p>
      </div>

      <!-- Document -->
      <article v-else-if="data" class="space-y-4 animate-fade-in">
        <!-- Title card -->
        <div class="pit-card p-6 md:p-8" style="background: linear-gradient(160deg, #1C1C1C, #141414);">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-[11px] uppercase tracking-widest text-pit-muted">Cotización</p>
              <p class="pit-display text-3xl md:text-4xl text-pit-accent mt-1">{{ data.id }}</p>
              <p class="text-pit-muted text-sm mt-1">{{ fmtFecha(data.fecha) }}</p>
            </div>
            <div class="text-right">
              <p class="text-[11px] uppercase tracking-widest text-pit-muted">Total</p>
              <p class="pit-display text-4xl md:text-5xl text-pit-accentLight mt-1">{{ q.formatCLP(total) }}</p>
            </div>
          </div>
        </div>

        <!-- Cliente -->
        <section class="pit-card overflow-hidden">
          <div class="px-4 md:px-5 py-2.5 text-white text-xs font-bold uppercase tracking-widest"
               style="background: linear-gradient(135deg, #E85D04, #B14302);">
            Información del cliente
          </div>
          <div class="p-4 md:p-5 grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p class="text-[11px] uppercase tracking-widest text-pit-muted mb-1">Nombre</p>
              <p class="font-medium">{{ fullName }}</p>
            </div>
            <div v-if="data.cliente.telefono">
              <p class="text-[11px] uppercase tracking-widest text-pit-muted mb-1">Teléfono</p>
              <p class="font-medium">{{ data.cliente.telefono }}</p>
            </div>
            <div v-if="data.cliente.email">
              <p class="text-[11px] uppercase tracking-widest text-pit-muted mb-1">Email</p>
              <p class="font-medium break-all">{{ data.cliente.email }}</p>
            </div>
            <div v-if="data.cliente.patente">
              <p class="text-[11px] uppercase tracking-widest text-pit-muted mb-1">Patente</p>
              <p class="font-medium pit-display tracking-widest text-base">{{ (data.cliente.patente || '').toUpperCase() }}</p>
            </div>
            <div v-if="vehicleStr" class="sm:col-span-2">
              <p class="text-[11px] uppercase tracking-widest text-pit-muted mb-1">Vehículo</p>
              <p class="font-medium">{{ vehicleStr }}</p>
            </div>
          </div>
        </section>

        <!-- Items -->
        <section class="pit-card overflow-hidden">
          <div class="px-4 md:px-5 py-2.5 text-white text-xs font-bold uppercase tracking-widest"
               style="background: linear-gradient(135deg, #E85D04, #B14302);">
            Detalle de servicios
          </div>

          <!-- Mobile cards -->
          <ul class="md:hidden divide-y divide-pit-border">
            <li v-for="(it, idx) in data.items" :key="it.id || idx" class="p-4 flex items-start gap-3">
              <span class="pit-display text-pit-dim text-sm w-5 mt-0.5">{{ idx + 1 }}</span>
              <div class="flex-1 min-w-0">
                <p class="font-medium break-words">{{ it.descripcion }}</p>
                <p class="text-xs text-pit-muted mt-0.5">{{ it.cantidad }} × {{ q.formatCLP(it.precioUnitario) }}</p>
              </div>
              <span class="pit-display text-pit-accentLight whitespace-nowrap">
                {{ q.formatCLP(it.cantidad * it.precioUnitario) }}
              </span>
            </li>
          </ul>

          <!-- Desktop table -->
          <table class="hidden md:table w-full text-sm">
            <thead>
              <tr class="text-left text-[10px] uppercase tracking-widest text-pit-muted border-b border-pit-border">
                <th class="px-5 py-2.5 w-10">#</th>
                <th class="px-5 py-2.5">Descripción</th>
                <th class="px-5 py-2.5 w-20 text-center">Cant.</th>
                <th class="px-5 py-2.5 w-32 text-right">Precio</th>
                <th class="px-5 py-2.5 w-32 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(it, idx) in data.items" :key="it.id || idx" class="border-b border-pit-border/50 last:border-0">
                <td class="px-5 py-3 pit-display text-pit-dim">{{ idx + 1 }}</td>
                <td class="px-5 py-3">{{ it.descripcion }}</td>
                <td class="px-5 py-3 text-center pit-mono-num">{{ it.cantidad }}</td>
                <td class="px-5 py-3 text-right pit-mono-num text-pit-muted">{{ q.formatCLP(it.precioUnitario) }}</td>
                <td class="px-5 py-3 text-right pit-display text-pit-accentLight">{{ q.formatCLP(it.cantidad * it.precioUnitario) }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Totales -->
        <section class="pit-card p-5 md:p-6">
          <div class="flex justify-end">
            <div class="w-full sm:w-72 space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-pit-muted">Subtotal</span>
                <span class="pit-mono-num">{{ q.formatCLP(subtotal) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-pit-muted">IVA 19%</span>
                <span class="pit-mono-num">{{ q.formatCLP(iva) }}</span>
              </div>
              <div class="pit-divider"></div>
              <div class="rounded-lg px-4 py-3 flex items-center justify-between"
                   style="background: linear-gradient(135deg, #B14302, #E85D04);">
                <span class="text-sm font-semibold tracking-wider uppercase">Total</span>
                <span class="pit-display text-2xl">{{ q.formatCLP(total) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Observaciones -->
        <section v-if="data.observaciones && data.observaciones.trim()" class="pit-card overflow-hidden">
          <div class="px-4 md:px-5 py-2.5 text-white text-xs font-bold uppercase tracking-widest"
               style="background: linear-gradient(135deg, #E85D04, #B14302);">
            Observaciones del vehículo
          </div>
          <div class="p-4 md:p-5 text-sm whitespace-pre-wrap break-words">
            {{ data.observaciones }}
          </div>
        </section>

        <!-- Detalles de pago -->
        <section class="pit-card overflow-hidden">
          <div class="px-4 md:px-5 py-2.5 text-white text-xs font-bold uppercase tracking-widest"
               style="background: linear-gradient(135deg, #E85D04, #B14302);">
            Detalles de pago
          </div>
          <div class="p-4 md:p-5 grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p class="text-[11px] uppercase tracking-widest text-pit-muted mb-1">Forma de pago</p>
              <p class="font-medium">Transferencia bancaria</p>
            </div>
            <div>
              <p class="text-[11px] uppercase tracking-widest text-pit-muted mb-1">Validez</p>
              <p class="font-medium">15 días corridos</p>
            </div>
          </div>
        </section>

        <!-- Acciones -->
        <div class="grid sm:grid-cols-2 gap-3 pt-2">
          <button class="pit-btn-primary py-4 text-base" @click="downloadPdf">
            <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M12 18v-6M9 15l3 3 3-3" />
            </svg>
            Descargar PDF
          </button>
          <a
            :href="waContact"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-center gap-2 px-5 py-4 rounded-xl font-semibold text-white border border-pit-border hover:border-pit-borderHover transition-all duration-200"
            style="background: rgba(37,211,102,0.12);"
          >
            <svg viewBox="0 0 24 24" class="w-5 h-5" fill="#25D366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488"/>
            </svg>
            Contactar al taller
          </a>
        </div>

        <!-- Footer -->
        <p class="text-center text-xs text-pit-muted pt-6">
          PitStop · Servicios Automotrices · <span class="text-pit-accent">+56 9 8121 3326</span>
        </p>
      </article>
    </main>
  </div>
</template>
