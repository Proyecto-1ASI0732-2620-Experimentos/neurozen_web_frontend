<template>
  <header ref="root" class="sticky top-0 z-40 border-b border-[#E3DED2] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
    <div class="mx-auto flex h-[var(--header-height)] max-w-7xl items-center gap-3 px-4 sm:px-6">
      <!-- Menú móvil -->
      <button
        type="button"
        class="inline-flex h-10 w-10 items-center justify-center rounded-lg text-primary hover:bg-primary/10 lg:hidden"
        :aria-label="$t('header.openMenu')"
        :aria-expanded="mobileOpen"
        aria-controls="nz-mobile-nav"
        @click="toggleMobile"
      >
        <i :class="mobileOpen ? 'fas fa-xmark' : 'fas fa-bars'" class="text-lg" aria-hidden="true"></i>
      </button>

      <!-- Marca -->
      <router-link :to="homeRoute" class="flex shrink-0 items-center gap-2.5" :aria-label="$t('header.goHome')">
        <img src="/neurozen1_logo.png" alt="" class="h-9 w-9 rounded-lg object-contain" width="36" height="36" />
        <span class="text-lg font-extrabold tracking-tight text-primary">{{ $t('app.name') }}</span>
      </router-link>

      <!-- Navegación escritorio -->
      <nav v-if="role !== 'user' && roleLinks.length" class="ml-6 hidden items-center gap-1 lg:flex" :aria-label="$t('header.mainNav')">
        <router-link v-for="link in roleLinks" :key="link.name" :to="{ name: link.name }" class="nav-link" :class="{ 'nav-link-active': $route.name === link.name }">
          <i :class="link.icon" aria-hidden="true"></i>{{ $t(link.label) }}
        </router-link>
      </nav>
      <span v-if="role === 'admin' || role === 'psychologist'" class="hidden rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary sm:inline">{{ $t(`header.roles.${role}`) }}</span>

      <nav v-if="role === 'user'" class="ml-6 hidden items-center gap-1 lg:flex" :aria-label="$t('header.mainNav')">
        <router-link :to="{ name: 'Dashboard' }" class="nav-link" :class="{ 'nav-link-active': $route.name === 'Dashboard' }">
          <i class="fas fa-house" aria-hidden="true"></i>{{ $t('navigation.dashboard') }}
        </router-link>

        <div v-for="group in groups" :key="group.id" class="relative">
          <button
            type="button"
            class="nav-link"
            :class="{ 'nav-link-active': isGroupActive(group) }"
            aria-haspopup="menu"
            :aria-expanded="openMenu === group.id"
            @click="toggleMenu(group.id)"
          >
            <i :class="group.icon" aria-hidden="true"></i>{{ $t(group.label) }}
            <i class="fas fa-chevron-down text-[10px] transition-transform" :class="{ 'rotate-180': openMenu === group.id }" aria-hidden="true"></i>
          </button>
          <div v-show="openMenu === group.id" class="dropdown left-0 w-64" role="menu">
            <router-link v-for="item in group.items" :key="item.to" :to="item.to" class="dropdown-item" role="menuitem">
              <i :class="[item.icon, 'w-4 text-center text-primary']" aria-hidden="true"></i>{{ $t(item.label) }}
            </router-link>
          </div>
        </div>

        <router-link :to="{ name: 'Subscriptions' }" class="nav-link" :class="{ 'nav-link-active': $route.path.startsWith('/subscriptions') }">
          <i class="fas fa-credit-card" aria-hidden="true"></i>{{ $t('navigation.subscriptions') }}
        </router-link>
      </nav>

      <!-- Acciones -->
      <div class="ml-auto flex items-center gap-1 sm:gap-2">
        <LanguageSelectorComponent @opened="openMenu = null" />

        <template v-if="authenticated">
          <div class="relative">
            <button
              type="button"
              class="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-primary hover:bg-primary/10"
              :aria-label="$t('header.notifications')"
              :aria-expanded="openMenu === 'notifications'"
              @click="toggleMenu('notifications')"
            >
              <i class="fas fa-bell" aria-hidden="true"></i>
              <span v-if="notifications.length" class="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-700 px-1 text-[10px] font-bold text-white">
                {{ notifications.length }}
              </span>
            </button>
            <div v-show="openMenu === 'notifications'" class="dropdown right-0 w-[min(22rem,calc(100vw-2rem))] p-0">
              <p class="border-b border-[#E3DED2] px-4 py-3 text-sm font-bold">{{ $t('header.notifications') }}</p>
              <ul v-if="notifications.length" class="max-h-80 divide-y divide-[#EEE9DD] overflow-auto">
                <li v-for="n in notifications" :key="n.id">
                  <router-link :to="n.to" class="flex gap-3 px-4 py-3 hover:bg-primary/5">
                    <i :class="[n.icon, 'mt-1 text-primary']" aria-hidden="true"></i>
                    <span class="text-sm">
                      <span class="block font-semibold">{{ n.title }}</span>
                      <span class="block text-muted-light">{{ n.message }}</span>
                    </span>
                  </router-link>
                </li>
              </ul>
              <p v-else class="px-4 py-6 text-center text-sm text-muted-light">
                <i class="fas fa-bell-slash mb-2 block text-lg" aria-hidden="true"></i>{{ $t('header.noNotifications') }}
              </p>
            </div>
          </div>

          <div class="relative">
            <button
              type="button"
              class="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-primary/10"
              :aria-label="$t('header.userMenu')"
              :aria-expanded="openMenu === 'user'"
              @click="toggleMenu('user')"
            >
              <UserAvatar :src="userAvatar" :name="userName" size="sm" class="ring-2 ring-primary/15" />
              <span class="hidden max-w-[10rem] truncate text-sm font-semibold sm:block">{{ userName }}</span>
              <i class="fas fa-chevron-down hidden text-[10px] sm:block" aria-hidden="true"></i>
            </button>
            <div v-show="openMenu === 'user'" class="dropdown right-0 w-56" role="menu">
              <p class="truncate border-b border-[#E3DED2] px-4 pb-2 pt-1 text-xs text-muted-light">{{ userEmail }}</p>
              <router-link v-for="item in roleAccountItems" :key="item.to" :to="item.to" class="dropdown-item" role="menuitem">
                <i :class="[item.icon, 'w-4 text-center text-primary']" aria-hidden="true"></i>{{ $t(item.label) }}
              </router-link>
              <button type="button" class="dropdown-item w-full text-red-700" role="menuitem" @click="logout">
                <i class="fas fa-right-from-bracket w-4 text-center" aria-hidden="true"></i>{{ $t('header.logout') }}
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <router-link :to="{ name: 'Login' }" class="nz-btn-ghost hidden sm:inline-flex">{{ $t('navigation.login') }}</router-link>
          <router-link :to="{ name: 'Register' }" class="nz-btn-primary">{{ $t('navigation.register') }}</router-link>
        </template>
      </div>
    </div>

    <!-- Navegación móvil -->
    <nav
      v-show="mobileOpen"
      id="nz-mobile-nav"
      class="max-h-[calc(100vh-var(--header-height))] overflow-y-auto border-t border-[#E3DED2] bg-white px-4 pb-6 pt-2 lg:hidden"
      :aria-label="$t('header.mainNav')"
    >
      <template v-if="role !== 'user'">
        <router-link v-for="link in roleLinks" :key="link.name" :to="{ name: link.name }" class="mobile-link">
          <i :class="link.icon" aria-hidden="true"></i>{{ $t(link.label) }}
        </router-link>
      </template>
      <router-link v-if="role === 'user'" :to="{ name: 'Dashboard' }" class="mobile-link"><i class="fas fa-house" aria-hidden="true"></i>{{ $t('navigation.dashboard') }}</router-link>
      <template v-for="group in (role === 'user' ? groups : [])" :key="group.id">
        <p class="mt-4 px-3 text-xs font-bold text-muted-light">{{ $t(group.label) }}</p>
        <router-link v-for="item in group.items" :key="item.to" :to="item.to" class="mobile-link">
          <i :class="item.icon" aria-hidden="true"></i>{{ $t(item.label) }}
        </router-link>
      </template>
      <p class="mt-4 px-3 text-xs font-bold text-muted-light">{{ $t('header.account') }}</p>
      <router-link v-if="role === 'user'" :to="{ name: 'Subscriptions' }" class="mobile-link"><i class="fas fa-credit-card" aria-hidden="true"></i>{{ $t('navigation.subscriptions') }}</router-link>
      <router-link v-for="item in roleAccountItems" :key="item.to" :to="item.to" class="mobile-link">
        <i :class="item.icon" aria-hidden="true"></i>{{ $t(item.label) }}
      </router-link>
      <button v-if="authenticated" type="button" class="mobile-link w-full text-red-700" @click="logout">
        <i class="fas fa-right-from-bracket" aria-hidden="true"></i>{{ $t('header.logout') }}
      </button>
    </nav>
  </header>
</template>

<script>
/**
 * HeaderComponent - Navegación principal, notificaciones y menú de usuario.
 *
 * Corrige: estado de sesión no reactivo, logout incompleto, listeners de document
 * sin eliminar, menús que no se cerraban al navegar, enlace activo de Dashboard
 * que nunca se marcaba, navegación inexistente en móvil y notificaciones fijas.
 */
import LanguageSelectorComponent from './LanguageSelectorComponent.vue'
import UserAvatar from '../ui/UserAvatar.vue'
import { session, isAuthenticated, getDisplayName, clearSession, getUserId } from '../../services/session.js'
import { AppointmentService } from '../../services/AppointmentService.js'
import { ActiveBreaksService } from '../../services/ActiveBreaksService.js'
import { formatShortDate, formatClock } from '../../utils/date.js'
import { ROLES, getRole, homeRouteFor, isVerifiedPsychologist } from '../../services/roles.js'
import { ProfessionalService, appointmentState } from '../../services/ProfessionalService.js'
import { AdminService } from '../../services/AdminService.js'
import { ReportService } from '../../services/ReportService.js'

export default {
  name: 'HeaderComponent',
  components: { LanguageSelectorComponent, UserAvatar },
  data() {
    return {
      openMenu: null,
      mobileOpen: false,
      notifications: [],
      groups: [
        {
          id: 'stress',
          label: 'navigation.stress',
          icon: 'fas fa-brain',
          prefix: '/stress',
          items: [
            { to: '/stress/triggers', icon: 'fas fa-triangle-exclamation', label: 'stress.management.triggers' },
            { to: '/stress/active-breaks', icon: 'fas fa-person-walking', label: 'stress.management.activeBreaks' },
            { to: '/stress/breathing', icon: 'fas fa-wind', label: 'stress.management.breathing' },
            { to: '/stress/resources', icon: 'fas fa-book-open', label: 'stress.management.resources' }
          ]
        },
        {
          id: 'professionals',
          label: 'navigation.professionals',
          icon: 'fas fa-user-doctor',
          paths: ['/book-session', '/therapists', '/therapist', '/book-appointment', '/appointment', '/appointments', '/payment-confirmation'],
          items: [
            { to: '/book-session', icon: 'fas fa-calendar-plus', label: 'navigation.bookSession' },
            { to: '/therapists', icon: 'fas fa-address-book', label: 'navigation.directory' },
            { to: '/appointments', icon: 'fas fa-calendar-check', label: 'navigation.myAppointments' }
          ]
        }
      ],
      accountItems: [
        { to: '/profile', icon: 'fas fa-user', label: 'header.profile' },
        { to: '/settings', icon: 'fas fa-gear', label: 'header.settings' }
      ]
    }
  },
  computed: {
    role() {
      return session.user ? getRole(session.user) : 'user'
    },
    homeRoute() {
      return session.user ? homeRouteFor(session.user) : { name: 'Login' }
    },
    /** Navegación del psicólogo (igual que la app móvil) y del administrador */
    roleLinks() {
      if (this.role === ROLES.ADMIN) return [{ name: 'AdminProfessionals', icon: 'fas fa-user-check', label: 'admin.nav' }]
      if (this.role === ROLES.PSYCHOLOGIST && isVerifiedPsychologist(session.user)) {
        return [
          { name: 'ProDashboard', icon: 'fas fa-house', label: 'pro.nav.home' },
          { name: 'ProPatients', icon: 'fas fa-user-group', label: 'pro.nav.patients' },
          { name: 'ProSchedule', icon: 'fas fa-calendar-days', label: 'pro.nav.schedule' },
          { name: 'ProProfile', icon: 'fas fa-id-card', label: 'pro.nav.profile' }
        ]
      }
      if (this.role === ROLES.PSYCHOLOGIST) return [{ name: 'ProStatus', icon: 'fas fa-hourglass-half', label: 'pro.status.title' }]
      return []
    },
    roleAccountItems() {
      if (this.role === ROLES.USER) return this.accountItems
      // El perfil del psicólogo ya está en su navegación principal
      return [{ to: '/settings', icon: 'fas fa-gear', label: 'header.settings' }]
    },
    authenticated() {
      return !!session.token && isAuthenticated()
    },
    userName() {
      return getDisplayName(session.user) || this.$t('header.defaultUser')
    },
    userEmail() {
      return session.user?.email || ''
    },
    userAvatar() {
      return session.user?.avatar || ''
    }
  },
  watch: {
    $route() {
      this.openMenu = null
      this.mobileOpen = false
    },
    '$i18n.locale'() {
      this.loadNotifications()
    },
    authenticated: {
      immediate: true,
      handler(value) {
        if (value) this.loadNotifications()
        else this.notifications = []
      }
    }
  },
  mounted() {
    document.addEventListener('click', this.onDocumentClick)
    document.addEventListener('keydown', this.onKeydown)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onDocumentClick)
    document.removeEventListener('keydown', this.onKeydown)
  },
  methods: {
    isGroupActive(group) {
      const path = this.$route.path
      if (group.prefix) return path.startsWith(group.prefix)
      return group.paths.some((p) => path === p || path.startsWith(`${p}/`))
    },
    toggleMenu(id) {
      this.openMenu = this.openMenu === id ? null : id
    },
    toggleMobile() {
      this.mobileOpen = !this.mobileOpen
    },
    onDocumentClick(e) {
      if (this.$refs.root && !this.$refs.root.contains(e.target)) this.openMenu = null
    },
    onKeydown(e) {
      if (e.key === 'Escape') {
        this.openMenu = null
        this.mobileOpen = false
      }
    },
    /** Notificaciones reales: próxima cita y próxima pausa activa de hoy */
    async loadNotifications() {
      if (this.role === ROLES.PSYCHOLOGIST) return this.loadProNotifications()
      if (this.role === ROLES.ADMIN) return this.loadAdminNotifications()
      const items = []
      const locale = this.$i18n.locale
      const breaks = new ActiveBreaksService()
      const next = breaks.getSchedule(breaks.getConfiguration()).find((b) => b.isNext)
      if (next) {
        items.push({ id: 'break', icon: 'fas fa-person-walking', to: '/stress/active-breaks', title: this.$t('header.nextBreak'), message: formatClock(next.time, locale) })
      }
      const userId = getUserId()
      if (userId != null) {
        try {
          const list = await new AppointmentService().getAppointments(userId)
          const upcoming = list.find((a) => a.dateTime && a.dateTime > new Date() && a.status !== 'cancelled')
          if (upcoming) {
            items.unshift({
              id: 'appointment',
              icon: 'fas fa-calendar-check',
              to: '/appointments',
              title: this.$t('header.nextAppointment'),
              message: `${formatShortDate(upcoming.dateTime, locale)} · ${formatClock(upcoming.time, locale)}`
            })
          }
        } catch {
          /* sin backend: solo notificaciones locales */
        }
      }
      this.notifications = items
    },
    /** Psicólogo: citas pendientes de confirmar y la próxima cita confirmada */
    async loadProNotifications() {
      const items = []
      const professionalId = session.user?.professionalId
      if (isVerifiedPsychologist(session.user) && professionalId != null) {
        try {
          const now = new Date()
          const list = (await new ProfessionalService().getMyAppointments(professionalId)).map((a) => ({ ...a, state: appointmentState(a) }))
          const toConfirm = list.filter((a) => a.state === 'pending' && a.dateTime && a.dateTime >= now)
          if (toConfirm.length) {
            items.push({ id: 'to-confirm', icon: 'fas fa-hourglass-half', to: '/pro/schedule', title: this.$t('pro.notifications.toConfirm', { count: toConfirm.length }), message: this.$t('pro.notifications.toConfirmHint') })
          }
          const reports = await new ReportService().getReceived(professionalId).catch(() => [])
          const recent = reports.filter((r) => r.createdAt && new Date(r.createdAt) >= new Date(Date.now() - 7 * 86400000))
          if (recent.length) {
            items.push({ id: 'reports', icon: 'fas fa-file-medical', to: '/pro/patients', title: this.$t('reports.notification', { count: recent.length }), message: this.$t('reports.notificationHint') })
          }
          const next = list.find((a) => a.state === 'confirmed' && a.dateTime && a.dateTime >= now)
          if (next) {
            items.push({ id: 'next', icon: 'fas fa-calendar-check', to: '/pro/schedule', title: this.$t('header.nextAppointment'), message: `${formatShortDate(next.dateTime, this.$i18n.locale)} · ${formatClock(next.time, this.$i18n.locale)}` })
          }
        } catch {
          /* sin backend: sin notificaciones */
        }
      }
      this.notifications = items
    },
    /** Administrador: solicitudes de psicólogos pendientes de verificar */
    async loadAdminNotifications() {
      try {
        const pending = await new AdminService().getProfessionals('pending')
        this.notifications = pending.length
          ? [{ id: 'pending-pros', icon: 'fas fa-user-clock', to: '/admin/professionals', title: this.$t('admin.notifications.pending', { count: pending.length }), message: this.$t('admin.notifications.pendingHint') }]
          : []
      } catch {
        this.notifications = []
      }
    },
    logout() {
      clearSession()
      this.openMenu = null
      this.$router.push({ name: 'Login' })
    }
  }
}
</script>

<style scoped>
.nav-link {
  @apply inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-foreground-light transition-colors hover:bg-primary/10 hover:text-primary;
}
.nav-link-active { @apply bg-primary/10 text-primary; }
.dropdown { @apply absolute top-12 z-50 overflow-hidden rounded-xl border border-[#E3DED2] bg-white py-1.5 shadow-lg; }
.dropdown-item { @apply flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground-light hover:bg-primary/5; }
.dropdown-item.router-link-exact-active { @apply bg-primary/10 text-primary; }
.mobile-link { @apply flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-foreground-light hover:bg-primary/5; }
.mobile-link i { @apply w-5 text-center text-primary; }
.mobile-link.router-link-exact-active { @apply bg-primary/10 text-primary; }
</style>
