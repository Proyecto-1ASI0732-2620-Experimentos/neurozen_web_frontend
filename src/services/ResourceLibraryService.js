/**
 * ResourceLibraryService - Biblioteca de recursos (audio, video, lectura, ejercicios).
 *
 * normalizeResource() unifica los formatos de la API .NET (resourceType, contentUrl,
 * duración en minutos) y del mock (category/type, audioUrl, duración en segundos).
 * Antes la lista y el detalle mapeaban los datos de forma distinta y el detalle
 * no mostraba ningún reproductor.
 *
 * @version 2.0.0
 */
import { HttpClient } from './HttpClient.js'

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

/** Extrae el id de un video de YouTube (watch, youtu.be o embed) */
export function extractYouTubeId(url = '') {
  const match = String(url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/)
  return match ? match[1] : null
}

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
    thumbnail: raw.thumbnail || raw.imageUrl || (youTubeId ? `https://img.youtube.com/vi/${youTubeId}/mqdefault.jpg` : FALLBACK_THUMBNAILS[category]),
    durationMinutes: Math.max(1, minutes),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    createdAt: raw.createdAt || null
  }
}

export class ResourceLibraryService {
  constructor() {
    this.httpClient = new HttpClient()
  }

  /** Lista de recursos. `isDemo` indica que el backend no respondió y se usan datos locales. */
  async getResources() {
    try {
      const response = await this.httpClient.get('/api/v1/resource-libraries')
      return { items: HttpClient.extractList(response).map(normalizeResource), isDemo: false }
    } catch (error) {
      console.warn('Biblioteca: backend no disponible, se usan recursos de ejemplo', error.message)
      return { items: this._getMockResources().map(normalizeResource), isDemo: true }
    }
  }

  /** Detalle; si el endpoint individual falla se busca en la lista */
  async getResourceById(id) {
    // El endpoint individual puede variar según el backend; se prueban ambos
    for (const path of [`/api/v1/resource-libraries/${encodeURIComponent(id)}`, `/api/v1/resources/${encodeURIComponent(id)}`]) {
      try {
        const data = HttpClient.extractData(await this.httpClient.get(path))
        if (data && data.id != null) return normalizeResource(data)
      } catch {
        /* siguiente opción */
      }
    }
    const { items } = await this.getResources()
    const found = items.find((r) => String(r.id) === String(id))
    if (!found) throw new Error('not-found')
    return found
  }

  async getRelatedResources(resource, limit = 3) {
    const { items } = await this.getResources()
    return items
      .filter((r) => String(r.id) !== String(resource.id))
      .filter((r) => r.category === resource.category || r.tags.some((t) => resource.tags.includes(t)))
      .slice(0, limit)
  }

  getCategories() {
    return [
      {
        id: 'audio',
        name: 'Audio',
        description: 'Guided meditations and audio content',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAunrGe3YCJ0zxIVOP4EYtOkzqNaa1lVu2Q1giXc-bpOdRPo_sNc6Chepddi6TNtEDNwD-5EcqgZqRIyzIZ6-aQyLCmhVSUNlsZ3VlglbL-Xp47Zs3ZYcDHby6TdaEmPjUAM4m0lOWtGLm0Y9wpS6FnxFLP95JlQJXmxTRuvxtrDZQoEGll7q-1YZvdXdPSv2MXcVlzMVgUl48msKLRMdrHzWmqwY3ogg6uLAWMYh-Nc_D8fB5BsZuNILrXYSarlt-AreG8EfS4_qQ2'
      },
      {
        id: 'video',
        name: 'Video',
        description: 'Visual guides and video content',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVnF2TWw73fErpHd8yNzMClhv7ppJZwDEll4vnglE_V2_JusbKi_n55sRXt2aeJ0_RSHKp0vaTIpyH5ZtlK8kQKJF1sHoqh-szwaeAj4NufnW033sVBggnBMfYHma_kxBGxaTCXOsqAupGNKCkFAfdhrHROzZc_nzpw4XIPANxo1hi8YAuPBT7_SOzS99lJdYzQWJRifCeNQjzHBukZErTmoB2ff5mdTKlnTDw8hrJUODwbQNlQiWH4qtFBUYNvidOHmkfd6VChJSo'
      },
      {
        id: 'reading',
        name: 'Reading',
        description: 'Articles and written resources',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDk9w6uWqyNE9iQrCElADq0mLbLxt28FlrJwRl-f37Eae0zPM3R9yeUPYs1RavQdXAHHxFLwhnJB6t7tJjf3SRpFYLYR5gj7ReS6vNZ7OKc2OdP9pLAjjzQATg8oz6OYZdnNKb_kpXlSLwIIkYBgNdr592b4EU1Wk55clGo2E8vjhm4nKoB_H2sh0J7OmxliPh-Mg2z-i2H8FHuwTmMWdIVlGw3d2A7bcFzUyOACPAYHAveL86yH4rr7N4ZPVI4PnQwAdXdmZKyebZq'
      },
      {
        id: 'exercises',
        name: 'Exercises',
        description: 'Physical and mental exercises',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuASzCJ22_1ztNrIsCmRFtbh4Z6D340iD2ukNMvMYyVWwY7dY39EqWuDwmkWR0OI7eM_ET6XiTslt3v3e6-JVIypMi3UvbtCmw-Ned3Yw0kngrWe7A4bwiKP55oZ70tYXyKCnruJbBCn-QnMwKBdj9YCM0hxFYaWgvGYRqJWgwwjY4YGX1iMWOVVg6TRh44rzAarkLjVCU0RHGVqR2g1RqjRryo7ZL3BaHyntW7tLXBY4DgIyWD7wh7hL3wURz06HPjpmRgGUOSKbvuD'
      }
    ]
  }

  _getMockResources() {
    return [
      {
        id: 1,
        title: "Técnicas de Respiración Profunda",
        description: "Aprende técnicas de respiración diafragmática para reducir el estrés y la ansiedad en cualquier momento del día.",
        resourceType: "Video",
        category: "video",
        contentUrl: "https://www.youtube.com/watch?v=example1",
        thumbnail: "https://picsum.photos/400/300?random=1",
        duration: 15, // minutos
        author: "Dr. Juan Pérez",
        tags: ["respiración", "mindfulness", "relajación"],
        createdAt: "2024-01-15"
      },
      {
        id: 2,
        title: "Mindfulness para Principiantes",
        description: "Una guía completa para comenzar con la práctica de mindfulness. Descubre cómo estar presente en el momento.",
        resourceType: "Article",
        category: "reading",
        contentUrl: "https://neurozen.com/articles/mindfulness-principiantes",
        thumbnail: "https://picsum.photos/400/300?random=2",
        duration: 10, // minutos
        author: "Lic. María González",
        tags: ["mindfulness", "meditación", "principiantes"],
        createdAt: "2024-01-20"
      },
      {
        id: 3,
        title: "Meditación Guiada de 5 Minutos",
        description: "Meditación rápida perfecta para hacer en tu pausa laboral. Ideal para recuperar la calma y concentración.",
        resourceType: "Audio",
        category: "audio",
        contentUrl: "https://neurozen.com/audio/meditacion-5min.mp3",
        thumbnail: "https://picsum.photos/400/300?random=3",
        duration: 5, // minutos
        author: "Ana Martínez",
        tags: ["meditación", "audio", "pausa"],
        createdAt: "2024-02-01"
      },
      {
        id: 4,
        title: "Ejercicios de Estiramiento para Oficina",
        description: "Serie de estiramientos diseñados para aliviar la tensión muscular causada por largas jornadas frente al ordenador.",
        resourceType: "Video",
        category: "exercises",
        contentUrl: "https://www.youtube.com/watch?v=example2",
        thumbnail: "https://picsum.photos/400/300?random=4",
        duration: 8, // minutos
        author: "Carlos Rodríguez",
        tags: ["ejercicios", "estiramiento", "oficina"],
        createdAt: "2024-02-10"
      },
      {
        id: 5,
        title: "Gestión del Tiempo y Productividad",
        description: "Estrategias probadas para organizar tu tiempo, establecer prioridades y reducir el estrés relacionado con la carga de trabajo.",
        resourceType: "Article",
        category: "reading",
        contentUrl: "https://neurozen.com/articles/gestion-tiempo",
        thumbnail: "https://picsum.photos/400/300?random=5",
        duration: 12, // minutos
        author: "Dr. Laura Sánchez",
        tags: ["productividad", "gestión", "tiempo"],
        createdAt: "2024-02-15"
      },
      {
        id: 6,
        title: "Música Relajante para Dormir",
        description: "Composición de 30 minutos de música ambient diseñada específicamente para facilitar el sueño profundo.",
        resourceType: "Audio",
        category: "audio",
        contentUrl: "https://neurozen.com/audio/musica-dormir.mp3",
        thumbnail: "https://picsum.photos/400/300?random=6",
        duration: 30, // minutos
        author: "Estudio NeuroZen",
        tags: ["música", "sueño", "relajación"],
        createdAt: "2024-02-20"
      },
      {
        id: 7,
        title: "Yoga para Reducir la Ansiedad",
        description: "Secuencia de yoga suave enfocada en posturas que calman el sistema nervioso y reducen los síntomas de ansiedad.",
        resourceType: "Video",
        category: "exercises",
        contentUrl: "https://www.youtube.com/watch?v=example3",
        thumbnail: "https://picsum.photos/400/300?random=7",
        duration: 20, // minutos
        author: "Sofía Ramírez",
        tags: ["yoga", "ansiedad", "ejercicios"],
        createdAt: "2024-03-01"
      },
      {
        id: 8,
        title: "Guía de Alimentación Anti-Estrés",
        description: "Descubre qué alimentos ayudan a combatir el estrés y la ansiedad. Incluye recetas saludables.",
        resourceType: "Article",
        category: "reading",
        contentUrl: "https://neurozen.com/articles/alimentacion-antiestres",
        thumbnail: "https://picsum.photos/400/300?random=8",
        duration: 15, // minutos
        author: "Dra. Patricia López",
        tags: ["alimentación", "nutrición", "salud"],
        createdAt: "2024-03-05"
      }
    ]
  }
}
