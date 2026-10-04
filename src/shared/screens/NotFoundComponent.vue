<template>
  <section class="nz-page flex flex-1 flex-col items-center justify-center py-20 text-center">
    <p class="text-6xl font-extrabold text-primary/30">404</p>
    <h1 class="mt-4 text-2xl font-extrabold text-foreground-light">{{ $t('notFound.title') }}</h1>
    <p class="mt-2 max-w-md text-muted-light">{{ $t('notFound.message') }}</p>
    <router-link :to="{ name: 'Dashboard' }" class="nz-btn-primary mt-6">
      <i class="fas fa-house" aria-hidden="true"></i>{{ $t('notFound.goHome') }}
    </router-link>
  </section>
</template>

<script>
export default { name: 'NotFoundComponent' }
</script>
