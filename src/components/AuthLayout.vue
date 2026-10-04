<template>
  <div class="flex min-h-screen bg-background-light">
    <!-- Panel de marca (solo escritorio) -->
    <aside class="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden bg-primary p-12 text-white lg:flex">
      <div class="flex items-center gap-3">
        <img src="/neurozen1_logo.png" alt="" class="h-11 w-11 rounded-xl bg-white/95 object-contain p-1" />
        <span class="text-2xl font-extrabold">NeuroZen</span>
      </div>
      <div>
        <p class="text-3xl font-extrabold leading-tight">{{ $t('auth.brand.headline') }}</p>
        <ul class="mt-8 space-y-4 text-white/85">
          <li class="flex gap-3"><i class="fas fa-wind mt-1 w-5" aria-hidden="true"></i>{{ $t('auth.brand.point1') }}</li>
          <li class="flex gap-3"><i class="fas fa-chart-line mt-1 w-5" aria-hidden="true"></i>{{ $t('auth.brand.point2') }}</li>
          <li class="flex gap-3"><i class="fas fa-user-doctor mt-1 w-5" aria-hidden="true"></i>{{ $t('auth.brand.point3') }}</li>
        </ul>
      </div>
      <p class="text-sm text-white/60">{{ $t('footer.copyright') }}</p>
      <!-- Ondas de respiración: el único elemento decorativo -->
      <svg class="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 text-white/10" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" stroke-width="2" />
        <circle cx="100" cy="100" r="65" fill="none" stroke="currentColor" stroke-width="2" />
        <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" stroke-width="2" />
      </svg>
    </aside>

    <div class="flex flex-1 flex-col">
      <div class="flex justify-end p-4"><LanguageSelectorComponent /></div>
      <div class="flex flex-1 items-center justify-center px-4 pb-12">
        <div class="w-full max-w-md">
          <div class="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/neurozen1_logo.png" alt="" class="h-10 w-10 rounded-lg object-contain" />
            <span class="text-2xl font-extrabold text-primary">NeuroZen</span>
          </div>
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import LanguageSelectorComponent from './layout/LanguageSelectorComponent.vue'
export default { name: 'AuthLayout', components: { LanguageSelectorComponent } }
</script>
