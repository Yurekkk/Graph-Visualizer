import Graph from 'graphology';
import { connectedComponents } from 'graphology-components';
import * as alg from '../configs/algorithmicConfig';
import { findEigenvector, laplacianMultiply } from '../utilsAlgorithmic';
import { EigenvalueDecomposition, Matrix } from 'ml-matrix';

/**
 * Вычисляет спектральный зазор (λ₂) всего графа.
 * Если граф несвязен, возвращает 0.
 * Использует итеративный метод (обратная итерация + CG) для больших графов
 * и плотное разложение для маленьких (n <= denseThreshold).
 */
export default function computeSpectralGap(graph: Graph): number {
  const components = connectedComponents(graph);
  if (components.length > 1) return 0; // несвязный граф ⇒ λ₂ = 0

  const nodes = graph.nodes();
  const n = nodes.length;
  if (n <= 1) return 0;

  // Маппинг для быстрого доступа
  const idToIdx = new Map<string, number>();
  nodes.forEach((id, i) => idToIdx.set(id, i));

  // Для очень маленьких графов используем плотный метод (быстрее)
  if (n <= alg.spectralDenseThreshold) {
    const L = Matrix.zeros(n, n);
    for (const node of nodes) {
      const i = idToIdx.get(node)!;
      const neighbors = graph.neighbors(node);
      L.set(i, i, neighbors.length);
      for (const nb of neighbors) {
        const j = idToIdx.get(nb);
        if (j !== undefined) L.set(i, j, -1);
      }
    }
    const eig = new EigenvalueDecomposition(L, { assumeSymmetric: true });
    const vals = eig.realEigenvalues;
    // vals уже могут быть не отсортированы, но можно найти минимальное > 1e-9
    const sorted = Array.from(vals).sort((a, b) => a - b);
    // первое ≥ 0 — нулевое, второе — искомое
    return sorted[1] ?? 0;
  }

  // Итеративный метод
  const sigma = -0.5;
  const ones = new Float64Array(n).fill(1.0 / Math.sqrt(n));

  const v2 = findEigenvector(
    graph, idToIdx, nodes,
    sigma, [ones]
  );

  // Частное Рэлея: λ₂ = (vᵀ L v) / (vᵀ v)
  const Lv = new Float64Array(n);
  laplacianMultiply(graph, idToIdx, nodes, v2, Lv);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += v2[i] * Lv[i];
    den += v2[i] * v2[i];
  }
  const lambda2 = num / den;
  return Math.max(0, lambda2); // защита от отрицательной численной погрешности
}
