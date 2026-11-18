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
          <router-link v-if="!previewProfile.availabilitySchedule?.days?.length" :to="{ name: 'ProSchedule' }" class="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
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
import { session, updateUser } from '../../services/session.js'
import { isProfessionalNotVerified } from '../../services/ApiError.js'
import { toast } from '../../composables/useToast.js'
import { fullNameError, normalizeFullName } from '../../utils/validation.js'

export default {
  name: 'ProProfileComponent',
  components: { PageHeader, LoadingState, ErrorState, UserAvatar, ProfileProgress, ConfirmDialog },
  data() {
    return {
      loading: true, error: '', saving: false, profile: null, errors: {}, specialties: SPECIALTIES,
      editingName: false, confirmNameChange: false,
      form: { fullName: '', specialty: '', bio: '', experienceYears: 0, price: 0 }
    }
  },
  computed: {
    email() {
      return this.profile?.email || session.user?.email || ''
    },
    /** El progreso se actualiza mientras se escribe */
    previewProfile() {
      return { ...this.profile, ...this.form }
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
      } catch (error) {
        if (!isProfessionalNotVerified(error)) this.error = error.message
      } finally {
        this.loading = false
      }
    },
    resetForm() {
      this.form = { fullName: this.profile.name, specialty: this.profile.specialty, bio: this.profile.bio || '', experienceYears: this.profile.experienceYears || 0, price: this.profile.price || 0 }
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
    async submit() {
      if (this.saving) return
      const changingName = this.nameChanged
      const { fullName, ...rest } = this.form
      this.saving = true
      try {
        const changes = changingName ? { ...rest, fullName: normalizeFullName(fullName) } : { ...rest }
        const updated = await proService.updateMyProfile(changes)
        // Tras un cambio de nombre el backend decide el estado: se vuelve a consultar GET /professionals/me
        this.profile = changingName ? await proService.getMyProfile() : updated
        this.confirmNameChange = false
        this.editingName = false
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
        if (!isProfessionalNotVerified(error)) toast.error(`${this.$t('userProfile.actions.errorMessage')}: ${error.message}`)
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
