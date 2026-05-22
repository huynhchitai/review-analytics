import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        // Risograph dark theme
        charcoal: 'var(--charcoal)',
        'charcoal-mid': 'var(--charcoal-mid)',
        'charcoal-light': 'var(--charcoal-light)',
        'riso-blue': 'var(--riso-blue)',
        'riso-blue-dim': 'var(--riso-blue-dim)',
        'riso-orange': 'var(--riso-orange)',
        'riso-orange-dim': 'var(--riso-orange-dim)',
        'riso-yellow': 'var(--riso-yellow)',
        paper: 'var(--paper)',
        'paper-dim': 'var(--paper-dim)',
        'paper-muted': 'var(--paper-muted)',
        rule: 'var(--rule)',
        'rule-soft': 'var(--rule-soft)',
        positive: 'var(--positive)',
        neutral: 'var(--neutral)',
        negative: 'var(--negative)',
      },
      backgroundImage: {
        grain: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
