import Graph from 'graphology';

interface RadialLayoutOptions {
  ringSpacing?: number;         // Расстояние между кольцами (px)
  angleOffset?: number;         // Смещение начального угла (радианы)
  sortByDegreeOnRing?: boolean; // Сортировать узлы на кольце по степени
}

export default function radialLayout(graph: Graph, opts: RadialLayoutOptions = {}) {
  const {
    ringSpacing = 1,
    sortByDegreeOnRing = true
  } = opts;

  if (graph.order === 0) return;

  // Выбор корня
  let rootNode;
  let maxDeg = -1;
  graph.forEachNode((node) => {
    const deg = graph.degree(node);
    if (deg > maxDeg) { maxDeg = deg; rootNode = node; }
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
    const radius = level * ringSpacing;
    const count = ringNodes.length;

    // Сортировка для уменьшения пересечений рёбер
    if (sortByDegreeOnRing && count > 2) {
      ringNodes.sort((a, b) => graph.degree(b) - graph.degree(a));
    }

    ringNodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / count;
      graph.setNodeAttribute(node, 'x', Math.cos(angle) * radius);
      graph.setNodeAttribute(node, 'y', Math.sin(angle) * radius);
    });
  });
}
