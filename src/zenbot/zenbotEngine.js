/**
 * zenbotEngine - Motor de conversación de ZenBot (frontend, sin IA externa).
 *
 * Auditoría (v1): reglas por palabra clave con UNA respuesta fija por tema, sin memoria de la conversación
 * (solo un contador de "no entendí"), 4 opciones rápidas, enlaces genéricos y detección de crisis por lista
 * de palabras sin manejo de expresiones ambiguas ni de negaciones.
 *
 * v2 (este archivo) - todo se resuelve en el navegador; NO se envían mensajes a ningún servicio:
 *  1. Seguridad primero: `assessRisk` evalúa cada mensaje ANTES que cualquier otra cosa, con tres niveles
 *     (orientación cotidiana, malestar persistente → apoyo profesional, posible emergencia) y un nivel
 *     intermedio de "comprobación" para expresiones ambiguas («no aguanto más», «quisiera desaparecer»):
 *     ZenBot pregunta con cuidado y muestra igualmente las líneas de ayuda. Prioriza evitar falsos negativos.
 *     IMPORTANTE: es una heurística de apoyo, NO un sistema clínico de detección (ver informe, F3).
 *  2. Intenciones por puntuación de sinónimos y raíces (es/en), no por una sola coincidencia literal.
 *  3. Contexto: recuerda el tema, la pregunta que hizo ZenBot y los recursos ya mostrados, para interpretar
 *     respuestas cortas («demasiadas responsabilidades», «sí», «otro») sin repetir preguntas.
 *  4. Acciones: solo rutas reales de NeuroZen (ver ACTIONS). Nunca reserva ni cancela nada por sí mismo.
 *  5. Recursos: indica qué buscar (`resourceQuery`); la búsqueda se hace sobre el catálogo real
 *     (GET /api/v1/resource-libraries) en zenbotResources.js.
 */

/** Quita tildes, signos y mayúsculas para comparar palabras */
export function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Coincidencia de una palabra clave ya normalizada:
 *  - frases: deben aparecer completas (límite de palabra);
 *  - palabras de 4 letras o menos: palabra exacta ("hi" no encuentra "hice");
 *  - palabras largas: por prefijo ("estres" encuentra "estresado").
 */
export function matches(text, keyword) {
  if (!keyword) return false
  if (keyword.includes(' ')) return ` ${text} `.includes(` ${keyword} `) || new RegExp(`(^|\\s)${keyword}`).test(text)
  if (keyword.length <= 4) return new RegExp(`(^|\\s)${keyword}(\\s|$)`).test(text)
  return new RegExp(`(^|\\s)${keyword}`).test(text)
}

const any = (text, list) => list.some((k) => matches(text, normalizeText(k)))

/* ------------------------------------------------------------------------------------------------
 * 1. Riesgo
 * ---------------------------------------------------------------------------------------------- */

/** Posible emergencia: ideas de suicidio, autolesión, daño a otros o no sentirse a salvo */
const CRISIS_TERMS = [
  'suicid', 'matarme', 'me voy a matar', 'quitarme la vida', 'acabar con mi vida', 'terminar con mi vida', 'no quiero vivir',
  'no quiero seguir viviendo', 'ya no quiero vivir', 'quiero morir', 'me quiero morir', 'quisiera morir', 'quisiera estar muerto',
  'quisiera estar muerta', 'mejor muerto', 'mejor muerta', 'mejor estaria muerto', 'mejor estaria muerta', 'acabar con todo', 'terminar con todo',
  'hacerme dano', 'hacer dano', 'hacerme daño', 'autolesion', 'cortarme', 'lastimarme', 'herirme', 'tomarme todas las pastillas', 'tirarme del', 'tirarme de un',
  'tirarme por', 'ahorcarme', 'no estoy a salvo', 'no me siento a salvo', 'no me siento seguro', 'no me siento segura', 'estoy en peligro',
  'hacerle dano a', 'matar a alguien', 'matar a mi', 'lastimar a alguien',
  'kill myself', 'end my life', 'take my life', 'want to die', 'wish i was dead', 'better off dead', 'self harm', 'self-harm', 'hurt myself',
  'cut myself', 'suicide', 'not safe', 'i am not safe', 'end it all', 'hurt someone', 'kill someone', 'no reason to live'
]

/** Expresiones ambiguas: pueden indicar riesgo; se pregunta con cuidado y se muestran las líneas de ayuda */
const CHECK_TERMS = [
  'no aguanto mas', 'ya no aguanto', 'ya no puedo mas', 'no puedo mas', 'no le veo sentido', 'nada tiene sentido', 'sin sentido',
  'quisiera desaparecer', 'quiero desaparecer', 'desaparecer', 'todo me da igual', 'me da igual todo', 'no vale la pena', 'no hay salida', 'sin salida',
  'rendirme', 'me rindo', 'soy una carga', 'ser una carga', 'sin esperanza', 'no tengo esperanza', 'dormir y no despertar', 'no despertar',
  'can t go on', 'cant go on', 'no point', 'give up', 'disappear', 'hopeless', 'a burden', 'no way out', 'can t take it anymore', 'cant take it anymore'
]

/** Malestar persistente o intenso (nivel 2) */
const PERSISTENCE_TERMS = [
  'todos los dias', 'cada dia', 'todo el tiempo', 'constantemente', 'desde hace semanas', 'desde hace meses', 'hace meses', 'hace semanas',
  'no puedo funcionar', 'no puedo trabajar', 'no puedo concentrarme en nada', 'me afecta mucho', 'me esta afectando', 'ataque de panico',
  'ataques de panico', 'crisis de ansiedad', 'cada vez peor', 'empeora', 'no puedo mas con esto',
  'every day', 'all the time', 'constantly', 'for weeks', 'for months', 'panic attack', 'can t function', 'cant function', 'getting worse'
]

const AFFIRMATIVE = ['si', 'sí', 'a veces', 'tal vez', 'quizas', 'quizá', 'puede ser', 'creo que si', 'un poco', 'yes', 'maybe', 'sometimes', 'i think so', 'kind of']
const NEGATIVE = ['no', 'para nada', 'no es eso', 'nunca', 'en absoluto', 'not really', 'no way', 'nope']
const SAFE_NOW = ['estoy a salvo', 'ya estoy a salvo', 'estoy bien', 'ya estoy bien', 'estoy mejor', 'ya estoy mejor', 'estoy segura', 'estoy seguro', 'i am safe', 'im safe', 'i m safe', 'i am ok', 'i m ok', 'im ok', 'i feel better']
const NEGATION_BEFORE = /(^|\s)(no|nunca|jamas|never|not|dont|don t|wouldn t|wouldnt)\s+(me\s+|i\s+|lo\s+)?(\w+\s+)?$/

/** true si la coincidencia está negada justo antes («no quiero morir», «nunca me haría daño») */
function negated(text, term) {
  const idx = ` ${text} `.indexOf(` ${term}`)
  if (idx < 0) return false
  const before = ` ${text} `.slice(0, idx + 1)
  // Si el propio término empieza con "no" (no quiero vivir), no se considera negado
  if (/^(no|not)\s/.test(term)) return false
  return NEGATION_BEFORE.test(before)
}

/**
 * Evalúa el riesgo de un mensaje considerando el contexto inmediato.
 * @returns {{ level: 'none'|'support'|'check'|'crisis', reason: string }}
 */
export function assessRisk(message, context = {}) {
  const text = normalizeText(message)
  if (!text) return { level: 'none', reason: '' }

  const crisisHit = CRISIS_TERMS.map(normalizeText).find((k) => matches(text, k))
  if (crisisHit) {
    // Una negación explícita no se descarta: se comprueba con cuidado (minimiza falsos negativos)
    return negated(text, crisisHit) ? { level: 'check', reason: 'negated-crisis' } : { level: 'crisis', reason: 'explicit' }
  }

  // Respuesta a la pregunta de comprobación de ZenBot
  if (context.awaiting === 'riskCheck') {
    const short = text.split(' ').length <= 6
    if (any(text, AFFIRMATIVE) && !any(text, ['no'])) return { level: 'crisis', reason: 'confirmed' }
    if (short && any(text, NEGATIVE)) return { level: 'support', reason: 'denied' }
  }

  if (any(text, CHECK_TERMS)) return { level: 'check', reason: 'ambiguous' }

  // Tras una crisis, se mantiene el modo seguro hasta que la persona diga que está a salvo
  if (context.crisisActive && !any(text, SAFE_NOW)) return { level: 'crisis', reason: 'ongoing' }

  if (any(text, PERSISTENCE_TERMS)) return { level: 'support', reason: 'persistent' }
  return { level: 'none', reason: '' }
}

/* ------------------------------------------------------------------------------------------------
 * 2. Necesidades / intenciones
 * ---------------------------------------------------------------------------------------------- */

/** Accesos a funcionalidades REALES (rutas existentes en src/routes/index.js) */
export const ACTIONS = {
  assessment: { to: '/assessment', label: 'zenbot.actions.assessment', icon: 'fas fa-clipboard-list' },
  trigger: { to: '/stress/triggers', label: 'zenbot.actions.trigger', icon: 'fas fa-pen' },
  stats: { to: '/', label: 'zenbot.actions.stats', icon: 'fas fa-chart-line' },
  breathing: { to: '/stress/breathing', label: 'zenbot.actions.breathing', icon: 'fas fa-wind' },
  breaks: { to: '/stress/active-breaks', label: 'zenbot.actions.breaks', icon: 'fas fa-person-walking' },
  videos: { to: '/stress/resources?category=video', label: 'zenbot.actions.videos', icon: 'fas fa-circle-play' },
  resources: { to: '/stress/resources', label: 'zenbot.actions.resources', icon: 'fas fa-book-open' },
  directory: { to: '/therapists', label: 'zenbot.actions.directory', icon: 'fas fa-user-doctor' },
  book: { to: '/book-session', label: 'zenbot.actions.book', icon: 'fas fa-calendar-plus' },
  appointments: { to: '/appointments', label: 'zenbot.actions.appointments', icon: 'fas fa-calendar-check' },
  plans: { to: '/subscriptions', label: 'zenbot.actions.plans', icon: 'fas fa-crown' }
}

/**
 * Necesidades que ZenBot reconoce. `terms` (es/en): raíces y frases con su peso implícito
 * (frase = 2, palabra = 1). `actions`: accesos sugeridos. `resources`: si conviene buscar recursos.
 * `followUp`: pregunta abierta que hace una sola vez por tema. `variants`: cantidad de respuestas.
 */
export const NEEDS = {
  stress: {
    terms: ['estres', 'estresad', 'tension', 'tenso', 'tensa', 'presion', 'agobi', 'abrumad', 'saturad', 'sobrepasad', 'stress', 'stressed', 'overwhelm', 'pressure', 'tense'],
    actions: ['breathing', 'trigger', 'assessment'], resources: true, followUp: true, variants: 2
  },
  work: {
    terms: ['trabajo', 'laboral', 'jefe', 'jefa', 'oficina', 'reunion', 'plazo', 'entrega', 'carga', 'sobrecarga', 'horas extra', 'responsabilidad', 'tareas',
      'pendientes', 'companer', 'compañer', 'cliente', 'desconectar', 'jornada', 'work', 'job', 'boss', 'workload', 'office', 'meeting', 'coworker',
      'responsibilit', 'tasks', 'overtime', 'deadline', 'disconnect'],
    actions: ['trigger', 'breaks', 'breathing', 'assessment', 'directory'], resources: true, followUp: true, variants: 2
  },
  anxiety: {
    terms: ['ansiedad', 'ansios', 'preocupa', 'nervios', 'nervios', 'angustia', 'panico', 'inquiet', 'miedo', 'temor', 'anxiety', 'anxious', 'worried', 'worry', 'nervous', 'panic', 'afraid'],
    actions: ['breathing', 'trigger', 'directory'], resources: true, followUp: true, variants: 2
  },
  sleep: {
    terms: ['dormir', 'duermo', 'sueno', 'insomnio', 'desvelo', 'desvelad', 'me despierto', 'pesadilla', 'descansar', 'sleep', 'insomnia', 'awake at night', 'nightmare', 'rest'],
    actions: ['breathing', 'resources', 'trigger'], resources: true, followUp: true, variants: 2
  },
  burnout: {
    terms: ['agotad', 'agotamiento', 'burnout', 'quemad', 'sin energia', 'cansancio emocional', 'no doy mas', 'harto', 'harta', 'cansad', 'exhaust', 'drained', 'worn out', 'tired', 'fatigue'],
    actions: ['breaks', 'assessment', 'directory'], resources: true, followUp: true, variants: 2
  },
  relax: {
    terms: ['respir', 'relaj', 'calmar', 'calma', 'tranquil', 'meditar', 'meditacion', 'mindfulness', 'breath', 'relax', 'calm', 'meditat'],
    actions: ['breathing', 'videos'], resources: true, followUp: false, variants: 2
  },
  focus: {
    terms: ['concentr', 'enfoc', 'productiv', 'distrae', 'distraig', 'procrastin', 'focus', 'concentrat', 'distract'],
    actions: ['breaks', 'breathing'], resources: true, followUp: false, variants: 1
  },
  assessment: {
    terms: ['test', 'pss', 'evaluacion', 'evaluarme', 'cuestionario', 'nivel de estres', 'niveles de estres', 'mis niveles', 'medir', 'assessment', 'questionnaire', 'stress level'],
    actions: ['assessment', 'stats'], resources: false, followUp: false, variants: 1
  },
  stats: {
    terms: ['estadistic', 'mi progreso', 'mis registros', 'historial', 'grafic', 'mi panel', 'statistics', 'my progress', 'history', 'chart', 'dashboard'],
    actions: ['stats', 'trigger'], resources: false, followUp: false, variants: 1
  },
  triggers: {
    terms: ['registrar', 'desencadenante', 'anotar', 'diario', 'trigger', 'journal', 'log how'],
    actions: ['trigger', 'stats'], resources: false, followUp: false, variants: 1
  },
  breaks: {
    terms: ['pausa', 'pausas activas', 'estirar', 'estiramiento', 'break', 'stretch'],
    actions: ['breaks'], resources: true, followUp: false, variants: 1
  },
  resources: {
    terms: ['video', 'videos', 'recurso', 'ejercicio', 'audio', 'articulo', 'lectura', 'leer', 'contenido', 'resource', 'exercise', 'article', 'watch', 'material'],
    actions: ['videos', 'resources'], resources: true, followUp: false, variants: 1
  },
  talk: {
    terms: ['hablar de como me siento', 'necesito hablar', 'quiero hablar', 'desahog', 'contarte', 'escuchame', 'escucharme', 'como me siento', 'need to talk', 'vent', 'listen to me'],
    actions: ['trigger', 'directory'], resources: false, followUp: true, variants: 2
  },
  sad: {
    terms: ['triste', 'tristeza', 'deprimid', 'depresion', 'llor', 'vacio', 'me siento solo', 'me siento sola', 'sin ganas', 'desanimad', 'sad', 'depressed', 'lonely', 'feel down'],
    actions: ['directory', 'breathing', 'trigger'], resources: true, followUp: true, variants: 1
  },
  professional: {
    terms: ['psicolog', 'terapeuta', 'terapia', 'especialista', 'profesional', 'ayuda profesional', 'consulta', 'therapist', 'psycholog', 'therapy', 'counsel', 'professional help'],
    actions: ['directory', 'book', 'appointments'], resources: false, followUp: false, variants: 1
  },
  booking: {
    terms: ['reservar', 'reserva', 'agendar', 'nueva cita', 'sacar una cita', 'pedir una cita', 'disponibilidad', 'horario', 'book', 'booking', 'schedule an appointment', 'availability'],
    actions: ['book', 'directory'], resources: false, followUp: false, variants: 1
  },
  appointments: {
    terms: ['mis citas', 'mi cita', 'cancelar cita', 'cancelar mi cita', 'reprogramar', 'proxima cita', 'cita', 'citas', 'my appointment', 'appointments', 'cancel appointment', 'reschedule'],
    actions: ['appointments', 'book'], resources: false, followUp: false, variants: 1
  },
  subscription: {
    terms: ['precio', 'costo', 'planes', 'suscripcion', 'pagar', 'pago', 'price', 'cost', 'subscription', 'pay'],
    actions: ['plans'], resources: false, followUp: false, variants: 1
  },
  thanks: { terms: ['gracias', 'thank', 'thanks'], actions: [], resources: false, followUp: false, variants: 1 },
  bye: { terms: ['adios', 'chau', 'hasta luego', 'nos vemos', 'bye', 'goodbye'], actions: [], resources: false, followUp: false, variants: 1 },
  help: { terms: ['ayuda', 'que puedes hacer', 'que haces', 'opciones', 'menu', 'help', 'what can you do'], actions: ['breathing', 'assessment', 'directory'], resources: false, followUp: false, variants: 1 },
  greeting: { terms: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'buenas', 'hey', 'hi', 'hello'], actions: [], resources: false, followUp: false, variants: 1 }
}

/** Opciones iniciales (5.2): cada una abre una conversación contextualizada */
export const STARTERS = [
  { id: 'stress', intent: 'stress' },
  { id: 'work', intent: 'work' },
  { id: 'anxiety', intent: 'anxiety' },
  { id: 'sleep', intent: 'sleep' },
  { id: 'burnout', intent: 'burnout' },
  { id: 'relax', intent: 'relax' },
  { id: 'levels', intent: 'assessment' },
  { id: 'talk', intent: 'talk' },
  { id: 'videos', intent: 'resources' },
  { id: 'professional', intent: 'professional' }
]

/** Intenciones "sociales": no cambian el tema de la conversación */
const SOCIAL = ['thanks', 'bye', 'greeting', 'help']
/** Prioridad ante empates (lo más específico primero) */
const PRIORITY = ['professional', 'booking', 'appointments', 'assessment', 'stats', 'triggers', 'sleep', 'burnout', 'anxiety', 'sad', 'work', 'focus', 'relax', 'breaks', 'resources', 'stress', 'talk', 'subscription', 'help', 'thanks', 'bye', 'greeting']

/** Puntuación de cada necesidad para un texto ya normalizado. Devuelve [{ id, score }] ordenado. */
export function classify(message) {
  const text = normalizeText(message)
  if (!text) return []
  return Object.entries(NEEDS)
    .map(([id, need]) => ({
      id,
      score: need.terms.reduce((sum, term) => {
        const k = normalizeText(term)
        return matches(text, k) ? sum + (k.includes(' ') ? 2 : 1) : sum
      }, 0)
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || PRIORITY.indexOf(a.id) - PRIORITY.indexOf(b.id))
}

const MORE = ['otro', 'otra', 'otros', 'otras', 'mas opciones', 'algo mas', 'algo distinto', 'another', 'more', 'something else', 'other']

/** Elige una variante distinta de la última usada para ese tema (evita repetir la misma respuesta) */
function pickVariant(intent, context) {
  const total = NEEDS[intent]?.variants || 1
  const last = context.lastVariant?.[intent]
  return total > 1 && last != null ? (last + 1) % total : 0
}

/** Contexto inicial de la conversación */
export const initialContext = () => ({
  topic: null, awaiting: null, asked: [], lastVariant: {}, shownResources: [], misunderstood: 0, crisisActive: false, turns: 0
})

function withActions(ids) {
  return ids.filter((id) => ACTIONS[id]).map((id) => ({ id, ...ACTIONS[id] }))
}

/**
 * Respuesta de ZenBot para un mensaje.
 * @param {string} message mensaje del usuario
 * @param {object|number} ctx contexto devuelto por la respuesta anterior (o, por compatibilidad, el número
 *   de mensajes seguidos sin entender)
 * @param {{ starter?: string }} options `starter`: id de una opción inicial pulsada
 * @returns {{ intent, risk, textKey, followUpKey, actions, links, resourceQuery, crisis, check, context }}
 */
export function respond(message, ctx = {}, options = {}) {
  const context = { ...initialContext(), ...(typeof ctx === 'number' ? { misunderstood: ctx } : ctx) }
  context.asked = [...(context.asked || [])]
  context.lastVariant = { ...(context.lastVariant || {}) }
  context.turns = (context.turns || 0) + 1
  const text = normalizeText(message)
  const base = { followUpKey: null, resourceQuery: null, crisis: false, check: false }

  if (!text && !options.starter) {
    return { ...base, intent: 'empty', risk: 'none', textKey: 'zenbot.answers.empty', actions: [], links: [], context }
  }

  // 1) Seguridad: siempre antes que recursos, reservas o cualquier acción secundaria
  const risk = assessRisk(message, context)
  if (risk.level === 'crisis') {
    const actions = withActions(['directory', 'book'])
    const ongoing = risk.reason === 'ongoing'
    return {
      ...base, intent: 'crisis', risk: 'crisis', crisis: true,
      textKey: ongoing ? 'zenbot.answers.crisisOngoing' : 'zenbot.answers.crisis',
      actions, links: actions,
      context: { ...context, crisisActive: true, awaiting: null, topic: context.topic, misunderstood: 0 }
    }
  }
  if (risk.level === 'check') {
    return {
      ...base, intent: 'riskCheck', risk: 'check', check: true, textKey: 'zenbot.answers.riskCheck',
      actions: withActions(['directory']), links: withActions(['directory']),
      context: { ...context, awaiting: 'riskCheck', misunderstood: 0 }
    }
  }
  const leavingCrisis = context.crisisActive
  context.crisisActive = false

  // 2) Intención: opción inicial, texto libre o continuación del tema anterior
  const ranked = options.starter ? [{ id: STARTERS.find((s) => s.id === options.starter)?.intent || 'help', score: 3 }] : classify(message)
  let intent = ranked[0]?.id || null
  const secondary = ranked.slice(1).map((r) => r.id).filter((id) => !SOCIAL.includes(id))
  let continuation = false

  // "Otro / más" sobre el tema actual → más recursos sin repetir los ya mostrados
  if ((!intent || intent === 'resources') && context.topic && any(text, MORE)) {
    const actions = withActions(['videos', 'resources'])
    return {
      ...base, intent: 'more', risk: 'none', textKey: 'zenbot.answers.more',
      resourceQuery: { intents: [context.topic], text: message, exclude: context.shownResources, preferVideo: true },
      actions, links: actions, context: { ...context, awaiting: null, misunderstood: 0 }
    }
  }

  // Respuesta a la pregunta que hizo ZenBot: se interpreta dentro del tema (no se vuelve a preguntar)
  const awaiting = context.awaiting && context.awaiting !== 'riskCheck' ? context.awaiting : null
  const related = (a, b) => a === b || (['stress', 'work'].includes(a) && ['stress', 'work'].includes(b))
  if (awaiting) {
    if (!intent || SOCIAL.includes(intent)) {
      intent = awaiting
      continuation = true
    } else if (related(awaiting, intent)) {
      continuation = true
    }
    // Si el tema es otro (p. ej. pregunta por citas), se cambia de tema con normalidad
  } else if (intent && context.topic && related(intent, context.topic) && context.asked.includes(intent)) {
    continuation = true
  } else if (!intent && context.topic && !SOCIAL.includes(context.topic) && text.split(' ').length <= 4 && !leavingCrisis) {
    // Respuesta corta sin tema propio («sí», «mucho», «no sé»): se entiende dentro del tema actual
    intent = context.topic
    continuation = true
  }

  if (risk.level === 'support' && risk.reason === 'denied') {
    const actions = withActions(['directory', 'book', 'breathing'])
    return {
      ...base, intent: 'supportAfterCheck', risk: 'support', textKey: 'zenbot.answers.supportAfterCheck',
      actions, links: actions, context: { ...context, awaiting: null, misunderstood: 0 }
    }
  }

  if (!intent) {
    const misunderstood = (context.misunderstood || 0) + 1
    const actions = withActions(misunderstood > 1 ? ['directory', 'resources'] : ['resources', 'directory'])
    return {
      ...base, intent: 'fallback', risk: 'none',
      textKey: misunderstood > 1 ? 'zenbot.answers.fallbackSpecialist' : 'zenbot.answers.fallback',
      actions, links: actions, context: { ...context, misunderstood, awaiting: null }
    }
  }

  const need = NEEDS[intent]
  const variant = pickVariant(intent, context)
  context.lastVariant[intent] = variant

  // 3) Nivel 2: malestar persistente/intenso → apoyo profesional sin diagnosticar
  const supportLevel = risk.level === 'support' || intent === 'sad'
  let textKey = continuation ? `zenbot.continue.${intent}` : `zenbot.replies.${intent}.${variant}`
  if (leavingCrisis) textKey = 'zenbot.answers.afterCrisis'

  let actionIds = [...need.actions]
  if (supportLevel && !['professional', 'booking', 'appointments'].includes(intent)) actionIds = ['directory', 'book', ...actionIds]
  // Combinación estrés + trabajo: se suman los accesos del tema laboral
  if (intent === 'stress' && secondary.includes('work')) actionIds = [...new Set([...NEEDS.work.actions, ...actionIds])]
  if (leavingCrisis) actionIds = ['directory', 'breathing']
  actionIds = [...new Set(actionIds)].slice(0, 4)

  const asksFollowUp = !continuation && !leavingCrisis && need.followUp && !context.asked.includes(intent) && !supportLevel
  if (asksFollowUp) context.asked.push(intent)
  const resourceIntents = [intent, ...secondary].filter((id) => NEEDS[id]?.resources)
  const actions = withActions(actionIds)

  return {
    ...base,
    intent,
    risk: supportLevel ? 'support' : 'none',
    textKey,
    supportKey: supportLevel && !['professional', 'booking', 'appointments'].includes(intent) ? 'zenbot.answers.supportSuggestion' : null,
    followUpKey: asksFollowUp ? `zenbot.followUps.${intent}` : null,
    actions,
    links: actions,
    resourceQuery: need.resources && !leavingCrisis ? { intents: resourceIntents.length ? resourceIntents : [intent], text: message, exclude: context.shownResources, preferVideo: intent === 'resources' || intent === 'relax' } : null,
    context: {
      ...context,
      topic: SOCIAL.includes(intent) ? context.topic : intent,
      awaiting: asksFollowUp ? intent : null,
      misunderstood: 0
    }
  }
}
