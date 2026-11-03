<template>
  <div class="nz-page max-w-6xl">
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else>
      <!-- Saludo -->
      <section class="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-primary">{{ todayLabel }}</p>
          <h1 class="mt-1 text-3xl font-extrabold text-foreground-light sm:text-4xl">{{ $t('pro.dashboard.hello', { name: firstName }) }}</h1>
          <p class="mt-1 text-muted-light">{{ specialtyLabel }}</p>
        </div>
        <span class="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-sm font-bold text-green-800">
          <i class="fas fa-shield-halved" aria-hidden="true"></i>{{ $t('pro.badge.verified') }}
        </span>
      </section>

      <!-- Perfil incompleto -->
      <section v-if="!profileComplete" class="nz-card mb-6 flex flex-col gap-4 border-amber-200 p-5 sm:flex-row sm:items-center">
        <div class="flex-1">
          <p class="mb-2 font-bold text-foreground-light">{{ $t('pro.dashboard.incompleteTitle') }}</p>
          <ProfileProgress :profile="profile" :show-steps="false" />
          <p class="mt-2 text-sm text-muted-light">{{ $t('pro.dashboard.incompleteText') }}</p>
        </div>
        <router-link :to="{ name: 'ProProfile' }" class="nz-btn-primary shrink-0">{{ $t('pro.welcome.goProfile') }}</router-link>
      </section>

      <!-- Métricas -->
      <section class="grid gap-4 sm:grid-cols-3" :aria-label="$t('pro.dashboard.metrics')">
        <div v-for="m in metrics" :key="m.key" class="nz-card flex items-center gap-4 p-5">
          <span class="flex h-12 w-12 items-center justify-center rounded-xl" :class="m.tone"><i :class="[m.icon, 'text-lg']" aria-hidden="true"></i></span>
          <div>
            <p class="text-3xl font-extrabold text-foreground-light">{{ m.value }}</p>
            <p class="text-sm text-muted-light">{{ $t(`pro.dashboard.${m.key}`) }}</p>
          </div>
        </div>
      </section>

      <!-- Próximas citas -->
      <section class="mt-8" aria-labelledby="upcoming-title">
        <div class="mb-3 flex items-center justify-between">
          <h2 id="upcoming-title" class="text-xl font-bold text-foreground-light">{{ $t('pro.dashboard.upcoming') }}</h2>
          <router-link :to="{ name: 'ProSchedule' }" class="text-sm font-semibold text-primary hover:underline">{{ $t('pro.dashboard.viewSchedule') }}</router-link>
        </div>
        <EmptyState v-if="!upcoming.length" icon="far fa-calendar" :title="$t('pro.dashboard.noUpcoming')" :message="$t('pro.dashboard.noUpcomingHint')" />
        <ul v-else class="space-y-3">
          <li v-for="a in upcoming" :key="a.id" class="nz-card flex flex-wrap items-center gap-4 p-4">
            <div class="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span class="text-lg font-extrabold leading-none">{{ a.dateTime.getDate() }}</span>
              <span class="text-[11px] font-bold uppercase">{{ a.dateTime.toLocaleDateString(localeTag, { month: 'short' }) }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-bold text-foreground-light">{{ patientName(a) }}</p>
              <p class="text-sm text-muted-light">{{ clock(a.time) }} · {{ a.duration }} min<span v-if="a.notes"> · {{ a.notes }}</span></p>
            </div>
            <StatusChip :state="a.state" />
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script>
/**
 * ProDashboardComponent - Inicio del psicólogo verificado: saludo, estado del perfil,
 * métricas (citas de hoy, pendientes de confirmar, pacientes activos) y próximas citas.
 */
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import ProfileProgress from '../components/ProfileProgress.vue'
import StatusChip from '../components/StatusChip.vue'
import { loadPortalData, isToday, groupPatients, patientLabel } from '../usePortal.js'
import { profileSteps } from '../../services/ProfessionalService.js'
import { formatLongDate, formatClock } from '../../utils/date.js'

export default {
  name: 'ProDashboardComponent',
  components: { LoadingState, ErrorState, EmptyState, ProfileProgress, StatusChip },
  data() {
    return { loading: true, error: '', profile: null, appointments: [] }
  },
  computed: {
    localeTag() {
      return this.$i18n.locale === 'en' ? 'en-US' : 'es-ES'
    },
    todayLabel() {
      return formatLongDate(new Date(), this.$i18n.locale)
    },
    firstName() {
      return (this.profile?.name || '').split(' ')[0]
    },
    specialtyLabel() {
      const key = `specialties.${this.profile?.specialty}`
      const text = this.$t(key)
      return text === key ? this.profile?.specialty : text
    },
    profileComplete() {
      return profileSteps(this.profile).every((s) => s.done)
    },
    upcoming() {
      const now = new Date()
      return this.appointments.filter((a) => a.dateTime && a.dateTime >= now && ['pending', 'confirmed'].includes(a.state)).slice(0, 5)
    },
    metrics() {
      const active = groupPatients(this.appointments, this.$t.bind(this)).filter((p) => p.active).length
      return [
        { key: 'today', value: this.appointments.filter((a) => isToday(a.dateTime) && a.state !== 'cancelled').length, icon: 'fas fa-calendar-day', tone: 'bg-primary/10 text-primary' },
        { key: 'toConfirm', value: this.appointments.filter((a) => a.state === 'pending' && a.dateTime >= new Date()).length, icon: 'fas fa-hourglass-half', tone: 'bg-amber-50 text-amber-700' },
        { key: 'activePatients', value: active, icon: 'fas fa-user-group', tone: 'bg-sky-50 text-secondary' }
      ]
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
        Object.assign(this, await loadPortalData())
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },
    patientName(a) {
      return patientLabel(a, this.$t.bind(this))
    },
    clock(time) {
      return formatClock(time, this.$i18n.locale)
    }
  }
}
</script>
