import Graph from "graphology";
import * as alg from './configs/algorithmicConfig.ts';
import type graphMetrics from './graphMetricsInterface.ts';
import { MinPriorityQueue } from '@datastructures-js/priority-queue';

// TODO?: Учитывать importance вместо degree
// TODO: В целом сделать работоспособным

export default function findCloseImportantNeighbours(
  selectedNodeId: string, graph: Graph, metrics: graphMetrics): string[] {
  // С помощью алгоритма Дейкстры ищем максимум alg.maxHighlightedNeighborsNum узлов,
  // цена у которых не больше alg.maxAccumulatedCost
    
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
      const edgeCost = costFunc(graph, neighbor, weight);
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
  const weightsAreDifferent = (metrics.maxEdgeWeight != metrics.minEdgeWeight);

  // Функция учитывает вес ребра и степень узла, в который идет ребро

  // Для веса ребра:
  // По сути отрицательная экспонента e^(-w), но чтобы она проходила через
  // точки (minEdgeWeight, minWeightCost) и (maxEdgeWeight, maxWeightCost)
  let growth: number, amplitude: number;
  if (weightsAreDifferent) {
    growth = Math.log(alg.maxWeightCost / alg.minWeightCost) / 
      (metrics.maxEdgeWeight - metrics.minEdgeWeight);
    amplitude = alg.minWeightCost / Math.exp(growth * metrics.minEdgeWeight);
  }

  return (graph: Graph, neighbor: string, w: number) => {
    // Чем больше узел является хабом, тем большую выжность он представляет
    const degCent = graph.getNodeAttribute(neighbor, 'degreeCentrality');
    const degreeFactor = alg.degreeInfluence * (1 - degCent);

    let weightFactor;
    if (weightsAreDifferent)
      weightFactor = amplitude * Math.exp(growth * w);
    else weightFactor = alg.minWeightCost / 3;
    
    return weightFactor + degreeFactor;
  }
}