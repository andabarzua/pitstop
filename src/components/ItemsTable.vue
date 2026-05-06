<script setup>
import { ref, computed } from 'vue'
import { useQuote } from '../composables/useQuote.js'
import AddItemModal from './AddItemModal.vue'

const emit = defineEmits(['next', 'back'])
const q = useQuote()

const modalOpen = ref(false)
const editing = ref(null)
const confirmDeleteId = ref(null)

function openAdd() {
  editing.value = null
  modalOpen.value = true
}
function openEdit(item) {
  editing.value = { ...item }
  modalOpen.value = true
}
function onSave(payload) {
  if (payload.id) q.updateItem(payload.id, payload)
  else q.addItem(payload)
  modalOpen.value = false
}
function askDelete(id) { confirmDeleteId.value = id }
function cancelDelete() { confirmDeleteId.value = null }
function confirmDelete(id) {
  q.removeItem(id)
  confirmDeleteId.value = null
}

const hasItems = computed(() => q.itemCount.value > 0)
</script>

<template>
  <section class="animate-fade-in">
    <!-- Title + summary -->
    <div class="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h2 class="pit-display text-3xl md:text-4xl leading-none">Items de Cotización</h2>
        <p class="text-pit-muted text-sm mt-1">
          <span class="pit-chip">{{ q.itemCount.value }} {{ q.itemCount.value === 1 ? 'item' : 'items' }}</span>
          <span class="ml-2">Total:
            <span class="pit-display text-pit-accentLight text-lg align-middle">{{ q.formatCLP(q.total.value) }}</span>
          </span>
        </p>
      </div>
      <div class="flex gap-2">
        <button class="pit-btn-ghost" @click="emit('back')">
          <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span class="hidden sm:inline">Atrás</span>
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!hasItems" class="pit-card p-10 text-center">
      <div class="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
           style="background: rgba(232,93,4,0.12); border: 1px solid rgba(232,93,4,0.25);">
        <svg viewBox="0 0 24 24" class="w-7 h-7 text-pit-accentLight" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7h18M3 12h18M3 17h12" />
        </svg>
      </div>
      <h3 class="pit-display text-2xl mb-1">Sin items todavía</h3>
      <p class="text-pit-muted text-sm mb-5">Agrega servicios, repuestos o mano de obra a esta cotización.</p>
      <button class="pit-btn-primary" @click="openAdd">
        <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Agregar primer item
      </button>
    </div>

    <!-- Mobile cards -->
    <div v-else class="md:hidden space-y-3">
      <TransitionGroup name="item" tag="div" class="space-y-3">
        <div
          v-for="(it, idx) in q.quote.items"
          :key="it.id"
          class="pit-card p-4 transition-all duration-200"
          :class="confirmDeleteId === it.id ? 'border-red-700/60 bg-red-950/30' : ''"
        >
          <template v-if="confirmDeleteId !== it.id">
            <div class="flex items-start gap-3">
              <span class="pit-display text-xl text-pit-dim w-6">{{ idx + 1 }}</span>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-pit-text break-words">{{ it.descripcion }}</p>
                <p class="text-xs text-pit-muted mt-1">
                  {{ it.cantidad }} × {{ q.formatCLP(it.precioUnitario) }}
                </p>
              </div>
              <span class="pit-display text-xl text-pit-accentLight whitespace-nowrap">
                {{ q.formatCLP(it.cantidad * it.precioUnitario) }}
              </span>
            </div>
            <div class="flex justify-end gap-2 mt-3">
              <button class="pit-btn-ghost !px-3 !py-1.5 text-xs" @click="openEdit(it)">
                <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Editar
              </button>
              <button class="pit-btn-ghost !px-3 !py-1.5 text-xs hover:!text-red-400" @click="askDelete(it.id)">
                <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
                Eliminar
              </button>
            </div>
          </template>
          <template v-else>
            <p class="text-sm text-red-200/90 mb-3">¿Eliminar este item?</p>
            <p class="text-xs text-pit-muted mb-4 break-words">{{ it.descripcion }}</p>
            <div class="flex gap-2">
              <button class="pit-btn-ghost flex-1" @click="cancelDelete">Cancelar</button>
              <button class="pit-btn-danger flex-1" @click="confirmDelete(it.id)">Confirmar</button>
            </div>
          </template>
        </div>
      </TransitionGroup>

      <!-- Total bar -->
      <div class="rounded-xl px-4 py-4 flex items-center justify-between"
           style="background: linear-gradient(135deg, #B14302, #E85D04);">
        <span class="text-sm font-semibold tracking-wider uppercase">Total</span>
        <span class="pit-display text-2xl">{{ q.formatCLP(q.total.value) }}</span>
      </div>
    </div>

    <!-- Desktop table -->
    <div v-if="hasItems" class="hidden md:block pit-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-pit-surface border-b border-pit-border">
            <tr class="text-left text-xs uppercase tracking-widest text-pit-muted">
              <th class="px-4 py-3 w-12">#</th>
              <th class="px-4 py-3">Descripción</th>
              <th class="px-4 py-3 w-24 text-center">Cant.</th>
              <th class="px-4 py-3 w-40 text-right">Precio Unit.</th>
              <th class="px-4 py-3 w-40 text-right">Total</th>
              <th class="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <TransitionGroup name="item" tag="tbody">
            <tr
              v-for="(it, idx) in q.quote.items"
              :key="it.id"
              class="border-b border-pit-border last:border-b-0 transition-colors"
              :class="confirmDeleteId === it.id ? 'bg-red-950/30' : 'hover:bg-white/[0.03]'"
            >
              <template v-if="confirmDeleteId !== it.id">
                <td class="px-4 py-3 pit-display text-pit-dim">{{ idx + 1 }}</td>
                <td class="px-4 py-3 text-pit-text">{{ it.descripcion }}</td>
                <td class="px-4 py-3 text-center pit-mono-num">{{ it.cantidad }}</td>
                <td class="px-4 py-3 text-right pit-mono-num text-pit-muted">{{ q.formatCLP(it.precioUnitario) }}</td>
                <td class="px-4 py-3 text-right pit-display text-pit-accentLight">{{ q.formatCLP(it.cantidad * it.precioUnitario) }}</td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-1">
                    <button class="pit-btn-ghost !p-2 !rounded-lg" @click="openEdit(it)" title="Editar">
                      <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button class="pit-btn-ghost !p-2 !rounded-lg hover:!text-red-400" @click="askDelete(it.id)" title="Eliminar">
                      <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                  </div>
                </td>
              </template>
              <template v-else>
                <td colspan="6" class="px-4 py-3">
                  <div class="flex flex-wrap items-center gap-3">
                    <span class="text-sm text-red-200/90">¿Eliminar "{{ it.descripcion }}"?</span>
                    <div class="ml-auto flex gap-2">
                      <button class="pit-btn-ghost !px-3 !py-1.5 text-xs" @click="cancelDelete">Cancelar</button>
                      <button class="pit-btn-danger !px-3 !py-1.5 text-xs" @click="confirmDelete(it.id)">Confirmar eliminación</button>
                    </div>
                  </div>
                </td>
              </template>
            </tr>
          </TransitionGroup>
          <tfoot>
            <tr style="background: linear-gradient(135deg, #B14302, #E85D04);">
              <td colspan="4" class="px-4 py-4 text-right text-sm font-bold uppercase tracking-widest text-white">Total</td>
              <td class="px-4 py-4 text-right pit-display text-xl text-white">{{ q.formatCLP(q.total.value) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Inline add button (desktop, when has items) -->
    <div v-if="hasItems" class="hidden md:flex justify-center mt-5">
      <button class="pit-btn-ghost" @click="openAdd">
        <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Agregar otro item
      </button>
    </div>

    <!-- Continue button -->
    <div v-if="hasItems" class="mt-6">
      <button class="pit-btn-primary w-full text-lg py-4" @click="emit('next')">
        Finalizar Cotización
        <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Floating add button (mobile) -->
    <button
      class="md:hidden fixed bottom-6 right-6 z-40 pit-btn-primary !rounded-full !px-5 !py-4 shadow-glow-orange-lg"
      style="padding-bottom: max(16px, env(safe-area-inset-bottom));"
      @click="openAdd"
    >
      <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span class="font-semibold">Agregar Item</span>
    </button>

    <AddItemModal
      :open="modalOpen"
      :initial="editing"
      @close="modalOpen = false"
      @save="onSave"
    />
  </section>
</template>
