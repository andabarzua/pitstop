<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  url: { type: String, default: '' }
})
const emit = defineEmits(['close'])

const loaded = ref(false)
const lastUrl = ref('')

watch(() => props.url, (val) => {
  loaded.value = false
  if (lastUrl.value && lastUrl.value !== val) {
    try { URL.revokeObjectURL(lastUrl.value) } catch (e) {}
  }
  lastUrl.value = val
})

onBeforeUnmount(() => {
  if (lastUrl.value) {
    try { URL.revokeObjectURL(lastUrl.value) } catch (e) {}
  }
})
</script>

<template>
  <div class="pit-card overflow-hidden animate-slide-down">
    <div class="flex items-center justify-between px-4 py-3 border-b border-pit-border">
      <div class="flex items-center gap-2 text-sm">
        <svg viewBox="0 0 24 24" class="w-4 h-4 text-pit-accentLight" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
        <span class="font-medium tracking-wide">Vista previa de la cotización</span>
      </div>
      <button class="pit-btn-ghost !p-2 !rounded-lg" @click="emit('close')" aria-label="Cerrar">
        <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
    <div class="bg-neutral-900 relative" style="height: min(72vh, 760px);">
      <iframe
        v-if="url"
        :src="url"
        class="w-full h-full border-0 bg-white"
        title="Cotización PDF"
        @load="loaded = true"
      ></iframe>
      <div v-if="url && !loaded" class="absolute inset-0 flex items-center justify-center text-pit-muted text-sm">
        Generando vista previa…
      </div>
    </div>
  </div>
</template>
