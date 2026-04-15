import Graph from "graphology";
import * as alg from './configs/algorithmicConfig.ts';
import type graphMetrics from './graphMetricsInterface.ts';
import { MinPriorityQueue } from '@datastructures-js/priority-queue';



export default function findCloseImportantNeighbours(
  selectedNodeId: string, graph: Graph, metrics: graphMetrics): 
  { importantNodes: Map<string, number>, importantEdges: Map<string, number> } {
  // С помощью алгоритма Дейкстры ищем максимум alg.maxHighlightedNeighborsNum узлов,
  // цена у которых не больше alg.maxAccumulatedCost
    
  // Расстояние от выбранного узла до всех достижимых
  const dist = new Map<string, number>([[selectedNodeId, 0]]);
  // Очередь для Дейкстры: [узел, накопленная стоимость, ребро по которому пришли]
  const queue = new MinPriorityQueue<{ node: string; cost: number, edge: string }>(x => x.cost);
  queue.enqueue({ node: selectedNodeId, cost: 0, edge: '' });

  // Найденные важные соседи и их важности
  const resultNodes = new Map<string, number>(); 
  // Встреченные ребра на пути и их важности
  const resultEdges = new Map<string, number>(); 

  const costFunc = buildCostFunction(metrics);

  while (!queue.isEmpty() && resultNodes.size < alg.maxHighlightedNeighborsNum) {
    // Извлекаем узел
    const { node, cost, edge } = queue.dequeue()!;

    // Пропускаем устаревшие записи (стандартная "ленивая" проверка Дейкстры)
    if (dist.has(node) && cost > dist.get(node)!) continue;

    // Если вышли за порог стоимости, не идём дальше по этой ветке
    if (cost > alg.maxAccumulatedCost) continue;

    // Релаксация соседей
    graph.forEachEdge(node, (newEdge, attrs, source, target) => {
      const neighbor = source !== node ? source : target;

      const weight = attrs?.weight ?? 1;
      const neighborImportance = graph.getNodeAttribute(neighbor, 'importance');
      const edgeCost = costFunc(neighborImportance, weight);
      const newCost = cost + edgeCost;

      if (!dist.has(neighbor) || newCost < dist.get(neighbor)!) {
        dist.set(neighbor, newCost);
        queue.push({ node: neighbor, cost: newCost, edge: newEdge });
      }
    });

    if (node !== selectedNodeId) {
      resultNodes.set(node, 1 / (cost || 1e-15));
      resultEdges.set(edge, 1 / (cost || 1e-15));
    }
  }

  return { importantNodes: resultNodes, importantEdges: resultEdges };
}



function buildCostFunction(metrics: graphMetrics) {
  const weightsAreDifferent = (metrics.maxEdgeWeight != metrics.minEdgeWeight);

  // Функция учитывает вес ребра и важность узла, в который идет ребро

  // Для веса ребра:
  // По сути отрицательная экспонента e^(-w), но чтобы она проходила через
  // точки (minEdgeWeight, minWeightCost) и (maxEdgeWeight, maxWeightCost)
  let growth: number, amplitude: number;
  if (weightsAreDifferent) {
    growth = Math.log(alg.maxWeightCost / alg.minWeightCost) / 
      (metrics.maxEdgeWeight - metrics.minEdgeWeight);
    amplitude = alg.minWeightCost / Math.exp(growth * metrics.minEdgeWeight);
  }

  return (neighborImportance: number, w: number) => {
    const importanceFactor = neighborImportance * alg.nodeImportanceInfluence;

    let weightFactor;
    if (weightsAreDifferent)
      weightFactor = amplitude * Math.exp(growth * w);
    else weightFactor = alg.minWeightCost / 3;
    
    return weightFactor + importanceFactor;
  }
}