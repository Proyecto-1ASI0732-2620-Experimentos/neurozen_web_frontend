<template>
  <article class="relative flex flex-col rounded-2xl border bg-white p-6 sm:p-8" :class="isAdvanced ? 'border-primary shadow-lg ring-1 ring-primary' : 'border-[#E3DED2] shadow-sm'">
    <span v-if="isAdvanced" class="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">{{ $t('subscriptions.plans.recommended') }}</span>
    <h2 class="text-xl font-extrabold text-primary">{{ name }}</h2>
    <p class="mt-1 text-sm text-muted-light">{{ subtitle }}</p>
    <p class="mt-5 text-4xl font-extrabold text-foreground-light">{{ price }}</p>
    <ul class="mb-8 mt-6 space-y-3 text-sm text-foreground-light">
      <li v-for="(feature, index) in features" :key="index" class="flex gap-2.5">
        <i class="fas fa-check mt-1 text-primary" aria-hidden="true"></i><span>{{ feature }}</span>
      </li>
    </ul>
    <button type="button" class="mt-auto w-full py-3" :class="isAdvanced ? 'nz-btn-primary' : 'nz-btn-secondary'" @click="handlePurchase">
      {{ $t('subscriptions.plans.getplan') }}
    </button>
  </article>
</template>

<script>
/** Tarjeta de plan. Recibe planKey explícito (antes se deducía comparando el nombre traducido). */
export default {
  name: 'PriceCardComponent',
  props: {
    name: { type: String, required: true },
    subtitle: { type: String, required: true },
    price: { type: String, required: true },
    features: { type: Array, required: true },
    isAdvanced: { type: Boolean, default: false },
    planKey: { type: String, required: true }
  },
  methods: {
    handlePurchase() {
      this.$router.push({ name: 'Purchase', query: { plan: this.planKey } })
    }
  }
}
</script>
