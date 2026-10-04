<template>
  <div class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#D6D2C7] bg-white/60 px-6 py-10 text-center">
    <i :class="[icon, 'text-2xl text-primary/60']" aria-hidden="true"></i>
    <p class="font-semibold text-foreground-light">{{ title }}</p>
    <p v-if="message" class="max-w-sm text-sm text-muted-light">{{ message }}</p>
    <slot />
  </div>
</template>

<script>
export default {
  name: 'EmptyState',
  props: { title: { type: String, required: true }, message: { type: String, default: '' }, icon: { type: String, default: 'fas fa-inbox' } }
}
</script>
