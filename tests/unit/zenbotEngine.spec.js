// Pruebas unitarias: motor de ZenBot (src/zenbot/zenbotEngine.js) y recomendación de recursos (zenbotResources.js)
// Actualizadas para la v2 del motor (intenciones con contexto y niveles de riesgo); las 5 pruebas originales se conservan.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { respond, assessRisk, classify, NEEDS, ACTIONS, STARTERS, initialContext } from '../../src/zenbot/zenbotEngine.js'
import { rankResources } from '../../src/zenbot/zenbotResources.js'
import router from '../../src/routes/index.js'

const es = JSON.parse(readFileSync(resolve(process.cwd(), 'public/es.json'), 'utf-8'))
const lookup = (key) => key.split('.').reduce((node, k) => (node ? node[k] : undefined), es)

/** Conversación de varios turnos: devuelve todas las respuestas */
function chat(...messages) {
  let context = initialContext()
  return messages.map((m) => {
    const r = respond(m, context)
    context = r.context
    return r
  })
}

describe('ZenBotEngine', () => {
  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Es la regla de seguridad más importante del asistente: ante ideas de
   *   suicidio debe mostrar ayuda inmediata, aunque el mensaje mencione otros temas.
   * - ¿Qué hace esta prueba?: Envía un mensaje con "trabajo" y "no quiero vivir" y verifica que se detecte crisis
   *   y que NO se busquen recursos ni se ofrezcan acciones secundarias.
   */
  it('crisisMessage_shouldHavePriorityOverOtherTopics', () => {
    const reply = respond('por el trabajo ya no quiero vivir')
    expect(reply.crisis).toBe(true)
    expect(reply.intent).toBe('crisis')
    expect(reply.resourceQuery).toBeNull()
    expect(reply.actions.map((a) => a.id)).toEqual(['directory', 'book'])
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: El usuario escribe con tildes y mayúsculas; ZenBot debe entenderlo igual.
   * - ¿Qué hace esta prueba?: Envía "ESTRÉS" y verifica que responda sobre estrés con un enlace a respiración.
   */
  it('stressMessageWithAccents_shouldSuggestBreathing', () => {
    const reply = respond('Tengo mucho ESTRÉS')
    expect(reply.intent).toBe('stress')
    expect(reply.links.map((l) => l.to)).toContain('/stress/breathing')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Las palabras cortas generaban falsas coincidencias ("hi" detectaba "hice").
   * - ¿Qué hace esta prueba?: Verifica que "hice ejercicio hoy" no se tome como saludo.
   */
  it('shortKeyword_shouldNotMatchInsideOtherWords', () => {
    expect(respond('hice ejercicio hoy').intent).not.toBe('greeting')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Cuando ZenBot no entiende, debe orientar al usuario y no dejarlo sin respuesta.
   * - ¿Qué hace esta prueba?: Envía un texto sin sentido y verifica la respuesta de "no entendí" con acceso a psicólogos.
   */
  it('unknownMessage_shouldReturnFallbackWithSpecialist', () => {
    const reply = respond('asdfgh')
    expect(reply.textKey).toBe('zenbot.answers.fallback')
    expect(reply.links.map((l) => l.to)).toContain('/therapists')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Si el usuario insiste y ZenBot sigue sin entender, el caso necesita a una persona.
   * - ¿Qué hace esta prueba?: Simula un segundo mensaje no entendido y verifica que recomiende un especialista.
   */
  it('secondUnknownMessage_shouldRecommendSpecialist', () => {
    expect(respond('qwerty', 1).textKey).toBe('zenbot.answers.fallbackSpecialist')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: ZenBot debe reconocer necesidades por sinónimos, no por una sola palabra fija.
   * - ¿Qué hace esta prueba?: Comprueba la tabla de intenciones del requerimiento (5.3) con frases variadas.
   */
  it('intentClassification_shouldRecognizeSynonyms', () => {
    const cases = {
      'estoy con mucha presión, agobiado': 'stress',
      'mi jefe me llena de tareas': 'work',
      'tengo nervios y mucha preocupación': 'anxiety',
      'sufro de insomnio': 'sleep',
      'creo que tengo burnout, estoy quemado': 'burnout',
      'quiero aprender a respirar con tranquilidad': 'relax',
      'me cuesta la concentración y la productividad': 'focus',
      'quiero ir a terapia con un psicólogo': 'professional',
      'quiero hacer el test PSS-10': 'assessment',
      'quiero reservar una cita': 'booking',
      'quiero cancelar mi cita': 'appointments',
      'I feel anxious and worried': 'anxiety',
      'I can not sleep, insomnia': 'sleep'
    }
    Object.entries(cases).forEach(([text, intent]) => expect(classify(text)[0]?.id, text).toBe(intent))
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Ejemplo del requerimiento (5.6): la respuesta corta debe entenderse dentro
   *   del tema laboral mencionado antes, sin repetir la pregunta.
   * - ¿Qué hace esta prueba?: Conversa en dos turnos y verifica la pregunta de seguimiento y la continuación.
   */
  it('conversationContext_shouldInterpretFollowUpWithinWorkTopic', () => {
    const [first, second] = chat('Estoy teniendo mucho estrés en el trabajo', 'Tengo demasiadas responsabilidades')
    expect(first.intent).toBe('work')
    expect(first.followUpKey).toBe('zenbot.followUps.work')
    expect(second.intent).toBe('work')
    expect(second.textKey).toBe('zenbot.continue.work')
    expect(second.followUpKey).toBeNull()
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Respuestas cortas como "sí" deben seguir el tema y el usuario debe poder
   *   cambiar de tema cuando quiera.
   * - ¿Qué hace esta prueba?: Tras hablar de sueño responde "sí" (continúa) y luego pregunta por citas (cambia).
   */
  it('conversationContext_shouldAllowShortRepliesAndTopicChange', () => {
    const [, short, change] = chat('no puedo dormir bien', 'sí, mucho', 'quiero ver mis citas')
    expect(short.intent).toBe('sleep')
    expect(short.textKey).toBe('zenbot.continue.sleep')
    expect(change.intent).toBe('appointments')
    expect(change.actions.map((a) => a.to)).toContain('/appointments')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Las respuestas no deben repetirse mecánicamente.
   * - ¿Qué hace esta prueba?: Pregunta dos veces por relajación y verifica variantes distintas.
   */
  it('repeatedTopic_shouldUseDifferentVariant', () => {
    const [a, b] = chat('quiero relajarme', 'enséñame a relajarme')
    expect(a.textKey).not.toBe(b.textKey)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Nivel 2 (5.8): malestar persistente → recomendar apoyo profesional sin diagnosticar.
   * - ¿Qué hace esta prueba?: Mensaje de ansiedad "todos los días" → acceso al directorio y a reservar.
   */
  it('persistentDistress_shouldRecommendProfessionalSupport', () => {
    const reply = respond('tengo ataques de panico todos los dias')
    expect(reply.risk).toBe('support')
    expect(reply.supportKey).toBe('zenbot.answers.supportSuggestion')
    expect(reply.actions.map((a) => a.id).slice(0, 2)).toEqual(['directory', 'book'])
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Las expresiones ambiguas deben manejarse con cuidado (minimizar falsos negativos).
   * - ¿Qué hace esta prueba?: "no aguanto más" → pregunta de comprobación; "sí" → crisis; "no" → apoyo profesional.
   */
  it('ambiguousExpression_shouldCheckAndEscalateOnConfirmation', () => {
    const [check, yes] = chat('ya no aguanto más', 'sí')
    expect(check.check).toBe(true)
    expect(check.textKey).toBe('zenbot.answers.riskCheck')
    expect(yes.crisis).toBe(true)
    const [, no] = chat('quisiera desaparecer', 'no')
    expect(no.intent).toBe('supportAfterCheck')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Una negación ("no quiero morir") no debe descartarse sin más; y tras una crisis
   *   no se debe volver a recomendaciones rutinarias hasta que la persona diga que está a salvo.
   * - ¿Qué hace esta prueba?: Verifica la comprobación ante la negación y el modo seguro continuo tras la crisis.
   */
  it('riskHandling_shouldBeCautiousWithNegationAndPersistAfterCrisis', () => {
    expect(assessRisk('no quiero morir, solo estoy cansado').level).toBe('check')
    expect(assessRisk('el trabajo me mata de aburrimiento').level).toBe('none')
    expect(assessRisk('I want to kill myself').level).toBe('crisis')
    const [, after, safe] = chat('me quiero hacer daño', 'quiero ver un video', 'ya estoy a salvo, gracias')
    expect(after.crisis).toBe(true)
    expect(after.resourceQuery).toBeNull()
    expect(safe.crisis).toBe(false)
    expect(safe.textKey).toBe('zenbot.answers.afterCrisis')
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Cada una de las 10 opciones iniciales debe abrir una conversación contextualizada.
   * - ¿Qué hace esta prueba?: Pulsa cada opción y verifica que la intención corresponda y que haya acciones o recursos.
   */
  it('starters_shouldOpenContextualConversations', () => {
    expect(STARTERS).toHaveLength(10)
    STARTERS.forEach((s) => {
      const reply = respond('', initialContext(), { starter: s.id })
      expect(reply.intent).toBe(s.intent)
      expect(reply.actions.length + (reply.resourceQuery ? 1 : 0)).toBeGreaterThan(0)
    })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Los accesos deben conducir a rutas reales (no basta con mencionarlas).
   * - ¿Qué hace esta prueba?: Resuelve cada acción con el router de la app y verifica que no termine en la página 404.
   */
  it('actions_shouldPointToExistingRoutes', () => {
    Object.values(ACTIONS).forEach((a) => {
      const route = router.resolve(a.to)
      expect(route.name, a.to).toBeTruthy()
      expect(route.name, a.to).not.toBe('NotFound')
    })
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Ningún texto técnico (clave sin traducir) debe aparecer en el chat.
   * - ¿Qué hace esta prueba?: Verifica que existan en es.json todas las claves que el motor puede devolver.
   */
  it('allEngineTextKeys_shouldExistInTranslations', () => {
    const keys = ['welcome', 'empty', 'crisis', 'crisisOngoing', 'afterCrisis', 'riskCheck', 'supportAfterCheck', 'supportSuggestion', 'more', 'fallback', 'fallbackSpecialist']
      .map((k) => `zenbot.answers.${k}`)
    Object.entries(NEEDS).forEach(([id, need]) => {
      for (let v = 0; v < need.variants; v++) keys.push(`zenbot.replies.${id}.${v}`)
      // Las intenciones sociales (gracias, adiós, ayuda, saludo) nunca son tema de continuación
      if (!['thanks', 'bye', 'help', 'greeting'].includes(id)) keys.push(`zenbot.continue.${id}`)
      if (need.followUp) keys.push(`zenbot.followUps.${id}`)
    })
    Object.values(ACTIONS).forEach((a) => keys.push(a.label))
    STARTERS.forEach((s) => keys.push(`zenbot.starters.${s.id}`))
    const missing = keys.filter((k) => typeof lookup(k) !== 'string' || !lookup(k).trim())
    expect(missing).toEqual([])
  })
})

describe('ZenBot resource recommendations', () => {
  const catalog = [
    { id: 1, title: 'Respiración para la oficina', description: 'Técnica breve para bajar la tensión entre reuniones.', category: 'video', tags: ['respiración', 'estrés laboral'] },
    { id: 2, title: 'Higiene del sueño', description: 'Rutina nocturna para dormir mejor.', category: 'reading', tags: ['sueño'] },
    { id: 3, title: 'Meditación guiada de 5 minutos', description: 'Mindfulness para calmar la mente.', category: 'audio', tags: ['meditación'] },
    { id: 4, title: 'Finanzas personales', description: 'Cómo hacer un presupuesto.', category: 'reading', tags: [] }
  ]

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: Ejemplo del requerimiento (5.5): «Me siento muy estresado por mi trabajo» debe
   *   recomendar recursos de estrés laboral y no recursos irrelevantes.
   * - ¿Qué hace esta prueba?: Ordena el catálogo y verifica que el primero sea el de la oficina y que no aparezca el de finanzas.
   */
  it('workStress_shouldRankRelevantRealResources', () => {
    const reply = respond('Me siento muy estresado por mi trabajo')
    const found = rankResources(catalog, reply.resourceQuery)
    expect(found[0].id).toBe(1)
    expect(found.map((r) => r.id)).not.toContain(4)
  })

  /**
   * NOTA DE PRUEBA:
   * - ¿Por qué se realizó esta prueba?: No se debe repetir el mismo contenido ni inventar recursos cuando no hay coincidencias.
   * - ¿Qué hace esta prueba?: Excluye el recurso ya mostrado y verifica que una búsqueda sin coincidencias devuelva [].
   */
  it('recommendations_shouldAvoidRepeatsAndNeverInvent', () => {
    expect(rankResources(catalog, { intents: ['sleep'], text: 'no puedo dormir' }).map((r) => r.id)).toEqual([2])
    expect(rankResources(catalog, { intents: ['sleep'], text: 'no puedo dormir', exclude: [2] })).toEqual([])
    expect(rankResources([], { intents: ['stress'] })).toEqual([])
    expect(rankResources(catalog, { intents: ['relax'], text: 'meditar' }).map((r) => r.id)).toContain(3)
  })
})
