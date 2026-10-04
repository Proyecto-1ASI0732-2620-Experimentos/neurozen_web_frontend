<template>
  <div class="nz-page max-w-4xl">
    <PageHeader :title="$t('subscriptions.purchase.title')" :subtitle="$t('subscriptions.purchase.description')" back="/subscriptions" />

    <EmptyState v-if="!planValid" icon="fas fa-circle-question" :title="$t('subscriptions.purchase.notSpecified')" :message="$t('subscriptions.purchase.choosePlan')">
      <router-link :to="{ name: 'Subscriptions' }" class="nz-btn-primary mt-2">{{ $t('subscriptions.purchase.backToPlans') }}</router-link>
    </EmptyState>

    <div v-else class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <form class="nz-card space-y-6 p-5 sm:p-6" novalidate @submit.prevent="handleSubmit">
        <fieldset class="grid gap-4 sm:grid-cols-2">
          <legend class="mb-3 text-lg font-bold">{{ $t('subscriptions.purchase.paymentInfo') }}</legend>
          <div>
            <label class="nz-label" for="p-first">{{ $t('subscriptions.purchase.form.name') }}</label>
            <input id="p-first" v-model.trim="form.firstName" autocomplete="given-name" class="nz-input" :class="{ 'nz-input-error': errors.firstName }" />
            <p v-if="errors.firstName" class="nz-field-error">{{ errors.firstName }}</p>
          </div>
          <div>
            <label class="nz-label" for="p-last">{{ $t('subscriptions.purchase.form.lastName') }}</label>
            <input id="p-last" v-model.trim="form.lastName" autocomplete="family-name" class="nz-input" :class="{ 'nz-input-error': errors.lastName }" />
            <p v-if="errors.lastName" class="nz-field-error">{{ errors.lastName }}</p>
          </div>
          <div class="sm:col-span-2">
            <label class="nz-label" for="p-email">{{ $t('subscriptions.purchase.form.email') }}</label>
            <input id="p-email" v-model.trim="form.email" type="email" autocomplete="email" class="nz-input" :class="{ 'nz-input-error': errors.email }" />
            <p v-if="errors.email" class="nz-field-error">{{ errors.email }}</p>
          </div>
        </fieldset>

        <fieldset class="grid grid-cols-2 gap-4 border-t border-[#EEE9DD] pt-6">
          <legend class="sr-only">{{ $t('subscriptions.purchase.cardInfo') }}</legend>
          <p class="col-span-2 -mt-1 text-lg font-bold" aria-hidden="true">{{ $t('subscriptions.purchase.cardInfo') }}</p>
          <div class="col-span-2">
            <label class="nz-label" for="p-card">{{ $t('subscriptions.purchase.form.card') }}</label>
            <input id="p-card" v-model="form.cardNumber" inputmode="numeric" autocomplete="cc-number" maxlength="23" class="nz-input font-mono tracking-wider"
              :class="{ 'nz-input-error': errors.cardNumber }" :placeholder="$t('subscriptions.purchase.form.cardPlaceholder')" @input="formatCardNumber" />
            <p v-if="errors.cardNumber" class="nz-field-error">{{ errors.cardNumber }}</p>
          </div>
          <div>
            <label class="nz-label" for="p-exp">{{ $t('subscriptions.purchase.form.expiry') }}</label>
            <input id="p-exp" v-model="form.expiry" inputmode="numeric" autocomplete="cc-exp" maxlength="5" class="nz-input font-mono"
              :class="{ 'nz-input-error': errors.expiry }" :placeholder="$t('subscriptions.purchase.form.expiryPlaceholder')" @input="formatExpiry" />
            <p v-if="errors.expiry" class="nz-field-error">{{ errors.expiry }}</p>
          </div>
          <div>
            <label class="nz-label" for="p-cvv">{{ $t('subscriptions.purchase.form.cvv') }}</label>
            <input id="p-cvv" v-model="form.cvv" type="password" inputmode="numeric" autocomplete="cc-csc" maxlength="4" class="nz-input font-mono"
              :class="{ 'nz-input-error': errors.cvv }" :placeholder="$t('subscriptions.purchase.form.cvvPlaceholder')" @input="form.cvv = form.cvv.replace(/\D/g, '')" />
            <p v-if="errors.cvv" class="nz-field-error">{{ errors.cvv }}</p>
          </div>
        </fieldset>

        <button type="submit" class="nz-btn-primary w-full py-3 text-base" :disabled="processing">
          <span v-if="processing" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
          {{ processing ? $t('subscriptions.purchase.processing') : $t('subscriptions.purchase.form.submit') }}
        </button>
        <p class="flex items-center justify-center gap-2 text-xs text-muted-light"><i class="fas fa-lock" aria-hidden="true"></i>{{ $t('subscriptions.purchase.securePayment') }}</p>
      </form>

      <aside class="nz-card h-fit p-5">
        <p class="text-sm text-muted-light">{{ $t('subscriptions.purchase.plan') }}</p>
        <p class="text-xl font-extrabold text-primary">{{ $t(`subscriptions.plans.${planKey}.name`) }}</p>
        <p class="mt-4 text-3xl font-extrabold">{{ $t(`subscriptions.plans.${planKey}.price`) }}</p>
        <p class="text-sm text-muted-light">{{ $t('subscriptions.purchase.perMonth') }}</p>
        <router-link :to="{ name: 'Subscriptions' }" class="mt-4 inline-block text-sm font-semibold text-primary hover:underline">{{ $t('subscriptions.purchase.changePlan') }}</router-link>
      </aside>
    </div>
  </div>
</template>

<script>
/**
 * PurchaseComponent - Compra de suscripción.
 * Cambios: validación (Luhn, vencimiento, CVV, email), errores inline y por toast
 * en lugar de alert(), el precio ya no se toma de la URL (manipulable), y los
 * datos de tarjeta no se escriben en consola ni se conservan tras el envío.
 * Dependencia del backend: el contrato exige número completo y CVV.
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import { SubscriptionService, PLAN_IDS } from '../../services/SubscriptionService.js'
import { session, getUserId } from '../../services/session.js'
import { toast } from '../../composables/useToast.js'
import { isEmail, isCardNumber, isFutureExpiry, isCvv } from '../../utils/validation.js'

export default {
  name: 'PurchaseComponent',
  components: { PageHeader, EmptyState },
  data() {
    const user = session.user || {}
    return {
      service: new SubscriptionService(),
      processing: false,
      errors: {},
      form: { firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '', cardNumber: '', expiry: '', cvv: '' }
    }
  },
  computed: {
    planKey() {
      const raw = String(this.$route.query.plan || '').toLowerCase()
      return { básico: 'basic', avanzado: 'advanced', profesional: 'professional' }[raw] || raw
    },
    planValid() {
      return !!PLAN_IDS[this.planKey]
    }
  },
  methods: {
    formatCardNumber() {
      const digits = this.form.cardNumber.replace(/\D/g, '').slice(0, 19)
      this.form.cardNumber = digits.replace(/(.{4})/g, '$1 ').trim()
    },
    formatExpiry() {
      let v = this.form.expiry.replace(/\D/g, '').slice(0, 4)
      if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`
      this.form.expiry = v
    },
    validate() {
      const e = {}
      const f = this.form
      if (!f.firstName) e.firstName = this.$t('validation.required')
      if (!f.lastName) e.lastName = this.$t('validation.required')
      if (!isEmail(f.email)) e.email = this.$t('validation.email')
      if (!isCardNumber(f.cardNumber)) e.cardNumber = this.$t('validation.card')
      if (!isFutureExpiry(f.expiry)) e.expiry = this.$t('validation.expiry')
      if (!isCvv(f.cvv)) e.cvv = this.$t('validation.cvv')
      this.errors = e
      return !Object.keys(e).length
    },
    async handleSubmit() {
      if (this.processing || !this.validate()) return
      this.processing = true
      try {
        await this.service.subscribe({ userId: getUserId(), planKey: this.planKey, ...this.form })
        this.form.cardNumber = ''
        this.form.cvv = ''
        this.form.expiry = ''
        toast.success(this.$t('subscriptions.purchase.success'))
        this.$router.push({ name: 'UserProfile' })
      } catch (error) {
        this.form.cvv = ''
        const text = String(error.message || '')
        if (/suscripci[oó]n activa|active subscription/i.test(text)) toast.error(this.$t('subscriptions.purchase.alreadyActive'))
        else if (error.status === 400) toast.error(this.$t('subscriptions.purchase.invalidData'))
        else if (error.status !== 401) toast.error(text || this.$t('errors.unknown'))
      } finally {
        this.processing = false
      }
    }
  }
}
</script>
