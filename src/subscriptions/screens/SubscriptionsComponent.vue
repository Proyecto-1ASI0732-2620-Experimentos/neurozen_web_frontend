<template>
  <div class="nz-page max-w-6xl">
    <PageHeader :title="$t('subscriptions.plans.title')" :subtitle="$t('subscriptions.plans.subtitle')" />
    <div class="grid gap-6 pt-3 md:grid-cols-3">
      <PriceCardComponent
        v-for="plan in plans" :key="plan.key" :plan-key="plan.key"
        :name="$t(`subscriptions.plans.${plan.key}.name`)" :price="$t(`subscriptions.plans.${plan.key}.price`)"
        :subtitle="$t(`subscriptions.plans.${plan.key}.subtitle`)" :features="plan.features.map((n) => $t(`subscriptions.plans.feature.${n}`))"
        :is-advanced="plan.key === 'advanced'"
      />
    </div>
  </div>
</template>

<script>
/** SubscriptionsComponent - Comparativa de planes. */
import PageHeader from '../../components/ui/PageHeader.vue'
import PriceCardComponent from '../components/PriceCardComponent.vue'

export default {
  name: 'SubscriptionsComponent',
  components: { PageHeader, PriceCardComponent },
  data() {
    return {
      plans: [
        { key: 'basic', features: [1, 2, 3, 4, 5, 6] },
        { key: 'advanced', features: [7, 8, 9, 10, 11, 12, 13, 14] },
        { key: 'professional', features: [15, 16, 17, 18, 19, 20, 21] }
      ]
    }
  }
}
</script>
