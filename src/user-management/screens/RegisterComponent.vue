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
            :maxlength="nameMaxLength" :placeholder="$t('auth.register.namePlaceholder')" :disabled="isLoading" :aria-invalid="!!errors.name" aria-describedby="name-msg"
            @blur="touch('name')" />
          <p v-if="errors.name" id="name-msg" class="nz-field-error">{{ errors.name }}</p>
          <p v-else-if="isPsychologist" id="name-msg" class="nz-hint">{{ $t('register.psychologist.nameHint') }}</p>
        </div>

        <!-- DNI: obligatorio, 8 dígitos. Solo se valida el formato (no se consulta RENIEC). -->
        <div>
          <label class="nz-label" for="dni">{{ $t('register.dni') }}</label>
          <input id="dni" :value="form.dni" type="text" inputmode="numeric" pattern="[0-9]*" :maxlength="dniLength" autocomplete="off"
            class="nz-input" :class="{ 'nz-input-error': errors.dni }" :placeholder="$t('register.dniPlaceholder')" :disabled="isLoading"
            :aria-invalid="!!errors.dni" aria-describedby="dni-msg" @input="onDigitsInput('dni', dniLength, $event)" @blur="touch('dni')" />
          <p v-if="errors.dni" id="dni-msg" class="nz-field-error">{{ errors.dni }}</p>
          <p v-else id="dni-msg" class="nz-hint">{{ $t('register.dniHint') }}</p>
        </div>

        <div>
          <label class="nz-label" for="email">{{ $t('auth.register.email') }}</label>
          <input id="email" v-model.trim="form.email" type="email" autocomplete="email" class="nz-input" :class="{ 'nz-input-error': errors.email }"
            :placeholder="$t('auth.register.emailPlaceholder')" :disabled="isLoading" :aria-invalid="!!errors.email" aria-describedby="email-error" @blur="touch('email')" />
          <p v-if="errors.email" id="email-error" class="nz-field-error">{{ errors.email }}</p>
        </div>

        <template v-if="isPsychologist">
          <div>
            <label class="nz-label" for="specialty">{{ $t('register.psychologist.specialty') }}</label>
            <select id="specialty" v-model="form.specialty" class="nz-input" :class="{ 'nz-input-error': errors.specialty }" :disabled="isLoading" :aria-invalid="!!errors.specialty" @blur="touch('specialty')">
              <option value="">{{ $t('register.psychologist.selectSpecialty') }}</option>
              <option v-for="s in specialties" :key="s" :value="s">{{ $t(`specialties.${s}`) }}</option>
            </select>
            <p v-if="errors.specialty" class="nz-field-error">{{ errors.specialty }}</p>
          </div>
          <div>
            <label class="nz-label" for="license">{{ $t('register.psychologist.license') }}</label>
            <input id="license" :value="form.licenseNumber" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" class="nz-input"
              :class="{ 'nz-input-error': errors.licenseNumber }" placeholder="12345" :disabled="isLoading" :aria-invalid="!!errors.licenseNumber" aria-describedby="license-msg"
              @input="onDigitsInput('licenseNumber', 6, $event)" @blur="touch('licenseNumber')" />
            <p v-if="errors.licenseNumber" id="license-msg" class="nz-field-error">{{ errors.licenseNumber }}</p>
            <p v-else id="license-msg" class="nz-hint">{{ $t('register.psychologist.licenseHint') }}</p>
          </div>
        </template>

        <div>
          <label class="nz-label" for="password">{{ $t('auth.register.password') }}</label>
          <input id="password" v-model="form.password" type="password" autocomplete="new-password" class="nz-input" :class="{ 'nz-input-error': errors.password }"
            :disabled="isLoading" :aria-invalid="!!errors.password" aria-describedby="password-hint" @blur="touch('password')" />
          <p v-if="errors.password" id="password-hint" class="nz-field-error">{{ errors.password }}</p>
          <p v-else id="password-hint" class="nz-hint">{{ $t('register.passwordRules') }}</p>
        </div>
        <div>
          <label class="nz-label" for="confirm">{{ $t('auth.register.confirmPassword') }}</label>
          <input id="confirm" v-model="form.confirmPassword" type="password" autocomplete="new-password" class="nz-input" :class="{ 'nz-input-error': errors.confirmPassword }"
            :disabled="isLoading" :aria-invalid="!!errors.confirmPassword" aria-describedby="confirm-error" @blur="touch('confirmPassword')" />
          <p v-if="errors.confirmPassword" id="confirm-error" class="nz-field-error">{{ errors.confirmPassword }}</p>
        </div>

        <!-- Consentimientos separados (Ley 29733): ninguno viene marcado por defecto -->
        <fieldset class="space-y-3">
          <legend class="sr-only">{{ $t('register.consentsLegend') }}</legend>
          <div>
            <label class="flex items-start gap-3 text-sm text-foreground-light" for="terms">
              <input id="terms" v-model="form.acceptedTerms" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 rounded border-primary/40 text-primary focus:ring-primary" :disabled="isLoading"
                :aria-invalid="!!errors.acceptedTerms" aria-describedby="terms-error" />
              <span>
                {{ $t('register.acceptTermsPrefix') }}
                <button type="button" class="font-semibold text-primary underline" @click="openDoc('terms')">{{ $t('register.termsOnlyLink') }}</button>
              </span>
            </label>
            <p v-if="errors.acceptedTerms" id="terms-error" class="nz-field-error">{{ errors.acceptedTerms }}</p>
          </div>
          <div>
            <label class="flex items-start gap-3 text-sm text-foreground-light" for="privacy">
              <input id="privacy" v-model="form.acceptedPrivacyPolicy" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 rounded border-primary/40 text-primary focus:ring-primary" :disabled="isLoading"
                :aria-invalid="!!errors.acceptedPrivacyPolicy" aria-describedby="privacy-error" />
              <span>
                {{ $t('register.acceptPrivacyPrefix') }}
                <button type="button" class="font-semibold text-primary underline" @click="openDoc('privacy')">{{ $t('register.privacyLink') }}</button>
                {{ $t('register.acceptPrivacySuffix') }}
              </span>
            </label>
            <p v-if="errors.acceptedPrivacyPolicy" id="privacy-error" class="nz-field-error">{{ errors.acceptedPrivacyPolicy }}</p>
          </div>
        </fieldset>

        <button type="submit" class="nz-btn-primary w-full py-3 text-base" :disabled="isLoading || isThrottled">
          <span v-if="isLoading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
          {{ isLoading ? $t('auth.register.submitting') : $t(`register.${accountType}.submit`) }}
        </button>
      </form>
    </template>

    <p class="mt-8 text-center text-sm text-muted-light">
      {{ $t('auth.register.hasAccount') }}
      <router-link :to="{ name: 'Login' }" class="font-semibold text-primary hover:underline">{{ $t('auth.register.signIn') }}</router-link>
    </p>

    <TermsDialog :open="!!openDocument" :doc="openDocument || 'all'" @close="openDocument = null" @accept="acceptDocument" />
  </AuthLayout>
</template>

<script>
/**
 * RegisterComponent - Registro con dos tipos de cuenta:
 *  - "Busco apoyo" (trabajador): cuenta activa al instante → onboarding.
 *  - "Soy psicólogo": pide especialidad y número de colegiatura (CPsP); la cuenta
 *    queda pendiente hasta que un administrador la verifique.
 * Ambos piden el DNI (8 dígitos, obligatorio en el backend) y dos consentimientos
 * separados: Términos y Condiciones, y Política de Privacidad (datos sensibles de salud).
 *
 * Privacidad: el DNI y la contraseña viven solo en el estado de este componente (memoria);
 * no se guardan en localStorage/sessionStorage ni se registran en consola.
 */
import AuthLayout from '../../components/AuthLayout.vue'
import TermsDialog from '../../components/ui/TermsDialog.vue'
import { AuthService } from '../../services/AuthService.js'
import { fieldErrors } from '../../services/ApiError.js'
import { SPECIALTIES } from '../../services/ProfessionalService.js'
import { ROLES, homeRouteFor } from '../../services/roles.js'
import { toast } from '../../composables/useToast.js'
import {
  isEmail, isStrongPassword, isLicenseDigits, fullNameError, dniError, onlyDigits,
  DNI_LENGTH, FULL_NAME_MAX_LENGTH
} from '../../utils/validation.js'

// Campos de texto del formulario (todos empiezan vacíos) y casillas, siempre desmarcadas
const TEXT_FIELDS = ['name', 'dni', 'email', 'password', 'confirmPassword', 'specialty', 'licenseNumber']
const emptyForm = () => ({
  ...Object.fromEntries(TEXT_FIELDS.map((field) => [field, ''])),
  acceptedTerms: false,
  acceptedPrivacyPolicy: false
})

/** Campos del backend con otro nombre en el formulario; el resto se llama igual en ambos */
const SERVER_ALIASES = { fullName: 'name', firstName: 'name', lastName: 'name', username: 'email' }
const FORM_FIELDS = [...TEXT_FIELDS, 'acceptedTerms', 'acceptedPrivacyPolicy']

/** Campo del backend → campo del formulario (null si no corresponde a ninguno, p. ej. "role") */
const formFieldFor = (serverField) => SERVER_ALIASES[serverField] || (FORM_FIELDS.includes(serverField) ? serverField : null)

/** Segundos que el botón queda deshabilitado tras un 429 (demasiados intentos) */
const THROTTLE_SECONDS = 30

export default {
  name: 'RegisterComponent',
  components: { AuthLayout, TermsDialog },
  data() {
    return {
      form: emptyForm(),
      errors: {},
      serverErrors: {},
      touched: {},
      submitted: false,
      isLoading: false,
      isThrottled: false,
      throttleTimer: null,
      errorMessage: '',
      openDocument: null,
      specialties: SPECIALTIES,
      dniLength: DNI_LENGTH,
      nameMaxLength: FULL_NAME_MAX_LENGTH,
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
    /** Validación en tiempo real de los campos ya tocados (y de todos tras el primer envío) */
    form: {
      deep: true,
      handler(value) {
        // Un error del servidor desaparece en cuanto el usuario corrige ese campo
        this.clearServerErrorsFor(value)
        this.validate({ onlyTouched: !this.submitted })
      }
    },
    accountType() {
      this.errors = {}
      this.serverErrors = {}
      this.touched = {}
      this.submitted = false
      this.errorMessage = ''
    }
  },
  beforeUnmount() {
    clearTimeout(this.throttleTimer)
    // No dejar datos personales en memoria del componente
    this.form = emptyForm()
  },
  methods: {
    chooseType(type) {
      this.$router.replace({ name: 'Register', query: type ? { type } : {} })
    },
    openDoc(doc) {
      this.openDocument = doc
    },
    /** "Entendido, acepto" en el documento marca solo la casilla de ese documento */
    acceptDocument() {
      if (this.openDocument === 'terms') this.form.acceptedTerms = true
      else if (this.openDocument === 'privacy') this.form.acceptedPrivacyPolicy = true
      this.openDocument = null
    },
    touch(field) {
      this.touched = { ...this.touched, [field]: true }
      this.validate({ onlyTouched: !this.submitted })
    },
    /** Campos numéricos (DNI, colegiatura): solo se conservan los dígitos 0-9, también al pegar */
    onDigitsInput(field, max, event) {
      const clean = onlyDigits(event.target.value, max)
      if (event.target.value !== clean) event.target.value = clean
      this.form[field] = clean
      if (field === 'dni' && clean.length === max) this.touched = { ...this.touched, dni: true }
    },
    clearServerErrorsFor(form) {
      const last = this._lastValues || {}
      const changed = Object.keys(this.serverErrors).filter((f) => form[f] !== last[f])
      if (changed.length) {
        const next = { ...this.serverErrors }
        changed.forEach((f) => delete next[f])
        this.serverErrors = next
      }
      this._lastValues = { ...form }
    },
    /** Reglas del backend (SignUpResource); el backend sigue siendo la autoridad final */
    clientErrors() {
      const e = {}
      const f = this.form
      const nameKey = fullNameError(f.name)
      if (nameKey) e.name = this.$t(nameKey === 'required' ? 'validation.fullName' : `validation.${nameKey}`)
      const dniKey = dniError(f.dni)
      if (dniKey) e.dni = this.$t(`validation.${dniKey}`)
      if (!f.email) e.email = this.$t('validation.required')
      else if (!isEmail(f.email)) e.email = this.$t('validation.email')
      if (!isStrongPassword(f.password)) e.password = this.$t('validation.passwordStrength')
      if (f.confirmPassword !== f.password) e.confirmPassword = this.$t('validation.passwordMatch')
      if (this.isPsychologist) {
        if (!f.specialty) e.specialty = this.$t('validation.specialty')
        if (!isLicenseDigits(f.licenseNumber)) e.licenseNumber = this.$t('validation.licenseDigits')
      }
      if (!f.acceptedTerms) e.acceptedTerms = this.$t('validation.acceptTermsOnly')
      if (!f.acceptedPrivacyPolicy) e.acceptedPrivacyPolicy = this.$t('validation.acceptPrivacy')
      return e
    },
    validate({ onlyTouched = false } = {}) {
      const all = { ...this.clientErrors() }
      const visible = onlyTouched ? Object.fromEntries(Object.entries(all).filter(([k]) => this.touched[k])) : all
      // Los errores del servidor (400/409) se muestran hasta que se edite el campo
      this.errors = { ...visible, ...this.serverErrors }
      return Object.keys(all).length === 0
    },
    /** 400/409/429 del backend → mensaje en su campo o mensaje general */
    applyServerError(error) {
      const server = {}
      if (error.status === 400) {
        Object.entries(fieldErrors(error)).forEach(([field, message]) => {
          const target = formFieldFor(field)
          if (target) server[target] = message
        })
        this.errorMessage = Object.keys(server).length ? this.$t('validation.fixErrors') : error.message
      } else if (error.status === 409) {
        const message = String(error.message || '')
        if (/dni/i.test(message)) server.dni = this.$t('register.errors.dniInUse')
        else if (/colegiatura|license/i.test(message)) server.licenseNumber = this.$t('register.errors.licenseInUse')
        else if (/correo|email/i.test(message)) server.email = this.$t('auth.errors.emailInUse')
        else this.errorMessage = message || this.$t('errors.conflict')
      } else if (error.status === 429) {
        this.errorMessage = this.$t('register.errors.tooManyAttempts')
        this.isThrottled = true
        clearTimeout(this.throttleTimer)
        this.throttleTimer = setTimeout(() => { this.isThrottled = false }, THROTTLE_SECONDS * 1000)
      } else {
        this.errorMessage = error.message
      }
      this.serverErrors = server
      this._lastValues = { ...this.form }
      this.errors = { ...this.errors, ...server }
    },
    async handleRegister() {
      this.errorMessage = ''
      this.submitted = true
      this.serverErrors = {}
      if (!this.validate() || this.isLoading || this.isThrottled) return
      this.isLoading = true
      try {
        const { user, authenticated } = await this.authService.register({
          ...this.form,
          role: this.isPsychologist ? ROLES.PSYCHOLOGIST : ROLES.USER
        })
        if (!authenticated) {
          toast.success(this.$t(this.isPsychologist ? 'register.psychologist.successLogin' : 'auth.register.successLogin'))
          this.$router.push({ name: 'Login' })
          return
        }
        // El trabajador pasa al onboarding; el psicólogo, a la pantalla de verificación
        this.$router.push(this.isPsychologist ? homeRouteFor(user) : { name: 'OnboardingWelcome' })
      } catch (error) {
        this.applyServerError(error)
      } finally {
        this.isLoading = false
      }
    }
  }
}
</script>
