/**
 * zenbotEngine - Lógica de ZenBot, el asistente de NeuroZen.
 *
 * Funciona 100 % en el frontend con reglas fijas: busca palabras clave en el mensaje
 * (sin tildes ni mayúsculas) y devuelve una respuesta predefinida con enlaces a las
 * herramientas de la plataforma. No usa inteligencia artificial ni envía datos a nadie.
 *
 * Reglas de seguridad:
 *  - La detección de CRISIS (ideas de suicidio o autolesión) tiene prioridad sobre todo:
 *    responde con líneas de ayuda inmediata y la opción de hablar con un especialista.
 *  - Si no entiende el mensaje, sugiere hablar con un especialista; tras dos mensajes
 *    seguidos sin entender, lo recomienda con más énfasis.
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
 * Intenciones en orden de prioridad. Cada una tiene palabras clave (es + en) y la
 * respuesta: clave de traducción + enlaces sugeridos.
 */
export const INTENTS = [
  {
    id: 'crisis',
    keywords: ['suicid', 'matarme', 'quitarme la vida', 'no quiero vivir', 'quiero morir', 'me quiero morir', 'acabar con mi vida', 'hacerme dano', 'autolesion', 'cortarme', 'lastimarme', 'kill myself', 'end my life', 'want to die', 'self harm', 'hurt myself'],
    crisis: true,
    links: [{ to: '/book-session', label: 'zenbot.links.specialist' }]
  },
  {
    id: 'sad',
    keywords: ['triste', 'deprimid', 'depresion', 'llorar', 'lloro', 'me siento solo', 'me siento sola', 'vacio', 'sin ganas', 'sad', 'depressed', 'lonely', 'hopeless'],
    links: [{ to: '/book-session', label: 'zenbot.links.specialist' }, { to: '/stress/breathing', label: 'zenbot.links.breathing' }]
  },
  {
    id: 'anxiety',
    keywords: ['ansiedad', 'ansios', 'estres', 'estresad', 'nervios', 'agobi', 'abrumad', 'presion', 'angustia', 'panico', 'stress', 'anxious', 'anxiety', 'overwhelmed', 'panic'],
    links: [{ to: '/stress/breathing', label: 'zenbot.links.breathing' }, { to: '/stress/triggers', label: 'zenbot.links.trigger' }]
  },
  {
    id: 'sleep',
    keywords: ['dormir', 'sueno', 'insomnio', 'desvelo', 'cansad', 'agotad', 'sleep', 'insomnia', 'tired', 'exhausted'],
    links: [{ to: '/stress/resources', label: 'zenbot.links.resources' }, { to: '/stress/breathing', label: 'zenbot.links.breathing' }]
  },
  {
    id: 'work',
    keywords: ['trabajo', 'jefe', 'carga', 'reunion', 'plazo', 'entrega', 'oficina', 'horas extra', 'compañero', 'companero', 'work', 'boss', 'workload', 'deadline', 'meeting'],
    links: [{ to: '/stress/active-breaks', label: 'zenbot.links.breaks' }, { to: '/stress/triggers', label: 'zenbot.links.trigger' }]
  },
  {
    id: 'breathing',
    keywords: ['respir', 'relaj', 'calmar', 'calma', 'breath', 'relax', 'calm'],
    links: [{ to: '/stress/breathing', label: 'zenbot.links.breathing' }]
  },
  {
    id: 'breaks',
    keywords: ['pausa', 'descanso', 'estirar', 'break', 'stretch'],
    links: [{ to: '/stress/active-breaks', label: 'zenbot.links.breaks' }]
  },
  {
    id: 'trigger',
    keywords: ['registrar', 'desencadenante', 'anotar', 'diario', 'trigger'],
    links: [{ to: '/stress/triggers', label: 'zenbot.links.trigger' }]
  },
  {
    id: 'test',
    keywords: ['test', 'evaluacion', 'cuestionario', 'nivel de estres', 'assessment', 'questionnaire'],
    links: [{ to: '/assessment', label: 'zenbot.links.test' }]
  },
  {
    id: 'resources',
    keywords: ['recurso', 'articulo', 'video', 'meditacion', 'audio', 'leer', 'resource', 'article', 'meditation'],
    links: [{ to: '/stress/resources', label: 'zenbot.links.resources' }]
  },
  {
    id: 'appointments',
    keywords: ['mis citas', 'mi cita', 'cancelar cita', 'my appointment'],
    links: [{ to: '/appointments', label: 'zenbot.links.appointments' }]
  },
  {
    id: 'specialist',
    keywords: ['psicolog', 'terapeuta', 'terapia', 'especialista', 'profesional', 'reservar', 'agendar', 'cita', 'citas', 'hablar con alguien', 'ayuda profesional', 'therapist', 'psychologist', 'appointment', 'book'],
    links: [{ to: '/book-session', label: 'zenbot.links.specialist' }, { to: '/therapists', label: 'zenbot.links.directory' }]
  },
  {
    id: 'subscription',
    keywords: ['precio', 'costo', 'plan', 'planes', 'suscripcion', 'pagar', 'pago', 'price', 'cost', 'subscription', 'pay'],
    links: [{ to: '/subscriptions', label: 'zenbot.links.plans' }]
  },
  { id: 'thanks', keywords: ['gracias', 'thank'], links: [] },
  { id: 'bye', keywords: ['adios', 'chau', 'hasta luego', 'nos vemos', 'bye', 'goodbye'], links: [] },
  {
    id: 'help',
    keywords: ['ayuda', 'que puedes hacer', 'que haces', 'opciones', 'menu', 'help', 'what can you do'],
    links: [{ to: '/stress/breathing', label: 'zenbot.links.breathing' }, { to: '/stress/triggers', label: 'zenbot.links.trigger' }, { to: '/book-session', label: 'zenbot.links.specialist' }]
  },
  { id: 'greeting', keywords: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'buenas', 'hey', 'hi', 'hello'], links: [] }
]

/**
 * Coincidencia de palabra clave:
 *  - frases: deben aparecer completas;
 *  - palabras cortas (4 letras o menos, p. ej. "hi", "cita"): palabra exacta;
 *  - palabras largas: por prefijo ("estres" encuentra "estresado").
 */
function matches(text, keyword) {
  if (keyword.includes(' ')) return ` ${text} `.includes(` ${keyword} `) || text.includes(keyword)
  if (keyword.length <= 4) return new RegExp(`(^|\\s)${keyword}(\\s|$)`).test(text)
  return new RegExp(`(^|\\s)${keyword}`).test(text)
}

/**
 * Devuelve la respuesta de ZenBot para un mensaje.
 * @param {string} message mensaje del usuario
 * @param {number} misunderstoodCount mensajes seguidos que no se entendieron
 * @returns {{ intent: string, textKey: string, links: Array, crisis: boolean }}
 */
export function respond(message, misunderstoodCount = 0) {
  const text = normalizeText(message)
  if (!text) return { intent: 'empty', textKey: 'zenbot.answers.empty', links: [], crisis: false }

  const intent = INTENTS.find((i) => i.keywords.some((k) => matches(text, normalizeText(k))))
  if (intent) {
    return { intent: intent.id, textKey: `zenbot.answers.${intent.id}`, links: intent.links, crisis: !!intent.crisis }
  }

  // No entendió: deriva a un especialista (con más énfasis si ya pasó antes)
  return {
    intent: 'fallback',
    textKey: misunderstoodCount >= 1 ? 'zenbot.answers.fallbackSpecialist' : 'zenbot.answers.fallback',
    links: [{ to: '/book-session', label: 'zenbot.links.specialist' }, { to: '/stress/resources', label: 'zenbot.links.resources' }],
    crisis: false
  }
}
