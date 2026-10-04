/**
 * preferences.js - Aplica las preferencias guardadas en Ajustes
 * (tamaño de fuente, reducir animaciones, alto contraste).
 */
const SETTINGS_KEY = 'neurozen_settings'

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null')
  } catch {
    return null
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  applyPreferences(settings)
}

export function applyPreferences(settings = loadSettings()) {
  const root = document.documentElement
  const general = settings?.general || {}
  const size = Number(general.fontSize)
  root.style.fontSize = size >= 12 && size <= 22 ? `${size}px` : ''
  root.classList.toggle('reduce-motion', !!general.reduceAnimations)
  root.classList.toggle('high-contrast', !!general.highContrast)
}

export { SETTINGS_KEY }
