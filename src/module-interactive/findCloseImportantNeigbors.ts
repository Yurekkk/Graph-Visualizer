import Graph from "graphology";
import * as alg from '../configs/algorithmicConfig.ts';
import type graphMetrics from '../module-metrics/graphMetricsInterface.ts';
import { MinPriorityQueue } from '@datastructures-js/priority-queue';

// Учитывать Евклидово расстояние все же не очень, так оно пропустит удаленные хабы

export default function findCloseImportantNeighbours(
  selectedNodeId: string, graph: Graph, metrics: graphMetrics): 
  { importantNodes: Map<string, number>, importantEdges: Map<string, number> } {
  // С помощью алгоритма Дейкстры ищем максимум alg.maxHighlightedNeighborsNum узлов,
  // цена у которых не больше alg.maxAccumulatedCost
    
  // Расстояние от выбранного узла до всех достижимых
  const dist = new Map<string, number>([[selectedNodeId, 0]]);
  // Очередь для Дейкстры: [узел, важность узла, накопленная стоимость, ребро по которому пришли]
  const queue = new MinPriorityQueue<{ 
    node: string; 
    importance: number; 
    accumulatedCost: number; 
    edge: string 
  }>(
    // Даем приоритет направлениям с наименьшей накопленной стоимостью и наибольшей важностью
    // Важность ценим выше
    x => x.accumulatedCost - alg.importanceInfluence * x.importance
  );
  queue.enqueue({ 
    node: selectedNodeId, 
    importance: graph.getNodeAttribute(selectedNodeId, "importance"), 
    accumulatedCost: 0, 
    edge: '' 
  });

  // Найденные важные соседи и их важности
  const resultNodes = new Map<string, number>(); 
  // Встреченные ребра на пути и их важности
  const resultEdges = new Map<string, number>(); 

  const costFunc = buildCostFunction(metrics);

  while (!queue.isEmpty() && resultNodes.size < alg.maxHighlightedNeighborsNum) {
    // Извлекаем узел
    const { node, importance, accumulatedCost, edge } = queue.dequeue()!;

    // Пропускаем устаревшие записи (стандартная "ленивая" проверка Дейкстры)
    if (dist.has(node) && accumulatedCost > dist.get(node)!) continue;

    // Если вышли за порог стоимости, не идём дальше по этой ветке
    if (accumulatedCost > alg.maxAccumulatedCost) continue;

    // Релаксация соседей
    graph.forEachEdge(node, (newEdge, attrs, source, target) => {
      const neighbor = source !== node ? source : target;

      const weight = attrs?.weight ?? 1;
      const neighborImportance = graph.getNodeAttribute(neighbor, 'importance');
      const edgeCost = costFunc(neighborImportance, weight);
      const newCost = accumulatedCost + edgeCost;

      // Не идем дальше, если важность узла начинает падать
      if (node !== selectedNodeId && neighborImportance < importance) 
        return;

      if (!dist.has(neighbor) || newCost < dist.get(neighbor)!) {
        dist.set(neighbor, newCost);
        queue.push({ 
          node: neighbor, 
          importance: neighborImportance, 
          accumulatedCost: newCost, 
          edge: newEdge 
        });
      }
    });

    if (node !== selectedNodeId) {
      resultNodes.set(node, 1 / (accumulatedCost || 1e-15));
      resultEdges.set(edge, 1 / (accumulatedCost || 1e-15));
    }
  }

  return { importantNodes: resultNodes, importantEdges: resultEdges };
}



function buildCostFunction(metrics: graphMetrics) {
  const weightsAreSame = (metrics.maxEdgeWeight == metrics.minEdgeWeight);

  // Функция учитывает вес ребра и важность узла, в который идет ребро
  // cost = (1.5 - weightNorm) * (1.5 - importance)
  // каждый множитель в [0.5, 1.5], cost в [0.25, 2.25]

  return (importance: number, w: number) => {
    const weightFactor = weightsAreSame ? 1 : 
      1.5 - (w - metrics.minEdgeWeight) / (metrics.maxEdgeWeight - metrics.minEdgeWeight);
    return weightFactor * (1.5 - importance);
  }
}
