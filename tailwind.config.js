/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#07080d',
        'void-2': '#0d0e17',
        'void-3': '#12131f',
        surface: '#1a1b2e',
        'surface-2': '#22243a',
        border: '#2a2d4a',
        neon: '#22c55e',
        'neon-dim': '#16a34a',
        purple: '#a855f7',
        'purple-dim': '#7c3aed',
        cyan: '#06b6d4',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Orbitron', 'monospace'],
      },
      boxShadow: {
        neon: '0 0 12px rgba(34, 197, 94, 0.5), 0 0 24px rgba(34, 197, 94, 0.25)',
        'neon-sm': '0 0 6px rgba(34, 197, 94, 0.4)',
        purple: '0 0 12px rgba(168, 85, 247, 0.5), 0 0 24px rgba(168, 85, 247, 0.25)',
        'purple-sm': '0 0 6px rgba(168, 85, 247, 0.4)',
        cyan: '0 0 12px rgba(6, 182, 212, 0.5)',
        card: '0 4px 32px rgba(0,0,0,0.6)',
      },
      animation: {
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
        'glow-sweep': 'glowSweep 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        pulseNeon: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        glowSweep: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      },
      backgroundImage: {
        'grid-void': "linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '40px 40px',
      }
    },
  },
  plugins: [],
}
