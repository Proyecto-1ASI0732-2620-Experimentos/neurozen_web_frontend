<template>
  <div class="zenbot">
    <!-- Botón flotante -->
    <button
      v-show="!open"
      ref="launcher"
      type="button"
      class="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary-strong"
      :aria-label="$t('zenbot.open')"
      @click="toggle(true)"
    >
      <i class="fas fa-robot text-xl" aria-hidden="true"></i>
      <span v-if="!greeted" class="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-amber-400" aria-hidden="true"></span>
    </button>

    <!-- Ventana de chat -->
    <section
      v-if="open"
      class="fixed inset-x-3 bottom-3 z-50 flex max-h-[min(36rem,calc(100vh-var(--header-height)-1.5rem))] flex-col overflow-hidden rounded-2xl border border-[#E3DED2] bg-white shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[23rem]"
      role="dialog"
      aria-labelledby="zenbot-title"
      @keydown.esc="toggle(false)"
    >
      <header class="flex shrink-0 items-center gap-3 bg-primary px-4 py-3 text-white">
        <span class="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><i class="fas fa-robot" aria-hidden="true"></i></span>
        <div class="min-w-0 flex-1">
          <h2 id="zenbot-title" class="font-bold leading-tight">ZenBot</h2>
          <p class="text-xs text-white/80">{{ $t('zenbot.subtitle') }}</p>
        </div>
        <button type="button" class="h-9 w-9 rounded-lg hover:bg-white/15" :aria-label="$t('zenbot.restart')" @click="restart"><i class="fas fa-rotate-right" aria-hidden="true"></i></button>
        <button type="button" class="h-9 w-9 rounded-lg hover:bg-white/15" :aria-label="$t('common.close')" @click="toggle(false)"><i class="fas fa-xmark" aria-hidden="true"></i></button>
      </header>

      <div ref="scroller" class="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#F7F3EA] px-4 py-4" aria-live="polite">
        <div v-for="msg in messages" :key="msg.id" class="flex" :class="msg.from === 'user' ? 'justify-end' : 'justify-start'">
          <div class="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
            :class="msg.from === 'user' ? 'rounded-br-sm bg-primary text-white' : msg.crisis ? 'rounded-bl-sm border border-red-200 bg-red-50 text-red-950' : 'rounded-bl-sm bg-white text-foreground-light shadow-sm'">
            <p class="whitespace-pre-line">{{ msg.from === 'user' ? msg.text : $t(msg.textKey) }}</p>
            <ul v-if="msg.crisis" class="mt-2 space-y-1 font-semibold">
              <li><a href="tel:113" class="underline">{{ $t('zenbot.crisis.line113') }}</a></li>
              <li><a href="tel:106" class="underline">{{ $t('zenbot.crisis.samu') }}</a></li>
            </ul>
            <div v-if="msg.links && msg.links.length" class="mt-2 flex flex-wrap gap-1.5">
              <router-link v-for="link in msg.links" :key="link.to" :to="link.to"
                class="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-white px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/5"
                @click="toggle(false)">
                {{ $t(link.label) }}<i class="fas fa-arrow-right text-[10px]" aria-hidden="true"></i>
              </router-link>
            </div>
          </div>
        </div>
        <p v-if="typing" class="text-xs text-muted-light" role="status">{{ $t('zenbot.typing') }}</p>
      </div>

      <div class="flex shrink-0 gap-1.5 overflow-x-auto border-t border-[#EEE9DD] bg-white px-3 pt-2.5">
        <button v-for="q in quickReplies" :key="q" type="button" class="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/15" @click="send($t(`zenbot.quick.${q}`))">
          {{ $t(`zenbot.quick.${q}`) }}
        </button>
      </div>
      <form class="flex shrink-0 items-center gap-2 bg-white p-3" @submit.prevent="send(draft)">
        <label for="zenbot-input" class="sr-only">{{ $t('zenbot.placeholder') }}</label>
        <input id="zenbot-input" ref="input" v-model="draft" type="text" maxlength="300" autocomplete="off" class="nz-input flex-1 rounded-full" :placeholder="$t('zenbot.placeholder')" />
        <button type="submit" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-strong disabled:opacity-40" :disabled="!draft.trim() || typing" :aria-label="$t('zenbot.send')">
          <i class="fas fa-paper-plane" aria-hidden="true"></i>
        </button>
      </form>
      <p class="shrink-0 bg-white px-4 pb-3 text-[11px] leading-snug text-muted-light">{{ $t('zenbot.disclaimer') }}</p>
    </section>
  </div>
</template>

<script>
/**
 * ZenBotWidget - Asistente flotante (esquina inferior derecha) para trabajadores.
 * Las respuestas vienen de zenbotEngine (reglas fijas, sin IA). La conversación se
 * guarda solo durante la sesión del navegador y es privada de cada usuario.
 */
import { respond } from './zenbotEngine.js'
import { userStorageKey } from '../services/session.js'

const STORAGE = 'neurozen_zenbot'
let seq = 0

export default {
  name: 'ZenBotWidget',
  data() {
    return { open: false, greeted: false, typing: false, draft: '', messages: [], misunderstood: 0, quickReplies: ['stressed', 'sleep', 'work', 'specialist'] }
  },
  created() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(userStorageKey(STORAGE)) || 'null')
      if (saved) Object.assign(this, { messages: saved.messages || [], misunderstood: saved.misunderstood || 0, greeted: !!saved.messages?.length })
    } catch {
      /* conversación nueva */
    }
  },
  methods: {
    toggle(value) {
      this.open = value
      if (value) {
        if (!this.messages.length) this.push({ from: 'bot', textKey: 'zenbot.answers.welcome' })
        this.greeted = true
        this.$nextTick(() => {
          this.scrollDown()
          this.$refs.input && this.$refs.input.focus()
        })
      } else {
        this.$nextTick(() => this.$refs.launcher && this.$refs.launcher.focus())
      }
    },
    push(msg) {
      this.messages.push({ id: `${Date.now()}-${++seq}`, ...msg })
      this.messages = this.messages.slice(-60)
      this.persist()
      this.$nextTick(this.scrollDown)
    },
    send(text) {
      const message = String(text || '').trim()
      if (!message || this.typing) return
      this.draft = ''
      this.push({ from: 'user', text: message })
      const reply = respond(message, this.misunderstood)
      this.misunderstood = reply.intent === 'fallback' ? this.misunderstood + 1 : 0
      // Pequeña pausa para que la respuesta se lea como una conversación
      this.typing = true
      setTimeout(() => {
        this.typing = false
        this.push({ from: 'bot', textKey: reply.textKey, links: reply.links, crisis: reply.crisis })
      }, reply.crisis ? 150 : 450)
    },
    restart() {
      this.messages = []
      this.misunderstood = 0
      this.push({ from: 'bot', textKey: 'zenbot.answers.welcome' })
    },
    persist() {
      try {
        sessionStorage.setItem(userStorageKey(STORAGE), JSON.stringify({ messages: this.messages, misunderstood: this.misunderstood }))
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
