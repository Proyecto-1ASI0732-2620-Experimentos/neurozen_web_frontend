<template>
  <footer class="mt-auto border-t border-[#E3DED2] bg-white">
    <div class="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
      <div>
        <div class="flex items-center gap-2.5">
          <img src="/neurozen1_logo.png" alt="" width="40" height="40" class="h-10 w-10 rounded-lg object-contain" />
          <span class="text-lg font-extrabold text-primary">{{ $t('footer.company') }}</span>
        </div>
        <p class="mt-3 max-w-xs text-sm text-muted-light">{{ $t('footer.description') }}</p>
      </div>

      <nav :aria-label="$t('footer.explore')">
        <h2 class="footer-title">{{ $t('footer.explore') }}</h2>
        <ul class="space-y-2 text-sm">
          <li><router-link to="/stress/resources" class="footer-link">{{ $t('stress.management.resources') }}</router-link></li>
          <li><router-link to="/stress/breathing" class="footer-link">{{ $t('stress.management.breathing') }}</router-link></li>
          <li><router-link to="/therapists" class="footer-link">{{ $t('navigation.professionals') }}</router-link></li>
          <li><router-link to="/subscriptions" class="footer-link">{{ $t('navigation.subscriptions') }}</router-link></li>
        </ul>
      </nav>

      <nav :aria-label="$t('footer.links.support')">
        <h2 class="footer-title">{{ $t('footer.links.support') }}</h2>
        <ul class="space-y-2 text-sm">
          <li><router-link to="/settings" class="footer-link">{{ $t('header.settings') }}</router-link></li>
          <li><router-link to="/appointments" class="footer-link">{{ $t('navigation.myAppointments') }}</router-link></li>
          <li><a :href="`mailto:${$t('footer.contact.email')}`" class="footer-link">{{ $t('footer.links.contact') }}</a></li>
        </ul>
      </nav>

      <div>
        <h2 class="footer-title">{{ $t('footer.contact.title') }}</h2>
        <ul class="space-y-2 text-sm text-muted-light">
          <li class="flex items-center gap-2"><i class="fas fa-envelope w-4 text-primary" aria-hidden="true"></i>{{ $t('footer.contact.email') }}</li>
          <li class="flex items-center gap-2"><i class="fas fa-phone w-4 text-primary" aria-hidden="true"></i>{{ $t('footer.contact.phone') }}</li>
          <li class="flex items-center gap-2"><i class="fas fa-location-dot w-4 text-primary" aria-hidden="true"></i>{{ $t('footer.contact.address') }}</li>
        </ul>
      </div>
    </div>
    <div class="border-t border-[#EEE9DD]">
      <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-muted-light sm:flex-row sm:px-6">
        <p>{{ $t('footer.copyright') }}</p>
        <p>v{{ version }}</p>
      </div>
    </div>

    <button
      v-show="showScrollTop"
      type="button"
      class="fixed bottom-5 right-5 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-strong"
      :aria-label="$t('footer.backToTop')"
      @click="scrollToTop"
    >
      <i class="fas fa-arrow-up" aria-hidden="true"></i>
    </button>
  </footer>
</template>

<script>
/** FooterComponent - Enlaces útiles (solo rutas existentes), contacto y volver arriba. */
export default {
  name: 'FooterComponent',
  data() {
    return { showScrollTop: false, version: __APP_VERSION__ }
  },
  mounted() {
    window.addEventListener('scroll', this.handleScroll, { passive: true })
  },
  beforeUnmount() {
    window.removeEventListener('scroll', this.handleScroll)
  },
  methods: {
    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    handleScroll() {
      this.showScrollTop = window.scrollY > 400
    }
  }
}
</script>

<style scoped>
.footer-title { @apply mb-3 text-sm font-bold text-foreground-light; }
.footer-link { @apply text-muted-light transition-colors hover:text-primary; }
</style>
