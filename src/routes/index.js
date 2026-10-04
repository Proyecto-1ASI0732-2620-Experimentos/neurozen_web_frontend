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
import { isAuthenticated } from '../services/session.js'
import { t } from '../i18n/index.js'

const routes = [
  { path: '/', name: 'Dashboard', component: () => import('../shared/screens/DashboardComponent.vue'), meta: { requiresAuth: true, title: 'navigation.dashboard' } },
  { path: '/dashboard', redirect: { name: 'Dashboard' } },

  // Autenticación (solo invitados)
  { path: '/login', name: 'Login', component: () => import('../user-management/screens/login.component.vue'), meta: { guestOnly: true, layout: 'bare', title: 'auth.login.title' } },
  { path: '/register', name: 'Register', component: () => import('../user-management/screens/RegisterComponent.vue'), meta: { guestOnly: true, layout: 'bare', title: 'auth.register.title' } },

  // Onboarding (accesible justo después del registro)
  { path: '/onboarding', name: 'OnboardingWelcome', component: () => import('../shared/screens/OnboardingWelcomeComponent.vue'), meta: { layout: 'bare', title: 'onboarding.title' } },
  { path: '/onboarding/step/2', name: 'OnboardingIntervention', component: () => import('../intervention/screens/OnboardingInterventionComponent.vue'), meta: { layout: 'bare', title: 'onboarding.title' } },
  { path: '/onboarding/step/3', name: 'OnboardingProfessional', component: () => import('../professional-connection/screens/OnboardingProfessionalComponent.vue'), meta: { layout: 'bare', title: 'onboarding.title' } },

  // Profesionales
  { path: '/therapists', name: 'TherapistList', component: () => import('../professional-connection/screens/TherapistListComponent.vue'), meta: { requiresAuth: true, title: 'professionals.directory.title' } },
  { path: '/professionals', redirect: { name: 'TherapistList' } },
  { path: '/therapist/:id', name: 'TherapistDetail', component: () => import('../professional-connection/screens/TherapistDetailComponent.vue'), meta: { requiresAuth: true, title: 'professionals.profile.title' } },
  { path: '/book-appointment/:id', name: 'BookAppointment', component: () => import('../professional-connection/screens/BookAppointmentComponent.vue'), meta: { requiresAuth: true, title: 'professionals.booking.title' } },
  { path: '/book-session', name: 'BookSession', component: () => import('../professional-connection/screens/BookSessionComponent.vue'), meta: { requiresAuth: true, title: 'professionals.bookSession' } },
  { path: '/appointment-confirmation/:appointmentId', name: 'AppointmentConfirmation', component: () => import('../professional-connection/screens/AppointmentConfirmationComponent.vue'), meta: { requiresAuth: true, title: 'appointments.confirmation.title' } },
  { path: '/appointments', name: 'UserAppointments', component: () => import('../professional-connection/screens/UserAppointmentsComponent.vue'), meta: { requiresAuth: true, title: 'appointments.list.title' } },

  // Gestión del estrés
  { path: '/stress/triggers', name: 'RegisterTrigger', component: () => import('../stress/screens/RegisterTriggerComponent.vue'), meta: { requiresAuth: true, title: 'stress.triggers.title' } },
  { path: '/stress/active-breaks', name: 'ActiveBreaks', component: () => import('../stress/screens/ActiveBreaksComponent.vue'), meta: { requiresAuth: true, title: 'stress.activeBreaks.title' } },
  { path: '/stress/breathing', name: 'BreathingSession', component: () => import('../stress/screens/BreathingSessionComponent.vue'), meta: { requiresAuth: true, title: 'stress.breathing.title' } },
  { path: '/stress/resources', name: 'ResourceLibrary', component: () => import('../stress/screens/ResourceLibraryComponent.vue'), meta: { requiresAuth: true, title: 'stress.management.resourceLibrary.title' } },
  { path: '/stress/resources/:id', name: 'ResourceDetail', component: () => import('../stress/screens/ResourceDetailComponent.vue'), meta: { requiresAuth: true, title: 'stress.management.resourceLibrary.title' } },
  { path: '/resources/:id', redirect: (to) => ({ name: 'ResourceDetail', params: { id: to.params.id } }) },

  // Pagos
  { path: '/payment-confirmation/:appointmentId/:paymentId', name: 'PaymentConfirmation', component: () => import('../payments/screens/PaymentConfirmationComponent.vue'), meta: { requiresAuth: true, title: 'payments.receipt.title' } },

  // Cuenta
  { path: '/profile', name: 'UserProfile', component: () => import('../user-management/screens/UserProfileComponent.vue'), meta: { requiresAuth: true, title: 'userProfile.title' } },
  { path: '/settings', name: 'Settings', component: () => import('../shared/screens/SettingsComponent.vue'), meta: { requiresAuth: true, title: 'settings.title' } },
  { path: '/subscriptions', name: 'Subscriptions', component: () => import('../subscriptions/screens/SubscriptionsComponent.vue'), meta: { requiresAuth: true, title: 'navigation.subscriptions' } },
  { path: '/subscriptions/purchase', name: 'Purchase', component: () => import('../subscriptions/screens/PurchaseComponent.vue'), meta: { requiresAuth: true, title: 'subscriptions.purchase.title' } },

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
    return { name: 'Dashboard' }
  }
  return true
})

router.afterEach((to) => {
  const key = to.meta.title
  const label = key ? t(key) : ''
  document.title = label && label !== key ? `${label} · NeuroZen` : 'NeuroZen - Gestión del Estrés Laboral'
})

export default router
