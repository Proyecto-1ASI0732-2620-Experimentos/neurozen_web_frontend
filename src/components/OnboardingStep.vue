<template>
  <div class="flex min-h-screen flex-col bg-background-light">
    <div class="flex items-center justify-between p-4 sm:p-6">
      <div class="flex items-center gap-2">
        <img src="/neurozen1_logo.png" alt="" class="h-9 w-9 rounded-lg object-contain" />
        <span class="text-lg font-extrabold text-primary">NeuroZen</span>
      </div>
      <button v-if="!isLast" type="button" class="nz-btn-ghost" @click="$emit('skip')">{{ $t('onboarding.buttons.skip') }}</button>
    </div>

    <div class="flex flex-1 items-center justify-center px-6 pb-16">
      <div class="w-full max-w-md text-center">
        <div class="mx-auto mb-10 flex h-48 w-48 items-center justify-center rounded-full bg-primary/10 text-8xl ring-8 ring-primary/5" aria-hidden="true">
          {{ step.icon }}
        </div>
        <h1 class="text-3xl font-extrabold text-foreground-light">{{ $t(`onboarding.steps.${step.title}`) }}</h1>
        <p class="mx-auto mt-3 max-w-sm text-muted-light">{{ $t(`onboarding.steps.${step.description}`) }}</p>

        <div class="mt-10 flex items-center justify-center gap-2" role="progressbar" :aria-valuenow="step.step" aria-valuemin="1" :aria-valuemax="step.totalSteps"
          :aria-label="$t('auth.register.stepProgress', { current: step.step, total: step.totalSteps })">
          <span v-for="n in step.totalSteps" :key="n" class="h-2 rounded-full transition-all" :class="n === step.step ? 'w-8 bg-primary' : n < step.step ? 'w-2 bg-primary/60' : 'w-2 bg-primary/20'"></span>
        </div>

        <button type="button" class="nz-btn-primary mt-10 w-full py-3.5 text-base" @click="$emit('next')">
          {{ isLast ? $t('onboarding.buttons.start') : step.step === 1 ? $t('onboarding.buttons.getStarted') : $t('onboarding.buttons.next') }}
          <i class="fas fa-arrow-right" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
/** Paso de onboarding reutilizado por las tres pantallas de bienvenida. */
export default {
  name: 'OnboardingStep',
  props: { step: { type: Object, required: true } },
  emits: ['next', 'skip'],
  computed: {
    isLast() { return this.step.step === this.step.totalSteps }
  }
}
</script>
