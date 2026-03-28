export interface PaintBrushPart {
  type: 'path' | 'line';
  d?: string; // for path
  x1?: number; y1?: number; x2?: number; y2?: number; // for line
  fill?: string; // for path
  strokeWidth?: number; // for lines
}

export interface PaintBrushVariation {
  name: string;
  handle: PaintBrushPart;
  ferrule: PaintBrushPart;
  bristles: PaintBrushPart[];
}

export const PAINTBRUSH_VARIATIONS: PaintBrushVariation[] = [
  // Variation 1: Current straight bristles
  {
    name: "Straight Bristles",
    handle: { type: 'path', d: "M10 22 L14 22 L13 15 L11 15 Z", fill: "currentColor" },
    ferrule: { type: 'path', d: "M6 18h12V16H6z" },
    bristles: [
      { type: 'line', x1: 7, y1: 16, x2: 7, y2: 2 },
      { type: 'line', x1: 9, y1: 16, x2: 9, y2: 2 },
      { type: 'line', x1: 11, y1: 16, x2: 11, y2: 2 },
      { type: 'line', x1: 13, y1: 16, x2: 13, y2: 2 },
      { type: 'line', x1: 15, y1: 16, x2: 15, y2: 2 },
      { type: 'line', x1: 17, y1: 16, x2: 17, y2: 2 },
    ],
  },
  // Variation 2: Slightly fanned bristles
  {
    name: "Fanned Bristles",
    handle: { type: 'path', d: "M10 22 L14 22 L13 15 L11 15 Z", fill: "currentColor" },
    ferrule: { type: 'path', d: "M6 18h12V16H6z" },
    bristles: [
      { type: 'line', x1: 7, y1: 16, x2: 5, y2: 2 },
      { type: 'line', x1: 9, y1: 16, x2: 7, y2: 2 },
      { type: 'line', x1: 11, y1: 16, x2: 9, y2: 2 },
      { type: 'line', x1: 13, y1: 16, x2: 15, y2: 2 },
      { type: 'line', x1: 15, y1: 16, x2: 17, y2: 2 },
      { type: 'line', x1: 17, y1: 16, x2: 19, y2: 2 },
    ],
  },
  // Variation 3: V-split bristles
  {
    name: "V-Split Bristles",
    handle: { type: 'path', d: "M10 22 L14 22 L13 15 L11 15 Z", fill: "currentColor" },
    ferrule: { type: 'path', d: "M6 18h12V16H6z" },
    bristles: [
      { type: 'line', x1: 7, y1: 16, x2: 7, y2: 2 },
      { type: 'line', x1: 9, y1: 16, x2: 9, y2: 4 },
      { type: 'line', x1: 11, y1: 16, x2: 11, y2: 6 },
      { type: 'line', x1: 13, y1: 16, x2: 13, y2: 6 },
      { type: 'line', x1: 15, y1: 16, x2: 15, y2: 4 },
      { type: 'line', x1: 17, y1: 16, x2: 17, y2: 2 },
    ],
  },
  // Variation 4: Slightly curved bristles
  {
    name: "Curved Bristles",
    handle: { type: 'path', d: "M10 22 L14 22 L13 15 L11 15 Z", fill: "currentColor" },
    ferrule: { type: 'path', d: "M6 18h12V16H6z" },
    bristles: [
      { type: 'path', d: "M7 16 Q7 8 9 2" },
      { type: 'path', d: "M9 16 Q9 8 11 2" },
      { type: 'path', d: "M11 16 Q11 8 12 2" },
      { type: 'path', d: "M13 16 Q13 8 12 2" },
      { type: 'path', d: "M15 16 Q15 8 13 2" },
      { type: 'path', d: "M17 16 Q17 8 15 2" },
    ],
  },
  // Variation 5: Shorter, thicker bristles
  {
    name: "Short Thick Bristles",
    handle: { type: 'path', d: "M10 22 L14 22 L13 15 L11 15 Z", fill: "currentColor" },
    ferrule: { type: 'path', d: "M6 18h12V16H6z" },
    bristles: [
      { type: 'line', x1: 7, y1: 16, x2: 7, y2: 8, strokeWidth: 3 },
      { type: 'line', x1: 10, y1: 16, x2: 10, y2: 8, strokeWidth: 3 },
      { type: 'line', x1: 13, y1: 16, x2: 13, y2: 8, strokeWidth: 3 },
      { type: 'line', x1: 16, y1: 16, x2: 16, y2: 8, strokeWidth: 3 },
    ],
  },
  // Variation 6: Longer, thinner bristles
  {
    name: "Long Thin Bristles",
    handle: { type: 'path', d: "M10 22 L14 22 L13 15 L11 15 Z", fill: "currentColor" },
    ferrule: { type: 'path', d: "M6 18h12V16H6z" },
    bristles: [
      { type: 'line', x1: 6, y1: 16, x2: 6, y2: 0, strokeWidth: 1 },
      { type: 'line', x1: 8, y1: 16, x2: 8, y2: 0, strokeWidth: 1 },
      { type: 'line', x1: 10, y1: 16, x2: 10, y2: 0, strokeWidth: 1 },
      { type: 'line', x1: 12, y1: 16, x2: 12, y2: 0, strokeWidth: 1 },
      { type: 'line', x1: 14, y1: 16, x2: 14, y2: 0, strokeWidth: 1 },
      { type: 'line', x1: 16, y1: 16, x2: 16, y2: 0, strokeWidth: 1 },
      { type: 'line', x1: 18, y1: 16, x2: 18, y2: 0, strokeWidth: 1 },
    ],
  },
  // Variation 7: Worn/uneven tip
  {
    name: "Worn Tip Bristles",
    handle: { type: 'path', d: "M10 22 L14 22 L13 15 L11 15 Z", fill: "currentColor" },
    ferrule: { type: 'path', d: "M6 18h12V16H6z" },
    bristles: [
      { type: 'line', x1: 7, y1: 16, x2: 7, y2: 3 },
      { type: 'line', x1: 9, y1: 16, x2: 9, y2: 1 },
      { type: 'line', x1: 11, y1: 16, x2: 11, y2: 4 },
      { type: 'line', x1: 13, y1: 16, x2: 13, y2: 2 },
      { type: 'line', x1: 15, y1: 16, x2: 15, y2: 5 },
      { type: 'line', x1: 17, y1: 16, x2: 17, y2: 0 },
    ],
  },
  // Variation 8: Flyaway strand
  {
    name: "Flyaway Bristle",
    handle: { type: 'path', d: "M10 22 L14 22 L13 15 L11 15 Z", fill: "currentColor" },
    ferrule: { type: 'path', d: "M6 18h12V16H6z" },
    bristles: [
      { type: 'line', x1: 7, y1: 16, x2: 7, y2: 2 },
      { type: 'line', x1: 9, y1: 16, x2: 9, y2: 2 },
      { type: 'line', x1: 11, y1: 16, x2: 11, y2: 2 },
      { type: 'line', x1: 13, y1: 16, x2: 13, y2: 2 },
      { type: 'line', x1: 15, y1: 16, x2: 15, y2: 2 },
      { type: 'line', x1: 17, y1: 16, x2: 19, y2: 0 }, // Flyaway
    ],
  },
  // Variation 9: Angled bristles (fanned out)
  {
    name: "Angled Bristles",
    handle: { type: 'path', d: "M10 22 L14 22 L13 15 L11 15 Z", fill: "currentColor" },
    ferrule: { type: 'path', d: "M6 18h12V16H6z" },
    bristles: [
      { type: 'line', x1: 7, y1: 16, x2: 5, y2: 2 },
      { type: 'line', x1: 9, y1: 16, x2: 7, y2: 2 },
      { type: 'line', x1: 11, y1: 16, x2: 9, y2: 2 },
      { type: 'line', x1: 13, y1: 16, x2: 15, y2: 2 },
      { type: 'line', x1: 15, y1: 16, x2: 17, y2: 2 },
      { type: 'line', x1: 17, y1: 16, x2: 19, y2: 2 },
    ],
  },
  // Variation 10: Rounded tip (single path for bristles)
  {
    name: "Rounded Tip Bristles",
    handle: { type: 'path', d: "M10 22 L14 22 L13 15 L11 15 Z", fill: "currentColor" },
    ferrule: { type: 'path', d: "M6 18h12V16H6z" },
    bristles: [
      { type: 'path', d: "M7 16 V4 A2 2 0 0 1 9 2 H15 A2 2 0 0 1 17 4 V16 Z", fill: "currentColor", stroke: "none" },
    ],
  },
];
