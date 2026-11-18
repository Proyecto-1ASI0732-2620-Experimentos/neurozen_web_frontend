# Informe: biblioteca con YouTube y acceso por planes (frontend web)

**Alcance:** solo frontend web (Vue 3 + Vite). **Backend no modificado.** Sin cambios en `.env*`, `vercel.json`,
`Dockerfile`, `nginx.conf`, `firebase.json`, `.github/`, scripts de despliegue, `api/`, `server/`, `public/data/`,
`package.json` ni `package-lock.json` (verificado con `git diff`).
Complementa `INFORME_ADAPTACION_DNI_FRONTEND.md`: el trabajo de DNI ya estaba hecho y sigue funcionando.

**App móvil:** no se entregó su código, así que **no se modificó ni se probó** (ver §6).

---

## 0. Verificación del contrato real del backend

Lo verifiqué en el código que se aplicó en el chat del backend:

| Punto | Implementación real | ¿Coincide con el prompt? |
|---|---|---|
| Plan de quien llama | `ResourceAccess.GetCallerPlanAsync`: ADMIN y psicólogo (que solo llega si está verificado) → Profesional; si no, el `planId` de la suscripción **activa**; sin suscripción → Básico | Sí |
| Lista | Filtra `RequiredPlan <= plan`; el JSON no incluye el plan | Sí |
| Detalle fuera del plan | 403 «Este recurso está disponible desde el plan {Básico/Avanzado/Profesional}», sin `contentUrl` | Sí |
| `planId` | 1 = Básico, 2 = Avanzado, 3 = Profesional (`Subscription.MinPlanId..MaxPlanId`) | Sí. El frontend usa los mismos valores (`PLAN_IDS = { basic: 1, advanced: 2, professional: 3 }`) |
| Activación | `Subscription.Apply()` pone `IsActive = true` al crear o cambiar de plan; **ignora el `isActive` del cliente** | El frontend envía `isActive: false`, pero no afecta. No lo cambié para no tocar el contrato |
| `PATCH /resource-libraries/{id}` | Solo ADMIN; campos ausentes o `null` se conservan; `""` vacía; valida URL (≤500), duración (0-600), título, descripción, etiquetas y `requiredPlan` 1-3 | Sí |
| `POST` | `requiredPlan` por defecto 2 (Avanzado) | Sí |
| `GET /subscriptions/user/{id}` | Devuelve `holderFirstName`, `holderLastName`, `email`, `cardLast4`…; 404 = sin plan | **El frontend leía `nameUser`, `lastNameUser`, `emailUser` y `numberCard`** → corregido (ver §2) |

---

## 1. Archivos modificados o creados

| Archivo | Motivo |
|---|---|
| `src/services/ResourceLibraryService.js` | **Quitados los 8 recursos fijos** que se mostraban si la API fallaba; la lista siempre viene de la API (sin caché). El detalle ya no se traga el 403 ni el 404: devuelve `RESOURCE_PLAN_REQUIRED` o `RESOURCE_NOT_FOUND` y solo prueba el alias `/resources/{id}` ante otros errores. Ya no busca en la lista ni en datos de ejemplo. `extractYouTubeId` acepta `watch?v=` (www., m. o sin subdominio, con más parámetros), `youtu.be`, `embed` y `shorts`, con ids de 11 caracteres. Miniatura de respaldo `hqdefault` y por tipo. Nuevos `updateResource` (PATCH) y `createResource` (POST) para el admin. Eliminado `getCategories()`, que no se usaba |
| `src/services/ApiError.js` | `isPlanRequired()`: detecta el 403 por plan y lo distingue del 403 de psicólogo no verificado |
| `src/composables/useResourceText.js` | **Bug que encontré:** las traducciones de los recursos de la demo (ids 1-4) se aplicaban a cualquier recurso con ese id. El recurso 1 del backend («Técnicas de Respiración Profunda») se mostraba como «Fundamentos de Respiración Consciente», con la descripción de la demo, y así se habrían perdido los textos reales y el aviso clínico. Ahora solo se traduce si el título coincide con el de la demo |
| `src/stress/screens/ResourceLibraryComponent.vue` | Banner «Desbloquea toda la biblioteca con el plan Avanzado» para trabajadores sin plan o con el Básico (lee `GET /subscriptions/user/{id}`), con botón a planes. "Vistos recientemente" solo muestra recursos que la API entregó ahora. Miniatura de respaldo si viene vacía |
| `src/stress/screens/ResourceDetailComponent.vue` | 403 por plan: pantalla con el mensaje del backend, «Mejorar plan» y «Volver a la biblioteca» (sin error genérico ni cierre de sesión). 404: «No se encontró el recurso». Reproductor `youtube-nocookie.com/embed/ID?rel=0` para **videos y audios**, con `loading="lazy"`, título accesible y `referrerpolicy` (YouTube lo exige para insertar). Enlace «Ver en YouTube» en una pestaña nueva por si el dueño bloquea la inserción. Descripción completa. Si los relacionados fallan, el detalle se muestra igual |
| `src/services/SubscriptionService.js` | Lee los nombres reales de la respuesta (`holderFirstName`, `cardLast4`…), manteniendo los antiguos por compatibilidad. Antes el perfil no mostraba el titular ni los últimos 4 dígitos |
| `src/admin/screens/AdminResourcesComponent.vue` (nuevo) | Panel admin **Recursos**: lista, edición con `PATCH` (solo envía los campos modificados), selector de plan («Mantener el plan actual» / Básico / Avanzado / Profesional), creación con `POST` (tipo y plan, por defecto Avanzado) y validaciones como las del backend. Los `errors` del 400 se muestran por campo |
| `src/admin/components/ResourceFields.vue` (nuevo) | Campos comunes de crear y editar |
| `src/routes/index.js`, `src/components/layout/HeaderComponent.vue` | Ruta `/admin/resources` (solo ADMIN) y enlace «Recursos» en el menú del administrador |
| `public/es.json`, `public/en.json` | Textos nuevos (banner, 403, «Ver en YouTube», panel admin) |
| `tests/unit/ResourceLibraryService.spec.js` | **Prueba actualizada, no eliminada:** antes exigía mostrar recursos de ejemplo si la API fallaba, lo que contradice el nuevo contrato. Ahora exige informar el error |
| `tests/mocks/data.js` | El recurso de prueba usaba un id de YouTube ficticio de 9 caracteres; ahora tiene el formato real de 11 |
| `tests/mocks/library.js` (nuevo) | Biblioteca simulada con el mismo comportamiento que el backend: lista filtrada por plan, 403 sin `contentUrl`, `POST /subscriptions` que cambia el plan |
| `tests/integration/libraryPlans.spec.js`, `tests/integration/adminResources.spec.js`, `tests/unit/libraryContract.spec.js` (nuevos) | Pruebas de §4 |

## 2. Cambios por área

- **Servicios de API:** lista sin datos fijos ni caché; detalle con 403 y 404 tipados; PATCH y POST para el admin; mapeo de la suscripción corregido.
- **Tipos y modelos:** `normalizeResource` acepta `thumbnail`, `author`, `description` y `content` vacíos. Agrega `youTubeId` y `fallbackThumbnail`. El pedido de PATCH es parcial y el POST lleva `requiredPlan` 1, 2 o 3.
- **Componentes:** reproductor de YouTube para Video y Audio, tarjetas con miniatura y respaldo, banner de plan, pantalla de 403 y panel admin.
- **Errores:** el 403 por plan muestra «Mejorar plan». El 403 de psicólogo no verificado sigue redirigiendo a la pantalla de cuenta pendiente.
- **Navegación:** «Mejorar plan» lleva a `/subscriptions`. Después de comprar, al volver a la biblioteca la lista se pide de nuevo y aparece desbloqueada sin cerrar sesión.

## 3. Reproductor

No se agregó ninguna librería: se usa el `<iframe>` de `youtube-nocookie.com/embed`, que ya usaba el proyecto. No necesita dependencias, carga en diferido y es el modo de privacidad mejorado de YouTube, que no deja cookies hasta reproducir. Los videos y audios se reproducen dentro de NeuroZen; «Ver en YouTube» queda solo como alternativa.

**Corrección a algo que te dije antes:** te dije que en los recursos tipo Audio con enlace de YouTube aparecería un reproductor de audio vacío y que no se podían marcar como completados. Al revisar el código con calma, no era así. El reproductor `<audio>` solo aparece si el enlace termina en `.mp3`, `.wav` u otra extensión de audio, y el botón «Marcar como completado» ya existía. Las pruebas lo confirman: no hay `<audio>` en un recurso de YouTube.

## 4. Pruebas (Vitest + MSW, backend simulado)

Totales: **antes 147/147 → ahora 175/175 aprobadas** (43 archivos). `eslint .` sin errores. `vite build` correcto.
Revisión visual con Chromium: biblioteca Básico a 375 px, detalle bloqueado, audio con aviso clínico y panel admin, sin desplazamiento horizontal.

| Prueba | Plataforma | Resultado | Observación |
|---|---|---|---|
| La lista viene de la API (sin recursos fijos) | Web | Aprobado | Con la API caída se muestra el error, no datos inventados |
| Cada video y audio se reproduce en el reproductor de YouTube | Web | Aprobado | Probado con un video (id 1) y un audio (id 7) |
| «Ver en YouTube» abre `watch?v=ID` en una pestaña nueva | Web | Aprobado | |
| Miniaturas de la API; vacía → genérica por tipo; rota → `data-fallback` | Web | Aprobado | |
| Aviso clínico visible en Dolor crónico y Crisis de ansiedad | Web | Aprobado | |
| El recurso 1 del backend conserva su título real | Web | Aprobado | Bug de traducción por id corregido |
| Artículos muestran su `content` | Web | Aprobado | |
| Sin suscripción: 2 videos, 2 audios (+ artículo Básico) y banner | Web | Aprobado | |
| Plan Básico: lo mismo | Web | Aprobado | |
| Plan Avanzado: los 12 de YouTube, sin banner, sin el exclusivo Profesional | Web | Aprobado | |
| Plan Profesional: todo | Web | Aprobado | |
| Básico abre un recurso Avanzado por enlace: mensaje del 403 y «Mejorar plan», sin cerrar sesión | Web | Aprobado | |
| Recurso inexistente: mensaje claro | Web | Aprobado | |
| Básico compra el Avanzado: la biblioteca se actualiza sin cerrar sesión | Web | Aprobado | Flujo completo de compra |
| La lista se vuelve a pedir en cada visita (el admin movió un recurso de plan) | Web | Aprobado | |
| "Vistos recientemente" oculta los recursos que la API ya no entrega | Web | Aprobado | |
| 403 por plan ≠ 403 de psicólogo no verificado | Web | Aprobado | Unitaria |
| Detalle: 403 y 404 se propagan; otros errores usan el alias | Web | Aprobado | Unitarias |
| Suscripción: mapeo de los campos reales del backend | Web | Aprobado | Unitaria |
| Admin edita enlace y duración (PATCH solo con lo cambiado, 200) | Web | Aprobado | |
| Admin: valores inválidos → errores por campo, sin enviar | Web | Aprobado | |
| Admin: 400 del backend → error bajo su campo | Web | Aprobado | |
| Admin mueve un recurso a Básico y un usuario Básico lo ve | Web | Aprobado | |
| Admin crea un recurso con `requiredPlan` (por defecto Avanzado) | Web | Aprobado | |
| Un usuario no ADMIN no entra a la edición | Web | Aprobado | El 403 de la API para no ADMIN lo prueba el backend |
| Psicólogo verificado ve todo / pendiente va a la pantalla de pendiente | Web | No aplica | En la web la biblioteca es solo para trabajadores (rol USER), desde antes. El 403 de no verificado ya tiene sus propias pruebas |
| Regresión: login, registro con DNI, contraseña, citas, perfil, suscripciones, admin de psicólogos | Web | Aprobado | Las 147 pruebas anteriores siguen pasando |
| Todas | Móvil | **No ejecutado** | No se entregó el código de la app |

## 5. Pendientes

**Requieren cambio en el backend (solo documentado)**
- La lista y el PATCH no devuelven el `requiredPlan` del recurso, así que el panel admin no puede mostrar el plan actual: el selector empieza en «Mantener el plan actual». Convendría incluir `requiredPlan` en las respuestas **solo para ADMIN**.
- Si se quiere mostrar recursos bloqueados con candado, para incentivar la mejora de plan, la API tendría que devolverlos sin `contentUrl`. Hoy no los envía y el frontend, como pide el prompt, no muestra nada que la API no entregó.

**Videos que YouTube no deja insertar**
- No se pueden detectar desde el navegador; el usuario ve el error de YouTube y tiene «Ver en YouTube». El admin debe cambiar el enlace desde **Admin → Recursos** (PATCH). El backend incluye `tools/check-youtube-links` para revisarlos.

**Decisiones de producto o contenido**
- La pantalla de planes dice que el Básico es «Gratis», pero comprarlo pide tarjeta, como desde antes: el backend exige los datos de tarjeta en `POST /subscriptions`.
- En la web los psicólogos no tienen acceso a la biblioteca, aunque el backend se lo da. Si se quiere, habría que agregarles una ruta.
- Las duraciones de la música y la lluvia son menores que las de los videos; se muestra la `duration` de la API.
- El modo demo sin backend (`VITE_API_MODE=static`) no aplica planes: muestra los recursos de `db.json`.

## 6. App móvil

Sin código, no hay cambios. Al implementarla, conviene replicar:
- **Reproductor:** la librería que ya use la app o un WebView con el mismo embed.
- **Alternativa si el embed falla:** `Linking.openURL(contentUrl)`.
- **Reproducción en segundo plano:** no prometerla; YouTube no la permite sin Premium.
- **Lista siempre desde la API:** pull-to-refresh y refresco al volver a primer plano después de comprar.
- **Errores:** 403 con «Mejorar plan» y miniaturas con respaldo.
- **Versiones antiguas:** si tienen los recursos fijos en el código, mostrarán los 12 a todos y recibirán 403 al abrirlos. Si existe un control de versión mínima, conviene forzar la actualización.

## 7. Cómo verificar

```bash
npm ci
npm test
npm run lint
npm run build
```
