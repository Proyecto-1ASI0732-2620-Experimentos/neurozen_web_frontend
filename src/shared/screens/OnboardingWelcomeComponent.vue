<template>
  <OnboardingStep :step="step" @next="next" @skip="finish" />
</template>

<script>
/** Paso 1 del onboarding (pasos locales: el backend no expone /onboarding). */
import OnboardingStep from '../../components/OnboardingStep.vue'
import { ONBOARDING_STEPS } from '../../services/OnboardingService.js'
import { isAuthenticated } from '../../services/session.js'

export default {
  name: 'OnboardingWelcomeComponent',
  components: { OnboardingStep },
  data() {
    return { step: ONBOARDING_STEPS[0] }
  },
  methods: {
    next() {
      this.$router.push('/onboarding/step/2')
    },
    finish() {
      // Tras el registro ya hay sesión: se entra directamente al Dashboard
      this.$router.push(isAuthenticated() ? { name: 'Dashboard' } : { name: 'Login' })
    }
  }
}
</script>
