<template>
  <div>
    <div class="nz-input flex min-h-[2.75rem] flex-wrap items-center gap-1.5 py-1.5" :class="{ 'nz-input-error': invalid }">
      <span v-for="tag in modelValue" :key="tag" class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
        {{ tag }}
        <button type="button" class="rounded-full px-0.5 hover:bg-primary/20" :aria-label="$t('adminResources.removeTag', { tag })" @click="remove(tag)">
          <i class="fas fa-xmark text-[10px]" aria-hidden="true"></i>
        </button>
      </span>
      <input :id="inputId" v-model="draft" type="text" class="min-w-[8rem] flex-1 border-0 bg-transparent p-1 text-sm focus:outline-none focus:ring-0"
        :maxlength="maxLength" :placeholder="$t('adminResources.tagsHint')" :aria-describedby="describedBy"
        @keydown.enter.prevent="commit" @keydown.tab="commitOnTab" @blur="commit" @keydown.backspace="removeLastIfEmpty" @input="splitOnComma" />
    </div>
  </div>
</template>

<script>
/** Etiquetas como chips: Enter, coma o salir del campo agregan; × o Retroceso (campo vacío) quitan. */
import { addTag } from '../resourceForm.js'
import { RESOURCE_LIMITS } from '../../services/AdminResourceService.js'

export default {
  name: 'TagsInput',
  props: {
    modelValue: { type: Array, required: true },
    inputId: { type: String, required: true },
    invalid: { type: Boolean, default: false },
    describedBy: { type: String, default: null }
  },
  emits: ['update:modelValue'],
  data() {
    return { draft: '', maxLength: RESOURCE_LIMITS.tagMax }
  },
  methods: {
    commit() {
      const next = addTag(this.modelValue, this.draft)
      if (next !== this.modelValue) this.$emit('update:modelValue', next)
      this.draft = ''
    },
    commitOnTab() {
      if (this.draft.trim()) this.commit()
    },
    splitOnComma() {
      if (this.draft.includes(',')) {
        const parts = this.draft.split(',')
        const rest = parts.pop()
        const next = parts.reduce((tags, part) => addTag(tags, part), this.modelValue)
        if (next !== this.modelValue) this.$emit('update:modelValue', next)
        this.draft = rest
      }
    },
    remove(tag) {
      this.$emit('update:modelValue', this.modelValue.filter((t) => t !== tag))
    },
    removeLastIfEmpty() {
      if (!this.draft && this.modelValue.length) this.remove(this.modelValue[this.modelValue.length - 1])
    }
  }
}
</script>
