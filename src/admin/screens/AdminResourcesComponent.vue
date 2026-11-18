<template>
  <div class="nz-page max-w-5xl">
    <PageHeader :title="$t('adminResources.title')" :subtitle="$t('adminResources.subtitle')" :back="false">
      <template #actions>
        <button type="button" class="nz-btn-primary" :aria-expanded="creating" @click="toggleCreate">
          <i :class="creating ? 'fas fa-xmark' : 'fas fa-plus'" aria-hidden="true"></i>{{ creating ? $t('common.cancel') : $t('adminResources.new') }}
        </button>
      </template>
    </PageHeader>

    <p class="mb-6 flex gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="note">
      <i class="fas fa-circle-info mt-0.5" aria-hidden="true"></i>{{ $t('adminResources.planNote') }}
    </p>

    <!-- Crear recurso (POST, con plan mínimo) -->
    <form v-if="creating" class="nz-card mb-6 space-y-4 p-5" novalidate data-testid="create-form" @submit.prevent="create">
      <h2 class="text-lg font-bold">{{ $t('adminResources.new') }}</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="nz-label" for="new-type">{{ $t('adminResources.fields.resourceType') }}</label>
          <select id="new-type" v-model="newForm.resourceType" class="nz-input">
            <option v-for="type in types" :key="type" :value="type">{{ type }}</option>
          </select>
        </div>
        <div>
          <label class="nz-label" for="new-plan">{{ $t('adminResources.fields.requiredPlan') }}</label>
          <select id="new-plan" v-model.number="newForm.requiredPlan" class="nz-input" :class="{ 'nz-input-error': newErrors.requiredPlan }">
            <option v-for="plan in plans" :key="plan" :value="plan">{{ planLabel(plan) }}</option>
          </select>
          <p v-if="newErrors.requiredPlan" class="nz-field-error">{{ newErrors.requiredPlan }}</p>
        </div>
      </div>
      <ResourceFields v-model="newForm" id-prefix="new" :errors="newErrors" />
      <div class="flex justify-end">
        <button type="submit" class="nz-btn-primary" :disabled="saving">
          <span v-if="saving" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>{{ $t('adminResources.create') }}
        </button>
      </div>
    </form>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <EmptyState v-else-if="!resources.length" icon="fas fa-photo-film" :title="$t('adminResources.empty')" />

    <ul v-else class="space-y-4">
      <li v-for="r in resources" :key="r.id" class="nz-card overflow-hidden" :data-testid="`resource-${r.id}`">
        <div class="flex flex-wrap items-center gap-4 p-4">
          <img :src="r.thumbnail || r.fallbackThumbnail" :data-fallback="r.fallbackThumbnail" alt="" class="h-16 w-28 shrink-0 rounded-md object-cover" loading="lazy" />
          <div class="min-w-0 flex-1">
            <p class="font-bold text-foreground-light">{{ r.title }}</p>
            <p class="text-xs text-muted-light">{{ r.resourceType }} · {{ r.durationMinutes }} min</p>
            <p v-if="r.contentUrl" class="truncate font-mono text-xs text-primary" :title="r.contentUrl">{{ r.contentUrl }}</p>
          </div>
          <button type="button" class="nz-btn-secondary" :aria-expanded="editingId === r.id" @click="toggleEdit(r)">
            <i :class="editingId === r.id ? 'fas fa-xmark' : 'fas fa-pen'" aria-hidden="true"></i>{{ editingId === r.id ? $t('common.cancel') : $t('common.edit') }}
          </button>
        </div>

        <!-- Editar (PATCH: solo se envían los campos modificados) -->
        <form v-if="editingId === r.id" class="space-y-4 border-t border-[#EEE9DD] bg-[#FAF8F3] p-4" novalidate @submit.prevent="save(r)">
          <ResourceFields v-model="editForm" :id-prefix="`edit-${r.id}`" :errors="editErrors" />
          <div>
            <label class="nz-label" :for="`edit-${r.id}-plan`">{{ $t('adminResources.fields.requiredPlan') }}</label>
            <select :id="`edit-${r.id}-plan`" v-model="editForm.requiredPlan" class="nz-input sm:max-w-xs" :class="{ 'nz-input-error': editErrors.requiredPlan }">
              <option value="">{{ $t('adminResources.keepPlan') }}</option>
              <option v-for="plan in plans" :key="plan" :value="plan">{{ planLabel(plan) }}</option>
            </select>
            <p v-if="editErrors.requiredPlan" class="nz-field-error">{{ editErrors.requiredPlan }}</p>
          </div>
          <div class="flex justify-end">
            <button type="submit" class="nz-btn-primary" :disabled="saving">
              <span v-if="saving" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>{{ $t('userProfile.actions.saveChanges') }}
            </button>
          </div>
        </form>
      </li>
    </ul>
  </div>
</template>

<script>
/**
 * AdminResourcesComponent - Gestión de la biblioteca (solo ADMIN).
 *  - Editar: PATCH /api/v1/resource-libraries/{id}. Solo se envían los campos cambiados (los ausentes
 *    se conservan; "" vacía un campo opcional). resourceType no se puede editar.
 *  - Crear: POST /api/v1/resource-libraries con requiredPlan (1 Básico, 2 Avanzado, 3 Profesional).
 *  - Las validaciones replican las del backend; los `errors` del 400 se muestran por campo.
 * La API no devuelve el plan actual de cada recurso, por eso el selector de plan de la edición
 * empieza en "Mantener el plan actual".
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import ResourceFields from '../components/ResourceFields.vue'
import { ResourceLibraryService, RESOURCE_TYPES, RESOURCE_PLANS } from '../../services/ResourceLibraryService.js'
import { fieldErrors } from '../../services/ApiError.js'
import { toast } from '../../composables/useToast.js'

const URL_PATTERN = /^https?:\/\/\S+$/i
const blankFields = () => ({ title: '', description: '', content: '', author: '', contentUrl: '', thumbnail: '', duration: 0, tags: '' })

/** Reglas del backend (PATCH/POST de recursos) */
export function validateResource(f, t, { requireTitle = true } = {}) {
  const e = {}
  const title = String(f.title ?? '').trim()
  if ((requireTitle || title) && (title.length < 3 || title.length > 200)) e.title = t('adminResources.errors.title')
  if (String(f.description ?? '').length > 1000) e.description = t('adminResources.errors.description')
  for (const field of ['contentUrl', 'thumbnail']) {
    const value = String(f[field] ?? '').trim()
    if (value && (!URL_PATTERN.test(value) || value.length > 500)) e[field] = t('adminResources.errors.url')
  }
  const duration = Number(f.duration)
  if (!Number.isInteger(duration) || duration < 0 || duration > 600) e.duration = t('adminResources.errors.duration')
  const tags = splitTags(f.tags)
  if (tags.length > 10 || tags.some((tag) => tag.length > 30)) e.tags = t('adminResources.errors.tags')
  if (f.requiredPlan !== '' && f.requiredPlan != null && !RESOURCE_PLANS.includes(Number(f.requiredPlan))) e.requiredPlan = t('adminResources.errors.plan')
  return e
}

export const splitTags = (value) => String(value ?? '').split(',').map((tag) => tag.trim()).filter(Boolean)

export default {
  name: 'AdminResourcesComponent',
  components: { PageHeader, LoadingState, ErrorState, EmptyState, ResourceFields },
  data() {
    return {
      service: new ResourceLibraryService(),
      resources: [],
      loading: true,
      error: '',
      saving: false,
      types: RESOURCE_TYPES,
      plans: RESOURCE_PLANS,
      editingId: null,
      editForm: {},
      original: null,
      editErrors: {},
      creating: false,
      newForm: { ...blankFields(), resourceType: 'Video', requiredPlan: 2 },
      newErrors: {}
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
        this.resources = (await this.service.getResources()).items
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },
    planLabel(plan) {
      return this.$t(`adminResources.plans.${plan}`)
    },
    toFields(r) {
      return {
        title: r.title, description: r.description, content: r.content, author: r.author,
        contentUrl: r.contentUrl, thumbnail: r.thumbnail && r.thumbnail !== r.fallbackThumbnail ? r.thumbnail : '',
        duration: r.durationMinutes, tags: r.tags.join(', '), requiredPlan: ''
      }
    },
    toggleEdit(r) {
      if (this.editingId === r.id) {
        this.editingId = null
        return
      }
      this.editingId = r.id
      this.editForm = this.toFields(r)
      this.original = { ...this.editForm }
      this.editErrors = {}
    },
    toggleCreate() {
      this.creating = !this.creating
      this.newForm = { ...blankFields(), resourceType: 'Video', requiredPlan: 2 }
      this.newErrors = {}
    },
    /** Solo los campos modificados (PATCH parcial) */
    changes() {
      const out = {}
      for (const key of ['title', 'description', 'content', 'author', 'contentUrl', 'thumbnail']) {
        const value = String(this.editForm[key] ?? '').trim()
        if (value !== String(this.original[key] ?? '').trim()) out[key] = value
      }
      if (Number(this.editForm.duration) !== Number(this.original.duration)) out.duration = Number(this.editForm.duration)
      if (splitTags(this.editForm.tags).join('|') !== splitTags(this.original.tags).join('|')) out.tags = splitTags(this.editForm.tags)
      if (this.editForm.requiredPlan !== '') out.requiredPlan = Number(this.editForm.requiredPlan)
      return out
    },
    async save(r) {
      this.editErrors = validateResource(this.editForm, this.$t.bind(this))
      if (Object.keys(this.editErrors).length || this.saving) return
      const payload = this.changes()
      if (!Object.keys(payload).length) {
        this.editingId = null
        return
      }
      this.saving = true
      try {
        const updated = await this.service.updateResource(r.id, payload)
        const index = this.resources.findIndex((x) => x.id === r.id)
        if (index >= 0 && updated.id != null) this.resources.splice(index, 1, updated)
        else await this.load()
        this.editingId = null
        toast.success(this.$t('adminResources.saved'))
      } catch (error) {
        this.editErrors = fieldErrors(error)
        if (!Object.keys(this.editErrors).length) toast.error(error.message)
      } finally {
        this.saving = false
      }
    },
    async create() {
      this.newErrors = validateResource(this.newForm, this.$t.bind(this))
      if (Object.keys(this.newErrors).length || this.saving) return
      const f = this.newForm
      const payload = {
        title: f.title.trim(), description: f.description.trim(), content: f.content.trim(), author: f.author.trim(),
        resourceType: f.resourceType, contentUrl: f.contentUrl.trim(), duration: Number(f.duration),
        thumbnail: f.thumbnail.trim(), tags: splitTags(f.tags), requiredPlan: Number(f.requiredPlan)
      }
      this.saving = true
      try {
        await this.service.createResource(payload)
        toast.success(this.$t('adminResources.created'))
        this.creating = false
        await this.load()
      } catch (error) {
        this.newErrors = fieldErrors(error)
        if (!Object.keys(this.newErrors).length) toast.error(error.message)
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
