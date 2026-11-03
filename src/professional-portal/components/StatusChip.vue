<template>
  <span class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold" :class="style.css">
    <i :class="style.icon" aria-hidden="true"></i>{{ $t(`pro.appointmentStatus.${state}`) }}
  </span>
</template>

<script>
/** Estado de una cita: pendiente, confirmada, atendida o cancelada */
export default {
  name: 'StatusChip',
  props: { state: { type: String, required: true } },
  computed: {
    style() {
      return {
        pending: { css: 'bg-amber-50 text-amber-800', icon: 'fas fa-hourglass-half' },
        confirmed: { css: 'bg-green-50 text-green-800', icon: 'fas fa-circle-check' },
        completed: { css: 'bg-gray-100 text-gray-700', icon: 'fas fa-check-double' },
        cancelled: { css: 'bg-red-50 text-red-800', icon: 'fas fa-ban' }
      }[this.state] || { css: 'bg-gray-100 text-gray-700', icon: 'fas fa-circle' }
    }
  }
}
</script>
