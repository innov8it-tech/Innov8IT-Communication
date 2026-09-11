import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'theme-gradient': 'none',
      },
      colors: {
        white: 'var(--primary)',
        'sidebar-gray': 'var(--secondary)',
        'channel-gray': 'var(--channel-gray)',
        'icon-gray': 'var(--icon-gray)',
        'hover-gray': '#f8f8f814',
        purple: '#17152f',
      },
      fontFamily: {
        lato: ['Lato', 'Arial', 'sans-serif'],
        outfit: ['Outfit', 'Roboto', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
