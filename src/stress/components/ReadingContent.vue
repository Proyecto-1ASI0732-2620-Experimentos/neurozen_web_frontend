<template>
  <div class="reading-content space-y-4 text-[1.0625rem] leading-relaxed text-foreground-light" data-testid="reading-content">
    <template v-for="(block, i) in blocks" :key="i">
      <h3 v-if="block.type === 'heading'" class="pt-2 text-lg font-bold text-primary">{{ block.text }}</h3>
      <ol v-else-if="block.type === 'list' && block.ordered" class="list-decimal space-y-1.5 pl-6">
        <li v-for="(item, j) in block.items" :key="j">{{ item }}</li>
      </ol>
      <ul v-else-if="block.type === 'list'" class="list-disc space-y-1.5 pl-6">
        <li v-for="(item, j) in block.items" :key="j">{{ item }}</li>
      </ul>
      <p v-else class="whitespace-pre-line">{{ block.text }}</p>
    </template>
  </div>
</template>

<script>
/**
 * ReadingContent - Texto de lecturas y ejercicios con párrafos, subtítulos y listas.
 * El texto se muestra siempre con interpolación ({{ }}): el contenido nunca se interpreta como HTML.
 */
import { parseReadingContent } from '../../utils/readingContent.js'

export default {
  name: 'ReadingContent',
  props: { content: { type: String, default: '' } },
  computed: {
    blocks() {
      return parseReadingContent(this.content)
    }
  }
}
</script>
