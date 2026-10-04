<template>
  <div class="flex flex-col items-center justify-center gap-3 py-16 text-muted-light" role="status" aria-live="polite">
    <span class="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" aria-hidden="true"></span>
    <p class="text-sm font-medium">{{ message || $t('common.loading') }}</p>
  </div>
</template>

<script>
export default { name: 'LoadingState', props: { message: { type: String, default: '' } } }
</script>
