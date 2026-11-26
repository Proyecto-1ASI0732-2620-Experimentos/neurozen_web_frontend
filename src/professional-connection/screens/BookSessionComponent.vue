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
        <div v-else class="grid gap-3 sm:grid-cols-2" role="radiogroup" :aria-label="$t('professionals.booking.selectProfessional')">
          <button v-for="p in professionals" :key="p.id" type="button" role="radio" :aria-checked="selectedProfessional?.id === p.id"
            class="nz-card flex items-center gap-4 p-4 text-left transition-colors"
            :class="selectedProfessional?.id === p.id ? 'border-primary ring-2 ring-primary/30' : 'hover:border-primary/40'"
            @click="selectProfessional(p)">
            <img data-fallback="/images-of-professionals/usuariodemo.jpg" :src="p.image" :alt="p.name" class="h-16 w-16 shrink-0 rounded-full object-cover" />
            <span class="min-w-0 flex-1">
              <span class="block font-bold text-foreground-light">{{ p.name }}</span>
              <span class="block text-sm text-primary">{{ specialty(p.specialty) }}</span>
              <StarRating :value="p.rating" :count="p.reviews" />
            </span>
            <span class="text-right text-sm">
              <template v-if="fee(p.price)"><span class="block text-lg font-extrabold">{{ fee(p.price) }}</span><span class="text-muted-light">{{ $t('professionals.perSession') }}</span></template>
              <span v-else class="block text-sm font-semibold text-muted-light">{{ $t('professionals.feeToBeDefined') }}</span>
            </span>
          </button>
        </div>
        <p class="mt-4 text-sm"><router-link to="/therapists" class="font-semibold text-primary hover:underline">{{ $t('professionals.booking.seeProfiles') }}</router-link></p>
      </section>

      <!-- 2. Fecha y hora (A2: solo días con disponibilidad real) -->
      <section v-else-if="currentStep === 'datetime'" aria-labelledby="datetime-title">
        <h2 id="datetime-title" class="sr-only">{{ $t('professionals.booking.steps.datetime') }}</h2>
        <div v-if="editingFromSummary" class="mb-4 flex gap-3 rounded-lg bg-primary/5 p-3 text-sm text-foreground-light" role="status">
          <i class="fas fa-pen mt-0.5 text-primary" aria-hidden="true"></i>{{ $t('professionals.booking.editingNotice') }}
        </div>

        <div v-if="!scheduleKnown && !serverAvailable.size" class="mb-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="note">
          <i class="fas fa-circle-info mt-0.5" aria-hidden="true"></i>
          <span>{{ $t('professionals.booking.noSchedule') }} <router-link to="/therapists" class="font-semibold underline">{{ $t('professionals.booking.chooseAnother') }}</router-link></span>
        </div>
        <p v-else-if="!selectedDate && firstAvailable" class="mb-4 text-sm text-foreground-light">
          {{ $t('professionals.booking.nextAvailable', { date: longDate(firstAvailable) }) }}
          <button type="button" class="ml-1 font-semibold text-primary underline" @click="goToDate(firstAvailable)">{{ $t('professionals.booking.pickThisDate') }}</button>
        </p>

        <div class="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]">
          <div ref="calendar" class="nz-card p-4 sm:p-5" tabindex="-1">
            <div class="mb-4 flex items-center justify-between">
              <button type="button" class="h-10 w-10 rounded-lg hover:bg-primary/10 disabled:opacity-30" :disabled="!canGoPrevMonth" :aria-label="$t('professionals.booking.prevMonth')" @click="changeMonth(-1)"><i class="fas fa-chevron-left" aria-hidden="true"></i></button>
              <h3 class="font-bold" aria-live="polite">{{ monthLabel }}</h3>
              <button type="button" class="h-10 w-10 rounded-lg hover:bg-primary/10 disabled:opacity-30" :disabled="!canGoNextMonth" :aria-label="$t('professionals.booking.nextMonth')" @click="changeMonth(1)"><i class="fas fa-chevron-right" aria-hidden="true"></i></button>
            </div>
            <div class="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-light" aria-hidden="true">
              <span v-for="d in weekHeaders" :key="d" class="py-1">{{ d }}</span>
            </div>
            <div class="grid grid-cols-7 gap-1">
              <template v-for="cell in calendar" :key="cell.key">
                <span v-if="!cell.inMonth" aria-hidden="true"></span>
                <button v-else type="button" class="aspect-square rounded-lg text-sm font-semibold transition-colors"
                  :class="cellClass(cell)" :disabled="cell.state !== 'available'" :aria-pressed="cell.iso === selectedDate"
                  :aria-label="`${cell.label} · ${$t(`professionals.booking.dayState.${cell.iso === selectedDate ? 'selected' : cell.state}`)}`"
                  :data-state="cell.state" @click="selectDate(cell.iso)">
                  {{ cell.day }}
                </button>
              </template>
            </div>
            <ul class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-light" :aria-label="$t('professionals.booking.legend')">
              <li class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-primary/15 ring-1 ring-primary/40"></span>{{ $t('professionals.booking.dayState.available') }}</li>
              <li class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-primary"></span>{{ $t('professionals.booking.dayState.selected') }}</li>
              <li class="flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-gray-100 ring-1 ring-gray-300"></span>{{ $t('professionals.booking.dayState.unavailable') }}</li>
              <li class="flex items-center gap-1.5"><span class="h-3 w-3 rounded border border-dashed border-gray-300"></span>{{ $t('professionals.booking.dayState.outOfRange') }}</li>
            </ul>
          </div>
          <div ref="slots" tabindex="-1">
            <h3 class="mb-3 font-bold">{{ $t('professionals.booking.selectTime') }}</h3>
            <p class="mb-3 text-xs text-muted-light"><i class="far fa-clock mr-1" aria-hidden="true"></i>{{ $t('professionals.booking.timezone', { zone: timeZone }) }}</p>
            <p v-if="!selectedDate" class="text-sm text-muted-light">{{ $t('professionals.booking.pickDateFirst') }}</p>
            <p v-else-if="loadingSlots" class="text-sm text-muted-light" role="status">{{ $t('common.loading') }}</p>
            <div v-else-if="!availableSlots.length" class="space-y-2 text-sm" role="status">
              <p class="text-muted-light">{{ $t('professionals.booking.noSlots') }}</p>
              <p v-if="nextAfterSelected" class="font-semibold text-foreground-light">
                {{ $t('professionals.booking.nextAvailable', { date: longDate(nextAfterSelected) }) }}
              </p>
              <button v-if="nextAfterSelected" type="button" class="nz-btn-secondary px-3 py-2" @click="goToDate(nextAfterSelected)">{{ $t('professionals.booking.pickThisDate') }}</button>
            </div>
            <template v-else>
              <div class="grid grid-cols-3 gap-2 md:grid-cols-2" role="group" :aria-label="$t('professionals.booking.selectTime')">
                <button v-for="slot in availableSlots" :key="slot" type="button" class="slot" :class="{ 'slot-active': selectedTime === slot }" :aria-pressed="selectedTime === slot" @click="selectedTime = slot">
                  {{ clock(slot) }}
                </button>
              </div>
              <p v-if="slotsSource === 'schedule'" class="mt-3 text-xs text-muted-light">{{ $t('professionals.booking.slotsFromSchedule') }}</p>
            </template>
            <p v-if="slotError" class="nz-field-error mt-3" role="alert">{{ slotError }}</p>
          </div>
        </div>
      </section>

      <!-- 3. Tipo de cita -->
      <section v-else-if="currentStep === 'sessionType'" aria-labelledby="type-title">
        <h2 id="type-title" class="mb-4 text-lg font-bold">{{ $t('professionals.booking.sessionType') }}</h2>
        <div class="grid gap-3 sm:grid-cols-3" role="radiogroup" :aria-label="$t('professionals.booking.sessionType')">
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

      <!-- 4. Resumen (A3: editar fecha u hora sin retroceder por todos los pasos) -->
      <section v-else class="nz-card divide-y divide-[#EEE9DD]" aria-labelledby="summary-title">
        <h2 id="summary-title" class="sr-only">{{ $t('professionals.booking.summary') }}</h2>
        <div class="flex items-center gap-4 p-5">
          <img data-fallback="/images-of-professionals/usuariodemo.jpg" :src="selectedProfessional.image" :alt="selectedProfessional.name" class="h-14 w-14 rounded-full object-cover" />
          <div><p class="font-bold">{{ selectedProfessional.name }}</p><p class="text-sm text-primary">{{ specialty(selectedProfessional.specialty) }}</p></div>
        </div>
        <dl class="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <dt class="text-sm text-muted-light">{{ $t('professionals.booking.date') }}</dt>
            <dd class="font-semibold">{{ longDate(selectedDate) }}</dd>
            <dd><button type="button" class="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline" data-testid="edit-date" @click="editFromSummary('date')"><i class="fas fa-pen text-xs" aria-hidden="true"></i>{{ $t('professionals.booking.editDate') }}</button></dd>
          </div>
          <div>
            <dt class="text-sm text-muted-light">{{ $t('professionals.booking.time') }}</dt>
            <dd class="font-semibold">{{ clock(selectedTime) }} <span class="text-xs font-normal text-muted-light">({{ timeZone }})</span></dd>
            <dd><button type="button" class="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline" data-testid="edit-time" @click="editFromSummary('time')"><i class="fas fa-pen text-xs" aria-hidden="true"></i>{{ $t('professionals.booking.editTime') }}</button></dd>
          </div>
          <div><dt class="text-sm text-muted-light">{{ $t('professionals.booking.sessionType') }}</dt><dd class="font-semibold">{{ typeName(selectedSessionType) }} ({{ selectedSessionType.duration }} min)</dd></div>
        </dl>
        <div class="p-5">
          <label class="nz-label" for="bs-notes">{{ $t('professionals.booking.notes') }}</label>
          <textarea id="bs-notes" v-model="notes" rows="3" maxlength="500" class="nz-input" :placeholder="$t('professionals.booking.notesPlaceholder')"></textarea>
        </div>
        <div class="flex items-center justify-between p-5">
          <span class="font-semibold">{{ $t('professionals.booking.total') }}</span>
          <span v-if="fee(selectedProfessional.price)" class="text-2xl font-extrabold text-primary">{{ fee(selectedProfessional.price) }}</span>
          <span v-else class="font-semibold text-muted-light">{{ $t('professionals.feeToBeDefined') }}</span>
        </div>
        <p v-if="slotError" class="p-5 text-sm font-semibold text-red-700" role="alert">{{ slotError }}</p>
      </section>

      <!-- Navegación del asistente -->
      <div class="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <button v-if="stepIndex > 0 && !editingFromSummary" type="button" class="nz-btn-secondary" @click="previousStep"><i class="fas fa-arrow-left" aria-hidden="true"></i>{{ $t('common.previous') }}</button>
        <button v-else-if="editingFromSummary" type="button" class="nz-btn-secondary" @click="cancelEdit">{{ $t('professionals.booking.cancelEdit') }}</button>
        <span v-else></span>
        <button v-if="editingFromSummary" type="button" class="nz-btn-primary" :disabled="!canContinue" @click="backToSummary">{{ $t('professionals.booking.saveAndReturn') }}<i class="fas fa-check" aria-hidden="true"></i></button>
        <button v-else-if="currentStep !== 'summary'" type="button" class="nz-btn-primary" :disabled="!canContinue" @click="nextStep">{{ $t('common.next') }}<i class="fas fa-arrow-right" aria-hidden="true"></i></button>
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
 * BookSessionComponent - Asistente de reserva en 4 pasos.
 *
 * A2 (disponibilidad): el calendario pide al backend las horas libres del mes (GET /appointments/availability) y,
 * si no responde, habilita los días en los que el profesional atiende según su horario publicado
 * (availabilitySchedule), siempre dentro de la ventana de reserva; los días consultados sin horas libres
 * pasan a «no disponible» y se ofrece «Próxima fecha disponible». Las horas vienen de
 * GET /professionals/{id}/available-slots; si no responde, se derivan del horario publicado (se indica).
 * Ya no se inventan horarios fijos. Mes con formato correcto («Noviembre de 2026»), idioma y zona horaria.
 * A3 (edición): «Editar fecha» / «Editar hora» en el resumen llevan directo al paso 2 y vuelven al resumen
 * conservando profesional, tipo y notas. Antes de confirmar se revalida que la hora siga libre.
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import StarRating from '../../components/StarRating.vue'
import { AppointmentService, bookingRange, hasSchedule, isScheduledDay, nextAvailableDate } from '../../services/AppointmentService.js'
import { TherapistService } from '../../services/TherapistService.js'
import { getUserId } from '../../services/session.js'
import { toast } from '../../composables/useToast.js'
import { toLocalISODate, formatClock, formatLongDate, parseLocalDate } from '../../utils/date.js'
import { formatFee, specialtyLabel } from '../../utils/professionalFormat.js'
import { goToConfirmation } from '../bookingFlow.js'

const STEPS = ['professional', 'datetime', 'sessionType', 'summary']
const DATETIME = STEPS.indexOf('datetime')
const SUMMARY = STEPS.indexOf('summary')

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
      slotsSource: '',
      loadingSlots: false,
      slotRequest: 0,
      /** Días ya consultados sin horas libres (por profesional) */
      emptyDays: new Set(),
      /** Días con horas libres según GET /appointments/availability */
      serverAvailable: new Set(),
      serverNext: null,
      loadedMonths: new Set(),
      rangeRequest: 0,
      slotError: '',
      selectedSessionType: null,
      notes: '',
      editingFromSummary: false,
      /** Copia de fecha/hora al empezar a editar, para «Cancelar» */
      editBackup: null
    }
  },
  computed: {
    currentStep() {
      return STEPS[this.stepIndex]
    },
    localeTag() {
      return this.$i18n.locale === 'en' ? 'en-US' : 'es-ES'
    },
    timeZone() {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local'
      } catch {
        return 'local'
      }
    },
    range() {
      return bookingRange()
    },
    schedule() {
      return this.selectedProfessional?.availabilitySchedule || null
    },
    scheduleKnown() {
      return hasSchedule(this.schedule)
    },
    /** «noviembre de 2026» → «Noviembre de 2026» (antes `capitalize` ponía «Noviembre De 2026») */
    monthLabel() {
      const text = new Date(this.viewYear, this.viewMonth, 1).toLocaleDateString(this.localeTag, { month: 'long', year: 'numeric' })
      return text.charAt(0).toUpperCase() + text.slice(1)
    },
    weekHeaders() {
      // Semana empezando en lunes (2024-01-01 fue lunes)
      return Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(this.localeTag, { weekday: 'short' }))
    },
    canGoPrevMonth() {
      const now = new Date()
      return this.viewYear > now.getFullYear() || (this.viewYear === now.getFullYear() && this.viewMonth > now.getMonth())
    },
    canGoNextMonth() {
      const max = parseLocalDate(this.range.max)
      return this.viewYear < max.getFullYear() || (this.viewYear === max.getFullYear() && this.viewMonth < max.getMonth())
    },
    calendar() {
      const first = new Date(this.viewYear, this.viewMonth, 1)
      const offset = (first.getDay() + 6) % 7
      return Array.from({ length: 42 }, (_, i) => {
        const date = new Date(this.viewYear, this.viewMonth, 1 - offset + i)
        const iso = toLocalISODate(date)
        return {
          key: iso,
          iso,
          day: date.getDate(),
          inMonth: date.getMonth() === this.viewMonth,
          state: this.dayState(iso),
          label: date.toLocaleDateString(this.localeTag, { dateStyle: 'full' })
        }
      })
    },
    firstAvailable() {
      if (this.serverNext && !this.emptyDays.has(this.serverNext)) return this.serverNext
      const known = [...this.serverAvailable].filter((d) => !this.emptyDays.has(d)).sort((a, b) => a.localeCompare(b))[0]
      const bySchedule = nextAvailableDate(null, this.schedule, { range: this.range, unavailable: this.emptyDays })
      return [known, bySchedule].filter(Boolean).sort((a, b) => a.localeCompare(b))[0] || null
    },
    nextAfterSelected() {
      return this.selectedDate ? nextAvailableDate(this.selectedDate, this.schedule, { range: this.range, unavailable: this.emptyDays }) : null
    },
    canContinue() {
      const checks = {
        professional: () => !!this.selectedProfessional,
        datetime: () => !!this.selectedDate && !!this.selectedTime && this.availableSlots.includes(this.selectedTime),
        sessionType: () => !!this.selectedSessionType
      }
      const check = checks[this.currentStep]
      return check ? check() : true
    }
  },
  created() {
    void this.loadInitialData()
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
        if (preselected) {
          const found = professionals.find((p) => String(p.id) === String(preselected))
          if (found) await this.selectProfessional(found)
        }
      } catch (error) {
        this.loadError = error.message
      } finally {
        this.loading = false
      }
    },
    fee(price) {
      return formatFee(price, this.$i18n.locale)
    },
    specialty(value) {
      return specialtyLabel((k) => this.$t(k), value)
    },
    /** Al cambiar de profesional se reinician fecha, hora y la disponibilidad consultada */
    async selectProfessional(p) {
      if (this.selectedProfessional?.id !== p.id) {
        this.selectedDate = ''
        this.selectedTime = ''
        this.availableSlots = []
        this.emptyDays = new Set()
        this.serverAvailable = new Set()
        this.serverNext = null
        this.loadedMonths = new Set()
      }
      this.selectedProfessional = p
      // Si la lista no trae el horario, se pide el perfil (dato real del backend)
      if (!hasSchedule(p.availabilitySchedule)) {
        try {
          const full = await this.therapistService.getTherapist(p.id)
          if (this.selectedProfessional?.id === p.id && full.availabilitySchedule) {
            this.selectedProfessional = { ...p, availabilitySchedule: full.availabilitySchedule }
          }
        } catch {
          /* sin horario publicado: el paso 2 lo indica */
        }
      }
    },
    dayState(iso) {
      if (iso < this.range.min || iso > this.range.max) return 'outOfRange'
      if (this.emptyDays.has(iso)) return 'unavailable'
      if (this.serverAvailable.has(iso)) return 'available'
      if (!isScheduledDay(iso, this.schedule)) return 'unavailable'
      return 'available'
    },
    cellClass(cell) {
      if (cell.iso === this.selectedDate) return 'bg-primary text-white ring-2 ring-primary/40'
      if (cell.state === 'outOfRange') return 'border border-dashed border-gray-200 text-gray-400'
      if (cell.state === 'unavailable') return 'bg-gray-100 text-gray-500 line-through'
      return 'bg-primary/10 text-foreground-light ring-1 ring-primary/30 hover:bg-primary/20'
    },
    changeMonth(delta) {
      const d = new Date(this.viewYear, this.viewMonth + delta, 1)
      this.viewYear = d.getFullYear()
      this.viewMonth = d.getMonth()
      void this.loadMonthAvailability()
    },
    /**
     * Pide al backend las horas libres del mes visible (dentro de la ventana de reserva). Los días sin horas
     * quedan deshabilitados desde el principio; si el endpoint no responde, se usa el horario publicado.
     */
    async loadMonthAvailability() {
      if (!this.selectedProfessional) return
      const proId = this.selectedProfessional.id
      const key = `${proId}:${this.viewYear}-${this.viewMonth}`
      if (this.loadedMonths.has(key)) return
      const first = toLocalISODate(new Date(this.viewYear, this.viewMonth, 1))
      const last = toLocalISODate(new Date(this.viewYear, this.viewMonth + 1, 0))
      const start = first < this.range.min ? this.range.min : first
      const end = last > this.range.max ? this.range.max : last
      if (start > end) return
      const request = ++this.rangeRequest
      const result = await this.appointmentService.getAvailabilityRange(proId, start, end).catch(() => null)
      if (!result || request !== this.rangeRequest || this.selectedProfessional?.id !== proId) return
      this.loadedMonths = new Set([...this.loadedMonths, key])
      const empty = new Set(this.emptyDays)
      const available = new Set(this.serverAvailable)
      Object.entries(result.days).forEach(([iso, slots]) => {
        if (slots.length) { available.add(iso); empty.delete(iso) } else { empty.add(iso); available.delete(iso) }
      })
      this.emptyDays = empty
      this.serverAvailable = available
      if (result.nextAvailableDate && (!this.serverNext || result.nextAvailableDate < this.serverNext)) this.serverNext = result.nextAvailableDate
    },
    goToDate(iso) {
      const d = parseLocalDate(iso)
      this.viewYear = d.getFullYear()
      this.viewMonth = d.getMonth()
      void this.loadMonthAvailability()
      void this.selectDate(iso)
    },
    async selectDate(iso) {
      if (this.dayState(iso) !== 'available') return
      const previousTime = this.selectedTime
      this.selectedDate = iso
      this.slotError = ''
      await this.loadSlots(iso)
      // Al editar la fecha se conserva la hora si sigue libre en el nuevo día
      this.selectedTime = this.availableSlots.includes(previousTime) ? previousTime : ''
    },
    async loadSlots(iso) {
      const request = ++this.slotRequest
      this.loadingSlots = true
      this.availableSlots = []
      try {
        const { slots, source } = await this.appointmentService.getSlotsForDate(this.selectedProfessional.id, iso, this.schedule, this.selectedSessionType?.duration)
        if (request !== this.slotRequest) return
        this.availableSlots = slots
        this.slotsSource = source
        if (!slots.length) {
          this.emptyDays = new Set([...this.emptyDays, iso])
          this.serverAvailable = new Set([...this.serverAvailable].filter((d) => d !== iso))
        }
      } catch (error) {
        if (request === this.slotRequest) this.slotError = error.message
      } finally {
        if (request === this.slotRequest) this.loadingSlots = false
      }
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
      if (!this.canContinue || this.stepIndex >= STEPS.length - 1) return
      this.stepIndex++
      if (this.currentStep === 'datetime') void this.prepareCalendar()
    },
    /** Al entrar al paso 2: muestra el mes de la próxima fecha disponible y carga su disponibilidad */
    async prepareCalendar() {
      await this.loadMonthAvailability()
      if (!this.selectedDate && this.firstAvailable) {
        const d = parseLocalDate(this.firstAvailable)
        if (d.getFullYear() !== this.viewYear || d.getMonth() !== this.viewMonth) {
          this.viewYear = d.getFullYear()
          this.viewMonth = d.getMonth()
          await this.loadMonthAvailability()
        }
      }
    },
    previousStep() {
      if (this.stepIndex > 0) this.stepIndex--
    },
    /** A3: va directo a fecha/hora y enfoca el control pedido */
    editFromSummary(field) {
      this.editBackup = { date: this.selectedDate, time: this.selectedTime }
      this.editingFromSummary = true
      this.slotError = ''
      this.stepIndex = DATETIME
      const d = parseLocalDate(this.selectedDate)
      if (d) { this.viewYear = d.getFullYear(); this.viewMonth = d.getMonth() }
      void this.loadMonthAvailability()
      if (this.selectedDate) void this.loadSlots(this.selectedDate)
      this.$nextTick(() => {
        const target = field === 'time' ? this.$refs.slots : this.$refs.calendar
        if (target) target.focus()
      })
    },
    backToSummary() {
      if (!this.canContinue) return
      this.editingFromSummary = false
      this.editBackup = null
      this.stepIndex = SUMMARY
    },
    cancelEdit() {
      if (this.editBackup) {
        this.selectedDate = this.editBackup.date
        this.selectedTime = this.editBackup.time
      }
      this.editingFromSummary = false
      this.editBackup = null
      this.stepIndex = SUMMARY
    },
    /** Revalida la hora justo antes de confirmar; si ya no está libre, vuelve a fecha/hora */
    async ensureStillAvailable() {
      const { slots, source } = await this.appointmentService.getSlotsForDate(this.selectedProfessional.id, this.selectedDate, this.schedule, this.selectedSessionType?.duration)
      if (source === 'none' || !slots.includes(this.selectedTime)) {
        this.availableSlots = slots
        this.slotsSource = source
        if (!slots.length) this.emptyDays = new Set([...this.emptyDays, this.selectedDate])
        this.selectedTime = ''
        this.editingFromSummary = true
        this.editBackup = null
        this.stepIndex = DATETIME
        this.slotError = this.$t('professionals.booking.slotTaken')
        return false
      }
      return true
    },
    async confirmBooking() {
      if (this.isBooking) return
      this.isBooking = true
      this.slotError = ''
      try {
        if (!(await this.ensureStillAvailable())) return
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
        if (error.status === 409) {
          // El backend rechazó la hora (otra persona la reservó): se elige otra sin perder lo demás
          this.selectedTime = ''
          this.editingFromSummary = true
          this.stepIndex = DATETIME
          this.slotError = this.$t('professionals.booking.slotTaken')
          await this.loadSlots(this.selectedDate)
        } else {
          toast.error(this.$t('common.errorBookingAppointment', { error: error.message }))
        }
      } finally {
        this.isBooking = false
      }
    }
  }
}
</script>

<style scoped>
.slot { @apply min-h-[44px] rounded-lg border border-[#D6D2C7] bg-white px-3 py-2 text-sm font-semibold text-foreground-light transition-colors hover:border-primary; }
.slot-active { @apply border-primary bg-primary text-white; }
</style>
