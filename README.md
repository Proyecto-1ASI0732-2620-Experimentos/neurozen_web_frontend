# NeuroZen App - Frontend

Una aplicación web Vue.js para el manejo del estrés laboral con internacionalización completa (ES/EN), construida con un enfoque DDD (Domain-Driven Design) y Vue Options API.

## � Características Principales 

- **Internacionalización completa** - Soporte para Español e Inglés con Vue i18n
- **Autenticación completa** - Login, registro y gestión de sesiones
- **Dashboard interactivo** - Estadísticas personalizadas por usuario
- **Gestión del estrés** - Técnicas de respiración y pausas activas
- **Biblioteca de recursos** - Artículos y guías sobre bienestar
- **conexión profesional** - Reserva de sesiones con terapeutas
- **Configuraciones** - Perfil de usuario y preferencias
- **Diseño responsive** - Adaptable a todos los dispositivos
- **Modo oscuro** - Interfaz adaptable a preferencias del usuario

## Arquitectura DDD

La aplicación sigue un enfoque Domain-Driven Design con bounded contexts:

```
src/
├── user-management/     # Gestión de usuarios y autenticación
├── stress/             # Monitoreo y manejo del estrés
├── intervention/       # Técnicas e intervenciones
├── professional-connection/  # Conexión con profesionales
├── payments/           # Gestión de pagos (preparado)
├── shared/             # Componentes y servicios compartidos
├── routes/             # Configuración de rutas
├── i18n/              # Configuración de internacionalización
├── services/          # Servicios principales
└── components/        # Componentes globales
```

### Estructura por bounded context:
```
bounded-context/
├── application/        # Casos de uso y servicios
├── domain/            # Modelos, repositorios y eventos
├── infrastructure/    # Implementaciones externas
├── interfaces/        # Adaptadores de interfaz
└── screens/          # Componentes Vue específicos
```

## �️ Stack Tecnológico

- **Vue 3** (Options API) - Framework principal
- **Vue Router 4** - Navegación SPA
- **Vue i18n 9** - Internacionalización
- **Tailwind CSS 3** - Framework de estilos
- **Font Awesome 6** - Iconografía
- **JSON Server** - API fake para desarrollo
- **Vite** - Build tool y dev server
- **JavaScript ES6+** - Lenguaje base

## � Módulos Implementados

### User Management
- **Login** - Autenticación de usuarios
- **Registro** - Creación de nuevas cuentas
- **Perfil** - Gestión de datos personales

### Dashboard (Shared)
- Estadísticas de estrés personalizadas por usuario
- Gráficos interactivos de progreso
- Enlaces rápidos a funcionalidades principales
- Configuraciones de aplicación

### Stress Management
- **Registro de triggers** - Identificación de factores de estrés
- **Pausas activas** - Ejercicios de relajación guiados
- **Sesiones de respiración** - Técnicas de respiración con temporizador
- **Biblioteca de recursos** - Artículos y guías sobre bienestar

### Professional Connection
- **Reserva de sesiones** - Booking con profesionales de la salud mental
- **Confirmación de citas** - Gestión de reservas

## Internacionalización

### Configuración Vue i18n
- **Carga asíncrona** de traducciones desde `/public/`
- **Persistencia** del idioma seleccionado en localStorage
- **Detección automática** del idioma del navegador
- **Selector de idioma** integrado en el header

### Archivos de traducción
- `/public/en.json` - Traducciones en inglés
- `/public/es.json` - Traducciones en español

### Estructura de traducciones
```json
{
  "common": { "buttons", "navigation", "messages" },
  "auth": { "login", "register", "validation" },
  "dashboard": { "stats", "charts", "widgets" },
  "stress": { "triggers", "exercises", "resources" },
  "professional": { "booking", "sessions" },
  "settings": { "profile", "preferences" }
}
```

## Instalación y Configuración

### Prerrequisitos
- Node.js 16+
- npm o yarn

### Instalación
```bash
# Clonar repositorio
git clone
cd NeuroZen-app-web-frontend

# Instalar dependencias
npm install
```

## Comandos de Ejecución

```bash
# Iniciar aplicación completa (Frontend + API)
npm run start

# Solo desarrollo frontend
npm run dev

# Solo API fake
npm run api

# Build para producción
npm run build

# Preview del build
npm run preview

# Despliegue en Firebase
npm run deploy:setup    # Configuración inicial
npm run deploy:all      # Desplegar todo
npm run deploy:frontend # Solo frontend
```

## 🔗 URLs

### Desarrollo
- **Frontend**: http://localhost:5173
- **API Mock**: http://localhost:3002
- **API Docs**: http://localhost:3002 (JSON Server UI)

### Producción
- **Frontend**: https://neurozen-frontend.web.app
- **API**: Modo estático (datos servidos desde `/data/db.json`)

## ⚙️ Variables de Entorno

La aplicación utiliza variables de entorno para configurar diferentes ambientes:

### Desarrollo (`.env.development`)
```bash
VITE_API_BASE_URL=http://localhost:3002
VITE_API_TIMEOUT=10000
```

### Producción (`.env.production`)
```bash
VITE_API_BASE_URL=static
VITE_API_MODE=static
VITE_API_TIMEOUT=15000
VITE_FRONTEND_URL=https://neurozen-frontend.web.app
```

## 🧪 Datos de Prueba

### Usuarios de testing
```json
// Admin
{
  "email": "admin@neurozen.com",
  "password": "123456",
  "role": "admin"
}

// Usuario estándar
{
  "email": "user@example.com",
  "password": "password", 
  "role": "user"
}

// Usuario con datos completos
{
  "email": "juan.perez@example.com",
  "password": "123456",
  "role": "user"
}
```

## 🔌 Integración Backend - Frontend

### Backend .NET API

La aplicación ahora se conecta a un backend real construido con **ASP.NET Core** que incluye:

- **Autenticación JWT** - Sistema completo de tokens
- **MySQL Database** - Base de datos en Azure
- **DDD Architecture** - Domain-Driven Design
- **Swagger UI** - Documentación interactiva de API
- **Módulos principales**: IAM, Appointments, Triggers, Professionals, Resources, Subscriptions

#### Configuración CORS

El backend **DEBE** tener configurado CORS para permitir peticiones desde el frontend.
Sigue las instrucciones en: **[CORS_SETUP.md](./CORS_SETUP.md)**

#### Documentación Completa

Para guía completa de integración, endpoints, autenticación y troubleshooting:
📖 **[BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)**

### Endpoints del Backend .NET

Consulta la documentación completa en Swagger UI: `http://localhost:5059/swagger`

#### Módulos principales:
- **IAM/Authentication**: `/api/v1/authentication/*`
- **Users**: `/api/v1/users/*`
- **Appointments**: `/api/v1/appointments/*`
- **Triggers**: `/api/v1/triggers/*`
- **Professionals**: `/api/v1/professionals/*`
- **Resources**: `/api/v1/resources/*`
- **Subscriptions**: `/api/v1/subscriptions/*`

### Autenticación JWT

Todas las peticiones (excepto login/register) requieren un token JWT:

```javascript
// El HttpClient automáticamente incluye el token
// Token almacenado en: localStorage.getItem('authToken')

// Ejemplo de header:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## API Endpoints (JSON Server - Deprecado)

**⚠️ Nota**: JSON Server está siendo reemplazado por el backend .NET. Usa solo para fallback.

La aplicación anteriormente utilizaba JSON Server con los siguientes endpoints:

### Autenticación y usuarios
- `GET /users` - Lista de usuarios
- `GET /users/:id` - Usuario específico
- `POST /users` - Crear usuario
- `PUT /users/:id` - Actualizar usuario

### Datos del dashboard
- `GET /users/:id` - Datos de estrés por usuario (stressData)
- `GET /stressData` - Datos generales de estrés (fallback)

### Gestión de estrés
- `GET /stressTriggers` - Triggers de estrés
- `POST /stressTriggers` - Crear trigger
- `GET /resources` - Biblioteca de recursos
- `GET /resources/:id` - Recurso específico

### Conexión profesional
- `GET /professionals` - Lista de profesionales
- `GET /appointments` - Citas reservadas
- `POST /appointments` - Crear cita

### Otros módulos
- `GET /onboarding` - Pasos del onboarding
- `GET /interventions` - Técnicas de intervención
- `GET /payments` - Planes de pago

## Sistema de Autenticación

### Flujo de autenticación
1. **Login** - Validación de credenciales contra fake API
2. **Token** - Generación y almacenamiento en localStorage
3. **Guards** - Protección de rutas autenticadas
4. **Persistencia** - Mantenimiento de sesión entre recargas

### Almacenamiento local
- `authToken` - Token de autenticación
- `currentUser` - Datos del usuario actual
- `selectedLanguage` - Idioma seleccionado

### Rutas protegidas
- `/dashboard` - Panel principal
- `/profile` - Perfil de usuario
- `/stress/*` - Módulo de estrés
- `/professional/*` - Conexión profesional

## Diseño y Theming

### Paleta de colores
```css
/* Colores principales */
--primary: #2D5A4A;          /* Verde principal */
--primary-dark: #1e3d30;     /* Verde oscuro */
--primary-light: #4a7c6b;    /* Verde claro */

/* Backgrounds */
--bg-light: #F1E9D4;         /* Beige claro */
--bg-dark: #11211c;          /* Verde muy oscuro */

/* Textos */
--text-light: #374151;       /* Gris oscuro */
--text-dark: #E5E7EB;        /* Gris claro */

/* Estados */
--success: #10B981;          /* Verde éxito */
--warning: #F59E0B;          /* Amarillo advertencia */
--error: #EF4444;            /* Rojo error */
```

### Componentes de diseño
- **Header** - Navegación principal con selector de idioma
- **Footer** - Información de copyright
- **Sidebar** - Navegación lateral (dashboard)
- **Cards** - Contenedores de información
- **Modals** - Ventanas emergentes
- **Forms** - Formularios consistentes

## Servicios Principales

### AuthService
- Autenticación de usuarios
- Gestión de tokens
- Persistencia de sesión
- Validación de permisos

### DashboardService
- Obtención de estadísticas por usuario
- Datos de progreso personalizado
- Métricas de estrés

### StressTriggerService
- Gestión de triggers de estrés
- Persistencia en fake API
- Categorización de factores

### HttpClient
- Cliente HTTP base
- Manejo de errores
- Interceptores de requests/responses

## Principales Funciones

### Gestión de Estado
```javascript
// Persistencia automática de idioma
const persistLanguage = (locale) => {
  localStorage.setItem('selectedLanguage', locale);
}

// Detección de idioma del navegador
const detectBrowserLanguage = () => {
  return navigator.language.slice(0, 2);
}
```

### Servicios de API
```javascript
// Obtener datos específicos del usuario
const getUserStressData = async (userId) => {
  // Intenta obtener datos específicos del usuario
  // Si no existen, usa datos generales como fallback
}

// Persistir datos del usuario
const saveUserData = async (userId, data) => {
  // Guarda datos específicos del usuario en la API
}
```

### Validación de Formularios
```javascript
// Validación de email
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validación de contraseña
const validatePassword = (password) => {
  return password.length >= 6;
}
```

## 🔧 Configuración Avanzada

### Vite Config
```javascript
// vite.config.js
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    host: true
  }
})
```

### Vue Router Config
```javascript
// Configuración de rutas con guards
const router = createRouter({
  history: createWebHistory(),
  routes: [...],
  scrollBehavior: (to, from, savedPosition) => {
    return savedPosition || { top: 0 };
  }
});
```

## Estado del Proyecto

### Completado
- [x] Internacionalización
- [x] Sistema de autenticación
- [x] Dashboard con datos por usuario
- [x] Gestión de estrés (triggers, respiración, recursos)
- [x] Conexión profesional (booking)
- [x] Configuraciones de usuario
- [x] Diseño responsive
- [x] API fake con JSON Server
- [x] Documentación

## Despliegue en Firebase

La aplicación está configurada para despliegue en Firebase Hosting con una API estática que funciona completamente en el plan gratuito.

### Configuración rápida
```bash
# 1. Setup inicial (solo primera vez)
npm run deploy:setup

# 2. Desplegar
npm run deploy:all
```

### Comandos de despliegue
```bash
npm run deploy:frontend  # Desplegar frontend con API estática
npm run deploy:all       # Igual que deploy:frontend
```

### URLs de producción
- **App:** https://neurozen-frontend.web.app
- **API:** Modo estático integrado (sin Cloud Functions)

### Arquitectura Firebase
```
firebase-project/
├── Hosting (Frontend + API estática)  # neurozen-frontend.web.app
│   ├── /dist/                         # App compilada
│   └── /data/db.json                  # Base de datos estática
└── Emulators                          # Para testing local
```

### Modo API Estática
- ✅ **Sin Cloud Functions** - Funciona en plan gratuito
- ✅ **Datos persistentes** - Servidos desde `/data/db.json`
- ✅ **Compatible** - Misma interfaz que la API REST
- ⚠️ **Solo lectura** - Operaciones POST/PUT/DELETE simuladas
- 📝 **Logging** - Las mutaciones se logean en consola

### 🛠️ Solución de Problemas

#### Error "Item with id 'XXXXX' not found"
Si ves este error en el dashboard:

1. **Ve a la página de debug**: https://neurozen-frontend.web.app/debug.html
2. **Limpia el localStorage** usando el botón correspondiente
3. **Haz login con un usuario válido** (admin@neurozen.com / 123456)

#### Usuarios válidos para pruebas:
- **Admin**: admin@neurozen.com / 123456
- **Usuario Demo**: user@example.com / password  
- **Usuario Completo**: juan.perez@example.com / 123456

#### Verificar que la API funcione:
- **Datos**: https://neurozen-frontend.web.app/data/db.json
- **Debug**: https://neurozen-frontend.web.app/debug.html

**📖 Para guía detallada, ver:** [FIREBASE_DEPLOY.md](FIREBASE_DEPLOY.md)

## Contribución

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/NewFeature`)
3. Commit cambios (`git commit -m 'Add NewFeature'`)
4. Push a la rama (`git push origin feature/NewFeature`)
5. Abre un Pull Request

### Guidelines de contribución
- Seguir la arquitectura DDD establecida
- Mantener cobertura de traducciones
- Documentar nuevas funcionalidades
- Agregar JSDoc a funciones principales

*NeuroZen App - Transformando el bienestar laboral a través de la tecnología* 🧘‍♀️✨
