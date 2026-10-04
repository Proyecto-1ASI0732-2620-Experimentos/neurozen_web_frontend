<template>
  <div class="nz-page">
    <PageHeader :title="$t('stress.activeBreaks.title')" :subtitle="$t('stress.activeBreaks.subtitle')" />

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div class="space-y-6">
        <!-- Estado -->
        <section class="nz-card flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h2 class="font-bold text-foreground-light">{{ $t('stress.activeBreaks.currentStatus') }}</h2>
            <p class="text-sm text-muted-light">
              {{ $t('stress.activeBreaks.activeBreaksAre') }}
              <strong :class="config.isActive ? 'text-green-700' : 'text-muted-light'">{{ config.isActive ? $t('stress.activeBreaks.activated') : $t('stress.activeBreaks.deactivated') }}</strong>
            </p>
          </div>
          <button type="button" role="switch" :aria-checked="config.isActive" :aria-label="$t('stress.activeBreaks.title')"
            class="relative h-8 w-14 rounded-full transition-colors" :class="config.isActive ? 'bg-primary' : 'bg-gray-300'" @click="update({ isActive: !config.isActive })">
            <span class="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all" :class="config.isActive ? 'left-7' : 'left-1'"></span>
          </button>
        </section>

        <!-- Configuración -->
        <section class="nz-card space-y-6 p-5 sm:p-6" :class="{ 'opacity-60': !config.isActive }">
          <h2 class="text-lg font-bold text-foreground-light">{{ $t('stress.activeBreaks.configuration') }}</h2>

          <fieldset>
            <legend class="nz-label">{{ $t('stress.activeBreaks.frequencyLabel') }}</legend>
            <div class="flex flex-wrap gap-2">
              <button v-for="f in frequencyOptions" :key="f" type="button" class="chip" :class="{ 'chip-active': config.frequency === f }" :aria-pressed="config.frequency === f" @click="update({ frequency: f })">
                {{ $t(`stress.activeBreaks.frequencyOptions.${f}`) }}
              </button>
            </div>
            <p class="nz-hint">{{ $t('stress.activeBreaks.frequencyDescription', { minutes: config.frequency }) }}</p>
          </fieldset>

          <fieldset>
            <legend class="nz-label">{{ $t('stress.activeBreaks.durationLabel') }}</legend>
            <div class="flex flex-wrap gap-2">
              <button v-for="d in durationOptions" :key="d" type="button" class="chip" :class="{ 'chip-active': config.duration === d }" :aria-pressed="config.duration === d" @click="update({ duration: d })">
                {{ $t(`stress.activeBreaks.durationOptions.${d}`) }}
              </button>
            </div>
          </fieldset>

          <fieldset>
            <legend class="nz-label">{{ $t('stress.activeBreaks.workingHours') }}</legend>
            <div class="grid grid-cols-2 gap-3">
              <label class="text-sm text-muted-light">{{ $t('stress.activeBreaks.start') }}
                <input v-model="hours.start" type="time" class="nz-input mt-1" @change="updateHours" />
              </label>
              <label class="text-sm text-muted-light">{{ $t('stress.activeBreaks.end') }}
                <input v-model="hours.end" type="time" class="nz-input mt-1" :class="{ 'nz-input-error': hoursError }" @change="updateHours" />
              </label>
            </div>
            <p v-if="hoursError" class="nz-field-error">{{ $t('stress.activeBreaks.invalidHours') }}</p>
          </fieldset>

          <fieldset>
            <legend class="nz-label">{{ $t('stress.activeBreaks.workingDays') }}</legend>
            <div class="flex flex-wrap gap-2">
              <button v-for="day in weekDays" :key="day" type="button" class="h-10 w-10 rounded-full text-sm font-bold transition-colors"
                :class="config.settings.workingDays.includes(day) ? 'bg-primary text-white' : 'border border-[#D6D2C7] bg-white text-foreground-light hover:border-primary'"
                :aria-pressed="config.settings.workingDays.includes(day)" :aria-label="$t(`common.days.${day}`)" @click="toggleDay(day)">
                {{ $t(`stress.activeBreaks.weekDays.${day}`) }}
              </button>
            </div>
          </fieldset>
        </section>
      </div>

      <div class="space-y-6">
        <!-- Agenda de hoy -->
        <section class="nz-card p-5 sm:p-6" aria-labelledby="today-title">
          <h2 id="today-title" class="text-lg font-bold text-foreground-light">{{ $t('stress.activeBreaks.todaySchedule') }}</h2>
          <p class="mb-4 text-sm text-muted-light">
            {{ $t('stress.activeBreaks.nextBreak') }} <strong class="text-primary">{{ nextBreak ? nextBreak.time : $t('stress.activeBreaks.noScheduledBreaks') }}</strong>
          </p>
          <EmptyState v-if="!todaySchedule.length" icon="fas fa-mug-hot" :title="$t('stress.activeBreaks.noScheduledBreaks')" :message="emptyReason" />
          <ul v-else class="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <li v-for="item in todaySchedule" :key="item.time" class="rounded-lg border px-2 py-2 text-center text-sm font-bold"
              :class="{
                'border-transparent bg-gray-100 text-muted-light line-through': item.status === 'past',
                'border-primary bg-primary text-white': item.status === 'current' || item.isNext,
                'border-[#E3DED2] bg-white text-foreground-light': item.status === 'upcoming' && !item.isNext
              }">
              {{ item.time }}
            </li>
          </ul>
        </section>

        <!-- Resumen semanal calculado (antes eran cifras fijas) -->
        <section class="nz-card p-5 sm:p-6">
          <h2 class="mb-4 text-lg font-bold text-foreground-light">{{ $t('stress.activeBreaks.weeklyPlan') }}</h2>
          <dl class="grid grid-cols-3 gap-3 text-center">
            <div class="rounded-lg bg-primary/5 p-3"><dt class="text-xs text-muted-light">{{ $t('stress.activeBreaks.breaksPerWeek') }}</dt><dd class="text-2xl font-extrabold text-primary">{{ summary.breaksPerWeek }}</dd></div>
            <div class="rounded-lg bg-primary/5 p-3"><dt class="text-xs text-muted-light">{{ $t('stress.activeBreaks.breakTime') }}</dt><dd class="text-2xl font-extrabold text-primary">{{ summary.minutesPerWeek }}<span class="text-sm"> min</span></dd></div>
            <div class="rounded-lg bg-primary/5 p-3"><dt class="text-xs text-muted-light">{{ $t('stress.activeBreaks.workingDays') }}</dt><dd class="text-2xl font-extrabold text-primary">{{ summary.workingDays }}</dd></div>
          </dl>
          <p class="mt-4 text-xs text-muted-light">{{ $t('stress.activeBreaks.localNote') }}</p>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * ActiveBreaksComponent - Configuración de pausas activas.
 * La agenda ahora respeta minutos de inicio/fin, días laborables y el interruptor;
 * ya no marca pausas "completadas" al azar ni muestra estadísticas fijas.
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import { ActiveBreaksService, WEEK_DAYS } from '../../services/ActiveBreaksService.js'
import { toast } from '../../composables/useToast.js'

export default {
  name: 'ActiveBreaksComponent',
  components: { PageHeader, EmptyState },
  data() {
    const service = new ActiveBreaksService()
    const config = service.getConfiguration()
    return {
      service,
      config,
      hours: { ...config.settings.workingHours },
      hoursError: false,
      weekDays: WEEK_DAYS,
      frequencyOptions: [30, 45, 60, 90, 120],
      durationOptions: [3, 5, 10, 15],
      now: Date.now(),
      timer: null,
      savedToast: null
    }
  },
  computed: {
    todaySchedule() {
      void this.now
      return this.service.getSchedule(this.config)
    },
    nextBreak() {
      return this.todaySchedule.find((b) => b.isNext)
    },
    summary() {
      return this.service.getWeeklySummary(this.config)
    },
    emptyReason() {
      if (!this.config.isActive) return this.$t('stress.activeBreaks.reasonInactive')
      if (!this.service.isWorkingDay(this.config)) return this.$t('stress.activeBreaks.reasonNotWorkingDay')
      return this.$t('stress.activeBreaks.reasonOutside')
    }
  },
  mounted() {
    // Refresca la agenda cada minuto para avanzar el estado de las pausas
    this.timer = setInterval(() => { this.now = Date.now() }, 60000)
  },
  beforeUnmount() {
    clearInterval(this.timer)
  },
  methods: {
    update(partial) {
      this.config = { ...this.config, ...partial }
      this.persist()
    },
    updateHours() {
      const candidate = { ...this.config, settings: { ...this.config.settings, workingHours: { ...this.hours } } }
      this.hoursError = !this.service.isValidWorkingHours(candidate)
      if (this.hoursError) return
      this.config = candidate
      this.persist()
    },
    toggleDay(day) {
      const days = this.config.settings.workingDays.includes(day)
        ? this.config.settings.workingDays.filter((d) => d !== day)
        : [...this.config.settings.workingDays, day].sort((a, b) => WEEK_DAYS.indexOf(a) - WEEK_DAYS.indexOf(b))
      this.config = { ...this.config, settings: { ...this.config.settings, workingDays: days } }
      this.persist()
    },
    persist() {
      this.service.saveConfiguration(this.config)
      // Un único aviso aunque se cambien varias opciones seguidas
      clearTimeout(this.savedToast)
      this.savedToast = setTimeout(() => toast.success(this.$t('stress.activeBreaks.configurationSaved'), { duration: 2000 }), 400)
    }
  }
}
</script>

<style scoped>
.chip { @apply rounded-full border border-[#D6D2C7] bg-white px-4 py-2 text-sm font-semibold text-foreground-light transition-colors hover:border-primary; }
.chip-active { @apply border-primary bg-primary text-white hover:border-primary; }
</style>
