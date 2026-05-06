<script setup>
import { computed } from 'vue'

const props = defineProps({
  current: { type: Number, required: true }
})
const emit = defineEmits(['go'])

const steps = [
  { n: 1, label: 'Cliente' },
  { n: 2, label: 'Items' },
  { n: 3, label: 'Finalizar' }
]

function statusOf(n) {
  if (n < props.current) return 'done'
  if (n === props.current) return 'active'
  return 'future'
}

function onClick(n) {
  if (n <= props.current) emit('go', n)
}
</script>

<template>
  <div class="w-full">
    <div class="flex items-center gap-1 sm:gap-3">
      <template v-for="(s, idx) in steps" :key="s.n">
        <button
          type="button"
          @click="onClick(s.n)"
          :disabled="statusOf(s.n) === 'future'"
          class="group flex items-center gap-2 sm:gap-3 transition-all duration-200 rounded-lg p-1"
          :class="statusOf(s.n) === 'future' ? 'cursor-default opacity-70' : 'hover:opacity-100'"
        >
          <span
            class="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 border"
            :class="{
              'bg-pit-accent border-pit-accent text-white shadow-glow-orange': statusOf(s.n) === 'active',
              'bg-pit-accent/15 border-pit-accent/50 text-pit-accentLight': statusOf(s.n) === 'done',
              'bg-pit-surface2 border-pit-border text-pit-dim': statusOf(s.n) === 'future'
            }"
            style="font-family: 'Barlow Condensed', system-ui, sans-serif;"
          >
            <svg v-if="statusOf(s.n) === 'done'" viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span v-else>{{ s.n }}</span>
          </span>
          <span
            class="hidden sm:inline text-sm font-medium tracking-wide"
            :class="{
              'text-pit-text': statusOf(s.n) === 'active',
              'text-pit-accentLight': statusOf(s.n) === 'done',
              'text-pit-dim': statusOf(s.n) === 'future'
            }"
          >
            {{ s.label }}
          </span>
        </button>

        <div
          v-if="idx < steps.length - 1"
          class="flex-1 h-px transition-colors duration-300"
          :class="statusOf(s.n) === 'done' ? 'bg-pit-accent/50' : 'bg-pit-border'"
        ></div>
      </template>
    </div>

    <!-- Mobile labels under indicator -->
    <div class="flex sm:hidden mt-2 justify-between text-[11px] tracking-wide">
      <span
        v-for="s in steps"
        :key="'lbl-' + s.n"
        class="font-medium"
        :class="{
          'text-pit-text': statusOf(s.n) === 'active',
          'text-pit-accentLight': statusOf(s.n) === 'done',
          'text-pit-dim': statusOf(s.n) === 'future'
        }"
      >{{ s.label }}</span>
    </div>
  </div>
</template>
