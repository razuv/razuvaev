import { Icon } from '@iconify/vue'
import type { IconProps, IconSet } from 'vuetify'
import { aliases } from 'vuetify/iconsets/mdi'

export const iconify: IconSet = {
  component: (props: IconProps) => h(Icon, { icon: props.icon as string }),
}

export const icons = {
  defaultSet: 'iconify',
  aliases,
  sets: {
    iconify,
  },
}
