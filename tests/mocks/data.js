// Datos de prueba que usan las pruebas y el servidor simulado

// Crea un token JWT de prueba que vence en "seconds" segundos (negativo = ya vencido)
export function createToken(seconds = 3600) {
  const exp = Math.floor(Date.now() / 1000) + seconds
  return 'header.' + btoa(JSON.stringify({ exp })) + '.signature'
}

// Credenciales que acepta el servidor simulado (una por tipo de cuenta)
export const CREDENTIALS = {
  worker: { email: 'ana@neurozen.com', password: 'Secreta123' },
  admin: { email: 'admin@neurozen.com', password: 'Admin2026' },
  psychologist: { email: 'elena@psico.pe', password: 'Segura2026' }
}

// Usuarios con sesión iniciada (formato que guarda el frontend)
export const user = { id: 7, name: 'Ana Torres', fullName: 'Ana Torres', email: 'ana@neurozen.com', role: 'user' }
export const admin = { id: 1, name: 'Equipo NeuroZen', fullName: 'Equipo NeuroZen', email: 'admin@neurozen.com', role: 'admin' }
export const psychologist = {
  id: 21, name: 'Elena Ramírez', fullName: 'Elena Ramírez', email: 'elena@psico.pe', role: 'psychologist',
  verificationStatus: 'verified', professionalId: 1
}

// Usuarios tal como los devuelve GET /users/{id}
export const backendUsers = {
  7: { id: 7, fullName: 'Ana Torres', email: 'ana@neurozen.com', role: 'USER' },
  1: { id: 1, fullName: 'Equipo NeuroZen', email: 'admin@neurozen.com', role: 'ADMIN' },
  21: { id: 21, fullName: 'Elena Ramírez', email: 'elena@psico.pe', role: 'PSYCHOLOGIST' }
}

// Psicóloga verificada (perfil profesional de la cuenta 21)
export const verifiedProfessional = {
  id: 1, userId: 21, name: 'Dra. Elena Ramírez', email: 'elena@psico.pe', specialty: 'clinical', licenseNumber: '45821',
  verificationStatus: 'VERIFIED', price: 80, rating: 4.8, reviews: 12, experienceYears: 8,
  bio: 'Psicóloga clínica especializada en estrés laboral y ansiedad.',
  availabilitySchedule: { days: ['monday', 'wednesday'], start: '09:00', end: '13:00' }
}

// Psicólogo que se registró y aún no fue verificado
export const pendingProfessional = {
  id: 200, userId: 30, name: 'Pedro Gómez Ruiz', email: 'pedro@psico.pe', specialty: 'organizational', licenseNumber: '99999',
  verificationStatus: 'PENDING', price: 0, rating: 0, reviews: 0, createdAt: '2026-10-01T10:00:00Z'
}

// Desencadenantes de estrés ya registrados por el usuario
export const triggers = [
  { id: 1, description: 'Reunión con el gerente', category: 'meeting', stressLevel: 8, triggeredAt: '2026-10-08T15:30:00Z' }
]

// Citas del trabajador con la psicóloga verificada
export const appointments = [
  { id: 501, patientId: 7, patientName: 'Ana Torres', professionalId: 1, appointmentDateTime: '2099-01-15T14:00:00Z', appointmentType: 1, status: 'PENDING' },
  { id: 502, patientId: 7, patientName: 'Ana Torres', professionalId: 1, appointmentDateTime: '2026-01-10T14:00:00Z', appointmentType: 1, status: 'COMPLETED', reviewed: false }
]

// Recursos de la biblioteca (formato de la API .NET: duración en minutos).
// Se usa un id alto para que no coincida con las traducciones por id de es.json.
export const resources = [
  { id: 101, title: 'Respiración para la oficina', description: 'Técnica breve para bajar la tensión entre reuniones.',
    resourceType: 'Video', contentUrl: 'https://www.youtube.com/watch?v=abc123XYZ', duration: 15, tags: ['respiración'] }
]
