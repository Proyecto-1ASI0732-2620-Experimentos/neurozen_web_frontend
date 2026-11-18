/**
 * ResourceLibraryService - Biblioteca de recursos (audio, video, lectura, ejercicios).
 *
 * normalizeResource() unifica los formatos de la API .NET (resourceType, contentUrl,
 * duración en minutos) y del mock (category/type, audioUrl, duración en segundos).
 * Antes la lista y el detalle mapeaban los datos de forma distinta y el detalle
 * no mostraba ningún reproductor.
 *
 * Contrato (backend con acceso por planes):
 *   GET   /api/v1/resource-libraries        → lista YA FILTRADA por el plan del usuario
 *   GET   /api/v1/resource-libraries/{id}   → 200 | 403 «Este recurso está disponible desde el plan …» | 404
 *   GET   /api/v1/resources/{id}            → alias del anterior
 * La administración (crear, editar y ver el plan de cada recurso) está en AdminResourceService.
 * La lista siempre viene de la API: no hay recursos escritos en el código. El cliente nunca intenta
 * "desbloquear" un recurso que el backend no entregó.
 *
 * @version 3.0.0
 */
import { HttpClient } from './HttpClient.js'
import { ApiError, RESOURCE_PLAN_REQUIRED, RESOURCE_NOT_FOUND, isProfessionalNotVerified } from './ApiError.js'

const TYPE_TO_CATEGORY = {
  video: 'video', audio: 'audio', article: 'reading', reading: 'reading', lectura: 'reading',
  exercise: 'exercises', exercises: 'exercises', ejercicio: 'exercises',
  guided_meditation: 'audio', podcast: 'audio', music: 'audio'
}

const FALLBACK_THUMBNAILS = {
  audio: '/images/resource-audio.svg',
  video: '/images/resource-video.svg',
  reading: '/images/resource-reading.svg',
  exercises: '/images/resource-exercise.svg'
}

export const RESOURCE_PLACEHOLDER = '/images/resource-reading.svg'

/**
 * Extrae el id de un video de YouTube. Acepta watch?v= (www., m. o sin subdominio), youtu.be/,
 * /embed/ y /shorts/. Los ids de YouTube tienen 11 caracteres [A-Za-z0-9_-].
 */
export function extractYouTubeId(url = '') {
  const match = String(url).match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})(?![\w-])/)
  return match ? match[1] : null
}

/** Enlace para abrir el video en YouTube (pestaña nueva) cuando no se puede insertar */
export const youTubeWatchUrl = (id) => `https://www.youtube.com/watch?v=${id}`

export function normalizeResource(raw = {}) {
  const typeKey = String(raw.resourceType || raw.category || raw.type || '').toLowerCase()
  const category = TYPE_TO_CATEGORY[typeKey] || TYPE_TO_CATEGORY[String(raw.category || '').toLowerCase()] || 'reading'
  const contentUrl = raw.contentUrl || raw.audioUrl || raw.videoUrl || raw.url || ''
  // API .NET: minutos (trae resourceType). Mock json-server: segundos.
  const rawDuration = Number(raw.durationMinutes ?? raw.duration) || 0
  const minutes = raw.durationMinutes != null || raw.resourceType ? rawDuration : Math.round(rawDuration / 60)
  const youTubeId = extractYouTubeId(contentUrl)
  return {
    id: raw.id,
    title: raw.title || '',
    description: raw.description || '',
    content: raw.content || '',
    author: raw.author || '',
    category,
    resourceType: raw.resourceType || raw.type || category,
    contentUrl,
    youTubeId,
    // Miniatura de la API; si viene vacía, la del video de YouTube; si no, una genérica por tipo.
    // Si la imagen falla al cargar, <img data-fallback> la sustituye (main.js).
    thumbnail: raw.thumbnail || raw.imageUrl || (youTubeId ? `https://img.youtube.com/vi/${youTubeId}/hqdefault.jpg` : FALLBACK_THUMBNAILS[category]),
    fallbackThumbnail: FALLBACK_THUMBNAILS[category],
    durationMinutes: Math.max(1, minutes),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    createdAt: raw.createdAt || null
  }
}

/** Normaliza el error del detalle: 403 por plan → RESOURCE_PLAN_REQUIRED; 404 → RESOURCE_NOT_FOUND */
function detailError(error) {
  if (error.status === 403 && !isProfessionalNotVerified(error)) {
    return new ApiError(error.message, { status: 403, details: error.details, cause: error, code: RESOURCE_PLAN_REQUIRED })
  }
  if (error.status === 404) {
    return new ApiError(error.message, { status: 404, details: error.details, cause: error, code: RESOURCE_NOT_FOUND })
  }
  return error
}

export class ResourceLibraryService {
  constructor() {
    this.httpClient = new HttpClient()
  }

  /**
   * Lista de recursos que el plan del usuario permite. Siempre se pide a la API (sin caché), así un
   * cambio de plan o un recurso movido de plan por el admin se ve al volver a entrar a la biblioteca.
   * `isDemo` = modo demostración (sin backend, VITE_API_MODE=static).
   */
  async getResources() {
    const response = await this.httpClient.get('/api/v1/resource-libraries')
    return { items: HttpClient.extractList(response).map(normalizeResource), isDemo: this.httpClient.isStaticMode }
  }

  /**
   * Detalle. 403 (plan insuficiente) y 404 se propagan con un código propio para que la pantalla
   * muestre «Mejorar plan» o «no existe». Solo si la ruta principal falla por otro motivo se prueba el alias.
   */
  async getResourceById(id) {
    const paths = [`/api/v1/resource-libraries/${encodeURIComponent(id)}`, `/api/v1/resources/${encodeURIComponent(id)}`]
    let lastError = null
    for (const path of paths) {
      try {
        const data = HttpClient.extractData(await this.httpClient.get(path))
        if (data && data.id != null) return normalizeResource(data)
      } catch (error) {
        if ([401, 403, 404].includes(error.status)) throw detailError(error)
        lastError = error
      }
    }
    throw lastError || new ApiError('not-found', { status: 404, code: RESOURCE_NOT_FOUND })
  }

  async getRelatedResources(resource, limit = 3) {
    const { items } = await this.getResources()
    return items
      .filter((r) => String(r.id) !== String(resource.id))
      .filter((r) => r.category === resource.category || r.tags.some((t) => resource.tags.includes(t)))
      .slice(0, limit)
  }
}
