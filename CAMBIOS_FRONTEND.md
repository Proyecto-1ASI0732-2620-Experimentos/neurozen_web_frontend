# Correcciones y mejoras del frontend

**Alcance:** 100 % frontend.

| Componente | Estado |
| --- | --- |
| Frontend | Corregido, mejorado y funcional |
| Backend | **No modificado** |
| `db.json` (`api/`, `server/`, `public/data/`) | **No modificado** (sumas MD5 verificadas antes y después) |
| Tests | **No implementados en esta fase** |

## 1. Matriz de correcciones

Estados: **Corregido** · **Mejorado** · **Dependiente del backend** · **No requiere modificación**.

| ID | Problema | Archivo(s) | Corrección realizada | Estado |
| --- | --- | --- | --- | --- |
| C01 | Login y registro imposibles en producción (modo estático sin token) | `services/StaticAPIAdapter.js` | Simula sign-in/sign-up contra los usuarios de `db.json` y devuelve token de demostración | Corregido |
| C02 | Modo estático no resolvía ningún `/api/v1/...` | `services/StaticAPIAdapter.js` | Quita el prefijo, mapea recursos (`resource-libraries`→`resourceLibrary`, `triggers`→`stressTriggers`…), filtros por query, reseñas por profesional, 404 reales | Corregido |
| C03 | Usuario inexistente devolvía otro usuario | `services/StaticAPIAdapter.js` | Devuelve 404; nunca expone `password` | Corregido |
| C04 | Clic en un recurso volvía al Dashboard (`/resources/:id`) | `ResourceLibraryComponent.vue`, `ResourceDetailComponent.vue`, `routes/index.js` | Navegación por nombre de ruta y alias para la URL antigua | Corregido |
| C05 | `AppointmentService` usado sin importar | `AppointmentConfirmationComponent.vue` | Carga real de la cita con respaldo en datos de navegación (`appointmentDetails.js`) | Corregido |
| C06 | La sesión de respiración no se guardaba | `BreathingSessionComponent.vue`, `BreathingService.js` | Servicio instanciado; historial por usuario | Corregido |
| C07 | Tiempo restante congelado, barra de progreso en 0, reanudar reiniciaba la duración | `BreathingSessionComponent.vue` | Un único temporizador de 1 s controla fase y tiempo; el modal de salida pausa | Corregido |
| C08 | Horarios disponibles nunca pedidos al backend | `BookSessionComponent.vue` | Llamada sobre la instancia; descarta horas pasadas del día actual | Corregido |
| C09 | Hora local enviada como UTC (`...T09:00:00Z`) | `StressTriggerService.js`, `AppointmentService.js`, `utils/date.js` | `toApiDateTime()` convierte la hora local a ISO UTC correcto | Corregido |
| C10 | Fechas por defecto en UTC (día siguiente tras las 19:00 en Lima) | Triggers, reservas | `toLocalISODate()` | Corregido |
| C11 | Payload de cita distinto entre pantallas y `userId: 1` fijo | `BookAppointmentComponent.vue` | `AppointmentService.buildPayload()` común, con usuario de sesión | Corregido |
| C12 | `appointmentId \|\| 1` mostraba una cita ajena | `bookingFlow.js` | Si el backend no devuelve id, se va a "Mis citas" | Corregido |
| C13 | Tipos de sesión de respaldo con id de texto | `AppointmentService.js` | Ids numéricos 1/2/3 como espera la API | Corregido |
| C14 | Días del mes anterior mal calculados en el calendario | `BookSessionComponent.vue` | Calendario recalculado (semana desde lunes, sin meses pasados) | Corregido |
| C15 | Sin manejo de 401 ni de token caducado; usuario atrapado | `HttpClient.js`, `session.js`, `routes/index.js`, `main.js` | 401 → cierra sesión y `/login?expired=1&redirect=…`; guard valida `exp` del JWT | Corregido |
| C16 | Logout no borraba `currentUser` | `HeaderComponent.vue`, `session.js` | `clearSession()` limpia todas las claves | Corregido |
| C17 | Botón "Login Usuario Demo" con token falso | `DashboardComponent.vue` | Eliminado | Corregido |
| C18 | Estadísticas aleatorias que cambiaban con cada clic | `DashboardService.js` | Datos de `user.stressData` o calculados de los triggers; si no hay, demo estable y señalizada | Corregido |
| C19 | Spinner y contenido visibles a la vez; cuenta atrás rota | `DashboardComponent.vue` | Estados loading/error/contenido excluyentes | Corregido |
| C20 | Número de tarjeta y CVV en `console.log`; CVV conservado en el perfil | `PurchaseComponent.vue`, `UserProfileComponent.vue`, `SubscriptionService.js` | Sin logs; CVV y número se vacían tras el envío; el perfil solo guarda los últimos 4 dígitos | Mejorado / Dependiente del backend (el contrato exige tarjeta y CVV) |
| C21 | Datos ficticios en perfiles reales (contacto "María Pérez", medicación) | `UserProfileComponent.vue` | Estado inicial vacío | Corregido |
| C22 | Perfil con `fetch` directo y URL hardcodeada | `UserService.js` | `PUT /api/v1/users/{id}` mediante `HttpClient` | Corregido |
| C23 | "Limpiar caché" y "Eliminar datos" borraban el token | `SettingsComponent.vue` | Limpieza selectiva; borrado de datos locales con confirmación y cierre de sesión explícito | Corregido |
| C24 | Ajustes sin efecto (idioma, fuente, contraste, animaciones) | `SettingsComponent.vue`, `preferences.js` | Se aplican al instante y al arrancar | Corregido |
| C25 | Iconos Material Symbols mostrados como texto | `main.js` | Fuente local por npm | Corregido |
| C26 | Navegación oculta en móvil sin alternativa | `HeaderComponent.vue` | Menú móvil completo | Corregido |
| C27 | `/therapists` y `/payment-confirmation` huérfanas; ruta `UserAppointments` inexistente | Header, `routes/index.js`, `UserAppointmentsComponent.vue` | Accesibles desde el menú; nueva vista "Mis citas" | Corregido |
| C28 | Comprobante de pago con datos fijos (2024-01-15, Dra. González) y error al renderizar | `PaymentConfirmationComponent.vue` | Muestra la cita real, método elegido, imprimir y añadir a calendario | Corregido |
| C29 | Detalle de recurso sin reproductor (campos inexistentes) y `v-html` sin sanitizar | `ResourceLibraryService.js`, `ResourceDetailComponent.vue` | Normalización común; YouTube, audio y video; texto plano por párrafos; recarga al cambiar de id | Corregido |
| C30 | Duración "900m" en recursos de ejemplo | `ResourceLibraryService.js` | Unidad unificada en minutos | Corregido |
| C31 | Bucle de `onerror` con `via.placeholder.com` (servicio caído) | Biblioteca, profesionales, `main.js` | Respaldo local único por `data-fallback` | Corregido |
| C32 | Pausas activas: agenda ignoraba minutos, días e interruptor; completadas al azar; estadísticas fijas | `ActiveBreaksService.js`, `ActiveBreaksComponent.vue` | Agenda y resumen semanal calculados desde la configuración; datos por usuario | Corregido |
| C33 | Filtro de disponibilidad sin efecto; textos en inglés | `TherapistListComponent.vue` | Filtro funcional, búsqueda, i18n | Corregido |
| C34 | Puntos de progreso del onboarding invisibles | `OnboardingService.js`, `OnboardingStep.vue` | `step`/`totalSteps` + componente común | Corregido |
| C35 | "Recordarme" sin efecto | `login.component.vue`, `session.js` | Desactivado → sesión en `sessionStorage` | Corregido |
| C36 | "¿Olvidaste tu contraseña?" llevaba a ruta inexistente | `login.component.vue` | Mensaje informativo en la misma pantalla | Dependiente del backend |
| C37 | `PriceCard` deducía el plan comparando el texto traducido; precio tomado de la URL | `PriceCardComponent.vue`, `PurchaseComponent.vue` | `planKey` explícito; precio desde i18n | Corregido |
| C38 | Validaciones mínimas en formularios | Login, registro, triggers, reservas, compra, perfil | Errores por campo, confirmación de contraseña, teléfono, Luhn, vencimiento, CVV, fechas futuras/pasadas | Mejorado |
| C39 | `alert()`/`confirm()` bloqueantes | Varias | Toasts globales y `ConfirmDialog` accesible | Mejorado |
| C40 | Listeners de `document` y temporizadores sin limpiar | Header, selector de idioma, pausas, respiración | Eliminados en `beforeUnmount` | Corregido |
| C41 | `router.go(-1)` sacaba de la app al entrar por URL directa | `PageHeader.vue` | Vuelve atrás solo si hay historial; si no, a una ruta segura | Corregido |
| C42 | Sin página 404 | `NotFoundComponent.vue` | Vista 404 | Mejorado |
| C43 | Clave i18n inexistente y textos fijos en inglés/español | `public/es.json`, `public/en.json` | 220+ claves nuevas en ambos idiomas | Mejorado |
| C44 | Tailwind, Font Awesome y fuentes por CDN | `index.html`, `tailwind.config.js`, `postcss.config.js` | Todo local y compilado; misma paleta | Mejorado |
| C45 | Tres colores "primarios" distintos y utilidades globales que chocaban con Tailwind | `App.vue`, `style.css` | Un único sistema de tokens con la identidad original (#2D5A4A, beige, Manrope) | Mejorado |
| C46 | Código muerto (capa DDD sin uso, `LoginComponentFixed`, `HelloWorld`, `public/api/*`, `ToastComponent`) | Varias carpetas | Eliminado | Mejorado |
| C47 | Más de 200 `console.log`, varios con datos personales | Todo `src/` | Eliminados; además el build de producción descarta `console.log/info/debug` | Mejorado |
| C48 | API de producción por HTTP | `.env.production` | HTTPS | Corregido |
| C49 | `pnpm-lock.yaml` desactualizado frente a `package-lock.json` | Raíz | Eliminado (el proyecto usa npm) | Mejorado |
| C50 | Organización por módulos, flujo de 4 pasos de reserva, vue-i18n, Options API | — | Se conservan | No requiere modificación |

## 2. Dependencias del backend (frontend ya adaptado)

| Funcionalidad | Situación actual del frontend |
| --- | --- |
| Pago de citas | No hay endpoint: se registra el método elegido y se muestra en el comprobante |
| Sesiones de respiración, pausas activas | Guardadas en el navegador, aisladas por usuario |
| Salud, preferencias y contactos de emergencia del perfil | No existen en el modelo de usuario: guardados localmente, indicado en la UI |
| Cambiar contraseña, eliminar cuenta, recuperar contraseña | Botones deshabilitados con explicación |
| Recordatorios/notificaciones | Preferencias guardadas; el aviso de la cabecera usa la próxima cita y la próxima pausa |
| Detalle de recurso | Se prueba `/resource-libraries/{id}`, luego `/resources/{id}` y, si fallan, la lista |
| Horarios disponibles y tipos de cita | Si el endpoint no responde, horarios y tipos por defecto |
| Suscripción | El contrato exige número de tarjeta completo y CVV |

## 3. Roadmap realizado

### Arquitectura
- Capa única de servicios en `src/services/` con `HttpClient`, `ApiError`, `session.js` y `preferences.js`.
- Normalizadores de datos en los servicios (`normalizeResource`, `normalizeProfessional`, `normalizeAppointment`, `normalizeTrigger`, `normalizeUser`).
- Nuevos servicios `SubscriptionService` y `UserService`.
- `utils/date.js` y `utils/validation.js` sustituyen 7 implementaciones duplicadas.
- Componentes de layout y de UI reutilizables.

### Funcionalidad
- Login en modo demostración, historial y borrado de triggers, "Mis citas", comprobante real.
- Ajustes aplicados, diagnóstico real, filtro de disponibilidad, favoritos y completados por usuario.

### UI/UX
- Sistema visual coherente: tarjetas, botones, campos, cabeceras de página.
- Pantallas de autenticación con panel de marca.
- Dashboard sin bloques duplicados.
- Asistente de reserva con indicador de pasos.

### Responsive
- Menú móvil, rejillas adaptativas, filtros con desplazamiento horizontal.
- Sin desbordamiento horizontal a 390 px (verificado en 9 pantallas).

### Estados
- `LoadingState`, `ErrorState` con reintento y `EmptyState` en todas las listas y cargas.
- Botones deshabilitados y con spinner durante los envíos.

### Errores
- Mensajes por tipo: red, timeout, 400, 401, 403, 404, 409, 5xx.
- Fallos parciales (reseñas, horarios) no bloquean la pantalla.

### Navegación
- Lazy loading, alias de rutas antiguas, 404.
- Redirección tras el login y títulos de documento.
- Enlace activo correcto, menús que se cierran al navegar.

### Accesibilidad
- Botones reales en lugar de `div`, `role="switch"`, `aria-pressed`, `aria-expanded` y `aria-invalid`.
- Etiquetas asociadas a sus campos y diálogos con `aria-modal`.
- Enlace "Saltar al contenido", foco visible y soporte de movimiento reducido.

### Código
- Eliminación de código muerto, logs y duplicaciones.
- Comentarios de cabecera que explican qué se corrigió en cada archivo.

## 4. Verificación

| Comprobación | Resultado |
| --- | --- |
| `npm install` + `vite build` | Sin errores ni avisos |
| Rutas (16) en modo demostración | Todas cargan; alias y 404 correctos |
| Login / validación / credenciales erróneas / logout | Correcto; logout deja `localStorage` y `sessionStorage` sin sesión |
| Guard con JWT caducado | Redirige a `/login?redirect=…` |
| Registro de trigger | Se guarda y aparece en el historial |
| Biblioteca → detalle | Correcto |
| Reserva → confirmación → comprobante → Mis citas | Correcto |
| Compra con tarjeta inválida | Muestra los 3 errores de campo |
| Edición de perfil | Guardado con aviso de éxito |
| Cambio de idioma | Aplicado al instante |
| Sin backend (modo `api`) | Mensajes claros, sin errores de JavaScript |
| Móvil 390 px | Sin desbordamiento; menú móvil operativo |
| Consola | Solo 403 de imágenes externas bloqueadas en el entorno de prueba, que ahora tienen respaldo local |

## 5. Pendiente

- **Pruebas automatizadas** (fase siguiente).
- **Traducciones de recursos por id:** los títulos de recursos en `es.json`/`en.json` están indexados por id del backend. Con los recursos de ejemplo locales algunos títulos no coinciden con su categoría; se corrige al usar la API real.
- **Pantalla de recuperación de contraseña:** se implementará cuando exista el endpoint.
