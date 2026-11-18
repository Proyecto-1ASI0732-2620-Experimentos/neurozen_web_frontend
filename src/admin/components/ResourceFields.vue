<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <div class="sm:col-span-2">
      <label class="nz-label" :for="`${idPrefix}-title`">{{ $t('adminResources.fields.title') }}</label>
      <input :id="`${idPrefix}-title`" :value="modelValue.title" class="nz-input" :class="{ 'nz-input-error': errors.title }" maxlength="200" @input="set('title', $event.target.value)" />
      <p v-if="errors.title" class="nz-field-error">{{ errors.title }}</p>
    </div>
    <div class="sm:col-span-2">
      <label class="nz-label" :for="`${idPrefix}-contentUrl`">{{ $t('adminResources.fields.contentUrl') }}</label>
      <input :id="`${idPrefix}-contentUrl`" :value="modelValue.contentUrl" type="url" class="nz-input" :class="{ 'nz-input-error': errors.contentUrl }" maxlength="500"
        placeholder="https://www.youtube.com/watch?v=…" @input="set('contentUrl', $event.target.value)" />
      <p v-if="errors.contentUrl" class="nz-field-error">{{ errors.contentUrl }}</p>
    </div>
    <div>
      <label class="nz-label" :for="`${idPrefix}-duration`">{{ $t('adminResources.fields.duration') }}</label>
      <input :id="`${idPrefix}-duration`" :value="modelValue.duration" type="number" min="0" max="600" step="1" class="nz-input" :class="{ 'nz-input-error': errors.duration }"
        @input="set('duration', $event.target.value === '' ? '' : Number($event.target.value))" />
      <p v-if="errors.duration" class="nz-field-error">{{ errors.duration }}</p>
    </div>
    <div>
      <label class="nz-label" :for="`${idPrefix}-thumbnail`">{{ $t('adminResources.fields.thumbnail') }}</label>
      <input :id="`${idPrefix}-thumbnail`" :value="modelValue.thumbnail" type="url" class="nz-input" :class="{ 'nz-input-error': errors.thumbnail }" maxlength="500"
        :placeholder="$t('adminResources.thumbnailHint')" @input="set('thumbnail', $event.target.value)" />
      <p v-if="errors.thumbnail" class="nz-field-error">{{ errors.thumbnail }}</p>
    </div>
    <div class="sm:col-span-2">
      <label class="nz-label" :for="`${idPrefix}-description`">{{ $t('adminResources.fields.description') }}</label>
      <textarea :id="`${idPrefix}-description`" :value="modelValue.description" rows="3" maxlength="1000" class="nz-input" :class="{ 'nz-input-error': errors.description }"
        @input="set('description', $event.target.value)"></textarea>
      <p v-if="errors.description" class="nz-field-error">{{ errors.description }}</p>
    </div>
    <div class="sm:col-span-2">
      <label class="nz-label" :for="`${idPrefix}-content`">{{ $t('adminResources.fields.content') }}</label>
      <textarea :id="`${idPrefix}-content`" :value="modelValue.content" rows="3" class="nz-input" :class="{ 'nz-input-error': errors.content }" @input="set('content', $event.target.value)"></textarea>
      <p v-if="errors.content" class="nz-field-error">{{ errors.content }}</p>
    </div>
    <div>
      <label class="nz-label" :for="`${idPrefix}-author`">{{ $t('adminResources.fields.author') }}</label>
      <input :id="`${idPrefix}-author`" :value="modelValue.author" class="nz-input" :class="{ 'nz-input-error': errors.author }" @input="set('author', $event.target.value)" />
      <p v-if="errors.author" class="nz-field-error">{{ errors.author }}</p>
    </div>
    <div>
      <label class="nz-label" :for="`${idPrefix}-tags`">{{ $t('adminResources.fields.tags') }}</label>
      <input :id="`${idPrefix}-tags`" :value="modelValue.tags" class="nz-input" :class="{ 'nz-input-error': errors.tags }" :placeholder="$t('adminResources.tagsHint')" @input="set('tags', $event.target.value)" />
      <p v-if="errors.tags" class="nz-field-error">{{ errors.tags }}</p>
    </div>
  </div>
</template>

<script>
/** Campos comunes de un recurso (crear y editar) en el panel admin */
export default {
  name: 'ResourceFields',
  props: {
    modelValue: { type: Object, required: true },
    errors: { type: Object, default: () => ({}) },
    idPrefix: { type: String, required: true }
  },
  emits: ['update:modelValue'],
  methods: {
    set(field, value) {
      this.$emit('update:modelValue', { ...this.modelValue, [field]: value })
    }
  }
}
</script>
