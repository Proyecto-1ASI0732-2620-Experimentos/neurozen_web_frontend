<template>
  <div class="nz-page max-w-3xl">
    <PageHeader :title="$t('professionals.booking.title')" :subtitle="therapist ? $t('professionals.booking.with', { name: therapist.name }) : ''" back="/therapists" />

    <LoadingState v-if="isLoading" />
    <ErrorState v-else-if="loadError" :message="loadError" @retry="loadTherapistData" />

    <template v-else-if="therapist">
      <div class="nz-card mb-6 flex items-center gap-4 p-4">
        <img data-fallback="/images-of-professionals/usuariodemo.jpg" :src="therapist.image" :alt="therapist.name" class="h-16 w-16 rounded-full object-cover" />
        <div class="min-w-0">
          <p class="font-bold text-foreground-light">{{ therapist.name }}</p>
          <p class="text-sm text-primary">{{ therapist.specialty }}</p>
          <p class="text-sm text-muted-light">${{ therapist.price }} / {{ $t('professionals.perSession') }}</p>
        </div>
      </div>

      <form class="nz-card space-y-6 p-5 sm:p-6" novalidate @submit.prevent="submitBooking">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="nz-label" for="ba-date">{{ $t('professionals.booking.selectDate') }}</label>
            <input id="ba-date" v-model="form.date" type="date" class="nz-input" :class="{ 'nz-input-error': errors.date }" :min="minDate" @change="loadSlots" />
            <p v-if="errors.date" class="nz-field-error">{{ errors.date }}</p>
          </div>
          <div>
            <label class="nz-label" for="ba-type">{{ $t('professionals.booking.sessionType') }}</label>
            <select id="ba-type" v-model="form.type" class="nz-input">
              <option v-for="type in types" :key="type.id" :value="type.id">{{ typeName(type) }} · {{ type.duration }} min</option>
            </select>
          </div>
        </div>

        <fieldset v-if="form.date">
          <legend class="nz-label">{{ $t('professionals.booking.selectTime') }}</legend>
          <p v-if="loadingSlots" class="text-sm text-muted-light">{{ $t('common.loading') }}</p>
          <p v-else-if="!slots.length" class="text-sm text-muted-light">{{ $t('professionals.booking.noSlots') }}</p>
          <div v-else class="grid grid-cols-3 gap-2 sm:grid-cols-4">
            <button v-for="slot in slots" :key="slot" type="button" class="slot" :class="{ 'slot-active': form.time === slot }" :aria-pressed="form.time === slot" @click="form.time = slot">
              {{ clock(slot) }}
            </button>
          </div>
          <p v-if="errors.time" class="nz-field-error">{{ errors.time }}</p>
        </fieldset>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="nz-label" for="ba-phone">{{ $t('professionals.booking.phone') }}</label>
            <input id="ba-phone" v-model.trim="form.phone" type="tel" autocomplete="tel" class="nz-input" :class="{ 'nz-input-error': errors.phone }" placeholder="+51 987 654 321" />
            <p v-if="errors.phone" class="nz-field-error">{{ errors.phone }}</p>
          </div>
          <div>
            <label class="nz-label" for="ba-email">{{ $t('professionals.booking.email') }}</label>
            <input id="ba-email" v-model.trim="form.email" type="email" autocomplete="email" class="nz-input" :class="{ 'nz-input-error': errors.email }" />
            <p v-if="errors.email" class="nz-field-error">{{ errors.email }}</p>
          </div>
        </div>

        <div>
          <label class="nz-label" for="ba-notes">{{ $t('professionals.booking.notes') }}</label>
          <textarea id="ba-notes" v-model="form.notes" rows="3" maxlength="500" class="nz-input" :placeholder="$t('professionals.booking.notesPlaceholder')"></textarea>
        </div>

        <button type="submit" class="nz-btn-primary w-full py-3" :disabled="isSubmitting">
          <span v-if="isSubmitting" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
          {{ isSubmitting ? $t('professionals.booking.booking') : $t('professionals.booking.confirm') }}
        </button>
      </form>
    </template>
  </div>
</template>

<script>
/**
 * BookAppointmentComponent - Reserva directa con un profesional.
 * Usa el mismo contrato de API que BookSession (antes enviaba userId fijo 1 y
 * otro formato), valida teléfono/email y no oculta el formulario si falla.
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import { TherapistService } from '../../services/TherapistService.js'
import { AppointmentService } from '../../services/AppointmentService.js'
import { getUserId, session } from '../../services/session.js'
import { toast } from '../../composables/useToast.js'
import { isEmail, isPhone } from '../../utils/validation.js'
import { toLocalISODate, formatClock } from '../../utils/date.js'
import { goToConfirmation } from '../bookingFlow.js'

export default {
  name: 'BookAppointmentComponent',
  components: { PageHeader, LoadingState, ErrorState },
  data() {
    return {
      therapistService: new TherapistService(),
      appointmentService: new AppointmentService(),
      therapist: null,
      types: [],
      slots: [],
      isLoading: true,
      loadingSlots: false,
      loadError: '',
      isSubmitting: false,
      minDate: toLocalISODate(),
      form: { date: '', time: '', type: 1, phone: session.user?.phone || '', email: session.user?.email || '', notes: '' },
      errors: {}
    }
  },
  created() {
    this.loadTherapistData()
  },
  methods: {
    clock(time) {
      return formatClock(time, this.$i18n.locale)
    },
    typeName(type) {
      return type.key ? this.$t(`appointments.types.${type.key}`) : type.name
    },
    async loadTherapistData() {
      this.isLoading = true
      this.loadError = ''
      try {
        const [therapist, types] = await Promise.all([this.therapistService.getTherapist(this.$route.params.id), this.appointmentService.getAppointmentTypes()])
        this.therapist = therapist
        this.types = types
        this.form.type = types[0]?.id ?? 1
      } catch (error) {
        this.loadError = error.message
      } finally {
        this.isLoading = false
      }
    },
    async loadSlots() {
      this.form.time = ''
      if (!this.form.date) return
      this.loadingSlots = true
      this.slots = await this.appointmentService.getAvailableSlots(this.therapist.id, this.form.date)
      this.loadingSlots = false
    },
    validate() {
      const e = {}
      if (!this.form.date) e.date = this.$t('validation.required')
      else if (this.form.date < toLocalISODate()) e.date = this.$t('validation.pastDate')
      if (!this.form.time) e.time = this.$t('validation.selectTime')
      if (!isPhone(this.form.phone)) e.phone = this.$t('validation.phone')
      if (!isEmail(this.form.email)) e.email = this.$t('validation.email')
      this.errors = e
      return !Object.keys(e).length
    },
    async submitBooking() {
      if (!this.validate() || this.isSubmitting) return
      this.isSubmitting = true
      // El contrato del backend no tiene campos de contacto: se adjuntan a las notas
      const contact = `${this.$t('professionals.booking.phone')}: ${this.form.phone} · ${this.$t('professionals.booking.email')}: ${this.form.email}`
      const notes = [this.form.notes.trim(), contact].filter(Boolean).join('\n')
      try {
        const payload = this.appointmentService.buildPayload({
          patientId: getUserId(), professionalId: this.therapist.id, date: this.form.date, time: this.form.time, appointmentType: this.form.type, notes
        })
        const created = await this.appointmentService.bookAppointment(payload)
        const type = this.types.find((t) => t.id === this.form.type)
        goToConfirmation(this.$router, created, { professionalId: this.therapist.id, date: this.form.date, time: this.form.time, duration: type?.duration, notes: this.form.notes })
      } catch (error) {
        toast.error(this.$t('common.errorBookingAppointment', { error: error.message }))
      } finally {
        this.isSubmitting = false
      }
    }
  }
}
</script>

<style scoped>
.slot { @apply rounded-lg border border-[#D6D2C7] bg-white px-3 py-2 text-sm font-semibold text-foreground-light transition-colors hover:border-primary; }
.slot-active { @apply border-primary bg-primary text-white; }
</style>
