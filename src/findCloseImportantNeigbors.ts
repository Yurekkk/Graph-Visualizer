import Graph from "graphology";

export default function findCloseImportantNeighbours(
  selectedNodeId: string, graph: Graph, maxCost: number = 1.0): string[] {
    
  // Расстояние от выбранного узла до всех достижимых
  const dist = new Map<string, number>([[selectedNodeId, 0]]);
  // Очередь для Дейкстры: [узел, накопленная_стоимость]
  const queue: { node: string; cost: number }[] = [{ node: selectedNodeId, cost: 0 }];

  while (queue.length > 0) {
    // Извлекаем узел
    const { node, cost } = queue.splice(0, 1)[0];

    // Если вышли за порог "близости", не идём дальше по этой ветке
    if (cost > maxCost) continue;

    // Релаксация соседей
    graph.forEachNeighbor(node, (neighbor, attrs) => {
      const weight = attrs?.weight ?? 1;
      const edgeCost = 1 / (weight || 1e-9); // защита от деления на 0
      const newCost = cost + edgeCost;

      if (!dist.has(neighbor) || newCost < dist.get(neighbor)!) {
        dist.set(neighbor, newCost);
        queue.push({ node: neighbor, cost: newCost });
      }
    });
  }

  return Array.from(dist.entries())
    .filter(([id]) => id !== selectedNodeId)
    // .sort((a, b) => a[1] - b[1]) // Сортируем: чем меньше накопленная стоимость, тем важнее узел
    .map(([id]) => id);
}