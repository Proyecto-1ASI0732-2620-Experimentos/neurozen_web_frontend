<template>
  <div class="nz-page max-w-6xl">
    <!-- Bienvenida -->
    <section class="mb-8">
      <p class="text-sm font-semibold text-primary">{{ todayLabel }}</p>
      <h1 class="mt-1 text-3xl font-extrabold text-foreground-light sm:text-4xl">{{ isNewUser ? $t('dashboard.welcomeNew') : $t('dashboard.welcome') }}, {{ firstName }}</h1>
      <p class="mt-2 text-muted-light">{{ $t('app.tagline') }}</p>
    </section>

    <LoadingState v-if="isLoading && !loaded" :message="$t('dashboard.loading')" />

    <!-- Estado inicial (A1): usuario sin test ni desencadenantes. Sin gráficos ni cifras de ejemplo. -->
    <section v-else-if="isNewUser" class="nz-card p-6 sm:p-8" aria-labelledby="empty-title" data-testid="dashboard-empty">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-center">
        <span class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-3xl text-primary"><i class="fas fa-seedling" aria-hidden="true"></i></span>
        <div class="min-w-0 flex-1">
          <h2 id="empty-title" class="text-2xl font-extrabold text-foreground-light">{{ $t('dashboard.empty.title') }}</h2>
          <p class="mt-2 text-muted-light">{{ $t('dashboard.empty.text') }}</p>
          <ol class="mt-4 space-y-2 text-sm text-foreground-light">
            <li class="flex gap-2"><span class="font-bold text-primary">1.</span>{{ $t('dashboard.empty.step1') }}</li>
            <li class="flex gap-2"><span class="font-bold text-primary">2.</span>{{ $t('dashboard.empty.step2') }}</li>
          </ol>
        </div>
      </div>
      <div class="mt-6 flex flex-col gap-3 sm:flex-row">
        <router-link :to="{ name: 'Assessment' }" class="nz-btn-primary py-3"><i class="fas fa-clipboard-list" aria-hidden="true"></i>{{ $t('dashboard.empty.takeTest') }}</router-link>
        <router-link :to="{ name: 'RegisterTrigger' }" class="nz-btn-secondary py-3"><i class="fas fa-pen" aria-hidden="true"></i>{{ $t('dashboard.empty.logFeeling') }}</router-link>
      </div>
      <p class="mt-4 text-sm text-muted-light"><i class="fas fa-lock mr-1" aria-hidden="true"></i>{{ $t('dashboard.empty.privacy') }}</p>
    </section>

    <template v-else>
      <!-- Estadísticas de desencadenantes (datos reales de la cuenta) -->
      <section aria-labelledby="stats-title" class="nz-card p-5 sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="stats-title" class="text-xl font-bold text-foreground-light">{{ $t('dashboard.stats.title') }}</h2>
            <p class="mt-1 text-sm text-muted-light">{{ hasStats ? `${$t(`dashboard.periodTexts.${selectedPeriod}`)} · ${scaleLabel}` : $t('dashboard.stats.subtitle') }}</p>
          </div>
          <div v-if="hasStats" class="inline-flex rounded-full bg-primary/10 p-1" role="radiogroup" :aria-label="$t('dashboard.periodLabel')">
            <button
              v-for="period in periods" :key="period" type="button" role="radio" :aria-checked="selectedPeriod === period"
              class="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
              :class="selectedPeriod === period ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary/10'"
              :disabled="isLoading" @click="changePeriod(period)"
            >{{ $t(`dashboard.periods.${period}`) }}</button>
          </div>
        </div>

        <ErrorState v-if="statsError" class="mt-6" :message="statsError" @retry="loadAll" />

        <!-- Sin desencadenantes todavía (pero con test): invitación, sin gráfico -->
        <EmptyState v-else-if="!hasStats" class="mt-6" icon="fas fa-feather" :title="$t('dashboard.noTriggers.title')" :message="$t('dashboard.noTriggers.text')">
          <router-link :to="{ name: 'RegisterTrigger' }" class="nz-btn-primary mt-2">{{ $t('dashboard.empty.logFeeling') }}</router-link>
        </EmptyState>

        <div v-else class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,15rem)_1fr]" :class="{ 'opacity-60': isLoading }">
          <div class="space-y-5">
            <div>
              <p class="text-sm font-semibold text-muted-light">{{ stats.source === 'triggers' ? $t('dashboard.chart.lastRecord') : $t('dashboard.chart.stressLevel') }}</p>
              <p class="text-5xl font-extrabold" :class="levelStyle.text">{{ stats.currentLevel }}<span class="text-xl text-muted-light">/{{ stats.scaleMax }}</span></p>
              <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
                <div class="h-full rounded-full transition-all duration-700" :class="levelStyle.bar" :style="{ width: `${currentPercent}%` }"></div>
              </div>
              <p class="mt-1 text-sm font-semibold" :class="levelStyle.text">{{ levelText }}</p>
            </div>
            <div class="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <div class="rounded-lg bg-primary/5 p-3">
                <p class="text-xs font-semibold text-muted-light">{{ $t('dashboard.chart.averageStress') }}</p>
                <p class="text-2xl font-extrabold text-foreground-light">{{ stats.average != null ? `${stats.average}/${stats.scaleMax}` : '—' }}</p>
              </div>
              <div class="rounded-lg bg-primary/5 p-3">
                <p class="text-xs font-semibold text-muted-light">{{ $t('dashboard.chart.peakStressHours') }}</p>
                <p class="text-lg font-extrabold text-foreground-light">{{ stats.peakHours || '—' }}</p>
              </div>
            </div>
            <p v-if="change != null" class="flex items-center gap-2 text-sm font-semibold" :class="change <= 0 ? 'text-green-700' : 'text-red-700'">
              <i :class="change <= 0 ? 'fas fa-arrow-trend-down' : 'fas fa-arrow-trend-up'" aria-hidden="true"></i>
              {{ Math.abs(change) }}% {{ $t('dashboard.vsPrevious') }}
            </p>
            <p v-else class="text-sm text-muted-light">{{ $t('dashboard.notEnoughToCompare') }}</p>
          </div>
          <div>
            <p v-if="stats.source === 'triggers' && !stats.periodCount" class="mb-3 rounded-lg bg-primary/5 p-3 text-sm text-foreground-light">{{ $t('dashboard.noRecordsInPeriod') }}</p>
            <StressLevelChart :chart-data="chartData" :period="selectedPeriod" :average-stress="averagePercent" :scale-max="stats.scaleMax" :scale-label="scaleLabel" />
            <p v-if="insightText" class="mt-4 text-sm leading-relaxed text-muted-light">{{ insightText }}</p>
            <p v-if="stats.source === 'triggers'" class="mt-3 text-sm text-muted-light"><i class="fas fa-circle-info mr-1" aria-hidden="true"></i>{{ $t('dashboard.scale.triggersNote') }}</p>
          </div>
        </div>
      </section>
    </template>

    <!-- Test PSS-10: puntaje original 0-40 y valor normalizado identificado como tal (M7) -->
    <section v-if="loaded && !isNewUser" class="nz-card mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center" aria-labelledby="test-title">
      <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><i class="fas fa-clipboard-list text-lg" aria-hidden="true"></i></span>
      <div class="min-w-0 flex-1">
        <h2 id="test-title" class="font-bold text-foreground-light">{{ $t('assessment.title') }}</h2>
        <template v-if="lastAssessment">
          <p class="text-sm text-foreground-light">
            {{ $t('assessment.lastResult', { score: lastAssessment.score, level: $t(`assessment.levels.${lastAssessment.level}.label`) }) }}
            <span v-if="normalizedPss != null" class="text-muted-light"> · {{ $t('dashboard.scale.pssNormalized', { value: normalizedPss }) }}</span>
          </p>
          <p class="mt-1 text-sm text-muted-light">{{ $t('dashboard.scale.pssNote') }}</p>
        </template>
        <p v-else class="text-sm text-muted-light">{{ $t('assessment.cta') }}</p>
      </div>
      <router-link :to="{ name: 'Assessment' }" class="nz-btn-secondary shrink-0">{{ lastAssessment ? $t('assessment.repeat') : $t('assessment.start') }}</router-link>
    </section>

    <!-- Herramientas (antes duplicadas en dos bloques) -->
    <section class="mt-10" aria-labelledby="tools-title">
      <h2 id="tools-title" class="mb-4 text-xl font-bold text-foreground-light">{{ $t('dashboard.tools.title') }}</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <router-link
          v-for="tool in tools" :key="tool.to" :to="tool.to"
          class="group nz-card flex flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
        >
          <span class="flex h-11 w-11 items-center justify-center rounded-xl" :class="tool.tone">
            <i :class="[tool.icon, 'text-lg']" aria-hidden="true"></i>
          </span>
          <span>
            <span class="block font-bold text-foreground-light group-hover:text-primary">{{ $t(`dashboard.tools.${tool.key}.title`) }}</span>
            <span class="mt-1 block text-sm text-muted-light">{{ $t(`dashboard.tools.${tool.key}.description`) }}</span>
          </span>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script>
/**
 * DashboardComponent - Panel de Inicio.
 * A1: solo muestra estadísticas y recomendaciones calculadas con datos reales de la cuenta
 * (desencadenantes registrados y resultado del test PSS-10). Un usuario nuevo ve un estado inicial
 * con «Hacer el test» y «Registrar cómo me siento». Se distinguen carga, error y ausencia de datos.
 * M7: cada valor se muestra con su escala (desencadenantes 1-10, PSS-10 0-40 + normalizado 0-100).
 */
import { DashboardService } from '../../services/DashboardService.js'
import { session, getDisplayName } from '../../services/session.js'
import StressLevelChart from '../../components/StressLevelChart.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import { formatLongDate } from '../../utils/date.js'
import { AssessmentService } from '../../services/AssessmentService.js'
import { normalizePss, percentOf, bandFor } from '../../utils/stressScale.js'

export default {
  name: 'DashboardComponent',
  components: { StressLevelChart, LoadingState, ErrorState, EmptyState },
  data() {
    return {
      stats: null,
      isLoading: true,
      loaded: false,
      statsError: '',
      selectedPeriod: 'week',
      lastAssessment: null,
      periods: ['day', 'week', 'month'],
      dashboardService: new DashboardService(),
      assessmentService: new AssessmentService(),
      tools: [
        { key: 'registerTrigger', to: '/stress/triggers', icon: 'fas fa-triangle-exclamation', tone: 'bg-red-50 text-red-700' },
        { key: 'activeBreaks', to: '/stress/active-breaks', icon: 'fas fa-person-walking', tone: 'bg-green-50 text-green-800' },
        { key: 'breathingSession', to: '/stress/breathing', icon: 'fas fa-wind', tone: 'bg-sky-50 text-secondary' },
        { key: 'resourceLibrary', to: '/stress/resources', icon: 'fas fa-book-open', tone: 'bg-amber-50 text-amber-800' },
        { key: 'bookSession', to: '/book-session', icon: 'fas fa-calendar-plus', tone: 'bg-primary/10 text-primary' },
        { key: 'myAppointments', to: '/appointments', icon: 'fas fa-calendar-check', tone: 'bg-primary/10 text-primary' },
        { key: 'myProfile', to: '/profile', icon: 'fas fa-user', tone: 'bg-gray-100 text-gray-700' },
        { key: 'settings', to: '/settings', icon: 'fas fa-gear', tone: 'bg-gray-100 text-gray-700' }
      ]
    }
  },
  computed: {
    firstName() {
      const name = getDisplayName(session.user)
      return name ? name.split(' ')[0] : this.$t('header.defaultUser')
    },
    todayLabel() {
      const text = formatLongDate(new Date(), this.$i18n.locale)
      return text.charAt(0).toUpperCase() + text.slice(1)
    },
    hasStats() {
      return !!this.stats && this.stats.source !== 'empty'
    },
    /** Usuario sin test PSS-10 ni desencadenantes (y sin error de carga) */
    isNewUser() {
      return this.loaded && !this.statsError && !this.hasStats && !this.lastAssessment
    },
    chartData() {
      return this.stats?.weeklyData || []
    },
    change() {
      return this.stats?.weeklyChange ?? null
    },
    scaleLabel() {
      if (!this.stats) return ''
      return this.stats.source === 'triggers' ? this.$t('dashboard.scale.triggers') : this.$t('dashboard.scale.backend')
    },
    currentPercent() {
      return percentOf(this.stats?.currentLevel, this.stats?.scaleMax)
    },
    averagePercent() {
      return percentOf(this.stats?.average, this.stats?.scaleMax)
    },
    levelStyle() {
      return {
        low: { text: 'text-green-700', bar: 'bg-green-600' },
        moderate: { text: 'text-amber-700', bar: 'bg-amber-500' },
        high: { text: 'text-red-700', bar: 'bg-red-600' }
      }[bandFor(this.currentPercent)]
    },
    levelText() {
      const level = this.currentPercent
      const key = level <= 30 ? 'veryLow' : level <= 50 ? 'low' : level <= 70 ? 'moderate' : level <= 85 ? 'high' : 'veryHigh'
      return this.$t(`dashboard.stressLevels.${key}`)
    },
    normalizedPss() {
      return normalizePss(this.lastAssessment?.score)
    },
    /** Recomendación SOLO si hay datos para compararla (no se inventan tendencias) */
    insightText() {
      if (!this.hasStats || this.change == null) return ''
      const params = { percentage: Math.abs(this.change), peakHours: this.stats.peakHours || '—' }
      return this.change <= 0 ? this.$t('dashboard.insights.decreased', params) : this.$t('dashboard.insights.increased', params)
    }
  },
  created() {
    this.loadAll()
  },
  methods: {
    async loadAll() {
      this.isLoading = true
      this.statsError = ''
      this.dashboardService.reset()
      const [stats, assessment] = await Promise.allSettled([
        this.dashboardService.getStressData(this.selectedPeriod),
        this.assessmentService.getLatest()
      ])
      if (stats.status === 'fulfilled') this.stats = stats.value
      else this.statsError = this.$t('dashboard.errors.loadingData', { error: stats.reason?.message || this.$t('errors.unknown') })
      this.lastAssessment = assessment.status === 'fulfilled' ? assessment.value : null
      this.loaded = true
      this.isLoading = false
    },
    async changePeriod(period) {
      if (period === this.selectedPeriod || this.isLoading) return
      this.selectedPeriod = period
      this.isLoading = true
      try {
        this.stats = await this.dashboardService.getStressData(period)
      } catch (error) {
        this.statsError = this.$t('dashboard.errors.loadingData', { error: error.message })
      } finally {
        this.isLoading = false
      }
    }
  }
}
</script>
