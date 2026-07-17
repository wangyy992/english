/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 知更鳥橘紅(品牌主色)
        brand: {
          50: '#FBF1EA',
          100: '#F6DFD0',
          200: '#ECC2A8',
          300: '#E0A17F',
          400: '#D37E57',
          500: '#C9542E',
          600: '#B44F2B',
          700: '#93401F',
          800: '#703118',
          900: '#4C2110',
        },
        // 全局灰階換成暖石色,配米紙底
        gray: {
          50: '#FAF8F4',
          100: '#F3F0EA',
          200: '#E7E2D9',
          300: '#D5CEC2',
          400: '#A79F92',
          500: '#786F63',
          600: '#57503F',
          700: '#443E33',
          800: '#2C2721',
          900: '#1D1915',
        },
        paper: '#F7F2EA',
      },
      fontFamily: {
        display: ['Georgia', 'Palatino', 'Noto Serif SC', 'Songti SC', 'SimSun', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(76 33 16 / 0.05), 0 4px 16px -8px rgb(76 33 16 / 0.10)',
      },
    },
  },
  plugins: [],
}
