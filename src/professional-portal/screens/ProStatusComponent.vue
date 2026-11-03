<template>
  <div class="nz-page max-w-3xl">
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="refresh" />

    <template v-else-if="profile">
      <!-- En revisión -->
      <section v-if="profile.verificationStatus === 'pending'" class="nz-card overflow-hidden">
        <div class="flex items-start gap-4 bg-amber-50 p-6">
          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xl text-amber-700"><i class="fas fa-hourglass-half" aria-hidden="true"></i></span>
          <div>
            <h1 class="text-2xl font-extrabold text-foreground-light">{{ $t('pro.status.pendingTitle') }}</h1>
            <p class="mt-1 text-amber-900">{{ $t('pro.status.pendingText') }}</p>
          </div>
        </div>
        <ol class="space-y-4 p-6">
          <li v-for="(step, i) in timeline" :key="step.key" class="flex gap-4">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              :class="step.state === 'done' ? 'bg-green-600 text-white' : step.state === 'current' ? 'bg-amber-500 text-white' : 'bg-gray-200 text-muted-light'">
              <i v-if="step.state === 'done'" class="fas fa-check" aria-hidden="true"></i><template v-else>{{ i + 1 }}</template>
            </span>
            <div>
              <p class="font-bold text-foreground-light">{{ $t(`pro.status.steps.${step.key}.title`) }}</p>
              <p class="text-sm text-muted-light">{{ $t(`pro.status.steps.${step.key}.text`) }}</p>
            </div>
          </li>
        </ol>
      </section>

      <!-- Rechazado -->
      <section v-else-if="profile.verificationStatus === 'rejected'" class="nz-card overflow-hidden">
        <div class="flex items-start gap-4 bg-red-50 p-6">
          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-xl text-red-700"><i class="fas fa-circle-xmark" aria-hidden="true"></i></span>
          <div>
            <h1 class="text-2xl font-extrabold text-foreground-light">{{ $t('pro.status.rejectedTitle') }}</h1>
            <p class="mt-1 text-red-900">{{ $t('pro.status.rejectedText') }}</p>
          </div>
        </div>
        <div class="space-y-5 p-6">
          <div class="rounded-lg border border-red-200 p-4">
            <p class="text-xs font-bold uppercase tracking-wide text-red-800">{{ $t('pro.status.reason') }}</p>
            <p class="mt-1 text-foreground-light">{{ profile.rejectionReason || $t('pro.status.noReason') }}</p>
          </div>
          <form class="space-y-4" novalidate @submit.prevent="resubmit">
            <p class="font-bold text-foreground-light">{{ $t('pro.status.fixData') }}</p>
            <div>
              <label class="nz-label" for="rs-name">{{ $t('auth.register.name') }}</label>
              <input id="rs-name" v-model="form.fullName" class="nz-input" :class="{ 'nz-input-error': errors.fullName }" />
              <p v-if="errors.fullName" class="nz-field-error">{{ errors.fullName }}</p>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="nz-label" for="rs-specialty">{{ $t('register.psychologist.specialty') }}</label>
                <select id="rs-specialty" v-model="form.specialty" class="nz-input">
                  <option v-for="s in specialties" :key="s" :value="s">{{ $t(`specialties.${s}`) }}</option>
                </select>
              </div>
              <div>
                <label class="nz-label" for="rs-license">{{ $t('register.psychologist.license') }}</label>
                <input id="rs-license" v-model.trim="form.licenseNumber" class="nz-input" :class="{ 'nz-input-error': errors.licenseNumber }" placeholder="C.Ps.P. 12345" />
                <p v-if="errors.licenseNumber" class="nz-field-error">{{ errors.licenseNumber }}</p>
              </div>
            </div>
            <button type="submit" class="nz-btn-primary" :disabled="saving">
              <span v-if="saving" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
              {{ $t('pro.status.resubmit') }}
            </button>
          </form>
        </div>
      </section>

      <!-- Datos enviados -->
      <section class="nz-card mt-6 p-6">
        <h2 class="mb-4 text-lg font-bold text-foreground-light">{{ $t('pro.status.submittedData') }}</h2>
        <dl class="grid gap-4 sm:grid-cols-3">
          <div><dt class="text-sm text-muted-light">{{ $t('auth.register.name') }}</dt><dd class="font-semibold">{{ profile.name }}</dd></div>
          <div><dt class="text-sm text-muted-light">{{ $t('register.psychologist.specialty') }}</dt><dd class="font-semibold">{{ specialtyLabel(profile.specialty) }}</dd></div>
          <div><dt class="text-sm text-muted-light">{{ $t('register.psychologist.license') }}</dt><dd class="font-mono font-semibold">C.Ps.P. {{ profile.licenseNumber }}</dd></div>
        </dl>
      </section>

      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <a :href="`mailto:${$t('footer.contact.email')}`" class="nz-btn-ghost"><i class="fas fa-envelope" aria-hidden="true"></i>{{ $t('settings.contactSupport') }}</a>
        <button v-if="profile.verificationStatus === 'pending'" type="button" class="nz-btn-secondary" :disabled="loading" @click="refresh">
          <i class="fas fa-rotate-right" aria-hidden="true"></i>{{ $t('pro.status.checkAgain') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script>
/**
 * ProStatusComponent - Estado de la verificación del psicólogo.
 * Mientras la colegiatura no esté verificada no puede recibir citas ni usar el portal.
 * Si fue rechazado, ve el motivo y puede corregir sus datos y reenviar la solicitud.
 */
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import { proService, loadPortalData } from '../usePortal.js'
import { SPECIALTIES } from '../../services/ProfessionalService.js'
import { homeRouteFor } from '../../services/roles.js'
import { getCurrentUser, updateUser } from '../../services/session.js'
import { toast } from '../../composables/useToast.js'
import { isLicenseNumber, normalizeLicenseNumber, minLength } from '../../utils/validation.js'

export default {
  name: 'ProStatusComponent',
  components: { LoadingState, ErrorState },
  data() {
    return { loading: true, error: '', profile: null, saving: false, errors: {}, form: { fullName: '', specialty: '', licenseNumber: '' }, specialties: SPECIALTIES }
  },
  computed: {
    timeline() {
      return [
        { key: 'created', state: 'done' },
        { key: 'review', state: 'current' },
        { key: 'active', state: 'next' }
      ]
    }
  },
  created() {
    this.refresh()
  },
  methods: {
    specialtyLabel(key) {
      const text = this.$t(`specialties.${key}`)
      return text === `specialties.${key}` ? key : text
    },
    async refresh() {
      this.loading = true
      this.error = ''
      try {
        const { profile } = await loadPortalData({ withAppointments: false })
        this.profile = profile
        this.form = { fullName: profile.name, specialty: profile.specialty, licenseNumber: profile.licenseNumber }
        // Si ya fue aprobado, pasa a la bienvenida / su panel
        if (profile.verificationStatus === 'verified') {
          toast.success(this.$t('pro.status.approvedToast'))
          this.$router.replace(homeRouteFor(getCurrentUser()))
        }
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },
    async resubmit() {
      const e = {}
      if (!minLength(this.form.fullName, 3)) e.fullName = this.$t('validation.fullName')
      if (!isLicenseNumber(this.form.licenseNumber)) e.licenseNumber = this.$t('validation.license')
      this.errors = e
      if (Object.keys(e).length || this.saving) return
      this.saving = true
      try {
        this.profile = await proService.updateMyProfile({
          fullName: this.form.fullName.trim(),
          specialty: this.form.specialty,
          licenseNumber: normalizeLicenseNumber(this.form.licenseNumber)
        })
        updateUser({ verificationStatus: this.profile.verificationStatus, name: this.form.fullName.trim(), fullName: this.form.fullName.trim() })
        toast.success(this.$t('pro.status.resubmitted'))
      } catch (error) {
        toast.error(error.message)
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
