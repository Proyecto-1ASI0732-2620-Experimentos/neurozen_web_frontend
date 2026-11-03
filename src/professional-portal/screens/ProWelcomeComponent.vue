<template>
  <div class="flex min-h-screen items-center justify-center bg-background-light px-4 py-12">
    <section class="w-full max-w-lg text-center">
      <span class="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-5xl text-green-700 ring-8 ring-green-50">
        <i class="fas fa-check" aria-hidden="true"></i>
      </span>
      <span class="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-white">
        <i class="fas fa-shield-halved" aria-hidden="true"></i>{{ $t('pro.badge.verified') }}
      </span>
      <h1 class="mt-4 text-3xl font-extrabold text-foreground-light">{{ $t('pro.welcome.title') }}</h1>
      <p class="mt-2 text-muted-light">{{ $t('pro.welcome.text') }}</p>

      <div v-if="profile" class="nz-card mt-8 p-5 text-left">
        <p class="mb-3 font-bold text-foreground-light">{{ $t('pro.welcome.completeProfile') }}</p>
        <ProfileProgress :profile="profile" />
      </div>

      <div class="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <router-link :to="{ name: 'ProProfile' }" class="nz-btn-secondary">{{ $t('pro.welcome.goProfile') }}</router-link>
        <router-link :to="{ name: 'ProDashboard' }" class="nz-btn-primary">{{ $t('pro.welcome.goPanel') }}<i class="fas fa-arrow-right" aria-hidden="true"></i></router-link>
      </div>
    </section>
  </div>
</template>

<script>
/**
 * ProWelcomeComponent - Se muestra una sola vez, cuando el psicólogo entra por primera
 * vez tras ser verificado. Le recuerda que verificación ≠ perfil completo.
 */
import ProfileProgress from '../components/ProfileProgress.vue'
import { loadPortalData } from '../usePortal.js'
import { writeUserData } from '../../services/session.js'
import { PRO_WELCOME_KEY } from '../../services/roles.js'

export default {
  name: 'ProWelcomeComponent',
  components: { ProfileProgress },
  data() {
    return { profile: null }
  },
  async created() {
    writeUserData(PRO_WELCOME_KEY, true)
    try {
      this.profile = (await loadPortalData({ withAppointments: false })).profile
    } catch {
      this.profile = null
    }
  }
}
</script>
