// Servidor simulado (MSW): responde a las peticiones del frontend en lugar del backend.
// Así las pruebas no necesitan la API .NET encendida: solo se prueba el frontend.
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import es from '../../public/es.json'
import en from '../../public/en.json'
import {
  CREDENTIALS, createToken, backendUsers, verifiedProfessional, pendingProfessional, triggers, appointments, resources
} from './data.js'

// Dirección de la API configurada en el archivo .env
export const API = 'http://localhost:5059/api/v1'

// Respuesta de inicio de sesión según las credenciales de prueba
function signIn(body) {
  const match = Object.entries(CREDENTIALS).find(([, c]) => c.email === body.username && c.password === body.password)
  if (!match) return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  const ids = { worker: 7, admin: 1, psychologist: 21 }
  return HttpResponse.json({ ...backendUsers[ids[match[0]]], token: createToken() })
}

export const server = setupServer(
  // Archivos de traducción
  http.get('*/es.json', () => HttpResponse.json(es)),
  http.get('*/en.json', () => HttpResponse.json(en)),

  // Autenticación
  http.post(API + '/authentication/sign-in', async ({ request }) => signIn(await request.json())),
  http.post(API + '/authentication/sign-up', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ id: 99, fullName: body.fullName, email: body.email, role: body.role, token: createToken() })
  }),
  http.post(API + '/authentication/forgot-password', () => HttpResponse.json({ message: 'ok' })),
  http.post(API + '/authentication/reset-password', () => HttpResponse.json({ message: 'ok' })),

  // Usuarios
  http.get(API + '/users/:id', ({ params }) => HttpResponse.json(backendUsers[params.id] || { id: Number(params.id) })),
  http.put(API + '/users/:id', async ({ request }) => HttpResponse.json(await request.json())),
  http.put(API + '/users/:id/password', () => new HttpResponse(null, { status: 204 })),
  http.delete(API + '/users/:id', () => new HttpResponse(null, { status: 204 })),

  // Suscripciones
  http.post(API + '/subscriptions', async ({ request }) => HttpResponse.json({ id: 1, ...(await request.json()) })),
  http.get(API + '/subscriptions/user/:id', () => HttpResponse.json({}, { status: 404 })),

  // Biblioteca de recursos
  http.get(API + '/resource-libraries', () => HttpResponse.json(resources)),
  http.get(API + '/resource-libraries/:id', () => HttpResponse.json(resources[0])),

  // Desencadenantes de estrés
  http.get(API + '/triggers', () => HttpResponse.json(triggers)),
  http.post(API + '/triggers', async ({ request }) => HttpResponse.json({ id: 99, ...(await request.json()) })),

  // Profesionales (el endpoint "me" va antes que ":id")
  http.get(API + '/professionals/me', () => HttpResponse.json(verifiedProfessional)),
  http.put(API + '/professionals/me', async ({ request }) => HttpResponse.json({ ...verifiedProfessional, ...(await request.json()) })),
  http.get(API + '/professionals', () => HttpResponse.json([verifiedProfessional, pendingProfessional])),
  http.get(API + '/professionals/:id', ({ params }) =>
    HttpResponse.json(String(params.id) === '200' ? pendingProfessional : verifiedProfessional)
  ),
  http.get(API + '/professionals/:id/reviews', () => HttpResponse.json([])),
  http.post(API + '/professionals/:id/reviews', async ({ request }) => HttpResponse.json({ id: 1, ...(await request.json()) })),
  http.get(API + '/professionals/:id/available-slots', () => HttpResponse.json(['09:00', '10:00'])),

  // Citas
  http.get(API + '/appointments/types', () =>
    HttpResponse.json([{ value: 1, displayName: 'Terapia individual', estimatedDurationMinutes: 60 }])
  ),
  http.get(API + '/appointments', () => HttpResponse.json(appointments)),
  http.get(API + '/appointments/:id', ({ params }) =>
    HttpResponse.json(appointments.find((a) => String(a.id) === params.id) || { ...appointments[0], id: Number(params.id) })
  ),
  http.post(API + '/appointments', async ({ request }) => HttpResponse.json({ id: 555, ...(await request.json()) })),
  http.patch(API + '/appointments/:id/status', async ({ params, request }) =>
    HttpResponse.json({ id: Number(params.id), ...(await request.json()) })
  ),

  // Test de autoevaluación e informes compartidos
  http.get(API + '/assessments', () => HttpResponse.json([])),
  http.post(API + '/assessments', async ({ request }) => HttpResponse.json(await request.json())),
  http.get(API + '/reports', () => HttpResponse.json([])),
  http.post(API + '/reports', async ({ request }) => HttpResponse.json({ id: 1, ...(await request.json()) })),

  // Administración: verificación de psicólogos
  http.get(API + '/admin/professionals', () => HttpResponse.json([pendingProfessional])),
  http.patch(API + '/admin/professionals/:id/verify', () => HttpResponse.json({ ok: true })),
  http.patch(API + '/admin/professionals/:id/reject', async ({ request }) => HttpResponse.json(await request.json()))
)
