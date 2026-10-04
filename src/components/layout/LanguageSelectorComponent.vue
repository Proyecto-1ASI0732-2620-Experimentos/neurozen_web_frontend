<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-foreground-light transition-colors hover:bg-primary/10"
      :aria-label="$t('header.language')"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="toggle"
    >
      <i class="fas fa-globe text-primary" aria-hidden="true"></i>
      <span>{{ currentLocale.toUpperCase() }}</span>
      <i class="fas fa-chevron-down text-[10px] transition-transform" :class="{ 'rotate-180': open }" aria-hidden="true"></i>
    </button>
    <div v-show="open" class="absolute right-0 top-12 z-50 w-40 overflow-hidden rounded-lg border border-[#E3DED2] bg-white py-1 shadow-lg" role="menu">
      <button
        v-for="lang in languages"
        :key="lang.code"
        type="button"
        role="menuitemradio"
        :aria-checked="currentLocale === lang.code"
        class="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-primary/5"
        :class="currentLocale === lang.code ? 'font-bold text-primary' : 'text-foreground-light'"
        @click="changeLanguage(lang.code)"
      >
        {{ lang.label }}
        <i v-if="currentLocale === lang.code" class="fas fa-check text-xs" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>

<script>
/** Selector de idioma (es/en) con persistencia. */
import { setLocale } from '../../i18n/index.js'

export default {
  name: 'LanguageSelectorComponent',
  emits: ['opened', 'language-changed'],
  data() {
    return {
      open: false,
      languages: [
        { code: 'es', label: 'Español' },
        { code: 'en', label: 'English' }
      ]
    }
  },
  computed: {
    currentLocale() {
      return this.$i18n.locale
    }
  },
  mounted() {
    document.addEventListener('click', this.onDocumentClick)
    document.addEventListener('keydown', this.onKeydown)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onDocumentClick)
    document.removeEventListener('keydown', this.onKeydown)
  },
  methods: {
    toggle() {
      this.open = !this.open
      if (this.open) this.$emit('opened')
    },
    close() {
      this.open = false
    },
    changeLanguage(code) {
      setLocale(code)
      this.close()
      this.$emit('language-changed', code)
    },
    onDocumentClick(e) {
      if (this.$refs.root && !this.$refs.root.contains(e.target)) this.close()
    },
    onKeydown(e) {
      if (e.key === 'Escape') this.close()
    }
  }
}
</script>
