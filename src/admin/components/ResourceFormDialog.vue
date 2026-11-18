<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[10001] flex items-stretch justify-center bg-black/40 sm:items-center sm:p-4" @click.self="$emit('close')">
      <form class="flex max-h-full w-full max-w-3xl flex-col bg-white shadow-xl sm:max-h-[90vh] sm:rounded-xl" role="dialog" aria-modal="true"
        aria-labelledby="resource-form-title" novalidate data-testid="resource-form" @submit.prevent="submit" @keydown.esc="$emit('close')">
        <header class="flex items-center justify-between border-b border-[#E3DED2] px-5 py-4">
          <h2 id="resource-form-title" class="text-lg font-bold text-foreground-light">{{ $t(isNew ? 'adminResources.new' : 'adminResources.editTitle') }}</h2>
          <button type="button" class="h-9 w-9 rounded-lg text-muted-light hover:bg-primary/10" :aria-label="$t('common.close')" @click="$emit('close')">
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </header>

        <div class="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <p v-if="generalError" class="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{{ generalError }}</p>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="nz-label" for="rf-type">{{ $t('adminResources.fields.resourceType') }}</label>
              <!-- El tipo solo se elige al crear; al editar se muestra pero no se puede cambiar -->
              <select id="rf-type" v-model="form.resourceType" class="nz-input" :disabled="!isNew" :aria-describedby="isNew ? null : 'rf-type-hint'">
                <option v-for="type in types" :key="type" :value="type">{{ $t(`adminResources.types.${type}`) }}</option>
              </select>
              <p v-if="!isNew" id="rf-type-hint" class="nz-hint">{{ $t('adminResources.typeLocked') }}</p>
              <p v-if="errorFor('resourceType')" class="nz-field-error">{{ errorFor('resourceType') }}</p>
            </div>
            <div>
              <label class="nz-label" for="rf-plan">{{ $t('adminResources.fields.requiredPlan') }}</label>
              <select id="rf-plan" v-model.number="form.requiredPlan" class="nz-input" :class="invalidClass('requiredPlan')">
                <option v-for="plan in plans" :key="plan" :value="plan">{{ $t(`adminResources.plans.${plan}`) }}</option>
              </select>
              <p v-if="errorFor('requiredPlan')" class="nz-field-error">{{ errorFor('requiredPlan') }}</p>
            </div>
          </div>

          <div>
            <label class="nz-label" for="rf-title">{{ $t('adminResources.fields.title') }}</label>
            <input id="rf-title" v-model="form.title" class="nz-input" :class="invalidClass('title')" :maxlength="limits.titleMax" />
            <p v-if="errorFor('title')" class="nz-field-error">{{ errorFor('title') }}</p>
          </div>

          <div v-if="urlRule !== 'hidden'">
            <label class="nz-label" for="rf-url">{{ $t(urlRule === 'required' ? 'adminResources.fields.contentUrlRequired' : 'adminResources.fields.contentUrlOptional') }}</label>
            <input id="rf-url" v-model="form.contentUrl" type="url" class="nz-input" :class="invalidClass('contentUrl')" :maxlength="limits.urlMax"
              placeholder="https://www.youtube.com/watch?v=…" />
            <p v-if="errorFor('contentUrl')" class="nz-field-error">{{ errorFor('contentUrl') }}</p>
          </div>

          <div>
            <label class="nz-label" for="rf-description">{{ $t('adminResources.fields.description') }}</label>
            <textarea id="rf-description" v-model="form.description" rows="3" class="nz-input" :class="invalidClass('description')" :maxlength="limits.descriptionMax"></textarea>
            <p class="nz-hint text-right">{{ form.description.length }}/{{ limits.descriptionMax }}</p>
            <p v-if="errorFor('description')" class="nz-field-error">{{ errorFor('description') }}</p>
          </div>

          <div>
            <label class="nz-label" for="rf-content">{{ $t('adminResources.fields.content') }}</label>
            <textarea id="rf-content" v-model="form.content" :rows="contentRecommended ? 12 : 4" class="nz-input font-mono text-sm" :class="invalidClass('content')"
              :maxlength="limits.contentMax" aria-describedby="rf-content-hint"></textarea>
            <p id="rf-content-hint" class="nz-hint">
              {{ $t(contentRecommended ? 'adminResources.contentHint' : 'adminResources.contentOptionalHint') }} · {{ form.content.length }}/{{ limits.contentMax }}
            </p>
            <p v-if="errorFor('content')" class="nz-field-error">{{ errorFor('content') }}</p>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <div>
              <label class="nz-label" for="rf-duration">{{ $t('adminResources.fields.duration') }}</label>
              <input id="rf-duration" v-model.number="form.duration" type="number" min="0" :max="limits.durationMax" step="1" class="nz-input" :class="invalidClass('duration')" />
              <p v-if="errorFor('duration')" class="nz-field-error">{{ errorFor('duration') }}</p>
            </div>
            <div class="sm:col-span-2">
              <label class="nz-label" for="rf-author">{{ $t('adminResources.fields.author') }}</label>
              <input id="rf-author" v-model="form.author" class="nz-input" :class="invalidClass('author')" :maxlength="limits.authorMax" />
              <p v-if="errorFor('author')" class="nz-field-error">{{ errorFor('author') }}</p>
            </div>
          </div>

          <div>
            <label class="nz-label" for="rf-thumbnail">{{ $t('adminResources.fields.thumbnail') }}</label>
            <input id="rf-thumbnail" v-model="form.thumbnail" type="url" class="nz-input" :class="invalidClass('thumbnail')" :maxlength="limits.urlMax"
              :placeholder="$t('adminResources.thumbnailHint')" />
            <p v-if="errorFor('thumbnail')" class="nz-field-error">{{ errorFor('thumbnail') }}</p>
          </div>

          <div>
            <label class="nz-label" for="rf-tags">{{ $t('adminResources.fields.tags') }}</label>
            <TagsInput v-model="form.tags" input-id="rf-tags" :invalid="!!errorFor('tags')" described-by="rf-tags-hint" />
            <p id="rf-tags-hint" class="nz-hint">{{ $t('adminResources.tagsLimit', { max: limits.tagsMax, chars: limits.tagMax }) }}</p>
            <p v-if="errorFor('tags')" class="nz-field-error">{{ errorFor('tags') }}</p>
          </div>
        </div>

        <footer class="flex flex-col-reverse gap-2 border-t border-[#E3DED2] px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" class="nz-btn-secondary" @click="$emit('close')">{{ $t('common.cancel') }}</button>
          <button type="submit" class="nz-btn-primary" :disabled="saving">
            <span v-if="saving" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
            {{ $t(isNew ? 'adminResources.create' : 'userProfile.actions.saveChanges') }}
          </button>
        </footer>
      </form>
    </div>
  </Teleport>
</template>

<script>
/**
 * ResourceFormDialog - Crear o editar un recurso (Video, Audio, Lectura o Ejercicio).
 *  - Crear: emite `save` con el cuerpo del POST.
 *  - Editar: recibe el recurso de GET /admin/resource-libraries/{id} y emite solo los campos cambiados (PATCH).
 *  - `serverErrors` son los `errors` del 400 del backend y se muestran bajo cada campo.
 */
import TagsInput from './TagsInput.vue'
import { RESOURCE_TYPES, RESOURCE_PLANS, RESOURCE_LIMITS } from '../../services/AdminResourceService.js'
import { emptyResourceForm, formFromResource, fieldsFor, validateResourceForm, buildCreatePayload, buildPatch } from '../resourceForm.js'

export default {
  name: 'ResourceFormDialog',
  components: { TagsInput },
  props: {
    open: { type: Boolean, default: false },
    /** Recurso a editar; null = crear */
    resource: { type: Object, default: null },
    saving: { type: Boolean, default: false },
    serverErrors: { type: Object, default: () => ({}) },
    generalError: { type: String, default: '' }
  },
  emits: ['close', 'save'],
  data() {
    return { form: emptyResourceForm(), errors: {}, types: RESOURCE_TYPES, plans: RESOURCE_PLANS, limits: RESOURCE_LIMITS }
  },
  computed: {
    isNew() {
      return !this.resource
    },
    urlRule() {
      return fieldsFor(this.form.resourceType).contentUrl
    },
    contentRecommended() {
      return fieldsFor(this.form.resourceType).contentRecommended
    }
  },
  watch: {
    open: {
      immediate: true,
      handler(value) {
        if (value) this.reset()
      }
    },
    resource() {
      if (this.open) this.reset()
    }
  },
  methods: {
    reset() {
      this.form = this.resource ? formFromResource(this.resource) : emptyResourceForm()
      this.errors = {}
    },
    /** Error local (clave i18n) o del servidor (texto del backend) */
    errorFor(field) {
      if (this.errors[field]) return this.$t(`adminResources.errors.${this.errors[field]}`)
      return this.serverErrors[field] || ''
    },
    invalidClass(field) {
      return { 'nz-input-error': !!this.errorFor(field) }
    },
    submit() {
      if (this.saving) return
      this.errors = validateResourceForm(this.form, { isNew: this.isNew })
      if (Object.keys(this.errors).length) return
      const body = this.isNew ? buildCreatePayload(this.form) : buildPatch(this.form, formFromResource(this.resource))
      this.$emit('save', body)
    }
  }
}
</script>
