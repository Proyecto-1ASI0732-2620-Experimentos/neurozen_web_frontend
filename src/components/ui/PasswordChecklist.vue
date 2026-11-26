<template>
  <div :id="id" class="mt-2 rounded-lg bg-primary/5 p-3">
    <p class="text-sm font-semibold text-foreground-light">{{ $t('password.checklist.title') }}</p>
    <ul class="mt-1.5 space-y-1" aria-live="polite">
      <li v-for="rule in rules" :key="rule.key" class="flex items-center gap-2 text-sm" :class="rule.ok ? 'text-green-800' : 'text-foreground-light'" :data-rule="rule.key" :data-ok="rule.ok">
        <i :class="rule.ok ? 'fas fa-circle-check text-green-700' : 'far fa-circle text-muted-light'" aria-hidden="true"></i>
        <span>{{ $t(`password.checklist.${rule.key}`) }}</span>
        <span class="sr-only">— {{ rule.ok ? $t('password.checklist.met') : $t('password.checklist.pending') }}</span>
      </li>
    </ul>
  </div>
</template>

<script>
/**
 * PasswordChecklist (M6) - Requisitos de la contraseña actualizados mientras se escribe.
 * Usa EXACTAMENTE las reglas de `passwordChecks` (validation.js), las mismas que exige el backend
 * (mínimo 8 caracteres, al menos una letra y un número, máximo 72 bytes). No agrega reglas propias.
 */
import { passwordChecks } from '../../utils/validation.js'

export default {
  name: 'PasswordChecklist',
  props: { password: { type: String, default: '' }, id: { type: String, default: undefined } },
  computed: {
    rules() {
      const c = passwordChecks(this.password)
      const rules = [
        { key: 'length', ok: c.length },
        { key: 'letter', ok: c.letter },
        { key: 'number', ok: c.number }
      ]
      // El límite de 72 bytes solo se muestra si se supera (para no recargar la lista)
      if (!c.maxBytes) rules.push({ key: 'maxBytes', ok: false })
      return rules
    }
  }
}
</script>
