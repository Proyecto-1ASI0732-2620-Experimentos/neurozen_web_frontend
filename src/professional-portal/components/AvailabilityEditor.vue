<template>
  <div class="space-y-4">
    <fieldset>
      <legend class="nz-label">{{ $t('stress.activeBreaks.workingDays') }}</legend>
      <div class="flex flex-wrap gap-2">
        <button v-for="day in weekDays" :key="day" type="button" class="h-10 w-10 rounded-full text-sm font-bold transition-colors"
          :class="modelValue.days.includes(day) ? 'bg-primary text-white' : 'border border-[#D6D2C7] bg-white text-foreground-light hover:border-primary'"
          :aria-pressed="modelValue.days.includes(day)" :aria-label="$t(`common.days.${day}`)" :data-testid="`${idPrefix}-day-${day}`" @click="toggle(day)">
          {{ $t(`stress.activeBreaks.weekDays.${day}`) }}
        </button>
      </div>
    </fieldset>
    <div class="grid grid-cols-2 gap-3">
      <label class="text-sm text-muted-light" :for="`${idPrefix}-start`">{{ $t('stress.activeBreaks.start') }}
        <input :id="`${idPrefix}-start`" :value="modelValue.start" type="time" class="nz-input mt-1" @input="set('start', $event.target.value)" />
      </label>
      <label class="text-sm text-muted-light" :for="`${idPrefix}-end`">{{ $t('stress.activeBreaks.end') }}
        <input :id="`${idPrefix}-end`" :value="modelValue.end" type="time" class="nz-input mt-1" :class="{ 'nz-input-error': !!message }" @input="set('end', $event.target.value)" />
      </label>
    </div>
    <p v-if="message" class="nz-field-error" :data-testid="`${idPrefix}-error`">{{ message }}</p>
    <p v-else-if="preview" class="rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary"><i class="far fa-clock mr-1" aria-hidden="true"></i>{{ preview }}</p>
  </div>
</template>

<script>
/** Editor de días y horario de atención (usado en Horario, Perfil y el reenvío tras un rechazo). */
import { WEEK_DAYS, availabilityText } from '../../services/ProfessionalService.js'
import { availabilityErrorKey, toggleDay } from '../availability.js'

export default {
  name: 'AvailabilityEditor',
  props: {
    modelValue: { type: Object, required: true },
    idPrefix: { type: String, default: 'av' },
    /** Error del backend (texto) */
    serverError: { type: String, default: '' }
  },
  emits: ['update:modelValue'],
  data() {
    return { weekDays: WEEK_DAYS }
  },
  computed: {
    message() {
      const key = availabilityErrorKey(this.modelValue)
      return key ? this.$t(key) : this.serverError
    },
    preview() {
      return availabilityText(this.modelValue)
    }
  },
  methods: {
    toggle(day) {
      this.$emit('update:modelValue', { ...this.modelValue, days: toggleDay(this.modelValue.days, day) })
    },
    set(field, value) {
      this.$emit('update:modelValue', { ...this.modelValue, [field]: value })
    }
  }
}
</script>
