import type { VuetifyOptions } from 'vuetify'

const theme: VuetifyOptions['theme'] = {
  defaultTheme: 'dark',
  themes: {
    light: {
      dark: false,
      colors: {
        'primary': '#000000',
        'secondary': '#666666',
        'on-secondary': '#FFFFFF',
        'success': '#000000',
        'info': '#000000',
        'warning': '#000000',
        'error': '#D92D20',
        'on-primary': '#FFFFFF',
        'on-success': '#FFFFFF',
        'on-warning': '#FFFFFF',
        'background': '#FFFFFF',
        'on-background': '#000000',
        'surface': '#F4F4F4',
        'on-surface': '#000000',
        'grey-50': '#FAFAFA',
        'grey-100': '#F5F5F5',
        'grey-200': '#EEEEEE',
        'grey-300': '#E0E0E0',
        'grey-400': '#BDBDBD',
        'grey-500': '#9E9E9E',
        'grey-600': '#757575',
        'grey-700': '#616161',
        'grey-800': '#424242',
        'grey-900': '#212121',
      },

      variables: {
        'border-color': '#000000',
        'medium-emphasis-opacity': 0.68,

        // Shadows
        'shadow-key-umbra-opacity': 'rgba(var(--v-theme-on-surface), 0.08)',
        'shadow-key-penumbra-opacity': 'rgba(var(--v-theme-on-surface), 0.12)',
        'shadow-key-ambient-opacity': 'rgba(var(--v-theme-on-surface), 0.04)',
      },
    },
    dark: {
      dark: true,
      colors: {
        'primary': '#FFFFFF',
        'secondary': '#A3A3A3',
        'on-secondary': '#fff',
        'success': '#FFFFFF',
        'info': '#FFFFFF',
        'warning': '#FFFFFF',
        'error': '#FF6B6B',
        'on-primary': '#000000',
        'on-success': '#000000',
        'on-warning': '#000000',
        'background': '#000000',
        'on-background': '#FFFFFF',
        'surface': '#101010',
        'on-surface': '#FFFFFF',
        'grey-50': '#0A0A0A',
        'grey-100': '#141414',
        'grey-200': '#242424',
        'grey-300': '#3A3A3A',
        'grey-400': '#5A5A5A',
        'grey-500': '#7A7A7A',
        'grey-600': '#A3A3A3',
        'grey-700': '#C4C4C4',
        'grey-800': '#E0E0E0',
        'grey-900': '#FFFFFF',
      },
      variables: {
        'border-color': '#FFFFFF',
        'medium-emphasis-opacity': 0.68,

        // Shadows
        'shadow-key-umbra-opacity': 'rgba(0, 0, 0, 0)',
        'shadow-key-penumbra-opacity': 'rgba(0, 0, 0, 0)',
        'shadow-key-ambient-opacity': 'rgba(0, 0, 0, 0)',
      },
    },
  },
}

export default theme
