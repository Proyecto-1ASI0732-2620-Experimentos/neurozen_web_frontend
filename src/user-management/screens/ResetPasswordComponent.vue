<template>
  <AuthLayout>
    <h1 class="text-3xl font-extrabold text-foreground-light">{{ $t('password.reset.title') }}</h1>
    <p class="mt-2 text-muted-light">{{ $t('password.reset.subtitle') }}</p>

    <div v-if="!token" class="mt-8 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
      <i class="fas fa-link-slash mt-0.5" aria-hidden="true"></i>
      <span>{{ $t('password.reset.invalidLink') }} <router-link :to="{ name: 'ForgotPassword' }" class="font-semibold underline">{{ $t('password.reset.requestNew') }}</router-link></span>
    </div>

    <form v-else class="mt-8 space-y-5" novalidate @submit.prevent="submit">
      <div v-if="errorMessage" class="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
        <i class="fas fa-circle-exclamation mt-0.5" aria-hidden="true"></i>{{ errorMessage }}
      </div>
      <div>
        <label class="nz-label" for="rp-new">{{ $t('password.new') }}</label>
        <input id="rp-new" v-model="password" type="password" autocomplete="new-password" class="nz-input" :class="{ 'nz-input-error': errors.password }" :aria-invalid="!!errors.password" />
        <p v-if="errors.password" class="nz-field-error">{{ errors.password }}</p>
        <p v-else class="nz-hint">{{ $t('register.passwordRules') }}</p>
      </div>
      <div>
        <label class="nz-label" for="rp-confirm">{{ $t('auth.register.confirmPassword') }}</label>
        <input id="rp-confirm" v-model="confirm" type="password" autocomplete="new-password" class="nz-input" :class="{ 'nz-input-error': errors.confirm }" :aria-invalid="!!errors.confirm" />
        <p v-if="errors.confirm" class="nz-field-error">{{ errors.confirm }}</p>
      </div>
      <button type="submit" class="nz-btn-primary w-full py-3" :disabled="loading">
        <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
        {{ $t('password.reset.submit') }}
      </button>
    </form>
  </AuthLayout>
</template>

<script>
/** ResetPasswordComponent - Nueva contraseña a partir del enlace (?token=...). */
import AuthLayout from '../../components/AuthLayout.vue'
import { AuthService } from '../../services/AuthService.js'
import { toast } from '../../composables/useToast.js'
import { isStrongPassword } from '../../utils/validation.js'

export default {
  name: 'ResetPasswordComponent',
  components: { AuthLayout },
  data() {
    return { password: '', confirm: '', errors: {}, errorMessage: '', loading: false }
  },
  computed: {
    token() {
      return typeof this.$route.query.token === 'string' ? this.$route.query.token : ''
    }
  },
  methods: {
    async submit() {
      const e = {}
      if (!isStrongPassword(this.password)) e.password = this.$t('validation.passwordStrength')
      if (this.confirm !== this.password) e.confirm = this.$t('validation.passwordMatch')
      this.errors = e
      if (Object.keys(e).length || this.loading) return
      this.loading = true
      this.errorMessage = ''
      try {
        await new AuthService().resetPassword(this.token, this.password)
        toast.success(this.$t('password.reset.done'))
        this.$router.replace({ name: 'Login' })
      } catch (error) {
        this.errorMessage = error.message
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
