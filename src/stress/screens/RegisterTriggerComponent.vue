<template>
  <div class="nz-page">
    <PageHeader :title="$t('stress.triggers.title')" :subtitle="$t('stress.triggers.subtitle')" />

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <!-- Formulario (Create) -->
      <form class="nz-card space-y-5 p-5 sm:p-6" novalidate @submit.prevent="submitTrigger">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="nz-label" for="trigger-date">{{ $t('stress.triggers.date') }}</label>
            <input id="trigger-date" v-model="formData.date" type="date" class="nz-input" :class="{ 'nz-input-error': errors.date }" :max="maxDate" :aria-invalid="!!errors.date" />
            <p v-if="errors.date" class="nz-field-error">{{ errors.date }}</p>
          </div>
          <div>
            <label class="nz-label" for="trigger-time">{{ $t('stress.triggers.time') }}</label>
            <input id="trigger-time" v-model="formData.time" type="time" class="nz-input" :class="{ 'nz-input-error': errors.time }" :aria-invalid="!!errors.time" />
            <p v-if="errors.time" class="nz-field-error">{{ errors.time }}</p>
          </div>
        </div>

        <div>
          <label class="nz-label" for="trigger-category">{{ $t('stress.triggers.category') }}</label>
          <select id="trigger-category" v-model="formData.category" class="nz-input" :class="{ 'nz-input-error': errors.category }" :aria-invalid="!!errors.category">
            <option value="">{{ $t('stress.triggers.selectCategory') }}</option>
            <option v-for="category in categories" :key="category" :value="category">{{ $t(`stress.triggers.categories.${category}`) }}</option>
          </select>
          <p v-if="errors.category" class="nz-field-error">{{ errors.category }}</p>
        </div>

        <div>
          <div class="flex items-baseline justify-between">
            <label class="nz-label" for="trigger-level">{{ $t('stress.triggers.stressLevelLabel') }}</label>
            <span class="text-2xl font-extrabold" :class="levelColor(formData.stressLevel)">{{ formData.stressLevel }}</span>
          </div>
          <input id="trigger-level" v-model.number="formData.stressLevel" type="range" min="1" max="10" class="w-full accent-[#2D5A4A]" :aria-valuetext="`${formData.stressLevel} / 10`" />
          <div class="flex justify-between text-xs text-muted-light"><span>1 · {{ $t('dashboard.stressLevels.veryLow') }}</span><span>10 · {{ $t('dashboard.stressLevels.veryHigh') }}</span></div>
        </div>

        <div>
          <label class="nz-label" for="trigger-description">{{ $t('stress.triggers.situationLabel') }}</label>
          <textarea id="trigger-description" v-model="formData.description" rows="4" maxlength="500" class="nz-input resize-y" :class="{ 'nz-input-error': errors.description }"
            :placeholder="$t('stress.triggers.situationPlaceholder')" :aria-invalid="!!errors.description"></textarea>
          <div class="flex justify-between">
            <p v-if="errors.description" class="nz-field-error">{{ errors.description }}</p><span v-else></span>
            <span class="nz-hint">{{ formData.description.length }}/500</span>
          </div>
        </div>

        <button type="submit" class="nz-btn-primary w-full py-3" :disabled="isSubmitting">
          <span v-if="isSubmitting" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
          {{ isSubmitting ? $t('common.saving') : $t('stress.triggers.save') }}
        </button>
      </form>

      <!-- Historial (Read / Delete) -->
      <section class="nz-card flex flex-col p-5 sm:p-6" aria-labelledby="history-title">
        <h2 id="history-title" class="text-lg font-bold text-foreground-light">{{ $t('stress.triggers.historyTitle') }}</h2>
        <p class="mb-4 text-sm text-muted-light">{{ $t('stress.triggers.historySubtitle') }}</p>
        <LoadingState v-if="loadingHistory" />
        <ErrorState v-else-if="historyError" :message="historyError" @retry="loadHistory" />
        <EmptyState v-else-if="!history.length" icon="fas fa-feather" :title="$t('stress.triggers.emptyTitle')" :message="$t('stress.triggers.emptyMessage')" />
        <ul v-else class="-mx-2 max-h-[34rem] divide-y divide-[#EEE9DD] overflow-auto">
          <li v-for="item in history" :key="item.id" class="flex gap-3 px-2 py-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold" :class="levelBadge(item.stressLevel)">{{ item.stressLevel }}</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-bold text-foreground-light">{{ categoryLabel(item.category) }}</p>
              <p class="line-clamp-2 text-sm text-muted-light">{{ item.description }}</p>
              <p class="mt-1 text-xs text-muted-light">{{ formatWhen(item.triggeredAt) }}</p>
            </div>
            <button type="button" class="h-9 w-9 shrink-0 rounded-lg text-muted-light hover:bg-red-50 hover:text-red-700" :aria-label="$t('common.delete')" @click="askDelete(item)">
              <i class="fas fa-trash-can" aria-hidden="true"></i>
            </button>
          </li>
        </ul>
      </section>
    </div>

    <ConfirmDialog :open="!!toDelete" danger :busy="deleting" :title="$t('stress.triggers.deleteTitle')" :message="$t('stress.triggers.deleteMessage')"
      :confirm-text="$t('common.delete')" @cancel="toDelete = null" @confirm="confirmDelete" />
  </div>
</template>

<script>
/**
 * RegisterTriggerComponent - Registro e historial de desencadenantes de estrés.
 * Corrige fechas en UTC, el desfase horario al enviar, el usuario por defecto '1'
 * y añade la vista de historial/eliminación que el servicio ya soportaba.
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue'
import { StressTriggerService } from '../../services/StressTriggerService.js'
import { getUserId } from '../../services/session.js'
import { toast } from '../../composables/useToast.js'
import { toLocalISODate, toLocalTime, toApiDateTime } from '../../utils/date.js'

const emptyForm = () => ({ date: toLocalISODate(), time: toLocalTime(), category: '', description: '', stressLevel: 5 })

export default {
  name: 'RegisterTriggerComponent',
  components: { PageHeader, LoadingState, ErrorState, EmptyState, ConfirmDialog },
  data() {
    return {
      service: new StressTriggerService(),
      categories: [],
      formData: emptyForm(),
      errors: {},
      isSubmitting: false,
      maxDate: toLocalISODate(),
      history: [],
      loadingHistory: true,
      historyError: '',
      toDelete: null,
      deleting: false
    }
  },
  created() {
    this.categories = this.service.getStressTriggerCategories()
    this.loadHistory()
  },
  methods: {
    validate() {
      const e = {}
      const f = this.formData
      if (!f.date) e.date = this.$t('validation.required')
      else if (f.date > toLocalISODate()) e.date = this.$t('validation.futureDate')
      if (!f.time) e.time = this.$t('validation.required')
      else if (f.date === toLocalISODate() && new Date(toApiDateTime(f.date, f.time)) > new Date()) e.time = this.$t('validation.futureTime')
      if (!f.category) e.category = this.$t('validation.required')
      if (f.description.trim().length < 5) e.description = this.$t('validation.minChars', { n: 5 })
      this.errors = e
      return !Object.keys(e).length
    },
    async loadHistory() {
      this.loadingHistory = true
      this.historyError = ''
      try {
        this.history = await this.service.getStressTriggers(getUserId())
      } catch (error) {
        this.historyError = error.message
      } finally {
        this.loadingHistory = false
      }
    },
    async submitTrigger() {
      if (!this.validate() || this.isSubmitting) return
      this.isSubmitting = true
      try {
        const created = await this.service.addStressTrigger({ ...this.formData, userId: getUserId() })
        this.history.unshift(created)
        this.formData = emptyForm()
        this.errors = {}
        toast.success(this.$t('stress.triggers.successMessage'))
      } catch (error) {
        toast.error(`${this.$t('stress.triggers.errorMessage')}: ${error.message}`)
      } finally {
        this.isSubmitting = false
      }
    },
    askDelete(item) {
      this.toDelete = item
    },
    async confirmDelete() {
      this.deleting = true
      try {
        await this.service.deleteStressTrigger(this.toDelete.id)
        this.history = this.history.filter((t) => t.id !== this.toDelete.id)
        toast.success(this.$t('stress.triggers.deleted'))
        this.toDelete = null
      } catch (error) {
        toast.error(error.message)
      } finally {
        this.deleting = false
      }
    },
    categoryLabel(category) {
      const key = `stress.triggers.categories.${category}`
      const text = this.$t(key)
      return text === key ? category : text
    },
    formatWhen(date) {
      if (!date) return ''
      return date.toLocaleString(this.$i18n.locale === 'en' ? 'en-US' : 'es-ES', { dateStyle: 'medium', timeStyle: 'short' })
    },
    levelColor(level) {
      return level <= 3 ? 'text-green-700' : level <= 7 ? 'text-amber-700' : 'text-red-700'
    },
    levelBadge(level) {
      return level <= 3 ? 'bg-green-50 text-green-800' : level <= 7 ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'
    }
  }
}
</script>
