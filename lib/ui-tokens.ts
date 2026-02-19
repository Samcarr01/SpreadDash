export const CHART_SERIES_COLOURS_ENTERPRISE = [
  '#56B4E9',
  '#E69F00',
  '#009E73',
  '#F0E442',
  '#0072B2',
  '#D55E00',
  '#CC79A7',
  '#999999',
] as const

export const CHART_MAX_VISIBLE_SERIES = 5

export const CHART_AXIS_STYLE = {
  fontSize: 12,
  fill: 'hsl(var(--text-muted))',
}

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--bg-overlay) / 0.97)',
  border: '1px solid hsl(var(--border-strong))',
  borderRadius: '10px',
  color: 'hsl(var(--text-primary))',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
}
