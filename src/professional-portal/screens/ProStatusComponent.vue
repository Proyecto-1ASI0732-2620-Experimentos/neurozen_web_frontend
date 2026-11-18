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
              <input id="rs-name" v-model="form.fullName" class="nz-input" :class="{ 'nz-input-error': errors.fullName }" maxlength="120" autocomplete="name" :aria-invalid="!!errors.fullName" />
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
                <input id="rs-license" :value="form.licenseNumber" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" class="nz-input"
                  :class="{ 'nz-input-error': errors.licenseNumber }" placeholder="12345" :aria-invalid="!!errors.licenseNumber" @input="onLicenseInput" />
                <p v-if="errors.licenseNumber" class="nz-field-error">{{ errors.licenseNumber }}</p>
              </div>
            </div>
            <!-- Sin horario guardado, el backend rechaza el reenvío: se pide aquí (no se puede entrar a «Horario» sin verificar) -->
            <fieldset v-if="needsSchedule" class="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4" data-testid="resubmit-availability">
              <legend class="px-1 text-sm font-bold text-foreground-light">{{ $t('pro.profile.availabilityTitle') }}</legend>
              <p class="text-sm text-amber-900">{{ $t('pro.status.availabilityRequired') }}</p>
              <AvailabilityEditor v-model="form.availabilitySchedule" id-prefix="rs-av" :server-error="serverAvailabilityError" />
            </fieldset>
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
import AvailabilityEditor from '../components/AvailabilityEditor.vue'
import { hasAvailability, defaultAvailability, availabilityErrorKey, availabilityServerError } from '../availability.js'
import { fieldErrors } from '../../services/ApiError.js'
import { normalizeLicenseNumber, isLicenseDigits, onlyDigits, fullNameError, normalizeFullName } from '../../utils/validation.js'

export default {
  name: 'ProStatusComponent',
  components: { LoadingState, ErrorState, AvailabilityEditor },
  data() {
    return {
      loading: true, error: '', profile: null, saving: false, errors: {}, serverAvailabilityError: '', specialties: SPECIALTIES,
      form: { fullName: '', specialty: '', licenseNumber: '', availabilitySchedule: defaultAvailability() }
    }
  },
  computed: {
    /** El backend exige el horario en cada actualización del perfil y un psicólogo nuevo aún no lo tiene */
    needsSchedule() {
      return !!this.profile && !hasAvailability(this.profile.availabilitySchedule)
    },
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
        this.form = {
          fullName: profile.name, specialty: profile.specialty,
          licenseNumber: normalizeLicenseNumber(profile.licenseNumber) || onlyDigits(profile.licenseNumber, 6),
          availabilitySchedule: hasAvailability(profile.availabilitySchedule) ? { ...profile.availabilitySchedule } : defaultAvailability()
        }
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
    /** Colegiatura: solo dígitos 0-9 (también al pegar), máximo 6 */
    onLicenseInput(event) {
      const clean = onlyDigits(event.target.value, 6)
      if (event.target.value !== clean) event.target.value = clean
      this.form.licenseNumber = clean
    },
    async resubmit() {
      const e = {}
      const nameKey = fullNameError(this.form.fullName)
      if (nameKey) e.fullName = this.$t(nameKey === 'required' ? 'validation.fullName' : `validation.${nameKey}`)
      if (!isLicenseDigits(this.form.licenseNumber)) e.licenseNumber = this.$t('validation.licenseDigits')
      if (this.needsSchedule && availabilityErrorKey(this.form.availabilitySchedule)) e.availabilitySchedule = true
      this.errors = e
      if (Object.keys(e).length || this.saving) return
      this.saving = true
      try {
        const fullName = normalizeFullName(this.form.fullName)
        const changes = { fullName, specialty: this.form.specialty, licenseNumber: this.form.licenseNumber }
        if (this.needsSchedule) changes.availabilitySchedule = { ...this.form.availabilitySchedule }
        this.serverAvailabilityError = ''
        this.profile = await proService.updateMyProfile(changes)
        updateUser({ verificationStatus: this.profile.verificationStatus, name: fullName, fullName })
        toast.success(this.$t('pro.status.resubmitted'))
      } catch (error) {
        this.serverAvailabilityError = availabilityServerError(fieldErrors(error))
        if (!this.serverAvailabilityError) toast.error(error.message)
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
