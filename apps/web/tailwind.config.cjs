/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        display: [
          'SUIT Variable',
          'Pretendard Variable',
          'Inter',
          'Noto Sans KR',
          'system-ui',
          'sans-serif'
        ],
        sans: [
          'Pretendard Variable',
          'Inter',
          'Pretendard',
          'Noto Sans KR',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif'
        ],
        mono: ['Fira Mono', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      boxShadow: {
        glass: '0 12px 28px rgba(20, 33, 61, 0.1)',
        glassLg: '0 24px 48px rgba(20, 33, 61, 0.14)',
        panel: '0 12px 28px rgba(20, 33, 61, 0.1)',
        panelLg: '0 24px 48px rgba(20, 33, 61, 0.14)',
        button: '0 10px 24px rgba(31, 107, 87, 0.2)'
      },
      colors: {
        'peer-navy': '#14213D',
        'peer-slate': '#52606D',
        'peer-indigo': '#1F6B57',
        'peer-sky': '#C67C2E',
        'peer-emerald': '#157347',
        'peer-ink': '#14213D',
        'peer-inkSoft': '#243B53',
        'peer-paper': '#FFFDF8',
        'peer-paperAlt': '#F7F3EC',
        'peer-stone': '#ECE7DF',
        'peer-stoneDark': '#D8D1C7',
        'peer-forest': '#1F6B57',
        'peer-forestDark': '#175845',
        'peer-forestSoft': '#E7F4EF',
        'peer-amber': '#C67C2E',
        'peer-amberSoft': '#FBF1E4',
        'peer-danger': '#B42318',
        'peer-dangerSoft': '#FEECEB',
        'peer-success': '#157347',
        'peer-successSoft': '#E8F6EE',
        'peer-copy': '#1E293B',
        'peer-copySoft': '#52606D',
        'peer-copyMuted': '#7B8794'
      },
      borderRadius: {
        '3xl': '1.75rem'
      },
      backgroundImage: {
        'peer-body':
          'radial-gradient(circle at top left, rgba(198, 124, 46, 0.1), transparent 34%), radial-gradient(circle at top right, rgba(31, 107, 87, 0.09), transparent 36%), linear-gradient(180deg, #fffdf8 0%, #faf7f1 58%, #f3ede2 100%)'
      }
    }
  },
  plugins: []
};
