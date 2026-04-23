import Graph from 'graphology';
import { toUndirected } from 'graphology-operators';
import seedrandom from 'seedrandom';
import { subgraph } from 'graphology-operators';
import * as alg from '../configs/algorithmicConfig.ts';
import * as vis from '../configs/visualConfig.ts';
import { EigenvalueDecomposition, Matrix } from 'ml-matrix';



export function getGraphCenterRadius(graph: Graph): 
  {centerX: number, centerY: number, radius: number} {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0, count = 0;

  graph.forEachNode((_, attrs) => {
    const x = attrs.x ?? 0, y = attrs.y ?? 0;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    sumX += x; sumY += y; count++;
  });

  if (count === 0) return {centerX: 0, centerY: 0, radius: 0};

  const centerX = sumX / count;
  const centerY = sumY / count;
  
  // Радиус: максимальное расстояние от центра до узла
  let radius = 0;
  graph.forEachNode((_, attrs) => {
    const dx = (attrs.x ?? 0) - centerX;
    const dy = (attrs.y ?? 0) - centerY;
    radius = Math.max(radius, dx*dx + dy*dy);
  });
  radius = Math.sqrt(radius);

  return { centerX: centerX, centerY: centerY, radius: radius };
}



export function buildCommunityGraph(graph: Graph, commId: any): Graph {
  // Строим граф сообщества
  const currCommNodes = new Set<string>();
  graph.forEachNode((node, attrs) => {
    if (attrs.community == commId)
      currCommNodes.add(node);
  });
  let commGraph = subgraph(graph, (node) => currCommNodes.has(node));
  commGraph = toUndirected(commGraph);

  // Расставляем
  const rng = seedrandom(alg.seed);
  commGraph.forEachNode((node) => {
    commGraph.updateNodeAttribute(node, 'x', _ => rng() - 0.5);
    commGraph.updateNodeAttribute(node, 'y', _ => rng() - 0.5);
  })

  return commGraph;
}



export function buildMetaGraph(graph: Graph): Graph {
  // Строим мета-граф (сообщества как узлы)
  let metaGraph = new Graph({});
  graph.forEachNode((_node, attrs) => {
    const commId = attrs.community;
    if (!metaGraph.hasNode(commId)) metaGraph.addNode(commId, {size: 1});
    else metaGraph.updateNodeAttribute(commId, 'size', n => n + 1);
  })

  // Рёбра между сообществами
  graph.forEachEdge((_, attrs, source, target) => {
    const c1 = graph.getNodeAttribute(source, 'community');
    const c2 = graph.getNodeAttribute(target, 'community');
    if (c1 && c2 && c1 != c2) {
      if (!metaGraph.hasEdge(c1, c2))
        metaGraph.addEdge(c1, c2, { weight: attrs?.weight ?? 1 });
      else metaGraph.updateEdgeAttribute(c1, c2, 'weight', 
        n => n + (attrs?.weight ?? 1));
    }
  });

  metaGraph = toUndirected(metaGraph);

  // Расставляем
  const rng = seedrandom(alg.seed);
  metaGraph.forEachNode((node) => {
    metaGraph.updateNodeAttribute(node, 'x', _ => rng() - 0.5);
    metaGraph.updateNodeAttribute(node, 'y', _ => rng() - 0.5);
  })

  return metaGraph;
}



export function setRandomCoords(graph: Graph, replaceNansOnly: boolean = false) {
  const spacing = Math.sqrt(graph.order) * (vis.nodeMaxSize + vis.nodeMinSize) * 2;
  const rng = seedrandom(alg.seed);
  graph.forEachNode((node, attrs) => {
    if (!replaceNansOnly || !attrs.x || !attrs.y) {
      graph.mergeNodeAttributes(node, {
        x: (rng() - 0.5) * spacing,
        y: (rng() - 0.5) * spacing
      });
    }
  });
}



/** Умножение матрицы Лапласа L на вектор `x`, результат в `out` */
export function laplacianMultiply(
  graph: Graph,
  idToIdx: Map<string, number>,
  nodeIds: string[],
  x: Float64Array,
  out: Float64Array
): void {
  const n = nodeIds.length;
  out.fill(0);
  for (let i = 0; i < n; i++) {
    const node = nodeIds[i];
    const neighbors = graph.neighbors(node);
    let sum = 0.0;
    for (const nb of neighbors) {
      const j = idToIdx.get(nb);
      if (j !== undefined) sum += x[j];
    }
    out[i] = neighbors.length * x[i] - sum;
  }
}



/** Нормализация вектора */
export function normalize(v: Float64Array): void {
  let norm = 0;
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm);
  if (norm > 1e-12) {
    for (let i = 0; i < v.length; i++) v[i] /= norm;
  }
}



/** Ортогонализация v относительно u (u считается нормированным) */
export function orthogonalize(v: Float64Array, u: Float64Array): void {
  let dot = 0;
  for (let i = 0; i < v.length; i++) dot += v[i] * u[i];
  for (let i = 0; i < v.length; i++) v[i] -= dot * u[i];
}



/** Решение (L - sigma*I) x = b с помощью CG (sigma < 0) */
export function solveShiftedLaplacian(
  graph: Graph,
  idToIdx: Map<string, number>,
  nodeIds: string[],
  sigma: number,
  b: Float64Array
): Float64Array {
  const n = nodeIds.length;
  const x = new Float64Array(n); // начальное приближение - нули
  const r = new Float64Array(b);
  const p = new Float64Array(b);
  const Ap = new Float64Array(n);

  let rsold = 0;
  for (let i = 0; i < n; i++) rsold += r[i] * r[i];

  for (let iter = 0; iter < alg.spectralCgMaxIterations; iter++) {
    // Ap = (L - sigma*I) * p = Lp - sigma*p
    laplacianMultiply(graph, idToIdx, nodeIds, p, Ap);
    for (let i = 0; i < n; i++) Ap[i] -= sigma * p[i];

    let pAp = 0;
    for (let i = 0; i < n; i++) pAp += p[i] * Ap[i];
    if (Math.abs(pAp) < 1e-15) break;

    const alpha = rsold / pAp;
    for (let i = 0; i < n; i++) x[i] += alpha * p[i];
    for (let i = 0; i < n; i++) r[i] -= alpha * Ap[i];

    let rsnew = 0;
    for (let i = 0; i < n; i++) rsnew += r[i] * r[i];
    if (Math.sqrt(rsnew) < alg.spectralCgTolerance) break;

    const beta = rsnew / rsold;
    for (let i = 0; i < n; i++) p[i] = r[i] + beta * p[i];
    rsold = rsnew;
  }
  return x;
}



/** Поиск одного собственного вектора (наименьшего ненулевого) методом обратной итерации */
export function findEigenvector(
  graph: Graph,
  idToIdx: Map<string, number>,
  nodeIds: string[],
  sigma: number,
  orthogonalConst: Float64Array[]
): Float64Array {
  const n = nodeIds.length;
  // начальный случайный вектор
  const v = new Float64Array(n);
  for (let i = 0; i < n; i++) v[i] = Math.random() * 2 - 1;

  // ортогонализация ко всем уже найденным векторам
  for (const u of orthogonalConst) orthogonalize(v, u);
  normalize(v);

  for (let iter = 0; iter < alg.spectralMaxIterations; iter++) {
    // решаем (L - sigma*I) x = v
    const x = solveShiftedLaplacian(graph, idToIdx, nodeIds, sigma, v);
    // новый вектор - это x, но нужно ортогонализовать и нормировать
    for (let i = 0; i < n; i++) v[i] = x[i];
    for (const u of orthogonalConst) orthogonalize(v, u);
    normalize(v);
  }
  return v;
}



/** Плотный fallback для маленьких компонент */
export function denseSpectral(
  graph: Graph,
  comp: string[],
  idToIdx: Map<string, number>,
  offsetX: number
): { xCoords: number[]; yCoords: number[] } {
  const n = comp.length;
  const L = Matrix.zeros(n, n);
  for (const node of comp) {
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
  const vecs = eig.eigenvectorMatrix;
  const indices = Array.from({ length: n }, (_, i) => i).sort((a, b) => vals[a] - vals[b]);

  const v2 = vecs.getColumnVector(indices[1]).to1DArray();
  const v3 = n >= 3 ? vecs.getColumnVector(indices[2]).to1DArray() : v2.map(() => 0);

  const minX = Math.min(...v2), maxX = Math.max(...v2);
  const minY = Math.min(...v3), maxY = Math.max(...v3);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const xCoords = new Array(n);
  const yCoords = new Array(n);
  for (let i = 0; i < n; i++) {
    xCoords[i] = ((v2[i] - minX) / rangeX - 0.5) * alg.spectralSpacing + offsetX;
    yCoords[i] = ((v3[i] - minY) / rangeY - 0.5) * alg.spectralSpacing;
  }
  return { xCoords, yCoords };
}
