/**
 * zenbotResources - Recomendación de recursos REALES de la biblioteca de NeuroZen (5.5).
 *
 * No hay catálogo paralelo ni datos inventados: se ordenan los recursos que devuelve
 * ResourceLibraryService.getResources() (GET /api/v1/resource-libraries, ya filtrados por el plan del usuario)
 * usando título, descripción, etiquetas y categoría frente a la necesidad detectada y las palabras del mensaje.
 * Solo se recomiendan recursos con una coincidencia real; si no hay, ZenBot lo dice y ofrece otra alternativa.
 *
 * Limitación: el backend no tiene búsqueda semántica de recursos; la relevancia se calcula en el navegador
 * con sinónimos (ver INFORME_AUDITORIA_FRONTEND.md, F2).
 */
import { normalizeText } from './zenbotEngine.js'

/** Términos (raíces, es/en) que identifican recursos pertinentes para cada necesidad */
export const RESOURCE_TERMS = {
  stress: ['estres', 'stress', 'tension', 'calma', 'relaj', 'manejo', 'ansiedad'],
  work: ['trabajo', 'laboral', 'oficina', 'jornada', 'work', 'office', 'pausa', 'productiv', 'estres'],
  anxiety: ['ansiedad', 'anxiety', 'preocup', 'calma', 'respir', 'panico', 'nervios'],
  sleep: ['sueno', 'dormir', 'sleep', 'descanso', 'noche', 'insomnio', 'relaj'],
  burnout: ['agotamiento', 'burnout', 'energia', 'emocional', 'autocuidado', 'descanso', 'fatiga'],
  relax: ['respir', 'relaj', 'meditac', 'mindfulness', 'calma', 'breath', 'relax', 'meditat'],
  focus: ['concentr', 'atencion', 'focus', 'productiv', 'mindfulness', 'enfoque'],
  breaks: ['pausa', 'estir', 'movimiento', 'ejercicio', 'stretch', 'break'],
  sad: ['emocion', 'emocional', 'autocuidado', 'bienestar', 'mindfulness', 'autoestima'],
  talk: ['emocion', 'emocional', 'bienestar', 'autocuidado'],
  resources: []
}

/** Palabras sin valor para la búsqueda */
const STOPWORDS = new Set(['para', 'como', 'estoy', 'tengo', 'mucho', 'mucha', 'siento', 'quiero', 'algun', 'alguna', 'sobre', 'pero', 'porque', 'cuando',
  'esta', 'este', 'esto', 'muy', 'with', 'that', 'this', 'have', 'feel', 'want', 'about', 'some', 'very', 'video', 'videos', 'recurso', 'recursos',
  'ver', 'quisiera', 'necesito', 'puedo', 'hacer', 'ejercicios', 'bienestar', 'algo', 'otro', 'otra'])

const MIN_SCORE = 2

const hit = (haystack, term) => new RegExp(`(^|\\s)${term}`).test(haystack)

/**
 * Ordena los recursos por relevancia.
 * @param {Array} resources recursos normalizados (normalizeResource)
 * @param {{ intents?: string[], text?: string, exclude?: Array, preferVideo?: boolean, limit?: number }} query
 * @returns {Array} hasta `limit` recursos con score ≥ MIN_SCORE (sin los ya mostrados)
 */
export function rankResources(resources = [], { intents = [], text = '', exclude = [], preferVideo = false, limit = 3 } = {}) {
  const terms = [...new Set(intents.flatMap((i) => RESOURCE_TERMS[i] || []).map(normalizeText))]
  const words = normalizeText(text).split(' ').filter((w) => w.length >= 4 && !STOPWORDS.has(w))
  const excluded = new Set(exclude.map(String))
  const generalRequest = intents.length === 1 && intents[0] === 'resources' && !words.length

  return resources
    .filter((r) => r && r.id != null && !excluded.has(String(r.id)))
    .map((r) => {
      const title = normalizeText(r.title)
      const tags = normalizeText((r.tags || []).join(' '))
      const description = normalizeText(r.description)
      const category = normalizeText(`${r.category || ''} ${r.resourceType || ''}`)
      let score = 0
      for (const t of terms) {
        if (hit(title, t) || hit(tags, t)) score += 3
        else if (hit(description, t)) score += 1
      }
      for (const w of words) {
        const stem = w.slice(0, Math.max(4, w.length - 2))
        if (hit(title, stem) || hit(tags, stem)) score += 2
        else if (hit(description, stem) || hit(category, stem)) score += 1
      }
      if (preferVideo && r.category === 'video') score += generalRequest ? MIN_SCORE : 0.5
      return { resource: r, score }
    })
    .filter((x) => x.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || String(a.resource.id).localeCompare(String(b.resource.id), undefined, { numeric: true }))
    .slice(0, limit)
    .map((x) => x.resource)
}

/** Datos mínimos que se guardan en la conversación para pintar la tarjeta */
export function toCard(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    durationMinutes: r.durationMinutes,
    thumbnail: r.thumbnail,
    fallbackThumbnail: r.fallbackThumbnail,
    youTubeId: r.youTubeId || null
  }
}
