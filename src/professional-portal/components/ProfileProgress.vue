<template>
  <div>
    <div class="flex items-center justify-between gap-3">
      <p class="text-sm font-semibold text-foreground-light">{{ $t('pro.progress.label', { done: doneCount, total: steps.length }) }}</p>
      <span class="text-sm font-bold" :class="complete ? 'text-green-700' : 'text-amber-700'">{{ percent }}%</span>
    </div>
    <div class="mt-2 h-2 overflow-hidden rounded-full bg-gray-200" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100">
      <div class="h-full rounded-full transition-all duration-500" :class="complete ? 'bg-green-600' : 'bg-amber-500'" :style="{ width: `${percent}%` }"></div>
    </div>
    <ul v-if="showSteps" class="mt-4 space-y-2">
      <li v-for="step in steps" :key="step.key" class="flex items-center gap-3 text-sm">
        <i :class="step.done ? 'fas fa-circle-check text-green-700' : 'far fa-circle text-muted-light'" aria-hidden="true"></i>
        <span :class="step.done ? 'text-muted-light line-through' : 'text-foreground-light'">{{ $t(`pro.progress.steps.${step.key}`) }}</span>
        <span class="sr-only">{{ step.done ? $t('pro.progress.done') : $t('pro.progress.pending') }}</span>
      </li>
    </ul>
  </div>
</template>

<script>
/** Progreso del perfil profesional: verificación + biografía + tarifa/experiencia + disponibilidad */
import { profileSteps } from '../../services/ProfessionalService.js'

export default {
  name: 'ProfileProgress',
  props: {
    profile: { type: Object, default: null },
    showSteps: { type: Boolean, default: true }
  },
  computed: {
    steps() {
      return profileSteps(this.profile)
    },
    doneCount() {
      return this.steps.filter((s) => s.done).length
    },
    percent() {
      return this.steps.length ? Math.round((this.doneCount / this.steps.length) * 100) : 0
    },
    complete() {
      return this.steps.length > 0 && this.doneCount === this.steps.length
    }
  }
}
</script>
