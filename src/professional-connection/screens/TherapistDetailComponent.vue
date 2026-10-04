<template>
  <div class="nz-page">
    <PageHeader :title="therapist ? therapist.name : $t('professionals.profile.title')" back="/therapists" />
    <LoadingState v-if="isLoading" />
    <ErrorState v-else-if="errorMessage" :message="errorMessage" @retry="loadTherapistData" />

    <div v-else-if="therapist" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div class="space-y-6">
        <section class="nz-card flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:text-left">
          <img data-fallback="/images-of-professionals/usuariodemo.jpg" :src="therapist.image" :alt="therapist.name" class="h-32 w-32 rounded-full object-cover ring-4 ring-primary/10" />
          <div>
            <p class="text-lg font-semibold text-primary">{{ therapist.specialty }}</p>
            <p v-if="therapist.experience" class="text-muted-light">{{ therapist.experience }}</p>
            <StarRating class="mt-2" :value="therapist.rating" :count="therapist.reviews" />
          </div>
        </section>

        <section v-if="therapist.bio">
          <h2 class="mb-2 text-lg font-bold text-foreground-light">{{ $t('professionals.profile.biography') }}</h2>
          <p class="leading-relaxed text-foreground-light">{{ therapist.bio }}</p>
        </section>

        <section aria-labelledby="reviews-title">
          <h2 id="reviews-title" class="mb-3 text-lg font-bold text-foreground-light">{{ $t('professionals.profile.reviews') }}</h2>
          <EmptyState v-if="!reviews.length" icon="far fa-comment" :title="$t('professionals.profile.noReviews')" />
          <ul v-else class="space-y-3">
            <li v-for="review in reviews" :key="review.id" class="nz-card flex gap-4 p-4">
              <img data-fallback="/images-of-professionals/usuariodemo.jpg" :src="review.userImage" alt="" class="h-11 w-11 shrink-0 rounded-full object-cover" />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="font-bold text-foreground-light">{{ review.userName }}</p>
                  <StarRating :value="review.rating" />
                </div>
                <p class="text-xs text-muted-light">{{ relative(review.date) }}</p>
                <p class="mt-2 text-sm text-foreground-light">{{ review.comment }}</p>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <aside class="nz-card h-fit space-y-4 p-5 lg:sticky lg:top-[calc(var(--header-height)+1rem)]">
        <dl class="space-y-3 text-sm">
          <div><dt class="text-muted-light">{{ $t('professionals.profile.rate') }}</dt><dd class="text-2xl font-extrabold text-foreground-light">${{ therapist.price }} <span class="text-sm font-medium text-muted-light">/ {{ $t('professionals.perSession') }}</span></dd></div>
          <div v-if="therapist.availability"><dt class="text-muted-light">{{ $t('professionals.directory.availability') }}</dt><dd class="font-semibold">{{ therapist.availability }}</dd></div>
        </dl>
        <router-link :to="{ name: 'BookAppointment', params: { id: therapist.id } }" class="nz-btn-primary w-full py-3">
          <i class="fas fa-calendar-plus" aria-hidden="true"></i>{{ $t('professionals.book') }}
        </router-link>
      </aside>
    </div>
  </div>
</template>

<script>
/** TherapistDetailComponent - Perfil del profesional y reseñas. */
import PageHeader from '../../components/ui/PageHeader.vue'
import LoadingState from '../../components/ui/LoadingState.vue'
import ErrorState from '../../components/ui/ErrorState.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import StarRating from '../../components/StarRating.vue'
import { TherapistService } from '../../services/TherapistService.js'
import { formatRelative } from '../../utils/date.js'

export default {
  name: 'TherapistDetailComponent',
  components: { PageHeader, LoadingState, ErrorState, EmptyState, StarRating },
  data() {
    return { therapist: null, reviews: [], isLoading: true, errorMessage: '', service: new TherapistService() }
  },
  watch: {
    '$route.params.id'(id) { if (id) this.loadTherapistData() }
  },
  created() {
    this.loadTherapistData()
  },
  methods: {
    async loadTherapistData() {
      this.isLoading = true
      this.errorMessage = ''
      try {
        const id = this.$route.params.id
        const [therapist, reviews] = await Promise.all([this.service.getTherapist(id), this.service.getTherapistReviews(id)])
        this.therapist = therapist
        this.reviews = reviews
      } catch (error) {
        this.errorMessage = error.message
      } finally {
        this.isLoading = false
      }
    },
    relative(date) {
      return formatRelative(date, this.$i18n.locale)
    }
  }
}
</script>
