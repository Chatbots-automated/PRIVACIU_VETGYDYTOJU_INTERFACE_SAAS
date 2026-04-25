// Veterinary Accounting System Design - Modern Blue/Indigo Theme
// This replaces the emerald/teal theme with a unique blue/indigo palette

export const rvacTheme = {
  // Primary Colors - Blue/Indigo
  primary: {
    50: '#eff6ff',   // Very light blue
    100: '#dbeafe',  // Light blue
    200: '#bfdbfe',  // Lighter blue
    300: '#93c5fd',  // Medium light blue
    400: '#60a5fa',  // Medium blue
    500: '#3b82f6',  // Primary blue
    600: '#2563eb',  // Dark blue
    700: '#1d4ed8',  // Darker blue
    800: '#1e40af',  // Very dark blue
    900: '#1e3a8a',  // Deepest blue
  },

  // Secondary Colors - Indigo
  secondary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',  // Primary indigo
    600: '#4f46e5',  // Dark indigo
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },

  // Accent Colors - Cyan
  accent: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',  // Primary cyan
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },

  // Status Colors
  status: {
    success: '#10b981',  // Green
    warning: '#f59e0b',  // Amber
    error: '#ef4444',    // Red
    info: '#3b82f6',     // Blue
  },

  // Gradients
  gradients: {
    primary: 'from-blue-600 to-indigo-600',
    background: 'from-blue-50 via-indigo-50 to-blue-50',
    card: 'from-blue-500 to-indigo-500',
    subtle: 'from-slate-50 to-blue-50',
  },

  // UI Elements
  button: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
  },

  // Focus States
  focus: 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',

  // Borders
  border: {
    light: 'border-gray-200',
    medium: 'border-gray-300',
    primary: 'border-blue-600',
  },
};

// Tailwind class replacements
export const colorReplacements = {
  // Replace emerald with blue
  'emerald-50': 'blue-50',
  'emerald-100': 'blue-100',
  'emerald-200': 'blue-200',
  'emerald-300': 'blue-300',
  'emerald-400': 'blue-400',
  'emerald-500': 'blue-500',
  'emerald-600': 'blue-600',
  'emerald-700': 'blue-700',
  'emerald-800': 'blue-800',
  'emerald-900': 'blue-900',

  // Replace teal with indigo
  'teal-50': 'indigo-50',
  'teal-100': 'indigo-100',
  'teal-200': 'indigo-200',
  'teal-300': 'indigo-300',
  'teal-400': 'indigo-400',
  'teal-500': 'indigo-500',
  'teal-600': 'indigo-600',
  'teal-700': 'indigo-700',
  'teal-800': 'indigo-800',
  'teal-900': 'indigo-900',
};
