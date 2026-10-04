# NeuroZen — Frontend

Aplicación web para la gestión del estrés laboral: registro de desencadenantes,
pausas activas, respiración guiada, biblioteca de recursos, reserva de sesiones
con profesionales y suscripciones.

> Este repositorio contiene **solo el frontend**. El backend (.NET) se desarrolla
> por separado. El historial detallado de correcciones está en
> [`CAMBIOS_FRONTEND.md`](./CAMBIOS_FRONTEND.md).

## Stack

| Área | Tecnología |
| --- | --- |
| Framework | Vue 3.5 (Options API) |
| Build | Vite 7 |
| Rutas | vue-router 4 (carga diferida en todas las vistas) |
| Idiomas | vue-i18n 9 — `public/es.json`, `public/en.json` |
| Estilos | Tailwind CSS 3 **compilado en build** + `src/style.css` |
| Iconos y fuentes | Font Awesome, Material Symbols y Manrope **locales (npm)** — sin CDN |
| Gráficos | Chart.js 4 |
| HTTP | `fetch` envuelto en `src/services/HttpClient.js` |

## Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/
npm run preview    # sirve dist/ en http://localhost:4173
```

### Modos de API

Se controla con `VITE_API_MODE` en los archivos `.env*`:

| Valor | Comportamiento | Dónde se usa |
| --- | --- | --- |
| `api` | Llama a la API .NET en `VITE_API_BASE_URL` (por defecto `http://localhost:5059`) | `.env`, `.env.development` |
| `static` | Modo demostración sin backend: lee `public/data/db.json` (sin modificarlo) | `.env.production` (Firebase Hosting) |

En modo `static` se puede entrar con cualquier usuario de `public/data/db.json`
(por ejemplo `user@example.com` / `password`). Los cambios solo viven en memoria.

`VITE_API_TIMEOUT` (ms) define el tiempo máximo de cada petición.

## Estructura

```text
src/
├── main.js                     # Arranque: fuentes/iconos, i18n, router, preferencias, 401
├── App.vue                     # Layout global (Header, Footer, notificaciones)
├── style.css                   # Tokens de marca + clases base (nz-btn, nz-card, nz-input…)
├── routes/index.js             # Rutas, guards, títulos de página
├── i18n/index.js               # Carga de idiomas, setLocale(), t()
├── services/                   # Comunicación con la API y lógica de datos
│   ├── HttpClient.js           #   fetch + timeout + errores homogéneos + 401
│   ├── StaticAPIAdapter.js     #   API simulada (modo static)
│   ├── session.js              #   Fuente única de sesión (token, usuario, logout)
│   ├── preferences.js          #   Aplicación de ajustes (fuente, contraste, animaciones)
│   └── *Service.js             #   Auth, Dashboard, StressTrigger, Therapist, Appointment,
│                               #   ResourceLibrary, Breathing, ActiveBreaks, Subscription, User, Onboarding
├── utils/                      # date.js (fechas locales), validation.js
├── composables/                # useToast, useResourceText
├── components/
│   ├── layout/                 # Header (con menú móvil), Footer, selector de idioma
│   ├── ui/                     # PageHeader, LoadingState, ErrorState, EmptyState,
│   │                           # ConfirmDialog, ToastHost, UserAvatar
│   └── AuthLayout, OnboardingStep, StarRating, StressLevelChart
├── shared/screens/             # Dashboard, Ajustes, Bienvenida, 404
├── user-management/screens/    # Login, Registro, Perfil
├── stress/screens/             # Triggers, Pausas activas, Respiración, Biblioteca, Detalle
├── professional-connection/    # Directorio, perfil, reservas, confirmación, Mis citas
├── payments/screens/           # Comprobante de reserva
└── subscriptions/              # Planes y compra
```

## Rutas

| Ruta | Vista | Acceso |
| --- | --- | --- |
| `/login`, `/register` | Autenticación | Solo sin sesión |
| `/onboarding`, `/onboarding/step/2`, `/onboarding/step/3` | Bienvenida | Pública |
| `/` (`/dashboard` redirige aquí) | Dashboard | Privada |
| `/stress/triggers` | Registrar desencadenante + historial | Privada |
| `/stress/active-breaks` | Pausas activas | Privada |
| `/stress/breathing` | Respiración guiada | Privada |
| `/stress/resources`, `/stress/resources/:id` | Biblioteca y detalle | Privada |
| `/therapists`, `/therapist/:id` | Directorio y perfil de profesional | Privada |
| `/book-session`, `/book-appointment/:id` | Reservas | Privada |
| `/appointment-confirmation/:appointmentId` | Confirmación de cita | Privada |
| `/payment-confirmation/:appointmentId/:paymentId` | Comprobante | Privada |
| `/appointments` | Mis citas | Privada |
| `/profile`, `/settings` | Cuenta | Privada |
| `/subscriptions`, `/subscriptions/purchase?plan=` | Planes y compra | Privada |
| `/resources/:id`, `/professionals` | Alias de rutas antiguas | — |
| cualquier otra | Página 404 | — |

Las rutas privadas sin sesión (o con un JWT caducado) envían a
`/login?redirect=<ruta>`; tras iniciar sesión se vuelve a esa ruta.

## Convenciones

- **Sesión:** usar siempre `services/session.js` (`getUserId()`, `getCurrentUser()`,
  `clearSession()`); no leer `localStorage` directamente.
- **Datos locales por usuario:** `readUserData()` / `writeUserData()`.
- **Fechas:** usar `utils/date.js` (`toLocalISODate`, `toApiDateTime`); nunca
  `toISOString().split('T')[0]`.
- **Mensajes al usuario:** `toast.success/error/info` y `ConfirmDialog`; no `alert()`.
- **Textos:** siempre con `$t()`; añadir la clave en `es.json` y `en.json`.

## Datos de demostración

`server/db.json`, `api/db.json` y `public/data/db.json` se mantienen **sin cambios**.
Atención: `npm run deploy:setup` (`deploy-static.sh`) copia `server/db.json` sobre
`public/data/db.json`.
