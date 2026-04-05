import Graph from "graphology";

export default function findCloseImportantNeighbours(
  selectedNodeId: string, graph: Graph, maxCost: number = 1.0): string[] {
    
  // Расстояние от выбранного узла до всех достижимых
  const dist = new Map<string, number>([[selectedNodeId, 0]]);
  // Очередь для Дейкстры: [узел, накопленная_стоимость]
  const queue: { node: string; cost: number }[] = [{ node: selectedNodeId, cost: 0 }];

  while (queue.length > 0) {
    // Извлекаем узел с минимальной стоимостью (линейный поиск для простоты)
    let minIdx = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i].cost < queue[minIdx].cost) minIdx = i;
    }
    const { node: u, cost } = queue.splice(minIdx, 1)[0];

    // Если вышли за порог "близости", не идём дальше по этой ветке
    if (cost > maxCost) continue;

    // Релаксация соседей
    graph.forEachNeighbor(u, (v, attrs) => {
      const weight = attrs?.weight ?? 1;
      const edgeCost = 1 / Math.max(weight, 1e-9); // защита от деления на 0
      const newCost = cost + edgeCost;

      if (!dist.has(v) || newCost < dist.get(v)!) {
        dist.set(v, newCost);
        queue.push({ node: v, cost: newCost });
      }
    });
  }

  return Array.from(dist.entries())
    .filter(([id]) => id !== selectedNodeId)
    // .sort((a, b) => a[1] - b[1]) // Сортируем: чем меньше накопленная стоимость, тем важнее узел
    .map(([id]) => id);
}