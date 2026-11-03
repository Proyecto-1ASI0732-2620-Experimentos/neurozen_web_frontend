# Pruebas del frontend de NeuroZen

**91 pruebas** (62 unitarias y 29 de integración) enfocadas en la **lógica de negocio** de la plataforma,
con **casos de éxito y de error**. Todas pasan.

Herramientas: **Vitest + Vue Test Utils**. El backend se reemplaza por un servidor simulado (**MSW**),
así que no hace falta la API encendida: solo se prueba el frontend.

## Cómo ejecutarlas

```bash
npm install
npm test                              # ejecuta las 91 pruebas
npx vitest run --reporter=verbose     # muestra el nombre de cada prueba
npm run test:coverage                 # reporte de cobertura
```

## Estructura

```text
tests/
├── setup.js          # prepara cada prueba (sin sesión, servidor simulado encendido)
├── helpers.js        # abrir pantallas, iniciar sesión por rol, buscar botones y diálogos
├── mocks/
│   ├── data.js       # datos de prueba: trabajador, psicóloga verificada, psicólogo pendiente, admin, citas
│   └── server.js     # respuestas simuladas de la API (/api/v1/...)
├── unit/             # 20 archivos · 62 pruebas: reglas de negocio aisladas
└── integration/      # 14 archivos · 29 pruebas: pantallas reales + servicios + router
```

## Cómo están escritas

- **Código en inglés**; comentarios y datos de prueba en español.
- Cada prueba tiene una **NOTA DE PRUEBA**: *¿por qué se realizó?* y *¿qué hace?*.
- Patrón **Arrange / Act / Assert** y nombres `situation_shouldResult`.
- **Mocks** con `vi.fn()` (como `mock()` de Mockito) y verificación de llamadas con
  `toHaveBeenCalledTimes(1)` (como `verify`) y `not.toHaveBeenCalled()` (como `verifyNoInteractions`).

## Pruebas unitarias (62)

| Archivo | Pruebas | Qué protege | Éxito / Error |
| --- | --- | --- | --- |
| `date.spec.js` | 2 | Hora de la cita en UTC y fecha local correcta | ✔ / ✔ |
| `validation.spec.js` | 6 | Tarjeta (Luhn, vencimiento), contraseña segura, número de colegiatura | ✔ / ✔ |
| `AssessmentService.spec.js` | 4 | Puntaje del test, niveles, test incompleto, guardado sin servidor | ✔ / ✔ |
| `zenbotEngine.spec.js` | 5 | Detección de crisis, estrés, falsas coincidencias, derivación a especialista | ✔ / ✔ |
| `roles.spec.js` | 4 | Rol del backend y página de inicio de cada cuenta | ✔ / ✔ |
| `session.spec.js` | 2 | Token vencido, datos aislados por usuario | ✔ / ✔ |
| `AppointmentService.spec.js` | 4 | Formato de la cita, horarios pasados, tipos por defecto, cancelación | ✔ / ✔ |
| `ActiveBreaksService.spec.js` | 3 | Días laborables, pausas desactivadas, minutos del horario | ✔ / ✔ |
| `DashboardService.spec.js` | 2 | Nivel de estrés real (con mocks y verificación de llamadas) | ✔ / ✔ |
| `ProfessionalService.spec.js` | 4 | Perfil completo, disponibilidad, estados de cita, guardado sin perder datos | ✔ / ✔ |
| `TherapistService.spec.js` | 3 | Solo verificados en el directorio, perfil pendiente = no existe, reseña 1-5 | ✔ / ✔ |
| `AuthService.spec.js` | 4 | Login (mock), contraseña incorrecta, estado del psicólogo, registro con colegiatura | ✔ / ✔ |
| `HttpClient.spec.js` | 3 | Sesión vencida (401), 401 del login, sin conexión | ✔ / ✔ |
| `ReportService.spec.js` | 2 | Resumen semanal del informe y envío al psicólogo correcto | ✔ |
| `AdminService.spec.js` | 2 | Aprobar al psicólogo correcto y enviar el motivo del rechazo | ✔ |
| `SubscriptionService.spec.js` | 3 | Plan y tarjeta enviados correctamente, solo últimos 4 dígitos, usuario sin suscripción | ✔ / ✔ |
| `ResourceLibraryService.spec.js` | 2 | Duración en minutos/segundos, recursos de ejemplo si la API falla | ✔ / ✔ |
| `BreathingService.spec.js` | 2 | Historial de sesiones de respiración y notas limitadas | ✔ |
| `UserService.spec.js` | 2 | Cambio de contraseña y datos del onboarding | ✔ |
| `StaticAPIAdapter.spec.js` | 3 | Modo demostración: login, directorio solo verificados, endpoints solo para admin | ✔ / ✔ |

## Pruebas de integración (29)

| Archivo | Pruebas | Flujo | Éxito / Error |
| --- | --- | --- | --- |
| `registerTrigger.spec.js` | 3 | Registro de estrés: incompleto, completo, error del servidor | ✔ / ✔ |
| `bookSession.spec.js` | 2 | Reserva en 4 pasos y error de la API | ✔ / ✔ |
| `registerAccount.spec.js` | 2 | Registro de psicólogo → en revisión; sin aceptar términos | ✔ / ✔ |
| `loginRoles.spec.js` | 2 | Contraseña incorrecta; el admin entra a su panel | ✔ / ✔ |
| `routeGuards.spec.js` | 2 | El trabajador no entra al portal ni al admin; el psicólogo pendiente solo ve su estado | ✔ |
| `adminVerification.spec.js` | 2 | Aprobar exige las 2 comprobaciones del CPsP; rechazar exige motivo | ✔ / ✔ |
| `assessment.spec.js` | 1 | Test completo → resultado y recomendaciones | ✔ |
| `userAppointments.spec.js` | 2 | Cancelar una cita; calificar exige estrellas | ✔ / ✔ |
| `zenbot.spec.js` | 2 | Mensaje de crisis con líneas de ayuda; sugerencia según el tema | ✔ |
| `proPortal.spec.js` | 3 | El psicólogo confirma citas, completa su perfil y ve el informe del paciente | ✔ |
| `purchase.spec.js` | 2 | Tarjeta inválida bloquea el pago; compra válida al plan elegido | ✔ / ✔ |
| `accountSecurity.spec.js` | 3 | Contraseña actual incorrecta, eliminar cuenta con confirmación, restablecer contraseña | ✔ / ✔ |
| `resourceLibrary.spec.js` | 1 | Clic en un recurso abre su detalle | ✔ |
| `therapistDirectory.spec.js` | 2 | Filtro de disponibilidad y reserva directa con un psicólogo | ✔ |

## Comprobación de que las pruebas sirven

Se reintrodujeron a propósito 8 errores de negocio en el código:

1. psicólogos pendientes visibles en el directorio;
2. un mensaje de crisis no detectado por ZenBot;
3. el test sin puntuación inversa;
4. el portal del psicólogo sin exigir verificación;
5. el pago aceptando una tarjeta mal escrita;
6. la eliminación de la cuenta sin confirmar el correo;
7. el número completo de la tarjeta visible en el perfil;
8. un psicólogo pendiente público en el modo demostración.

Cada error hizo fallar al menos una prueba. Al restaurar el código, las 91 volvieron a pasar.

## Cobertura

`npm run test:coverage` → **64,7 % de las líneas** del frontend. La lógica de negocio (servicios, roles,
sesión, validaciones y ZenBot) está entre 80 % y 100 %. Lo no cubierto son sobre todo pantallas
informativas sin reglas propias (bienvenida del onboarding, página 404 y tarjetas de planes).
