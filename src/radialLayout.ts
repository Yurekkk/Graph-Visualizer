import Graph from 'graphology';
import * as alg from './configs/algorithmicConfig.ts';
// import noverlap from 'graphology-layout-noverlap';

// TODO?: сделать нормальную сортировку
// Но надо ли оно теперь уже?

export default function radialLayout(graph: Graph) {

  if (graph.order === 0) return;

  // Выбор корня
  let rootNode;
  let maxKCore = -1;
  graph.forEachNode((node, attrs) => {
    const kCore = attrs.core;
    if (kCore > maxKCore) { maxKCore = kCore; rootNode = node; }
  });

  // BFS по уровням
  const rings: string[][] = [];
  const visited = new Set<string>();
  const queue: { node: string; level: number }[] = [{ node: rootNode!, level: 0 }];
  visited.add(rootNode!);

  while (queue.length > 0) {
    const { node, level } = queue.shift()!;
    if (!rings[level]) rings[level] = [];
    rings[level].push(node);

    graph.forEachNeighbor(node, (neighbor) => {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ node: neighbor, level: level + 1 });
      }
    });
  }

  // Обработка недостижимых узлов
  const fallbackLevel = rings.length;
  graph.forEachNode((node) => {
    if (!visited.has(node)) {
      if (!rings[fallbackLevel]) rings[fallbackLevel] = [];
      rings[fallbackLevel].push(node);
    }
  });

  // Расчёт координат
  rings.forEach((ringNodes, level) => {
    const radius = level * alg.radialRingSpacing;
    const count = ringNodes.length;

    // Сортировка для уменьшения пересечений рёбер
    if (alg.radialSortByDegreeOnRing && count > 2) {
      ringNodes.sort((a, b) => graph.degree(b) - graph.degree(a));
    }

    ringNodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / count;
      graph.setNodeAttribute(node, 'x', Math.cos(angle) * radius);
      graph.setNodeAttribute(node, 'y', Math.sin(angle) * radius);
    });
  });

  // noverlap.assign(graph);
}
