# Informe de auditoría y mejora del Frontend Web de NeuroZen

**Alcance:** solo frontend web (Vue 3 + Vite + Tailwind; el proyecto **no usa PrimeVue**, aunque el encargo lo mencionaba).
**Fecha:** 26/11/2026. **Base:** `neurozen_web_frontend-main_5.zip`.
**Infraestructura protegida:** sin cambios (verificado con `git diff` contra la copia original, ver §E).

> Nota sobre el backend: el código del backend no venía en el ZIP y la política de red de este entorno no permitió
> consultar la API de producción. El contrato se tomó de los servicios del frontend, los mocks MSW (`tests/mocks`)
> y los informes previos del repositorio. **No se ejecutaron pruebas contra el backend real.**

---

## A. Alineación con el backend revisado (INFORME_REVISION_BACKEND_FRONTEND.md)

| Punto del backend | Impacto en el frontend | Acción |
|---|---|---|
| B1 `availabilitySchedule` en el perfil público; `rating` 0 sin reseñas; `image` vacío; sin `licenseNumber` | Ya compatible: 0 reseñas → «Sin valoraciones aún»; imagen vacía → avatar por defecto; la colegiatura solo se muestra si llega | Sin cambios |
| B2 `available-slots` con duración real y `?durationMinutes=` | Compatible (el frontend usa la grilla de 60 min, que el backend acepta para cualquier tipo) | Sin cambios |
| B3 409 «El horario ya no está disponible» / fuera de horario | Ya manejado: vuelve a fecha/hora conservando los datos | Sin cambios |
| B4 `GET /appointments/availability` | El calendario ahora lo usa por mes visible; fallback al horario publicado | **Integrado** |
| B5 errores siempre con `message` | Complementa el saneamiento del frontend (A4) | Sin cambios |
| B8 listado con `duration` (minutos), búsqueda con `durationMinutes` | `normalizeResource` ya interpreta `duration` en minutos cuando viene `resourceType` | Sin cambios. ZenBot sigue ordenando en el navegador sobre el listado (respeta el plan); la búsqueda del servidor queda disponible para una mejora futura |
| B9 `GET /emergency-resources` (`verifiedAt: null`) | ZenBot muestra las mismas dos líneas desde el frontend (funciona aunque falle la red). Cuando el equipo registre `verifiedAt`, se puede leer del endpoint | Sin cambios (recomendado a futuro) |
| B10 `PasswordPolicy` Unicode + 72 bytes | El frontend era más estricto (solo A-Z con tildes y 0-9) | **Corregido** (`passwordChecks`) |
| B11 ZenBot en backend no implementado | ZenBot sigue en el navegador | Pendiente (decisión de producto y validación clínica) |

## B. Tabla de correcciones

| ID | Problema | Archivos modificados | Corrección realizada | Estado |
|---|---|---|---|---|
| A1 | Usuario nuevo veía estadísticas y recomendaciones de ejemplo (`DashboardService._demo`) como si fueran suyas | `services/DashboardService.js`, `shared/screens/DashboardComponent.vue`, `components/StressLevelChart.vue`, `utils/stressScale.js` | Eliminados los datos de demostración. Estado inicial con bienvenida, pasos, **«Hacer el test»** y **«Registrar cómo me siento»**. Estados separados de carga / error (con Reintentar) / sin datos. Recomendación de tendencia solo si hay datos de dos semanas; los días sin registros ya no se dibujan como 0 | Resuelto |
| A2 | Calendario permitía cualquier día futuro; si fallaba el endpoint se **inventaban** horarios 09:00-17:00 (`DEFAULT_SLOTS`); mes mal formateado («Noviembre De 2026») | `services/AppointmentService.js`, `screens/BookSessionComponent.vue`, `screens/BookAppointmentComponent.vue`, `utils/scheduleParser.js`, `services/TherapistService.js` | Días habilitados según el horario publicado del profesional (`availabilitySchedule`, o su texto de disponibilidad interpretado) dentro de una ventana de 90 días. Estados visuales: disponible / seleccionado / sin horarios / fuera de rango (con leyenda y `aria-label`). Horas desde `GET /professionals/{id}/available-slots`; si no responde, derivadas del horario publicado y se indica. Días sin horas → «Próxima fecha disponible: [fecha]». Mes «Noviembre de 2026», idioma activo y zona horaria visible. Se recalcula al cambiar de profesional o de mes. Eliminados los horarios inventados. **Actualización:** usa `GET /appointments/availability` del backend revisado para deshabilitar desde el principio los días sin horas libres y tomar `nextAvailableDate`; si el endpoint no responde, recurre al horario publicado | Resuelto |
| A3 | No se podía cambiar fecha/hora desde el resumen | `screens/BookSessionComponent.vue` | Botones **«Editar fecha»** y **«Editar hora»** que llevan directo al paso 2 (con foco en el calendario o en las horas) y **«Volver al resumen»** / «Cancelar cambio». Se conservan profesional, tipo y notas; se conserva la hora si sigue libre en el nuevo día. Antes de confirmar se revalida la hora; si ya no está libre (o el backend responde 409) no se reserva y se vuelve a elegir sin perder datos | Resuelto |
| A4 | Texto `null` en el inicio de sesión | `utils/text.js`, `services/HttpClient.js`, `services/AuthService.js`, `services/session.js`, `login.component.vue`, `RegisterComponent.vue`, `ForgotPasswordComponent.vue`, `ResetPasswordComponent.vue` | **No se pudo reproducir** con la demo ni con el despliegue actual (`es.json` de producción idéntico, sin valores nulos). Se corrigieron los orígenes posibles: `serverMessage` ahora descarta `message: null`, `"null"`, objetos y números del backend; nombres `null`/`undefined` no se muestran; los errores usan `safeMessage` con texto de respaldo traducido. Textos de ayuda reales en correo/contraseña (login y recuperación). Prueba que simula `{ message: null, title: "null" }` | Resuelto (causa exacta no reproducida) |
| M1 | Sin filtro por tarifa | `screens/TherapistListComponent.vue`, `utils/professionalFormat.js` | Tarifa mínima y máxima (USD) integradas con búsqueda, especialidad y disponibilidad; validación mín ≤ máx; contador de resultados y «Limpiar filtros»; responsive. Con un rango activo no se incluyen tarifas por definir | Resuelto |
| M2 | Tarjetas con datos de relleno: `price`/`rating` nulos se mostraban como `$0` y 0 estrellas; especialidad sin traducir | `services/TherapistService.js`, `components/StarRating.vue`, directorio, detalle, reserva, confirmación y comprobante | Tarifa real o **«Tarifa por definir»**; calificación solo con reseñas reales, si no **«Sin valoraciones aún»**; especialidad traducida; años de experiencia y colegiatura verificada cuando existen. No se inventa nada | Resuelto |
| M3 | Contraste del botón Guardar en desencadenantes | `style.css` | El botón ya era sólido `#2D5A4A` (7,9:1, verificado en navegador). Se mejoraron estados: activo más oscuro, deshabilitado sólido `#4A6B5F` (5,9:1) en vez de opacidad 50 %, foco con contorno visible desplazado, altura mínima 44 px | Resuelto (ya cumplía; estados mejorados) |
| M4 | Footer con teléfono `+1 (555) 123-4567`, dirección «123 Wellness St» y correo `info@neurozen.com` ficticios; año fijo 2025 | `FooterComponent.vue`, `AuthLayout.vue`, `SettingsComponent.vue`, `ProStatusComponent.vue`, `utils/contact.js`, i18n | Retirado el bloque ficticio y los enlaces `mailto` a ese correo. Se muestra un correo de soporte **solo** si el equipo define `VITE_SUPPORT_EMAIL` (opcional, no se tocaron los `.env`). Año calculado automáticamente | Resuelto |
| M5 | Paso «Último paso» con opciones preseleccionables | `OnboardingProfileComponent.vue`, i18n | Rótulo **«Paso opcional»**; formulario siempre vacío; tipo de trabajo como botones marcables/desmarcables; **«Omitir»** destacado (arriba y junto a Guardar) que continúa al test sin guardar; datos del registro conservados | Resuelto |
| M6 | Ayudas a 12 px y gris `#6B7280` (4,37:1 sobre `#F7F3EA`, 3,99:1 sobre `#F1E9D4`); sin checklist de contraseña | `style.css`, `tailwind.config.js`, `components/ui/PasswordChecklist.vue`, `utils/validation.js`, registro, restablecer y Ajustes | Ayudas y errores a 14 px; `muted-light` → `#5B6762` (≥ 4,87:1 en todos los fondos). Checklist en tiempo real con **exactamente** la `PasswordPolicy` del backend (mín. 8, una letra Unicode `\p{L}`, un dígito Unicode `\p{Nd}`, máx. 72 bytes UTF-8), en registro, restablecer contraseña y cambio de contraseña | Resuelto |
| M7 | Escalas mezcladas (desencadenantes 1-10 mostrados ×10 como «nivel de estrés» 0-100) | `DashboardComponent.vue`, `DashboardService.js`, `StressLevelChart.vue`, `utils/stressScale.js` | Desencadenantes en su escala original **1-10** y rotulados como intensidad percibida (no clínica). PSS-10 **0-40** + «X/100 normalizado» (`puntaje/40×100`) identificado. Escala siempre junto al valor. Sin cambios en cálculos (`AssessmentService` intacto) | Resuelto |
| B1 | Terminología mixta «Sesión/Reserva» vs «Cita» | `public/es.json`, `public/en.json` | Textos visibles unificados a «Cita» / «Appointment» (reservar, confirmar, tipo, resumen, recordatorios, tarifa por cita…). «Iniciar sesión» y «Sesión de respiración» se mantienen (otro significado). Sin cambios en endpoints ni propiedades | Resuelto |
| B2 | Controles de accesibilidad: el alto contraste casi no tenía efecto (solo variables no usadas) | `SettingsComponent.vue`, `style.css` | Botones **A-** / **A+** junto al deslizador, vista previa, estado «Activado/Desactivado» en cada interruptor, **Restablecer**; el alto contraste ahora oscurece textos y bordes, subraya enlaces y refuerza el foco. Se aplican y persisten (`neurozen_settings`) | Resuelto |
| B3 | Sin plazo estimado de verificación del psicólogo | `RegisterComponent.vue`, `ProStatusComponent.vue`, i18n | Texto exacto en es/en en el registro de psicólogos y en la pantalla de cuenta pendiente. Proceso de verificación sin cambios | Resuelto |
| Z1 | Bienvenida de ZenBot | `zenbot/ZenBotWidget.vue`, i18n | Mensaje de bienvenida del encargo (es/en) | Resuelto |
| Z2 | Solo 4 opciones rápidas fijas | `ZenBotWidget.vue`, `zenbotEngine.js` | 10 opciones iniciales que abren conversaciones contextualizadas; botón para volver a mostrarlas; texto libre siempre disponible | Resuelto |
| Z3 | Sin memoria conversacional | `zenbotEngine.js`, `ZenBotWidget.vue` | Contexto de tema, pregunta pendiente, variantes ya usadas y recursos mostrados; interpreta respuestas cortas, evita repetir preguntas, permite cambiar de tema; indicador de escritura; anti-duplicados | Resuelto (en el navegador; sin memoria en backend) |
| Z4 | Sin recomendación de videos/recursos | `zenbot/zenbotResources.js`, `ZenBotWidget.vue`, `ResourceLibraryComponent.vue` | Recomienda recursos **reales** de `GET /api/v1/resource-libraries` (ya filtrados por plan) por relevancia (título, descripción, etiquetas, categoría, sinónimos, intención); tarjetas con miniatura, título, descripción, duración, categoría y **«Ver video»/«Abrir recurso»**; no repite recursos; si no hay coincidencias lo dice; error con «Reintentar» | Parcial · Pendiente de backend (F2: búsqueda en servidor) |
| Z5 | Enlaces genéricos | `zenbotEngine.js` (`ACTIONS`) | Accesos a rutas reales: test PSS-10, registrar desencadenante, estadísticas, respiración, pausas, videos (`?category=video`), biblioteca, psicólogos, reservar, mis citas, planes. Verificados contra el router en pruebas. Ninguna reserva/cancelación automática | Resuelto |
| Z6 | Crisis por lista de palabras, sin ambiguos ni negaciones | `zenbotEngine.js` (`assessRisk`) | 3 niveles + comprobación de expresiones ambiguas; negaciones se comprueban en vez de descartarse; modo seguro persistente tras una crisis; prioridad sobre recursos y reservas; solo las líneas ya configuradas (Línea 113 op. 5, SAMU 106) con aviso de que son de Perú y de que ZenBot no llama a nadie | Parcial · Pendiente de backend (F3: detección confiable) |
| Z7 | Interfaz y accesibilidad del chat | `ZenBotWidget.vue` | `role="log"` con `aria-live="polite"`, `role="alert"` solo en crisis, etiquetas en botones, objetivos ≥ 40-44 px, foco al abrir/cerrar, Esc, responsive (`100dvh`), contraste revisado | Resuelto |
| X1 | Disponibilidad en texto de perfiles antiguos sin horario estructurado bloqueaba la reserva (detectado en la revisión visual) | `utils/scheduleParser.js`, `TherapistService.js` | Se interpreta el texto real («Lun, Mié · 09:00 - 13:00», «Lunes a Viernes, 9 AM - 6 PM»); si no es interpretable, no se adivina | Resuelto |
| X2 | Días de la disponibilidad siempre en español («Lun, Mar…») con la interfaz en inglés | `ProfessionalService.availabilityText` | Parámetro de idioma para mostrar; el texto enviado al backend no cambia | Resuelto |
| X3 | Conversación de ZenBot (posible información sensible) sobrevivía al cierre de sesión en la misma pestaña | `services/session.js` | `clearSession` borra `neurozen_zenbot*` de `sessionStorage` | Resuelto |
| X4 | La biblioteca no aceptaba enlace directo a una categoría | `ResourceLibraryComponent.vue` | `?category=video|audio|reading|exercises` | Resuelto |
| X5 | Botones de horario y controles < 44 px en móvil | `style.css`, reservas | `min-h-[44px]` en botones de marca y horarios | Resuelto |
| X6 | Pluralización con `$t(key, params, n)` no soportada en modo legacy | componentes nuevos | Se usa `$tc` | Resuelto |

---

## C. Informe de pruebas

Comandos reales de `package.json`:

| Comando | Resultado |
|---|---|
| `npm ci` | OK (Node 22.23.5, npm 10.9.9) |
| `npm run lint` | **OK, 0 errores / 0 advertencias** (sin reglas desactivadas) |
| `npm run test:coverage` (unitarias + integración con MSW) | **48 archivos, 237 pruebas, 0 fallos** (línea base: 46 / 195). Cobertura de líneas 73,17 % → **75,31 %**; ramas 64,8 % → 67,9 % |
| `i18n.spec.js` | OK: es/en con exactamente las mismas claves |
| `npm run build` | OK |

**Tipos de prueba (diferenciados):**
- *Unitarias puras:* `zenbotEngine.spec.js` (17: intenciones, contexto, variantes, niveles de riesgo, negaciones, 10 opciones, rutas reales, claves i18n, relevancia de recursos), `bookingAvailability.spec.js` (9: días disponibles, próxima fecha, rango, horas sin endpoint, horas de API, texto de disponibilidad, tarifas nulas, filtro de tarifa, especialidad), `DashboardService.spec.js` (5: usuario nuevo sin datos de ejemplo, error propagado, escala 1-10, sin tendencia inventada).
- *Integración con mocks (MSW, app real + router + i18n):* `auditFixes.spec.js` (12: estado vacío, error ≠ vacío, escala PSS, días deshabilitados, próxima fecha, editar hora y confirmar, hora ocupada antes de confirmar, filtro de tarifa y tarjetas reales, `null` en login, checklist + B3, footer, paso opcional), `zenbot.spec.js` (5: crisis, sueño, bienvenida y 10 opciones, recurso real con enlace funcional, error de biblioteca recuperable).
- *Integración real contra el backend:* **no ejecutada** (backend no disponible desde este entorno). No se pudo comprobar: contrato real de `available-slots`, códigos 409 al reservar, `stressData` en `GET /users/{id}`, respuesta real de `resource-libraries`.

**Pruebas existentes actualizadas (no eliminadas):**
- `bookSession.spec.js` y `therapistDirectory.spec.js`: reservaban el martes 20, pero el profesional simulado atiende lunes y miércoles; ahora usan el miércoles 21 y el texto «Confirmar cita».
- `AppointmentService.spec.js`: el caso «sin endpoint» ahora pasa el horario publicado (ya no existen horarios fijos).
- `DashboardService.spec.js` y `zenbotEngine.spec.js`/`zenbot.spec.js`: adaptadas a escala 1-10 y a la v2 del motor; se conservan los casos originales.

**Validación visual/responsive (Playwright, modo demo `VITE_API_MODE=static`, 360×760 y 1280×860):** login, registro, paso opcional, panel (usuario nuevo), reserva, directorio, ajustes, desencadenantes y ZenBot (bienvenida, recomendación, crisis). Sin desbordamiento horizontal ni textos `null`/`undefined`/`NaN`. Los únicos errores de consola fueron imágenes externas bloqueadas por la red del entorno.

**Pendiente/no ejecutado:** GitHub Actions y SonarCloud (no se ejecutan desde aquí; deben correr en el flujo habitual: lint, `test:coverage`, build, Quality Gate, Docker y Vercel). Recomiendo revisar en SonarCloud la cobertura del código nuevo de `BookSessionComponent.vue` y `ZenBotWidget.vue`.

---

## D. Informe específico de ZenBot

**Arquitectura encontrada:** 100 % frontend, reglas por palabra clave (`zenbotEngine.js`), una respuesta fija por tema, sin IA, sin backend, sin memoria (solo contador de «no entendí»), 4 opciones rápidas, crisis por lista de palabras, historial en `sessionStorage`.

**Arquitectura nueva (sin servicios externos, sin claves en Vue):**
- `zenbotEngine.js`: `assessRisk` (seguridad primero) → `classify` (puntuación de sinónimos es/en) → `respond` con contexto.
- `zenbotResources.js`: ranking sobre el catálogo real de la biblioteca.
- `ZenBotWidget.vue`: interfaz, carga perezosa del catálogo (una vez por apertura), persistencia por usuario en `sessionStorage`, borrado al cerrar sesión.

**Intenciones reconocidas:** estrés, trabajo, ansiedad, sueño, agotamiento, relajación, concentración, evaluación (PSS-10), estadísticas, desencadenantes, pausas, recursos/videos, hablar/desahogarse, tristeza, ayuda profesional, reservar, mis citas, planes, saludo, gracias, despedida, ayuda.

**Recursos audiovisuales:** solo los que devuelve `GET /api/v1/resource-libraries` para el plan del usuario. Enlace funcional a `/stress/resources/{id}` (verificado en prueba con el recurso 101). Sin catálogo paralelo ni URLs inventadas.

**Acciones:** test PSS-10, registrar desencadenante, estadísticas, respiración, pausas activas, videos, biblioteca, psicólogos, reservar, mis citas, planes. Todas rutas existentes del rol trabajador (ZenBot solo se muestra a ese rol). Ninguna acción irreversible.

**Derivación y riesgo:** Nivel 1 orientación + recursos; Nivel 2 (persistencia/intensidad, tristeza, petición de ayuda) → apoyo profesional sin diagnosticar; ambiguo → pregunta directa y líneas visibles; «sí» → crisis, «no» → apoyo; Nivel 3 → respuesta empática, Línea 113 (op. 5) y SAMU 106 (ya configuradas en el proyecto), aviso de región y de que ZenBot no contacta a emergencias, persona de confianza, sin recursos ni reservas; el modo seguro continúa hasta que la persona diga que está a salvo. **No usa resultados PSS-10 para decidir crisis.**

**Limitaciones:** heurística de palabras y frases, **no es un sistema clínico de detección**; no entiende ironía ni contexto largo; recursos con relevancia léxica; sin memoria entre sesiones; líneas de emergencia solo de Perú.

---

## E. Infraestructura protegida

Verificado sin cambios (`git diff --quiet` contra el original): `.github/workflows/ci-frontend.yml`, `sonar-project.properties`, `Dockerfile`, `.dockerignore`, `nginx.conf`, `vercel.json`, `firebase.json`, `.firebaserc`, `deploy-setup.sh`, `deploy-static.sh`, `start-all.ps1`, `.env`, `.env.development`, `.env.production`, `api/`, `server/`, `public/data/`, `package.json`, `package-lock.json`, `vitest.config.js`, `eslint.config.mjs`, `vite.config.js`, `.gitignore`. No se cambió de rama ni se tocó GitFlow (el ZIP no incluía `.git`).

`tailwind.config.js` (paleta, no infraestructura) se modificó solo en el color `muted-light` por contraste (M6).

**Observaciones documentadas, sin aplicar:**
1. `nginx.conf`: no define cabeceras de seguridad (`Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `X-Content-Type-Options`) ni caché larga para `/assets/*`. Impacto: menor protección ante clickjacking e inyección; más descargas. Recomendación: añadirlas en `location /` y `location /assets/` (permitiendo `youtube-nocookie.com` en `frame-src`).
2. `ci-frontend.yml`: acciones fijadas por etiqueta (`@v4`, `@v5`, `@v6`), no por SHA. Recomendación: fijar por SHA.
3. `sonar-project.properties`: `sonar.sources` incluye `api` y `server` (mock json-server y Firebase Functions) sin pruebas: rebaja la cobertura global. Recomendación: valorar excluirlos o cubrirlos.
4. `VITE_SUPPORT_EMAIL` (opcional, nuevo): si el equipo tiene un correo de soporte real, definirlo en Vercel/entorno de build; si no, el footer no muestra contacto.
5. `api/.env` y `.env` están en el ZIP aunque `.gitignore` los excluye; no contienen secretos (revisado sin mostrar valores).

---

## F. Dependencias pendientes del backend

**F1. Disponibilidad por rango** (A2/A3)
- `GET /api/v1/appointments/availability?professionalId={int}&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` (máx. 92 días). Auth: Bearer, rol USER/ADMIN; el psicólogo solo su propio id.
- Respuesta 200: `{ "professionalId": 1, "timeZone": "America/Lima", "slotMinutes": 60, "days": [ { "date": "2026-10-21", "slots": ["09:00","10:00"] }, { "date": "2026-10-22", "slots": [] } ], "nextAvailableDate": "2026-10-26" }`. Días sin horarios: `slots: []`. Horas en la zona del profesional (`timeZone` IANA). `nextAvailableDate` puede ser posterior a `endDate` o `null`.
- Validaciones: 400 si fechas inválidas/rango > 92 días; 404 si el profesional no existe o no está verificado. Debe excluir citas PENDING/CONFIRMED.
- También: confirmar que `GET /professionals/{id}/available-slots?date=` existe y que `POST /appointments` responde **409** si la hora ya fue tomada (el frontend ya lo maneja).

**F2. Búsqueda de recursos** (Z4)
- `GET /api/v1/resource-libraries/search?q={texto}&tags={csv}&type={Video|Audio|Article|Exercise}&limit={1-10}`. Auth: Bearer; respetar el plan como la lista actual.
- Respuesta: `{ "items": [ { "id", "title", "description", "resourceType", "contentUrl", "thumbnail", "durationMinutes", "tags": [], "score": 0.82 } ] }`. Ideal: etiquetas normalizadas por necesidad (estrés laboral, sueño, ansiedad…).
- Privacidad: no registrar el texto de la consulta asociado al usuario.

**F3. Conversación y seguridad de ZenBot** (Z3/Z6)
- `POST /api/v1/zenbot/messages` `{ "conversationId": "uuid|null", "message": "texto", "locale": "es" }` → `{ "conversationId", "reply": { "text", "intent", "risk": "none|support|check|crisis", "actions": ["book", …], "resourceIds": [101] } }`. Auth: Bearer USER. 429 por abuso. El backend llamaría a un modelo con clasificación de riesgo validada y guardarraíles clínicos; **ninguna clave en Vue**.
- `GET /api/v1/emergency-resources?country=PE` → `[ { "name", "phone", "description", "verifiedAt" } ]` para no fijar números en el frontend.
- Privacidad (Ley 29733): consentimiento explícito antes de enviar mensajes al servidor, retención mínima, cifrado, sin envío a terceros sin acuerdo de tratamiento; protocolo de escalado revisado por profesionales.

**F4. Estadísticas** (A1): confirmar si `GET /users/{id}` devuelve `stressData` y su significado/escala; si no, el panel usa solo desencadenantes y PSS-10.

---

## G. Commits

**No se ejecutaron commits:** el ZIP no incluía el repositorio Git (`.git`), así que no hay rama ni historial GitFlow sobre los que trabajar. Commits recomendados (Conventional Commits), en este orden:

1. `fix(dashboard): remove sample statistics and add empty, error and loading states`
2. `feat(dashboard): show stress scales with original and normalized values`
3. `fix(booking): enable only days with real availability and drop invented slots`
4. `feat(booking): allow editing date and time from summary with revalidation`
5. `fix(auth): never display technical values such as null in auth messages`
6. `feat(auth): add real-time password requirements checklist`
7. `feat(professionals): add fee range filter and show only real card data`
8. `fix(ui): improve contrast of help texts and button states`
9. `fix(footer): remove fictitious contact data and compute copyright year`
10. `fix(onboarding): mark profile step as optional without preselected options`
11. `feat(settings): add A-/A+ controls, preview, state labels and reset`
12. `feat(register): show estimated psychologist verification time`
13. `fix(i18n): unify appointment terminology in spanish and english`
14. `feat(zenbot): add welcome, conversation starters and contextual intents`
15. `feat(zenbot): recommend relevant resources from the real library`
16. `fix(zenbot): improve escalation for high-risk and ambiguous messages`
17. `test(frontend): cover dashboard, booking, directory, auth and zenbot changes`
