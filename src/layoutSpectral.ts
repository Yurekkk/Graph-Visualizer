import type Graph from 'graphology';
import { Matrix, EigenvalueDecomposition } from 'ml-matrix';
import { connectedComponents } from 'graphology-components';
import * as alg from './configs/algorithmicConfig.ts';
import noverlap from 'graphology-layout-noverlap';

export interface SpectralLayoutOptions {
  attrX?: string;
  attrY?: string;
  scale?: number;
  maxNodesPerComponent?: number;
}

export default function layoutSpectral(graph: Graph, options: SpectralLayoutOptions = {}): void {
  const { attrX = 'x', attrY = 'y', scale = 10, maxNodesPerComponent = 600 } = options;

  // Компоненты связности (возвращает string[][])
  const components = connectedComponents(graph);
  let offsetX = 0;

  for (const comp of components) {
    const n = comp.length;
    if (n === 0) continue;

    // Фоллбэк для <3 узлов (спектр не определён)
    if (n < 3) {
      const radius = scale * 0.5;
      comp.forEach((id, i) => {
        const angle = (2 * Math.PI * i) / n;
        graph.setNodeAttribute(id, attrX, offsetX + radius * Math.cos(angle));
        graph.setNodeAttribute(id, attrY, radius * Math.sin(angle));
      });
      offsetX += scale * 1.2;
      continue;
    }

    if (n > maxNodesPerComponent) {
      console.warn(`[Spectral] Component size ${n} exceeds limit. Use force-directed fallback.`);
      continue;
    }

    // Маппинг ID → 0..n-1
    const idToIdx = new Map<string, number>();
    comp.forEach((id, i) => idToIdx.set(id, i));

    // Лапласиан L = D - A
    const L = Matrix.zeros(n, n);
    for (const node of comp) {
      const i = idToIdx.get(node)!;
      const neighbors = graph.neighbors(node);
      L.set(i, i, neighbors.length);
      for (const nb of neighbors) {
        if (idToIdx.has(nb)) {
          const j = idToIdx.get(nb)!;
          L.set(i, j, -1);
        }
      }
    }

    // Собственное разложение
    let eig: EigenvalueDecomposition;
    try {
      eig = new EigenvalueDecomposition(L, { assumeSymmetric: true });
    } catch {
      console.warn('[Spectral] Eigendecomposition failed.');
      continue;
    }

    // Сортировка по возрастанию собственных значений
    const eigenvalues = eig.realEigenvalues;
    const eigMatrix = eig.eigenvectorMatrix;
    const sortedIndices = Array.from({ length: n }, (_, i) => i)
      .sort((a, b) => eigenvalues[a] - eigenvalues[b]);

    // Извлечение 2-го и 3-го векторов
    const v2 = eigMatrix.getColumnVector(sortedIndices[1]).to1DArray();
    const v3 = eigMatrix.getColumnVector(sortedIndices[2] ?? sortedIndices[1]).to1DArray();

    // Нормализация в [-0.5, 0.5] × scale
    const minX = Math.min(...v2), maxX = Math.max(...v2);
    const minY = Math.min(...v3), maxY = Math.max(...v3);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    for (let i = 0; i < n; i++) {
      const nodeId = comp[i];
      const nx = ((v2[i] - minX) / rangeX - 0.5) * scale + offsetX;
      const ny = ((v3[i] - minY) / rangeY - 0.5) * scale;
      graph.setNodeAttribute(nodeId, attrX, nx * alg.spectralSpacing);
      graph.setNodeAttribute(nodeId, attrY, ny * alg.spectralSpacing);
    }

    offsetX += scale * 1.5; // Сдвиг для следующей компоненты
  }

  noverlap.assign(graph);
}