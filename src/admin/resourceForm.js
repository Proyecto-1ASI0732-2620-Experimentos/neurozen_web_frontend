/**
 * Lógica del formulario de recursos del panel admin (funciones puras, sin Vue, fáciles de probar).
 * Las reglas replican las del backend; el backend sigue siendo la autoridad final.
 */
import { RESOURCE_LIMITS as L, RESOURCE_PLANS, DEFAULT_PLAN } from '../services/AdminResourceService.js'

const URL_PATTERN = /^https?:\/\/\S+$/i
const TEXT_FIELDS = ['title', 'description', 'content', 'author', 'contentUrl', 'thumbnail']

// La URL es obligatoria en la interfaz para Video y Audio, opcional en Ejercicio y no se usa en Lectura
const URL_RULES = { Article: 'hidden', Exercise: 'optional', Video: 'required', Audio: 'required' }

/** Qué campos muestra el formulario según el tipo */
export function fieldsFor(type) {
  return {
    contentUrl: URL_RULES[type] || 'required',
    // El texto es el contenido principal de lecturas y ejercicios
    contentRecommended: type === 'Article' || type === 'Exercise'
  }
}

export function emptyResourceForm(type = 'Article') {
  return {
    resourceType: type,
    requiredPlan: DEFAULT_PLAN,
    title: '',
    description: '',
    content: '',
    author: '',
    contentUrl: '',
    thumbnail: '',
    duration: 5,
    tags: []
  }
}

/** Formulario a partir de un recurso de GET /admin/resource-libraries/{id} */
export function formFromResource(resource) {
  return {
    resourceType: resource.resourceType,
    requiredPlan: resource.requiredPlan ?? DEFAULT_PLAN,
    title: resource.title,
    description: resource.description,
    content: resource.content,
    author: resource.author,
    contentUrl: resource.contentUrl,
    thumbnail: resource.thumbnail,
    duration: resource.duration,
    tags: [...resource.tags]
  }
}

const isValidUrl = (value) => URL_PATTERN.test(value) && value.length <= L.urlMax

function textErrors(f) {
  const e = {}
  const title = f.title.trim()
  if (title.length < L.titleMin || title.length > L.titleMax) e.title = 'title'
  if (f.description.length > L.descriptionMax) e.description = 'description'
  if (f.content.length > L.contentMax) e.content = 'content'
  if (f.author.trim().length > L.authorMax) e.author = 'author'
  return e
}

function linkErrors(f) {
  const e = {}
  const url = f.contentUrl.trim()
  const urlRule = fieldsFor(f.resourceType).contentUrl
  if (urlRule === 'required' && !url) e.contentUrl = 'urlRequired'
  else if (urlRule !== 'hidden' && url && !isValidUrl(url)) e.contentUrl = 'url'
  const thumbnail = f.thumbnail.trim()
  if (thumbnail && !isValidUrl(thumbnail)) e.thumbnail = 'url'
  return e
}

function metaErrors(f, isNew) {
  const e = {}
  const duration = Number(f.duration)
  if (!Number.isInteger(duration) || duration < 0 || duration > L.durationMax) e.duration = 'duration'
  if (f.tags.length > L.tagsMax || f.tags.some((tag) => tag.length > L.tagMax)) e.tags = 'tags'
  if (!RESOURCE_PLANS.includes(Number(f.requiredPlan))) e.requiredPlan = 'plan'
  if (isNew && !f.resourceType) e.resourceType = 'type'
  return e
}

/** Errores por campo (valor = clave de i18n en adminResources.errors) */
export function validateResourceForm(form, { isNew = true } = {}) {
  return { ...textErrors(form), ...linkErrors(form), ...metaErrors(form, isNew) }
}

/** Cuerpo del POST: en una Lectura no se envía URL de contenido */
export function buildCreatePayload(f) {
  const payload = {
    resourceType: f.resourceType,
    requiredPlan: Number(f.requiredPlan),
    title: f.title.trim(),
    description: f.description.trim(),
    content: f.content.trim(),
    author: f.author.trim(),
    thumbnail: f.thumbnail.trim(),
    duration: Number(f.duration),
    tags: [...f.tags]
  }
  if (fieldsFor(f.resourceType).contentUrl !== 'hidden') payload.contentUrl = f.contentUrl.trim()
  return payload
}

/** Cuerpo del PATCH: solo lo que cambió ("" vacía un campo opcional). resourceType nunca se envía. */
export function buildPatch(form, original) {
  const changes = {}
  TEXT_FIELDS.forEach((key) => {
    const value = String(form[key] ?? '').trim()
    if (value !== String(original[key] ?? '').trim()) changes[key] = value
  })
  if (Number(form.duration) !== Number(original.duration)) changes.duration = Number(form.duration)
  if (form.tags.join('|') !== original.tags.join('|')) changes.tags = [...form.tags]
  if (Number(form.requiredPlan) !== Number(original.requiredPlan)) changes.requiredPlan = Number(form.requiredPlan)
  return changes
}

/** Etiqueta nueva: recortada, sin repetidas y con el máximo de caracteres */
export function addTag(tags, raw) {
  const tag = String(raw ?? '').trim().slice(0, L.tagMax)
  if (!tag || tags.some((t) => t.toLowerCase() === tag.toLowerCase()) || tags.length >= L.tagsMax) return tags
  return [...tags, tag]
}

/** Cuántos recursos hay en el plan Básico por tipo (se recomienda 1-2 por tipo) */
export function basicCountByType(resources, types) {
  return Object.fromEntries(types.map((t) => [t, resources.filter((r) => r.resourceType === t && r.requiredPlan === 1).length]))
}
