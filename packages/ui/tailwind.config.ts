import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        ring: 'hsl(var(--ring))',
      },
    },
  },
  plugins: [],
} satisfies Config;
