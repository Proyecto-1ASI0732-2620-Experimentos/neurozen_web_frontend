<template>
  <figure class="w-full">
    <div class="relative h-44 w-full">
      <canvas ref="chartCanvas" role="img" :aria-label="ariaLabel"></canvas>
    </div>
    <figcaption class="sr-only">{{ ariaLabel }}</figcaption>
  </figure>
</template>

<script>
/**
 * StressLevelChart - Línea de nivel de estrés (Chart.js).
 * Simplificado: una sola inicialización, actualización en cada cambio de datos,
 * etiquetas traducidas (antes fijas en inglés) y sin logs.
 */
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, LineController, Tooltip, Filler } from 'chart.js'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, LineController, Tooltip, Filler)

const WEEK_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default {
  name: 'StressLevelChart',
  props: {
    chartData: { type: Array, default: () => [] },
    period: { type: String, default: 'week' },
    averageStress: { type: Number, default: 50 }
  },
  computed: {
    labels() {
      return this.chartData.map((d) => this.formatLabel(d.day))
    },
    color() {
      if (this.averageStress <= 40) return '#2E7D4F'
      if (this.averageStress <= 70) return '#B7791F'
      return '#C0392B'
    },
    ariaLabel() {
      const values = this.chartData.map((d, i) => `${this.labels[i]}: ${d.value}`).join(', ')
      return `${this.$t('dashboard.chart.stressLevel')} — ${values}`
    }
  },
  watch: {
    chartData: { handler: 'render', deep: true },
    '$i18n.locale': 'render'
  },
  mounted() {
    this.render()
  },
  beforeUnmount() {
    if (this.chart) this.chart.destroy()
  },
  methods: {
    formatLabel(day) {
      if (WEEK_KEYS.includes(day)) return this.$t(`common.days.${day}`)
      if (/^week\d$/.test(day)) return this.$t(`dashboard.periods.${day}`)
      return day
    },
    render() {
      const canvas = this.$refs.chartCanvas
      if (!canvas) return
      const values = this.chartData.map((d) => d.value)
      if (this.chart) {
        this.chart.data.labels = this.labels
        this.chart.data.datasets[0].data = values
        this.chart.data.datasets[0].borderColor = this.color
        this.chart.data.datasets[0].backgroundColor = `${this.color}1F`
        this.chart.update()
        return
      }
      this.chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: this.labels,
          datasets: [{
            data: values,
            fill: true,
            borderColor: this.color,
            backgroundColor: `${this.color}1F`,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 400 },
          plugins: {
            legend: { display: false },
            tooltip: {
              displayColors: false,
              callbacks: { label: (ctx) => `${this.$t('dashboard.chart.stressLevelShort')}: ${ctx.parsed.y}` }
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#5B6762', font: { family: 'Manrope', weight: '600' } } },
            y: { min: 0, max: 100, ticks: { stepSize: 25, color: '#8A948F' }, grid: { color: 'rgba(31,42,38,0.06)' } }
          }
        }
      })
    }
  }
}
</script>
