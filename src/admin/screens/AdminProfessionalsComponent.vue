<template>
  <div class="nz-page max-w-6xl">
    <PageHeader :title="$t('admin.title')" :subtitle="$t('admin.subtitle')" :back="false" />

    <!-- Procedimiento de verificación -->
    <section class="nz-card mb-6 flex flex-col gap-4 border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center">
      <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><i class="fas fa-clipboard-check text-lg" aria-hidden="true"></i></span>
      <div class="flex-1 text-sm text-foreground-light">
        <p class="font-bold">{{ $t('admin.procedure.title') }}</p>
        <p class="mt-1 text-muted-light">{{ $t('admin.procedure.text') }}</p>
      </div>
      <a :href="cpspUrl" target="_blank" rel="noopener noreferrer" class="nz-btn-secondary shrink-0">
        <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>{{ $t('admin.openCpsp') }}
      </a>
    </section>

    <!-- Actualización de solicitudes sin recargar la página -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-muted-light" aria-live="polite" data-testid="admin-last-update">
        <template v-if="lastUpdated">{{ $t('admin.refresh.lastUpdated', { time: clock(lastUpdated) }) }} · {{ $t('admin.refresh.auto', { seconds: autoSeconds }) }}</template>
      </p>
      <button type="button" class="nz-btn-secondary" :disabled="loading || refreshing" data-testid="admin-refresh" @click="refresh()">
        <i class="fas fa-rotate-right" :class="{ 'animate-spin': refreshing }" aria-hidden="true"></i>
        {{ refreshing ? $t('admin.refresh.checking') : $t('admin.refresh.button') }}
      </button>
    </div>

    <div v-if="newIds.length" class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
      <span><i class="fas fa-bell mr-2" aria-hidden="true"></i>{{ $tc('admin.refresh.newRequests', newIds.length, { count: newIds.length }) }}</span>
      <button v-if="activeTab !== 'pending'" type="button" class="font-semibold underline" @click="activeTab = 'pending'">{{ $t('admin.refresh.seePending') }}</button>
    </div>

    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div class="inline-flex rounded-full bg-primary/10 p-1" role="radiogroup" :aria-label="$t('admin.filter')">
        <button v-for="tab in tabs" :key="tab" type="button" role="radio" :aria-checked="activeTab === tab"
          class="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold" :class="activeTab === tab ? 'bg-primary text-white' : 'text-primary hover:bg-primary/10'" @click="activeTab = tab">
          {{ $t(`admin.tabs.${tab}`) }}<span class="text-xs opacity-80">{{ countFor(tab) }}</span>
        </button>
      </div>
      <label class="w-full sm:w-72">
        <span class="sr-only">{{ $t('common.search') }}</span>
        <input v-model="search" type="search" class="nz-input" :placeholder="$t('admin.search')" />
      </label>
    </div>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <EmptyState v-else-if="!visible.length" icon="fas fa-user-check" :title="$t(`admin.empty.${activeTab}`)" />

    <ul v-else class="space-y-4">
      <li v-for="p in visible" :key="p.id" class="nz-card p-5">
        <div class="flex flex-wrap items-start gap-4">
          <UserAvatar :name="p.name" size="md" />
          <div class="min-w-0 flex-1">
            <p class="text-lg font-bold text-foreground-light">{{ p.name }}</p>
            <p class="text-sm text-muted-light">{{ p.email }}</p>
            <p class="mt-1 text-sm text-primary">{{ specialtyLabel(p.specialty) }}</p>
          </div>
          <span v-if="newIds.includes(p.id)" class="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white" :data-testid="`new-${p.id}`">{{ $t('admin.refresh.newBadge') }}</span>
          <span class="rounded-full px-3 py-1 text-xs font-bold" :class="statusStyle(p.verificationStatus)">{{ $t(`admin.status.${p.verificationStatus}`) }}</span>
        </div>

        <dl class="mt-4 grid gap-3 rounded-lg bg-[#FAF8F3] p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <!-- DNI: solo para que el administrador revise la identidad (formato validado, no verificado con RENIEC) -->
          <div>
            <dt class="text-muted-light">{{ $t('admin.dni') }}</dt>
            <dd class="font-mono font-bold text-foreground-light" :data-testid="`dni-${p.id}`">{{ p.dni || $t('admin.dniMissing') }}</dd>
          </div>
          <div>
            <dt class="text-muted-light">{{ $t('register.psychologist.license') }}</dt>
            <dd class="flex items-center gap-2 font-mono font-bold text-foreground-light">
              C.Ps.P. {{ p.licenseNumber }}
              <button type="button" class="text-primary hover:text-primary-strong" :aria-label="$t('admin.copyLicense')" @click="copy(p.licenseNumber)"><i class="far fa-copy" aria-hidden="true"></i></button>
            </dd>
          </div>
          <div><dt class="text-muted-light">{{ $t('admin.requestedAt') }}</dt><dd class="font-semibold">{{ shortDate(p.createdAt) || '—' }}</dd></div>
          <div v-if="p.verificationStatus === 'rejected'"><dt class="text-muted-light">{{ $t('pro.status.reason') }}</dt><dd class="font-semibold text-red-800">{{ p.rejectionReason }}</dd></div>
        </dl>

        <!-- Verificación manual: checklist obligatorio antes de aprobar -->
        <div v-if="p.verificationStatus === 'pending'" class="mt-4 space-y-3">
          <fieldset class="space-y-2">
            <legend class="mb-1 text-sm font-bold text-foreground-light">{{ $t('admin.checklist.title') }}</legend>
            <label v-for="check in checks" :key="check" class="flex items-start gap-3 text-sm text-foreground-light">
              <input v-model="checklist[p.id][check]" type="checkbox" class="mt-0.5 h-4 w-4 rounded text-primary focus:ring-primary" />
              <span>{{ $t(`admin.checklist.${check}`, { name: p.name }) }}</span>
            </label>
          </fieldset>
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" class="nz-btn-secondary text-red-700" :disabled="busyId === p.id" @click="openReject(p)">
              <i class="fas fa-xmark" aria-hidden="true"></i>{{ $t('admin.reject') }}
            </button>
            <button type="button" class="nz-btn-primary" :disabled="!canApprove(p) || busyId === p.id" :title="canApprove(p) ? '' : $t('admin.checklist.required')" @click="toApprove = p">
              <i class="fas fa-check" aria-hidden="true"></i>{{ $t('admin.approve') }}
            </button>
          </div>
        </div>
      </li>
    </ul>

    <!-- Aprobar -->
    <ConfirmDialog :open="!!toApprove" :busy="!!busyId" :title="$t('admin.approveDialog.title')"
      :message="toApprove ? $t('admin.approveDialog.message', { name: toApprove.name }) : ''" :confirm-text="$t('admin.approve')"
      @cancel="toApprove = null" @confirm="approve" />

    <!-- Rechazar con motivo -->
    <ConfirmDialog :open="!!toReject" danger :busy="!!busyId" :title="$t('admin.rejectDialog.title')"
      :message="toReject ? $t('admin.rejectDialog.message', { name: toReject.name }) : ''" :confirm-text="$t('admin.reject')"
      @cancel="toReject = null" @confirm="reject">
      <label class="mt-4 block">
        <span class="nz-label">{{ $t('admin.rejectDialog.reason') }}</span>
        <select v-model="reasonPreset" class="nz-input mb-2">
          <option value="">{{ $t('admin.rejectDialog.choose') }}</option>
          <option v-for="r in reasonPresets" :key="r" :value="r">{{ $t(`admin.reasons.${r}`) }}</option>
        </select>
        <textarea v-model="rejectReason" rows="3" maxlength="300" class="nz-input" :class="{ 'nz-input-error': reasonError }" :placeholder="$t('admin.rejectDialog.placeholder')"></textarea>
        <p v-if="reasonError" class="nz-field-error">{{ reasonError }}</p>
      </label>
    </ConfirmDialog>
  </div>
</template>

<script>
/**
 * AdminProfessionalsComponent - Validación MANUAL de psicólogos.
 *
 * El administrador:
 *   1. abre el portal oficial del Colegio de Psicólogos del Perú (cpsp.pe),
 *   2. busca el número de colegiatura,
 *   3. confirma que el nombre coincide y que el estado es "HABILITADO",
 *   4. aprueba (el psicólogo ya puede recibir citas) o rechaza indicando el motivo.
 * El botón Aprobar solo se habilita cuando ambas comprobaciones están marcadas.
 *
 * Actualización sin recargar la página: botón «Comprobar nuevas solicitudes» y consulta automática cada
 * AUTO_REFRESH_SECONDS mientras la pestaña está visible (se pausa si está oculta, si hay un diálogo abierto o
 * una aprobación en curso). Las solicitudes que llegan se marcan como «Nueva» y se avisa con un mensaje.
 * Las casillas ya marcadas por el administrador se conservan.
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue'
import UserAvatar from '../../components/ui/UserAvatar.vue'
import { AdminService, CPSP_PORTAL_URL } from '../../services/AdminService.js'
import { formatShortDate } from '../../utils/date.js'
import { toast } from '../../composables/useToast.js'

/** Cada cuántos segundos se buscan nuevas solicitudes automáticamente */
const AUTO_REFRESH_SECONDS = 60

export default {
  name: 'AdminProfessionalsComponent',
  components: { PageHeader, LoadingState, ErrorState, EmptyState, ConfirmDialog, UserAvatar },
  data() {
    return {
      service: new AdminService(),
      cpspUrl: CPSP_PORTAL_URL,
      loading: true,
      error: '',
      professionals: [],
      tabs: ['pending', 'verified', 'rejected'],
      activeTab: 'pending',
      search: '',
      checks: ['nameMatches', 'enabled'],
      checklist: {},
      busyId: null,
      toApprove: null,
      toReject: null,
      reasonPreset: '',
      rejectReason: '',
      reasonError: '',
      reasonPresets: ['notFound', 'nameMismatch', 'notEnabled', 'notClinical'],
      refreshing: false,
      lastUpdated: null,
      newIds: [],
      autoSeconds: AUTO_REFRESH_SECONDS,
      timer: null
    }
  },
  computed: {
    visible() {
      const q = this.search.toLowerCase().trim()
      return this.professionals
        .filter((p) => p.verificationStatus === this.activeTab)
        .filter((p) => !q || `${p.name} ${p.email} ${p.dni || ''} ${p.licenseNumber}`.toLowerCase().includes(q))
    }
  },
  watch: {
    reasonPreset(value) {
      if (value) this.rejectReason = this.$t(`admin.reasons.${value}`)
    }
  },
  created() {
    void this.load()
  },
  mounted() {
    this.timer = setInterval(this.autoRefresh, AUTO_REFRESH_SECONDS * 1000)
    document.addEventListener('visibilitychange', this.onVisibility)
  },
  beforeUnmount() {
    clearInterval(this.timer)
    document.removeEventListener('visibilitychange', this.onVisibility)
  },
  methods: {
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.setProfessionals(await this.service.getProfessionals())
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },
    setProfessionals(list) {
      this.professionals = list
      this.professionals.forEach((p) => {
        if (!this.checklist[p.id]) this.checklist[p.id] = { nameMatches: false, enabled: false }
      })
      this.lastUpdated = new Date()
    },
    /**
     * Vuelve a pedir las solicitudes sin ocultar la lista. Devuelve cuántas solicitudes pendientes nuevas llegaron.
     * @param {{ silent?: boolean }} options silent: consulta automática (solo avisa si hay novedades o error nuevo)
     */
    async refresh({ silent = false } = {}) {
      if (this.refreshing || this.loading) return 0
      this.refreshing = true
      const known = new Set(this.professionals.map((p) => String(p.id)))
      try {
        const list = await this.service.getProfessionals()
        const arrived = list.filter((p) => p.verificationStatus === 'pending' && !known.has(String(p.id))).map((p) => p.id)
        this.setProfessionals(list)
        this.error = ''
        // Las marcas «Nueva» se acumulan hasta que se resuelven las solicitudes
        this.newIds = [...new Set([...this.newIds, ...arrived])].filter((id) => list.some((p) => p.id === id && p.verificationStatus === 'pending'))
        if (arrived.length) toast.info(this.$tc('admin.refresh.newRequests', arrived.length, { count: arrived.length }))
        else if (!silent) toast.success(this.$t('admin.refresh.upToDate'), { duration: 2000 })
        return arrived.length
      } catch (error) {
        if (!silent) toast.error(error.message)
        return 0
      } finally {
        this.refreshing = false
      }
    },
    /** Consulta automática: solo si la pestaña está visible y el administrador no está en medio de una acción */
    autoRefresh() {
      if (document.visibilityState === 'hidden' || this.toApprove || this.toReject || this.busyId) return
      void this.refresh({ silent: true })
    },
    onVisibility() {
      if (document.visibilityState === 'visible') this.autoRefresh()
    },
    clock(date) {
      return date.toLocaleTimeString(this.$i18n.locale === 'en' ? 'en-US' : 'es-ES', { hour: '2-digit', minute: '2-digit' })
    },
    countFor(tab) {
      return this.professionals.filter((p) => p.verificationStatus === tab).length
    },
    canApprove(p) {
      const c = this.checklist[p.id]
      return !!(c && c.nameMatches && c.enabled)
    },
    specialtyLabel(key) {
      const text = this.$t(`specialties.${key}`)
      return text === `specialties.${key}` ? key : text
    },
    statusStyle(status) {
      return { pending: 'bg-amber-50 text-amber-800', verified: 'bg-green-50 text-green-800', rejected: 'bg-red-50 text-red-800' }[status]
    },
    shortDate(value) {
      return formatShortDate(value, this.$i18n.locale)
    },
    async copy(text) {
      try {
        await navigator.clipboard.writeText(text)
        toast.success(this.$t('admin.copied'), { duration: 2000 })
      } catch {
        toast.info(text)
      }
    },
    openReject(p) {
      this.toReject = p
      this.reasonPreset = ''
      this.rejectReason = ''
      this.reasonError = ''
    },
    async approve() {
      const p = this.toApprove
      this.busyId = p.id
      try {
        await this.service.verifyProfessional(p.id)
        p.verificationStatus = 'verified'
        this.newIds = this.newIds.filter((id) => id !== p.id)
        toast.success(this.$t('admin.approved', { name: p.name }))
        this.toApprove = null
      } catch (error) {
        toast.error(error.message)
      } finally {
        this.busyId = null
      }
    },
    async reject() {
      if (this.rejectReason.trim().length < 10) {
        this.reasonError = this.$t('validation.minChars', { n: 10 })
        return
      }
      const p = this.toReject
      this.busyId = p.id
      try {
        await this.service.rejectProfessional(p.id, this.rejectReason)
        p.verificationStatus = 'rejected'
        this.newIds = this.newIds.filter((id) => id !== p.id)
        p.rejectionReason = this.rejectReason.trim()
        toast.success(this.$t('admin.rejected', { name: p.name }))
        this.toReject = null
      } catch (error) {
        toast.error(error.message)
      } finally {
        this.busyId = null
      }
    }
  }
}
</script>
