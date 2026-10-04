<template>
  <div class="nz-page">
    <PageHeader :title="$t('settings.title')" :subtitle="$t('settings.subtitle')" />

    <div class="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <nav class="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0" role="tablist" :aria-label="$t('settings.title')">
        <button v-for="tab in tabs" :id="`tab-${tab.id}`" :key="tab.id" type="button" role="tab" :aria-selected="activeTab === tab.id" :aria-controls="`panel-${tab.id}`"
          class="flex shrink-0 items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition-colors"
          :class="activeTab === tab.id ? 'bg-primary text-white' : 'text-foreground-light hover:bg-primary/10'" @click="activeTab = tab.id">
          <i :class="[tab.icon, 'w-4 text-center']" aria-hidden="true"></i>{{ $t(`settings.tabs.${tab.id}`) }}
        </button>
      </nav>

      <!-- General -->
      <section v-if="activeTab === 'general'" id="panel-general" role="tabpanel" aria-labelledby="tab-general" class="space-y-6">
        <div class="nz-card space-y-4 p-5 sm:p-6">
          <h2 class="text-lg font-bold">{{ $t('settings.language') }}</h2>
          <div class="flex flex-wrap gap-2">
            <button v-for="lang in [{ code: 'es', label: 'Español' }, { code: 'en', label: 'English' }]" :key="lang.code" type="button"
              class="rounded-lg border px-4 py-2 text-sm font-semibold" :class="$i18n.locale === lang.code ? 'border-primary bg-primary text-white' : 'border-[#D6D2C7] bg-white hover:border-primary'"
              :aria-pressed="$i18n.locale === lang.code" @click="changeLanguage(lang.code)">{{ lang.label }}</button>
          </div>
        </div>
        <div class="nz-card space-y-5 p-5 sm:p-6">
          <h2 class="text-lg font-bold">{{ $t('settings.display') }}</h2>
          <div>
            <div class="flex items-baseline justify-between">
              <label class="nz-label" for="font-size">{{ $t('settings.fontSize') }}</label>
              <span class="text-sm font-bold text-primary">{{ settings.general.fontSize }}px</span>
            </div>
            <input id="font-size" v-model.number="settings.general.fontSize" type="range" min="14" max="20" step="1" class="w-full accent-[#2D5A4A]" @change="save" />
          </div>
          <SettingToggle v-model="settings.general.reduceAnimations" :label="$t('settings.reduceAnimations')" :hint="$t('settings.reduceAnimationsHint')" @update:model-value="save" />
          <SettingToggle v-model="settings.general.highContrast" :label="$t('settings.highContrast')" :hint="$t('settings.highContrastHint')" @update:model-value="save" />
        </div>
      </section>

      <!-- Notificaciones -->
      <section v-else-if="activeTab === 'notifications'" id="panel-notifications" role="tabpanel" aria-labelledby="tab-notifications" class="nz-card space-y-5 p-5 sm:p-6">
        <h2 class="text-lg font-bold">{{ $t('settings.tabs.notifications') }}</h2>
        <p class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{{ $t('settings.notificationsNote') }}</p>
        <SettingToggle v-model="settings.notifications.sessionReminders" :label="$t('settings.sessionReminders')" @update:model-value="save" />
        <label v-if="settings.notifications.sessionReminders" class="block text-sm">{{ $t('settings.reminderTime') }}
          <select v-model.number="settings.notifications.sessionReminderTime" class="nz-input mt-1 sm:max-w-xs" @change="save">
            <option v-for="m in [5, 15, 30, 60]" :key="m" :value="m">{{ $t('settings.minutesBefore', { m }) }}</option>
          </select>
        </label>
        <SettingToggle v-model="settings.notifications.breathingReminders" :label="$t('settings.breathingReminders')" @update:model-value="save" />
        <SettingToggle v-model="settings.notifications.activeBreakReminders" :label="$t('settings.activeBreakReminders')" @update:model-value="save" />
        <SettingToggle v-model="settings.notifications.weeklyReport" :label="$t('settings.weeklyReport')" @update:model-value="save" />
      </section>

      <!-- Privacidad -->
      <section v-else-if="activeTab === 'privacy'" id="panel-privacy" role="tabpanel" aria-labelledby="tab-privacy" class="space-y-6">
        <div class="nz-card space-y-5 p-5 sm:p-6">
          <h2 class="text-lg font-bold">{{ $t('settings.tabs.privacy') }}</h2>
          <SettingToggle v-model="settings.privacy.shareAnalytics" :label="$t('settings.shareAnalytics')" @update:model-value="save" />
          <SettingToggle v-model="settings.privacy.personalization" :label="$t('settings.personalization')" @update:model-value="save" />
        </div>
        <div class="nz-card space-y-3 p-5 sm:p-6">
          <h2 class="text-lg font-bold">{{ $t('settings.localData') }}</h2>
          <p class="text-sm text-muted-light">{{ $t('settings.localDataHint') }}</p>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="nz-btn-secondary" @click="exportSettings"><i class="fas fa-download" aria-hidden="true"></i>{{ $t('settings.exportSettings') }}</button>
            <button type="button" class="nz-btn-secondary" @click="clearCache"><i class="fas fa-broom" aria-hidden="true"></i>{{ $t('settings.clearCache') }}</button>
            <button type="button" class="nz-btn-danger" @click="showDeleteDialog = true"><i class="fas fa-trash-can" aria-hidden="true"></i>{{ $t('settings.deleteLocalData') }}</button>
          </div>
        </div>
      </section>

      <!-- Acerca de -->
      <section v-else id="panel-about" role="tabpanel" aria-labelledby="tab-about" class="space-y-6">
        <div class="nz-card flex items-center gap-4 p-5 sm:p-6">
          <img src="/neurozen1_logo.png" alt="" class="h-14 w-14 rounded-xl object-contain" />
          <div>
            <h2 class="text-lg font-bold">NeuroZen</h2>
            <p class="text-sm text-muted-light">{{ $t('settings.version') }} {{ version }} · {{ apiModeLabel }}</p>
          </div>
        </div>
        <div class="nz-card space-y-4 p-5 sm:p-6">
          <h2 class="text-lg font-bold">{{ $t('settings.diagnostic') }}</h2>
          <button type="button" class="nz-btn-secondary" :disabled="diagnosing" @click="runDiagnostic">
            <span v-if="diagnosing" class="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" aria-hidden="true"></span>
            <i v-else class="fas fa-stethoscope" aria-hidden="true"></i>{{ $t('settings.runDiagnostic') }}
          </button>
          <ul v-if="diagnostics.length" class="space-y-2 text-sm" aria-live="polite">
            <li v-for="d in diagnostics" :key="d.key" class="flex items-center gap-2">
              <i :class="d.ok ? 'fas fa-circle-check text-green-700' : 'fas fa-circle-xmark text-red-700'" aria-hidden="true"></i>
              {{ $t(`settings.checks.${d.key}`) }}: <strong>{{ d.ok ? $t('settings.ok') : $t('settings.failed') }}</strong>
            </li>
          </ul>
          <a class="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" :href="`mailto:${$t('footer.contact.email')}`">
            <i class="fas fa-envelope" aria-hidden="true"></i>{{ $t('settings.contactSupport') }}
          </a>
        </div>
      </section>
    </div>

    <ConfirmDialog :open="showDeleteDialog" danger :title="$t('settings.deleteLocalData')" :message="$t('settings.deleteLocalDataConfirm')"
      :confirm-text="$t('common.delete')" @cancel="showDeleteDialog = false" @confirm="deleteLocalData" />
  </div>
</template>

<script>
/**
 * SettingsComponent - Preferencias de la aplicación.
 * Ahora las opciones se APLICAN (idioma, tamaño de fuente, animaciones, contraste).
 * Se retiraron opciones sin efecto ni soporte del backend (temas que cambiaban la
 * identidad, 2FA, tiempo de sesión) y el diagnóstico es real.
 * "Limpiar caché" ya no cierra la sesión (antes ejecutaba localStorage.clear()).
 */
import { defineComponent, h } from 'vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue'
import { loadSettings, saveSettings } from '../../services/preferences.js'
import { setLocale } from '../../i18n/index.js'
import { clearSession, getUserId } from '../../services/session.js'
import { HttpClient } from '../../services/HttpClient.js'
import { toast } from '../../composables/useToast.js'

const SettingToggle = defineComponent({
  name: 'SettingToggle',
  props: { modelValue: Boolean, label: String, hint: String },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', { class: 'flex items-center justify-between gap-4' }, [
      h('div', [h('p', { class: 'text-sm font-semibold' }, props.label), props.hint ? h('p', { class: 'nz-hint' }, props.hint) : null]),
      h('button', {
        type: 'button', role: 'switch', 'aria-checked': props.modelValue, 'aria-label': props.label,
        class: ['relative h-7 w-12 shrink-0 rounded-full transition-colors', props.modelValue ? 'bg-primary' : 'bg-gray-300'],
        onClick: () => emit('update:modelValue', !props.modelValue)
      }, [h('span', { class: ['absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', props.modelValue ? 'left-6' : 'left-1'] })])
    ])
  }
})

const defaults = () => ({
  general: { fontSize: 16, reduceAnimations: false, highContrast: false },
  notifications: { sessionReminders: true, sessionReminderTime: 15, breathingReminders: true, activeBreakReminders: true, weeklyReport: true },
  privacy: { shareAnalytics: true, personalization: true }
})

export default {
  name: 'SettingsComponent',
  components: { PageHeader, ConfirmDialog, SettingToggle },
  data() {
    const saved = loadSettings() || {}
    const base = defaults()
    return {
      activeTab: 'general',
      settings: {
        general: { ...base.general, ...(saved.general || {}) },
        notifications: { ...base.notifications, ...(saved.notifications || {}) },
        privacy: { ...base.privacy, ...(saved.privacy || {}) }
      },
      tabs: [
        { id: 'general', icon: 'fas fa-sliders' },
        { id: 'notifications', icon: 'fas fa-bell' },
        { id: 'privacy', icon: 'fas fa-shield-halved' },
        { id: 'about', icon: 'fas fa-circle-info' }
      ],
      version: __APP_VERSION__,
      diagnostics: [],
      diagnosing: false,
      showDeleteDialog: false,
      saveTimer: null
    }
  },
  computed: {
    apiModeLabel() {
      return import.meta.env.VITE_API_MODE === 'static' ? this.$t('settings.demoMode') : this.$t('settings.apiMode')
    }
  },
  methods: {
    save() {
      saveSettings(this.settings)
      clearTimeout(this.saveTimer)
      this.saveTimer = setTimeout(() => toast.success(this.$t('settings.configurationSaved'), { duration: 1800 }), 300)
    },
    changeLanguage(code) {
      setLocale(code)
      this.save()
    },
    exportSettings() {
      const url = URL.createObjectURL(new Blob([JSON.stringify(this.settings, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'neurozen_settings.json'
      link.click()
      URL.revokeObjectURL(url)
    },
    clearCache() {
      // Solo datos que pueden regenerarse; la sesión y los ajustes se conservan
      Object.keys(localStorage).filter((k) => k.startsWith('neurozen_recent_resources')).forEach((k) => localStorage.removeItem(k))
      toast.success(this.$t('settings.cacheCleared'))
    },
    deleteLocalData() {
      const id = getUserId()
      Object.keys(localStorage)
        .filter((k) => k.startsWith('neurozen_') && (id == null || k.endsWith(`:${id}`) || k === 'neurozen_settings'))
        .forEach((k) => localStorage.removeItem(k))
      this.showDeleteDialog = false
      clearSession()
      toast.info(this.$t('settings.localDataDeleted'))
      this.$router.push({ name: 'Login' })
    },
    async runDiagnostic() {
      this.diagnosing = true
      const results = [{ key: 'internet', ok: navigator.onLine }]
      try {
        localStorage.setItem('neurozen_diag', '1')
        localStorage.removeItem('neurozen_diag')
        results.push({ key: 'storage', ok: true })
      } catch {
        results.push({ key: 'storage', ok: false })
      }
      try {
        await new HttpClient().get('/api/v1/professionals')
        results.push({ key: 'api', ok: true })
      } catch (error) {
        results.push({ key: 'api', ok: error.status > 0 && error.status !== 404 && error.status < 500 })
      }
      this.diagnostics = results
      this.diagnosing = false
    }
  }
}
</script>
