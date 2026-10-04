/** Tailwind compilado en build (antes se cargaba por CDN en index.html).
 *  Mantiene exactamente la paleta y tipografía originales del proyecto. */
import forms from '@tailwindcss/forms'
import containerQueries from '@tailwindcss/container-queries'

export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#2D5A4A',
        'primary-strong': '#234739',
        secondary: '#1A6F78',
        mint: '#A2C4B5',
        'background-light': '#F1E9D4',
        'background-dark': '#11211c',
        'text-light': '#374151',
        'text-dark': '#E5E7EB',
        'muted-light': '#6B7280',
        'muted-dark': '#9CA3AF',
        'input-light': '#ffffff',
        'input-dark': '#2a2a2a',
        'placeholder-light': '#6b7280',
        'placeholder-dark': '#9ca3af',
        'border-light': '#d1d5db',
        'border-dark': '#4b5563',
        'foreground-light': '#1f2a26',
        'foreground-dark': '#f6f8f7',
        'content-light': '#1f2a26',
        'content-dark': '#f6f8f7',
        'card-light': '#ffffff',
        'card-dark': '#1a2b25'
      },
      fontFamily: {
        display: ['Manrope', 'system-ui', 'sans-serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        full: '9999px'
      }
    }
  },
  plugins: [forms, containerQueries]
}
