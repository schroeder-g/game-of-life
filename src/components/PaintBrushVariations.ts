export const PAINTBRUSH_VARIATIONS: PaintBrushVariation[] = (() => {
  const variations: PaintBrushVariation[] = [];
  const handleBottomY = 56; // Fixed bottom Y coordinate of the handle
  const initialHandleTopY = 0; // Starting top Y coordinate for the shortest handle
  const handleWidth = 80; // Width of the handle
  const handleLeftX = 70; // Left X coordinate of the handle
  const handleRightX = handleLeftX + handleWidth; // Right X coordinate of the handle

  const ferruleTopY = 56; // Top Y coordinate of the ferrule
  const ferruleBottomY = 104; // Bottom Y coordinate of the ferrule
  const ferruleLeftX = 66; // Left X coordinate of the ferrule
  const ferruleRightX = 154; // Right X coordinate of the ferrule

  const bristlesPathD = "M66,104 C66,115 86,130 86,150 C86,190 94,220 110,220 C126,220 134,190 134,150 C134,130 154,115 154,104 Z";

  // Base handle length (SVG units)
  const baseHandleLength = handleBottomY - initialHandleTopY; // 56 units

  for (let i = 0; i < 10; i++) {
    // Each handle is 5% longer than the previous one.
    // The length increases from the top, pushing the topY coordinate further up (smaller value).
    const currentHandleLength = baseHandleLength * Math.pow(1.05, i);
    const handleTopY = handleBottomY - currentHandleLength;

    const handlePathD = `M${handleLeftX},${handleTopY.toFixed(2)} L${handleRightX},${handleTopY.toFixed(2)} L${handleRightX},${handleBottomY} L${handleLeftX},${handleBottomY} Z`;

    variations.push({
      name: `Handle Length ${i + 1}`,
      handle: { type: 'path', d: handlePathD, fill: "currentColor" },
      ferrule: { type: 'path', d: `M${ferruleLeftX},${ferruleTopY} L${ferruleRightX},${ferruleTopY} L${ferruleRightX},${ferruleBottomY} L${ferruleLeftX},${ferruleBottomY} Z`, fill: "none" },
      bristles: [
        { type: 'line', x1: 66, y1: 56, x2: 154, y2: 104, fill: "none" }, // Ferrule cross line 1
        { type: 'line', x1: 154, y1: 56, x2: 66, y2: 104, fill: "none" }, // Ferrule cross line 2
        { type: 'path', d: bristlesPathD, fill: "none" }, // Bristles
      ],
    });
  }
  return variations;
})();
