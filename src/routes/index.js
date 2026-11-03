/**
 * routes/index.js - Rutas de NeuroZen con guards de autenticación.
 *
 * Cambios:
 *  - Carga diferida (lazy) de todas las vistas.
 *  - Guards basados en session.js (validan caducidad del JWT).
 *  - Tras iniciar sesión se vuelve a la ruta solicitada (?redirect=).
 *  - Alias para enlaces antiguos (/resources/:id, /professionals).
 *  - Nuevas vistas: Mis citas (/appointments) y página 404.
 *  - Título de documento por ruta.
 *
 * @author Juan Carlos Angulo
 * @version 2.0.0
 */
import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated, getCurrentUser } from '../services/session.js'
import { ROLES, getRole, homeRouteFor, isVerifiedPsychologist } from '../services/roles.js'
import { t } from '../i18n/index.js'

const routes = [
  { path: '/', name: 'Dashboard', component: () => import('../shared/screens/DashboardComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], title: 'navigation.dashboard' } },
  { path: '/dashboard', redirect: { name: 'Dashboard' } },

  // Autenticación (solo invitados)
  { path: '/login', name: 'Login', component: () => import('../user-management/screens/login.component.vue'), meta: { guestOnly: true, layout: 'bare', title: 'auth.login.title' } },
  { path: '/register', name: 'Register', component: () => import('../user-management/screens/RegisterComponent.vue'), meta: { guestOnly: true, layout: 'bare', title: 'auth.register.title' } },

  // Onboarding (accesible justo después del registro)
  { path: '/onboarding', name: 'OnboardingWelcome', component: () => import('../shared/screens/OnboardingWelcomeComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], layout: 'bare', title: 'onboarding.title' } },
  { path: '/onboarding/step/2', name: 'OnboardingIntervention', component: () => import('../intervention/screens/OnboardingInterventionComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], layout: 'bare', title: 'onboarding.title' } },
  { path: '/onboarding/step/3', name: 'OnboardingProfessional', component: () => import('../professional-connection/screens/OnboardingProfessionalComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], layout: 'bare', title: 'onboarding.title' } },

  // Onboarding del trabajador (perfil opcional + test) y test de autoevaluación
  { path: '/onboarding/profile', name: 'OnboardingProfile', component: () => import('../shared/screens/OnboardingProfileComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], layout: 'bare', title: 'onboardingProfile.title' } },
  { path: '/assessment', name: 'Assessment', component: () => import('../stress/screens/AssessmentComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], title: 'assessment.title' } },

  // Recuperación de contraseña
  { path: '/forgot-password', name: 'ForgotPassword', component: () => import('../user-management/screens/ForgotPasswordComponent.vue'), meta: { guestOnly: true, layout: 'bare', title: 'password.forgot.title' } },
  { path: '/reset-password', name: 'ResetPassword', component: () => import('../user-management/screens/ResetPasswordComponent.vue'), meta: { layout: 'bare', title: 'password.reset.title' } },

  // Profesionales
  { path: '/therapists', name: 'TherapistList', component: () => import('../professional-connection/screens/TherapistListComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], title: 'professionals.directory.title' } },
  { path: '/professionals', redirect: { name: 'TherapistList' } },
  { path: '/therapist/:id', name: 'TherapistDetail', component: () => import('../professional-connection/screens/TherapistDetailComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], title: 'professionals.profile.title' } },
  { path: '/book-appointment/:id', name: 'BookAppointment', component: () => import('../professional-connection/screens/BookAppointmentComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], title: 'professionals.booking.title' } },
  { path: '/book-session', name: 'BookSession', component: () => import('../professional-connection/screens/BookSessionComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], title: 'professionals.bookSession' } },
  { path: '/appointment-confirmation/:appointmentId', name: 'AppointmentConfirmation', component: () => import('../professional-connection/screens/AppointmentConfirmationComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], title: 'appointments.confirmation.title' } },
  { path: '/appointments', name: 'UserAppointments', component: () => import('../professional-connection/screens/UserAppointmentsComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], title: 'appointments.list.title' } },

  // Gestión del estrés
  { path: '/stress/triggers', name: 'RegisterTrigger', component: () => import('../stress/screens/RegisterTriggerComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], title: 'stress.triggers.title' } },
  { path: '/stress/active-breaks', name: 'ActiveBreaks', component: () => import('../stress/screens/ActiveBreaksComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], title: 'stress.activeBreaks.title' } },
  { path: '/stress/breathing', name: 'BreathingSession', component: () => import('../stress/screens/BreathingSessionComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], title: 'stress.breathing.title' } },
  { path: '/stress/resources', name: 'ResourceLibrary', component: () => import('../stress/screens/ResourceLibraryComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], title: 'stress.management.resourceLibrary.title' } },
  { path: '/stress/resources/:id', name: 'ResourceDetail', component: () => import('../stress/screens/ResourceDetailComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], title: 'stress.management.resourceLibrary.title' } },
  { path: '/resources/:id', redirect: (to) => ({ name: 'ResourceDetail', params: { id: to.params.id } }) },

  // Pagos
  { path: '/payment-confirmation/:appointmentId/:paymentId', name: 'PaymentConfirmation', component: () => import('../payments/screens/PaymentConfirmationComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], title: 'payments.receipt.title' } },

  // Cuenta
  { path: '/profile', name: 'UserProfile', component: () => import('../user-management/screens/UserProfileComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], title: 'userProfile.title' } },
  { path: '/settings', name: 'Settings', component: () => import('../shared/screens/SettingsComponent.vue'), meta: { requiresAuth: true, title: 'settings.title' } },
  { path: '/subscriptions', name: 'Subscriptions', component: () => import('../subscriptions/screens/SubscriptionsComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], title: 'navigation.subscriptions' } },
  { path: '/subscriptions/purchase', name: 'Purchase', component: () => import('../subscriptions/screens/PurchaseComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.USER], title: 'subscriptions.purchase.title' } },

  // Portal del psicólogo
  { path: '/pro/status', name: 'ProStatus', component: () => import('../professional-portal/screens/ProStatusComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.PSYCHOLOGIST], title: 'pro.status.title' } },
  { path: '/pro/welcome', name: 'ProWelcome', component: () => import('../professional-portal/screens/ProWelcomeComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.PSYCHOLOGIST], requiresVerified: true, layout: 'bare', title: 'pro.welcome.title' } },
  { path: '/pro', name: 'ProDashboard', component: () => import('../professional-portal/screens/ProDashboardComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.PSYCHOLOGIST], requiresVerified: true, title: 'pro.nav.home' } },
  { path: '/pro/patients', name: 'ProPatients', component: () => import('../professional-portal/screens/ProPatientsComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.PSYCHOLOGIST], requiresVerified: true, title: 'pro.nav.patients' } },
  { path: '/pro/schedule', name: 'ProSchedule', component: () => import('../professional-portal/screens/ProScheduleComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.PSYCHOLOGIST], requiresVerified: true, title: 'pro.nav.schedule' } },
  { path: '/pro/profile', name: 'ProProfile', component: () => import('../professional-portal/screens/ProProfileComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.PSYCHOLOGIST], requiresVerified: true, title: 'pro.nav.profile' } },

  // Administración (validación de psicólogos)
  { path: '/admin/professionals', name: 'AdminProfessionals', component: () => import('../admin/screens/AdminProfessionalsComponent.vue'), meta: { requiresAuth: true, roles: [ROLES.ADMIN], title: 'admin.title' } },
  { path: '/admin', redirect: { name: 'AdminProfessionals' } },

  // 404
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('../shared/screens/NotFoundComponent.vue'), meta: { title: 'notFound.title' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 }
  }
})

router.beforeEach((to) => {
  const authenticated = isAuthenticated()
  if (to.meta.requiresAuth && !authenticated) {
    return { name: 'Login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  }
  if (to.meta.guestOnly && authenticated) {
    return homeRouteFor()
  }
  if (authenticated && to.meta.roles) {
    const user = getCurrentUser()
    // Cada tipo de cuenta solo entra a sus pantallas; si no, va a su página de inicio
    if (!to.meta.roles.includes(getRole(user))) return homeRouteFor(user)
    // El portal del psicólogo exige la colegiatura verificada por un administrador
    if (to.meta.requiresVerified && !isVerifiedPsychologist(user)) return { name: 'ProStatus' }
    if (to.name === 'ProStatus' && isVerifiedPsychologist(user)) return { name: 'ProDashboard' }
  }
  return true
})

router.afterEach((to) => {
  const key = to.meta.title
  const label = key ? t(key) : ''
  document.title = label && label !== key ? `${label} · NeuroZen` : 'NeuroZen - Gestión del Estrés Laboral'
})

export default router
