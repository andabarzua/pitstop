<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { formatCLP } from '../composables/useQuote.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  initial: { type: Object, default: null }
})
const emit = defineEmits(['close', 'save'])

const descripcion = ref('')
const cantidad = ref(1)
const precioUnitario = ref(0)
const submitted = ref(false)
const descRef = ref(null)

const isEdit = computed(() => !!props.initial?.id)
const total = computed(() => (Number(cantidad.value) || 0) * (Number(precioUnitario.value) || 0))

const errors = computed(() => ({
  descripcion: !descripcion.value?.trim(),
  cantidad: !(Number(cantidad.value) >= 1),
  precioUnitario: !(Number(precioUnitario.value) >= 0)
}))
const isValid = computed(() => !errors.value.descripcion && !errors.value.cantidad && !errors.value.precioUnitario)

watch(() => props.open, async (val) => {
  if (val) {
    submitted.value = false
    if (props.initial) {
      descripcion.value = props.initial.descripcion || ''
      cantidad.value = props.initial.cantidad || 1
      precioUnitario.value = props.initial.precioUnitario || 0
    } else {
      descripcion.value = ''
      cantidad.value = 1
      precioUnitario.value = 0
    }
    await nextTick()
    descRef.value?.focus()
  }
})

function onSave() {
  submitted.value = true
  if (!isValid.value) return
  emit('save', {
    id: props.initial?.id,
    descripcion: descripcion.value.trim(),
    cantidad: Math.max(1, Math.floor(Number(cantidad.value) || 1)),
    precioUnitario: Math.max(0, Math.round(Number(precioUnitario.value) || 0))
  })
}

function onBackdrop(e) {
  if (e.target === e.currentTarget) emit('close')
}

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}
</script>

<template>
  <Transition name="modal">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm"
      @click="onBackdrop"
      @keydown="onKeydown"
      tabindex="-1"
    >
      <div
        class="modal-panel w-full md:max-w-lg bg-pit-surface border border-pit-border md:rounded-2xl rounded-t-3xl shadow-soft p-5 md:p-6 max-h-[92vh] overflow-y-auto"
        style="padding-bottom: max(20px, env(safe-area-inset-bottom));"
      >
        <!-- Drag handle (mobile bottom sheet) -->
        <div class="md:hidden flex justify-center -mt-2 mb-3">
          <span class="block w-10 h-1.5 rounded-full bg-white/15"></span>
        </div>

        <div class="flex items-start justify-between mb-5">
          <div>
            <h3 class="pit-display text-2xl">{{ isEdit ? 'Editar Item' : 'Agregar Item' }}</h3>
            <p class="text-xs text-pit-muted mt-1">Servicio, repuesto o mano de obra.</p>
          </div>
          <button @click="emit('close')" class="pit-btn-ghost !p-2 !rounded-lg" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="pit-label">Descripción del Servicio <span class="text-pit-accent">*</span></label>
            <textarea
              ref="descRef"
              v-model="descripcion"
              class="pit-input min-h-[88px] resize-y"
              :class="{ invalid: submitted && errors.descripcion }"
              placeholder="Cambio de aceite y filtro, alineación, etc."
              rows="3"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="pit-label">Cantidad</label>
              <input
                v-model.number="cantidad"
                type="number"
                min="1"
                step="1"
                class="pit-input pit-mono-num text-lg"
                :class="{ invalid: submitted && errors.cantidad }"
              />
            </div>
            <div>
              <label class="pit-label">Precio Unitario Neto (CLP)</label>
              <input
                v-model.number="precioUnitario"
                type="number"
                min="0"
                step="100"
                class="pit-input pit-mono-num text-lg"
                :class="{ invalid: submitted && errors.precioUnitario }"
                placeholder="0"
              />
              <p class="text-[10px] text-pit-dim mt-1">Sin IVA. Se agrega 19% al total.</p>
            </div>
          </div>

          <!-- Live total -->
          <div class="rounded-xl p-4 flex items-center justify-between"
               style="background: linear-gradient(135deg, rgba(232,93,4,0.12), rgba(232,93,4,0.02)); border: 1px solid rgba(232,93,4,0.2);">
            <span class="text-pit-muted text-xs uppercase tracking-widest">Subtotal línea (neto)</span>
            <span class="pit-display text-2xl text-pit-accentLight">{{ formatCLP(total) }}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mt-6">
          <button class="pit-btn-ghost py-3" @click="emit('close')">Cancelar</button>
          <button class="pit-btn-primary py-3" @click="onSave" :disabled="submitted && !isValid">
            {{ isEdit ? 'Guardar Cambios' : 'Agregar' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
