<template>
  <div class="nz-page">
    <PageHeader :title="$t('pro.nav.patients')" :subtitle="$t('pro.patients.subtitle')" :back="false" />

    <div class="mb-6 grid gap-3 sm:grid-cols-[1fr_auto]">
      <label>
        <span class="sr-only">{{ $t('common.search') }}</span>
        <input v-model="search" type="search" class="nz-input" :placeholder="$t('pro.patients.search')" />
      </label>
      <div class="inline-flex rounded-full bg-primary/10 p-1" role="radiogroup" :aria-label="$t('pro.patients.filter')">
        <button v-for="f in filters" :key="f" type="button" role="radio" :aria-checked="filter === f"
          class="rounded-full px-4 py-1.5 text-sm font-semibold" :class="filter === f ? 'bg-primary text-white' : 'text-primary hover:bg-primary/10'" @click="filter = f">
          {{ $t(`pro.patients.filters.${f}`) }}
        </button>
      </div>
    </div>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <EmptyState v-else-if="!visible.length" icon="fas fa-user-group" :title="$t('pro.patients.empty')" :message="$t('pro.patients.emptyHint')" />

    <ul v-else class="space-y-3">
      <li v-for="p in visible" :key="p.id" class="nz-card overflow-hidden">
        <button type="button" class="flex w-full flex-wrap items-center gap-4 p-4 text-left hover:bg-primary/5" :aria-expanded="expanded === p.id" @click="expanded = expanded === p.id ? null : p.id">
          <UserAvatar :name="p.name" size="md" />
          <div class="min-w-0 flex-1">
            <p class="font-bold text-foreground-light">{{ p.name }}</p>
            <p class="text-sm text-muted-light">{{ $tc('pro.patients.sessions', p.sessions, { count: p.sessions }) }}<span v-if="p.last"> · {{ $t('pro.patients.lastSession') }}: {{ shortDate(p.last.dateTime) }}</span></p>
          </div>
          <span v-if="reportsFor(p).length" class="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-secondary"><i class="fas fa-file-medical mr-1" aria-hidden="true"></i>{{ reportsFor(p).length }}</span>
          <span v-if="p.next" class="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-800">{{ $t('pro.patients.nextSession') }}: {{ shortDate(p.next.dateTime) }} · {{ clock(p.next.time) }}</span>
          <span v-else class="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{{ $t('pro.patients.noNext') }}</span>
          <i class="fas fa-chevron-down text-muted-light transition-transform" :class="{ 'rotate-180': expanded === p.id }" aria-hidden="true"></i>
        </button>
        <div v-if="expanded === p.id" class="border-t border-[#EEE9DD] bg-[#FAF8F3] p-4">
          <p v-if="p.email" class="mb-3 text-sm text-muted-light"><i class="fas fa-envelope mr-2" aria-hidden="true"></i>{{ p.email }}</p>
          <!-- Informes de progreso compartidos por el paciente (US15) -->
          <template v-if="reportsFor(p).length">
            <p class="mb-2 text-sm font-bold text-foreground-light"><i class="fas fa-file-medical mr-1 text-secondary" aria-hidden="true"></i>{{ $t('reports.received') }}</p>
            <ul class="mb-4 space-y-2">
              <li v-for="r in reportsFor(p)" :key="r.id" class="rounded-lg border border-sky-100 bg-white p-3 text-sm">
                <p class="text-xs font-semibold text-muted-light">{{ $t('reports.sharedOn', { date: shortDate(r.createdAt) }) }}</p>
                <dl class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div><dt class="text-xs text-muted-light">{{ $t('reports.current') }}</dt><dd class="font-bold">{{ r.stressCurrent }}/100</dd></div>
                  <div><dt class="text-xs text-muted-light">{{ $t('reports.average') }}</dt><dd class="font-bold">{{ r.stressAverage }}/100</dd></div>
                  <div><dt class="text-xs text-muted-light">{{ $t('reports.triggers') }}</dt><dd class="font-bold">{{ r.triggersCount }}<span v-if="r.topCategory" class="font-normal text-muted-light"> · {{ categoryLabel(r.topCategory) }}</span></dd></div>
                  <div><dt class="text-xs text-muted-light">{{ $t('reports.lastTest') }}</dt><dd class="font-bold">{{ r.lastAssessment ? `${r.lastAssessment.score}/40 · ${$t(`assessment.levels.${r.lastAssessment.level}.label`)}` : $t('reports.noTest') }}</dd></div>
                </dl>
                <p v-if="r.peakHours" class="mt-2 text-xs text-muted-light">{{ $t('dashboard.chart.peakStressHours') }}: {{ r.peakHours }} · {{ r.weeklyChange <= 0 ? '↓' : '↑' }} {{ Math.abs(r.weeklyChange) }}%</p>
                <p v-if="r.note" class="mt-2 whitespace-pre-line rounded bg-[#FAF8F3] px-2 py-1.5 italic">"{{ r.note }}"</p>
              </li>
            </ul>
          </template>
          <p class="mb-2 text-sm font-bold text-foreground-light">{{ $t('pro.patients.history') }}</p>
          <ul class="space-y-2">
            <li v-for="a in [...p.appointments].reverse()" :key="a.id" class="flex flex-wrap items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm">
              <span class="font-semibold">{{ shortDate(a.dateTime) }} · {{ clock(a.time) }}</span>
              <span v-if="a.notes" class="min-w-0 flex-1 truncate text-muted-light">{{ a.notes }}</span><span v-else class="flex-1"></span>
              <StatusChip :state="a.state" />
            </li>
          </ul>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
/**
 * ProPatientsComponent - Pacientes del psicólogo, derivados de sus citas.
 * Muestra sesiones realizadas, última sesión, próxima cita e historial por paciente.
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import StatusChip from '../components/StatusChip.vue'
import { loadPortalData, groupPatients } from '../usePortal.js'
import { ReportService } from '../../services/ReportService.js'
import { formatShortDate, formatClock } from '../../utils/date.js'

export default {
  name: 'ProPatientsComponent',
  components: { PageHeader, LoadingState, ErrorState, EmptyState, UserAvatar, StatusChip },
  data() {
    return { loading: true, error: '', appointments: [], reports: [], search: '', filter: 'active', filters: ['active', 'all'], expanded: null }
  },
  computed: {
    patients() {
      return groupPatients(this.appointments, this.$t.bind(this)).sort((a, b) => a.name.localeCompare(b.name))
    },
    visible() {
      const q = this.search.toLowerCase().trim()
      return this.patients
        .filter((p) => this.filter === 'all' || p.active)
        .filter((p) => !q || `${p.name} ${p.email}`.toLowerCase().includes(q))
    }
  },
  created() {
    this.load()
  },
  methods: {
    async load() {
      this.loading = true
      this.error = ''
      try {
        const data = await loadPortalData()
        this.appointments = data.appointments
        this.reports = await new ReportService().getReceived(data.profile.id).catch(() => [])
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },
    reportsFor(patient) {
      return this.reports.filter((r) => String(r.patientId) === patient.id)
    },
    categoryLabel(category) {
      const key = `stress.triggers.categories.${category}`
      const text = this.$t(key)
      return text === key ? category : text
    },
    shortDate(date) {
      return formatShortDate(date, this.$i18n.locale)
    },
    clock(time) {
      return formatClock(time, this.$i18n.locale)
    }
  }
}
</script>
