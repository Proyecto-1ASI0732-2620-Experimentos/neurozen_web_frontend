<template>
  <span v-if="hasRating" class="inline-flex items-center gap-1" :aria-label="ariaLabel" role="img">
    <span class="flex text-amber-500" aria-hidden="true">
      <i v-for="n in 5" :key="n" :class="n <= Math.round(value) ? 'fas fa-star' : 'far fa-star'" class="text-xs"></i>
    </span>
    <span class="text-sm font-semibold text-foreground-light" aria-hidden="true">{{ value.toFixed(1) }}</span>
    <span v-if="count != null" class="text-sm text-muted-light" aria-hidden="true">({{ $tc('professionals.reviewsCount', count, { count }) }})</span>
  </span>
  <span v-else class="text-sm text-muted-light">{{ $t('professionals.noReviewsYet') }}</span>
</template>

<script>
/**
 * Valoración con estrellas. M2: sin valoraciones reales (valor nulo o 0 reseñas) muestra
 * «Sin valoraciones aún» en lugar de 0 estrellas o una cifra inventada.
 */
export default {
  name: 'StarRating',
  props: { value: { type: Number, default: null }, count: { type: Number, default: null } },
  computed: {
    hasRating() {
      return typeof this.value === 'number' && this.value > 0 && this.count !== 0
    },
    ariaLabel() {
      const base = this.$t('professionals.ratingLabel', { rating: this.value.toFixed(1) })
      return this.count != null ? `${base} · ${this.$tc('professionals.reviewsCount', this.count, { count: this.count })}` : base
    }
  }
}
</script>
