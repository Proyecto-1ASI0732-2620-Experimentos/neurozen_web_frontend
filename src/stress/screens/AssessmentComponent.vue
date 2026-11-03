<template>
  <div class="nz-page max-w-3xl">
    <!-- Introducción -->
    <section v-if="stage === 'intro'" class="nz-card p-6 sm:p-8">
      <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl text-primary"><i class="fas fa-clipboard-list" aria-hidden="true"></i></span>
      <h1 class="mt-4 text-3xl font-extrabold text-foreground-light">{{ $t('assessment.title') }}</h1>
      <p class="mt-2 text-muted-light">{{ $t('assessment.intro') }}</p>
      <ul class="mt-5 space-y-2 text-sm text-foreground-light">
        <li class="flex gap-3"><i class="far fa-clock mt-0.5 w-4 text-primary" aria-hidden="true"></i>{{ $t('assessment.duration') }}</li>
        <li class="flex gap-3"><i class="fas fa-calendar mt-0.5 w-4 text-primary" aria-hidden="true"></i>{{ $t('assessment.period') }}</li>
        <li class="flex gap-3"><i class="fas fa-lock mt-0.5 w-4 text-primary" aria-hidden="true"></i>{{ $t('assessment.privacy') }}</li>
      </ul>
      <p class="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{{ $t('assessment.notDiagnosis') }}</p>
      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <router-link v-if="fromOnboarding" :to="{ name: 'Dashboard' }" class="nz-btn-ghost">{{ $t('assessment.later') }}</router-link>
        <button type="button" class="nz-btn-primary" @click="stage = 'questions'">{{ $t('assessment.start') }}<i class="fas fa-arrow-right" aria-hidden="true"></i></button>
      </div>
    </section>

    <!-- Preguntas -->
    <section v-else-if="stage === 'questions'" aria-labelledby="question-title">
      <div class="mb-6">
        <div class="flex items-center justify-between text-sm font-semibold">
          <span class="text-primary">{{ $t('assessment.questionOf', { current: index + 1, total: total }) }}</span>
          <button type="button" class="text-muted-light hover:text-primary" @click="stage = 'intro'">{{ $t('common.cancel') }}</button>
        </div>
        <div class="mt-2 h-2 overflow-hidden rounded-full bg-primary/10" role="progressbar" :aria-valuenow="index + 1" aria-valuemin="1" :aria-valuemax="total">
          <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${((index + 1) / total) * 100}%` }"></div>
        </div>
      </div>

      <div class="nz-card p-6 sm:p-8">
        <p class="text-sm text-muted-light">{{ $t('assessment.inLastMonth') }}</p>
        <h1 id="question-title" class="mt-1 text-xl font-bold text-foreground-light sm:text-2xl">{{ $t(`assessment.questions.q${index + 1}`) }}</h1>
        <div class="mt-6 space-y-2" role="radiogroup" :aria-labelledby="'question-title'">
          <button v-for="option in options" :key="option" type="button" role="radio" :aria-checked="answers[index] === option"
            class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left font-semibold transition-colors"
            :class="answers[index] === option ? 'border-primary bg-primary text-white' : 'border-[#D6D2C7] bg-white text-foreground-light hover:border-primary'"
            @click="answer(option)">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2" :class="answers[index] === option ? 'border-white' : 'border-[#D6D2C7]'">
              <span v-if="answers[index] === option" class="h-2.5 w-2.5 rounded-full bg-white"></span>
            </span>
            {{ $t(`assessment.options.o${option}`) }}
          </button>
        </div>
        <div class="mt-6 flex justify-between">
          <button type="button" class="nz-btn-ghost" :disabled="index === 0" @click="index--"><i class="fas fa-arrow-left" aria-hidden="true"></i>{{ $t('common.previous') }}</button>
          <button v-if="index === total - 1" type="button" class="nz-btn-primary" :disabled="!complete || saving" @click="submit">
            <span v-if="saving" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
            {{ $t('assessment.seeResult') }}
          </button>
          <button v-else type="button" class="nz-btn-primary" :disabled="answers[index] == null" @click="index++">{{ $t('common.next') }}<i class="fas fa-arrow-right" aria-hidden="true"></i></button>
        </div>
      </div>
    </section>

    <!-- Resultado -->
    <section v-else class="nz-card overflow-hidden" aria-live="polite">
      <div class="p-6 text-center sm:p-8" :class="levelStyle.bg">
        <p class="text-sm font-semibold text-muted-light">{{ $t('assessment.yourResult') }}</p>
        <p class="mt-2 text-6xl font-extrabold" :class="levelStyle.text">{{ result.score }}<span class="text-2xl text-muted-light">/40</span></p>
        <p class="mt-2 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold" :class="levelStyle.chip">{{ $t(`assessment.levels.${result.level}.label`) }}</p>
      </div>
      <div class="space-y-5 p-6 sm:p-8">
        <p class="text-foreground-light">{{ $t(`assessment.levels.${result.level}.text`) }}</p>
        <div>
          <p class="mb-2 font-bold text-foreground-light">{{ $t('assessment.recommended') }}</p>
          <div class="grid gap-2 sm:grid-cols-2">
            <router-link v-for="r in recommendations" :key="r.to" :to="r.to" class="flex items-center gap-3 rounded-lg border border-[#E3DED2] p-3 hover:border-primary/50 hover:bg-primary/5">
              <i :class="[r.icon, 'w-5 text-center text-primary']" aria-hidden="true"></i>
              <span class="text-sm font-semibold">{{ $t(r.label) }}</span>
            </router-link>
          </div>
        </div>
        <p v-if="!savedRemotely" class="text-xs text-muted-light"><i class="fas fa-circle-info mr-1" aria-hidden="true"></i>{{ $t('assessment.savedLocally') }}</p>
        <p class="text-xs text-muted-light">{{ $t('assessment.notDiagnosis') }}</p>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="nz-btn-secondary" @click="restart">{{ $t('assessment.repeat') }}</button>
          <router-link :to="{ name: 'Dashboard' }" class="nz-btn-primary">{{ $t('assessment.goDashboard') }}</router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
/**
 * AssessmentComponent - Test de autoevaluación de estrés (US04).
 * 10 preguntas sobre el último mes, una por pantalla. Al terminar muestra el puntaje,
 * el nivel (bajo, moderado o alto) y recomendaciones; con nivel alto sugiere un especialista.
 */
import { AssessmentService, QUESTION_COUNT, OPTIONS } from '../../services/AssessmentService.js'
import { toast } from '../../composables/useToast.js'

export default {
  name: 'AssessmentComponent',
  data() {
    return {
      service: new AssessmentService(),
      stage: 'intro',
      index: 0,
      total: QUESTION_COUNT,
      options: OPTIONS,
      answers: Array(QUESTION_COUNT).fill(null),
      saving: false,
      result: null,
      savedRemotely: true
    }
  },
  computed: {
    fromOnboarding() {
      return this.$route.query.from === 'onboarding'
    },
    complete() {
      return this.answers.every((a) => a != null)
    },
    levelStyle() {
      return {
        low: { bg: 'bg-green-50', text: 'text-green-700', chip: 'bg-green-100 text-green-800' },
        moderate: { bg: 'bg-amber-50', text: 'text-amber-700', chip: 'bg-amber-100 text-amber-800' },
        high: { bg: 'bg-red-50', text: 'text-red-700', chip: 'bg-red-100 text-red-800' }
      }[this.result?.level || 'low']
    },
    recommendations() {
      const all = {
        breathing: { to: '/stress/breathing', icon: 'fas fa-wind', label: 'zenbot.links.breathing' },
        breaks: { to: '/stress/active-breaks', icon: 'fas fa-person-walking', label: 'zenbot.links.breaks' },
        trigger: { to: '/stress/triggers', icon: 'fas fa-triangle-exclamation', label: 'zenbot.links.trigger' },
        resources: { to: '/stress/resources', icon: 'fas fa-book-open', label: 'zenbot.links.resources' },
        specialist: { to: '/book-session', icon: 'fas fa-user-doctor', label: 'zenbot.links.specialist' }
      }
      const byLevel = { low: ['resources', 'breaks'], moderate: ['breathing', 'trigger', 'breaks', 'resources'], high: ['specialist', 'breathing', 'trigger', 'resources'] }
      return byLevel[this.result?.level || 'low'].map((k) => all[k])
    }
  },
  methods: {
    answer(option) {
      this.answers.splice(this.index, 1, option)
      // Avanza solo para agilizar el test
      if (this.index < this.total - 1) setTimeout(() => { if (this.answers[this.index] === option) this.index++ }, 220)
    },
    async submit() {
      if (!this.complete || this.saving) return
      this.saving = true
      try {
        const { result, savedRemotely } = await this.service.submit([...this.answers])
        this.result = result
        this.savedRemotely = savedRemotely
        this.stage = 'result'
      } catch (error) {
        toast.error(error.message)
      } finally {
        this.saving = false
      }
    },
    restart() {
      this.answers = Array(QUESTION_COUNT).fill(null)
      this.index = 0
      this.result = null
      this.stage = 'questions'
    }
  }
}
</script>
