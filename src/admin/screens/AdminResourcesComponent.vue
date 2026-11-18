<template>
  <div class="nz-page max-w-6xl">
    <PageHeader :title="$t('adminResources.title')" :subtitle="$t('adminResources.subtitle')" :back="false">
      <template #actions>
        <button type="button" class="nz-btn-primary" @click="openCreate"><i class="fas fa-plus" aria-hidden="true"></i>{{ $t('adminResources.new') }}</button>
      </template>
    </PageHeader>

    <p class="mb-4 flex gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="note">
      <i class="fas fa-circle-info mt-0.5" aria-hidden="true"></i>{{ $t('adminResources.planNote') }}
    </p>

    <!-- Recursos del plan Básico por tipo (recomendación: 1-2 por tipo) -->
    <section v-if="!loading && !error" class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4" :aria-label="$t('adminResources.basicSummary')" data-testid="basic-summary">
      <div v-for="type in types" :key="type" class="nz-card p-3">
        <p class="text-xs text-muted-light">{{ $t(`adminResources.typesPlural.${type}`) }}</p>
        <p class="text-lg font-extrabold text-foreground-light">{{ countByType[type] }}</p>
        <p class="text-xs" :class="basicCounts[type] > 2 ? 'font-semibold text-amber-800' : 'text-muted-light'" :data-testid="`basic-${type}`">
          {{ $t('adminResources.basicCount', { count: basicCounts[type] }) }}
        </p>
      </div>
    </section>

    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" :aria-label="$t('adminResources.filterByType')">
        <button v-for="option in typeFilters" :key="option" type="button" class="shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold"
          :class="typeFilter === option ? 'border-primary bg-primary text-white' : 'border-[#D6D2C7] bg-white text-foreground-light hover:border-primary'"
          :aria-pressed="typeFilter === option" @click="typeFilter = option">
          {{ option === 'all' ? $t('adminResources.allTypes') : $t(`adminResources.typesPlural.${option}`) }}
        </button>
      </div>
      <label class="w-full sm:w-72">
        <span class="sr-only">{{ $t('common.search') }}</span>
        <input v-model="search" type="search" class="nz-input" :placeholder="$t('adminResources.search')" />
      </label>
    </div>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <EmptyState v-else-if="!visible.length" icon="fas fa-photo-film" :title="$t('adminResources.empty')" />

    <div v-else class="nz-card overflow-x-auto">
      <table class="w-full min-w-[40rem] text-left text-sm" data-testid="resources-table">
        <caption class="sr-only">{{ $t('adminResources.title') }}</caption>
        <thead class="border-b border-[#EEE9DD] bg-[#FAF8F3] text-xs uppercase tracking-wide text-muted-light">
          <tr>
            <th scope="col" class="px-4 py-3">{{ $t('adminResources.fields.resourceType') }}</th>
            <th scope="col" class="px-4 py-3">{{ $t('adminResources.fields.title') }}</th>
            <th scope="col" class="px-4 py-3">{{ $t('adminResources.fields.requiredPlan') }}</th>
            <th scope="col" class="px-4 py-3">{{ $t('adminResources.durationShort') }}</th>
            <th scope="col" class="px-4 py-3 text-right">{{ $t('adminResources.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in visible" :key="r.id" class="border-b border-[#EEE9DD] last:border-0" :data-testid="`resource-${r.id}`">
            <td class="whitespace-nowrap px-4 py-3">
              <span class="inline-flex items-center gap-1.5 text-muted-light"><i :class="typeIcon(r.resourceType)" aria-hidden="true"></i>{{ $t(`adminResources.types.${r.resourceType}`) }}</span>
            </td>
            <td class="px-4 py-3 font-semibold text-foreground-light">{{ r.title }}</td>
            <td class="whitespace-nowrap px-4 py-3">
              <span class="rounded-full px-2.5 py-0.5 text-xs font-bold" :class="planStyle(r.requiredPlan)">{{ r.requiredPlanName || $t(`adminResources.plans.${r.requiredPlan}`) }}</span>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-muted-light">{{ r.duration }} min</td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <button type="button" class="nz-btn-secondary px-3 py-1.5 text-xs" :disabled="openingId === r.id" :aria-label="$t('adminResources.editAria', { title: r.title })" @click="openEdit(r)">
                <i class="fas fa-pen" aria-hidden="true"></i>{{ $t('common.edit') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ResourceFormDialog :open="dialogOpen" :resource="editing" :saving="saving" :server-errors="serverErrors" :general-error="generalError"
      @close="closeDialog" @save="save" />
  </div>
</template>

<script>
/**
 * AdminResourcesComponent - Biblioteca vista por el administrador.
 *  - Lista: GET /admin/resource-libraries (todos los recursos, con su plan).
 *  - Editar: GET /admin/resource-libraries/{id} para llenar el formulario y PATCH solo con lo cambiado.
 *  - Crear: POST /resource-libraries (Video, Audio, Lectura o Ejercicio) con el plan elegido.
 *  - Tras guardar se recarga la lista; los usuarios ven el cambio en su siguiente petición.
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import ResourceFormDialog from '../components/ResourceFormDialog.vue'
import { AdminResourceService, RESOURCE_TYPES } from '../../services/AdminResourceService.js'
import { fieldErrors } from '../../services/ApiError.js'
import { basicCountByType } from '../resourceForm.js'
import { toast } from '../../composables/useToast.js'

const TYPE_ICONS = { Video: 'fas fa-circle-play', Audio: 'fas fa-headphones', Article: 'fas fa-book-open', Exercise: 'fas fa-dumbbell' }
const PLAN_STYLES = { 1: 'bg-green-50 text-green-800', 2: 'bg-sky-50 text-sky-800', 3: 'bg-purple-50 text-purple-800' }

export default {
  name: 'AdminResourcesComponent',
  components: { PageHeader, LoadingState, ErrorState, EmptyState, ResourceFormDialog },
  data() {
    return {
      service: new AdminResourceService(),
      resources: [],
      loading: true,
      error: '',
      types: RESOURCE_TYPES,
      typeFilter: 'all',
      search: '',
      dialogOpen: false,
      editing: null,
      openingId: null,
      saving: false,
      serverErrors: {},
      generalError: ''
    }
  },
  computed: {
    typeFilters() {
      return ['all', ...RESOURCE_TYPES]
    },
    visible() {
      const q = this.search.trim().toLowerCase()
      return this.resources
        .filter((r) => this.typeFilter === 'all' || r.resourceType === this.typeFilter)
        .filter((r) => !q || `${r.title} ${r.tags.join(' ')}`.toLowerCase().includes(q))
    },
    basicCounts() {
      return basicCountByType(this.resources, RESOURCE_TYPES)
    },
    countByType() {
      return Object.fromEntries(RESOURCE_TYPES.map((t) => [t, this.resources.filter((r) => r.resourceType === t).length]))
    }
  },
  created() {
    void this.load() // maneja sus errores (muestra "Reintentar")
  },
  methods: {
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.resources = await this.service.list()
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },
    typeIcon(type) {
      return TYPE_ICONS[type] || 'fas fa-file'
    },
    planStyle(plan) {
      return PLAN_STYLES[plan] || 'bg-gray-100 text-muted-light'
    },
    resetErrors() {
      this.serverErrors = {}
      this.generalError = ''
    },
    openCreate() {
      this.resetErrors()
      this.editing = null
      this.dialogOpen = true
    },
    /** Se piden los datos completos (contenido y plan) antes de editar */
    async openEdit(row) {
      this.resetErrors()
      this.openingId = row.id
      try {
        this.editing = await this.service.get(row.id)
        this.dialogOpen = true
      } catch (error) {
        toast.error(error.message)
      } finally {
        this.openingId = null
      }
    },
    closeDialog() {
      this.dialogOpen = false
      this.editing = null
    },
    async save(body) {
      if (!this.editing && !body) return
      if (this.editing && !Object.keys(body).length) {
        this.closeDialog()
        return
      }
      this.saving = true
      this.resetErrors()
      try {
        if (this.editing) await this.service.update(this.editing.id, body)
        else await this.service.create(body)
        toast.success(this.$t(this.editing ? 'adminResources.saved' : 'adminResources.created'))
        this.closeDialog()
        await this.load()
      } catch (error) {
        this.serverErrors = fieldErrors(error)
        if (!Object.keys(this.serverErrors).length) this.generalError = error.message
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
