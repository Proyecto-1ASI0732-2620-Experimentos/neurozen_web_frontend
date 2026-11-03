<template>
  <div id="nz-app" class="flex min-h-screen flex-col">
    <a href="#main-content" class="sr-only z-[10002] rounded bg-primary px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
      {{ $t('common.skipToContent') }}
    </a>

    <HeaderComponent v-if="showChrome" />

    <main id="main-content" class="flex flex-1 flex-col" tabindex="-1">
      <router-view />
    </main>

    <FooterComponent v-if="showChrome" />
    <ZenBotWidget v-if="showZenBot" />
    <ToastHost />
  </div>
</template>

<script>
/**
 * App.vue - Componente raíz: layout global (Header/Footer) y notificaciones.
 * Las pantallas de autenticación y onboarding usan un layout sin cabecera (meta.layout = 'bare').
 */
import HeaderComponent from './components/layout/HeaderComponent.vue'
import FooterComponent from './components/layout/FooterComponent.vue'
import ToastHost from './components/ui/ToastHost.vue'
import ZenBotWidget from './zenbot/ZenBotWidget.vue'
import { session } from './services/session.js'
import { getRole, ROLES } from './services/roles.js'

export default {
  name: 'App',
  components: { HeaderComponent, FooterComponent, ToastHost, ZenBotWidget },
  computed: {
    /** ZenBot acompaña al trabajador en la plataforma (no a psicólogos ni administradores) */
    showZenBot() {
      return this.showChrome && !!session.token && getRole(session.user) === ROLES.USER
    },
    showChrome() {
      // Mientras el router resuelve la primera ruta, matched está vacío
      return this.$route.matched.length > 0 && this.$route.meta.layout !== 'bare'
    }
  }
}
</script>
