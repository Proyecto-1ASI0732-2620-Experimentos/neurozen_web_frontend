<template>
  <div class="nz-page">
    <LoadingState v-if="loading" :message="$t('common.loadingResource')" />
    <template v-else-if="error">
      <PageHeader :title="$t('stress.management.resourceLibrary.title')" back="/stress/resources" />
      <ErrorState :title="$t('resource.notFoundTitle')" :message="error" @retry="loadResource" />
    </template>

    <article v-else-if="resource">
      <PageHeader :title="text.title(resource)" :subtitle="resource.author ? $t('resource.by', { author: resource.author }) : ''" back="/stress/resources">
        <template #actions>
          <button type="button" class="nz-btn-secondary" :aria-pressed="isFavorite" @click="toggleFavorite">
            <i :class="isFavorite ? 'fas fa-heart text-red-600' : 'far fa-heart'" aria-hidden="true"></i>{{ isFavorite ? $t('resource.saved') : $t('resource.save') }}
          </button>
          <button type="button" class="nz-btn-secondary" @click="shareResource">
            <i class="fas fa-share-nodes" aria-hidden="true"></i>{{ $t('resource.share') }}
          </button>
        </template>
      </PageHeader>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div class="space-y-6">
          <!-- Contenido / reproductor -->
          <div class="nz-card overflow-hidden">
            <div v-if="resource.youTubeId" class="aspect-video bg-black">
              <iframe class="h-full w-full" :src="`https://www.youtube-nocookie.com/embed/${resource.youTubeId}`" :title="text.title(resource)"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
            </div>
            <video v-else-if="mediaType === 'video'" class="aspect-video w-full bg-black" :src="resource.contentUrl" :poster="resource.thumbnail" controls preload="metadata" @ended="markAsCompleted"></video>
            <div v-else class="relative aspect-video bg-primary/5">
              <img :data-fallback="placeholderFor(resource.category)" :src="resource.thumbnail" alt="" class="h-full w-full object-cover" />
            </div>
            <div v-if="mediaType === 'audio'" class="p-4">
              <audio class="w-full" :src="resource.contentUrl" controls preload="metadata" @ended="markAsCompleted">{{ $t('resource.noAudioSupport') }}</audio>
            </div>
          </div>

          <section>
            <h2 class="mb-2 text-lg font-bold text-foreground-light">{{ $t('resource.description') }}</h2>
            <p class="leading-relaxed text-foreground-light">{{ text.description(resource) }}</p>
            <!-- Texto plano por párrafos (antes v-html sin sanitizar) -->
            <div v-if="resource.content" class="mt-4 space-y-3 leading-relaxed text-foreground-light">
              <p v-for="(paragraph, i) in paragraphs" :key="i">{{ paragraph }}</p>
            </div>
          </section>

          <div v-if="resource.tags.length" class="flex flex-wrap gap-2">
            <span v-for="tag in resource.tags" :key="tag" class="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">{{ text.tag(tag) }}</span>
          </div>
        </div>

        <aside class="space-y-6">
          <div class="nz-card space-y-4 p-5">
            <dl class="grid grid-cols-2 gap-3 text-sm">
              <div><dt class="text-muted-light">{{ $t('resource.type') }}</dt><dd class="font-bold">{{ $t(`stress.management.resourceLibrary.categories.${resource.category}`) }}</dd></div>
              <div><dt class="text-muted-light">{{ $t('resource.duration') }}</dt><dd class="font-bold">{{ resource.durationMinutes }} min</dd></div>
            </dl>
            <a v-if="resource.contentUrl && !isPlayable" :href="resource.contentUrl" target="_blank" rel="noopener noreferrer" class="nz-btn-primary w-full">
              <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>{{ resource.category === 'reading' ? $t('resource.openArticle') : $t('resource.openResource') }}
            </a>
            <button v-if="!isCompleted" type="button" class="nz-btn-secondary w-full" @click="markAsCompleted">
              <i class="fas fa-check" aria-hidden="true"></i>{{ $t('resource.markCompleted') }}
            </button>
            <p v-else class="flex items-center justify-center gap-2 rounded-lg bg-green-50 py-2.5 text-sm font-bold text-green-800">
              <i class="fas fa-circle-check" aria-hidden="true"></i>{{ $t('resource.completed') }}
            </p>
          </div>

          <section v-if="related.length" aria-labelledby="related-title">
            <h2 id="related-title" class="mb-3 font-bold text-foreground-light">{{ $t('resource.related') }}</h2>
            <ul class="space-y-3">
              <li v-for="item in related" :key="item.id">
                <router-link :to="{ name: 'ResourceDetail', params: { id: item.id } }" class="nz-card flex items-center gap-3 p-2 hover:border-primary/40">
                  <img :data-fallback="placeholderFor(item.category)" :src="item.thumbnail" alt="" class="h-14 w-20 shrink-0 rounded-md object-cover" />
                  <span class="min-w-0">
                    <span class="line-clamp-2 text-sm font-semibold text-foreground-light">{{ text.title(item) }}</span>
                    <span class="text-xs text-muted-light">{{ item.durationMinutes }} min</span>
                  </span>
                </router-link>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </article>
  </div>
</template>

<script>
/**
 * ResourceDetailComponent - Detalle de un recurso.
 * Usa los datos normalizados por el servicio (antes esperaba campos que la API
 * no envía y no mostraba ningún reproductor), soporta YouTube, audio y video,
 * recarga al cambiar de recurso y guarda favoritos/completados por usuario.
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import { ResourceLibraryService } from '../../services/ResourceLibraryService.js'
import { readUserData, writeUserData } from '../../services/session.js'
import { useResourceText } from '../../composables/useResourceText.js'
import { toast } from '../../composables/useToast.js'

const FAVORITES_KEY = 'neurozen_favorites'
const COMPLETED_KEY = 'neurozen_completed'
const sameId = (a, b) => String(a) === String(b)

export default {
  name: 'ResourceDetailComponent',
  components: { PageHeader, LoadingState, ErrorState },
  data() {
    return { service: new ResourceLibraryService(), resource: null, related: [], loading: true, error: '', isFavorite: false, isCompleted: false }
  },
  computed: {
    text() {
      return useResourceText(this.$i18n)
    },
    mediaType() {
      const url = String(this.resource?.contentUrl || '').toLowerCase()
      if (/\.(mp3|wav|ogg|m4a|aac)(\?|$)/.test(url)) return 'audio'
      if (/\.(mp4|webm|mov)(\?|$)/.test(url)) return 'video'
      return null
    },
    isPlayable() {
      return !!(this.resource?.youTubeId || this.mediaType)
    },
    paragraphs() {
      return String(this.resource?.content || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    }
  },
  watch: {
    '$route.params.id'(id) {
      if (id) this.loadResource()
    }
  },
  created() {
    this.loadResource()
  },
  methods: {
    async loadResource() {
      this.loading = true
      this.error = ''
      try {
        this.resource = await this.service.getResourceById(this.$route.params.id)
        this.isFavorite = readUserData(FAVORITES_KEY, []).some((id) => sameId(id, this.resource.id))
        this.isCompleted = readUserData(COMPLETED_KEY, []).some((id) => sameId(id, this.resource.id))
        this.related = await this.service.getRelatedResources(this.resource)
      } catch (error) {
        this.resource = null
        this.error = this.$t('resource.notFoundMessage')
      } finally {
        this.loading = false
      }
    },
    toggleFavorite() {
      const list = readUserData(FAVORITES_KEY, []).filter((id) => !sameId(id, this.resource.id))
      this.isFavorite = !this.isFavorite
      if (this.isFavorite) list.push(this.resource.id)
      writeUserData(FAVORITES_KEY, list)
      toast.success(this.isFavorite ? this.$t('resource.addedFavorite') : this.$t('resource.removedFavorite'), { duration: 2500 })
    },
    markAsCompleted() {
      if (this.isCompleted) return
      const list = readUserData(COMPLETED_KEY, [])
      list.push(this.resource.id)
      writeUserData(COMPLETED_KEY, list)
      this.isCompleted = true
      toast.success(this.$t('resource.markedCompleted'), { duration: 2500 })
    },
    async shareResource() {
      const url = window.location.href
      try {
        if (navigator.share) {
          await navigator.share({ title: this.text.title(this.resource), url })
        } else {
          await navigator.clipboard.writeText(url)
          toast.success(this.$t('resource.linkCopied'), { duration: 2500 })
        }
      } catch (error) {
        if (error.name !== 'AbortError') toast.error(this.$t('resource.shareError'))
      }
    },
    placeholderFor(category) {
      return `/images/resource-${category === 'exercises' ? 'exercise' : category}.svg`
    },
  }
}
</script>
