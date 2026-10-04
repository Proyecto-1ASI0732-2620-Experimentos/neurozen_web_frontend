// Datos de prueba que usan las pruebas y el servidor simulado

// Crea un token JWT de prueba que vence en "seconds" segundos
export function createToken(seconds = 3600) {
  const exp = Math.floor(Date.now() / 1000) + seconds
  return 'header.' + btoa(JSON.stringify({ exp })) + '.signature'
}

// Usuario con sesión iniciada
export const user = { id: 7, name: 'Ana Torres', fullName: 'Ana Torres', email: 'ana@neurozen.com' }

// Profesionales que devuelve la API
export const professionals = [
  { id: 1, name: 'Dra. Elena Ramírez', specialty: 'Terapia cognitivo-conductual', price: 80, rating: 4.8 }
]

// Desencadenantes de estrés ya registrados por el usuario
export const triggers = [
  { id: 1, description: 'Reunión con el gerente', category: 'meeting', stressLevel: 8, triggeredAt: '2026-10-08T15:30:00Z' }
]
