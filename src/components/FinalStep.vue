<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useQuote } from '../composables/useQuote.js'
import { useAuth } from '../composables/useAuth.js'
import PdfViewer from './PdfViewer.vue'
import PasswordGate from './PasswordGate.vue'

const emit = defineEmits(['back', 'edit-client', 'reset', 'toast'])
const q = useQuote()
const auth = useAuth()

const showGate = ref(false)
const cloudStatus = ref('idle') // idle | saving | saved | error | needsAuth

const previewUrl = ref('')
const showPreview = ref(false)

const fullName = computed(() => {
  const raw = `${q.quote.cliente.nombre || ''} ${q.quote.cliente.apellido || ''}`.trim()
  return raw ? q.titleCase(raw) : '—'
})
const vehicleStr = computed(() => {
  const c = q.quote.cliente
  const parts = [c.marca, c.modelo].filter(Boolean).map(p => q.titleCase(p))
  if (c.anio) parts.push(String(c.anio))
  return parts.join(' ') || '—'
})

function notify(msg, type = 'info') { emit('toast', msg, type) }

async function autoSave() {
  if (q.itemCount.value === 0) return
  if (!auth.isAuthenticated.value) {
    cloudStatus.value = 'needsAuth'
    showGate.value = true
    return
  }
  cloudStatus.value = 'saving'
  try {
    await q.cloudSave()
    cloudStatus.value = 'saved'
  } catch (e) {
    if (String(e.message).toLowerCase().includes('password')) {
      auth.logout()
      cloudStatus.value = 'needsAuth'
      showGate.value = true
    } else {
      cloudStatus.value = 'error'
      notify(e.message || 'No se pudo guardar en historial', 'error')
    }
  }
}

function onGateSuccess() {
  showGate.value = false
  autoSave()
}

function onGateClose() {
  showGate.value = false
  if (cloudStatus.value === 'needsAuth') {
    cloudStatus.value = 'error'
  }
}

function onDownload() {
  try {
    q.downloadPdf()
    notify('PDF descargado correctamente', 'success')
  } catch (e) {
    notify('No se pudo generar el PDF', 'error')
  }
}

function onPreview() {
  try {
    if (previewUrl.value) {
      try { URL.revokeObjectURL(previewUrl.value) } catch (e) {}
    }
    previewUrl.value = q.getPdfBlobUrl()
    showPreview.value = true
  } catch (e) {
    notify('No se pudo previsualizar', 'error')
  }
}

const hasPhone = computed(() => !!q.quote.cliente.telefono)

const waUrl = computed(() => {
  if (!hasPhone.value) return ''
  const phone = q.normalizePhoneCL(q.quote.cliente.telefono)
  if (!phone) return ''
  const nombre = q.titleCase(q.quote.cliente.nombre || '')
  const patente = (q.quote.cliente.patente || '').toUpperCase()
  const veh = vehicleStr.value !== '—' ? vehicleStr.value : 'tu vehículo'
  const link = q.buildShareUrl()
  const lines = [
    `Hola ${nombre || ''}, te paso la cotización ${q.quote.id} por ${veh}${patente ? ' ' + patente : ''}.`,
    '',
    `Total: ${q.formatCLP(q.total.value)}`,
    '',
    `Verla y descargar PDF: ${link}`
  ].join('\n')
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`
})

function onWhatsApp() {
  if (!waUrl.value) {
    notify('El cliente no tiene teléfono guardado', 'error')
    return
  }
  window.open(waUrl.value, '_blank', 'noopener,noreferrer')
}

async function onShare() {
  try {
    const blob = await q.getPdfBlob()
    const file = new File([blob], `${q.quote.id}.pdf`, { type: 'application/pdf' })
    const shareUrl = q.buildShareUrl()
    const shareText = `Cotización ${q.quote.id} — PitStop`

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: shareText,
        text: shareText,
        files: [file]
      })
      notify('Compartido', 'success')
      return
    }

    if (navigator.share) {
      await navigator.share({ title: shareText, text: shareText, url: shareUrl })
      notify('Compartido', 'success')
      return
    }

    await navigator.clipboard.writeText(shareUrl)
    notify('Link copiado al portapapeles', 'success')
  } catch (e) {
    if (e?.name === 'AbortError') return
    try {
      await navigator.clipboard.writeText(q.buildShareUrl())
      notify('Link copiado al portapapeles', 'success')
    } catch (err) {
      notify('No se pudo compartir', 'error')
    }
  }
}

onMounted(() => {
  autoSave()
})

onBeforeUnmount(() => {
  if (previewUrl.value) {
    try { URL.revokeObjectURL(previewUrl.value) } catch (e) {}
  }
})
</script>

<template>
  <section class="animate-fade-in">
    <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h2 class="pit-display text-3xl md:text-4xl mb-1">Finalizar y Exportar</h2>
        <p class="text-pit-muted text-sm">La cotización se guarda automáticamente en tu historial.</p>
      </div>
      <div class="flex gap-2">
        <button class="pit-btn-ghost !px-3 !py-2 text-sm" @click="emit('edit-client')" title="Editar datos del cliente">
          <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span class="hidden sm:inline">Cliente</span>
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border"
          style="background: rgba(232,93,4,0.12); border-color: rgba(232,93,4,0.4); color: #F48C06;"
          @click="emit('back')"
        >
          <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Editar
        </button>
      </div>
    </div>

    <!-- Summary card -->
    <div class="pit-card p-5 md:p-6 mb-6"
         style="background: linear-gradient(160deg, #1C1C1C, #141414);">
      <div class="flex flex-wrap items-start gap-4">
        <div class="flex-1 min-w-[180px]">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="text-[11px] uppercase tracking-widest text-pit-muted">Cotización</p>
            <!-- Cloud status chip -->
            <span
              v-if="cloudStatus === 'saving'"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium"
              style="background: rgba(232,93,4,0.15); color: #F48C06; border: 1px solid rgba(232,93,4,0.3);"
            >
              <svg viewBox="0 0 24 24" class="w-3 h-3 animate-spin" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-6.2-8.5" />
              </svg>
              Guardando
            </span>
            <span
              v-else-if="cloudStatus === 'saved'"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium"
              style="background: rgba(16,185,129,0.15); color: #6EE7B7; border: 1px solid rgba(16,185,129,0.3);"
            >
              <svg viewBox="0 0 24 24" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Guardada
            </span>
            <button
              v-else-if="cloudStatus === 'error' || cloudStatus === 'needsAuth'"
              @click="autoSave"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium transition-colors"
              style="background: rgba(220,38,38,0.15); color: #FCA5A5; border: 1px solid rgba(220,38,38,0.3);"
              title="Reintentar"
            >
              <svg viewBox="0 0 24 24" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5" />
              </svg>
              No guardada · Reintentar
            </button>
          </div>
          <p class="pit-display text-2xl md:text-3xl text-pit-accent mt-1">{{ q.quote.id }}</p>
          <p class="text-pit-muted text-xs mt-1">{{ q.formatFechaLarga(q.quote.fecha) }}</p>
        </div>
        <div class="text-right">
          <p class="text-[11px] uppercase tracking-widest text-pit-muted">Total</p>
          <p class="pit-display text-3xl md:text-4xl text-pit-accentLight">{{ q.formatCLP(q.total.value) }}</p>
          <p class="text-pit-muted text-xs mt-1">{{ q.itemCount.value }} {{ q.itemCount.value === 1 ? 'item' : 'items' }}</p>
        </div>
      </div>

      <div class="pit-divider my-5"></div>

      <!-- Totals breakdown -->
      <div class="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
        <div>
          <span class="text-[11px] uppercase tracking-widest text-pit-muted mr-2">Subtotal</span>
          <span class="pit-mono-num">{{ q.formatCLP(q.subtotal.value) }}</span>
        </div>
        <div>
          <span class="text-[11px] uppercase tracking-widest text-pit-muted mr-2">IVA 19%</span>
          <span class="pit-mono-num">{{ q.formatCLP(q.iva.value) }}</span>
        </div>
      </div>

      <div class="pit-divider my-5"></div>

      <div class="grid sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p class="text-[11px] uppercase tracking-widest text-pit-muted mb-1">Cliente</p>
          <p class="font-medium">{{ fullName }}</p>
          <p v-if="q.quote.cliente.telefono" class="text-pit-muted">{{ q.quote.cliente.telefono }}</p>
          <p v-if="q.quote.cliente.email" class="text-pit-muted">{{ q.quote.cliente.email }}</p>
        </div>
        <div>
          <p class="text-[11px] uppercase tracking-widest text-pit-muted mb-1">Vehículo</p>
          <p class="font-medium pit-display tracking-widest text-lg">{{ (q.quote.cliente.patente || '—').toUpperCase() }}</p>
          <p class="text-pit-muted">{{ vehicleStr }}</p>
        </div>
      </div>
    </div>

    <!-- Action cards -->
    <div class="grid md:grid-cols-3 gap-3 md:gap-4">
      <!-- Download -->
      <button
        @click="onDownload"
        class="pit-card hover-lift p-5 md:p-6 text-left group"
        :disabled="q.itemCount.value === 0"
      >
        <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-200"
             style="background: rgba(232,93,4,0.12); border: 1px solid rgba(232,93,4,0.25);">
          <svg viewBox="0 0 24 24" class="w-6 h-6 text-pit-accentLight" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M12 18v-6M9 15l3 3 3-3" />
          </svg>
        </div>
        <h3 class="pit-display text-xl">Descargar PDF</h3>
        <p class="text-pit-muted text-sm mt-1">Guarda la cotización en tu dispositivo.</p>
      </button>

      <!-- Preview -->
      <button
        @click="onPreview"
        class="pit-card hover-lift p-5 md:p-6 text-left group"
        :disabled="q.itemCount.value === 0"
      >
        <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-200"
             style="background: rgba(232,93,4,0.12); border: 1px solid rgba(232,93,4,0.25);">
          <svg viewBox="0 0 24 24" class="w-6 h-6 text-pit-accentLight" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <h3 class="pit-display text-xl">Ver Cotización</h3>
        <p class="text-pit-muted text-sm mt-1">Previsualiza antes de compartir.</p>
      </button>

      <!-- WhatsApp (si hay teléfono) -->
      <button
        v-if="hasPhone"
        @click="onWhatsApp"
        class="pit-card hover-lift p-5 md:p-6 text-left group"
        :disabled="q.itemCount.value === 0"
      >
        <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-200"
             style="background: rgba(37,211,102,0.15); border: 1px solid rgba(37,211,102,0.35);">
          <svg viewBox="0 0 24 24" class="w-6 h-6" fill="#25D366">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488"/>
          </svg>
        </div>
        <h3 class="pit-display text-xl">WhatsApp</h3>
        <p class="text-pit-muted text-sm mt-1 break-all">Enviar a {{ q.quote.cliente.telefono }}</p>
      </button>

      <!-- Share genérico (cuando no hay teléfono) -->
      <button
        v-else
        @click="onShare"
        class="pit-card hover-lift p-5 md:p-6 text-left group"
        :disabled="q.itemCount.value === 0"
      >
        <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-200"
             style="background: rgba(232,93,4,0.12); border: 1px solid rgba(232,93,4,0.25);">
          <svg viewBox="0 0 24 24" class="w-6 h-6 text-pit-accentLight" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
            <path d="M16 6l-4-4-4 4" />
            <path d="M12 2v14" />
          </svg>
        </div>
        <h3 class="pit-display text-xl">Compartir</h3>
        <p class="text-pit-muted text-sm mt-1">Email u otras apps.</p>
      </button>
    </div>

    <PasswordGate
      :open="showGate"
      title="Guardar en historial"
      message="Ingresa la password para guardar esta cotización en el cloud."
      @close="onGateClose"
      @success="onGateSuccess"
    />

    <!-- Preview area -->
    <Transition name="modal">
      <div v-if="showPreview" class="mt-6">
        <PdfViewer :url="previewUrl" @close="showPreview = false" />
      </div>
    </Transition>

    <!-- Footer: nueva cotización -->
    <div class="mt-8">
      <button class="pit-btn-ghost w-full py-3" @click="emit('reset')">
        <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nueva Cotización
      </button>
    </div>
  </section>
</template>
