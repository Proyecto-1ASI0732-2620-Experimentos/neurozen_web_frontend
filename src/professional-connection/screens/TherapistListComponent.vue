<template>
  <div class="nz-page max-w-6xl">
    <PageHeader :title="$t('professionals.directory.title')" :subtitle="$t('professionals.directory.subtitle')">
      <template #actions>
        <router-link to="/book-session" class="nz-btn-primary"><i class="fas fa-calendar-plus" aria-hidden="true"></i>{{ $t('navigation.bookSession') }}</router-link>
      </template>
    </PageHeader>

    <div class="mb-6 grid gap-3 sm:grid-cols-3">
      <label class="sm:col-span-1">
        <span class="sr-only">{{ $t('common.search') }}</span>
        <input v-model="search" type="search" class="nz-input" :placeholder="$t('professionals.directory.searchPlaceholder')" />
      </label>
      <label>
        <span class="sr-only">{{ $t('professionals.directory.specialty') }}</span>
        <select v-model="selectedSpecialty" class="nz-input">
          <option value="">{{ $t('professionals.directory.allSpecialties') }}</option>
          <option v-for="s in specialties" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
      <label>
        <span class="sr-only">{{ $t('professionals.directory.availability') }}</span>
        <select v-model="selectedAvailability" class="nz-input">
          <option value="">{{ $t('professionals.directory.allAvailability') }}</option>
          <option value="weekdays">{{ $t('professionals.directory.weekdays') }}</option>
          <option value="weekends">{{ $t('professionals.directory.weekends') }}</option>
          <option value="evenings">{{ $t('professionals.directory.evenings') }}</option>
        </select>
      </label>
    </div>

    <LoadingState v-if="isLoading" />
    <ErrorState v-else-if="errorMessage" :message="errorMessage" @retry="loadTherapists" />
    <EmptyState v-else-if="!filtered.length" icon="fas fa-user-doctor" :title="$t('professionals.directory.empty')" :message="$t('professionals.directory.emptyHint')" />

    <ul v-else class="grid gap-5 md:grid-cols-2">
      <li v-for="therapist in filtered" :key="therapist.id" class="nz-card flex flex-col gap-4 p-5 sm:flex-row">
        <img data-fallback="/images-of-professionals/usuariodemo.jpg" :src="therapist.image" :alt="therapist.name" class="h-24 w-24 shrink-0 rounded-xl object-cover" loading="lazy" />
        <div class="flex min-w-0 flex-1 flex-col">
          <router-link :to="{ name: 'TherapistDetail', params: { id: therapist.id } }" class="text-lg font-bold text-foreground-light hover:text-primary">{{ therapist.name }}</router-link>
          <p class="text-sm font-semibold text-primary">{{ therapist.specialty }}</p>
          <StarRating class="mt-1" :value="therapist.rating" :count="therapist.reviews" />
          <p v-if="therapist.availability" class="mt-2 text-sm text-muted-light"><i class="far fa-clock mr-1" aria-hidden="true"></i>{{ therapist.availability }}</p>
          <div class="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
            <p class="text-sm"><span class="text-xl font-extrabold text-foreground-light">${{ therapist.price }}</span> <span class="text-muted-light">/ {{ $t('professionals.perSession') }}</span></p>
            <div class="flex gap-2">
              <router-link :to="{ name: 'TherapistDetail', params: { id: therapist.id } }" class="nz-btn-secondary px-3 py-2">{{ $t('professionals.viewProfile') }}</router-link>
              <router-link :to="{ name: 'BookAppointment', params: { id: therapist.id } }" class="nz-btn-primary px-3 py-2">{{ $t('professionals.book') }}</router-link>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
/**
 * TherapistListComponent - Directorio de profesionales.
 * Ahora accesible desde el menú, traducido, con búsqueda y filtro de
 * disponibilidad funcional (antes no filtraba nada).
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import StarRating from '../../components/StarRating.vue'
import { TherapistService } from '../../services/TherapistService.js'

/** Interpreta textos como "Lunes a Viernes, 9 AM - 6 PM" o "Sáb 10:00-14:00" */
function matchesAvailability(text = '', filter) {
  const t = text.toLowerCase()
  if (filter === 'weekends') return /(s[áa]b|dom|sat|sun|fin de semana|weekend)/.test(t)
  if (filter === 'weekdays') return /(lun|mar|mi[ée]|jue|vie|mon|tue|wed|thu|fri|semana|weekday)/.test(t)
  if (filter === 'evenings') {
    const pm = [...t.matchAll(/(\d{1,2})(?::\d{2})?\s*(pm)/g)].map((m) => Number(m[1]) + (m[1] === '12' ? 0 : 12))
    const h24 = [...t.matchAll(/\b(\d{1,2}):\d{2}\b/g)].map((m) => Number(m[1]))
    return [...pm, ...h24].some((h) => h >= 18) || /(noche|tarde|evening)/.test(t)
  }
  return true
}

export default {
  name: 'TherapistListComponent',
  components: { PageHeader, LoadingState, ErrorState, EmptyState, StarRating },
  data() {
    return { therapists: [], isLoading: true, errorMessage: '', search: '', selectedSpecialty: '', selectedAvailability: '', service: new TherapistService() }
  },
  computed: {
    specialties() {
      return [...new Set(this.therapists.map((t) => t.specialty).filter(Boolean))].sort()
    },
    filtered() {
      const q = this.search.toLowerCase().trim()
      return this.therapists.filter((t) =>
        (!q || `${t.name} ${t.specialty}`.toLowerCase().includes(q)) &&
        (!this.selectedSpecialty || t.specialty === this.selectedSpecialty) &&
        (!this.selectedAvailability || matchesAvailability(t.availability, this.selectedAvailability))
      )
    }
  },
  created() {
    this.loadTherapists()
  },
  methods: {
    async loadTherapists() {
      this.isLoading = true
      this.errorMessage = ''
      try {
        this.therapists = await this.service.getTherapists()
      } catch (error) {
        this.errorMessage = error.message
      } finally {
        this.isLoading = false
      }
    }
  }
}
</script>
