<template>
  <div class="nz-page max-w-6xl">
    <!-- Bienvenida -->
    <section class="mb-8">
      <p class="text-sm font-semibold text-primary">{{ todayLabel }}</p>
      <h1 class="mt-1 text-3xl font-extrabold text-foreground-light sm:text-4xl">{{ $t('dashboard.welcome') }}, {{ firstName }}</h1>
      <p class="mt-2 text-muted-light">{{ $t('app.tagline') }}</p>
    </section>

    <!-- Estadísticas -->
    <section aria-labelledby="stats-title" class="nz-card p-5 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="stats-title" class="text-xl font-bold text-foreground-light">{{ $t('dashboard.stats.title') }}</h2>
          <p class="mt-1 text-sm text-muted-light">{{ $t(`dashboard.periodTexts.${selectedPeriod}`) }}</p>
        </div>
        <div class="inline-flex rounded-full bg-primary/10 p-1" role="radiogroup" :aria-label="$t('dashboard.periodLabel')">
          <button
            v-for="period in periods" :key="period" type="button" role="radio" :aria-checked="selectedPeriod === period"
            class="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
            :class="selectedPeriod === period ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary/10'"
            :disabled="isLoading" @click="changePeriod(period)"
          >{{ $t(`dashboard.periods.${period}`) }}</button>
        </div>
      </div>

      <div v-if="stressData && stressData.source === 'demo'" class="mt-4 flex gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        <i class="fas fa-circle-info mt-0.5" aria-hidden="true"></i>
        <span>{{ $t('dashboard.demoNotice') }} <router-link to="/stress/triggers" class="font-semibold underline">{{ $t('dashboard.demoCta') }}</router-link></span>
      </div>

      <LoadingState v-if="isLoading && !stressData" />
      <ErrorState v-else-if="errorMessage && !stressData" :message="errorMessage" @retry="loadStressData" />

      <div v-else-if="stressData" class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,15rem)_1fr]" :class="{ 'opacity-60': isLoading }">
        <div class="space-y-5">
          <div>
            <p class="text-sm font-semibold text-muted-light">{{ $t('dashboard.chart.stressLevel') }}</p>
            <p class="text-5xl font-extrabold" :class="levelStyle.text">{{ stressData.currentLevel || 0 }}</p>
            <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div class="h-full rounded-full transition-all duration-700" :class="levelStyle.bar" :style="{ width: `${stressData.currentLevel || 0}%` }"></div>
            </div>
            <p class="mt-1 text-sm font-semibold" :class="levelStyle.text">{{ levelText }}</p>
          </div>
          <div class="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <div class="rounded-lg bg-primary/5 p-3">
              <p class="text-xs font-semibold text-muted-light">{{ $t('dashboard.chart.averageStress') }}</p>
              <p class="text-2xl font-extrabold text-foreground-light">{{ stressData.average || 0 }}</p>
            </div>
            <div class="rounded-lg bg-primary/5 p-3">
              <p class="text-xs font-semibold text-muted-light">{{ $t('dashboard.chart.peakStressHours') }}</p>
              <p class="text-lg font-extrabold text-foreground-light">{{ stressData.peakHours || '--' }}</p>
            </div>
          </div>
          <p class="flex items-center gap-2 text-sm font-semibold" :class="change <= 0 ? 'text-green-700' : 'text-red-700'">
            <i :class="change <= 0 ? 'fas fa-arrow-trend-down' : 'fas fa-arrow-trend-up'" aria-hidden="true"></i>
            {{ Math.abs(change) }}% {{ $t('dashboard.vsPrevious') }}
          </p>
        </div>
        <div>
          <StressLevelChart :chart-data="chartData" :period="selectedPeriod" :average-stress="stressData.average || 50" />
          <p class="mt-4 text-sm leading-relaxed text-muted-light">{{ insightText }}</p>
        </div>
      </div>
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
 * DashboardComponent - Resumen de estrés y accesos a herramientas.
 * Se eliminó el panel "Modo Debug" (creaba una sesión falsa), los datos aleatorios
 * que cambiaban en cada clic y la cuenta atrás que no funcionaba.
 */
import { DashboardService } from '../../services/DashboardService.js'
import { session, getDisplayName } from '../../services/session.js'
import StressLevelChart from '../../components/StressLevelChart.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import { formatLongDate } from '../../utils/date.js'

export default {
  name: 'DashboardComponent',
  components: { StressLevelChart, LoadingState, ErrorState },
  data() {
    return {
      stressData: null,
      isLoading: true,
      errorMessage: '',
      selectedPeriod: 'week',
      periods: ['day', 'week', 'month'],
      dashboardService: new DashboardService(),
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
    chartData() {
      return this.stressData?.weeklyData || []
    },
    change() {
      return this.stressData?.weeklyChange || 0
    },
    levelStyle() {
      const level = this.stressData?.currentLevel ?? 0
      if (level <= 40) return { text: 'text-green-700', bar: 'bg-green-600' }
      if (level <= 70) return { text: 'text-amber-700', bar: 'bg-amber-500' }
      return { text: 'text-red-700', bar: 'bg-red-600' }
    },
    levelText() {
      const level = this.stressData?.currentLevel ?? 0
      const key = level <= 30 ? 'veryLow' : level <= 50 ? 'low' : level <= 70 ? 'moderate' : level <= 85 ? 'high' : 'veryHigh'
      return this.$t(`dashboard.stressLevels.${key}`)
    },
    insightText() {
      if (!this.stressData) return ''
      const params = { percentage: Math.abs(this.change), peakHours: this.stressData.peakHours }
      return this.change <= 0 ? this.$t('dashboard.insights.decreased', params) : this.$t('dashboard.insights.increased', params)
    }
  },
  created() {
    this.loadStressData()
  },
  methods: {
    async loadStressData() {
      this.isLoading = true
      this.errorMessage = ''
      try {
        this.stressData = await this.dashboardService.getStressData(this.selectedPeriod)
      } catch (error) {
        this.errorMessage = this.$t('dashboard.errors.loadingData', { error: error.message })
      } finally {
        this.isLoading = false
      }
    },
    changePeriod(period) {
      if (period === this.selectedPeriod || this.isLoading) return
      this.selectedPeriod = period
      this.loadStressData()
    }
  }
}
</script>
