/**
 * Helper functions for SVG Pie & Donut chart mathematics.
 * Accurately calculates angles, arc paths, and geometries with zero external libraries.
 */

export function calculatePieSlices({
  slices,
  cx = 80,
  cy = 80,
  outerRadius = 74,
  innerRadius = 48,
  padAngle = 0.03, // Small angular gap between slices for clean separation
}) {
  const total = slices.reduce((acc, s) => acc + (Number(s.value) || 0), 0);

  if (total <= 0 || slices.length === 0) {
    return [];
  }

  // Handle single slice (100% circle)
  const nonZeroSlices = slices.filter((s) => Number(s.value) > 0);
  if (nonZeroSlices.length === 1) {
    const single = nonZeroSlices[0];
    const path = [
      `M ${cx} ${cy - outerRadius}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${cx} ${cy + outerRadius}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${cx} ${cy - outerRadius}`,
      `M ${cx} ${cy - innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy + innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy - innerRadius}`,
      "Z",
    ].join(" ");

    return [
      {
        ...single,
        path,
        startAngle: -Math.PI / 2,
        endAngle: (3 * Math.PI) / 2,
        midAngle: Math.PI / 2,
      },
    ];
  }

  let currentAngle = -Math.PI / 2; // Start from 12 o'clock

  return slices.map((slice) => {
    const val = Number(slice.value) || 0;
    const fraction = val / total;
    const sliceAngle = fraction * 2 * Math.PI;

    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    // Apply pad angle if slice is large enough
    const effectivePad = sliceAngle > padAngle * 2 ? padAngle : 0;
    const paddedStart = startAngle + effectivePad / 2;
    const paddedEnd = endAngle - effectivePad / 2;

    const x1 = cx + outerRadius * Math.cos(paddedStart);
    const y1 = cy + outerRadius * Math.sin(paddedStart);

    const x2 = cx + outerRadius * Math.cos(paddedEnd);
    const y2 = cy + outerRadius * Math.sin(paddedEnd);

    const x3 = cx + innerRadius * Math.cos(paddedEnd);
    const y3 = cy + innerRadius * Math.sin(paddedEnd);

    const x4 = cx + innerRadius * Math.cos(paddedStart);
    const y4 = cy + innerRadius * Math.sin(paddedStart);

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

    const path = [
      `M ${x1.toFixed(3)} ${y1.toFixed(3)}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`,
      `L ${x3.toFixed(3)} ${y3.toFixed(3)}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4.toFixed(3)} ${y4.toFixed(3)}`,
      "Z",
    ].join(" ");

    const midAngle = (startAngle + endAngle) / 2;

    return {
      ...slice,
      path,
      startAngle,
      endAngle,
      midAngle,
    };
  });
}
