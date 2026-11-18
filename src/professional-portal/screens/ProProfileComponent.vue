<template>
  <div class="nz-page">
    <PageHeader :title="$t('pro.nav.profile')" :subtitle="$t('pro.profile.subtitle')" :back="false" />

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />

    <div v-else class="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside class="space-y-6">
        <section class="nz-card p-6 text-center">
          <UserAvatar :name="profile.name" size="lg" class="mx-auto ring-4 ring-primary/10" />
          <h2 class="mt-4 text-xl font-extrabold">{{ profile.name }}</h2>
          <p class="text-sm text-primary">{{ specialtyLabel(form.specialty) }}</p>
          <p class="text-sm text-muted-light">{{ email }}</p>
          <span class="mt-3 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-800">
            <i class="fas fa-shield-halved" aria-hidden="true"></i>{{ $t('pro.badge.verified') }}
          </span>
          <p class="mt-3 text-xs text-muted-light">{{ $t('register.psychologist.license') }}: <span class="font-mono font-semibold text-foreground-light">C.Ps.P. {{ profile.licenseNumber }}</span></p>
          <p class="text-[11px] text-muted-light">{{ $t('pro.profile.licensePrivate') }}</p>
        </section>
        <section class="nz-card p-5">
          <ProfileProgress :profile="previewProfile" />
          <router-link v-if="!needsSchedule && !previewProfile.availabilitySchedule?.days?.length" :to="{ name: 'ProSchedule' }" class="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
            {{ $t('pro.profile.setAvailability') }} →
          </router-link>
        </section>
      </aside>

      <form class="nz-card space-y-5 p-5 sm:p-6" novalidate @submit.prevent="save">
        <h2 class="text-lg font-bold text-foreground-light">{{ $t('pro.profile.professionalData') }}</h2>

        <div>
          <div class="flex items-baseline justify-between gap-2">
            <label class="nz-label" for="pp-name">{{ $t('auth.register.name') }}</label>
            <button type="button" class="text-sm font-semibold text-primary hover:underline" @click="toggleNameEdit">
              {{ editingName ? $t('pro.profile.cancelNameEdit') : $t('pro.profile.editName') }}
            </button>
          </div>
          <input v-if="editingName" id="pp-name" v-model="form.fullName" class="nz-input" :class="{ 'nz-input-error': errors.fullName }" maxlength="120"
            autocomplete="name" :aria-invalid="!!errors.fullName" aria-describedby="pp-name-hint" />
          <input v-else id="pp-name" :value="profile.name" class="nz-input" readonly aria-describedby="pp-name-hint" />
          <p v-if="errors.fullName" id="pp-name-hint" class="nz-field-error">{{ errors.fullName }}</p>
          <p v-else id="pp-name-hint" class="nz-hint" :class="{ 'font-semibold text-amber-800': editingName }">{{ $t('pro.profile.nameLocked') }}</p>
        </div>
        <div>
          <label class="nz-label" for="pp-specialty">{{ $t('register.psychologist.specialty') }}</label>
          <select id="pp-specialty" v-model="form.specialty" class="nz-input">
            <option v-for="s in specialties" :key="s" :value="s">{{ $t(`specialties.${s}`) }}</option>
          </select>
        </div>
        <div>
          <label class="nz-label" for="pp-bio">{{ $t('pro.profile.bio') }}</label>
          <textarea id="pp-bio" v-model="form.bio" rows="5" maxlength="800" class="nz-input" :class="{ 'nz-input-error': errors.bio }" :placeholder="$t('pro.profile.bioPlaceholder')"></textarea>
          <div class="flex justify-between">
            <p v-if="errors.bio" class="nz-field-error">{{ errors.bio }}</p><p v-else class="nz-hint">{{ $t('pro.profile.bioHint') }}</p>
            <span class="nz-hint">{{ form.bio.length }}/800</span>
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="nz-label" for="pp-exp">{{ $t('pro.profile.experience') }}</label>
            <input id="pp-exp" v-model.number="form.experienceYears" type="number" min="0" max="60" class="nz-input" :class="{ 'nz-input-error': errors.experienceYears }" />
            <p v-if="errors.experienceYears" class="nz-field-error">{{ errors.experienceYears }}</p>
          </div>
          <div>
            <label class="nz-label" for="pp-price">{{ $t('pro.profile.price') }}</label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-muted-light">$</span>
              <input id="pp-price" v-model.number="form.price" type="number" min="0" max="1000" step="1" class="nz-input pl-7" :class="{ 'nz-input-error': errors.price }" />
            </div>
            <p v-if="errors.price" class="nz-field-error">{{ errors.price }}</p>
          </div>
        </div>

        <!-- Sin horario guardado: el backend no acepta el perfil sin días y horario, se pide aquí mismo -->
        <fieldset v-if="needsSchedule" class="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4" data-testid="profile-availability">
          <legend class="px-1 text-sm font-bold text-foreground-light">{{ $t('pro.profile.availabilityTitle') }}</legend>
          <p class="text-sm text-amber-900">{{ $t('pro.profile.availabilityRequired') }}</p>
          <AvailabilityEditor v-model="form.availabilitySchedule" id-prefix="pp-av" :server-error="serverAvailabilityError" />
        </fieldset>

        <p v-if="restoredDraft" class="flex gap-2 rounded-lg bg-sky-50 p-3 text-sm text-sky-900" role="status" data-testid="draft-restored">
          <i class="fas fa-rotate-left mt-0.5" aria-hidden="true"></i>{{ $t('pro.profile.draftRestored') }}
        </p>

        <div class="flex justify-end">
          <button type="submit" class="nz-btn-primary" :disabled="saving">
            <span v-if="saving" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
            {{ saving ? $t('userProfile.actions.saving') : $t('userProfile.actions.saveChanges') }}
          </button>
        </div>
      </form>
    </div>

    <!-- Aviso previo: cambiar el nombre devuelve la cuenta a revisión (PENDING) -->
    <ConfirmDialog :open="confirmNameChange" :busy="saving" :title="$t('pro.profile.nameChangeDialog.title')"
      :message="$t('pro.profile.nameChangeDialog.message')" :confirm-text="$t('pro.profile.nameChangeDialog.confirm')"
      @cancel="confirmNameChange = false" @confirm="submit" />
  </div>
</template>

<script>
/**
 * ProProfileComponent - Perfil profesional del psicólogo verificado.
 *
 * El backend exige el horario (`availabilitySchedule`) en cada PUT /professionals/me. Antes, un psicólogo recién
 * verificado (sin horario) no podía guardar biografía, años ni tarifa, y al ir a «Horario» perdía lo escrito.
 * Ahora: si no hay horario guardado se pide aquí mismo (se guarda en el mismo envío) y lo escrito se conserva como borrador
 * en memoria al cambiar de pantalla.
 *
 * La colegiatura no se edita aquí. El nombre fue validado con el CPsP: puede corregirse,
 * pero antes se avisa de que la cuenta volverá a revisión del administrador (el backend la
 * devuelve a PENDING). Tras guardar se consulta GET /professionals/me y, si está pendiente,
 * se redirige a la pantalla de cuenta pendiente de verificación.
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import ProfileProgress from '../components/ProfileProgress.vue'
import { loadPortalData, proService } from '../usePortal.js'
import { SPECIALTIES } from '../../services/ProfessionalService.js'
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue'
import AvailabilityEditor from '../components/AvailabilityEditor.vue'
import { session, updateUser, getUserId } from '../../services/session.js'
import { isProfessionalNotVerified, fieldErrors } from '../../services/ApiError.js'
import { hasAvailability, defaultAvailability, availabilityErrorKey, availabilityServerError } from '../availability.js'
import { saveProfileDraft, readProfileDraft, clearProfileDraft } from '../profileDraft.js'
import { toast } from '../../composables/useToast.js'
import { fullNameError, normalizeFullName } from '../../utils/validation.js'

export default {
  name: 'ProProfileComponent',
  components: { PageHeader, LoadingState, ErrorState, UserAvatar, ProfileProgress, ConfirmDialog, AvailabilityEditor },
  data() {
    return {
      loading: true, error: '', saving: false, profile: null, errors: {}, specialties: SPECIALTIES,
      editingName: false, confirmNameChange: false, restoredDraft: false, serverAvailabilityError: '',
      form: { fullName: '', specialty: '', bio: '', experienceYears: 0, price: 0, availabilitySchedule: defaultAvailability() }
    }
  },
  watch: {
    /** Lo que se escribe se guarda como borrador (en memoria) para no perderlo al ir a otra pantalla */
    form: {
      deep: true,
      handler(value) {
        if (this.profile && this.isDirty()) saveProfileDraft(getUserId(), value)
      }
    }
  },
  computed: {
    email() {
      return this.profile?.email || session.user?.email || ''
    },
    /** El progreso se actualiza mientras se escribe */
    previewProfile() {
      // El horario cuenta como completado solo cuando está guardado (no por la propuesta inicial del formulario)
      const { availabilitySchedule, ...rest } = this.form
      return { ...this.profile, ...rest, availabilitySchedule: this.needsSchedule ? null : availabilitySchedule }
    },
    /** Aún no hay horario guardado en el backend */
    needsSchedule() {
      return !!this.profile && !hasAvailability(this.profile.availabilitySchedule)
    },
    nameChanged() {
      return this.editingName && normalizeFullName(this.form.fullName) !== normalizeFullName(this.profile?.name)
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
        this.profile = (await loadPortalData({ withAppointments: false })).profile
        this.resetForm()
        this.restoreDraft()
      } catch (error) {
        if (!isProfessionalNotVerified(error)) this.error = error.message
      } finally {
        this.loading = false
      }
    },
    /** Valores guardados en el backend */
    savedForm() {
      const p = this.profile
      return {
        fullName: p.name, specialty: p.specialty, bio: p.bio || '', experienceYears: p.experienceYears || 0, price: p.price || 0,
        availabilitySchedule: hasAvailability(p.availabilitySchedule) ? { ...p.availabilitySchedule } : defaultAvailability()
      }
    },
    resetForm() {
      this.form = this.savedForm()
    },
    isDirty() {
      return JSON.stringify(this.form) !== JSON.stringify(this.savedForm())
    },
    /** Recupera lo escrito y no guardado (por ejemplo, tras ir a «Horario» y volver) */
    restoreDraft() {
      const draft = readProfileDraft(getUserId())
      if (!draft) return
      this.form = { ...this.savedForm(), ...draft, fullName: this.profile.name }
      if (hasAvailability(this.profile.availabilitySchedule)) this.form.availabilitySchedule = { ...this.profile.availabilitySchedule }
      this.restoredDraft = this.isDirty()
    },
    toggleNameEdit() {
      this.editingName = !this.editingName
      this.form.fullName = this.profile.name
      const rest = { ...this.errors }
      delete rest.fullName
      this.errors = rest
    },
    specialtyLabel(key) {
      const text = this.$t(`specialties.${key}`)
      return text === `specialties.${key}` ? key : text
    },
    validate() {
      const e = {}
      if (this.form.bio.trim() && this.form.bio.trim().length < 30) e.bio = this.$t('validation.minChars', { n: 30 })
      if (!(this.form.experienceYears >= 0 && this.form.experienceYears <= 60)) e.experienceYears = this.$t('pro.profile.errors.experience')
      if (!(this.form.price >= 0 && this.form.price <= 1000)) e.price = this.$t('pro.profile.errors.price')
      if (this.needsSchedule && availabilityErrorKey(this.form.availabilitySchedule)) e.availabilitySchedule = true
      if (this.nameChanged) {
        const key = fullNameError(this.form.fullName)
        if (key) e.fullName = this.$t(key === 'required' ? 'validation.fullName' : `validation.${key}`)
      }
      this.errors = e
      return !Object.keys(e).length
    },
    save() {
      if (!this.validate() || this.saving) return
      // Antes de enviar un cambio de nombre se pide confirmación explícita
      if (this.nameChanged) this.confirmNameChange = true
      else void this.submit() // submit() maneja sus propios errores
    },
    /** 400 del backend: cada error bajo su campo; si no corresponde a ninguno, aviso general */
    showServerErrors(error) {
      const server = fieldErrors(error)
      const mapped = {}
      for (const field of ['bio', 'experienceYears', 'price', 'specialty', 'fullName']) if (server[field]) mapped[field] = server[field]
      this.serverAvailabilityError = availabilityServerError(server)
      this.errors = { ...this.errors, ...mapped }
      if (!Object.keys(mapped).length && !this.serverAvailabilityError) toast.error(`${this.$t('userProfile.actions.errorMessage')}: ${error.message}`)
      else toast.error(this.$t('validation.fixErrors'))
    },
    async submit() {
      if (this.saving) return
      const changingName = this.nameChanged
      const { fullName, availabilitySchedule, ...rest } = this.form
      this.saving = true
      this.serverAvailabilityError = ''
      try {
        const changes = changingName ? { ...rest, fullName: normalizeFullName(fullName) } : { ...rest }
        // Sin horario guardado, se envía el del formulario (el backend lo exige en cada actualización)
        if (this.needsSchedule) changes.availabilitySchedule = { ...availabilitySchedule }
        const updated = await proService.updateMyProfile(changes)
        // Tras un cambio de nombre el backend decide el estado: se vuelve a consultar GET /professionals/me
        this.profile = changingName ? await proService.getMyProfile() : updated
        this.confirmNameChange = false
        this.editingName = false
        this.restoredDraft = false
        clearProfileDraft(getUserId())
        updateUser({ verificationStatus: this.profile.verificationStatus, name: this.profile.name, fullName: this.profile.name })
        if (this.profile.verificationStatus !== 'verified') {
          toast.info(this.$t('pro.profile.backToReview'))
          await this.$router.replace({ name: 'ProStatus' })
          return
        }
        this.resetForm()
        toast.success(this.$t('userProfile.actions.successMessage'))
      } catch (error) {
        this.confirmNameChange = false
        if (!isProfessionalNotVerified(error)) this.showServerErrors(error)
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
