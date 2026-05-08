import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
    	container: {
    		center: true,
    		padding: '2rem',
    		screens: {
    			'2xl': '1400px'
    		}
    	},
    	extend: {
    		fontFamily: {
    			sans: ['Plus Jakarta Sans', 'DM Sans', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
    			serif: ['Fraunces', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
    			mono: ['DM Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
    		},
    		colors: {
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))',
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			success: {
    				DEFAULT: 'hsl(var(--success))',
    				foreground: 'hsl(var(--success-foreground))'
    			},
    			warning: {
    				DEFAULT: 'hsl(var(--warning))',
    				foreground: 'hsl(var(--warning-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			sidebar: {
    				DEFAULT: 'hsl(var(--sidebar-background))',
    				foreground: 'hsl(var(--sidebar-foreground))',
    				primary: 'hsl(var(--sidebar-primary))',
    				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
    				accent: 'hsl(var(--sidebar-accent))',
    				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
    				border: 'hsl(var(--sidebar-border))',
    				ring: 'hsl(var(--sidebar-ring))'
    			},
    			/* Brand palette */
    			grape: {
    				50:  '#F8F1FF',
    				100: '#F0E4FB',
    				300: '#C7AEEF',
    				500: '#8A5FE0',
    				600: '#6B3FBF',
    				700: '#522793',
    				900: '#2A1248',
    				950: '#1A0B2E',
    			},
    			blush: {
    				100: '#FCE0EC',
    				500: '#EE7BB0',
    			},
    			sky: {
    				100: '#DCE6F8',
    				500: '#6E8FE5',
    			},
    			sun: {
    				500: '#FFC861',
    			},
    			paper: '#FBF8FF',
    			ink:   '#1A0B2E',
    			terracotta: {
    				DEFAULT: '#964735',
    				light: '#D97B66',
    				50: '#FDF3EE',
    				100: '#FAE0D5',
    			},
    			cream: {
    				DEFAULT: '#FDF9F3',
    				dim: '#F1EDE7',
    			},
    			sage: {
    				DEFAULT: '#44664F',
    				light: '#C6ECCF',
    			},
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		keyframes: {
    			'accordion-down': {
    				from: { height: '0' },
    				to:   { height: 'var(--radix-accordion-content-height)' }
    			},
    			'accordion-up': {
    				from: { height: 'var(--radix-accordion-content-height)' },
    				to:   { height: '0' }
    			},
    			'fade-in': {
    				'0%':   { opacity: '0', transform: 'translateY(10px)' },
    				'100%': { opacity: '1', transform: 'translateY(0)' }
    			},
    			'slide-up': {
    				'0%':   { opacity: '0', transform: 'translateY(20px)' },
    				'100%': { opacity: '1', transform: 'translateY(0)' }
    			},
    			'scale-in': {
    				'0%':   { opacity: '0', transform: 'scale(0.95)' },
    				'100%': { opacity: '1', transform: 'scale(1)' }
    			}
    		},
    		animation: {
    			'accordion-down': 'accordion-down 0.2s ease-out',
    			'accordion-up':   'accordion-up 0.2s ease-out',
    			'fade-in':        'fade-in 0.5s ease-out',
    			'slide-up':       'slide-up 0.4s ease-out',
    			'scale-in':       'scale-in 0.3s ease-out'
    		},
    		boxShadow: {
    			'2xs': 'var(--shadow-2xs)',
    			xs:    'var(--shadow-xs)',
    			sm:    'var(--shadow-sm)',
    			md:    'var(--shadow-md)',
    			lg:    'var(--shadow-lg)',
    			xl:    'var(--shadow-xl)',
    			'2xl': 'var(--shadow-2xl)'
    		}
    	}
    },
	plugins: [tailwindcssAnimate],
} satisfies Config;
