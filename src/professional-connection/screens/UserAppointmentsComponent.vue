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
          <li v-for="a in group.items" :key="a.id" class="nz-card p-4" :class="{ 'opacity-75': a.state === 'cancelled' }">
            <div class="flex flex-wrap items-center gap-4">
              <div class="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span class="text-lg font-extrabold leading-none">{{ a.dateTime ? a.dateTime.getDate() : '—' }}</span>
                <span class="text-[11px] font-bold uppercase">{{ a.dateTime ? a.dateTime.toLocaleDateString(localeTag, { month: 'short' }) : '' }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-bold">{{ professionalName(a.professionalId) }}</p>
                <p class="text-sm text-muted-light">{{ clock(a.time) }} · {{ a.duration }} min</p>
              </div>
              <StatusChip :state="a.state" />
            </div>

            <!-- Acciones del paciente -->
            <div class="mt-3 flex flex-wrap items-center justify-end gap-2">
              <span v-if="sharedFor(a)" class="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-secondary"><i class="fas fa-file-circle-check" aria-hidden="true"></i>{{ $t('appointments.actions.reportShared') }}</span>
              <span v-if="a.reviewed" class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800"><i class="fas fa-star" aria-hidden="true"></i>{{ $t('appointments.actions.reviewed') }}</span>
              <router-link :to="{ name: 'AppointmentConfirmation', params: { appointmentId: a.id } }" class="nz-btn-ghost px-3 py-2">{{ $t('common.view') }}</router-link>
              <button v-if="canShare(a)" type="button" class="nz-btn-secondary px-3 py-2" @click="openShare(a)"><i class="fas fa-file-export" aria-hidden="true"></i>{{ $t('appointments.actions.share') }}</button>
              <button v-if="canReview(a)" type="button" class="nz-btn-primary px-3 py-2" @click="openReview(a)"><i class="fas fa-star" aria-hidden="true"></i>{{ $t('appointments.actions.review') }}</button>
              <button v-if="canCancel(a)" type="button" class="nz-btn-secondary px-3 py-2 text-red-700" @click="toCancel = a"><i class="fas fa-ban" aria-hidden="true"></i>{{ $t('appointments.actions.cancel') }}</button>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <!-- Cancelar -->
    <ConfirmDialog :open="!!toCancel" danger :busy="busy" :title="$t('appointments.cancelDialog.title')"
      :message="toCancel ? $t('appointments.cancelDialog.message', { name: professionalName(toCancel.professionalId) }) : ''"
      :confirm-text="$t('appointments.actions.cancel')" :cancel-text="$t('appointments.cancelDialog.keep')" @cancel="toCancel = null" @confirm="cancelAppointment" />

    <!-- Compartir informe (US15) -->
    <ConfirmDialog :open="!!toShare" :busy="busy" :title="$t('appointments.shareDialog.title')"
      :message="toShare ? $t('appointments.shareDialog.message', { name: professionalName(toShare.professionalId) }) : ''"
      :confirm-text="$t('appointments.actions.share')" @cancel="toShare = null" @confirm="shareReport">
      <p v-if="loadingSummary" class="mt-4 text-sm text-muted-light">{{ $t('common.loading') }}</p>
      <dl v-else-if="summary" class="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-[#FAF8F3] p-3 text-sm">
        <div><dt class="text-muted-light">{{ $t('reports.current') }}</dt><dd class="font-bold">{{ summary.stressCurrent }}/100</dd></div>
        <div><dt class="text-muted-light">{{ $t('reports.average') }}</dt><dd class="font-bold">{{ summary.stressAverage }}/100</dd></div>
        <div><dt class="text-muted-light">{{ $t('reports.triggers') }}</dt><dd class="font-bold">{{ summary.triggersCount }}</dd></div>
        <div><dt class="text-muted-light">{{ $t('reports.lastTest') }}</dt><dd class="font-bold">{{ summary.lastAssessment ? `${summary.lastAssessment.score}/40 · ${$t(`assessment.levels.${summary.lastAssessment.level}.label`)}` : $t('reports.noTest') }}</dd></div>
      </dl>
      <p v-if="summary && summary.isDemoData" class="mt-2 text-xs text-amber-800">{{ $t('reports.demoWarning') }}</p>
      <label class="mt-3 block">
        <span class="nz-label">{{ $t('reports.noteLabel') }}</span>
        <textarea v-model="shareNote" rows="3" maxlength="500" class="nz-input" :placeholder="$t('reports.notePlaceholder')"></textarea>
      </label>
      <p class="mt-2 text-xs text-muted-light"><i class="fas fa-lock mr-1" aria-hidden="true"></i>{{ $t('reports.privacy') }}</p>
    </ConfirmDialog>

    <!-- Calificar -->
    <ConfirmDialog :open="!!toReview" :busy="busy" :title="$t('appointments.reviewDialog.title')"
      :message="toReview ? $t('appointments.reviewDialog.message', { name: professionalName(toReview.professionalId) }) : ''"
      :confirm-text="$t('appointments.reviewDialog.send')" @cancel="toReview = null" @confirm="sendReview">
      <fieldset class="mt-4">
        <legend class="nz-label">{{ $t('appointments.reviewDialog.rating') }}</legend>
        <div class="flex gap-1" role="radiogroup">
          <button v-for="n in 5" :key="n" type="button" role="radio" :aria-checked="rating === n" :aria-label="$t('professionals.ratingLabel', { rating: n })"
            class="text-3xl transition-transform hover:scale-110" :class="n <= rating ? 'text-amber-500' : 'text-gray-300'" @click="rating = n">
            <i class="fas fa-star" aria-hidden="true"></i>
          </button>
        </div>
        <p v-if="reviewError" class="nz-field-error">{{ reviewError }}</p>
      </fieldset>
      <label class="mt-3 block">
        <span class="nz-label">{{ $t('appointments.reviewDialog.comment') }}</span>
        <textarea v-model="reviewComment" rows="3" maxlength="400" class="nz-input" :placeholder="$t('appointments.reviewDialog.placeholder')"></textarea>
      </label>
    </ConfirmDialog>
  </div>
</template>

<script>
/**
 * UserAppointmentsComponent - "Mis citas" del trabajador.
 *  - Cancelar una cita próxima (pendiente o confirmada).
 *  - Compartir con el psicólogo un informe de progreso (US15).
 *  - Calificar la sesión cuando el psicólogo la marcó como atendida.
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue'
import StatusChip from '../../professional-portal/components/StatusChip.vue'
import { AppointmentService } from '../../services/AppointmentService.js'
import { TherapistService } from '../../services/TherapistService.js'
import { ReportService } from '../../services/ReportService.js'
import { appointmentState } from '../../services/ProfessionalService.js'
import { getUserId } from '../../services/session.js'
import { toast } from '../../composables/useToast.js'
import { formatClock } from '../../utils/date.js'

export default {
  name: 'UserAppointmentsComponent',
  components: { PageHeader, LoadingState, ErrorState, EmptyState, ConfirmDialog, StatusChip },
  data() {
    return {
      loading: true,
      error: '',
      appointments: [],
      professionals: {},
      reports: [],
      busy: false,
      toCancel: null,
      toShare: null,
      summary: null,
      loadingSummary: false,
      shareNote: '',
      toReview: null,
      rating: 0,
      reviewComment: '',
      reviewError: ''
    }
  },
  computed: {
    localeTag() {
      return this.$i18n.locale === 'en' ? 'en-US' : 'es-ES'
    },
    groups() {
      const now = new Date()
      const upcoming = this.appointments.filter((a) => a.dateTime && a.dateTime >= now && a.state !== 'cancelled' && a.state !== 'completed')
      const past = this.appointments.filter((a) => !upcoming.includes(a)).reverse()
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
        const [appointments, professionals, reports] = await Promise.all([
          new AppointmentService().getAppointments(getUserId()),
          new TherapistService().getTherapists().catch(() => []),
          new ReportService().getMine().catch(() => [])
        ])
        this.appointments = appointments.map((a) => ({ ...a, state: appointmentState(a) }))
        this.professionals = Object.fromEntries(professionals.map((p) => [String(p.id), p]))
        this.reports = reports
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
    isFuture(a) {
      return a.dateTime && a.dateTime >= new Date()
    },
    canCancel(a) {
      return this.isFuture(a) && ['pending', 'confirmed'].includes(a.state)
    },
    sharedFor(a) {
      return this.reports.some((r) => String(r.appointmentId) === String(a.id))
    },
    canShare(a) {
      return ['pending', 'confirmed'].includes(a.state) && !this.sharedFor(a)
    },
    canReview(a) {
      return a.state === 'completed' && !a.reviewed
    },
    async cancelAppointment() {
      this.busy = true
      try {
        await new AppointmentService().cancelAppointment(this.toCancel.id)
        this.toCancel.state = 'cancelled'
        toast.success(this.$t('appointments.cancelDialog.done'))
        this.toCancel = null
      } catch (error) {
        toast.error(error.message)
      } finally {
        this.busy = false
      }
    },
    async openShare(a) {
      this.toShare = a
      this.shareNote = ''
      this.summary = null
      this.loadingSummary = true
      try {
        this.summary = await new ReportService().buildSummary()
      } catch (error) {
        toast.error(error.message)
      } finally {
        this.loadingSummary = false
      }
    },
    async shareReport() {
      if (!this.summary) return
      this.busy = true
      try {
        const report = await new ReportService().share({ professionalId: this.toShare.professionalId, appointmentId: this.toShare.id, summary: this.summary, note: this.shareNote })
        this.reports.push({ ...report, appointmentId: report.appointmentId ?? this.toShare.id })
        toast.success(this.$t('reports.shared', { name: this.professionalName(this.toShare.professionalId) }))
        this.toShare = null
      } catch (error) {
        toast.error(error.message)
      } finally {
        this.busy = false
      }
    },
    openReview(a) {
      this.toReview = a
      this.rating = 0
      this.reviewComment = ''
      this.reviewError = ''
    },
    async sendReview() {
      if (!this.rating) {
        this.reviewError = this.$t('appointments.reviewDialog.ratingRequired')
        return
      }
      this.busy = true
      try {
        await new TherapistService().addReview(this.toReview.professionalId, { appointmentId: this.toReview.id, rating: this.rating, comment: this.reviewComment })
        this.toReview.reviewed = true
        toast.success(this.$t('appointments.reviewDialog.done'))
        this.toReview = null
      } catch (error) {
        toast.error(error.message)
      } finally {
        this.busy = false
      }
    }
  }
}
</script>
