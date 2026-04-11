import * as vis from './configs/visualConfig.ts';
import type graphMetrics from './graphMetricsInterface.ts';



export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h = h % 360;
  s = s / 100;
  v = v / 100;

  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;

  if (h < 60)      { r = c; g = x; b = 0; }
  else if (h < 120){ r = x; g = c; b = 0; }
  else if (h < 180){ r = 0; g = c; b = x; }
  else if (h < 240){ r = 0; g = x; b = c; }
  else if (h < 300){ r = x; g = 0; b = c; }
  else             { r = c; g = 0; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}



export function hexToRgb(color: string): { r: number; g: number; b: number } {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const bigint = parseInt(hex.length === 3 
      ? hex.split('').map(c => c + c).join('') 
      : hex, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  }
  
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3]),
    };
  }
  
  // Fallback
  return { r: 128, g: 128, b: 128 };
}



export function blendWithBackground(
  fgColor: string, // hex
  bgColor: string, // hex
  alpha: number
): string {
  const fg = hexToRgb(fgColor);
  const bg = hexToRgb(bgColor);
  
  // Alpha compositing: result = fg * alpha + bg * (1 - alpha)
  const r = fg.r * alpha + bg.r * (1 - alpha);
  const g = fg.g * alpha + bg.g * (1 - alpha);
  const b = fg.b * alpha + bg.b * (1 - alpha);
  
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}



export function nodeColor(community: number, metrics: graphMetrics): string {
  const hue = (community / metrics.numCommunities) * 360;
  const {r, g, b} = hsvToRgb(hue, vis.nodeSaturation, vis.nodeValue);
  return `rgb(${r}, ${g}, ${b})`;
}



export function nodeSize(degree: number, metrics: graphMetrics): number {
  // Ставим размер узлов в зависимости от их степени
  if (metrics.maxDegree !== metrics.minDegree) {
    const ratio = (degree - metrics.minDegree) / 
                  (metrics.maxDegree - metrics.minDegree); // 0.0 - 1.0
    return (vis.nodeMaxSize - vis.nodeMinSize) * ratio + vis.nodeMinSize;
  }
  else return vis.edgeDefaultSize;
}



export function edgeColor(weight: number, metrics: graphMetrics): string {
  // Окрашиваем ребра в зависимости от их веса
  let hue;
  if (metrics.maxEdgeWeight !== metrics.minEdgeWeight) {
    const ratio = (weight - metrics.minEdgeWeight) / 
                  (metrics.maxEdgeWeight - metrics.minEdgeWeight); // 0.0 - 1.0
    hue = (vis.edgeMaxHue - vis.edgeMinHue) * 
          (1 - ratio) + vis.edgeMinHue; // синий - красный
  }
  else hue = vis.edgeDefaultHue;
  const {r, g, b} = hsvToRgb(hue, vis.edgeSaturation, vis.edgeValue);
  return `rgb(${r}, ${g}, ${b})`;
}



export function edgeSize(weight: number, metrics: graphMetrics): number {
  // Ставим ширину ребер в зависимости от их веса
  if (metrics.maxEdgeWeight !== metrics.minEdgeWeight) {
    const ratio = (weight - metrics.minEdgeWeight) / 
                  (metrics.maxEdgeWeight - metrics.minEdgeWeight); // 0.0 - 1.0
    return (vis.edgeMaxSize - vis.edgeMinSize) * ratio + vis.edgeMinSize;
  }
  else return vis.edgeDefaultSize;
}
