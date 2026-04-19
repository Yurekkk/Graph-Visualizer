import Graph from 'graphology';
import * as alg from './configs/algorithmicConfig.ts';
import seedrandom from 'seedrandom';

export default function interpolatePositions(
  fullGraph: Graph,
  laidOutSubgraph: Graph
): void {

  const numNodesSqrt = Math.sqrt(fullGraph.order);
  const rng = seedrandom(alg.seed);

  fullGraph.forEachNode((node) => {
    // Если узел уже имеет позицию - пропускаем
    if (laidOutSubgraph.hasNode(node)) {
      fullGraph.setNodeAttribute(node, 'x', laidOutSubgraph.getNodeAttribute(node, 'x'));
      fullGraph.setNodeAttribute(node, 'y', laidOutSubgraph.getNodeAttribute(node, 'y'));
      return;
    }

    // Находим соседей, у которых есть позиции
    let sumX = 0, sumY = 0, totalWeight = 0;
    try {
      fullGraph.forEachNeighbor(node, (neighbor) => {
        if (laidOutSubgraph.hasNode(neighbor)) {
          let edgeId = fullGraph.edge(node, neighbor) || fullGraph.edge(neighbor, node);;
          
          // Если ребра нет - пропускаем
          if (!edgeId) return;
          
          const weight = fullGraph.getEdgeAttribute(edgeId, 'weight') || 1;

          sumX += laidOutSubgraph.getNodeAttribute(neighbor, 'x') * weight;
          sumY += laidOutSubgraph.getNodeAttribute(neighbor, 'y') * weight;
          totalWeight += weight;
        }
      });
    }
    catch(NotFoundGraphError) {}

    if (totalWeight > 0) {
      // Позиция = взвешенное среднее позиций соседей
      fullGraph.setNodeAttribute(node, 'x', sumX / totalWeight);
      fullGraph.setNodeAttribute(node, 'y', sumY / totalWeight);
    } else {
      // Изолированный узел - случайная позиция
      fullGraph.setNodeAttribute(node, 'x', (rng() - 0.5) * numNodesSqrt);
      fullGraph.setNodeAttribute(node, 'y', (rng() - 0.5) * numNodesSqrt);
    }
  });
}