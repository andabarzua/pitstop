<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { useQuote } from '../composables/useQuote.js'
import PdfViewer from './PdfViewer.vue'

const emit = defineEmits(['back', 'reset', 'toast'])
const q = useQuote()

const previewUrl = ref('')
const showPreview = ref(false)
const loadingPreview = ref(false)

const fullName = computed(() => `${q.quote.cliente.nombre || ''} ${q.quote.cliente.apellido || ''}`.trim() || '—')
const vehicleStr = computed(() => {
  const c = q.quote.cliente
  return [c.marca, c.modelo, c.anio].filter(Boolean).join(' ') || '—'
})

function notify(msg, type = 'info') { emit('toast', msg, type) }

function onDownload() {
  try {
    q.downloadPdf()
    notify('PDF descargado correctamente', 'success')
  } catch (e) {
    notify('No se pudo generar el PDF', 'error')
  }
}

function onPreview() {
  loadingPreview.value = true
  try {
    if (previewUrl.value) {
      try { URL.revokeObjectURL(previewUrl.value) } catch (e) {}
    }
    previewUrl.value = q.getPdfBlobUrl()
    showPreview.value = true
    setTimeout(() => { loadingPreview.value = false }, 200)
  } catch (e) {
    loadingPreview.value = false
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

function onSaveJson() {
  try {
    q.downloadJson()
    notify('Archivo .json descargado', 'success')
  } catch (e) {
    notify('No se pudo guardar el archivo', 'error')
  }
}

onBeforeUnmount(() => {
  if (previewUrl.value) {
    try { URL.revokeObjectURL(previewUrl.value) } catch (e) {}
  }
})
</script>

<template>
  <section class="animate-fade-in">
    <h2 class="pit-display text-3xl md:text-4xl mb-1">Finalizar y Exportar</h2>
    <p class="text-pit-muted text-sm mb-6">Revisa el resumen antes de generar el documento.</p>

    <!-- Summary card -->
    <div class="pit-card p-5 md:p-6 mb-6"
         style="background: linear-gradient(160deg, #1C1C1C, #141414);">
      <div class="flex flex-wrap items-start gap-4">
        <div class="flex-1 min-w-[180px]">
          <p class="text-[11px] uppercase tracking-widest text-pit-muted">Cotización</p>
          <p class="pit-display text-2xl md:text-3xl text-pit-accent">{{ q.quote.id }}</p>
          <p class="text-pit-muted text-xs mt-1">{{ q.formatFechaLarga(q.quote.fecha) }}</p>
        </div>
        <div class="text-right">
          <p class="text-[11px] uppercase tracking-widest text-pit-muted">Total</p>
          <p class="pit-display text-3xl md:text-4xl text-pit-accentLight">{{ q.formatCLP(q.total.value) }}</p>
          <p class="text-pit-muted text-xs mt-1">{{ q.itemCount.value }} {{ q.itemCount.value === 1 ? 'item' : 'items' }}</p>
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

    <!-- Save as editable JSON -->
    <div class="mt-4">
      <button class="pit-btn-ghost w-full py-3" @click="onSaveJson" :disabled="q.itemCount.value === 0">
        <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        Guardar como archivo editable (.json)
      </button>
    </div>

    <!-- Preview area -->
    <Transition name="modal">
      <div v-if="showPreview" class="mt-6">
        <PdfViewer :url="previewUrl" @close="showPreview = false" />
      </div>
    </Transition>

    <!-- Footer actions -->
    <div class="mt-8 flex flex-col sm:flex-row gap-3">
      <button class="pit-btn-ghost flex-1" @click="emit('back')">
        <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Editar Cotización
      </button>
      <button class="pit-btn-ghost flex-1" @click="emit('reset')">
        <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nueva Cotización
      </button>
    </div>
  </section>
</template>
