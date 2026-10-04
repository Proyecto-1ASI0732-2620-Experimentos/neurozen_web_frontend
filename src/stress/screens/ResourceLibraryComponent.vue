<template>
  <div class="nz-page max-w-6xl">
    <PageHeader :title="$t('stress.management.resourceLibrary.title')" :subtitle="$t('stress.management.resourceLibrary.subtitle')" />

    <!-- Búsqueda y filtros -->
    <div class="mb-6 space-y-4">
      <div class="relative">
        <i class="fas fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-light" aria-hidden="true"></i>
        <input v-model="searchQuery" type="search" class="nz-input h-12 pl-11 text-base" :placeholder="$t('stress.management.resourceLibrary.search')"
          :aria-label="$t('stress.management.resourceLibrary.search')" @input="onSearch" />
      </div>
      <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" :aria-label="$t('stress.management.resourceLibrary.filter')">
        <button v-for="category in categories" :key="category.value" type="button"
          class="inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
          :class="selectedCategory === category.value ? 'border-primary bg-primary text-white' : 'border-[#D6D2C7] bg-white text-foreground-light hover:border-primary'"
          :aria-pressed="selectedCategory === category.value" @click="selectedCategory = category.value">
          <i :class="category.icon" aria-hidden="true"></i>{{ category.label }}
          <span class="text-xs opacity-75">{{ countFor(category.value) }}</span>
        </button>
      </div>
    </div>

    <div v-if="isDemo && !loading" class="mb-6 flex gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
      <i class="fas fa-circle-info mt-0.5" aria-hidden="true"></i>{{ $t('stress.management.resourceLibrary.demoNotice') }}
    </div>

    <LoadingState v-if="loading" :message="$t('common.loadingResources')" />
    <ErrorState v-else-if="error" :message="error" @retry="loadResources" />

    <template v-else>
      <div v-if="hasFilters" class="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-light" role="status">
        <p>{{ $tc('stress.management.resourceLibrary.resultsSummary', filteredResources.length, { count: filteredResources.length }) }}</p>
        <button type="button" class="font-semibold text-primary hover:underline" @click="clearFilters">{{ $t('stress.management.resourceLibrary.clearFilters') }}</button>
      </div>

      <EmptyState v-if="!filteredResources.length" icon="fas fa-magnifying-glass" :title="$t('stress.management.resourceLibrary.noResults')" :message="$t('stress.management.resourceLibrary.noResultsDescription')">
        <button type="button" class="nz-btn-secondary mt-2" @click="clearFilters">{{ $t('stress.management.resourceLibrary.clearFilters') }}</button>
      </EmptyState>

      <ul v-else class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="resource in filteredResources" :key="resource.id">
          <router-link :to="{ name: 'ResourceDetail', params: { id: resource.id } }" class="nz-card group flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md" @click="remember(resource)">
            <div class="relative aspect-video bg-primary/5">
              <img :data-fallback="placeholderFor(resource.category)" :src="resource.thumbnail" alt="" class="h-full w-full object-cover" loading="lazy" />
              <span class="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-primary">
                <i :class="iconFor(resource.category)" aria-hidden="true"></i>{{ categoryLabel(resource.category) }}
              </span>
              <span class="absolute bottom-3 right-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-white">{{ resource.durationMinutes }} min</span>
            </div>
            <div class="flex flex-1 flex-col p-4">
              <h2 class="font-bold text-foreground-light group-hover:text-primary">{{ text.title(resource) }}</h2>
              <p v-if="resource.author" class="text-xs font-semibold text-muted-light">{{ resource.author }}</p>
              <p class="mt-2 line-clamp-2 text-sm text-muted-light">{{ text.description(resource) }}</p>
              <div v-if="resource.tags.length" class="mt-auto flex flex-wrap gap-1.5 pt-3">
                <span v-for="tag in resource.tags.slice(0, 3)" :key="tag" class="rounded-full bg-primary/5 px-2 py-0.5 text-xs text-primary">{{ text.tag(tag) }}</span>
              </div>
            </div>
          </router-link>
        </li>
      </ul>

      <section v-if="recentlyViewed.length && !hasFilters" class="mt-10" aria-labelledby="recent-title">
        <h2 id="recent-title" class="mb-3 text-lg font-bold text-foreground-light">{{ $t('stress.management.resourceLibrary.recentlyViewed') }}</h2>
        <div class="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <router-link v-for="r in recentlyViewed" :key="r.id" :to="{ name: 'ResourceDetail', params: { id: r.id } }" class="nz-card flex w-64 shrink-0 items-center gap-3 p-2 hover:border-primary/40">
            <img :data-fallback="placeholderFor(r.category)" :src="r.thumbnail" alt="" class="h-14 w-20 rounded-md object-cover" />
            <span class="min-w-0 text-sm font-semibold text-foreground-light"><span class="line-clamp-2">{{ text.title(r) }}</span></span>
          </router-link>
        </div>
      </section>
    </template>
  </div>
</template>

<script>
/**
 * ResourceLibraryComponent - Biblioteca con búsqueda (debounce) y filtros.
 * Corrige la navegación al detalle (antes /resources/:id caía en el catch-all),
 * la duración "900m" del mock y el bucle de errores de imagen.
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import { ResourceLibraryService } from '../../services/ResourceLibraryService.js'
import { readUserData, writeUserData } from '../../services/session.js'
import { useResourceText } from '../../composables/useResourceText.js'

const RECENT_KEY = 'neurozen_recent_resources'
export const CATEGORY_ICONS = { audio: 'fas fa-headphones', video: 'fas fa-circle-play', reading: 'fas fa-book-open', exercises: 'fas fa-dumbbell' }

export default {
  name: 'ResourceLibraryComponent',
  components: { PageHeader, LoadingState, ErrorState, EmptyState },
  data() {
    return {
      service: new ResourceLibraryService(),
      resources: [],
      isDemo: false,
      loading: true,
      error: '',
      searchQuery: '',
      appliedQuery: '',
      selectedCategory: 'all',
      recentlyViewed: readUserData(RECENT_KEY, []),
      searchTimeout: null
    }
  },
  computed: {
    text() {
      return useResourceText(this.$i18n)
    },
    categories() {
      return ['all', 'audio', 'video', 'reading', 'exercises'].map((value) => ({
        value,
        label: this.$t(`stress.management.resourceLibrary.categories.${value}`),
        icon: CATEGORY_ICONS[value] || 'fas fa-table-cells-large'
      }))
    },
    hasFilters() {
      return !!this.appliedQuery.trim() || this.selectedCategory !== 'all'
    },
    filteredResources() {
      const q = this.appliedQuery.toLowerCase().trim()
      return this.resources.filter((r) => {
        if (this.selectedCategory !== 'all' && r.category !== this.selectedCategory) return false
        if (!q) return true
        const haystack = [this.text.title(r), this.text.description(r), r.author, ...r.tags.map(this.text.tag)].join(' ').toLowerCase()
        return haystack.includes(q)
      })
    }
  },
  created() {
    this.loadResources()
  },
  beforeUnmount() {
    clearTimeout(this.searchTimeout)
  },
  methods: {
    async loadResources() {
      this.loading = true
      this.error = ''
      try {
        const { items, isDemo } = await this.service.getResources()
        this.resources = items
        this.isDemo = isDemo
      } catch (error) {
        this.error = this.$t('common.errorLoadingResources')
      } finally {
        this.loading = false
      }
    },
    onSearch() {
      clearTimeout(this.searchTimeout)
      this.searchTimeout = setTimeout(() => { this.appliedQuery = this.searchQuery }, 300)
    },
    clearFilters() {
      this.searchQuery = ''
      this.appliedQuery = ''
      this.selectedCategory = 'all'
    },
    countFor(category) {
      return category === 'all' ? this.resources.length : this.resources.filter((r) => r.category === category).length
    },
    categoryLabel(category) {
      return this.$t(`stress.management.resourceLibrary.categories.${category}`)
    },
    iconFor(category) {
      return CATEGORY_ICONS[category] || 'fas fa-file'
    },
    placeholderFor(category) {
      return `/images/resource-${category === 'exercises' ? 'exercise' : category}.svg`
    },
    remember(resource) {
      const entry = { id: resource.id, title: resource.title, description: resource.description, category: resource.category, thumbnail: resource.thumbnail }
      this.recentlyViewed = [entry, ...this.recentlyViewed.filter((r) => String(r.id) !== String(resource.id))].slice(0, 6)
      writeUserData(RECENT_KEY, this.recentlyViewed)
    }
  }
}
</script>
