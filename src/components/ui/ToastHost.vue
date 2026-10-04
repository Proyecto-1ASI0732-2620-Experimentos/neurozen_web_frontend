<template>
  <div class="pointer-events-none fixed inset-x-0 top-[calc(var(--header-height)+8px)] z-[10000] flex flex-col items-center gap-2 px-3 sm:items-end sm:pr-6" aria-live="polite">
    <TransitionGroup name="nz-toast">
      <div
        v-for="item in toasts"
        :key="item.id"
        class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-white px-4 py-3 shadow-lg"
        :class="styles[item.type].box"
        :role="item.type === 'error' ? 'alert' : 'status'"
      >
        <i :class="[styles[item.type].icon, 'mt-0.5']" aria-hidden="true"></i>
        <div class="min-w-0 flex-1 text-sm">
          <p v-if="item.title" class="font-bold">{{ item.title }}</p>
          <p class="text-foreground-light">{{ item.message }}</p>
        </div>
        <button type="button" class="text-muted-light hover:text-foreground-light" :aria-label="$t('common.close')" @click="dismiss(item.id)">
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script>
import { useToast } from '../../composables/useToast.js'

export default {
  name: 'ToastHost',
  setup() {
    const { toasts, dismiss } = useToast()
    const styles = {
      success: { box: 'border-green-200', icon: 'fas fa-circle-check text-green-700' },
      error: { box: 'border-red-200', icon: 'fas fa-circle-exclamation text-red-700' },
      warning: { box: 'border-amber-200', icon: 'fas fa-triangle-exclamation text-amber-600' },
      info: { box: 'border-sky-200', icon: 'fas fa-circle-info text-secondary' }
    }
    return { toasts, dismiss, styles }
  }
}
</script>

<style scoped>
.nz-toast-enter-active, .nz-toast-leave-active { transition: all 0.2s ease; }
.nz-toast-enter-from, .nz-toast-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
