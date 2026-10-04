<template>
  <div class="nz-page max-w-3xl">
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else>
      <div class="text-center print:text-left">
        <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-3xl text-green-700 print:hidden"><i class="fas fa-check" aria-hidden="true"></i></span>
        <h1 class="mt-4 text-3xl font-extrabold text-foreground-light">{{ $t('payments.receipt.title') }}</h1>
        <p class="mt-2 text-muted-light">{{ method === 'cash' ? $t('payments.receipt.cashMessage') : $t('payments.receipt.cardMessage') }}</p>
      </div>

      <section class="nz-card mt-8 divide-y divide-[#EEE9DD]">
        <dl class="grid gap-4 p-5 sm:grid-cols-2">
          <div><dt class="text-sm text-muted-light">{{ $t('payments.receipt.reference') }}</dt><dd class="font-mono font-semibold">{{ $route.params.paymentId }}</dd></div>
          <div><dt class="text-sm text-muted-light">{{ $t('payments.receipt.appointment') }}</dt><dd class="font-semibold">#{{ appointment.id }}</dd></div>
          <div><dt class="text-sm text-muted-light">{{ $t('navigation.professionals') }}</dt><dd class="font-semibold">{{ professional ? professional.name : $t('appointments.professionalFallback') }}</dd></div>
          <div><dt class="text-sm text-muted-light">{{ $t('professionals.booking.dateTime') }}</dt><dd class="font-semibold">{{ dateText }}</dd></div>
          <div><dt class="text-sm text-muted-light">{{ $t('appointments.duration') }}</dt><dd class="font-semibold">{{ appointment.duration }} min</dd></div>
          <div><dt class="text-sm text-muted-light">{{ $t('appointments.confirmation.paymentMethod') }}</dt><dd class="font-semibold">{{ $t(`appointments.methods.${method}`) }}</dd></div>
        </dl>
        <div class="flex items-center justify-between p-5">
          <span class="font-semibold">{{ $t('professionals.booking.total') }}</span>
          <span class="text-2xl font-extrabold text-primary">{{ professional ? `$${professional.price}` : '—' }}</span>
        </div>
      </section>

      <section class="mt-8" aria-labelledby="next-title">
        <h2 id="next-title" class="mb-3 text-lg font-bold">{{ $t('payment.confirmation.nextSteps') }}</h2>
        <ol class="space-y-3">
          <li v-for="n in 3" :key="n" class="flex gap-3">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{{ n }}</span>
            <span class="text-sm"><strong class="block">{{ $t(`payments.receipt.steps.${n}.title`) }}</strong><span class="text-muted-light">{{ $t(`payments.receipt.steps.${n}.text`) }}</span></span>
          </li>
        </ol>
      </section>

      <div class="mt-8 flex flex-wrap gap-2 print:hidden">
        <button type="button" class="nz-btn-secondary" @click="print"><i class="fas fa-print" aria-hidden="true"></i>{{ $t('payments.receipt.print') }}</button>
        <a :href="calendarUrl" target="_blank" rel="noopener noreferrer" class="nz-btn-secondary"><i class="fas fa-calendar-plus" aria-hidden="true"></i>{{ $t('payments.receipt.addToCalendar') }}</a>
        <router-link :to="{ name: 'UserAppointments' }" class="nz-btn-secondary"><i class="fas fa-list" aria-hidden="true"></i>{{ $t('navigation.myAppointments') }}</router-link>
        <router-link :to="{ name: 'Dashboard' }" class="nz-btn-primary sm:ml-auto"><i class="fas fa-house" aria-hidden="true"></i>{{ $t('notFound.goHome') }}</router-link>
      </div>
      <p class="mt-6 text-xs text-muted-light">{{ $t('payments.receipt.policy') }}</p>
    </template>
  </div>
</template>

<script>
/**
 * PaymentConfirmationComponent - Comprobante de la reserva.
 * Antes mostraba datos fijos (2024-01-15, Dra. María González, tarjeta 4242),
 * fallaba al renderizar y "Ver mis citas" apuntaba a una ruta inexistente.
 * Ahora muestra la cita real y el método elegido.
 */
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import { loadAppointmentDetails } from '../../professional-connection/appointmentDetails.js'
import { formatLongDate, formatClock, toApiDateTime } from '../../utils/date.js'

export default {
  name: 'PaymentConfirmationComponent',
  components: { LoadingState, ErrorState },
  data() {
    return { loading: true, error: '', appointment: null, professional: null }
  },
  computed: {
    method() {
      return this.$route.query.method === 'cash' ? 'cash' : 'card'
    },
    dateText() {
      const locale = this.$i18n.locale
      return `${formatLongDate(this.appointment.date, locale)} · ${formatClock(this.appointment.time, locale)}`
    },
    calendarUrl() {
      const start = new Date(toApiDateTime(this.appointment.date, this.appointment.time))
      const end = new Date(start.getTime() + this.appointment.duration * 60000)
      const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const title = `NeuroZen · ${this.professional ? this.professional.name : this.$t('appointments.professionalFallback')}`
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}`
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
        const { appointment, professional } = await loadAppointmentDetails(this.$route.params.appointmentId, this.$route.query)
        this.appointment = appointment
        this.professional = professional
      } catch {
        this.error = this.$t('appointments.notFound')
      } finally {
        this.loading = false
      }
    },
    print() {
      window.print()
    }
  }
}
</script>
