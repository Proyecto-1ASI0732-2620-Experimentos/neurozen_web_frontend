// Verifica que las traducciones en español e inglés tengan las mismas claves.
// El curso exige i18n (en_US y es_419): si falta una clave, el pipeline falla.
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const localePath = (lang) => resolve(process.cwd(), 'public', `${lang}.json`)

const loadLocale = (lang) =>
    existsSync(localePath(lang)) ? JSON.parse(readFileSync(localePath(lang), 'utf-8')) : undefined

const flatKeys = (obj, prefix = '') =>
    Object.entries(obj ?? {}).flatMap(([key, value]) =>
        value && typeof value === 'object' && !Array.isArray(value)
            ? flatKeys(value, `${prefix}${key}.`)
            : [`${prefix}${key}`],
    )

describe('Internationalization (i18n)', () => {
  const es = loadLocale('es')
  const en = loadLocale('en')

  it('includes Spanish and English translation files', () => {
    expect(es).toBeTruthy()
    expect(en).toBeTruthy()
  })

  it('English contains every Spanish key', () => {
    const enKeys = new Set(flatKeys(en))
    expect(flatKeys(es).filter((k) => !enKeys.has(k))).toEqual([])
  })

  it('Spanish contains every English key', () => {
    const esKeys = new Set(flatKeys(es))
    expect(flatKeys(en).filter((k) => !esKeys.has(k))).toEqual([])
  })
})