<template>
  <div class="nz-page">
    <PageHeader :title="$t('userProfile.title')">
      <template #actions>
        <button v-if="!editMode" type="button" class="nz-btn-primary" @click="startEdit"><i class="fas fa-pen" aria-hidden="true"></i>{{ $t('common.edit') }}</button>
        <template v-else>
          <button type="button" class="nz-btn-secondary" :disabled="saving" @click="cancelEdit">{{ $t('common.cancel') }}</button>
          <button type="button" class="nz-btn-primary" :disabled="saving" @click="saveChanges">
            <span v-if="saving" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
            {{ saving ? $t('userProfile.actions.saving') : $t('userProfile.actions.saveChanges') }}
          </button>
        </template>
      </template>
    </PageHeader>

    <div class="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <!-- Columna lateral -->
      <aside class="space-y-6">
        <section class="nz-card p-6 text-center">
          <div class="relative mx-auto h-28 w-28">
            <UserAvatar :src="avatarSrc" :name="form.fullName || displayName" size="lg" class="ring-4 ring-primary/10" />
            <button v-if="editMode" type="button" class="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow" :aria-label="$t('userProfile.changeAvatar')" @click="cycleAvatar">
              <i class="fas fa-camera" aria-hidden="true"></i>
            </button>
          </div>
          <h2 class="mt-4 text-xl font-extrabold">{{ displayName }}</h2>
          <p class="text-sm text-muted-light">{{ user.email }}</p>
          <p v-if="user.memberSince" class="mt-1 text-xs text-muted-light">{{ $t('userProfile.memberSince') }} {{ formatDate(user.memberSince) }}</p>
          <dl class="mt-6 grid grid-cols-3 gap-2 border-t border-[#EEE9DD] pt-4">
            <div v-for="stat in stats" :key="stat.key"><dt class="text-[11px] leading-tight text-muted-light">{{ $t(stat.label) }}</dt><dd class="text-xl font-extrabold text-primary">{{ stat.value }}</dd></div>
          </dl>
        </section>

        <section class="nz-card p-5" aria-labelledby="sub-title">
          <h2 id="sub-title" class="mb-3 font-bold">{{ $t('userProfile.subscription.title') }}</h2>
          <p v-if="loadingSubscription" class="text-sm text-muted-light">{{ $t('common.loading') }}</p>
          <p v-else-if="subscriptionError" class="text-sm text-red-700">{{ subscriptionError }} <button type="button" class="font-semibold underline" @click="loadSubscription">{{ $t('common.retry') }}</button></p>
          <div v-else-if="subscription && subscription.isActive" class="space-y-1 text-sm">
            <p class="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-800"><i class="fas fa-circle-check" aria-hidden="true"></i>{{ $t('userProfile.subscription.active') }}</p>
            <p class="pt-2 text-lg font-extrabold text-primary">{{ planName(subscription.planKey) }}</p>
            <p v-if="subscription.cardLast4" class="text-muted-light"><i class="far fa-credit-card mr-1" aria-hidden="true"></i>•••• {{ subscription.cardLast4 }}</p>
          </div>
          <div v-else class="text-sm">
            <p class="text-muted-light">{{ subscription ? $t('userProfile.subscription.pending', { plan: planName(subscription.planKey) }) : $t('userProfile.subscription.none') }}</p>
            <router-link :to="{ name: 'Subscriptions' }" class="nz-btn-secondary mt-3 w-full">{{ $t('userProfile.subscription.viewPlans') }}</router-link>
          </div>
        </section>

        <section class="nz-card space-y-2 p-5">
          <h2 class="mb-2 font-bold">{{ $t('userProfile.accountActions.title') }}</h2>
          <button type="button" class="nz-btn-secondary w-full justify-start" @click="downloadData"><i class="fas fa-download" aria-hidden="true"></i>{{ $t('userProfile.accountActions.downloadData') }}</button>
          <button type="button" class="nz-btn-secondary w-full justify-start" disabled :title="$t('userProfile.backendPending')"><i class="fas fa-key" aria-hidden="true"></i>{{ $t('userProfile.accountActions.changePassword') }}</button>
          <button type="button" class="nz-btn-secondary w-full justify-start text-red-700" disabled :title="$t('userProfile.backendPending')"><i class="fas fa-user-xmark" aria-hidden="true"></i>{{ $t('userProfile.accountActions.deleteAccount') }}</button>
          <p class="nz-hint">{{ $t('userProfile.backendPending') }}</p>
        </section>
      </aside>

      <!-- Formularios -->
      <form class="space-y-6" novalidate @submit.prevent="saveChanges">
        <section class="nz-card p-5 sm:p-6">
          <h2 class="mb-4 text-lg font-bold">{{ $t('userProfile.personalInfo.title') }}</h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="nz-label" for="pf-name">{{ $t('auth.register.name') }}</label>
              <input id="pf-name" v-model.trim="form.fullName" class="nz-input" :class="{ 'nz-input-error': errors.fullName }" :readonly="!editMode" />
              <p v-if="errors.fullName" class="nz-field-error">{{ errors.fullName }}</p>
            </div>
            <div>
              <label class="nz-label" for="pf-username">{{ $t('userProfile.personalInfo.username') }}</label>
              <input id="pf-username" v-model.trim="form.username" class="nz-input" :class="{ 'nz-input-error': errors.username }" :readonly="!editMode" />
              <p v-if="errors.username" class="nz-field-error">{{ errors.username }}</p>
            </div>
            <div>
              <label class="nz-label" for="pf-email">{{ $t('userProfile.personalInfo.email') }}</label>
              <input id="pf-email" v-model.trim="form.email" type="email" class="nz-input" :class="{ 'nz-input-error': errors.email }" :readonly="!editMode" />
              <p v-if="errors.email" class="nz-field-error">{{ errors.email }}</p>
            </div>
            <div>
              <label class="nz-label" for="pf-phone">{{ $t('userProfile.personalInfo.phone') }}</label>
              <input id="pf-phone" v-model.trim="form.phone" type="tel" class="nz-input" :class="{ 'nz-input-error': errors.phone }" :readonly="!editMode" />
              <p v-if="errors.phone" class="nz-field-error">{{ errors.phone }}</p>
            </div>
            <div>
              <label class="nz-label" for="pf-birth">{{ $t('userProfile.personalInfo.birthDate') }}</label>
              <input id="pf-birth" v-model="form.birthDate" type="date" class="nz-input" :max="today" :readonly="!editMode" />
            </div>
            <div class="sm:col-span-2">
              <label class="nz-label" for="pf-address">{{ $t('userProfile.personalInfo.address') }}</label>
              <input id="pf-address" v-model.trim="form.address" class="nz-input" :readonly="!editMode" />
            </div>
            <div>
              <label class="nz-label" for="pf-gender">{{ $t('userProfile.personalInfo.gender') }}</label>
              <select id="pf-gender" v-model="extra.gender" class="nz-input" :disabled="!editMode">
                <option value="">{{ $t('userProfile.personalInfo.genderOptions.select') }}</option>
                <option v-for="g in ['male', 'female', 'other', 'preferNotToSay']" :key="g" :value="g">{{ $t(`userProfile.personalInfo.genderOptions.${g}`) }}</option>
              </select>
            </div>
          </div>
        </section>

        <section class="nz-card p-5 sm:p-6">
          <div class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="text-lg font-bold">{{ $t('userProfile.healthInfo.title') }}</h2>
            <span class="text-xs text-muted-light"><i class="fas fa-lock mr-1" aria-hidden="true"></i>{{ $t('userProfile.localOnly') }}</span>
          </div>
          <div class="grid gap-4">
            <div>
              <label class="nz-label" for="pf-conditions">{{ $t('userProfile.healthInfo.medicalConditions') }}</label>
              <textarea id="pf-conditions" v-model="extra.medicalConditions" rows="2" maxlength="500" class="nz-input" :readonly="!editMode" :placeholder="$t('userProfile.healthInfo.medicalConditionsPlaceholder')"></textarea>
            </div>
            <div>
              <label class="nz-label" for="pf-meds">{{ $t('userProfile.healthInfo.medications') }}</label>
              <textarea id="pf-meds" v-model="extra.medications" rows="2" maxlength="500" class="nz-input" :readonly="!editMode" :placeholder="$t('userProfile.healthInfo.medicationsPlaceholder')"></textarea>
            </div>
            <div>
              <div class="flex items-baseline justify-between">
                <label class="nz-label" for="pf-stress">{{ $t('userProfile.healthInfo.stressLevel') }}</label>
                <span class="text-xl font-extrabold text-primary">{{ extra.currentStressLevel }}</span>
              </div>
              <input id="pf-stress" v-model.number="extra.currentStressLevel" type="range" min="1" max="10" class="w-full accent-[#2D5A4A]" :disabled="!editMode" />
            </div>
          </div>
        </section>

        <section class="nz-card p-5 sm:p-6">
          <h2 class="mb-4 text-lg font-bold">{{ $t('userProfile.preferences.title') }}</h2>
          <div class="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <label v-for="pref in toggles" :key="pref" class="flex items-center justify-between gap-3 rounded-lg border border-[#EEE9DD] px-3 py-2.5 text-sm">
              {{ $t(prefLabel(pref)) }}
              <input v-model="extra.preferences[pref]" type="checkbox" class="h-5 w-5 rounded text-primary focus:ring-primary" :disabled="!editMode" />
            </label>
            <label class="text-sm">{{ $t('userProfile.preferences.sessions.preferredDuration') }}
              <select v-model.number="extra.preferences.sessionDuration" class="nz-input mt-1" :disabled="!editMode">
                <option v-for="d in [30, 45, 60, 90]" :key="d" :value="d">{{ $t(`userProfile.preferences.sessions.durations.${d}`) }}</option>
              </select>
            </label>
            <label class="text-sm">{{ $t('userProfile.preferences.sessions.preferredMode') }}
              <select v-model="extra.preferences.sessionMode" class="nz-input mt-1" :disabled="!editMode">
                <option v-for="m in ['video', 'audio', 'chat']" :key="m" :value="m">{{ $t(`userProfile.preferences.sessions.modes.${m}`) }}</option>
              </select>
            </label>
          </div>
        </section>

        <section class="nz-card p-5 sm:p-6">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-bold">{{ $t('userProfile.emergencyContacts.title') }}</h2>
            <button v-if="editMode" type="button" class="nz-btn-ghost" @click="addContact"><i class="fas fa-plus" aria-hidden="true"></i>{{ $t('userProfile.emergencyContacts.addContact') }}</button>
          </div>
          <p v-if="!extra.emergencyContacts.length" class="text-sm text-muted-light">{{ $t('userProfile.emergencyContacts.empty') }}</p>
          <div v-for="(contact, index) in extra.emergencyContacts" :key="index" class="mb-3 grid gap-3 rounded-lg border border-[#EEE9DD] p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <input v-model.trim="contact.name" class="nz-input" :placeholder="$t('userProfile.emergencyContacts.name')" :aria-label="$t('userProfile.emergencyContacts.name')" :readonly="!editMode" />
            <input v-model.trim="contact.relationship" class="nz-input" :placeholder="$t('userProfile.emergencyContacts.relationship')" :aria-label="$t('userProfile.emergencyContacts.relationship')" :readonly="!editMode" />
            <input v-model.trim="contact.phone" type="tel" class="nz-input" :class="{ 'nz-input-error': errors[`contact${index}`] }" :placeholder="$t('userProfile.emergencyContacts.phone')" :aria-label="$t('userProfile.emergencyContacts.phone')" :readonly="!editMode" />
            <button v-if="editMode" type="button" class="h-10 w-10 rounded-lg text-red-700 hover:bg-red-50" :aria-label="$t('userProfile.emergencyContacts.removeContact')" @click="extra.emergencyContacts.splice(index, 1)">
              <i class="fas fa-trash-can" aria-hidden="true"></i>
            </button>
          </div>
        </section>
      </form>
    </div>
  </div>
</template>

<script>
/**
 * UserProfileComponent - Perfil del usuario.
 *
 * Cambios principales:
 *  - Sin datos ficticios (antes mostraba "Juan Pérez", "Sertralina 50mg" y el
 *    contacto "María Pérez" a usuarios reales).
 *  - PUT /api/v1/users/{id} mediante UserService/HttpClient (antes fetch directo).
 *  - Datos de salud, preferencias y contactos: el backend no tiene esos campos,
 *    se guardan solo en este navegador (aislados por usuario) y se indica en la UI.
 *  - La suscripción se muestra sin CVV ni número completo.
 *  - Toasts en lugar de alert(); sin console.log con datos personales.
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import { session, getUserId, getDisplayName, updateUser, readUserData, writeUserData } from '../../services/session.js'
import { UserService } from '../../services/UserService.js'
import { SubscriptionService } from '../../services/SubscriptionService.js'
import { BreathingService } from '../../services/BreathingService.js'
import { toast } from '../../composables/useToast.js'
import { isEmail, isPhone, minLength } from '../../utils/validation.js'
import { formatLongDate, toLocalISODate } from '../../utils/date.js'

const EXTRA_KEY = 'neurozen_profile_extra'
const defaultExtra = () => ({
  gender: '', medicalConditions: '', medications: '', currentStressLevel: 5,
  preferences: { sessionReminders: true, breathingReminders: true, weeklyUpdates: false, publicProfile: false, shareProgress: true, sessionDuration: 60, sessionMode: 'video' },
  emergencyContacts: []
})

export default {
  name: 'UserProfileComponent',
  components: { PageHeader, UserAvatar },
  data() {
    return {
      userService: new UserService(),
      subscriptionService: new SubscriptionService(),
      editMode: false,
      saving: false,
      errors: {},
      form: {},
      extra: defaultExtra(),
      snapshot: null,
      subscription: null,
      loadingSubscription: true,
      subscriptionError: '',
      today: toLocalISODate(),
      toggles: ['sessionReminders', 'breathingReminders', 'weeklyUpdates', 'publicProfile', 'shareProgress']
    }
  },
  computed: {
    user() {
      return session.user || {}
    },
    displayName() {
      return getDisplayName(this.user) || this.$t('header.defaultUser')
    },
    avatarSrc() {
      return (this.editMode ? this.form.avatar : this.user.avatar) || ''
    },
    stats() {
      return [
        { key: 'breathing', label: 'userProfile.stats.breathingSessions', value: new BreathingService().getHistory().length },
        { key: 'completed', label: 'userProfile.stats.completedResources', value: readUserData('neurozen_completed', []).length },
        { key: 'favorites', label: 'userProfile.stats.favorites', value: readUserData('neurozen_favorites', []).length }
      ]
    }
  },
  created() {
    this.resetForm()
    this.extra = { ...defaultExtra(), ...readUserData(EXTRA_KEY, {}) }
    this.extra.preferences = { ...defaultExtra().preferences, ...(this.extra.preferences || {}) }
    this.loadSubscription()
  },
  methods: {
    resetForm() {
      const u = this.user
      this.form = {
        fullName: getDisplayName(u),
        username: u.username || u.email || '',
        email: u.email || '',
        phone: u.phone || '',
        address: u.address || '',
        birthDate: u.birthDate ? String(u.birthDate).slice(0, 10) : '',
        avatar: u.avatar || ''
      }
    },
    formatDate(value) {
      return formatLongDate(value, this.$i18n.locale)
    },
    planName(key) {
      const k = `subscriptions.plans.${key}.name`
      const text = this.$t(k)
      return text === k ? key : text
    },
    async loadSubscription() {
      this.loadingSubscription = true
      this.subscriptionError = ''
      try {
        this.subscription = await this.subscriptionService.getByUser(getUserId())
      } catch (error) {
        this.subscriptionError = error.message
      } finally {
        this.loadingSubscription = false
      }
    },
    startEdit() {
      this.snapshot = JSON.parse(JSON.stringify(this.extra))
      this.resetForm()
      this.editMode = true
    },
    cancelEdit() {
      if (this.snapshot) this.extra = this.snapshot
      this.resetForm()
      this.errors = {}
      this.editMode = false
    },
    cycleAvatar() {
      // Alterna entre iniciales y la imagen de perfil incluida en la app
      const options = ['', '/images-of-professionals/usuariodemo.jpg']
      if (this.user.avatar && !options.includes(this.user.avatar)) options.push(this.user.avatar)
      const i = options.indexOf(this.form.avatar)
      this.form.avatar = options[(i + 1) % options.length]
    },
    addContact() {
      this.extra.emergencyContacts.push({ name: '', relationship: '', phone: '' })
    },
    validate() {
      const e = {}
      if (!minLength(this.form.fullName, 2)) e.fullName = this.$t('validation.required')
      if (!this.form.username) e.username = this.$t('validation.required')
      if (!isEmail(this.form.email)) e.email = this.$t('validation.email')
      if (this.form.phone && !isPhone(this.form.phone)) e.phone = this.$t('validation.phone')
      this.extra.emergencyContacts.forEach((c, i) => { if (c.phone && !isPhone(c.phone)) e[`contact${i}`] = true })
      this.errors = e
      return !Object.keys(e).length
    },
    async saveChanges() {
      if (!this.editMode || this.saving) return
      if (!this.validate()) {
        toast.error(this.$t('validation.fixErrors'))
        return
      }
      this.saving = true
      try {
        await this.userService.updateProfile(getUserId(), this.form)
        updateUser({ ...this.form, name: this.form.fullName })
        this.extra.emergencyContacts = this.extra.emergencyContacts.filter((c) => c.name || c.phone)
        writeUserData(EXTRA_KEY, this.extra)
        this.editMode = false
        toast.success(this.$t('userProfile.actions.successMessage'))
      } catch (error) {
        toast.error(`${this.$t('userProfile.actions.errorMessage')}: ${error.message}`)
      } finally {
        this.saving = false
      }
    },
    downloadData() {
      const { token, ...safeUser } = this.user
      const data = { profile: safeUser, extra: this.extra, exportedAt: new Date().toISOString() }
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `neurozen_mis_datos_${toLocalISODate()}.json`
      link.click()
      URL.revokeObjectURL(url)
    },
    prefLabel(pref) {
      return ['publicProfile', 'shareProgress'].includes(pref) ? `userProfile.preferences.privacy.${pref}` : `userProfile.preferences.notifications.${pref}`
    }
  }
}
</script>
