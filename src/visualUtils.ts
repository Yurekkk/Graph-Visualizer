import * as vis from './configs/visualConfig.ts';
import type graphMetrics from './graphMetricsInterface.ts';
import { interpolateTurbo, interpolateSinebow } from 'd3-scale-chromatic';
// import { converter, type Color } from 'culori';



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
  // Окрашиваем узлы в зависимости от номера их сообщества

  const N = metrics.numCommunities;

  // Ремап для того, чтобы близкие сообщества получили разные цвета
  // Находим step, взаимно простой с N (всегда найдётся за 0-2 итерации)
  let step = Math.floor(N * 0.61803398875);
  if (step < 1) step = 1;
  const gcd = (a: number, b: number): number => { while (b) [a, b] = [b, a % b]; return a; };
  while (gcd(step, N) !== 1) step = (step + 1) % N || 1;
  const remappedComm = (community * step) % N;

  const t = remappedComm / N; // 0.0 - 1.0
  return interpolateSinebow(t);
}



export function nodeSize(degree: number, metrics: graphMetrics): number {
  // Ставим размер узлов в зависимости от их степени 
  // (k-core решил не учитывать. Линия, например, будет смотриться стремно с k-core)
  if (metrics.maxDegree !== metrics.minDegree) {
    const ratio = (degree - metrics.minDegree) / 
                  (metrics.maxDegree - metrics.minDegree); // 0.0 - 1.0
    return (vis.nodeMaxSize - vis.nodeMinSize) * ratio + vis.nodeMinSize;
  }
  else return vis.edgeDefaultSize;
}



export function edgeColor(weight: number, importance: number, metrics: graphMetrics): string {
  // Окрашиваем ребра в зависимости от их веса или важности
  let t;
  if (metrics.maxEdgeWeight !== metrics.minEdgeWeight)
    t = (weight - metrics.minEdgeWeight) / 
      (metrics.maxEdgeWeight - metrics.minEdgeWeight); // 0.0 - 1.0
  // else 
  //   t = (importance - metrics.minEdgeImportance!) / 
  //     (metrics.maxEdgeImportance! - metrics.minEdgeImportance!); // 0.0 - 1.0
  else t = 0;
  t += vis.edgeMinTurboT * (1 - t); // vis.edgeMinTurboT - 1.0
  return interpolateTurbo(t);

  /*
  let hue;
  if (metrics.maxEdgeWeight !== metrics.minEdgeWeight) {
    const ratio = (weight - metrics.minEdgeWeight) / 
                  (metrics.maxEdgeWeight - metrics.minEdgeWeight); // 0.0 - 1.0
    hue = (vis.edgeMaxHue - vis.edgeMinHue) * 
          (1 - ratio) + vis.edgeMinHue; // синий - красный
  }
  else hue = vis.edgeDefaultHue;

  const color: Color = { 
    mode: 'oklch', 
    l: vis.edgeLightness,
    c: vis.edgeChroma,
    h: hue
  };

  let {r: r, g: g, b: b} = converter('rgb')(color);
  r = Math.max(0.0, (Math.min(1.0, r)));
  g = Math.max(0.0, (Math.min(1.0, g)));
  b = Math.max(0.0, (Math.min(1.0, b)));

  r = Math.round(255 * r);
  g = Math.round(255 * g);
  b = Math.round(255 * b);

  return `rgb(${r}, ${g}, ${b})`;
  */
}



export function edgeSize(weight: number, importance: number, metrics: graphMetrics): number {
  // Ставим ширину ребер в зависимости от их веса или важности
  let ratio;
  if (metrics.maxEdgeWeight !== metrics.minEdgeWeight)
    ratio = (weight - metrics.minEdgeWeight) / 
      (metrics.maxEdgeWeight - metrics.minEdgeWeight); // 0.0 - 1.0
  // else 
  //   ratio = (importance - metrics.minEdgeImportance!) / 
  //     (metrics.maxEdgeImportance! - metrics.minEdgeImportance!); // 0.0 - 1.0
  else return vis.edgeDefaultSize;
  return (vis.edgeMaxSize - vis.edgeMinSize) * ratio + vis.edgeMinSize;
}
