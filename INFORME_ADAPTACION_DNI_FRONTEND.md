# Informe: adaptación del frontend web de NeuroZen al backend auditado (DNI, consentimientos y correcciones)

**Alcance:** solo frontend web (Vue 3 + Vite). **Backend no modificado.** Sin cambios en `.env*`, `vercel.json`,
`Dockerfile`, `nginx.conf`, `firebase.json`, `.github/`, scripts de despliegue, `api/`, `server/`, `public/data/`,
`package.json` ni `package-lock.json` (verificado con `git diff` contra la copia original).

**App móvil:** no se entregó su código (solo llegó el zip del frontend web), así que **no se modificó ni se probó**.
Ver §5.

---

## 0. Verificación del contrato real del backend

No tenía el código del backend en este entorno, así que leí el chat del backend ("Mejoras backend Neurozen"),
incluidos los parches de código que se aplicaron. Es lo que se usó como fuente de verdad:

| Punto | Implementación real en el backend | ¿Coincide con el prompt? |
|---|---|---|
| DTO de registro | `SignUpResource(Username, Email, Password, FullName, FirstName, LastName, Role, AcceptedTerms, Specialty, LicenseNumber, Dni, ConfirmPassword, AcceptedPrivacyPolicy)` | Sí. Además acepta `username`, `firstName` y `lastName`, que el frontend ya enviaba y sigue enviando |
| DNI | `Dni.Normalize` = solo `Trim()`; regex `^[0-9]{8}$`; mensajes «El DNI es obligatorio» / «El DNI debe tener exactamente 8 dígitos numéricos» | Sí |
| Nombre | `PersonName`: colapsa espacios, ≥2 palabras, ≤120, letras Unicode + marcas + `' ’ - .`; mensaje extra «Ingresa un nombre válido» si no hay letras | Sí, con ese mensaje adicional (cubierto en el cliente) |
| `confirmPassword` | Solo se valida si viene; no se guarda | Sí |
| Consentimientos | Si `acceptedPrivacyPolicy` es null → modo de una sola casilla («Debes aceptar los Términos y la Política de Privacidad»); si viene → dos mensajes separados | Sí. El frontend ahora envía siempre ambos |
| 409 | «Ya existe una cuenta con este correo / DNI / colegiatura» (también por índice único `ux_users_dni`) | Sí |
| `GET /users/{id}` | `UserResource(..., Dni = "")` → `dni` ("" en cuentas antiguas) | Sí |
| Admin | `AdminProfessionalResource(..., Dni = "")` en listado, verify y reject | Sí |
| Vuelta a PENDING | `PUT /users/{id}` con nombre distinto (psicólogo) → `ReturnToPendingVerification` | Sí |
| 403 en citas | `EnsureVerifiedProfessionalAsync` en `GET /appointments/{id}` y en `PATCH .../status` con CONFIRMED/COMPLETED; mensaje «Tu cuenta profesional aún no está verificada» | Sí |
| `dateOfBirth` | Solo `YYYY-MM-DD` o `YYYY-MM-DDT...`/`YYYY-MM-DD ...` | Sí |
| Colegiatura | `^[0-9]{3,6}$` | Sí |

**Puntos que no pude confirmar en el código del backend** (no aparecen en el chat):
- El cuerpo y las cabeceras exactos del **429** (por ejemplo `Retry-After`). El cliente deshabilita el botón 30 s.
- Si `PUT /users/{id}` aplica `PersonName.Validate` además de `Normalize`. El cliente valida igual si el nombre cambia.
- La regla exacta de "letra" en `PasswordPolicy` (ver pendientes).

---

## 1. Archivos modificados y motivo

| Archivo | Motivo |
|---|---|
| `src/utils/validation.js` | Nuevas reglas iguales a las del backend: `fullNameError`, `normalizeFullName`, `dniError`, `isDni`, `onlyDigits` (filtro 0-9, también al pegar), `isLicenseDigits`, `maskDni` |
| `src/services/AuthService.js` | El sign-up envía `dni`, `confirmPassword` y `acceptedPrivacyPolicy`, con el nombre normalizado. Comentario explícito: `normalizeUser` (que se guarda en la sesión) **no** incluye el DNI |
| `src/services/ApiError.js` | `code` en `ApiError`; `isProfessionalNotVerified()`, `isNotVerifiedBody()` y `fieldErrors()` para mapear `errors` del 400 (también en PascalCase) |
| `src/services/HttpClient.js` | Detecta el 403 «cuenta profesional no verificada», lo marca (`PROFESSIONAL_NOT_VERIFIED`) y avisa una sola vez; mensaje legible para 429 |
| `src/services/session.js` | `setProfessionalNotVerifiedHandler` / `notifyProfessionalNotVerified`: solo para psicólogos; si estaba `verified` pasa a `pending` |
| `src/routes/index.js` | Registra la redirección a `ProStatus` (pantalla de cuenta pendiente) ante ese 403, desde cualquier pantalla |
| `src/user-management/screens/RegisterComponent.vue` | Campo DNI tras el nombre (numérico, máx. 8, filtro 0-9, validación en tiempo real); colegiatura numérica (máx. 6); dos casillas separadas y desmarcadas; mapeo de los 400 por campo; 409 de DNI, correo y colegiatura en su campo; 429 con mensaje y botón deshabilitado; el DNI solo vive en memoria |
| `src/components/ui/TermsDialog.vue` | Prop `doc` (`terms` / `privacy` / `all`): cada casilla abre su documento reutilizando **las secciones legales existentes** (sin texto legal nuevo) y "Acepto" marca solo esa casilla |
| `src/user-management/screens/UserProfileComponent.vue` | DNI de `GET /users/{id}` en solo lectura, enmascarado (`****5678`) con botón Mostrar/Ocultar; "No registrado" si viene vacío; no se guarda en la sesión ni se envía en el PUT; validación del nombre como en el backend, solo si el nombre cambia (las cuentas antiguas siguen pudiendo guardar) |
| `src/services/UserService.js` | Documenta que el PUT no envía el DNI y que `dateOfBirth` va como `YYYY-MM-DD` (ya era así) |
| `src/professional-portal/screens/ProProfileComponent.vue` | Botón "Corregir nombre" → aviso «Si cambias tu nombre, tu cuenta volverá a revisión del administrador» → PUT → se vuelve a consultar `GET /professionals/me` → si no está VERIFIED, redirige a la pantalla de pendiente |
| `src/professional-portal/screens/ProStatusComponent.vue` | Reenvío tras rechazo: colegiatura solo con dígitos (filtro y teclado numérico) y nombre con las reglas del backend |
| `ProDashboardComponent.vue`, `ProPatientsComponent.vue`, `ProScheduleComponent.vue` | Ante el 403 de no verificado no muestran un error genérico (la redirección la hace el router). En Horario cubre Confirmar/Completar y el guardado de la disponibilidad |
| `src/services/AdminService.js` | Añade `dni` solo en el mapeo del panel admin (no en `normalizeProfessional`, que usan las vistas públicas) |
| `src/admin/screens/AdminProfessionalsComponent.vue` | Muestra el DNI en la tarjeta de cada solicitud ("No registrado" si viene vacío) y permite buscar por DNI |
| `src/services/StaticAPIAdapter.js` | El modo demo exige DNI con el mismo formato y los mismos mensajes (400 con `errors`), **sin guardarlo** |
| `public/es.json`, `public/en.json` | Textos nuevos (DNI, casillas, mensajes del backend, aviso de cambio de nombre, DNI en perfil y admin, 429) |
| `tests/integration/registerAccount.spec.js` | **2 pruebas actualizadas al nuevo contrato** (no se eliminaron): ahora completan el DNI y la segunda casilla, y esperan los dos mensajes separados |
| `tests/mocks/data.js` | `GET /users/7` devuelve `dni` como el backend real |
| `tests/integration/registerDni.spec.js` (nuevo) | Registro: DNI, nombre, correo, contraseña, consentimientos, 400, 409, 429, psicólogo |
| `tests/integration/dniProfileAdmin.spec.js` (nuevo) | DNI en perfil (con y sin DNI), PUT sin DNI, admin con DNI, directorio sin DNI |
| `tests/integration/proVerificationFlow.spec.js` (nuevo) | 403 en confirmar, en el listado y en el detalle; cambio de nombre con aviso; cancelar el aviso; rechazo y reenvío; aprobación y acceso |
| `tests/unit/dniContract.spec.js` (nuevo) | Reglas unitarias, payload, DNI fuera de la sesión, `fieldErrors`, 403, modo demo |

## 2. Cambios por área

**Formularios**
- Registro (usuario y psicólogo): `Nombre completo → DNI → Correo → (Especialidad, Colegiatura) → Contraseña → Confirmar → 2 casillas`.
- DNI: `inputmode="numeric"`, `pattern="[0-9]*"`, `maxlength=8`, `autocomplete="off"`; todo lo que no sea 0-9 se descarta al escribir y al pegar. El texto de ayuda dice "Solo números…" y nunca "verificado".
- Colegiatura: teclado numérico, máximo 6 dígitos, filtro 0-9. Si se pega "C.Ps.P. 45821" queda "45821".
- Validación en tiempo real de los campos ya tocados (al salir del campo o al completar los 8 dígitos del DNI) y de todos después del primer envío.

**Tipos / DTO** (el proyecto es JavaScript, sin TypeScript; el contrato está en los servicios):
- `SignUpRequest` (`AuthService.register`): `fullName, dni, email, password, confirmPassword, role, acceptedTerms, acceptedPrivacyPolicy, specialty?, licenseNumber?` (+ `username, firstName, lastName`, como antes).
- `UserResource`: se lee `dni` en `UserProfileComponent` (no en el objeto de sesión).
- `AdminProfessionalResource`: `dni` en `AdminService.getProfessionals`.

**Servicios y manejo de errores**
- 400 → cada mensaje de `errors` bajo su campo (`fullName/firstName/lastName→nombre`, `dni`, `email/username`, `password`, `confirmPassword`, `acceptedTerms`, `acceptedPrivacyPolicy`, `specialty`, `licenseNumber`) y el aviso general «Revisa los campos marcados.».
- 409 → DNI, correo o colegiatura en su campo. El error del servidor desaparece al corregir ese campo.
- 429 → mensaje general y botón deshabilitado 30 s.
- 403 «Tu cuenta profesional aún no está verificada» → la sesión pasa a `pending` y se redirige a la pantalla de cuenta pendiente, desde cualquier petición (directorio, recursos, listado, detalle o cambio de estado de una cita).

**Navegación**
- Psicólogo registrado → pantalla de pendiente (sin cambios).
- Cambio de nombre aceptado → `GET /professionals/me` → si está PENDING, va a la pantalla de pendiente.
- 403 de no verificado → pantalla de pendiente.

**Privacidad**
- El DNI y la contraseña no se guardan en `localStorage` ni en `sessionStorage` (comprobado por pruebas), no se registran en consola (no hay `console.log` en `src/` y el build de producción elimina `console.log/info/debug`) y no hay analytics ni Sentry en el proyecto.
- El DNI no aparece en ninguna vista pública (comprobado por prueba).

## 3. Tabla de pruebas (todas ejecutadas con Vitest + MSW; backend simulado)

Totales: **antes 95/95 → ahora 147/147 aprobadas** (40 archivos; la suite completa se ejecutó varias veces durante el trabajo, la última con 147/147). `eslint .` sin errores. `vite build` correcto.
Revisión visual con Chromium a 375 px y 1280 px: sin desplazamiento horizontal.

| Prueba | Plataforma | Resultado | Observación |
|---|---|---|---|
| Registro de usuario correcto (payload + onboarding + DNI/contraseña no guardados) | Web | Aprobado | `userRegistration_shouldSendDniAndConsents_andNotPersistDni` |
| Nombre vacío | Web | Aprobado | «Ingresa tu nombre y apellido.» |
| Nombre de una palabra | Web | Aprobado | |
| Nombre con números / con símbolos | Web | Aprobado | «El nombre solo puede contener letras…» |
| Nombre con tilde, ñ, guion y apóstrofo (debe pasar) | Web | Aprobado | "María-José O'Connor Muñoz", "Íñigo Peña-Ñúñez" + unitarias con ü, ’, cirílico |
| DNI vacío | Web | Aprobado | «El DNI es obligatorio.» |
| DNI de 7 dígitos | Web | Aprobado | |
| DNI de 9 dígitos | Web | Aprobado | El campo lo limita a 8 → se envía "12345678" |
| DNI con letras / con letras y dígitos | Web | Aprobado | Las letras se descartan |
| DNI con símbolos | Web | Aprobado | |
| DNI con espacio | Web | Aprobado | Interno: se descarta; extremos: se recortan |
| DNI con validación en tiempo real | Web | Aprobado | |
| DNI duplicado (409 en el campo) | Web | Aprobado | Y se limpia al corregir el DNI |
| Correo inválido | Web | Aprobado | |
| Correo duplicado (409 en el campo) | Web | Aprobado | |
| Contraseña < 8 / sin números / sin letras | Web | Aprobado | |
| Confirmación distinta | Web | Aprobado | |
| Sin aceptar Términos / sin aceptar Privacidad | Web | Aprobado | Cada una con su mensaje; no se envía nada |
| Casillas desmarcadas al cargar e independientes | Web | Aprobado | |
| Enlace a Privacidad abre solo ese documento y marca solo esa casilla | Web | Aprobado | |
| 400 del backend mapeado a cada campo (incl. dni, confirmPassword, acceptedPrivacyPolicy) | Web | Aprobado | |
| 429 → mensaje y botón deshabilitado | Web | Aprobado | |
| Registro de psicólogo correcto → pantalla de pendiente | Web | Aprobado | 2 pruebas (una existente actualizada y una nueva con payload) |
| Psicólogo: especialidad vacía y colegiatura con letras | Web | Aprobado | |
| Psicólogo: colegiatura duplicada (409 en el campo) | Web | Aprobado | |
| Psicólogo: DNI inválido, correo duplicado, contraseña inválida | Web | Aprobado | El mismo formulario y validaciones que en el registro de usuario (casos de arriba) |
| Psicólogo pendiente no accede al directorio ni a las citas | Web | Aprobado | `pendingPsychologist_shouldOnlySeeVerificationStatus` (existente) |
| Admin ve la solicitud con DNI (y "No registrado" en cuentas antiguas) | Web | Aprobado | |
| Admin aprueba (checklist) / rechaza con motivo | Web | Aprobado | Pruebas existentes, sin cambios |
| Admin aprueba y el psicólogo accede al portal | Web | Aprobado | `pendingPsychologistApproved_shouldAccessPortal` |
| Rechazado ve el motivo y corrige (colegiatura solo dígitos) | Web | Aprobado | |
| Verificado cambia su nombre → aviso previo → vuelve a pendiente | Web | Aprobado | El PUT no sale hasta confirmar el aviso |
| Cancelar el aviso no guarda | Web | Aprobado | |
| Pendiente confirma una cita (403) → pantalla de pendiente | Web | Aprobado | Sin error genérico |
| Listado de citas 403 → pantalla de pendiente | Web | Aprobado | |
| Detalle de cita `GET /appointments/{id}` 403 → marcado y redirección | Web | Aprobado | Prueba a nivel de servicio: el portal del psicólogo no tiene pantalla de detalle |
| Otro 403 (usuario normal) no redirige | Web | Aprobado | |
| Perfil con DNI (enmascarado, solo lectura, no en la sesión) | Web | Aprobado | |
| Perfil sin DNI (cuenta antigua) → "No registrado" y se puede guardar | Web | Aprobado | |
| PUT /users/{id} sin `dni` y `dateOfBirth` = `YYYY-MM-DD` | Web | Aprobado | |
| Directorio público no muestra el DNI | Web | Aprobado | |
| Modo demo exige DNI y no lo guarda | Web | Aprobado | |
| Inicio de sesión (correcto, incorrecto, admin) | Web | Aprobado | Existentes |
| Recuperación / restablecimiento de contraseña | Web | Aprobado | Existentes |
| Reserva, cancelación y reseña de citas | Web | Aprobado | Existentes |
| Cierre de sesión / datos aislados por usuario | Web | Aprobado | Existentes (`session.spec.js`) |
| Token vencido y 401 → login | Web | Aprobado | Existentes |
| Todas las anteriores | Móvil | **No ejecutado** | No se entregó el código de la app móvil |

## 4. Pendientes

**Solucionados**
- Registro de usuario y psicólogo con DNI, `confirmPassword` y dos consentimientos separados.
- Mapeo de todos los errores 400/409 a sus campos y manejo del 429.
- DNI en perfil (solo lectura) y en el panel admin; nunca en la sesión ni en vistas públicas.
- Aviso y redirección cuando un psicólogo cambia su nombre; manejo global del 403 de no verificado.
- Colegiatura y DNI con teclado numérico y filtro 0-9.

**Errores existentes encontrados y corregidos (auditoría §7.1)**
- La validación del nombre del cliente aceptaba números y símbolos (solo pedía 3 caracteres y 2 palabras) → el backend respondía 400. Alineada.
- La colegiatura se escribía con prefijo "C.Ps.P." y teclado de texto; ahora es numérica, como exige el backend.
- Un psicólogo cuya cuenta volvía a revisión veía un mensaje de error genérico en el panel, los pacientes y el horario (y un toast al confirmar). Ahora va a la pantalla de cuenta pendiente.
- El 409 se mostraba como un aviso general, decidido por expresión regular (cualquier 409 que no fuera de colegiatura se mostraba como "correo en uso"). Ahora va al campo correcto.
- El 429 no tenía mensaje propio (caía en "error desconocido").

**Parcialmente solucionados**
- Modo demo (`VITE_API_MODE=static`): valida el formato del DNI, pero **no detecta DNI duplicados** porque, a propósito, no guarda el DNI en `sessionStorage`.
- El 429 deshabilita el botón un tiempo fijo (30 s) porque no se conoce `Retry-After` en el contrato.

**Requieren cambios o confirmación en el backend** (solo documentado; no se tocó el backend)
- Confirmar el cuerpo y `Retry-After` del 429 del registro, para mostrar el tiempo real de espera.
- Confirmar si `PUT /users/{id}` valida el nombre con `PersonName.Validate`. Si solo lo normaliza, el backend podría aceptar nombres que el registro rechaza. El cliente ya lo valida.
- `PasswordPolicy`: el cliente considera letras A-Z más tildes y ñ. Si el backend acepta cualquier letra Unicode, una contraseña como "Пароль123" la rechazaría el cliente y la aceptaría el backend. Conviene confirmar la regla exacta.
- Si el registro de psicólogos debe mostrar el DNI en `GET /professionals/me` para la pantalla de "datos enviados", el recurso tendría que incluirlo. Hoy no se muestra ahí; no se inventó.

**Requieren decisión legal o administrativa**
- El texto existente de la Política de Privacidad («Tratamos tus datos de cuenta (nombre, correo)…») **no menciona el DNI**. No se modificó (no se inventa texto legal); legal debe actualizarlo.
- Términos y Privacidad no existen como documentos independientes: la app solo tenía un diálogo con 5 secciones. Se separaron así: Términos = Finalidad y Profesionales verificados; Privacidad = Datos, Datos de salud y Derechos ARCO. Legal debe validar ese reparto o entregar los documentos completos.
- Versiones de los documentos (`Legal__TermsVersion`, `Legal__PrivacyPolicyVersion`, por defecto `1.0` en el backend).
- Un consentimiento específico para datos sensibles de salud (no se creó la casilla ni su texto).

## 5. App móvil

No se recibió el código de la app móvil, así que **no hay cambios ni pruebas móviles**. Al aplicar el contrato en la app:
- El DNI es obligatorio: **las versiones publicadas que no lo envían no podrán registrarse** (400) hasta actualizarse. Si la app tiene un mecanismo de versión mínima, conviene forzar la actualización con un mensaje como: "Actualiza NeuroZen para crear tu cuenta: ahora pedimos tu DNI".
- Hay que replicar los puntos 1-12 de este informe: `keyboardType="number-pad"`, `maxLength={8}` con filtro 0-9 (también al pegar), colegiatura numérica de máximo 6, nada de DNI ni contraseña en AsyncStorage/SharedPreferences/UserDefaults, y modelos que toleren `dni` en `GET /users/{id}` y en el panel admin.

## 6. Cómo verificar

```bash
npm ci
npm test
npm run lint
npm run build
```
