/**
 * Traducciones opcionales de recursos (es.json/en.json: resourceLibrary.items / tags).
 *
 * Las traducciones de `items` están indexadas por id y corresponden a los recursos de la
 * demostración (public/data/db.json). Antes se aplicaban a CUALQUIER recurso con ese id, así que
 * el recurso 1 del backend («Técnicas de Respiración Profunda») se mostraba con el título y la
 * descripción de la demo y se perdía su texto real (incluido el aviso clínico).
 * Ahora solo se traduce un recurso si su título original coincide con el de la demo en algún idioma.
 */
import { SUPPORTED_LOCALES } from '../i18n/index.js'

const ITEMS_PATH = ['stress', 'management', 'resourceLibrary', 'items']

function demoItem(i18n, id) {
  return SUPPORTED_LOCALES.map((locale) => {
    const messages = typeof i18n.getLocaleMessage === 'function' ? i18n.getLocaleMessage(locale) : i18n.messages?.[locale]
    return ITEMS_PATH.reduce((node, key) => (node ? node[key] : undefined), messages)?.[id]
  }).filter(Boolean)
}

export function useResourceText(i18n) {
  const tr = (key, fallback) => {
    const value = i18n.t(key)
    return value && value !== key ? value : fallback
  }
  /** true solo si el recurso es el de la demo con ese id (mismo título en es o en) */
  const isDemoResource = (r) => !!r && demoItem(i18n, r.id).some((item) => item.title && item.title === r.title)
  return {
    title: (r) => (isDemoResource(r) ? tr(`stress.management.resourceLibrary.items.${r.id}.title`, r.title) : r.title),
    description: (r) => (isDemoResource(r) ? tr(`stress.management.resourceLibrary.items.${r.id}.description`, r.description) : r.description),
    tag: (t) => tr(`stress.management.resourceLibrary.tags.${t}`, t)
  }
}
