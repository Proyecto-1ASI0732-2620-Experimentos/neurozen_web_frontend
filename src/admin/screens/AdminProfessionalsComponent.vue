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
          <span class="rounded-full px-3 py-1 text-xs font-bold" :class="statusStyle(p.verificationStatus)">{{ $t(`admin.status.${p.verificationStatus}`) }}</span>
        </div>

        <dl class="mt-4 grid gap-3 rounded-lg bg-[#FAF8F3] p-4 text-sm sm:grid-cols-3">
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
      reasonPresets: ['notFound', 'nameMismatch', 'notEnabled', 'notClinical']
    }
  },
  computed: {
    visible() {
      const q = this.search.toLowerCase().trim()
      return this.professionals
        .filter((p) => p.verificationStatus === this.activeTab)
        .filter((p) => !q || `${p.name} ${p.email} ${p.licenseNumber}`.toLowerCase().includes(q))
    }
  },
  watch: {
    reasonPreset(value) {
      if (value) this.rejectReason = this.$t(`admin.reasons.${value}`)
    }
  },
  created() {
    this.load()
  },
  methods: {
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.professionals = await this.service.getProfessionals()
        this.professionals.forEach((p) => {
          if (!this.checklist[p.id]) this.checklist[p.id] = { nameMatches: false, enabled: false }
        })
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
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
