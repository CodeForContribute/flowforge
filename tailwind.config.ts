import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'color-primary-light': '#e0f7fa',
        'color-primary': '#03a9f4',
        'color-primary-dark': '#01579b'
      }
    }
  },
  plugins: []
};

export default config;