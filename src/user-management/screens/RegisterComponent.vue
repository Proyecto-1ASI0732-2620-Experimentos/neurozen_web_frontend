<template>
  <AuthLayout>
    <h1 class="text-3xl font-extrabold text-foreground-light">{{ $t('auth.register.title') }}</h1>
    <p class="mt-2 text-muted-light">{{ $t('auth.register.tagline') }}</p>

    <div v-if="errorMessage" class="mt-6 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
      <i class="fas fa-circle-exclamation mt-0.5" aria-hidden="true"></i>{{ errorMessage }}
    </div>

    <form class="mt-8 space-y-5" novalidate @submit.prevent="handleRegister">
      <div>
        <label class="nz-label" for="name">{{ $t('auth.register.name') }}</label>
        <input id="name" v-model="formData.name" type="text" autocomplete="name" class="nz-input" :class="{ 'nz-input-error': errors.name }"
          :placeholder="$t('auth.register.namePlaceholder')" :disabled="isLoading" :aria-invalid="!!errors.name" aria-describedby="name-error" />
        <p v-if="errors.name" id="name-error" class="nz-field-error">{{ errors.name }}</p>
      </div>
      <div>
        <label class="nz-label" for="email">{{ $t('auth.register.email') }}</label>
        <input id="email" v-model.trim="formData.email" type="email" autocomplete="email" class="nz-input" :class="{ 'nz-input-error': errors.email }"
          :placeholder="$t('auth.register.emailPlaceholder')" :disabled="isLoading" :aria-invalid="!!errors.email" aria-describedby="email-error" />
        <p v-if="errors.email" id="email-error" class="nz-field-error">{{ errors.email }}</p>
      </div>
      <div>
        <label class="nz-label" for="password">{{ $t('auth.register.password') }}</label>
        <input id="password" v-model="formData.password" type="password" autocomplete="new-password" class="nz-input" :class="{ 'nz-input-error': errors.password }"
          :disabled="isLoading" :aria-invalid="!!errors.password" aria-describedby="password-hint" />
        <p v-if="errors.password" id="password-hint" class="nz-field-error">{{ errors.password }}</p>
        <p v-else id="password-hint" class="nz-hint">{{ $t('auth.register.passwordHint') }}</p>
      </div>
      <div>
        <label class="nz-label" for="confirm">{{ $t('auth.register.confirmPassword') }}</label>
        <input id="confirm" v-model="formData.confirmPassword" type="password" autocomplete="new-password" class="nz-input" :class="{ 'nz-input-error': errors.confirmPassword }"
          :disabled="isLoading" :aria-invalid="!!errors.confirmPassword" aria-describedby="confirm-error" />
        <p v-if="errors.confirmPassword" id="confirm-error" class="nz-field-error">{{ errors.confirmPassword }}</p>
      </div>

      <button type="submit" class="nz-btn-primary w-full py-3 text-base" :disabled="isLoading">
        <span v-if="isLoading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
        {{ isLoading ? $t('auth.register.submitting') : $t('auth.register.submit') }}
      </button>
    </form>

    <p class="mt-8 text-center text-sm text-muted-light">
      {{ $t('auth.register.hasAccount') }}
      <router-link :to="{ name: 'Login' }" class="font-semibold text-primary hover:underline">{{ $t('auth.register.signIn') }}</router-link>
    </p>
  </AuthLayout>
</template>

<script>
/** RegisterComponent - Alta de usuario con validación por campo y confirmación de contraseña. */
import AuthLayout from '../../components/AuthLayout.vue'
import { AuthService } from '../../services/AuthService.js'
import { toast } from '../../composables/useToast.js'
import { isEmail, minLength } from '../../utils/validation.js'

export default {
  name: 'RegisterComponent',
  components: { AuthLayout },
  data() {
    return {
      formData: { name: '', email: '', password: '', confirmPassword: '' },
      errors: {},
      isLoading: false,
      errorMessage: '',
      authService: new AuthService()
    }
  },
  methods: {
    validate() {
      const e = {}
      const f = this.formData
      if (!minLength(f.name, 2)) e.name = this.$t('validation.required')
      if (!f.email) e.email = this.$t('validation.required')
      else if (!isEmail(f.email)) e.email = this.$t('validation.email')
      if (!minLength(f.password, 6)) e.password = this.$t('validation.passwordLength')
      if (f.confirmPassword !== f.password) e.confirmPassword = this.$t('validation.passwordMatch')
      this.errors = e
      return Object.keys(e).length === 0
    },
    async handleRegister() {
      this.errorMessage = ''
      if (!this.validate() || this.isLoading) return
      this.isLoading = true
      try {
        const { authenticated } = await this.authService.register(this.formData)
        if (authenticated) {
          this.$router.push({ name: 'OnboardingWelcome' })
        } else {
          toast.success(this.$t('auth.register.successLogin'))
          this.$router.push({ name: 'Login' })
        }
      } catch (error) {
        this.errorMessage = error.status === 409 ? this.$t('auth.errors.emailInUse') : error.message
      } finally {
        this.isLoading = false
      }
    }
  }
}
</script>
