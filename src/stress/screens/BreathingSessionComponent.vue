<template>
  <div class="nz-page">
    <!-- Selección de ejercicio -->
    <template v-if="stage === 'select'">
      <PageHeader :title="$t('stress.breathing.title')" :subtitle="$t('stress.breathing.introDescription')" />

      <section aria-labelledby="exercises-title">
        <h2 id="exercises-title" class="mb-4 text-lg font-bold text-foreground-light">{{ $t('stress.breathing.availableExercises') }}</h2>
        <div class="grid gap-4 md:grid-cols-3">
          <button v-for="exercise in exercises" :key="exercise.id" type="button" class="nz-card group flex flex-col gap-3 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md" @click="startSession(exercise)">
            <span class="flex items-center justify-between">
              <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-secondary"><i class="fas fa-lungs" aria-hidden="true"></i></span>
              <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{{ $t(`stress.breathing.levels.${exercise.difficulty}`) }}</span>
            </span>
            <span class="text-lg font-bold text-foreground-light group-hover:text-primary">{{ $t(`stress.breathing.exerciseList.${exercise.key}.name`) }}</span>
            <span class="text-sm text-muted-light">{{ $t(`stress.breathing.exerciseList.${exercise.key}.description`) }}</span>
            <span class="mt-auto flex items-center justify-between text-sm font-semibold text-muted-light">
              <span><i class="far fa-clock mr-1" aria-hidden="true"></i>{{ minutes(exercise.duration) }} min</span>
              <span class="text-primary">{{ patternText(exercise) }}</span>
            </span>
          </button>
        </div>
      </section>

      <section class="mt-8" aria-labelledby="tips-title">
        <h2 id="tips-title" class="mb-4 text-lg font-bold text-foreground-light">{{ $t('stress.breathing.practiceTips') }}</h2>
        <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <li v-for="tip in tips" :key="tip.key" class="flex items-start gap-3 rounded-lg bg-white/70 p-4 text-sm text-foreground-light">
            <i :class="[tip.icon, 'mt-0.5 text-primary']" aria-hidden="true"></i>{{ $t(`stress.breathing.tips.${tip.key}`) }}
          </li>
        </ul>
      </section>

      <p v-if="history.length" class="mt-8 text-sm text-muted-light">
        <i class="fas fa-circle-check mr-1 text-green-700" aria-hidden="true"></i>{{ $t('stress.breathing.historyCount', { count: history.length }) }}
      </p>
    </template>

    <!-- Sesión activa -->
    <section v-else-if="stage === 'active'" class="mx-auto flex max-w-xl flex-col items-center text-center" aria-live="polite">
      <div class="flex w-full items-center justify-between">
        <h1 class="text-xl font-bold text-foreground-light">{{ $t(`stress.breathing.exerciseList.${selectedExercise.key}.name`) }}</h1>
        <button type="button" class="nz-btn-ghost" @click="requestExit"><i class="fas fa-xmark" aria-hidden="true"></i>{{ $t('stress.breathing.stop') }}</button>
      </div>
      <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-primary/10" role="progressbar" :aria-valuenow="Math.round(progress)" aria-valuemin="0" aria-valuemax="100">
        <div class="h-full rounded-full bg-primary transition-all duration-1000 ease-linear" :style="{ width: `${progress}%` }"></div>
      </div>

      <div class="breathing-stage my-12">
        <div class="breathing-circle" :class="[currentPhase, { paused }]" :style="{ '--phase-seconds': `${phaseDuration}s` }">
          <div class="text-center text-white">
            <p class="text-xl font-bold">{{ phaseText }}</p>
            <p class="text-5xl font-extrabold">{{ counter }}</p>
          </div>
        </div>
      </div>

      <p class="text-3xl font-extrabold text-foreground-light">{{ formatTimer(timeRemaining) }}</p>
      <p class="text-sm text-muted-light">{{ $t('stress.breathing.timeRemaining') }}</p>

      <button type="button" class="nz-btn-primary mt-6 min-w-40" @click="togglePause">
        <i :class="paused ? 'fas fa-play' : 'fas fa-pause'" aria-hidden="true"></i>
        {{ paused ? $t('stress.breathing.resume') : $t('stress.breathing.pause') }}
      </button>
    </section>

    <!-- Sesión completada -->
    <section v-else class="nz-card mx-auto max-w-xl p-6 text-center sm:p-8">
      <i class="fas fa-circle-check text-5xl text-green-700" aria-hidden="true"></i>
      <h1 class="mt-4 text-2xl font-extrabold text-foreground-light">{{ $t('stress.breathing.sessionCompleted') }}</h1>
      <p class="mt-2 text-muted-light">{{ $t('stress.breathing.completedMessage', { duration: `${minutes(selectedExercise.duration)} min` }) }}</p>

      <fieldset class="mt-6">
        <legend class="mb-3 font-bold text-foreground-light">{{ $t('stress.breathing.howDoYouFeel') }}</legend>
        <div class="grid grid-cols-5 gap-2">
          <button v-for="mood in moodOptions" :key="mood.value" type="button" class="flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors"
            :class="selectedMood === mood.value ? 'border-primary bg-primary/10 font-bold text-primary' : 'border-[#E3DED2] hover:border-primary/50'"
            :aria-pressed="selectedMood === mood.value" @click="selectedMood = mood.value">
            <span class="text-2xl" aria-hidden="true">{{ mood.emoji }}</span>{{ mood.label }}
          </button>
        </div>
      </fieldset>

      <label class="mt-6 block text-left">
        <span class="nz-label">{{ $t('stress.breathing.notesOptional') }}</span>
        <textarea v-model="sessionNotes" rows="3" maxlength="500" class="nz-input" :placeholder="$t('stress.breathing.notesPlaceholder')"></textarea>
      </label>

      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
        <button type="button" class="nz-btn-secondary" @click="saveAndRestart">{{ $t('stress.breathing.anotherSession') }}</button>
        <button type="button" class="nz-btn-primary" @click="saveAndFinish">{{ $t('stress.breathing.saveAndFinish') }}</button>
      </div>
    </section>

    <ConfirmDialog :open="showExitModal" :title="$t('stress.breathing.exitConfirmation.title')" :message="$t('stress.breathing.exitConfirmation.message')"
      :confirm-text="$t('stress.breathing.exitConfirmation.exit')" :cancel-text="$t('stress.breathing.exitConfirmation.cancel')" danger
      @cancel="cancelExit" @confirm="confirmExit" />
  </div>
</template>

<script>
/**
 * BreathingSessionComponent - Sesión de respiración guiada.
 * Corrige: tiempo restante que nunca bajaba, barra de progreso congelada,
 * reanudar que reiniciaba la duración completa, temporizadores activos con el
 * modal abierto y guardado que fallaba (servicio no instanciado).
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue'
import { BreathingService } from '../../services/BreathingService.js'
import { toast } from '../../composables/useToast.js'
import { formatTimer } from '../../utils/date.js'

const PHASES = ['inhale', 'hold-in', 'exhale', 'hold-out']

export default {
  name: 'BreathingSessionComponent',
  components: { PageHeader, ConfirmDialog },
  data() {
    const service = new BreathingService()
    return {
      service,
      exercises: service.getExercises(),
      history: service.getHistory(),
      stage: 'select',
      selectedExercise: null,
      paused: false,
      currentPhase: 'inhale',
      phaseDuration: 4,
      counter: 4,
      timeRemaining: 0,
      ticker: null,
      showExitModal: false,
      selectedMood: null,
      sessionNotes: '',
      tips: [
        { key: 'posture', icon: 'fas fa-chair' },
        { key: 'headphones', icon: 'fas fa-headphones' },
        { key: 'eyes', icon: 'fas fa-eye-slash' },
        { key: 'silentMode', icon: 'fas fa-mobile-screen' }
      ]
    }
  },
  computed: {
    progress() {
      if (!this.selectedExercise) return 0
      return ((this.selectedExercise.duration - this.timeRemaining) / this.selectedExercise.duration) * 100
    },
    phaseText() {
      const keys = { inhale: 'inhale', 'hold-in': 'holdIn', exhale: 'exhale', 'hold-out': 'holdOut' }
      return this.$t(`stress.breathing.phases.${keys[this.currentPhase]}`)
    },
    moodOptions() {
      return [
        { value: 1, emoji: '😫', label: this.$t('stress.breathing.moodOptions.veryStressed') },
        { value: 2, emoji: '😰', label: this.$t('stress.breathing.moodOptions.stressed') },
        { value: 3, emoji: '😐', label: this.$t('stress.breathing.moodOptions.neutral') },
        { value: 4, emoji: '😌', label: this.$t('stress.breathing.moodOptions.relaxed') },
        { value: 5, emoji: '😊', label: this.$t('stress.breathing.moodOptions.veryRelaxed') }
      ]
    }
  },
  beforeUnmount() {
    this.stopTicker()
  },
  methods: {
    formatTimer,
    minutes(seconds) {
      return Math.round(seconds / 60)
    },
    patternText(exercise) {
      return Object.values(exercise.pattern).filter(Boolean).join('-')
    },
    startSession(exercise) {
      this.selectedExercise = exercise
      this.timeRemaining = exercise.duration
      this.paused = false
      this.stage = 'active'
      this.setPhase('inhale')
      this.startTicker()
    },
    setPhase(phase) {
      const seconds = this.selectedExercise.pattern[phase]
      if (!seconds) {
        this.setPhase(PHASES[(PHASES.indexOf(phase) + 1) % PHASES.length])
        return
      }
      this.currentPhase = phase
      this.phaseDuration = seconds
      this.counter = seconds
    },
    /** Un único intervalo de 1 s controla la fase y el tiempo total */
    startTicker() {
      this.stopTicker()
      this.ticker = setInterval(() => {
        this.timeRemaining -= 1
        if (this.timeRemaining <= 0) {
          this.completeSession()
          return
        }
        this.counter -= 1
        if (this.counter <= 0) {
          this.setPhase(PHASES[(PHASES.indexOf(this.currentPhase) + 1) % PHASES.length])
        }
      }, 1000)
    },
    stopTicker() {
      clearInterval(this.ticker)
      this.ticker = null
    },
    togglePause() {
      this.paused = !this.paused
      if (this.paused) this.stopTicker()
      else this.startTicker()
    },
    requestExit() {
      this.stopTicker()
      this.showExitModal = true
    },
    cancelExit() {
      this.showExitModal = false
      if (!this.paused) this.startTicker()
    },
    confirmExit() {
      this.showExitModal = false
      this.reset()
    },
    completeSession() {
      this.stopTicker()
      this.timeRemaining = 0
      this.stage = 'completed'
    },
    persist() {
      this.service.saveSession({
        exerciseId: this.selectedExercise.id,
        duration: this.selectedExercise.duration,
        mood: this.selectedMood,
        notes: this.sessionNotes
      })
      this.history = this.service.getHistory()
      toast.success(this.$t('stress.breathing.saved'))
    },
    saveAndRestart() {
      this.persist()
      this.reset()
    },
    saveAndFinish() {
      this.persist()
      this.$router.push({ name: 'Dashboard' })
    },
    reset() {
      this.stopTicker()
      this.stage = 'select'
      this.selectedExercise = null
      this.selectedMood = null
      this.sessionNotes = ''
      this.paused = false
    }
  }
}
</script>

<style scoped>
.breathing-stage { display: flex; height: 18rem; width: 18rem; align-items: center; justify-content: center; }
.breathing-circle {
  display: flex; height: 11rem; width: 11rem; align-items: center; justify-content: center; border-radius: 9999px;
  background: radial-gradient(circle at 35% 35%, #4f8a74, #2D5A4A);
  box-shadow: 0 0 0 18px rgba(45, 90, 74, 0.12), 0 0 0 40px rgba(45, 90, 74, 0.06);
  transition: transform var(--phase-seconds) ease-in-out;
}
.breathing-circle.inhale, .breathing-circle.hold-in { transform: scale(1.45); }
.breathing-circle.exhale, .breathing-circle.hold-out { transform: scale(1); }
.breathing-circle.paused { transition: none; }
</style>
