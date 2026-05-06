/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        pit: {
          bg: '#0A0A0A',
          surface: '#141414',
          surface2: '#1C1C1C',
          surface3: '#242424',
          border: 'rgba(255,255,255,0.06)',
          borderHover: 'rgba(255,255,255,0.12)',
          text: '#F5F5F5',
          muted: '#A3A3A3',
          dim: '#6B6B6B',
          accent: '#E85D04',
          accentLight: '#F48C06',
          accentDark: '#B14302',
          danger: '#DC2626',
          success: '#16A34A'
        }
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'glow-orange': '0 0 0 2px rgba(232,93,4,0.4)',
        'glow-orange-lg': '0 0 24px rgba(232,93,4,0.35)',
        'soft': '0 8px 24px rgba(0,0,0,0.4)'
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-down': 'slideDown 250ms ease-out',
        'slide-up': 'slideUp 250ms ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 }
        },
        slideDown: {
          '0%': { opacity: 0, transform: 'translateY(-8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}
