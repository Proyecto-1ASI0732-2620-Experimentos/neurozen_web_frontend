/**
 * StaticAPIAdapter - API simulada para el modo demostración (VITE_API_MODE=static).
 *
 * Lee /data/db.json (SIN modificar el archivo) y responde a los mismos endpoints que la
 * API .NET (/api/v1/...). Los cambios (registros, citas, verificaciones) se guardan en
 * sessionStorage, así la demostración funciona entre pantallas e inicios de sesión
 * hasta que se cierra el navegador.
 *
 * Cuentas de demostración incluidas en db.json:
 *   - user@example.com / password      → trabajador
 *   - admin@neurozen.com / 123456      → administrador (valida psicólogos)
 */
import { ApiError } from './ApiError.js'
import { getUserId } from './session.js'

const SNAPSHOT_KEY = 'neurozen_static_db'

const RESOURCE_MAP = {
  users: 'users',
  professionals: 'professionals',
  'resource-libraries': 'resourceLibrary',
  resources: 'resourceLibrary',
  triggers: 'stressTriggers',
  appointments: 'appointments',
  onboarding: 'onboarding',
  reviews: 'reviews',
  assessments: 'assessments',
  reports: 'reports'
}

const sameId = (a, b) => a != null && b != null && String(a) === String(b)

function stripSensitive(user) {
  if (!user) return user
  const { password, ...rest } = user
  return rest
}

/** Los profesionales de db.json no tienen estado: se consideran ya verificados */
const statusOf = (p) => String(p.verificationStatus || 'VERIFIED').toUpperCase()

export class StaticAPIAdapter {
  constructor() {
    this.data = null
    this.loading = null
  }

  async loadData() {
    if (this.data) return this.data
    if (!this.loading) {
      this.loading = (async () => {
        try {
          const saved = sessionStorage.getItem(SNAPSHOT_KEY)
          if (saved) return (this.data = JSON.parse(saved))
        } catch {
          /* snapshot dañado: se vuelve a leer db.json */
        }
        const r = await fetch('/data/db.json')
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        this.data = await r.json()
        return this.data
      })().catch((error) => {
        this.loading = null
        throw new ApiError('No se pudieron cargar los datos de demostración.', { status: 0, cause: error })
      })
    }
    return this.loading
  }

  save() {
    try {
      sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(this.data))
    } catch {
      /* sin espacio: los cambios quedan solo en memoria */
    }
  }

  parse(endpoint) {
    const [path, queryString = ''] = endpoint.split('?')
    const segments = path.replace(/^\/+/, '').replace(/^api\/v\d+\//, '').split('/').filter(Boolean)
    return { segments, query: Object.fromEntries(new URLSearchParams(queryString)) }
  }

  notFound(what) {
    return new ApiError(`${what} no encontrado`, { status: 404 })
  }

  currentUser(data) {
    const id = getUserId()
    return (data.users || []).find((u) => sameId(u.id, id)) || null
  }

  requireAdmin(data) {
    const me = this.currentUser(data)
    if (!me || String(me.role).toLowerCase() !== 'admin') throw new ApiError('Acceso solo para administradores', { status: 403 })
  }

  myProfessional(data) {
    const id = getUserId()
    const pro = (data.professionals || []).find((p) => sameId(p.userId, id))
    if (!pro) throw this.notFound('Perfil profesional')
    return pro
  }

  async request(method, endpoint, body = {}) {
    const data = await this.loadData()
    const { segments, query } = this.parse(endpoint)
    const [resource, id, sub] = segments

    if (resource === 'authentication') return this.auth(id, body, data)
    if (resource === 'admin') return this.admin(method, segments.slice(1), query, body, data)
    if (resource === 'professionals' && id === 'me') return this.myProfile(method, body, data)
    if (resource === 'appointments' && method === 'PATCH' && sub === 'status') return this.setAppointmentStatus(id, body, data)
    if (resource === 'professionals' && id && sub === 'reviews' && method === 'POST') return this.addReview(id, body, data)
    if (resource === 'users' && id && sub === 'password' && method === 'PUT') return this.changePassword(id, body, data)
    if (resource === 'users' && id && !sub && method === 'DELETE') return this.deleteUser(id, data)
    if (resource === 'reports' && method === 'GET') return this.listReports(query, data)

    const key = RESOURCE_MAP[resource]
    if (!key) throw this.notFound(`Recurso '${resource}'`)
    if (!Array.isArray(data[key])) data[key] = []
    const collection = data[key]

    if (method === 'GET') {
      if (resource === 'professionals' && id && sub === 'reviews') {
        return (data.reviews || []).filter((r) => sameId(r.professionalId, id))
      }
      if (id && sub) throw this.notFound(endpoint)
      if (id) {
        const item = collection.find((i) => sameId(i.id, id))
        if (!item) throw this.notFound('Registro')
        // Perfil público: un psicólogo no verificado no existe para los demás
        if (key === 'professionals' && statusOf(item) !== 'VERIFIED') throw this.notFound('Psicólogo')
        return key === 'users' ? stripSensitive(item) : key === 'appointments' ? this.withPatient(item, data) : item
      }
      let list = collection
      // Directorio público: solo profesionales verificados
      if (key === 'professionals') list = list.filter((p) => statusOf(p) === 'VERIFIED')
      Object.entries(query).forEach(([param, value]) => {
        if (param === 'search' || param === 'date') return
        if (param === 'patientId') list = list.filter((i) => sameId(i.patientId ?? i.userId, value))
        else list = list.filter((i) => i[param] === undefined || sameId(i[param], value))
      })
      if (key === 'users') return list.map(stripSensitive)
      if (key === 'appointments') return list.map((a) => this.withPatient(a, data))
      return list
    }

    if (method === 'POST') {
      const item = { ...body, id: Date.now(), createdAt: new Date().toISOString() }
      if (key === 'appointments') item.status = item.status || 'PENDING'
      collection.push(item)
      this.save()
      return item
    }

    if (method === 'PUT') {
      const index = collection.findIndex((i) => sameId(i.id, id))
      if (index === -1) throw this.notFound('Registro')
      collection[index] = { ...collection[index], ...body, updatedAt: new Date().toISOString() }
      this.save()
      return key === 'users' ? stripSensitive(collection[index]) : collection[index]
    }

    if (method === 'DELETE') {
      const index = collection.findIndex((i) => sameId(i.id, id))
      if (index > -1) collection.splice(index, 1)
      this.save()
      return null
    }

    throw new ApiError('Operación no soportada en modo demostración', { status: 400 })
  }

  /** Añade el nombre del paciente a la cita (como haría el backend con un JOIN) */
  withPatient(appointment, data) {
    const patientId = appointment.patientId ?? appointment.userId
    const patient = (data.users || []).find((u) => sameId(u.id, patientId))
    return { ...appointment, patientName: appointment.patientName || patient?.name || patient?.fullName || '', patientEmail: patient?.email || '' }
  }

  setAppointmentStatus(id, body, data) {
    const appointment = (data.appointments || []).find((a) => sameId(a.id, id))
    if (!appointment) throw this.notFound('Cita')
    const status = String(body.status || '').toUpperCase()
    const isPatient = sameId(appointment.patientId ?? appointment.userId, getUserId())
    if (isPatient) {
      // El paciente solo puede cancelar su propia cita
      if (status !== 'CANCELLED') throw new ApiError('Acción no permitida', { status: 403 })
    } else {
      const me = this.myProfessional(data)
      if (!sameId(appointment.professionalId, me.id)) throw this.notFound('Cita')
    }
    appointment.status = status
    appointment.updatedAt = new Date().toISOString()
    this.save()
    return appointment
  }

  addReview(professionalId, body, data) {
    const pro = (data.professionals || []).find((p) => sameId(p.id, professionalId))
    if (!pro) throw this.notFound('Psicólogo')
    const appointment = (data.appointments || []).find((a) => sameId(a.id, body.appointmentId))
    if (!appointment || String(appointment.status).toUpperCase() !== 'COMPLETED') {
      throw new ApiError('Solo se puede calificar una sesión atendida', { status: 400 })
    }
    if (appointment.reviewed) throw new ApiError('Esta sesión ya fue calificada', { status: 409 })
    const me = this.currentUser(data)
    const review = {
      id: Date.now(),
      professionalId: pro.id,
      appointmentId: appointment.id,
      userName: me?.name || 'Paciente',
      rating: Number(body.rating),
      comment: body.comment || '',
      date: new Date().toISOString()
    }
    if (!data.reviews) data.reviews = []
    data.reviews.push(review)
    appointment.reviewed = true
    // Recalcula la valoración del profesional
    const all = data.reviews.filter((r) => sameId(r.professionalId, pro.id))
    pro.reviews = all.length
    pro.rating = Math.round((all.reduce((sum, r) => sum + Number(r.rating), 0) / all.length) * 10) / 10
    this.save()
    return review
  }

  listReports(query, data) {
    let list = data.reports || []
    if (query.patientId) list = list.filter((r) => sameId(r.patientId, query.patientId))
    if (query.professionalId) list = list.filter((r) => sameId(r.professionalId, query.professionalId))
    return list.map((r) => ({ ...r, patientName: (data.users || []).find((u) => sameId(u.id, r.patientId))?.name || '' }))
  }

  changePassword(id, body, data) {
    const user = (data.users || []).find((u) => sameId(u.id, id))
    if (!user || !sameId(id, getUserId())) throw this.notFound('Usuario')
    // 400 (no 401): una contraseña actual incorrecta no debe cerrar la sesión
    if (user.password !== body.currentPassword) throw new ApiError('La contraseña actual no es correcta', { status: 400 })
    user.password = body.newPassword
    this.save()
    return null
  }

  deleteUser(id, data) {
    if (!sameId(id, getUserId())) throw new ApiError('Acción no permitida', { status: 403 })
    data.users = (data.users || []).filter((u) => !sameId(u.id, id))
    data.professionals = (data.professionals || []).filter((p) => !sameId(p.userId, id))
    this.save()
    return null
  }

  myProfile(method, body, data) {
    const pro = this.myProfessional(data)
    if (method === 'GET') return pro
    if (method === 'PUT') {
      const licenseChanged = body.licenseNumber && body.licenseNumber !== pro.licenseNumber
      Object.assign(pro, body, {
        name: body.fullName || pro.name,
        updatedAt: new Date().toISOString()
      })
      // Cambiar la colegiatura o reenviar tras un rechazo vuelve a dejar la cuenta en revisión
      if (licenseChanged || statusOf(pro) === 'REJECTED') {
        pro.verificationStatus = 'PENDING'
        pro.rejectionReason = ''
      }
      this.save()
      return pro
    }
    throw new ApiError('Operación no soportada', { status: 400 })
  }

  admin(method, segments, query, body, data) {
    this.requireAdmin(data)
    const [resource, id, action] = segments
    if (resource !== 'professionals') throw this.notFound('Recurso de administración')
    const professionals = data.professionals || []

    if (method === 'GET' && !id) {
      const status = String(query.status || '').toUpperCase()
      return professionals
        .filter((p) => p.userId != null) // solo los que se registraron por la plataforma
        .filter((p) => !status || statusOf(p) === status)
        .map((p) => ({ ...p, email: p.email || (data.users || []).find((u) => sameId(u.id, p.userId))?.email || '' }))
    }

    if (method === 'PATCH' && id && (action === 'verify' || action === 'reject')) {
      const pro = professionals.find((p) => sameId(p.id, id))
      if (!pro) throw this.notFound('Psicólogo')
      if (action === 'verify') {
        pro.verificationStatus = 'VERIFIED'
        pro.rejectionReason = ''
        pro.verifiedAt = new Date().toISOString()
        pro.verifiedBy = getUserId()
      } else {
        if (!String(body.reason || '').trim()) throw new ApiError('El motivo es obligatorio', { status: 400 })
        pro.verificationStatus = 'REJECTED'
        pro.rejectionReason = body.reason.trim()
      }
      this.save()
      return pro
    }
    throw new ApiError('Operación no soportada', { status: 400 })
  }

  auth(action, body = {}, data) {
    const users = data.users || (data.users = [])
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
      const isPsychologist = String(body.role).toUpperCase() === 'PSYCHOLOGIST'
      const professionals = data.professionals || (data.professionals = [])
      if (isPsychologist && professionals.some((p) => p.licenseNumber && p.licenseNumber === body.licenseNumber)) {
        throw new ApiError('Ese número de colegiatura ya está registrado', { status: 409 })
      }
      const user = {
        id: String(Date.now()),
        email: body.email,
        username: body.username,
        name: body.fullName,
        role: isPsychologist ? 'psychologist' : 'user',
        acceptedTermsAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
      users.push({ ...user, password: body.password })
      if (isPsychologist) {
        professionals.push({
          id: Date.now() + 1,
          userId: user.id,
          name: body.fullName,
          email: body.email,
          specialty: body.specialty,
          licenseNumber: body.licenseNumber,
          verificationStatus: 'PENDING',
          bio: '',
          experienceYears: 0,
          price: 0,
          rating: 0,
          reviews: 0,
          availability: '',
          availabilitySchedule: null,
          image: '/images-of-professionals/usuariodemo.jpg',
          createdAt: new Date().toISOString()
        })
      }
      this.save()
      return { ...user, token: `static-demo-token.${user.id}` }
    }
    if (action === 'forgot-password') {
      // Modo demostración: no se envían correos; se devuelve el enlace para probar el flujo
      const user = users.find((u) => String(u.email).toLowerCase() === String(body.email || '').toLowerCase())
      return { message: 'ok', demoResetToken: user ? btoa(`reset:${user.email}`) : null }
    }
    if (action === 'reset-password') {
      let email = ''
      try {
        email = atob(String(body.token || '')).replace(/^reset:/, '')
      } catch {
        email = ''
      }
      const user = users.find((u) => u.email === email)
      if (!user) throw new ApiError('El enlace no es válido o ya venció', { status: 400 })
      user.password = body.newPassword
      this.save()
      return { message: 'ok' }
    }
    throw new ApiError('Operación no soportada', { status: 400 })
  }
}
