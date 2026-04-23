import * as vis from './configs/visualConfig.ts';
import type graphMetrics from './metric-module/graphMetricsInterface.ts';
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
  // Смешиваем цвет узлов и ребер с цветом фона в зависимости от альфы
  // WebGL через жопу поддерживает альфа-канал, поэтому так

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

  const N = metrics.numCommunities!;

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



export function edgeColorInterpolate(value: number, maxValue: number, minValue: number) {
  let t;
  if (maxValue !== minValue)
    t = (value - minValue) / (maxValue - minValue); // 0.0 - 1.0
  else t = 0.5;
  t += vis.edgeMinTurboT * (1 - t); // vis.edgeMinTurboT - 1.0
  return interpolateTurbo(t);
}



export function edgeSizeInterpolate(value: number, maxValue: number, minValue: number) {
  let ratio;
  if (maxValue !== minValue)
    ratio = (value - minValue) / (maxValue - minValue); // 0.0 - 1.0
  else ratio = 0.5;
  return (vis.edgeMaxSize - vis.edgeMinSize) * ratio + vis.edgeMinSize;
}



export function edgeColor(weight: number, importance: number, metrics: graphMetrics): string {
  // Окрашиваем ребра в зависимости от их веса или важности
  if (metrics.maxEdgeWeight !== metrics.minEdgeWeight)
    return edgeColorInterpolate(weight, metrics.maxEdgeWeight, metrics.minEdgeWeight);
  else return edgeColorInterpolate(importance, metrics.maxEdgeImportance!, metrics.minEdgeImportance!);
}



export function edgeSize(weight: number, importance: number, metrics: graphMetrics): number {
  // Ставим ширину ребер в зависимости от их веса или важности
  if (metrics.maxEdgeWeight !== metrics.minEdgeWeight)
    return edgeSizeInterpolate(weight, metrics.maxEdgeWeight, metrics.minEdgeWeight);
  else return edgeSizeInterpolate(importance, metrics.maxEdgeImportance!, metrics.minEdgeImportance!);
}



/*
export function applyAlpha(color: string, alpha: number): string {
  if (alpha >= 1 || !color) return color;
  // rgb() -> rgba()
  const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
  return color;
}
*/
