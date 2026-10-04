<template>
  <div class="nz-page max-w-4xl">
    <PageHeader :title="$t('professionals.bookSession')" :subtitle="$t('professionals.booking.wizardSubtitle')" />

    <!-- Indicador de pasos -->
    <ol class="mb-8 grid grid-cols-4 gap-2" :aria-label="$t('professionals.booking.progress')">
      <li v-for="(step, i) in steps" :key="step" class="flex flex-col gap-2">
        <span class="h-1.5 rounded-full" :class="i <= stepIndex ? 'bg-primary' : 'bg-primary/15'"></span>
        <span class="hidden text-xs font-semibold sm:block" :class="i === stepIndex ? 'text-primary' : 'text-muted-light'" :aria-current="i === stepIndex ? 'step' : undefined">
          {{ i + 1 }}. {{ $t(`professionals.booking.steps.${step}`) }}
        </span>
      </li>
    </ol>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="loadError" :message="loadError" @retry="loadInitialData" />

    <template v-else>
      <!-- 1. Profesional -->
      <section v-if="currentStep === 'professional'" aria-labelledby="step-title">
        <h2 id="step-title" class="mb-4 text-lg font-bold">{{ $t('professionals.booking.selectProfessional') }}</h2>
        <EmptyState v-if="!professionals.length" icon="fas fa-user-doctor" :title="$t('professionals.directory.empty')" />
        <div v-else class="grid gap-3 sm:grid-cols-2" role="radiogroup">
          <button v-for="p in professionals" :key="p.id" type="button" role="radio" :aria-checked="selectedProfessional?.id === p.id"
            class="nz-card flex items-center gap-4 p-4 text-left transition-colors"
            :class="selectedProfessional?.id === p.id ? 'border-primary ring-2 ring-primary/30' : 'hover:border-primary/40'"
            @click="selectProfessional(p)">
            <img data-fallback="/images-of-professionals/usuariodemo.jpg" :src="p.image" :alt="p.name" class="h-16 w-16 shrink-0 rounded-full object-cover" />
            <span class="min-w-0 flex-1">
              <span class="block font-bold text-foreground-light">{{ p.name }}</span>
              <span class="block text-sm text-primary">{{ p.specialty }}</span>
              <StarRating :value="p.rating" :count="p.reviews" />
            </span>
            <span class="text-right text-sm"><span class="block text-lg font-extrabold">${{ p.price }}</span><span class="text-muted-light">{{ $t('professionals.perSession') }}</span></span>
          </button>
        </div>
        <p class="mt-4 text-sm"><router-link to="/therapists" class="font-semibold text-primary hover:underline">{{ $t('professionals.booking.seeProfiles') }}</router-link></p>
      </section>

      <!-- 2. Fecha y hora -->
      <section v-else-if="currentStep === 'datetime'" class="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]">
        <div class="nz-card p-4 sm:p-5">
          <div class="mb-4 flex items-center justify-between">
            <button type="button" class="h-9 w-9 rounded-lg hover:bg-primary/10 disabled:opacity-30" :disabled="!canGoPrevMonth" :aria-label="$t('common.previous')" @click="changeMonth(-1)"><i class="fas fa-chevron-left" aria-hidden="true"></i></button>
            <h2 class="font-bold capitalize">{{ monthLabel }}</h2>
            <button type="button" class="h-9 w-9 rounded-lg hover:bg-primary/10" :aria-label="$t('common.next')" @click="changeMonth(1)"><i class="fas fa-chevron-right" aria-hidden="true"></i></button>
          </div>
          <div class="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-light">
            <span v-for="d in weekHeaders" :key="d" class="py-1">{{ d }}</span>
          </div>
          <div class="grid grid-cols-7 gap-1">
            <button v-for="cell in calendar" :key="cell.key" type="button" class="aspect-square rounded-lg text-sm font-semibold transition-colors"
              :class="cellClass(cell)" :disabled="!cell.available" :aria-pressed="cell.iso === selectedDate" :aria-label="cell.label" @click="selectDate(cell)">
              {{ cell.day }}
            </button>
          </div>
        </div>
        <div>
          <h2 class="mb-3 font-bold">{{ $t('professionals.booking.selectTime') }}</h2>
          <p v-if="!selectedDate" class="text-sm text-muted-light">{{ $t('professionals.booking.pickDateFirst') }}</p>
          <p v-else-if="loadingSlots" class="text-sm text-muted-light">{{ $t('common.loading') }}</p>
          <p v-else-if="!availableSlots.length" class="text-sm text-muted-light">{{ $t('professionals.booking.noSlots') }}</p>
          <div v-else class="grid grid-cols-3 gap-2 md:grid-cols-2">
            <button v-for="slot in availableSlots" :key="slot" type="button" class="slot" :class="{ 'slot-active': selectedTime === slot }" :aria-pressed="selectedTime === slot" @click="selectedTime = slot">
              {{ clock(slot) }}
            </button>
          </div>
        </div>
      </section>

      <!-- 3. Tipo de sesión -->
      <section v-else-if="currentStep === 'sessionType'" aria-labelledby="type-title">
        <h2 id="type-title" class="mb-4 text-lg font-bold">{{ $t('professionals.booking.sessionType') }}</h2>
        <div class="grid gap-3 sm:grid-cols-3" role="radiogroup">
          <button v-for="type in sessionTypes" :key="type.id" type="button" role="radio" :aria-checked="selectedSessionType?.id === type.id"
            class="nz-card flex flex-col items-start gap-2 p-5 text-left transition-colors"
            :class="selectedSessionType?.id === type.id ? 'border-primary ring-2 ring-primary/30' : 'hover:border-primary/40'"
            @click="selectedSessionType = type">
            <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><i :class="type.icon" aria-hidden="true"></i></span>
            <span class="font-bold">{{ typeName(type) }}</span>
            <span v-if="type.description" class="text-sm text-muted-light">{{ type.description }}</span>
            <span class="text-sm font-semibold text-muted-light">{{ type.duration }} min</span>
          </button>
        </div>
      </section>

      <!-- 4. Resumen -->
      <section v-else class="nz-card divide-y divide-[#EEE9DD]">
        <div class="flex items-center gap-4 p-5">
          <img data-fallback="/images-of-professionals/usuariodemo.jpg" :src="selectedProfessional.image" :alt="selectedProfessional.name" class="h-14 w-14 rounded-full object-cover" />
          <div><p class="font-bold">{{ selectedProfessional.name }}</p><p class="text-sm text-primary">{{ selectedProfessional.specialty }}</p></div>
        </div>
        <dl class="grid gap-4 p-5 sm:grid-cols-2">
          <div><dt class="text-sm text-muted-light">{{ $t('professionals.booking.dateTime') }}</dt><dd class="font-semibold">{{ longDate(selectedDate) }} · {{ clock(selectedTime) }}</dd></div>
          <div><dt class="text-sm text-muted-light">{{ $t('professionals.booking.sessionType') }}</dt><dd class="font-semibold">{{ typeName(selectedSessionType) }} ({{ selectedSessionType.duration }} min)</dd></div>
        </dl>
        <div class="p-5">
          <label class="nz-label" for="bs-notes">{{ $t('professionals.booking.notes') }}</label>
          <textarea id="bs-notes" v-model="notes" rows="3" maxlength="500" class="nz-input" :placeholder="$t('professionals.booking.notesPlaceholder')"></textarea>
        </div>
        <div class="flex items-center justify-between p-5">
          <span class="font-semibold">{{ $t('professionals.booking.total') }}</span>
          <span class="text-2xl font-extrabold text-primary">${{ selectedProfessional.price }}</span>
        </div>
      </section>

      <!-- Navegación del asistente -->
      <div class="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <button v-if="stepIndex > 0" type="button" class="nz-btn-secondary" @click="previousStep"><i class="fas fa-arrow-left" aria-hidden="true"></i>{{ $t('common.previous') }}</button>
        <span v-else></span>
        <button v-if="currentStep !== 'summary'" type="button" class="nz-btn-primary" :disabled="!canContinue" @click="nextStep">{{ $t('common.next') }}<i class="fas fa-arrow-right" aria-hidden="true"></i></button>
        <button v-else type="button" class="nz-btn-primary" :disabled="isBooking" @click="confirmBooking">
          <span v-if="isBooking" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
          {{ isBooking ? $t('professionals.booking.booking') : $t('professionals.booking.confirm') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script>
/**
 * BookSessionComponent - Asistente de reserva en 4 pasos (flujo original conservado).
 * Corrige: horarios que nunca se pedían al backend (llamada estática a la clase),
 * hora local enviada como UTC, tipos de sesión con id de texto, id de cita
 * inventado, días del mes anterior mal calculados y uso de alert().
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import StarRating from '../../components/StarRating.vue'
import { AppointmentService } from '../../services/AppointmentService.js'
import { TherapistService } from '../../services/TherapistService.js'
import { getUserId } from '../../services/session.js'
import { toast } from '../../composables/useToast.js'
import { toLocalISODate, formatClock, formatLongDate } from '../../utils/date.js'
import { goToConfirmation } from '../bookingFlow.js'

const STEPS = ['professional', 'datetime', 'sessionType', 'summary']

export default {
  name: 'BookSessionComponent',
  components: { PageHeader, LoadingState, ErrorState, EmptyState, StarRating },
  data() {
    const today = new Date()
    return {
      appointmentService: new AppointmentService(),
      therapistService: new TherapistService(),
      steps: STEPS,
      stepIndex: 0,
      loading: true,
      loadError: '',
      isBooking: false,
      professionals: [],
      sessionTypes: [],
      selectedProfessional: null,
      viewYear: today.getFullYear(),
      viewMonth: today.getMonth(),
      selectedDate: '',
      selectedTime: '',
      availableSlots: [],
      loadingSlots: false,
      selectedSessionType: null,
      notes: ''
    }
  },
  computed: {
    currentStep() {
      return STEPS[this.stepIndex]
    },
    localeTag() {
      return this.$i18n.locale === 'en' ? 'en-US' : 'es-ES'
    },
    monthLabel() {
      return new Date(this.viewYear, this.viewMonth, 1).toLocaleDateString(this.localeTag, { month: 'long', year: 'numeric' })
    },
    weekHeaders() {
      // Semana empezando en lunes
      return Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(this.localeTag, { weekday: 'short' }))
    },
    canGoPrevMonth() {
      const now = new Date()
      return this.viewYear > now.getFullYear() || (this.viewYear === now.getFullYear() && this.viewMonth > now.getMonth())
    },
    calendar() {
      const first = new Date(this.viewYear, this.viewMonth, 1)
      const offset = (first.getDay() + 6) % 7
      const today = toLocalISODate()
      return Array.from({ length: 42 }, (_, i) => {
        const date = new Date(this.viewYear, this.viewMonth, 1 - offset + i)
        const iso = toLocalISODate(date)
        const inMonth = date.getMonth() === this.viewMonth
        return {
          key: iso,
          iso,
          day: date.getDate(),
          inMonth,
          available: inMonth && iso >= today,
          label: date.toLocaleDateString(this.localeTag, { dateStyle: 'full' })
        }
      })
    },
    canContinue() {
      if (this.currentStep === 'professional') return !!this.selectedProfessional
      if (this.currentStep === 'datetime') return !!this.selectedDate && !!this.selectedTime
      if (this.currentStep === 'sessionType') return !!this.selectedSessionType
      return true
    }
  },
  created() {
    this.loadInitialData()
  },
  methods: {
    async loadInitialData() {
      this.loading = true
      this.loadError = ''
      try {
        const [professionals, types] = await Promise.all([this.therapistService.getTherapists(), this.appointmentService.getAppointmentTypes()])
        this.professionals = professionals
        this.sessionTypes = types
        const preselected = this.$route.query.professionalId
        if (preselected) this.selectedProfessional = professionals.find((p) => String(p.id) === String(preselected)) || null
      } catch (error) {
        this.loadError = error.message
      } finally {
        this.loading = false
      }
    },
    selectProfessional(p) {
      if (this.selectedProfessional?.id !== p.id) {
        this.selectedDate = ''
        this.selectedTime = ''
      }
      this.selectedProfessional = p
    },
    changeMonth(delta) {
      const d = new Date(this.viewYear, this.viewMonth + delta, 1)
      this.viewYear = d.getFullYear()
      this.viewMonth = d.getMonth()
    },
    cellClass(cell) {
      if (cell.iso === this.selectedDate) return 'bg-primary text-white'
      if (!cell.inMonth) return 'text-transparent'
      if (!cell.available) return 'text-gray-300'
      return 'text-foreground-light hover:bg-primary/10'
    },
    async selectDate(cell) {
      if (!cell.available) return
      this.selectedDate = cell.iso
      this.selectedTime = ''
      this.loadingSlots = true
      this.availableSlots = await this.appointmentService.getAvailableSlots(this.selectedProfessional.id, cell.iso)
      this.loadingSlots = false
    },
    clock(time) {
      return formatClock(time, this.$i18n.locale)
    },
    longDate(iso) {
      return formatLongDate(iso, this.$i18n.locale)
    },
    typeName(type) {
      return type.key ? this.$t(`appointments.types.${type.key}`) : type.name
    },
    nextStep() {
      if (this.canContinue && this.stepIndex < STEPS.length - 1) this.stepIndex++
    },
    previousStep() {
      if (this.stepIndex > 0) this.stepIndex--
    },
    async confirmBooking() {
      if (this.isBooking) return
      this.isBooking = true
      try {
        const payload = this.appointmentService.buildPayload({
          patientId: getUserId(),
          professionalId: this.selectedProfessional.id,
          date: this.selectedDate,
          time: this.selectedTime,
          appointmentType: this.selectedSessionType.id,
          notes: this.notes
        })
        const created = await this.appointmentService.bookAppointment(payload)
        goToConfirmation(this.$router, created, {
          professionalId: this.selectedProfessional.id,
          date: this.selectedDate,
          time: this.selectedTime,
          duration: this.selectedSessionType.duration,
          notes: this.notes
        })
      } catch (error) {
        toast.error(this.$t('common.errorBookingAppointment', { error: error.message }))
      } finally {
        this.isBooking = false
      }
    }
  }
}
</script>

<style scoped>
.slot { @apply rounded-lg border border-[#D6D2C7] bg-white px-3 py-2 text-sm font-semibold text-foreground-light transition-colors hover:border-primary; }
.slot-active { @apply border-primary bg-primary text-white; }
</style>
