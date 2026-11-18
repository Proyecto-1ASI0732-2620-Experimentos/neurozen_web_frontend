// Biblioteca simulada con acceso por planes (mismo comportamiento que el backend:
// la lista llega filtrada por plan y el detalle fuera del plan responde 403 sin contentUrl)
import { http, HttpResponse } from 'msw'
import { API } from './server.js'

const PLAN_NAMES = { 1: 'Básico', 2: 'Avanzado', 3: 'Profesional' }
const NOTICE = ' Este material no sustituye la atención de un profesional de la salud.'

// [id, título, tipo, duración, idDeYouTube, plan mínimo]
const ROWS = [
  [1, 'Técnicas de Respiración Profunda', 'Video', 15, 'CVMBSsqTGOk', 1],
  [2, 'Ejercicios de Estiramiento para Oficina', 'Video', 8, 'H0pbvdIcHOY', 1],
  [3, 'Yoga para Reducir la Ansiedad', 'Video', 20, 'tS52C0Pxf_g', 2],
  [4, 'Ejercicios de Relajación Muscular Progresiva', 'Video', 18, 'PzzAlvr3O3M', 2],
  [5, 'Meditación para el Manejo del Dolor Crónico', 'Video', 22, 'r5K8Drgzj_Y', 2],
  [6, 'Ejercicios de Atención Plena en el Trabajo', 'Video', 10, '40LH8G7kI84', 2],
  [7, 'Meditación Guiada de 5 Minutos', 'Audio', 5, 'pyAyEzmiKxU', 1],
  [8, 'Música Relajante para Dormir', 'Audio', 30, 'an60NyBayzE', 1],
  [9, 'Podcast: Manejo de Crisis de Ansiedad', 'Audio', 25, 'A8qOLnTbQdg', 2],
  [10, 'Sonidos de la Naturaleza - Bosque Lluvioso', 'Audio', 45, 'bwSdDBSJK10', 2],
  [11, 'Técnicas de Visualización Positiva', 'Audio', 12, 'GiOamuperW4', 2],
  [12, 'Caminata Meditativa - Guía de Audio', 'Audio', 15, 'QLkFTi02Geo', 2]
]

export function libraryResources() {
  const list = ROWS.map(([id, title, resourceType, duration, yt, plan]) => ({
    id, title, resourceType, duration, plan,
    description: `Descripción de ${title}.` + ([5, 9].includes(id) ? NOTICE : ''),
    contentUrl: `https://www.youtube.com/watch?v=${yt}`,
    thumbnail: `https://img.youtube.com/vi/${yt}/hqdefault.jpg`,
    tags: [], author: '', createdAt: '2026-11-17T22:56:09Z'
  }))
  list.push({ id: 13, title: 'Pausas activas en la jornada', resourceType: 'Article', duration: 4, plan: 1, description: 'Artículo breve.',
    content: 'Primer párrafo del artículo.\n\nSegundo párrafo del artículo.', contentUrl: '', thumbnail: '', tags: [], author: 'Equipo', createdAt: '2026-11-17T22:56:09Z' })
  list.push({ id: 14, title: 'Programa exclusivo Zen+', resourceType: 'Video', duration: 30, plan: 3, description: 'Solo Profesional.',
    contentUrl: 'https://www.youtube.com/watch?v=WkzMBxohi1M', thumbnail: '', tags: [], author: '', createdAt: '2026-11-17T22:56:09Z' })
  return list
}

// La API no devuelve el plan del recurso
const toApi = (r) => {
  const copy = { ...r }
  delete copy.plan
  return copy
}

/**
 * Instala los manejadores. `state.plan` = plan activo (null = sin suscripción). POST /subscriptions lo cambia.
 * Devuelve `state` para que la prueba lo lea o lo modifique.
 */
export function useLibrary(server, { plan = null } = {}) {
  const state = { plan, resources: libraryResources(), requests: [] }
  const callerPlan = () => state.plan ?? 1
  const detail = (id) => {
    const r = state.resources.find((x) => String(x.id) === String(id))
    if (!r) return HttpResponse.json({ message: 'El recurso no existe' }, { status: 404 })
    if (r.plan > callerPlan()) return HttpResponse.json({ message: `Este recurso está disponible desde el plan ${PLAN_NAMES[r.plan]}` }, { status: 403 })
    return HttpResponse.json(toApi(r))
  }
  server.use(
    http.get(API + '/resource-libraries', () => {
      state.requests.push('list')
      return HttpResponse.json(state.resources.filter((r) => r.plan <= callerPlan()).map(toApi))
    }),
    http.get(API + '/resource-libraries/:id', ({ params }) => detail(params.id)),
    http.get(API + '/resources/:id', ({ params }) => detail(params.id)),
    http.get(API + '/subscriptions/user/:id', () => (state.plan == null
      ? HttpResponse.json({ message: 'Sin suscripción' }, { status: 404 })
      : HttpResponse.json({ id: 1, userId: 7, planId: state.plan, isActive: true, holderFirstName: 'Ana', holderLastName: 'Torres', email: 'ana@neurozen.com', cardLast4: '1111' }))),
    http.post(API + '/subscriptions', async ({ request }) => {
      const body = await request.json()
      const created = state.plan == null
      state.plan = body.planId
      return HttpResponse.json({ id: 1, userId: body.userId, planId: body.planId, isActive: true, cardLast4: '1111' }, { status: created ? 201 : 200 })
    })
  )
  return state
}
