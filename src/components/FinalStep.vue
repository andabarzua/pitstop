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
          <p class="text-[11px] uppercase tracking-widest text-pit-muted">Total c/IVA</p>
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

      <!-- Share -->
      <button
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
        <p class="text-pit-muted text-sm mt-1">WhatsApp, Email u otras apps.</p>
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
