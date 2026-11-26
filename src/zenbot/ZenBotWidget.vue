<template>
  <div class="zenbot">
    <!-- Botón flotante -->
    <button
      v-show="!open"
      ref="launcher"
      type="button"
      class="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary-strong"
      :aria-label="$t('zenbot.open')"
      aria-haspopup="dialog"
      @click="toggle(true)"
    >
      <i class="fas fa-spa text-xl" aria-hidden="true"></i>
      <span v-if="!greeted" class="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-amber-400" aria-hidden="true"></span>
    </button>

    <!-- Ventana de chat (no modal: la página sigue disponible) -->
    <section
      v-if="open"
      class="fixed inset-x-2 bottom-2 z-50 flex max-h-[min(40rem,calc(100dvh-1rem))] flex-col overflow-hidden rounded-2xl border border-[#E3DED2] bg-white shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-h-[min(40rem,calc(100vh-var(--header-height)-1.5rem))] sm:w-[25rem]"
      role="dialog"
      aria-labelledby="zenbot-title"
      aria-describedby="zenbot-disclaimer"
      data-testid="zenbot"
      @keydown.esc="toggle(false)"
    >
      <header class="flex shrink-0 items-center gap-3 bg-primary px-4 py-3 text-white">
        <span class="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"><i class="fas fa-spa" aria-hidden="true"></i></span>
        <div class="min-w-0 flex-1">
          <h2 id="zenbot-title" class="font-bold leading-tight">ZenBot</h2>
          <p class="text-sm text-white/90">{{ $t('zenbot.subtitle') }}</p>
        </div>
        <button type="button" class="h-10 w-10 rounded-lg hover:bg-white/15" :aria-label="$t('zenbot.restart')" :title="$t('zenbot.restart')" @click="restart"><i class="fas fa-rotate-right" aria-hidden="true"></i></button>
        <button type="button" class="h-10 w-10 rounded-lg hover:bg-white/15" :aria-label="$t('zenbot.close')" :title="$t('zenbot.close')" @click="toggle(false)"><i class="fas fa-xmark" aria-hidden="true"></i></button>
      </header>

      <div ref="scroller" class="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#F7F3EA] px-3 py-4 sm:px-4" role="log" aria-live="polite" aria-relevant="additions" :aria-label="$t('zenbot.history')">
        <div v-for="msg in messages" :key="msg.id" class="flex" :class="msg.from === 'user' ? 'justify-end' : 'justify-start'">
          <!-- Mensaje del usuario -->
          <div v-if="msg.from === 'user'" class="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-white">
            <span class="sr-only">{{ $t('zenbot.you') }}: </span><p class="whitespace-pre-line break-words">{{ msg.text }}</p>
          </div>

          <!-- Mensaje de ZenBot -->
          <div v-else class="w-full max-w-[92%] rounded-2xl rounded-bl-sm px-3.5 py-3 text-sm leading-relaxed"
            :class="msg.crisis ? 'border-2 border-red-300 bg-red-50 text-red-950' : msg.check ? 'border border-amber-300 bg-amber-50 text-amber-950' : 'bg-white text-foreground-light shadow-sm'">
            <span class="sr-only">ZenBot: </span>
            <p class="whitespace-pre-line">{{ $t(msg.textKey) }}</p>
            <p v-if="msg.supportKey" class="mt-2 whitespace-pre-line">{{ $t(msg.supportKey) }}</p>

            <!-- Seguridad (nivel 3 o comprobación): solo recursos de emergencia ya configurados en NeuroZen -->
            <div v-if="msg.crisis || msg.check" class="mt-3 rounded-lg bg-white/80 p-3" :role="msg.crisis ? 'alert' : undefined">
              <p class="font-bold">{{ $t('zenbot.crisis.title') }}</p>
              <ul class="mt-1 space-y-1.5 font-semibold">
                <li><a href="tel:113" class="inline-flex min-h-[44px] items-center gap-2 underline"><i class="fas fa-phone" aria-hidden="true"></i>{{ $t('zenbot.crisis.line113') }}</a></li>
                <li><a href="tel:106" class="inline-flex min-h-[44px] items-center gap-2 underline"><i class="fas fa-truck-medical" aria-hidden="true"></i>{{ $t('zenbot.crisis.samu') }}</a></li>
              </ul>
              <p class="mt-2 text-sm">{{ $t('zenbot.crisis.region') }}</p>
              <p class="mt-1 text-sm">{{ $t('zenbot.crisis.limits') }}</p>
            </div>

            <!-- Recursos reales de la biblioteca -->
            <div v-if="msg.resourceState" class="mt-3">
              <p v-if="msg.resourceState === 'loading'" class="flex items-center gap-2 text-muted-light" role="status">
                <span class="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" aria-hidden="true"></span>{{ $t('zenbot.resources.loading') }}
              </p>
              <p v-else-if="msg.resourceState === 'none'" class="text-foreground-light">{{ $t('zenbot.resources.none') }}</p>
              <div v-else-if="msg.resourceState === 'error'" class="space-y-2">
                <p class="text-red-800">{{ $t('zenbot.resources.error') }}</p>
                <button type="button" class="nz-btn-secondary px-3 py-2" @click="loadResourcesFor(msg)"><i class="fas fa-rotate-right" aria-hidden="true"></i>{{ $t('common.retry') }}</button>
              </div>
              <template v-else-if="msg.resources && msg.resources.length">
                <p class="mb-2 font-semibold">{{ $t('zenbot.resources.intro') }}</p>
                <ul class="space-y-2" :aria-label="$t('zenbot.resources.listLabel')">
                  <li v-for="r in msg.resources" :key="r.id" class="flex gap-3 rounded-xl border border-[#E3DED2] bg-white p-2.5" data-testid="zenbot-resource">
                    <img :src="r.thumbnail || r.fallbackThumbnail" :data-fallback="r.fallbackThumbnail" alt="" class="h-16 w-20 shrink-0 rounded-lg bg-[#F1E9D4] object-cover" loading="lazy" />
                    <div class="min-w-0 flex-1">
                      <p class="line-clamp-2 font-bold text-foreground-light">{{ resourceText.title(r) }}</p>
                      <p v-if="r.description" class="line-clamp-2 text-sm text-muted-light">{{ resourceText.description(r) }}</p>
                      <p class="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-light">
                        <span><i :class="categoryIcon(r.category)" class="mr-1" aria-hidden="true"></i>{{ $t(`stress.management.resourceLibrary.categories.${r.category}`) }}</span>
                        <span v-if="r.durationMinutes">· {{ $t('zenbot.resources.minutes', { n: r.durationMinutes }) }}</span>
                      </p>
                      <router-link :to="{ name: 'ResourceDetail', params: { id: r.id } }" class="mt-1.5 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-white hover:bg-primary-strong"
                        :aria-label="`${r.category === 'video' ? $t('zenbot.resources.watch') : $t('zenbot.resources.open')}: ${resourceText.title(r)}`" @click="toggle(false)">
                        <i :class="r.category === 'video' ? 'fas fa-play' : 'fas fa-arrow-right'" aria-hidden="true"></i>{{ r.category === 'video' ? $t('zenbot.resources.watch') : $t('zenbot.resources.open') }}
                      </router-link>
                    </div>
                  </li>
                </ul>
              </template>
            </div>

            <p v-if="msg.followUpKey" class="mt-3 font-semibold">{{ $t(msg.followUpKey) }}</p>

            <!-- Accesos a funcionalidades reales -->
            <div v-if="msg.actions && msg.actions.length" class="mt-3 flex flex-wrap gap-1.5" role="group" :aria-label="$t('zenbot.actionsLabel')">
              <router-link v-for="a in msg.actions" :key="a.id" :to="a.to" :data-action="a.id"
                class="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-primary/40 bg-white px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/5"
                @click="toggle(false)">
                <i :class="a.icon" class="text-xs" aria-hidden="true"></i>{{ $t(a.label) }}
              </router-link>
            </div>

            <!-- Opciones iniciales (solo en la bienvenida) -->
            <div v-if="msg.kind === 'welcome' && showStarters" class="mt-3 grid gap-1.5" role="group" :aria-label="$t('zenbot.startersLabel')">
              <button v-for="s in starters" :key="s.id" type="button" :data-starter="s.id"
                class="min-h-[40px] rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-left text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
                :disabled="typing" @click="sendStarter(s)">
                {{ $t(`zenbot.starters.${s.id}`) }}
              </button>
            </div>
          </div>
        </div>
        <p v-if="typing" class="flex items-center gap-2 text-sm text-muted-light" role="status">
          <span class="flex gap-1" aria-hidden="true"><span class="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60"></span><span class="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]"></span><span class="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]"></span></span>
          {{ $t('zenbot.typing') }}
        </p>
      </div>

      <form class="flex shrink-0 items-center gap-2 border-t border-[#EEE9DD] bg-white p-3" @submit.prevent="send(draft)">
        <button type="button" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10" :aria-label="$t('zenbot.showOptions')" :title="$t('zenbot.showOptions')" :aria-expanded="showStarters" @click="toggleStarters">
          <i class="fas fa-list-ul" aria-hidden="true"></i>
        </button>
        <label for="zenbot-input" class="sr-only">{{ $t('zenbot.inputLabel') }}</label>
        <input id="zenbot-input" ref="input" v-model="draft" type="text" maxlength="500" autocomplete="off" enterkeyhint="send" class="nz-input min-w-0 flex-1 rounded-full" :placeholder="$t('zenbot.placeholder')" />
        <button type="submit" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-strong disabled:bg-[#4A6B5F]" :disabled="!draft.trim() || typing" :aria-label="$t('zenbot.send')">
          <i class="fas fa-paper-plane" aria-hidden="true"></i>
        </button>
      </form>
      <p id="zenbot-disclaimer" class="shrink-0 bg-white px-4 pb-3 text-xs leading-snug text-muted-light">{{ $t('zenbot.disclaimer') }}</p>
    </section>
  </div>
</template>

<script>
/**
 * ZenBotWidget - Asistente de bienestar para trabajadores (solo rol USER, ver App.vue).
 *
 * - Bienvenida + 10 opciones iniciales; texto libre desde el principio.
 * - Respuestas de zenbotEngine (reglas en el navegador, sin IA externa ni envío de mensajes a terceros).
 * - Contexto conversacional (tema, pregunta pendiente, recursos ya mostrados) en `context`.
 * - Recomienda recursos REALES de la biblioteca (ResourceLibraryService → GET /api/v1/resource-libraries),
 *   ordenados por relevancia en zenbotResources.js. Si la API falla: mensaje claro y «Reintentar».
 * - Seguridad: ante riesgo, solo las líneas de ayuda ya configuradas en NeuroZen (Línea 113, SAMU 106) y acceso
 *   a profesionales; se aclara que ZenBot no puede llamar a emergencias.
 * - Privacidad: la conversación vive en sessionStorage (se borra al cerrar el navegador o la sesión) y es
 *   propia de cada usuario.
 */
import { respond, initialContext, STARTERS } from './zenbotEngine.js'
import { rankResources, toCard } from './zenbotResources.js'
import { ResourceLibraryService } from '../services/ResourceLibraryService.js'
import { useResourceText } from '../composables/useResourceText.js'
import { userStorageKey } from '../services/session.js'

const STORAGE = 'neurozen_zenbot'
const MAX_MESSAGES = 50
const CATEGORY_ICONS = { video: 'fas fa-circle-play', audio: 'fas fa-headphones', reading: 'fas fa-book-open', exercises: 'fas fa-person-walking' }
let seq = 0

export default {
  name: 'ZenBotWidget',
  data() {
    return {
      open: false,
      greeted: false,
      typing: false,
      draft: '',
      messages: [],
      context: initialContext(),
      showStarters: true,
      starters: STARTERS,
      catalog: null,
      lastSent: { text: '', at: 0 },
      timers: []
    }
  },
  computed: {
    resourceText() {
      return useResourceText(this.$i18n)
    }
  },
  created() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(userStorageKey(STORAGE)) || 'null')
      if (saved && Array.isArray(saved.messages)) {
        // Un recurso que quedó "cargando" al recargar la página se vuelve a pedir
        this.messages = saved.messages.map((m) => (m.resourceState === 'loading' ? { ...m, resourceState: 'error' } : m))
        this.context = { ...initialContext(), ...(saved.context || {}) }
        this.showStarters = saved.showStarters ?? this.messages.length <= 1
        this.greeted = this.messages.length > 0
      }
    } catch {
      /* conversación nueva */
    }
  },
  beforeUnmount() {
    this.timers.forEach(clearTimeout)
  },
  methods: {
    toggle(value) {
      this.open = value
      if (value) {
        if (!this.messages.length) this.welcome()
        this.greeted = true
        this.$nextTick(() => {
          this.scrollDown()
          this.$refs.input && this.$refs.input.focus()
        })
      } else {
        this.$nextTick(() => this.$refs.launcher && this.$refs.launcher.focus())
      }
    },
    welcome() {
      this.showStarters = true
      this.push({ from: 'bot', kind: 'welcome', textKey: 'zenbot.answers.welcome' })
    },
    toggleStarters() {
      if (!this.messages.some((m) => m.kind === 'welcome')) this.welcome()
      else this.showStarters = !this.showStarters
      this.persist()
      this.$nextTick(this.scrollDown)
    },
    push(msg) {
      const full = { id: `${Date.now()}-${++seq}`, ...msg }
      this.messages.push(full)
      if (this.messages.length > MAX_MESSAGES) this.messages = this.messages.slice(-MAX_MESSAGES)
      this.persist()
      this.$nextTick(this.scrollDown)
      return this.messages.find((m) => m.id === full.id)
    },
    sendStarter(starter) {
      this.handle(this.$t(`zenbot.starters.${starter.id}`), { starter: starter.id })
    },
    send(text) {
      this.handle(text)
    },
    handle(text, options = {}) {
      const message = String(text || '').trim()
      if ((!message && !options.starter) || this.typing) return
      // Evita mensajes duplicados (doble clic o doble Enter)
      const now = Date.now()
      if (message === this.lastSent.text && now - this.lastSent.at < 1500) return
      this.lastSent = { text: message, at: now }
      this.draft = ''
      this.showStarters = false
      this.push({ from: 'user', text: message.slice(0, 500) })

      const reply = respond(message, this.context, options)
      this.context = reply.context
      this.typing = true
      // Pausa breve para leerse como conversación; ante riesgo, la respuesta es casi inmediata
      const timer = setTimeout(() => {
        this.typing = false
        const msg = this.push({
          from: 'bot',
          intent: reply.intent,
          textKey: reply.textKey,
          supportKey: reply.supportKey || null,
          followUpKey: reply.followUpKey,
          actions: reply.actions,
          crisis: reply.crisis,
          check: reply.check,
          resourceQuery: reply.resourceQuery,
          resourceState: reply.resourceQuery ? 'loading' : null
        })
        if (reply.resourceQuery) void this.loadResourcesFor(msg)
        this.$nextTick(() => this.$refs.input && this.$refs.input.focus())
      }, reply.crisis || reply.check ? 120 : 450)
      this.timers.push(timer)
    },
    /** Busca en el catálogo real; la lista se pide una vez por apertura y se reutiliza */
    async loadResourcesFor(msg) {
      if (!msg || !msg.resourceQuery) return
      msg.resourceState = 'loading'
      try {
        if (!this.catalog) this.catalog = (await new ResourceLibraryService().getResources()).items
        const found = rankResources(this.catalog, msg.resourceQuery)
        msg.resources = found.map(toCard)
        msg.resourceState = found.length ? 'ok' : 'none'
        if (found.length) {
          const shown = [...(this.context.shownResources || []), ...found.map((r) => String(r.id))]
          this.context = { ...this.context, shownResources: [...new Set(shown)].slice(-15) }
        }
      } catch {
        this.catalog = null
        msg.resourceState = 'error'
      }
      this.persist()
      this.$nextTick(this.scrollDown)
    },
    restart() {
      this.timers.forEach(clearTimeout)
      this.typing = false
      this.messages = []
      this.context = initialContext()
      this.welcome()
      this.$nextTick(() => this.$refs.input && this.$refs.input.focus())
    },
    categoryIcon(category) {
      return CATEGORY_ICONS[category] || 'fas fa-file'
    },
    persist() {
      try {
        sessionStorage.setItem(userStorageKey(STORAGE), JSON.stringify({ messages: this.messages, context: this.context, showStarters: this.showStarters }))
      } catch {
        /* sin almacenamiento: la conversación vive solo en memoria */
      }
    },
    scrollDown() {
      const el = this.$refs.scroller
      if (el) el.scrollTop = el.scrollHeight
    }
  }
}
</script>
