<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 p-4" @click.self="$emit('cancel')">
      <div
        ref="dialog"
        class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`${uid}-title`"
        tabindex="-1"
        @keydown.esc="$emit('cancel')"
      >
        <h2 :id="`${uid}-title`" class="text-lg font-bold text-foreground-light">{{ title }}</h2>
        <p v-if="message" class="mt-2 text-sm text-muted-light">{{ message }}</p>
        <slot />
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref="cancelBtn" type="button" class="nz-btn-secondary" @click="$emit('cancel')">{{ cancelText || $t('common.cancel') }}</button>
          <button type="button" :class="danger ? 'nz-btn-danger' : 'nz-btn-primary'" :disabled="busy" @click="$emit('confirm')">
            <span v-if="busy" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
            {{ confirmText || $t('common.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
let counter = 0
/** Diálogo de confirmación accesible (sustituye a window.confirm). */
export default {
  name: 'ConfirmDialog',
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    confirmText: { type: String, default: '' },
    cancelText: { type: String, default: '' },
    danger: { type: Boolean, default: false },
    busy: { type: Boolean, default: false }
  },
  emits: ['confirm', 'cancel'],
  data() {
    return { uid: `nz-dialog-${++counter}` }
  },
  watch: {
    open(value) {
      if (value) this.$nextTick(() => this.$refs.cancelBtn && this.$refs.cancelBtn.focus())
    }
  }
}
</script>
