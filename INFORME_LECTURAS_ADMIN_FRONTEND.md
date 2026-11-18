# Informe: registro con un solo campo por dato, lecturas y ejercicios, y panel de administración de la biblioteca

**Alcance:** frontend web. **Backend no modificado.** Sin cambios de despliegue (`.env*`, `vercel.json`, Docker,
`.github/`, `package.json`). Se partió del `main` actual del repositorio (con los PR #1, #2 y #3 ya fusionados).

## 0. Contrato verificado (rama `fix/registro-campos-unicos` del backend)

| Punto | Backend real |
|---|---|
| `POST /authentication/sign-up` | `SignUpResource(fullName, dni, email, password, confirmPassword, role, acceptedTerms, acceptedPrivacyPolicy, specialty, licenseNumber)`. `username`, `firstName` y `lastName` ya no existen: el backend los ignora y responde 400 si falta `fullName` o `email` |
| Inicio de sesión | Sin cambios: `{ username: <correo>, password }` |
| `GET /resource-libraries/{id}` | Trae `content` (texto plano) |
| `GET /admin/resource-libraries[/{id}]` (ADMIN) | Todos los recursos, con `content`, `requiredPlan` y `requiredPlanName` |
| `POST` / `PATCH /resource-libraries[/{id}]` (ADMIN) | Responden con el recurso y su plan. Límites: título 3-200, descripción 1000, contenido 20 000, autor 120, URL 500, duración 0-600, etiquetas 10×30. Tipos `Video`, `Audio`, `Article` y `Exercise` |

## 1. Archivos

| Archivo | Cambio |
|---|---|
| `src/services/AuthService.js` | El registro envía **solo los 10 campos** del backend; se quitaron `username`, `firstName` y `lastName` |
| `src/services/StaticAPIAdapter.js` | El modo demo toma el correo de `email` (antes de `username`) |
| `src/services/AdminResourceService.js` (nuevo) | API de administración: listar, ver, crear y editar, con normalización, tipos, planes y límites |
| `src/admin/resourceForm.js` (nuevo) | Lógica pura del formulario: campos por tipo, validación con las reglas del backend, cuerpo del POST, PATCH con solo los cambios, etiquetas y conteo Básico por tipo |
| `src/admin/components/ResourceFormDialog.vue` (nuevo) | Formulario en ventana para crear y editar. El tipo solo se elige al crear. La URL es obligatoria para Video y Audio, opcional para Ejercicio y no aparece en Lectura. Área de texto grande para el contenido, con contador. Errores 400 por campo |
| `src/admin/components/TagsInput.vue` (nuevo) | Etiquetas como chips: se agregan con Enter o coma y se quitan con × o Retroceso |
| `src/admin/screens/AdminResourcesComponent.vue` | Reescrito: tabla (tipo, título, plan, duración, Editar), resumen de recursos Básico por tipo (en ámbar si hay más de 2), filtros por tipo y búsqueda. Editar pide `GET /admin/resource-libraries/{id}`. La lista se recarga después de guardar |
| `src/admin/components/ResourceFields.vue` | Eliminado (lo reemplaza el formulario nuevo) |
| `src/services/ResourceLibraryService.js` | Ya no contiene funciones de administración; quedan solo las de usuario |
| `src/utils/readingContent.js` (nuevo) | Convierte el texto plano en bloques: subtítulo (línea corta sin punto final), listas (`- ` o `1. `) y párrafos |
| `src/stress/components/ReadingContent.vue` (nuevo) | Muestra esos bloques **solo como texto** (sin `v-html`), con `white-space: pre-line` |
| `src/stress/screens/ResourceDetailComponent.vue` | Página de lectura: una lectura sin video va directo al texto (sin imagen de relleno); muestra «5 min de lectura» en lecturas y «6 min» en ejercicios; un ejercicio con video muestra el reproductor encima de los pasos |
| `public/es.json`, `public/en.json` | Textos nuevos |
| Pruebas | `tests/integration/adminResources.spec.js` **reescrita** para la nueva interfaz (las 5 pruebas anteriores con los mismos objetivos, más 4 nuevas). Nuevas: `tests/integration/readingsLibrary.spec.js` y `tests/unit/readingAndAdminForm.spec.js`. `tests/mocks/library.js` simula los endpoints de administración y un catálogo con 50 lecturas y 20 ejercicios |

**Decisión de diseño:** las lecturas se abren como **página de lectura**, no como ventana emergente (el prompt permite
ambas). En móvil es pantalla completa con desplazamiento, letra de 17 px y el botón ← para volver. Así se conservan los
favoritos, el «Marcar como completado», los relacionados y la posibilidad de compartir el enlace.

## 2. Pruebas (resultados reales)

**190/190** (antes 175/175), `eslint` sin errores, `vite build` correcto. Cobertura del código nuevo: **92 %**.
Reglas de SonarJS: sin hotspots ni bugs en el código nuevo. Se corrigieron dos expresiones regulares marcadas como
`slow-regex` y un comentario con «Todo». Revisión visual en Chromium a 1280 px y 375 px: sin desplazamiento horizontal.

| # | Prueba | Resultado |
|---|---|---|
| 1 | Usuario Básico ve 2 lecturas y 2 ejercicios y abre la lectura | Aprobado |
| 2 | Usuario Avanzado ve 50 lecturas y 20 ejercicios | Aprobado |
| 3 | El texto respeta subtítulos, párrafos (saltos de línea) y listas; las etiquetas `<b>` y `<script>` se muestran literales y no se crea ningún elemento | Aprobado |
| 4 | Un ejercicio con video muestra el reproductor encima de los pasos numerados; «6 min» | Aprobado |
| 5 | El admin crea una Lectura sin URL (el campo no aparece) y un Ejercicio con plan Profesional y etiquetas | Aprobado |
| 5b | Crear un Video sin enlace se bloquea | Aprobado |
| 6 | El admin cambia el plan de un video a Básico; la tabla se recarga y un usuario Básico lo ve | Aprobado |
| 7 | Errores locales por campo (título, URL, duración) y errores 400 del backend por campo (miniatura, plan) | Aprobado |
| 8 | Un usuario que no es ADMIN no entra al panel. El 403 de la API para otros roles lo prueba el backend | Aprobado |
| — | Tabla con todos los recursos y su plan; conteo Básico por tipo | Aprobado |
| — | Editar pide `GET /admin/resource-libraries/{id}`, el tipo queda bloqueado y el PATCH lleva solo lo cambiado | Aprobado |
| — | Lectura fuera del plan → 403 con «Mejorar plan» | Aprobado |
| — | Registro: el cuerpo tiene exactamente los 10 campos del backend | Aprobado |
| — | Unitarias: intérprete del texto, campos por tipo, límites, POST, PATCH y etiquetas | Aprobado |
| — | Las 170 pruebas anteriores (registro con DNI, planes, citas, login, perfil…) | Aprobado |

Todas las pruebas usan un backend simulado; falta probar contra el backend real.

## 3. Pendientes

- **Desplegar junto con el backend `fix/registro-campos-unicos`.** Este frontend funciona también con el backend actual (que todavía aceptaba los campos antiguos), pero el panel de administración necesita los endpoints `/admin/resource-libraries`, que solo existen en las ramas nuevas del backend.
- **App móvil:** su registro todavía envía `username`, `firstName` y `lastName`. Funciona porque también envía `fullName` y `email`, pero conviene limpiarlo, y falta la lectura de artículos y ejercicios. Queda para la siguiente tarea.
- El backend no devuelve el número de recursos Básico recomendado; la recomendación de 1-2 por tipo se muestra como aviso (en ámbar si hay más de 2), sin bloquear.

## 4. Corrección: el perfil del psicólogo no se guardaba sin horario (bug reportado)

**Causa (verificada en el backend):** `PUT /professionals/me` exige `availabilitySchedule` en **cada** actualización y
responde 400 «Indica tus días y horario de atención» si falta. Un psicólogo recién registrado o verificado **no tiene
horario**, así que el perfil no se podía guardar. Además, al ir a «Horario» la pantalla de perfil se descartaba y se
perdía lo escrito.

**Consecuencia más grave encontrada al revisarlo:** un psicólogo **rechazado** sin horario tampoco podía reenviar su
solicitud (mismo 400), y no puede entrar a «Horario» hasta que lo verifiquen.

**Corrección (solo frontend):**
- `src/professional-portal/availability.js` (nuevo): reglas del horario (días y fin posterior al inicio), propuesta inicial editable (L-V 09:00-18:00) y lectura de los errores `availabilitySchedule.*` del backend.
- `src/professional-portal/components/AvailabilityEditor.vue` (nuevo): editor de días y horario, reutilizado en Horario, Perfil y el reenvío tras un rechazo. `ProScheduleComponent.vue` lo usa, con el mismo comportamiento que antes.
- `src/professional-portal/profileDraft.js` (nuevo): borrador del perfil **en memoria** (no en localStorage). Al ir a «Horario» y volver se recupera lo escrito, con el aviso «Recuperamos los cambios que no habías guardado». Se borra al guardar.
- `ProProfileComponent.vue`: si no hay horario guardado, el formulario lo pide en la sección «Disponibilidad semanal» y se guarda en el mismo envío que la biografía, los años y la tarifa. Con horario guardado no se vuelve a pedir y se conserva. Los errores 400 aparecen bajo su campo (biografía, años, tarifa y horario). El progreso no marca el horario como completado hasta que se guarda.
- `ProStatusComponent.vue`: el reenvío tras un rechazo pide el horario si falta y lo incluye en el envío.

**Pruebas nuevas** (`tests/integration/proProfileSchedule.spec.js`, con un backend simulado que exige el horario como el real):

| Prueba | Resultado |
|---|---|
| Recién verificado sin horario: guarda biografía, años, tarifa y horario en un solo envío; queda en 4 de 4 pasos | Aprobado |
| Escribe, va a «Horario», vuelve: biografía, años y tarifa siguen ahí, con el aviso | Aprobado |
| Con horario guardado: no se vuelve a pedir y el envío lo conserva | Aprobado |
| Horario inválido: no se envía; error 400 del backend bajo su campo | Aprobado |
| Rechazado sin horario: el reenvío incluye el horario | Aprobado |

Totales: **195/195**, lint y build correctos. Cobertura del código nuevo: 92 %. SonarJS: sin hotspots ni bugs nuevos.

**Pendiente para el backend (solo documentado):** sería mejor que `PUT /professionals/me` no exigiera el horario para
corregir el nombre o la colegiatura, o para guardar la biografía. El frontend ya lo resuelve pidiendo el horario en el
mismo envío. **La app móvil tiene el mismo problema** (su perfil y su reenvío no envían horario si no existe); se
corregirá junto con la app.
