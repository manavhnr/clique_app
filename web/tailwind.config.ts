import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink:    '#0B0907',
        paper:  '#F2EDE2',
        cream:  '#E8E1D2',
        lime:   '#C9F36E',
        hot:    '#FF3D6E',
        gold:   '#E8C46E',
        sky:    '#7DB4FF',
        dim:    '#8A8173',
        line:   { DEFAULT: '#1C1814', 2: '#2A2520' },
        card:   '#14110E',
        well:   '#0B0907',
      },
      fontFamily: {
        display: ['"Funnel Display"', '"Arial Narrow"', 'sans-serif'],
        serif:   ['"Instrument Serif"', '"Times New Roman"', 'serif'],
        mono:    ['"Geist Mono"', 'ui-monospace', '"SFMono-Regular"', 'monospace'],
        sans:    ['"Funnel Display"', '"Arial Narrow"', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        modal: '18px',
      },
      animation: {
        'rise': 'riseIn .5s ease-out both',
        'pulse-dot': 'pulse 2s ease-in-out infinite',
        'spin': 'spin 0.7s linear infinite',
      },
      keyframes: {
        riseIn: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulse:  { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
        spin:   { to: { transform: 'rotate(360deg)' } },
      },
    },
  },
  plugins: [],
};

export default config;
