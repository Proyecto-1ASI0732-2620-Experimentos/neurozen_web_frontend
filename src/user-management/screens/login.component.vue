<template>
  <AuthLayout>
    <h1 class="text-3xl font-extrabold text-foreground-light">{{ $t('auth.login.welcomeBack') }}</h1>
    <p class="mt-2 text-muted-light">{{ $t('auth.login.subtitle') }}</p>

    <div v-if="$route.query.expired" class="mt-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="status">
      <i class="fas fa-clock mt-0.5" aria-hidden="true"></i>{{ $t('auth.login.sessionExpired') }}
    </div>
    <div v-if="errorMessage" class="mt-6 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
      <i class="fas fa-circle-exclamation mt-0.5" aria-hidden="true"></i>{{ errorMessage }}
    </div>

    <form class="mt-8 space-y-5" novalidate @submit.prevent="handleLogin">
      <div>
        <label class="nz-label" for="email">{{ $t('auth.login.email') }}</label>
        <input
          id="email" v-model.trim="formData.email" type="email" autocomplete="email" class="nz-input"
          :class="{ 'nz-input-error': errors.email }" :placeholder="$t('auth.login.emailPlaceholder')"
          :disabled="isLoading" :aria-invalid="!!errors.email" aria-describedby="email-error"
        />
        <p v-if="errors.email" id="email-error" class="nz-field-error">{{ errors.email }}</p>
      </div>
      <div>
        <label class="nz-label" for="password">{{ $t('auth.login.password') }}</label>
        <div class="relative">
          <input
            id="password" v-model="formData.password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password"
            class="nz-input pr-11" :class="{ 'nz-input-error': errors.password }" :placeholder="$t('auth.login.passwordPlaceholder')"
            :disabled="isLoading" :aria-invalid="!!errors.password" aria-describedby="password-error"
          />
          <button type="button" class="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-light hover:text-primary"
            :aria-label="showPassword ? $t('auth.hidePassword') : $t('auth.showPassword')" @click="showPassword = !showPassword">
            <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'" aria-hidden="true"></i>
          </button>
        </div>
        <p v-if="errors.password" id="password-error" class="nz-field-error">{{ errors.password }}</p>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <label class="flex items-center gap-2 text-sm text-foreground-light" for="remember-me">
          <input id="remember-me" v-model="formData.rememberMe" type="checkbox" class="h-4 w-4 rounded border-primary/40 text-primary focus:ring-primary" :disabled="isLoading" />
          {{ $t('auth.login.rememberMe') }}
        </label>
        <button type="button" class="text-sm font-semibold text-primary hover:underline" @click="showForgot = !showForgot">
          {{ $t('auth.login.forgotPassword') }}
        </button>
      </div>
      <p v-if="showForgot" class="rounded-lg bg-white p-3 text-sm text-muted-light" role="status">
        {{ $t('auth.login.forgotPasswordInfo') }}
      </p>

      <button type="submit" class="nz-btn-primary w-full py-3 text-base" :disabled="isLoading">
        <span v-if="isLoading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
        {{ isLoading ? $t('auth.login.submitting') : $t('auth.login.submit') }}
      </button>
    </form>

    <p class="mt-8 text-center text-sm text-muted-light">
      {{ $t('auth.login.noAccount') }}
      <router-link :to="{ name: 'Register' }" class="font-semibold text-primary hover:underline">{{ $t('auth.login.signUp') }}</router-link>
    </p>
  </AuthLayout>
</template>

<script>
/**
 * LoginComponent - Inicio de sesión.
 * Valida antes de llamar a la API, distingue credenciales inválidas de errores
 * de red, implementa "Recordarme" y vuelve a la página solicitada (?redirect).
 */
import AuthLayout from '../../components/AuthLayout.vue'
import { AuthService } from '../../services/AuthService.js'
import { isEmail } from '../../utils/validation.js'

export default {
  name: 'LoginComponent',
  components: { AuthLayout },
  data() {
    return {
      formData: { email: '', password: '', rememberMe: true },
      errors: {},
      isLoading: false,
      errorMessage: '',
      showPassword: false,
      showForgot: false,
      authService: new AuthService()
    }
  },
  methods: {
    validate() {
      const errors = {}
      if (!this.formData.email) errors.email = this.$t('validation.required')
      else if (!isEmail(this.formData.email)) errors.email = this.$t('validation.email')
      if (!this.formData.password) errors.password = this.$t('validation.required')
      this.errors = errors
      return Object.keys(errors).length === 0
    },
    async handleLogin() {
      this.errorMessage = ''
      if (!this.validate() || this.isLoading) return
      this.isLoading = true
      try {
        await this.authService.login(this.formData.email, this.formData.password, { remember: this.formData.rememberMe })
        const redirect = this.$route.query.redirect
        this.$router.replace(typeof redirect === 'string' && redirect.startsWith('/') ? redirect : { name: 'Dashboard' })
      } catch (error) {
        this.errorMessage = error.message
      } finally {
        this.isLoading = false
      }
    }
  }
}
</script>
