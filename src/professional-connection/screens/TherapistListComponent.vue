<template>
  <div class="nz-page max-w-6xl">
    <PageHeader :title="$t('professionals.directory.title')" :subtitle="$t('professionals.directory.subtitle')">
      <template #actions>
        <router-link to="/book-session" class="nz-btn-primary"><i class="fas fa-calendar-plus" aria-hidden="true"></i>{{ $t('navigation.bookSession') }}</router-link>
      </template>
    </PageHeader>

    <form class="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]" role="search" :aria-label="$t('professionals.directory.filters')" @submit.prevent>
      <label>
        <span class="nz-label">{{ $t('common.search') }}</span>
        <input v-model="search" type="search" class="nz-input" :placeholder="$t('professionals.directory.searchPlaceholder')" />
      </label>
      <label>
        <span class="nz-label">{{ $t('professionals.directory.specialty') }}</span>
        <select v-model="selectedSpecialty" class="nz-input">
          <option value="">{{ $t('professionals.directory.allSpecialties') }}</option>
          <option v-for="s in specialties" :key="s" :value="s">{{ specialty(s) }}</option>
        </select>
      </label>
      <label>
        <span class="nz-label">{{ $t('professionals.directory.availability') }}</span>
        <select v-model="selectedAvailability" class="nz-input">
          <option value="">{{ $t('professionals.directory.allAvailability') }}</option>
          <option value="weekdays">{{ $t('professionals.directory.weekdays') }}</option>
          <option value="weekends">{{ $t('professionals.directory.weekends') }}</option>
          <option value="evenings">{{ $t('professionals.directory.evenings') }}</option>
        </select>
      </label>
      <!-- M1: rango de tarifa -->
      <fieldset class="min-w-0">
        <legend class="nz-label">{{ $t('professionals.directory.feeRange') }}</legend>
        <div class="flex items-center gap-2">
          <label class="min-w-0 flex-1">
            <span class="sr-only">{{ $t('professionals.directory.feeMin') }}</span>
            <input v-model="feeMin" type="number" inputmode="decimal" min="0" step="1" class="nz-input" :class="{ 'nz-input-error': feeRangeInvalid }" :placeholder="$t('professionals.directory.feeMinShort')" :aria-invalid="feeRangeInvalid" aria-describedby="fee-msg" />
          </label>
          <span class="text-muted-light" aria-hidden="true">–</span>
          <label class="min-w-0 flex-1">
            <span class="sr-only">{{ $t('professionals.directory.feeMax') }}</span>
            <input v-model="feeMax" type="number" inputmode="decimal" min="0" step="1" class="nz-input" :class="{ 'nz-input-error': feeRangeInvalid }" :placeholder="$t('professionals.directory.feeMaxShort')" :aria-invalid="feeRangeInvalid" aria-describedby="fee-msg" />
          </label>
        </div>
        <p v-if="feeRangeInvalid" id="fee-msg" class="nz-field-error">{{ $t('professionals.directory.feeRangeError') }}</p>
        <p v-else id="fee-msg" class="nz-hint">{{ $t('professionals.directory.feeHint') }}</p>
      </fieldset>
    </form>
    <div v-if="hasFilters" class="-mt-3 mb-5 flex flex-wrap items-center justify-between gap-2 text-sm" aria-live="polite">
      <span class="text-muted-light">{{ $tc('professionals.directory.resultsCount', filtered.length, { count: filtered.length }) }}</span>
      <button type="button" class="font-semibold text-primary hover:underline" @click="clearFilters">{{ $t('professionals.directory.clearFilters') }}</button>
    </div>

    <LoadingState v-if="isLoading" />
    <ErrorState v-else-if="errorMessage" :message="errorMessage" @retry="loadTherapists" />
    <EmptyState v-else-if="!filtered.length" icon="fas fa-user-doctor" :title="$t('professionals.directory.empty')" :message="$t('professionals.directory.emptyHint')" />

    <ul v-else class="grid gap-5 md:grid-cols-2">
      <li v-for="therapist in filtered" :key="therapist.id" class="nz-card flex flex-col gap-4 p-5 sm:flex-row">
        <img data-fallback="/images-of-professionals/usuariodemo.jpg" :src="therapist.image" :alt="therapist.name" class="h-24 w-24 shrink-0 rounded-xl object-cover" loading="lazy" />
        <div class="flex min-w-0 flex-1 flex-col">
          <router-link :to="{ name: 'TherapistDetail', params: { id: therapist.id } }" class="text-lg font-bold text-foreground-light hover:text-primary">{{ therapist.name }}</router-link>
          <p class="text-sm font-semibold text-primary">{{ specialty(therapist.specialty) }}</p>
          <p v-if="therapist.experienceYears" class="text-sm text-muted-light">{{ $tc('professionals.experienceYears', therapist.experienceYears, { count: therapist.experienceYears }) }}</p>
          <StarRating class="mt-1" :value="therapist.rating" :count="therapist.reviews" />
          <p v-if="availabilityOf(therapist)" class="mt-2 text-sm text-muted-light"><i class="far fa-clock mr-1" aria-hidden="true"></i>{{ availabilityOf(therapist) }}</p>
          <div class="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
            <p v-if="fee(therapist.price)" class="text-sm"><span class="text-xl font-extrabold text-foreground-light">{{ fee(therapist.price) }}</span> <span class="text-muted-light">/ {{ $t('professionals.perSession') }}</span></p>
            <p v-else class="text-sm font-semibold text-muted-light">{{ $t('professionals.feeToBeDefined') }}</p>
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
 * Búsqueda, especialidad (traducida), disponibilidad y rango de tarifa (M1).
 * M2: solo datos reales; sin tarifa → «Tarifa por definir»; sin reseñas → «Sin valoraciones aún».
 */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import StarRating from '../../components/StarRating.vue'
import { TherapistService } from '../../services/TherapistService.js'
import { availabilityText } from '../../services/ProfessionalService.js'
import { formatFee, specialtyLabel, matchesFeeRange } from '../../utils/professionalFormat.js'

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
    return { therapists: [], isLoading: true, errorMessage: '', search: '', selectedSpecialty: '', selectedAvailability: '', feeMin: '', feeMax: '', service: new TherapistService() }
  },
  computed: {
    specialties() {
      return [...new Set(this.therapists.map((t) => t.specialty).filter(Boolean))].sort((a, b) => this.specialty(a).localeCompare(this.specialty(b)))
    },
    feeRangeInvalid() {
      return this.feeMin !== '' && this.feeMax !== '' && Number(this.feeMin) > Number(this.feeMax)
    },
    hasFilters() {
      return !!(this.search.trim() || this.selectedSpecialty || this.selectedAvailability || this.feeMin !== '' || this.feeMax !== '')
    },
    filtered() {
      const q = this.search.toLowerCase().trim()
      return this.therapists.filter((t) =>
        (!q || `${t.name} ${t.specialty} ${this.specialty(t.specialty)}`.toLowerCase().includes(q)) &&
        (!this.selectedSpecialty || t.specialty === this.selectedSpecialty) &&
        (!this.selectedAvailability || matchesAvailability(this.availabilityOf(t, 'es') + ' ' + (t.availability || ''), this.selectedAvailability)) &&
        (this.feeRangeInvalid || matchesFeeRange(t.price, this.feeMin, this.feeMax))
      )
    }
  },
  created() {
    this.loadTherapists()
  },
  methods: {
    fee(price) {
      return formatFee(price, this.$i18n.locale)
    },
    specialty(value) {
      return specialtyLabel((k) => this.$t(k), value)
    },
    /** Horario publicado (traducido) o, si no hay, el texto libre que envíe el backend */
    availabilityOf(t, locale = this.$i18n.locale) {
      return t.availabilitySchedule?.days?.length ? availabilityText(t.availabilitySchedule, locale) : (t.availability || '')
    },
    clearFilters() {
      this.search = ''
      this.selectedSpecialty = ''
      this.selectedAvailability = ''
      this.feeMin = ''
      this.feeMax = ''
    },
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
