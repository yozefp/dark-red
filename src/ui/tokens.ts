/** Dizajnové tokeny odvodené z finálnych obrazoviek.
 *  Doladenie podľa dizajnu = zmena konštanty, nie hľadanie po komponentoch. */
export const C = {
  bg:        '#1A0E0C',
  bgDeep:    '#120807',
  glow:      'rgba(255,90,31,0.14)',
  text:      '#F0E6E2',
  textMuted: '#A08A82',
  textDim:   '#6B5450',
  amber:     '#E8A33D',
  orange:    '#FF5A1F',
  red:       '#E02A26',
  maroon:    '#6B2A28',
  line:      '#3E1E1A',
} as const;

export const T = {
  headline:   'clamp(30px,5.2vw,54px)',
  headlineLs: '.10em',
  value:      'clamp(34px,6vw,62px)',
  body:       'clamp(13px,1.6vw,16px)',
  label:      '11px',
  labelLs:    '.22em',
} as const;

export const Z = { header: 56, touchMin: 64 } as const;
