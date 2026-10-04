# Pruebas del frontend de NeuroZen

**10 pruebas** (7 unitarias y 3 de integración) enfocadas en la **lógica de negocio** de la
plataforma: nivel de estrés, pausas activas, citas con profesionales y pago de suscripciones.

Se usan **Vitest + Vue Test Utils**. El backend se reemplaza por un servidor simulado (**MSW**),
así que no hace falta tener la API encendida: solo se prueba el frontend.

## Cómo ejecutarlas

```bash
npm install            # instala las herramientas de prueba
npm test               # ejecuta las pruebas
npx vitest run --reporter=verbose   # muestra el nombre de cada prueba
```

## Estructura

```text
tests/
├── setup.js          # prepara cada prueba (sin sesión, servidor simulado encendido)
├── helpers.js        # abrir una página de la app e iniciar sesión (para integración)
├── mocks/
│   ├── data.js       # datos de prueba (usuario, profesionales, registros de estrés)
│   └── server.js     # respuestas simuladas de la API
├── unit/             # reglas de negocio probadas por separado
└── integration/      # flujos completos en las pantallas reales
```

## Cómo están escritas

- **Código en inglés**; comentarios y datos de prueba en español.
- Cada prueba tiene una **NOTA DE PRUEBA** que explica *¿por qué se realizó?* y *¿qué hace?*.
- Patrón **Arrange / Act / Assert** marcado con comentarios.
- Nombres con el formato `situation_shouldResult` (equivale a `situacion_debeResultado`).
- **Mocks** con `vi.fn()` (como `mock()` de Mockito) y verificación de llamadas con
  `toHaveBeenCalledTimes(1)` (como `verify`) y `not.toHaveBeenCalled()` (como `verifyNoInteractions`).

## Las 10 pruebas

### Unitarias (7)

| Prueba | Regla de negocio |
| --- | --- |
| `userWithoutStressData_shouldCalculateFromTriggers` | El nivel de estrés se calcula con los registros reales del usuario |
| `breaks_shouldOnlyBeScheduledOnWorkingDays` | Las pausas activas solo se programan en días laborables |
| `limaLocalTime_shouldBeSentAsCorrectUtc` | La cita se agenda a la hora elegida por el paciente |
| `appointmentData_shouldUseBackendFormat` | La cita se crea para el paciente y profesional correctos |
| `todaySlots_shouldNotIncludePastHours` | No se ofrecen horarios que ya pasaron |
| `cardNumberWithWrongDigit_shouldBeRejected` | No se suscribe con una tarjeta mal escrita |
| `cardExpiredLastMonth_shouldBeRejected` | No se suscribe con una tarjeta vencida |

### Integración (3)

| Prueba | Flujo de negocio |
| --- | --- |
| `incompleteForm_shouldNotBeSentToApi` | Un registro de estrés incompleto no se guarda |
| `completeForm_shouldBeSavedAndShownInList` | El usuario registra una situación de estrés y la ve en su historial |
| `fullFlow_bookASession` | El usuario reserva una sesión con un profesional en 4 pasos |
