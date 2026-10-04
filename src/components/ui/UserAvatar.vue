<template>
  <img v-if="src && !failed" :src="src" alt="" :class="['rounded-full object-cover', sizeClass]" @error="failed = true" />
  <span v-else :class="['inline-flex items-center justify-center rounded-full bg-primary font-bold text-white', sizeClass, textClass]" aria-hidden="true">{{ initials }}</span>
</template>

<script>
/** Avatar con iniciales locales como respaldo (sin depender de servicios externos). */
export default {
  name: 'UserAvatar',
  props: { src: { type: String, default: '' }, name: { type: String, default: '' }, size: { type: String, default: 'md' } },
  data() {
    return { failed: false }
  },
  computed: {
    initials() {
      const parts = this.name.trim().split(/\s+/).filter(Boolean)
      return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase()
    },
    sizeClass() {
      return { sm: 'h-9 w-9', md: 'h-12 w-12', lg: 'h-28 w-28' }[this.size]
    },
    textClass() {
      return { sm: 'text-xs', md: 'text-sm', lg: 'text-3xl' }[this.size]
    }
  },
  watch: {
    src() { this.failed = false }
  }
}
</script>
