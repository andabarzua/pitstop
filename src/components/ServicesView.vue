<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useQuote } from '../composables/useQuote.js'
import { useAuth } from '../composables/useAuth.js'

const emit = defineEmits(['close', 'toast'])
const q = useQuote()
const auth = useAuth()

const search = ref('')
const editing = ref(null) // null o { id, descripcion, precio_unitario }
const editDesc = ref('')
const editPrecio = ref(0)
const submitted = ref(false)
const saving = ref(false)
const descRef = ref(null)
const confirmDeleteId = ref(null)

const filtered = computed(() => {
  const s = search.value.trim().toLowerCase()
  if (!s) return q.servicesState.list
  return q.servicesState.list.filter(it =>
    String(it.descripcion).toLowerCase().includes(s)
  )
})

const isValid = computed(() => editDesc.value.trim().length > 0 && Number(editPrecio.value) >= 0)

async function refresh() {
  try {
    await q.servicesList(true)
  } catch (e) {
    if (String(e.message).toLowerCase().includes('password')) {
      auth.logout()
      emit('toast', 'Sesión expirada, ingresa la password de nuevo', 'error')
      emit('close')
    } else {
      emit('toast', e.message || 'Error al cargar catálogo', 'error')
    }
  }
}

function startNew() {
  editing.value = { id: null, descripcion: '', precio_unitario: 0 }
  editDesc.value = ''
  editPrecio.value = 0
  submitted.value = false
  nextTick(() => descRef.value?.focus())
}

function startEdit(s) {
  editing.value = { ...s }
  editDesc.value = s.descripcion
  editPrecio.value = s.precio_unitario
  submitted.value = false
  nextTick(() => descRef.value?.focus())
}

function cancelEdit() {
  editing.value = null
  submitted.value = false
}

async function save() {
  submitted.value = true
  if (!isValid.value) return
  saving.value = true
  try {
    await q.servicesUpsert({
      id: editing.value?.id || undefined,
      descripcion: editDesc.value.trim(),
      precio_unitario: Math.max(0, Math.round(Number(editPrecio.value) || 0))
    })
    emit('toast', editing.value?.id ? 'Servicio actualizado' : 'Servicio agregado', 'success')
    editing.value = null
  } catch (e) {
    emit('toast', e.message || 'No se pudo guardar', 'error')
  } finally {
    saving.value = false
  }
}

async function doDelete(id) {
  try {
    await q.servicesDelete(id)
    emit('toast', 'Servicio eliminado', 'success')
    confirmDeleteId.value = null
  } catch (e) {
    emit('toast', e.message || 'No se pudo eliminar', 'error')
  }
}

onMounted(refresh)
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
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="pit-display text-2xl leading-none">Catálogo de Servicios</h2>
            <p class="text-xs text-pit-muted mt-1">Servicios frecuentes con precio sugerido</p>
          </div>
          <button class="pit-btn-ghost !p-2 !rounded-lg" @click="refresh" title="Refrescar">
            <svg viewBox="0 0 24 24" class="w-4 h-4" :class="{ 'animate-spin': q.servicesState.loading }" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/>
            </svg>
          </button>
          <button class="pit-btn-ghost !p-2 !rounded-lg" @click="emit('close')" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Search + add -->
        <div class="px-4 md:px-6 py-3 border-b border-pit-border flex flex-wrap gap-2">
          <div class="relative flex-1 min-w-[180px]">
            <svg viewBox="0 0 24 24" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pit-muted pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            <input v-model="search" type="text" class="pit-input pl-10" placeholder="Buscar servicio..." />
          </div>
          <button class="pit-btn-primary !px-4 !py-2 text-sm" @click="startNew" :disabled="!!editing">
            <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Nuevo Servicio
          </button>
        </div>

        <!-- Editor inline -->
        <div v-if="editing" class="px-4 md:px-6 py-4 border-b border-pit-border bg-pit-surface2/50">
          <div class="grid sm:grid-cols-[1fr,160px,auto] gap-3 items-end">
            <div>
              <label class="pit-label">Descripción</label>
              <input ref="descRef" v-model="editDesc" type="text" class="pit-input"
                     :class="{ invalid: submitted && !editDesc.trim() }"
                     placeholder="Ej: Cambio de aceite y filtro" />
            </div>
            <div>
              <label class="pit-label">Precio neto</label>
              <input v-model.number="editPrecio" type="number" min="0" step="100" class="pit-input pit-mono-num"
                     :class="{ invalid: submitted && Number(editPrecio) < 0 }" placeholder="0" />
            </div>
            <div class="flex gap-2">
              <button class="pit-btn-ghost !py-3" @click="cancelEdit">Cancelar</button>
              <button class="pit-btn-primary !py-3" @click="save" :disabled="saving">
                {{ saving ? '…' : (editing.id ? 'Guardar' : 'Agregar') }}
              </button>
            </div>
          </div>
        </div>

        <!-- List -->
        <div class="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          <div v-if="q.servicesState.loading && !q.servicesState.list.length" class="text-center text-pit-muted text-sm py-8">
            Cargando…
          </div>
          <div v-else-if="!filtered.length && !search" class="text-center py-12">
            <div class="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                 style="background: rgba(232,93,4,0.12); border: 1px solid rgba(232,93,4,0.25);">
              <svg viewBox="0 0 24 24" class="w-5 h-5 text-pit-accentLight" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              </svg>
            </div>
            <p class="pit-display text-xl">Catálogo vacío</p>
            <p class="text-pit-muted text-sm mt-1">Agrega servicios frecuentes para reutilizarlos al cotizar.</p>
          </div>
          <div v-else-if="!filtered.length" class="text-center text-pit-muted text-sm py-12">
            No hay coincidencias para "{{ search }}".
          </div>
          <ul v-else class="space-y-2">
            <li v-for="s in filtered" :key="s.id"
                class="pit-card p-3 transition-colors"
                :class="confirmDeleteId === s.id ? 'border-red-700/60 bg-red-950/30' : 'hover:border-pit-borderHover'"
            >
              <template v-if="confirmDeleteId !== s.id">
                <div class="flex items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-pit-text break-words">{{ s.descripcion }}</p>
                    <p class="text-xs text-pit-muted mt-0.5">{{ q.formatCLP(s.precio_unitario) }} <span class="text-pit-dim">neto</span></p>
                  </div>
                  <button class="pit-btn-ghost !p-2 !rounded-lg" @click="startEdit(s)" title="Editar" :disabled="!!editing">
                    <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button class="pit-btn-ghost !p-2 !rounded-lg hover:!text-red-400" @click="confirmDeleteId = s.id" title="Eliminar">
                    <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                  </button>
                </div>
              </template>
              <template v-else>
                <p class="text-sm text-red-200/90 mb-2">¿Eliminar "{{ s.descripcion }}"?</p>
                <div class="flex gap-2">
                  <button class="pit-btn-ghost flex-1 !py-1.5 text-xs" @click="confirmDeleteId = null">Cancelar</button>
                  <button class="pit-btn-danger flex-1 !py-1.5 text-xs" @click="doDelete(s.id)">Confirmar</button>
                </div>
              </template>
            </li>
          </ul>
        </div>

        <div class="px-4 md:px-6 py-3 border-t border-pit-border bg-pit-surface/60 text-xs text-pit-muted">
          {{ q.servicesState.list.length }} {{ q.servicesState.list.length === 1 ? 'servicio' : 'servicios' }}
        </div>
      </div>
    </div>
  </Transition>
</template>
