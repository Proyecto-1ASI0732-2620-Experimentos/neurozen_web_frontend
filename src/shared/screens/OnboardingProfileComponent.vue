<template>
  <div class="flex min-h-screen flex-col bg-background-light">
    <div class="flex items-center justify-between p-4 sm:p-6">
      <div class="flex items-center gap-2">
        <img src="/neurozen1_logo.png" alt="" class="h-9 w-9 rounded-lg object-contain" />
        <span class="text-lg font-extrabold text-primary">NeuroZen</span>
      </div>
      <button type="button" class="nz-btn-secondary" @click="skip">{{ $t('onboardingProfile.skip') }}</button>
    </div>

    <div class="flex flex-1 items-center justify-center px-4 pb-12">
      <form class="nz-card w-full max-w-lg space-y-6 p-6 sm:p-8" novalidate @submit.prevent="save">
        <div>
          <p class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{{ $t('onboardingProfile.step') }}</p>
          <h1 class="mt-1 text-2xl font-extrabold text-foreground-light">{{ $t('onboardingProfile.title') }}</h1>
          <p class="mt-1 text-sm text-muted-light">{{ $t('onboardingProfile.subtitle') }}</p>
        </div>

        <fieldset>
          <legend class="nz-label">{{ $t('onboardingProfile.age') }}</legend>
          <div class="flex flex-wrap gap-2">
            <button v-for="range in ageRanges" :key="range" type="button" class="chip" :class="{ 'chip-active': form.ageRange === range }" :aria-pressed="form.ageRange === range" @click="form.ageRange = form.ageRange === range ? '' : range">
              {{ $t(`onboardingProfile.ages.${range}`) }}
            </button>
          </div>
        </fieldset>

        <div>
          <label class="nz-label" for="ob-occupation">{{ $t('onboardingProfile.occupation') }}</label>
          <input id="ob-occupation" v-model.trim="form.occupation" maxlength="80" class="nz-input" :placeholder="$t('onboardingProfile.occupationPlaceholder')" />
        </div>

        <fieldset>
          <legend class="nz-label">{{ $t('onboardingProfile.workType') }}</legend>
          <div class="grid gap-2 sm:grid-cols-2">
            <!-- Botones que se pueden marcar y desmarcar: ninguna opción viene preseleccionada (M5) -->
            <button v-for="type in workTypes" :key="type" type="button" class="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors"
              :class="form.workType === type ? 'border-primary bg-primary/5' : 'border-[#D6D2C7] hover:border-primary/50'" :aria-pressed="form.workType === type"
              @click="form.workType = form.workType === type ? '' : type">
              <i :class="form.workType === type ? 'fas fa-circle-check text-primary' : 'far fa-circle text-muted-light'" class="mt-0.5" aria-hidden="true"></i>
              <span>
                <span class="block text-sm font-bold">{{ $t(`onboardingProfile.workTypes.${type}.title`) }}</span>
                <span class="block text-sm text-muted-light">{{ $t(`onboardingProfile.workTypes.${type}.text`) }}</span>
              </span>
            </button>
          </div>
        </fieldset>

        <p class="flex gap-2 text-sm text-muted-light"><i class="fas fa-lock mt-0.5" aria-hidden="true"></i>{{ $t('onboardingProfile.privacy') }}</p>

        <div class="flex flex-col gap-2 sm:flex-row-reverse">
          <button type="submit" class="nz-btn-primary w-full py-3 sm:flex-1" :disabled="saving || !filled">
            <span v-if="saving" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>
            {{ $t('onboardingProfile.continue') }}<i class="fas fa-arrow-right" aria-hidden="true"></i>
          </button>
          <button type="button" class="nz-btn-secondary w-full border-2 py-3 sm:flex-1" data-testid="skip-optional" @click="skip">{{ $t('onboardingProfile.skip') }}</button>
        </div>
        <p class="text-center text-sm text-muted-light">{{ $t('onboardingProfile.skipHint') }}</p>
      </form>
    </div>
  </div>
</template>

<script>
/**
 * OnboardingProfileComponent - «Paso opcional» (M5): antes se rotulaba «Último paso».
 * Ninguna opción viene marcada, todas se pueden desmarcar y «Omitir» está destacado.
 * Datos de perfil OPCIONALES tras el registro
 * (edad, ocupación y tipo de jornada). Después lleva al test de autoevaluación.
 * El registro se mantiene corto; la personalización se hace aquí, ya dentro de la plataforma.
 */
import { UserService } from '../../services/UserService.js'
import { session, getUserId, updateUser } from '../../services/session.js'
import { toast } from '../../composables/useToast.js'

export default {
  name: 'OnboardingProfileComponent',
  data() {
    return {
      saving: false,
      ageRanges: ['18-24', '25-34', '35-44', '45-54', '55+'],
      workTypes: ['formal', 'informal'],
      // M5: el paso empieza siempre vacío (sin selecciones predeterminadas)
      form: { ageRange: '', occupation: '', workType: '' }
    }
  },
  computed: {
    filled() {
      return !!(this.form.ageRange || this.form.occupation || this.form.workType)
    }
  },
  methods: {
    /** Omitir: no guarda nada y continúa (los datos del registro ya están en la cuenta) */
    skip() {
      this.$router.push({ name: 'Assessment', query: { from: 'onboarding' } })
    },
    async save() {
      if (this.saving) return
      const filled = this.form.ageRange || this.form.occupation || this.form.workType
      if (filled) {
        this.saving = true
        const u = session.user || {}
        try {
          await new UserService().updateProfile(getUserId(), {
            username: u.username || u.email,
            email: u.email,
            fullName: u.fullName || u.name,
            phone: u.phone,
            address: u.address,
            avatar: u.avatar,
            birthDate: u.birthDate,
            ...this.form
          })
          updateUser({ ...this.form })
        } catch {
          // No bloquea el onboarding: los datos son opcionales
          toast.warning(this.$t('onboardingProfile.saveError'))
        } finally {
          this.saving = false
        }
      }
      this.$router.push({ name: 'Assessment', query: { from: 'onboarding' } })
    }
  }
}
</script>

<style scoped>
.chip { @apply rounded-full border border-[#D6D2C7] bg-white px-4 py-2 text-sm font-semibold text-foreground-light transition-colors hover:border-primary; }
.chip-active { @apply border-primary bg-primary text-white hover:border-primary; }
</style>
