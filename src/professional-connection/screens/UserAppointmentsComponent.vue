<template>
  <div class="nz-page">
    <PageHeader :title="$t('appointments.list.title')" :subtitle="$t('appointments.list.subtitle')">
      <template #actions>
        <router-link to="/book-session" class="nz-btn-primary"><i class="fas fa-calendar-plus" aria-hidden="true"></i>{{ $t('navigation.bookSession') }}</router-link>
      </template>
    </PageHeader>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <EmptyState v-else-if="!appointments.length" icon="far fa-calendar" :title="$t('appointments.list.empty')" :message="$t('appointments.list.emptyHint')">
      <router-link to="/book-session" class="nz-btn-primary mt-2">{{ $t('navigation.bookSession') }}</router-link>
    </EmptyState>

    <div v-else class="space-y-8">
      <section v-for="group in groups" :key="group.key" :aria-labelledby="`group-${group.key}`">
        <h2 :id="`group-${group.key}`" class="mb-3 text-lg font-bold text-foreground-light">{{ $t(`appointments.list.${group.key}`) }} <span class="text-sm font-medium text-muted-light">({{ group.items.length }})</span></h2>
        <p v-if="!group.items.length" class="text-sm text-muted-light">{{ $t('appointments.list.none') }}</p>
        <ul v-else class="space-y-3">
          <li v-for="a in group.items" :key="a.id" class="nz-card flex flex-wrap items-center gap-4 p-4" :class="{ 'opacity-70': group.key === 'past' }">
            <div class="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span class="text-lg font-extrabold leading-none">{{ a.dateTime ? a.dateTime.getDate() : '—' }}</span>
              <span class="text-[11px] font-bold uppercase">{{ a.dateTime ? a.dateTime.toLocaleDateString(localeTag, { month: 'short' }) : '' }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-bold">{{ professionalName(a.professionalId) }}</p>
              <p class="text-sm text-muted-light">{{ clock(a.time) }} · {{ a.duration }} min</p>
            </div>
            <span class="rounded-full px-3 py-1 text-xs font-bold" :class="statusClass(a.status)">{{ statusLabel(a.status) }}</span>
            <router-link :to="{ name: 'AppointmentConfirmation', params: { appointmentId: a.id } }" class="nz-btn-ghost px-3 py-2">{{ $t('common.view') }}</router-link>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script>
/**
 * UserAppointmentsComponent - "Mis citas".
 * Completa la funcionalidad referenciada por la confirmación de pago
 * (ruta UserAppointments inexistente) usando AppointmentService.getAppointments,
 * que existía sin interfaz.
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import { AppointmentService } from '../../services/AppointmentService.js'
import { TherapistService } from '../../services/TherapistService.js'
import { getUserId } from '../../services/session.js'
import { formatClock } from '../../utils/date.js'

export default {
  name: 'UserAppointmentsComponent',
  components: { PageHeader, LoadingState, ErrorState, EmptyState },
  data() {
    return { loading: true, error: '', appointments: [], professionals: {} }
  },
  computed: {
    localeTag() {
      return this.$i18n.locale === 'en' ? 'en-US' : 'es-ES'
    },
    groups() {
      const now = new Date()
      const upcoming = this.appointments.filter((a) => a.dateTime && a.dateTime >= now)
      const past = this.appointments.filter((a) => !a.dateTime || a.dateTime < now).reverse()
      return [{ key: 'upcoming', items: upcoming }, { key: 'past', items: past }]
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
        const [appointments, professionals] = await Promise.all([
          new AppointmentService().getAppointments(getUserId()),
          new TherapistService().getTherapists().catch(() => [])
        ])
        this.appointments = appointments
        this.professionals = Object.fromEntries(professionals.map((p) => [String(p.id), p]))
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },
    professionalName(id) {
      return this.professionals[String(id)]?.name || this.$t('appointments.professionalFallback')
    },
    clock(time) {
      return formatClock(time, this.$i18n.locale)
    },
    statusLabel(status) {
      const key = `appointments.status.${status}`
      const text = this.$t(key)
      return text === key ? status : text
    },
    statusClass(status) {
      if (status === 'cancelled' || status === 'canceled') return 'bg-red-50 text-red-800'
      if (status === 'completed') return 'bg-gray-100 text-gray-700'
      return 'bg-green-50 text-green-800'
    }
  }
}
</script>
