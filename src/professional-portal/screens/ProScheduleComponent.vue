<template>
  <div class="nz-page max-w-6xl">
    <PageHeader :title="$t('pro.nav.schedule')" :subtitle="$t('pro.schedule.subtitle')" :back="false" />

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />

    <div v-else class="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <!-- Citas -->
      <section aria-labelledby="appointments-title">
        <h2 id="appointments-title" class="sr-only">{{ $t('pro.schedule.appointments') }}</h2>
        <div class="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="radiogroup" :aria-label="$t('pro.schedule.appointments')">
          <button v-for="tab in tabs" :key="tab" type="button" role="radio" :aria-checked="activeTab === tab"
            class="inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
            :class="activeTab === tab ? 'border-primary bg-primary text-white' : 'border-[#D6D2C7] bg-white text-foreground-light hover:border-primary'"
            @click="activeTab = tab">
            {{ $t(`pro.schedule.tabs.${tab}`) }}<span class="text-xs opacity-75">{{ countFor(tab) }}</span>
          </button>
        </div>

        <EmptyState v-if="!groups.length" icon="far fa-calendar" :title="$t('pro.schedule.empty')" />
        <div v-else class="space-y-6">
          <div v-for="group in groups" :key="group.key">
            <h3 class="mb-2 text-sm font-bold text-muted-light">{{ group.label }}</h3>
            <ul class="space-y-3">
              <li v-for="a in group.items" :key="a.id" class="nz-card p-4">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="w-16 text-lg font-extrabold text-primary">{{ clock(a.time) }}</span>
                  <div class="min-w-0 flex-1">
                    <p class="font-bold text-foreground-light">{{ patientName(a) }}</p>
                    <p class="text-sm text-muted-light">{{ typeName(a.type) }} · {{ a.duration }} min</p>
                  </div>
                  <StatusChip :state="a.state" />
                </div>
                <p v-if="a.notes" class="mt-2 whitespace-pre-line rounded-lg bg-[#FAF8F3] px-3 py-2 text-sm text-foreground-light">{{ a.notes }}</p>
                <div v-if="actionsFor(a).length" class="mt-3 flex flex-wrap justify-end gap-2">
                  <button v-for="action in actionsFor(a)" :key="action" type="button" :disabled="busyId === a.id"
                    :class="action === 'cancel' ? 'nz-btn-secondary text-red-700' : 'nz-btn-primary'" class="px-3 py-2" @click="askAction(a, action)">
                    <span v-if="busyId === a.id" class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>
                    <i v-else :class="actionIcons[action]" aria-hidden="true"></i>{{ $t(`pro.schedule.actions.${action}`) }}
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Disponibilidad -->
      <aside class="nz-card h-fit space-y-5 p-5 lg:sticky lg:top-[calc(var(--header-height)+1rem)]" aria-labelledby="availability-title">
        <div>
          <h2 id="availability-title" class="text-lg font-bold text-foreground-light">{{ $t('pro.schedule.availability') }}</h2>
          <p class="text-sm text-muted-light">{{ $t('pro.schedule.availabilityHint') }}</p>
        </div>
        <fieldset>
          <legend class="nz-label">{{ $t('stress.activeBreaks.workingDays') }}</legend>
          <div class="flex flex-wrap gap-2">
            <button v-for="day in weekDays" :key="day" type="button" class="h-10 w-10 rounded-full text-sm font-bold transition-colors"
              :class="availability.days.includes(day) ? 'bg-primary text-white' : 'border border-[#D6D2C7] bg-white text-foreground-light hover:border-primary'"
              :aria-pressed="availability.days.includes(day)" :aria-label="$t(`common.days.${day}`)" @click="toggleDay(day)">
              {{ $t(`stress.activeBreaks.weekDays.${day}`) }}
            </button>
          </div>
        </fieldset>
        <div class="grid grid-cols-2 gap-3">
          <label class="text-sm text-muted-light">{{ $t('stress.activeBreaks.start') }}<input v-model="availability.start" type="time" class="nz-input mt-1" /></label>
          <label class="text-sm text-muted-light">{{ $t('stress.activeBreaks.end') }}<input v-model="availability.end" type="time" class="nz-input mt-1" :class="{ 'nz-input-error': availabilityError }" /></label>
        </div>
        <p v-if="availabilityError" class="nz-field-error">{{ availabilityError }}</p>
        <p v-else-if="preview" class="rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary"><i class="far fa-clock mr-1" aria-hidden="true"></i>{{ preview }}</p>
        <button type="button" class="nz-btn-primary w-full" :disabled="savingAvailability" @click="saveAvailability">
          <span v-if="savingAvailability" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
          {{ $t('pro.schedule.saveAvailability') }}
        </button>
      </aside>
    </div>

    <ConfirmDialog :open="!!pending" :danger="pending && pending.action === 'cancel'" :busy="!!busyId"
      :title="pending ? $t(`pro.schedule.confirm.${pending.action}.title`) : ''"
      :message="pending ? $t(`pro.schedule.confirm.${pending.action}.message`, { name: patientName(pending.appointment) }) : ''"
      :confirm-text="pending ? $t(`pro.schedule.actions.${pending.action}`) : ''" @cancel="pending = null" @confirm="runAction" />
  </div>
</template>

<script>
/**
 * ProScheduleComponent - Agenda del psicólogo.
 *  - Citas agrupadas por día con acciones: confirmar, cancelar y marcar como atendida.
 *  - Disponibilidad semanal (días y horario) que se muestra a los pacientes en el directorio.
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue'
import StatusChip from '../components/StatusChip.vue'
import { loadPortalData, proService, patientLabel } from '../usePortal.js'
import { WEEK_DAYS, APPOINTMENT_STATUS, availabilityText } from '../../services/ProfessionalService.js'
import { DEFAULT_APPOINTMENT_TYPES } from '../../services/AppointmentService.js'
import { formatLongDate, formatClock, toLocalISODate } from '../../utils/date.js'
import { toast } from '../../composables/useToast.js'

const ACTION_STATUS = { confirm: APPOINTMENT_STATUS.CONFIRMED, cancel: APPOINTMENT_STATUS.CANCELLED, complete: APPOINTMENT_STATUS.COMPLETED }
const ACTION_STATE = { confirm: 'confirmed', cancel: 'cancelled', complete: 'completed' }

export default {
  name: 'ProScheduleComponent',
  components: { PageHeader, LoadingState, ErrorState, EmptyState, ConfirmDialog, StatusChip },
  data() {
    return {
      loading: true,
      error: '',
      profile: null,
      appointments: [],
      tabs: ['upcoming', 'pending', 'past', 'cancelled'],
      activeTab: 'upcoming',
      busyId: null,
      pending: null,
      weekDays: WEEK_DAYS,
      availability: { days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], start: '09:00', end: '18:00' },
      savingAvailability: false,
      actionIcons: { confirm: 'fas fa-check', cancel: 'fas fa-ban', complete: 'fas fa-check-double' }
    }
  },
  computed: {
    filtered() {
      return this.appointments.filter((a) => this.inTab(a, this.activeTab))
    },
    groups() {
      const list = [...this.filtered]
      if (['past', 'cancelled'].includes(this.activeTab)) list.reverse()
      const map = new Map()
      list.forEach((a) => {
        const key = a.date || 'sin-fecha'
        if (!map.has(key)) map.set(key, { key, label: this.dayLabel(a), items: [] })
        map.get(key).items.push(a)
      })
      return [...map.values()]
    },
    availabilityError() {
      if (!this.availability.days.length) return this.$t('pro.schedule.errors.noDays')
      if (this.availability.end <= this.availability.start) return this.$t('stress.activeBreaks.invalidHours')
      return ''
    },
    preview() {
      return availabilityText(this.availability)
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
        this.profile = data.profile
        this.appointments = data.appointments
        if (data.profile.availabilitySchedule?.days) this.availability = { ...data.profile.availabilitySchedule }
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },
    inTab(a, tab) {
      const future = a.dateTime && a.dateTime >= new Date()
      if (tab === 'upcoming') return future && ['pending', 'confirmed'].includes(a.state)
      if (tab === 'pending') return future && a.state === 'pending'
      if (tab === 'cancelled') return a.state === 'cancelled'
      return !future && a.state !== 'cancelled'
    },
    countFor(tab) {
      return this.appointments.filter((a) => this.inTab(a, tab)).length
    },
    /** Acciones válidas según el estado y si la cita ya pasó */
    actionsFor(a) {
      const future = a.dateTime && a.dateTime >= new Date()
      if (a.state === 'pending' && future) return ['cancel', 'confirm']
      if (a.state === 'confirmed' && future) return ['cancel']
      if (a.state === 'confirmed' && !future) return ['complete']
      return []
    },
    dayLabel(a) {
      if (!a.dateTime) return '—'
      if (a.date === toLocalISODate()) return this.$t('pro.schedule.today')
      return formatLongDate(a.dateTime, this.$i18n.locale)
    },
    patientName(a) {
      return a ? patientLabel(a, this.$t.bind(this)) : ''
    },
    typeName(type) {
      const found = DEFAULT_APPOINTMENT_TYPES.find((t) => String(t.id) === String(type))
      return found ? this.$t(`appointments.types.${found.key}`) : this.$t('pro.schedule.session')
    },
    clock(time) {
      return formatClock(time, this.$i18n.locale)
    },
    askAction(appointment, action) {
      // Confirmar no necesita diálogo; cancelar y marcar como atendida sí
      if (action === 'confirm') this.runAction({ appointment, action })
      else this.pending = { appointment, action }
    },
    async runAction(input) {
      const { appointment, action } = input && input.appointment ? input : this.pending
      this.busyId = appointment.id
      try {
        await proService.updateAppointmentStatus(appointment.id, ACTION_STATUS[action])
        const target = this.appointments.find((a) => a.id === appointment.id)
        if (target) target.state = ACTION_STATE[action]
        toast.success(this.$t(`pro.schedule.done.${action}`))
        this.pending = null
      } catch (error) {
        toast.error(error.message)
      } finally {
        this.busyId = null
      }
    },
    toggleDay(day) {
      const days = this.availability.days
      this.availability.days = days.includes(day) ? days.filter((d) => d !== day) : WEEK_DAYS.filter((d) => [...days, day].includes(d))
    },
    async saveAvailability() {
      if (this.availabilityError || this.savingAvailability) return
      this.savingAvailability = true
      try {
        this.profile = await proService.updateMyProfile({ availabilitySchedule: { ...this.availability } })
        toast.success(this.$t('pro.schedule.availabilitySaved'))
      } catch (error) {
        toast.error(error.message)
      } finally {
        this.savingAvailability = false
      }
    }
  }
}
</script>
