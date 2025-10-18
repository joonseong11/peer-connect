/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: [
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
				glass: '0 16px 40px rgba(148, 163, 184, 0.25)',
				glassLg: '0 18px 42px rgba(148, 163, 184, 0.22)'
			},
			colors: {
				'peer-navy': '#0f172a',
				'peer-slate': '#475569',
				'peer-indigo': '#6366f1',
				'peer-sky': '#38bdf8',
				'peer-emerald': '#34d399'
			},
			borderRadius: {
				'3xl': '1.75rem'
			},
			backgroundImage: {
				'peer-body':
					'radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 45%), radial-gradient(circle at top right, rgba(236, 72, 153, 0.08), transparent 40%), linear-gradient(180deg, #f8fafc 0%, #e2e8f0 60%, #f1f5f9 100%)'
			}
		}
	},
	plugins: []
};
