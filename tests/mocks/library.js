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

// 50 lecturas y 20 ejercicios como en el backend (2 de cada tipo en el plan Básico)
function readingsAndExercises() {
  const articles = Array.from({ length: 50 }, (_, i) => ({
    id: 1000 + i, title: `Lectura ${i + 1}`, resourceType: 'Article', duration: 5, plan: i < 2 ? 1 : 2,
    description: `Resumen de la lectura ${i + 1}.`, contentUrl: '', thumbnail: '', tags: ['estrés'], author: 'Equipo NeuroZen',
    content: `Qué es el estrés laboral\n\nEl estrés aparece cuando las demandas superan los recursos.\nPuede afectar el sueño.\n\nSeñales frecuentes\n\n- Cansancio\n- Irritabilidad\n\nEste texto <b>No es HTML</b> <script>alert(1)</script> y se muestra tal cual.`,
    createdAt: '2026-11-18T10:00:00Z'
  }))
  const exercises = Array.from({ length: 20 }, (_, i) => ({
    id: 2000 + i, title: `Ejercicio ${i + 1}`, resourceType: 'Exercise', duration: 6, plan: i < 2 ? 1 : 2,
    description: `Ejercicio guiado ${i + 1}.`, contentUrl: i === 0 ? 'https://www.youtube.com/watch?v=Ki-y10XIVA8' : '', thumbnail: '', tags: ['pausa'],
    author: '', content: `Pasos\n\n1. Siéntate derecho.\n2. Respira profundo.\n3. Estira los brazos.`, createdAt: '2026-11-18T10:00:00Z'
  }))
  return [...articles, ...exercises]
}

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

const toAdmin = (r) => ({ ...toApi(r), content: r.content || '', requiredPlan: r.plan, requiredPlanName: PLAN_NAMES[r.plan] })

/**
 * Instala los manejadores. `state.plan` = plan activo (null = sin suscripción). POST /subscriptions lo cambia.
 * Devuelve `state` para que la prueba lo lea o lo modifique.
 */
export function useLibrary(server, { plan = null, withReadings = false } = {}) {
  const base = libraryResources()
  const resources = withReadings ? [...base.filter((r) => ['Video', 'Audio'].includes(r.resourceType)), ...readingsAndExercises()] : base
  const state = { plan, resources, requests: [], created: [], patches: [] }
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
    // Administración: todos los recursos con su plan
    http.get(API + '/admin/resource-libraries', () => HttpResponse.json(state.resources.map(toAdmin))),
    http.get(API + '/admin/resource-libraries/:id', ({ params }) => {
      const r = state.resources.find((x) => String(x.id) === String(params.id))
      return r ? HttpResponse.json(toAdmin(r)) : HttpResponse.json({ message: 'El recurso no existe' }, { status: 404 })
    }),
    http.post(API + '/resource-libraries', async ({ request }) => {
      const body = await request.json()
      state.created.push(body)
      const r = { ...body, id: 9000 + state.created.length, plan: body.requiredPlan ?? 2 }
      state.resources.push(r)
      return HttpResponse.json(toAdmin(r), { status: 201 })
    }),
    http.patch(API + '/resource-libraries/:id', async ({ params, request }) => {
      const body = await request.json()
      state.patches.push(body)
      const r = state.resources.find((x) => String(x.id) === String(params.id))
      Object.assign(r, body, body.requiredPlan ? { plan: body.requiredPlan } : {})
      return HttpResponse.json(toAdmin(r))
    }),
    http.post(API + '/subscriptions', async ({ request }) => {
      const body = await request.json()
      const created = state.plan == null
      state.plan = body.planId
      return HttpResponse.json({ id: 1, userId: body.userId, planId: body.planId, isActive: true, cardLast4: '1111' }, { status: created ? 201 : 200 })
    })
  )
  return state
}
