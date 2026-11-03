<template>
  <AuthLayout>
    <router-link :to="{ name: 'Login' }" class="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
      <i class="fas fa-arrow-left" aria-hidden="true"></i>{{ $t('password.backToLogin') }}
    </router-link>
    <h1 class="text-3xl font-extrabold text-foreground-light">{{ $t('password.forgot.title') }}</h1>
    <p class="mt-2 text-muted-light">{{ $t('password.forgot.subtitle') }}</p>

    <div v-if="sent" class="mt-8 space-y-4">
      <div class="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900" role="status">
        <i class="fas fa-envelope-circle-check mt-0.5" aria-hidden="true"></i>{{ $t('password.forgot.sent', { email }) }}
      </div>
      <!-- Solo en modo demostración: no hay servidor de correo, se muestra el enlace -->
      <div v-if="demoToken" class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p class="font-semibold">{{ $t('password.forgot.demoNote') }}</p>
        <router-link :to="{ name: 'ResetPassword', query: { token: demoToken } }" class="mt-2 inline-block font-bold underline">{{ $t('password.forgot.demoLink') }}</router-link>
      </div>
    </div>

    <form v-else class="mt-8 space-y-5" novalidate @submit.prevent="submit">
      <div v-if="errorMessage" class="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
        <i class="fas fa-circle-exclamation mt-0.5" aria-hidden="true"></i>{{ errorMessage }}
      </div>
      <div>
        <label class="nz-label" for="fp-email">{{ $t('auth.login.email') }}</label>
        <input id="fp-email" v-model.trim="email" type="email" autocomplete="email" class="nz-input" :class="{ 'nz-input-error': error }" :aria-invalid="!!error" />
        <p v-if="error" class="nz-field-error">{{ error }}</p>
      </div>
      <button type="submit" class="nz-btn-primary w-full py-3" :disabled="loading">
        <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
        {{ $t('password.forgot.submit') }}
      </button>
    </form>
  </AuthLayout>
</template>

<script>
/**
 * ForgotPasswordComponent - Solicitud del enlace para restablecer la contraseña.
 * El mensaje es el mismo exista o no la cuenta (no revela qué correos están registrados).
 */
import AuthLayout from '../../components/AuthLayout.vue'
import { AuthService } from '../../services/AuthService.js'
import { isEmail } from '../../utils/validation.js'

export default {
  name: 'ForgotPasswordComponent',
  components: { AuthLayout },
  data() {
    return { email: '', error: '', errorMessage: '', loading: false, sent: false, demoToken: null }
  },
  methods: {
    async submit() {
      this.error = isEmail(this.email) ? '' : this.$t('validation.email')
      if (this.error || this.loading) return
      this.loading = true
      this.errorMessage = ''
      try {
        const response = await new AuthService().forgotPassword(this.email)
        this.demoToken = response?.demoResetToken || null
        this.sent = true
      } catch (error) {
        this.errorMessage = error.message
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
