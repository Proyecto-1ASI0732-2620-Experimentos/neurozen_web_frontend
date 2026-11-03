<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 p-4" @click.self="$emit('close')">
      <div class="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl" role="dialog" aria-modal="true" aria-labelledby="terms-title" @keydown.esc="$emit('close')">
        <header class="flex items-center justify-between border-b border-[#E3DED2] px-6 py-4">
          <h2 id="terms-title" class="text-lg font-bold text-foreground-light">{{ $t('legal.title') }}</h2>
          <button ref="closeBtn" type="button" class="h-9 w-9 rounded-lg text-muted-light hover:bg-primary/10" :aria-label="$t('common.close')" @click="$emit('close')">
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <div class="space-y-5 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-foreground-light">
          <section v-for="section in sections" :key="section">
            <h3 class="mb-1 font-bold text-primary">{{ $t(`legal.${section}.title`) }}</h3>
            <p>{{ $t(`legal.${section}.text`) }}</p>
          </section>
        </div>
        <footer class="border-t border-[#E3DED2] px-6 py-4 text-right">
          <button type="button" class="nz-btn-primary" @click="$emit('accept')">{{ $t('legal.accept') }}</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script>
/**
 * TermsDialog - Términos y Política de Privacidad.
 * Es un requisito legal porque la plataforma trata datos sensibles de salud
 * (Ley N.° 29733, Ley de Protección de Datos Personales del Perú).
 */
export default {
  name: 'TermsDialog',
  props: { open: { type: Boolean, default: false } },
  emits: ['close', 'accept'],
  data() {
    return { sections: ['purpose', 'data', 'health', 'professionals', 'rights'] }
  },
  watch: {
    open(value) {
      if (value) this.$nextTick(() => this.$refs.closeBtn && this.$refs.closeBtn.focus())
    }
  }
}
</script>
