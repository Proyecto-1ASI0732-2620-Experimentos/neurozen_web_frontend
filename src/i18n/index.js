/**
 * i18n/index.js - Configuración de internacionalización para NeuroZen
 * Carga las traducciones desde /public y expone utilidades para cambiar idioma.
 *
 * @author Juan Carlos Angulo
 * @version 1.1.0
 */

import { createI18n } from 'vue-i18n'

export const SUPPORTED_LOCALES = ['es', 'en']
const STORAGE_KEY = 'neurozen-locale'
let i18nInstance = null

async function loadLocaleMessages() {
  const messages = {}
  await Promise.all(
    SUPPORTED_LOCALES.map(async (locale) => {
      try {
        const response = await fetch(`/${locale}.json`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        messages[locale] = await response.json()
      } catch (error) {
        console.error(`Error loading locale ${locale}:`, error)
        messages[locale] = {}
      }
    })
  )
  return messages
}

function getDefaultLocale() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && SUPPORTED_LOCALES.includes(saved)) return saved
  const browserLang = (navigator.language || 'es').split('-')[0]
  return SUPPORTED_LOCALES.includes(browserLang) ? browserLang : 'es'
}

export async function createI18nInstance() {
  const messages = await loadLocaleMessages()
  const locale = getDefaultLocale()
  document.documentElement.lang = locale

  i18nInstance = createI18n({
    legacy: true,
    locale,
    fallbackLocale: 'es',
    messages,
    globalInjection: true,
    missingWarn: false,
    fallbackWarn: false
  })
  return i18nInstance
}

/** Idioma activo ('es' | 'en') */
export function getLocale() {
  return i18nInstance ? i18nInstance.global.locale : getDefaultLocale()
}

/** Cambia el idioma, lo persiste y actualiza <html lang>. */
export function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale) || !i18nInstance) return
  i18nInstance.global.locale = locale
  localStorage.setItem(STORAGE_KEY, locale)
  document.documentElement.lang = locale
}

/** Traducción fuera de componentes (servicios, composables). */
export function t(key, params) {
  return i18nInstance ? i18nInstance.global.t(key, params) : key
}
