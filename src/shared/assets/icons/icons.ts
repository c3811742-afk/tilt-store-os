// Line icons on a 24 x 24 grid, drawn with `currentColor` by the shared Icon component.
// Each icon is a list of SVG path strings.
const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const rect = (x: number, y: number, width: number, height: number) => `M${x} ${y}h${width}v${height}h${-width}z`;

export const icons = {
  // Menu
  dashboard: [rect(3, 3, 7, 9), rect(14, 3, 7, 5), rect(14, 12, 7, 9), rect(3, 16, 7, 5)],
  sun: [circle(12, 12, 4), 'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
  moon: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
  tag: ['M12 2H2v10l10 10 10-10z', circle(7, 7, 1.5)],
  box: ['M21 8l-9-5-9 5v8l9 5 9-5z', 'M3 8l9 5 9-5', 'M12 13v8'],
  store: ['M3 9l1.5-5h15L21 9', 'M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z', 'M5 13v8h14v-8', 'M10 21v-5h4v5'],
  coins: [circle(9, 9, 6), 'M15.1 9.1A6 6 0 1 1 9.1 15.1', 'M9 7v4h2'],
  receipt: ['M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2z', 'M9 7h6', 'M9 11h6', 'M9 15h4'],
  users: [circle(9, 7, 4), 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M22 21v-2a4 4 0 0 0-3-3.9', 'M16 3.1a4 4 0 0 1 0 7.8'],
  user: [circle(12, 8, 4), 'M20 21a8 8 0 0 0-16 0'],
  percent: ['M19 5L5 19', circle(6.5, 6.5, 2.5), circle(17.5, 17.5, 2.5)],
  calculator: [rect(4, 2, 16, 20), rect(8, 6, 8, 4), 'M8 14h.01', 'M12 14h.01', 'M16 14h.01', 'M8 18h.01', 'M12 18h.01', 'M16 18h.01'],
  layers: ['M12 2L2 7l10 5 10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5'],
  wallet: ['M20 7V4H4a2 2 0 0 0 0 4h16v12H4a2 2 0 0 1-2-2V6', 'M16 14h.01'],
  card: [rect(2, 5, 20, 14), 'M2 10h20', 'M6 15h4'],
  chart: ['M3 3v18h18', 'M7 15v2', 'M11 10v7', 'M15 12v5', 'M19 6v11'],
  checkCircle: [circle(12, 12, 10), 'M8 12l3 3 5-6'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  bell: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.9 1.9 0 0 0 3.4 0'],
  activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  settings: [circle(12, 12, 3), 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'],
  truck: [rect(1, 3, 15, 13), 'M16 8h4l3 3v5h-7z', circle(5.5, 18.5, 2.5), circle(18.5, 18.5, 2.5)],
  swap: ['M17 3l4 4-4 4', 'M3 7h18', 'M7 21l-4-4 4-4', 'M21 17H3'],
  globe: [circle(12, 12, 10), 'M2 12h20', 'M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z'],
  menu: ['M3 6h18', 'M3 12h18', 'M3 18h18'],
  phone: [rect(6, 2, 12, 20), 'M11 18h2'],

  // Actions
  search: [circle(11, 11, 8), 'M21 21l-4.3-4.3'],
  plus: ['M12 5v14', 'M5 12h14'],
  pencil: ['M17 3l4 4L8 20H4v-4z', 'M14 6l4 4'],
  trash: ['M3 6h18', 'M8 6V3h8v3', 'M19 6l-1 15H6L5 6', 'M10 11v6', 'M14 11v6'],
  archive: [rect(2, 3, 20, 5), 'M4 8v13h16V8', 'M10 12h4'],
  restore: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5'],
  close: ['M18 6L6 18', 'M6 6l12 12'],
  check: ['M20 6L9 17l-5-5'],
  more: [circle(5, 12, 1), circle(12, 12, 1), circle(19, 12, 1)],
  upload: ['M21 15v6H3v-6', 'M17 8l-5-5-5 5', 'M12 3v12'],
  download: ['M21 15v6H3v-6', 'M7 10l5 5 5-5', 'M12 15V3'],
  printer: ['M6 9V2h12v7', rect(2, 9, 20, 9), rect(6, 14, 12, 8)],
  send: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4z'],
  message: ['M7.9 20A9 9 0 1 0 4 16.1L2 22z'],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z', circle(12, 12, 3)],
  lock: [rect(4, 11, 16, 11), 'M8 11V7a4 4 0 0 1 8 0v4'],
  unlock: [rect(4, 11, 16, 11), 'M8 11V7a4 4 0 0 1 7.9-1'],
  refresh: ['M21 12a9 9 0 0 1-15.5 6.3L3 16', 'M3 12a9 9 0 0 1 15.5-6.3L21 8', 'M21 3v5h-5', 'M3 21v-5h5'],
  filter: ['M22 3H2l8 9.5V19l4 2v-8.5z'],
  logOut: ['M9 21H3V3h6', 'M16 17l5-5-5-5', 'M21 12H9'], // flip in RTL
  pause: [rect(6, 4, 4, 16), rect(14, 4, 4, 16)],
  play: ['M6 3l14 9-14 9z'],
  barcode: ['M3 5v14', 'M7 5v14', 'M10 5v14', 'M14 5v14', 'M17 5v14', 'M21 5v14'],
  file: ['M14 2H6v20h12V8z', 'M14 2v6h6'],
  calendar: [rect(3, 4, 18, 18), 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  clock: [circle(12, 12, 10), 'M12 6v6l4 2'],
  signature: ['M3 17c3-6 5-6 6-3s2 3 4-1 3-4 4 0 2 3 4 3', 'M3 21h18'],

  // Direction (flip in RTL)
  chevronDown: ['M6 9l6 6 6-6'],
  chevronUp: ['M18 15l-6-6-6 6'],
  chevronEnd: ['M9 18l6-6-6-6'],
  chevronStart: ['M15 18l-6-6 6-6'],
  arrowEnd: ['M5 12h14', 'M12 5l7 7-7 7'],
  arrowStart: ['M19 12H5', 'M12 19l-7-7 7-7'],
  trendUp: ['M23 6l-9.5 9.5-5-5L1 18', 'M17 6h6v6'],
  trendDown: ['M23 18l-9.5-9.5-5 5L1 6', 'M17 18h6v-6'],

  // Status
  info: [circle(12, 12, 10), 'M12 16v-4', 'M12 8h.01'],
  warning: ['M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'M12 9v4', 'M12 17h.01'],
  alert: [circle(12, 12, 10), 'M12 8v4', 'M12 16h.01'],
} as const;

export type IconName = keyof typeof icons;

// Icons that point along the reading direction: the Icon component mirrors them in Arabic.
export const directionalIcons: readonly IconName[] = ['chevronEnd', 'chevronStart', 'arrowEnd', 'arrowStart', 'logOut', 'trendUp', 'trendDown', 'send'];
