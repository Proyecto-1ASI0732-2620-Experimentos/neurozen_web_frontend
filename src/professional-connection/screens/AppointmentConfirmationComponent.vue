<template>
  <div class="nz-page max-w-3xl">
    <PageHeader :title="$t('appointments.confirmation.title')" :subtitle="$t('appointments.confirmation.subtitle')" back="/appointments" />

    <LoadingState v-if="loading" :message="$t('common.loadingAppointment')" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else>
      <div class="mb-6 flex gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900" role="status">
        <i class="fas fa-circle-check mt-0.5" aria-hidden="true"></i>{{ $t('appointments.confirmation.registered') }}
      </div>

      <section class="nz-card divide-y divide-[#EEE9DD]">
        <div class="flex items-center gap-4 p-5">
          <img v-if="professional" :src="professional.image" :alt="professional.name" class="h-14 w-14 rounded-full object-cover" />
          <div>
            <p class="font-bold">{{ professional ? professional.name : $t('appointments.professionalFallback') }}</p>
            <p v-if="professional" class="text-sm text-primary">{{ professional.specialty }}</p>
          </div>
        </div>
        <dl class="grid gap-4 p-5 sm:grid-cols-3">
          <div><dt class="text-sm text-muted-light">{{ $t('professionals.booking.dateTime') }}</dt><dd class="font-semibold">{{ dateText }}</dd></div>
          <div><dt class="text-sm text-muted-light">{{ $t('appointments.duration') }}</dt><dd class="font-semibold">{{ appointment.duration }} min</dd></div>
          <div><dt class="text-sm text-muted-light">{{ $t('appointments.cost') }}</dt><dd class="font-semibold">{{ professional ? `$${professional.price}` : '—' }}</dd></div>
        </dl>
        <div v-if="appointment.notes" class="p-5">
          <p class="text-sm text-muted-light">{{ $t('professionals.booking.notes') }}</p>
          <p class="whitespace-pre-line text-sm">{{ appointment.notes }}</p>
        </div>
        <fieldset class="p-5">
          <legend class="nz-label">{{ $t('appointments.confirmation.paymentMethod') }}</legend>
          <div class="grid gap-3 sm:grid-cols-2">
            <label v-for="m in methods" :key="m.value" class="flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors"
              :class="paymentMethod === m.value ? 'border-primary bg-primary/5' : 'border-[#D6D2C7] hover:border-primary/50'">
              <input v-model="paymentMethod" type="radio" name="payment" :value="m.value" class="text-primary focus:ring-primary" />
              <i :class="[m.icon, 'text-primary']" aria-hidden="true"></i>
              <span class="font-semibold">{{ $t(`appointments.methods.${m.value}`) }}</span>
            </label>
          </div>
          <p class="nz-hint mt-3">{{ $t('appointments.confirmation.paymentNote') }}</p>
        </fieldset>
      </section>

      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <router-link :to="{ name: 'UserAppointments' }" class="nz-btn-secondary">{{ $t('navigation.myAppointments') }}</router-link>
        <button type="button" class="nz-btn-primary" @click="confirm">
          <i class="fas fa-check" aria-hidden="true"></i>{{ $t('appointments.confirmation.confirm') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script>
/**
 * AppointmentConfirmationComponent - Revisión de la cita creada y método de pago.
 * Antes usaba AppointmentService sin importarlo (siempre caía en datos de la URL)
 * y "confirmar" era un setTimeout sin efecto. Ahora carga la cita real y lleva
 * al comprobante con los datos elegidos.
 * Dependencia del backend: no existe endpoint de pagos de citas; el método
 * elegido se muestra en el comprobante y el cobro no se procesa en línea.
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import { loadAppointmentDetails } from '../appointmentDetails.js'
import { formatLongDate, formatClock } from '../../utils/date.js'

export default {
  name: 'AppointmentConfirmationComponent',
  components: { PageHeader, LoadingState, ErrorState },
  data() {
    return {
      loading: true,
      error: '',
      appointment: null,
      professional: null,
      paymentMethod: 'card',
      methods: [{ value: 'card', icon: 'fas fa-credit-card' }, { value: 'cash', icon: 'fas fa-money-bill-wave' }]
    }
  },
  computed: {
    dateText() {
      const locale = this.$i18n.locale
      return `${formatLongDate(this.appointment.date, locale)} · ${formatClock(this.appointment.time, locale)}`
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
    confirm() {
      const a = this.appointment
      this.$router.push({
        name: 'PaymentConfirmation',
        params: { appointmentId: a.id, paymentId: `R${Date.now().toString(36).toUpperCase()}` },
        query: { method: this.paymentMethod, professionalId: a.professionalId, date: a.date, time: a.time, duration: a.duration }
      })
    }
  }
}
</script>
