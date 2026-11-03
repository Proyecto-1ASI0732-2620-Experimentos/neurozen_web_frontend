<template>
  <AuthLayout>
    <!-- Paso 1: tipo de cuenta -->
    <template v-if="!accountType">
      <h1 class="text-3xl font-extrabold text-foreground-light">{{ $t('auth.register.title') }}</h1>
      <p class="mt-2 text-muted-light">{{ $t('register.chooseSubtitle') }}</p>

      <div class="mt-8 space-y-4" role="radiogroup" :aria-label="$t('register.chooseSubtitle')">
        <button v-for="option in accountOptions" :key="option.type" type="button" role="radio" :aria-checked="false"
          class="nz-card group flex w-full items-start gap-4 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
          @click="chooseType(option.type)">
          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" :class="option.tone">
            <i :class="[option.icon, 'text-xl']" aria-hidden="true"></i>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-lg font-bold text-foreground-light group-hover:text-primary">{{ $t(`register.${option.type}.title`) }}</span>
            <span class="mt-1 block text-sm text-muted-light">{{ $t(`register.${option.type}.description`) }}</span>
            <span v-if="option.type === 'psychologist'" class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
              <i class="fas fa-shield-halved" aria-hidden="true"></i>{{ $t('register.psychologist.badge') }}
            </span>
          </span>
          <i class="fas fa-chevron-right mt-4 text-muted-light group-hover:text-primary" aria-hidden="true"></i>
        </button>
      </div>
    </template>

    <!-- Paso 2: formulario según el tipo -->
    <template v-else>
      <button type="button" class="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" @click="chooseType(null)">
        <i class="fas fa-arrow-left" aria-hidden="true"></i>{{ $t('register.changeType') }}
      </button>
      <h1 class="text-3xl font-extrabold text-foreground-light">{{ $t(`register.${accountType}.formTitle`) }}</h1>
      <p class="mt-2 text-muted-light">{{ $t(`register.${accountType}.formSubtitle`) }}</p>

      <div v-if="isPsychologist" class="mt-6 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="note">
        <i class="fas fa-circle-info mt-0.5" aria-hidden="true"></i>{{ $t('register.psychologist.verificationNote') }}
      </div>
      <div v-if="errorMessage" class="mt-6 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
        <i class="fas fa-circle-exclamation mt-0.5" aria-hidden="true"></i>{{ errorMessage }}
      </div>

      <form class="mt-6 space-y-5" novalidate @submit.prevent="handleRegister">
        <div>
          <label class="nz-label" for="name">{{ $t('auth.register.name') }}</label>
          <input id="name" v-model="form.name" type="text" autocomplete="name" class="nz-input" :class="{ 'nz-input-error': errors.name }"
            :placeholder="$t('auth.register.namePlaceholder')" :disabled="isLoading" :aria-invalid="!!errors.name" aria-describedby="name-msg" />
          <p v-if="errors.name" id="name-msg" class="nz-field-error">{{ errors.name }}</p>
          <p v-else-if="isPsychologist" id="name-msg" class="nz-hint">{{ $t('register.psychologist.nameHint') }}</p>
        </div>

        <div>
          <label class="nz-label" for="email">{{ $t('auth.register.email') }}</label>
          <input id="email" v-model.trim="form.email" type="email" autocomplete="email" class="nz-input" :class="{ 'nz-input-error': errors.email }"
            :placeholder="$t('auth.register.emailPlaceholder')" :disabled="isLoading" :aria-invalid="!!errors.email" aria-describedby="email-error" />
          <p v-if="errors.email" id="email-error" class="nz-field-error">{{ errors.email }}</p>
        </div>

        <template v-if="isPsychologist">
          <div>
            <label class="nz-label" for="specialty">{{ $t('register.psychologist.specialty') }}</label>
            <select id="specialty" v-model="form.specialty" class="nz-input" :class="{ 'nz-input-error': errors.specialty }" :disabled="isLoading" :aria-invalid="!!errors.specialty">
              <option value="">{{ $t('register.psychologist.selectSpecialty') }}</option>
              <option v-for="s in specialties" :key="s" :value="s">{{ $t(`specialties.${s}`) }}</option>
            </select>
            <p v-if="errors.specialty" class="nz-field-error">{{ errors.specialty }}</p>
          </div>
          <div>
            <label class="nz-label" for="license">{{ $t('register.psychologist.license') }}</label>
            <input id="license" v-model.trim="form.licenseNumber" type="text" inputmode="text" class="nz-input" :class="{ 'nz-input-error': errors.licenseNumber }"
              placeholder="C.Ps.P. 12345" :disabled="isLoading" :aria-invalid="!!errors.licenseNumber" aria-describedby="license-msg" />
            <p v-if="errors.licenseNumber" id="license-msg" class="nz-field-error">{{ errors.licenseNumber }}</p>
            <p v-else id="license-msg" class="nz-hint">{{ $t('register.psychologist.licenseHint') }}</p>
          </div>
        </template>

        <div>
          <label class="nz-label" for="password">{{ $t('auth.register.password') }}</label>
          <input id="password" v-model="form.password" type="password" autocomplete="new-password" class="nz-input" :class="{ 'nz-input-error': errors.password }"
            :disabled="isLoading" :aria-invalid="!!errors.password" aria-describedby="password-hint" />
          <p v-if="errors.password" id="password-hint" class="nz-field-error">{{ errors.password }}</p>
          <p v-else id="password-hint" class="nz-hint">{{ $t('register.passwordRules') }}</p>
        </div>
        <div>
          <label class="nz-label" for="confirm">{{ $t('auth.register.confirmPassword') }}</label>
          <input id="confirm" v-model="form.confirmPassword" type="password" autocomplete="new-password" class="nz-input" :class="{ 'nz-input-error': errors.confirmPassword }"
            :disabled="isLoading" :aria-invalid="!!errors.confirmPassword" aria-describedby="confirm-error" />
          <p v-if="errors.confirmPassword" id="confirm-error" class="nz-field-error">{{ errors.confirmPassword }}</p>
        </div>

        <div>
          <label class="flex items-start gap-3 text-sm text-foreground-light" for="terms">
            <input id="terms" v-model="form.acceptedTerms" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-primary/40 text-primary focus:ring-primary" :disabled="isLoading" :aria-invalid="!!errors.acceptedTerms" />
            <span>
              {{ $t('register.acceptPrefix') }}
              <button type="button" class="font-semibold text-primary underline" @click="showTerms = true">{{ $t('register.termsLink') }}</button>
            </span>
          </label>
          <p v-if="errors.acceptedTerms" class="nz-field-error">{{ errors.acceptedTerms }}</p>
        </div>

        <button type="submit" class="nz-btn-primary w-full py-3 text-base" :disabled="isLoading">
          <span v-if="isLoading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
          {{ isLoading ? $t('auth.register.submitting') : $t(`register.${accountType}.submit`) }}
        </button>
      </form>
    </template>

    <p class="mt-8 text-center text-sm text-muted-light">
      {{ $t('auth.register.hasAccount') }}
      <router-link :to="{ name: 'Login' }" class="font-semibold text-primary hover:underline">{{ $t('auth.register.signIn') }}</router-link>
    </p>

    <TermsDialog :open="showTerms" @close="showTerms = false" @accept="acceptTerms" />
  </AuthLayout>
</template>

<script>
/**
 * RegisterComponent - Registro con dos tipos de cuenta:
 *  - "Busco apoyo" (trabajador): cuenta activa al instante → onboarding.
 *  - "Soy psicólogo": pide especialidad y número de colegiatura (CPsP); la cuenta
 *    queda pendiente hasta que un administrador la verifique.
 * Ambos exigen aceptar Términos y Política de Privacidad (datos sensibles de salud).
 */
import AuthLayout from '../../components/AuthLayout.vue'
import TermsDialog from '../../components/ui/TermsDialog.vue'
import { AuthService } from '../../services/AuthService.js'
import { SPECIALTIES } from '../../services/ProfessionalService.js'
import { ROLES, homeRouteFor } from '../../services/roles.js'
import { toast } from '../../composables/useToast.js'
import { isEmail, minLength, isStrongPassword, isLicenseNumber, normalizeLicenseNumber } from '../../utils/validation.js'

const emptyForm = () => ({ name: '', email: '', password: '', confirmPassword: '', specialty: '', licenseNumber: '', acceptedTerms: false })

export default {
  name: 'RegisterComponent',
  components: { AuthLayout, TermsDialog },
  data() {
    return {
      form: emptyForm(),
      errors: {},
      isLoading: false,
      errorMessage: '',
      showTerms: false,
      specialties: SPECIALTIES,
      authService: new AuthService(),
      accountOptions: [
        { type: 'user', icon: 'fas fa-spa', tone: 'bg-primary/10 text-primary' },
        { type: 'psychologist', icon: 'fas fa-user-doctor', tone: 'bg-sky-50 text-secondary' }
      ]
    }
  },
  computed: {
    /** El tipo de cuenta vive en la URL (?type=user|psychologist) para poder compartir el enlace */
    accountType() {
      const type = this.$route.query.type
      return type === 'user' || type === 'psychologist' ? type : null
    },
    isPsychologist() {
      return this.accountType === 'psychologist'
    }
  },
  watch: {
    /** Tras el primer intento, los errores se actualizan mientras el usuario corrige */
    form: {
      deep: true,
      handler() {
        if (Object.keys(this.errors).length) this.validate()
      }
    },
    accountType() {
      this.errors = {}
      this.errorMessage = ''
    }
  },
  methods: {
    chooseType(type) {
      this.$router.replace({ name: 'Register', query: type ? { type } : {} })
    },
    acceptTerms() {
      this.form.acceptedTerms = true
      this.showTerms = false
    },
    validate() {
      const e = {}
      const f = this.form
      if (!minLength(f.name, 3) || f.name.trim().split(/\s+/).length < 2) e.name = this.$t('validation.fullName')
      if (!f.email) e.email = this.$t('validation.required')
      else if (!isEmail(f.email)) e.email = this.$t('validation.email')
      if (!isStrongPassword(f.password)) e.password = this.$t('validation.passwordStrength')
      if (f.confirmPassword !== f.password) e.confirmPassword = this.$t('validation.passwordMatch')
      if (this.isPsychologist) {
        if (!f.specialty) e.specialty = this.$t('validation.required')
        if (!isLicenseNumber(f.licenseNumber)) e.licenseNumber = this.$t('validation.license')
      }
      if (!f.acceptedTerms) e.acceptedTerms = this.$t('validation.acceptTerms')
      this.errors = e
      return Object.keys(e).length === 0
    },
    async handleRegister() {
      this.errorMessage = ''
      if (!this.validate() || this.isLoading) return
      this.isLoading = true
      try {
        const { user, authenticated } = await this.authService.register({
          ...this.form,
          role: this.isPsychologist ? ROLES.PSYCHOLOGIST : ROLES.USER,
          licenseNumber: normalizeLicenseNumber(this.form.licenseNumber)
        })
        if (!authenticated) {
          toast.success(this.$t(this.isPsychologist ? 'register.psychologist.successLogin' : 'auth.register.successLogin'))
          this.$router.push({ name: 'Login' })
          return
        }
        // El trabajador pasa al onboarding; el psicólogo, a la pantalla de verificación
        this.$router.push(this.isPsychologist ? homeRouteFor(user) : { name: 'OnboardingWelcome' })
      } catch (error) {
        if (error.status === 409) {
          this.errorMessage = /colegiatura|license/i.test(error.message) ? this.$t('register.errors.licenseInUse') : this.$t('auth.errors.emailInUse')
        } else {
          this.errorMessage = error.message
        }
      } finally {
        this.isLoading = false
      }
    }
  }
}
</script>
