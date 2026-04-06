import Graph from "graphology";
import * as alg from './configs/algorithmicConfig.ts';
import type graphMetrics from './graphMetricsInterface.ts';
import { MinPriorityQueue } from '@datastructures-js/priority-queue';

export default function findCloseImportantNeighbours(
  selectedNodeId: string, graph: Graph, metrics: graphMetrics): string[] {
    
  // Расстояние от выбранного узла до всех достижимых
  const dist = new Map<string, number>([[selectedNodeId, 0]]);
  // Очередь для Дейкстры: [узел, накопленная_стоимость]
  const queue = new MinPriorityQueue<{ node: string; cost: number }>(x => x.cost);
  queue.enqueue({ node: selectedNodeId, cost: 0 });
  // Найденные важные соседи
  const result: string[] = [];

  const costFunc = buildCostFunction(metrics);

  while (!queue.isEmpty() && result.length < alg.maxHighlightedNeighborsNum) {
    // Извлекаем узел
    const { node, cost } = queue.dequeue()!;

    // Пропускаем устаревшие записи (стандартная "ленивая" проверка Дейкстры)
    if (dist.has(node) && cost > dist.get(node)!) continue;

    // Если вышли за порог стоимости, не идём дальше по этой ветке
    if (cost > alg.maxAccumulatedCost) continue;

    // Релаксация соседей
    graph.forEachEdge(node, (_edge, attrs, source, target) => {
      const neighbor = source !== node ? source : target;

      const weight = attrs?.weight ?? 1;
      const edgeCost = costFunc(weight);
      const newCost = cost + edgeCost;

      if (!dist.has(neighbor) || newCost < dist.get(neighbor)!) {
        dist.set(neighbor, newCost);
        queue.push({ node: neighbor, cost: newCost });
      }
    });

    if (node !== selectedNodeId)
      result.push(node);
  }

  return result;
}

function buildCostFunction(metrics: graphMetrics) {
  if (metrics.maxEdgeWeight == metrics.minEdgeWeight)
    return (_w: number) => {return alg.minWeightCost};

  // По сути отрицательная экспнента e^(-w), но чтобы она проходила через
  // точки (minEdgeWeight,minWeightCost) и (maxEdgeWeight, maxWeightCost)
  const growth = Math.log(alg.maxWeightCost / alg.minWeightCost) / 
    (metrics.maxEdgeWeight - metrics.minEdgeWeight);
  const amplitude = alg.minWeightCost / Math.exp(growth * metrics.minEdgeWeight);

  return (w: number) => {return amplitude * Math.exp(growth * w);}
}