/**
 * Convierte el `content` de lecturas y ejercicios (texto plano) en bloques para mostrarlo con formato,
 * SIEMPRE como texto (nunca HTML):
 *  - los bloques se separan por líneas en blanco;
 *  - una línea corta sola y sin punto final es un subtítulo;
 *  - las líneas que empiezan con "- " o "1. " forman listas (con viñetas o numeradas);
 *  - el resto son párrafos (se respetan sus saltos de línea con white-space: pre-line).
 */
// Solo se reconoce el prefijo (sin cuantificadores encadenados): el resto de la línea se obtiene con slice()
const BULLET_PREFIX = /^[-•*]\s/
const NUMBER_PREFIX = /^\d{1,3}[.)]\s/
const HEADING_MAX = 80
const ENDS_LIKE_SENTENCE = /[.,;:!?…)"»]$/

function listItem(line) {
  if (BULLET_PREFIX.test(line)) return { ordered: false, text: line.slice(2).trim() }
  const number = NUMBER_PREFIX.exec(line)
  if (number) return { ordered: true, text: line.slice(number[0].length).trim() }
  return null
}

/** Agrupa las líneas de un bloque en listas y párrafos, en orden */
function splitChunk(lines) {
  const blocks = []
  let paragraph = []
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join('\n') })
    paragraph = []
  }
  lines.forEach((line) => {
    const item = listItem(line)
    if (!item) {
      paragraph.push(line)
      return
    }
    flushParagraph()
    const last = blocks[blocks.length - 1]
    if (last && last.type === 'list' && last.ordered === item.ordered) last.items.push(item.text)
    else blocks.push({ type: 'list', ordered: item.ordered, items: [item.text] })
  })
  flushParagraph()
  return blocks
}

const isHeading = (lines) =>
  lines.length === 1 && lines[0].length <= HEADING_MAX && !ENDS_LIKE_SENTENCE.test(lines[0]) && !listItem(lines[0])

export function parseReadingContent(text) {
  const normalized = String(text ?? '').replace(/\r\n?/g, '\n').trim()
  if (!normalized) return []
  return normalized.split(/\n\s*\n/).flatMap((chunk) => {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) return []
    return isHeading(lines) ? [{ type: 'heading', text: lines[0] }] : splitChunk(lines)
  })
}
