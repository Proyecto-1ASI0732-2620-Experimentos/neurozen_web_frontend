/** Traducciones opcionales de recursos (es.json/en.json: resourceLibrary.items / tags). */
export function useResourceText(i18n) {
  const tr = (key, fallback) => {
    const value = i18n.t(key)
    return value && value !== key ? value : fallback
  }
  return {
    title: (r) => tr(`stress.management.resourceLibrary.items.${r.id}.title`, r.title),
    description: (r) => tr(`stress.management.resourceLibrary.items.${r.id}.description`, r.description),
    tag: (t) => tr(`stress.management.resourceLibrary.tags.${t}`, t)
  }
}
