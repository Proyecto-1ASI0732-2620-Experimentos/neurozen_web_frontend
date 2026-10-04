// Servidor simulado (MSW): responde a las peticiones del frontend en lugar del backend.
// Así las pruebas no necesitan la API .NET encendida.
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import es from '../../public/es.json'
import en from '../../public/en.json'
import { professionals, triggers } from './data.js'

// Dirección de la API configurada en el archivo .env
export const API = 'http://localhost:5059/api/v1'

export const server = setupServer(
  // Archivos de traducción (español e inglés)
  http.get('*/es.json', () => HttpResponse.json(es)),
  http.get('*/en.json', () => HttpResponse.json(en)),

  // Desencadenantes de estrés: listar y crear
  http.get(API + '/triggers', () => HttpResponse.json(triggers)),
  http.post(API + '/triggers', async ({ request }) => HttpResponse.json({ id: 99, ...(await request.json()) })),

  // Profesionales y horarios disponibles
  http.get(API + '/professionals', () => HttpResponse.json(professionals)),
  http.get(API + '/professionals/:id', () => HttpResponse.json(professionals[0])),
  http.get(API + '/professionals/:id/available-slots', () => HttpResponse.json(['09:00', '10:00'])),

  // Citas: tipos, listado, detalle y creación
  http.get(API + '/appointments/types', () =>
    HttpResponse.json([{ value: 1, displayName: 'Terapia individual', estimatedDurationMinutes: 60 }])
  ),
  http.get(API + '/appointments', () => HttpResponse.json([])),
  http.get(API + '/appointments/:id', () =>
    HttpResponse.json({ id: 555, professionalId: 1, appointmentDateTime: '2026-10-20T14:00:00Z' })
  ),
  http.post(API + '/appointments', async ({ request }) => HttpResponse.json({ id: 555, ...(await request.json()) }))
)
