import type Graph from "graphology";
import * as alg from '../configs/algorithmicConfig.ts';



export function calculateNodesImportance(graph: Graph) {
  const stats = { 
    deg: { min: Infinity, max: -Infinity },
    k:   { min: Infinity, max: -Infinity },
    eig: { min: Infinity, max: -Infinity }
  };

  // Собираем максимумы и минимумы
  graph.forEachNode(node => {
    const deg = graph.getNodeAttribute(node, 'degree') ?? 0;
    const k   = graph.getNodeAttribute(node, 'core') ?? 0;
    const eig = graph.getNodeAttribute(node, 'eigenvectorCentrality') ?? 0;

    stats.deg.min = Math.min(stats.deg.min, deg);
    stats.deg.max = Math.max(stats.deg.max, deg);
    stats.k.min   = Math.min(stats.k.min,   k);
    stats.k.max   = Math.max(stats.k.max,   k);
    stats.eig.min = Math.min(stats.eig.min, eig);
    stats.eig.max = Math.max(stats.eig.max, eig);
  });

  // Нормализация [0,1] + взвешивание
  graph.forEachNode((node, attrs) => {
    const norm = (val: number, s: { min: number; max: number }) =>
      s.max === s.min ? 1 : (val - s.min) / (s.max - s.min);

    const importance = alg.degreeWeight * norm(attrs.degree, stats.deg) +
                       alg.kCoreWeight * norm(attrs.core, stats.k) + 
                       alg.eigenvectorCentralityWeight * norm(attrs.eigenvectorCentrality, stats.eig);

    graph.setNodeAttribute(node, 'importance', importance);
  });
}



export function calculateEdgesImportance(graph: Graph) {
  // Вычисляет важность каждого ребра и возвращает 
  // максимальную, минимальную и среднюю их важность
  
  let maxEdgeImportance = -Infinity;
  let minEdgeImportance = Infinity;
  let avgEdgeImportance = 0;
  let count = 0;

  graph.forEachEdge((_edge, attrs, source, target) => {
    const sourceImportance = graph.getNodeAttribute(source, 'importance');
    const targetImportance = graph.getNodeAttribute(target, 'importance');

    const edgeImportance = (2 * sourceImportance * targetImportance) / 
      ((sourceImportance + targetImportance) || 1e+12);
    attrs.importance = edgeImportance;

    maxEdgeImportance = Math.max(edgeImportance, maxEdgeImportance);
    minEdgeImportance = Math.min(edgeImportance, minEdgeImportance);

    avgEdgeImportance += (edgeImportance - avgEdgeImportance) / ++count;
  })
  return {minEdgeImportance, maxEdgeImportance, avgEdgeImportance};
}

