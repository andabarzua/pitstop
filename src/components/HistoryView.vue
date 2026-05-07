<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuote } from '../composables/useQuote.js'
import { useAuth } from '../composables/useAuth.js'

const emit = defineEmits(['close', 'loaded', 'toast'])
const q = useQuote()
const auth = useAuth()

const search = ref('')
const confirmDeleteId = ref(null)

const filtered = computed(() => {
  const s = search.value.trim().toLowerCase()
  if (!s) return q.cloudState.list
  return q.cloudState.list.filter(item => {
    const blob = `${item.id} ${item.cliente_nombre || ''} ${item.cliente_apellido || ''} ${item.patente || ''}`.toLowerCase()
    return blob.includes(s)
  })
})

async function refresh() {
  try {
    await q.cloudList()
  } catch (e) {
    if (String(e.message).toLowerCase().includes('password')) {
      auth.logout()
      emit('toast', 'Sesión expirada, ingresa la password de nuevo', 'error')
      emit('close')
    } else {
      emit('toast', e.message || 'Error al cargar historial', 'error')
    }
  }
}

async function open(item) {
  try {
    await q.cloudLoad(item.id)
    emit('loaded')
  } catch (e) {
    emit('toast', e.message || 'No se pudo cargar', 'error')
  }
}

async function doDelete(id) {
  try {
    await q.cloudDelete(id)
    emit('toast', 'Cotización eliminada', 'success')
    confirmDeleteId.value = null
  } catch (e) {
    emit('toast', e.message || 'No se pudo eliminar', 'error')
  }
}

function fmtDate(v) {
  if (!v) return ''
  try {
    return new Date(v).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch (e) {
    return String(v).slice(0, 10)
  }
}

onMounted(() => { refresh() })
</script>

<template>
  <Transition name="modal">
    <div class="fixed inset-0 z-40 flex items-stretch md:items-center justify-center bg-black/70 backdrop-blur-sm"
         @click.self="emit('close')">
      <div class="modal-panel relative bg-pit-bg border border-pit-border w-full md:max-w-3xl md:rounded-2xl md:my-8 max-h-screen md:max-h-[88vh] flex flex-col overflow-hidden shadow-soft">
        <!-- Header -->
        <div class="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-pit-border bg-pit-surface/60">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center"
               style="background: rgba(232,93,4,0.12); border: 1px solid rgba(232,93,4,0.25);">
            <svg viewBox="0 0 24 24" class="w-5 h-5 text-pit-accentLight" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3h18v4H3zM3 11h18v10H3zM7 7v4M17 7v4" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="pit-display text-2xl leading-none">Historial</h2>
            <p class="text-xs text-pit-muted mt-1">Cotizaciones guardadas en cloud</p>
          </div>
          <button class="pit-btn-ghost !p-2 !rounded-lg" @click="refresh" title="Refrescar">
            <svg viewBox="0 0 24 24" class="w-4 h-4" :class="{ 'animate-spin': q.cloudState.loadingList }" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5" />
            </svg>
          </button>
          <button class="pit-btn-ghost !p-2 !rounded-lg" @click="emit('close')" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Search -->
        <div class="px-4 md:px-6 py-3 border-b border-pit-border">
          <div class="relative">
            <svg viewBox="0 0 24 24" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pit-muted pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              v-model="search"
              type="text"
              class="pit-input pl-10"
              placeholder="Buscar por nombre, patente o N° cotización..."
            />
          </div>
        </div>

        <!-- List -->
        <div class="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          <div v-if="q.cloudState.loadingList && !q.cloudState.list.length" class="text-center text-pit-muted text-sm py-12">
            Cargando…
          </div>

          <div v-else-if="!filtered.length && !search" class="text-center py-12">
            <div class="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                 style="background: rgba(232,93,4,0.12); border: 1px solid rgba(232,93,4,0.25);">
              <svg viewBox="0 0 24 24" class="w-5 h-5 text-pit-accentLight" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 3h18v4H3zM3 11h18v10H3z" />
              </svg>
            </div>
            <p class="pit-display text-xl">Sin cotizaciones aún</p>
            <p class="text-pit-muted text-sm mt-1">Genera una cotización y usa "Guardar en historial".</p>
          </div>

          <div v-else-if="!filtered.length" class="text-center text-pit-muted text-sm py-12">
            No hay coincidencias para "{{ search }}".
          </div>

          <ul v-else class="space-y-2">
            <li
              v-for="item in filtered"
              :key="item.id"
              class="pit-card p-4 transition-all duration-200"
              :class="confirmDeleteId === item.id ? 'border-red-700/60 bg-red-950/30' : 'hover:border-pit-borderHover'"
            >
              <template v-if="confirmDeleteId !== item.id">
                <div class="flex flex-wrap items-start gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-baseline gap-2">
                      <span class="pit-display text-pit-accent text-lg">{{ item.id }}</span>
                      <span class="text-xs text-pit-muted">{{ fmtDate(item.fecha) }}</span>
                    </div>
                    <p class="text-sm mt-1 truncate">
                      <span class="font-medium">{{ q.titleCase((item.cliente_nombre || '') + ' ' + (item.cliente_apellido || '')) }}</span>
                      <span v-if="item.patente" class="text-pit-muted ml-2 pit-display tracking-widest">{{ item.patente }}</span>
                    </p>
                    <p class="text-xs text-pit-muted mt-0.5 capitalize">
                      {{ item.item_count }} {{ item.item_count === 1 ? 'Item' : 'Items' }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="pit-display text-xl text-pit-accentLight">{{ q.formatCLP(item.total) }}</p>
                  </div>
                </div>
                <div class="flex gap-2 mt-3 justify-end">
                  <button class="pit-btn-ghost !px-3 !py-1.5 text-xs hover:!text-red-400" @click="confirmDeleteId = item.id">
                    <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                    Eliminar
                  </button>
                  <button class="pit-btn-primary !px-3 !py-1.5 text-xs" @click="open(item)">
                    Abrir
                    <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </template>
              <template v-else>
                <p class="text-sm text-red-200/90 mb-3">¿Eliminar la cotización <span class="font-semibold">{{ item.id }}</span>?</p>
                <p class="text-xs text-pit-muted mb-3">Esta acción no se puede deshacer.</p>
                <div class="flex gap-2">
                  <button class="pit-btn-ghost flex-1" @click="confirmDeleteId = null">Cancelar</button>
                  <button class="pit-btn-danger flex-1" @click="doDelete(item.id)">Confirmar eliminación</button>
                </div>
              </template>
            </li>
          </ul>
        </div>

        <!-- Footer -->
        <div class="px-4 md:px-6 py-3 border-t border-pit-border bg-pit-surface/60 flex items-center justify-between text-xs text-pit-muted">
          <span class="capitalize">{{ q.cloudState.list.length }} {{ q.cloudState.list.length === 1 ? 'Cotización' : 'Cotizaciones' }}</span>
          <button class="text-pit-muted hover:text-pit-text transition-colors" @click="auth.logout(); emit('close')">
            Cerrar sesión cloud
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
