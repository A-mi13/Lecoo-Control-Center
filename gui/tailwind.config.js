/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src-ui/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        'bg-elev': 'var(--color-bg-elev)',
        'bg-sidebar': 'var(--color-bg-sidebar)',
        border: 'var(--color-border)',
        text: 'var(--color-text)',
        'text-strong': 'var(--color-text-strong)',
        mute: 'var(--color-mute)',
        accent: 'var(--color-accent)',
        'accent-bg': 'var(--color-accent-bg)',
        ok: 'var(--color-ok)',
        warn: 'var(--color-warn)',
        purple: 'var(--color-purple)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
