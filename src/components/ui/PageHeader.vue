<template>
  <header class="mb-6 flex flex-wrap items-start gap-3 sm:mb-8">
    <button
      v-if="back !== false"
      type="button"
      class="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E3DED2] bg-white text-primary transition-colors hover:bg-primary/10"
      :aria-label="$t('common.back')"
      @click="goBack"
    >
      <i class="fas fa-arrow-left" aria-hidden="true"></i>
    </button>
    <div class="min-w-0 flex-1">
      <h1 class="text-2xl font-extrabold leading-tight text-foreground-light sm:text-3xl">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 max-w-2xl text-sm text-muted-light sm:text-base">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex w-full flex-wrap gap-2 sm:w-auto">
      <slot name="actions" />
    </div>
  </header>
</template>

<script>
/** Cabecera de página reutilizable: botón Atrás seguro + título + acciones. */
export default {
  name: 'PageHeader',
  props: {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    /** Ruta de respaldo si no hay historial (entrada por URL directa). false = sin botón */
    back: { type: [String, Object, Boolean], default: '/' }
  },
  methods: {
    goBack() {
      // router.go(-1) sacaba al usuario de la app si entró por URL directa
      if (window.history.state && window.history.state.back) this.$router.back()
      else this.$router.push(this.back)
    }
  }
}
</script>
