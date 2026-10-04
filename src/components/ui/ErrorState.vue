<template>
  <div class="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center" role="alert">
    <i class="fas fa-circle-exclamation text-2xl text-red-700" aria-hidden="true"></i>
    <p class="font-semibold text-red-900">{{ title || $t('common.errorLoading') }}</p>
    <p v-if="message" class="text-sm text-red-800">{{ message }}</p>
    <button v-if="retry" type="button" class="nz-btn-secondary mt-1" @click="$emit('retry')">
      <i class="fas fa-rotate-right" aria-hidden="true"></i>{{ $t('common.retry') }}
    </button>
  </div>
</template>

<script>
export default {
  name: 'ErrorState',
  props: { title: { type: String, default: '' }, message: { type: String, default: '' }, retry: { type: Boolean, default: true } },
  emits: ['retry']
}
</script>
