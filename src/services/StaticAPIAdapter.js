/**
 * StaticAPIAdapter - API simulada para Firebase Hosting (VITE_API_MODE=static).
 *
 * Lee /data/db.json (sin modificarlo) y traduce los endpoints reales de la API
 * .NET (/api/v1/...) a las colecciones del archivo. Antes:
 *  - '/api/v1/professionals' se interpretaba como recurso 'api' y fallaba.
 *  - sign-in no devolvía token, por lo que el login era imposible en producción.
 *  - un usuario inexistente devolvía otro usuario como "fallback".
 *
 * Las escrituras se guardan solo en memoria durante la sesión del navegador.
 */
import { ApiError } from './ApiError.js'

const RESOURCE_MAP = {
  users: 'users',
  professionals: 'professionals',
  'resource-libraries': 'resourceLibrary',
  resources: 'resourceLibrary',
  triggers: 'stressTriggers',
  appointments: 'appointments',
  onboarding: 'onboarding',
  reviews: 'reviews'
}

const QUERY_FIELD_MAP = { patientId: 'userId' }

function stripSensitive(user) {
  if (!user) return user
  const { password, ...rest } = user
  return rest
}

function sameId(a, b) {
  return String(a) === String(b)
}

export class StaticAPIAdapter {
  constructor() {
    this.data = null
    this.loading = null
  }

  async loadData() {
    if (this.data) return this.data
    if (!this.loading) {
      this.loading = fetch('/data/db.json')
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((json) => (this.data = json))
        .catch((error) => {
          this.loading = null
          throw new ApiError('No se pudieron cargar los datos de demostración.', { status: 0, cause: error })
        })
    }
    return this.loading
  }

  parse(endpoint) {
    const [path, queryString = ''] = endpoint.split('?')
    const segments = path.replace(/^\/+/, '').replace(/^api\/v\d+\//, '').split('/').filter(Boolean)
    const query = Object.fromEntries(new URLSearchParams(queryString))
    return { segments, query }
  }

  notFound(what) {
    return new ApiError(`${what} no encontrado`, { status: 404 })
  }

  async request(method, endpoint, body) {
    const data = await this.loadData()
    const { segments, query } = this.parse(endpoint)
    const [resource, id, sub] = segments

    // Autenticación simulada contra los usuarios de db.json
    if (resource === 'authentication') return this.auth(id, body, data)

    const key = RESOURCE_MAP[resource]
    if (!key || !Array.isArray(data[key])) {
      throw this.notFound(`Recurso '${resource}'`)
    }
    const collection = data[key]

    if (method === 'GET') {
      // /professionals/{id}/reviews
      if (resource === 'professionals' && id && sub === 'reviews') {
        return (data.reviews || []).filter((r) => sameId(r.professionalId, id))
      }
      if (id && sub) throw this.notFound(endpoint)
      if (id) {
        const item = collection.find((i) => sameId(i.id, id))
        if (!item) throw this.notFound('Registro')
        return key === 'users' ? stripSensitive(item) : item
      }
      let list = collection
      Object.entries(query).forEach(([param, value]) => {
        if (param === 'search' || param === 'date') return
        const field = QUERY_FIELD_MAP[param] || param
        list = list.filter((i) => i[field] === undefined || sameId(i[field], value))
      })
      return key === 'users' ? list.map(stripSensitive) : list
    }

    if (method === 'POST') {
      const item = { ...body, id: Date.now(), createdAt: new Date().toISOString() }
      collection.push(item)
      return item
    }

    if (method === 'PUT') {
      const index = collection.findIndex((i) => sameId(i.id, id))
      if (index === -1) throw this.notFound('Registro')
      collection[index] = { ...collection[index], ...body, updatedAt: new Date().toISOString() }
      return key === 'users' ? stripSensitive(collection[index]) : collection[index]
    }

    if (method === 'DELETE') {
      const index = collection.findIndex((i) => sameId(i.id, id))
      if (index > -1) collection.splice(index, 1)
      return null
    }

    throw new ApiError('Operación no soportada en modo demostración', { status: 400 })
  }

  auth(action, body = {}, data) {
    const users = data.users || []
    if (action === 'sign-in') {
      const login = String(body.username || '').toLowerCase()
      const user = users.find((u) => String(u.email).toLowerCase() === login && u.password === body.password)
      if (!user) throw new ApiError('Credenciales inválidas', { status: 401 })
      return { ...stripSensitive(user), token: `static-demo-token.${user.id}` }
    }
    if (action === 'sign-up') {
      const email = String(body.email || '').toLowerCase()
      if (users.some((u) => String(u.email).toLowerCase() === email)) {
        throw new ApiError('Ya existe una cuenta con este correo', { status: 409 })
      }
      const user = {
        id: String(Date.now()),
        email: body.email,
        username: body.username,
        name: body.fullName || [body.firstName, body.lastName].filter(Boolean).join(' '),
        role: 'user',
        createdAt: new Date().toISOString()
      }
      users.push({ ...user, password: body.password })
      return { ...user, token: `static-demo-token.${user.id}` }
    }
    throw new ApiError('Operación no soportada', { status: 400 })
  }
}
