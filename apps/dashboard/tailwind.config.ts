import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#0b0e14',
        panel: '#131926',
        edge: '#232c3d',
        ghost: '#6ee7b7',
      },
    },
  },
  plugins: [],
};

export default config;
