<template>
  <span class="inline-flex items-center gap-1" :aria-label="$t('professionals.ratingLabel', { rating: value.toFixed(1) })" role="img">
    <span class="flex text-amber-500" aria-hidden="true">
      <i v-for="n in 5" :key="n" :class="n <= Math.round(value) ? 'fas fa-star' : 'far fa-star'" class="text-xs"></i>
    </span>
    <span class="text-sm font-semibold text-foreground-light">{{ value.toFixed(1) }}</span>
    <span v-if="count != null" class="text-xs text-muted-light">({{ count }})</span>
  </span>
</template>

<script>
/** Valoración con estrellas (antes había 3 implementaciones distintas). */
export default { name: 'StarRating', props: { value: { type: Number, default: 0 }, count: { type: Number, default: null } } }
</script>
