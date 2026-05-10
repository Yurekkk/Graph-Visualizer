import Graph from 'graphology';
import type FilteredGraph from '../misc/filteredGraph';

export default function interpolatePositions(
  fullGraph: Graph,
  laidOutSubgraph: FilteredGraph
): void {

  fullGraph.forEachNode((node) => {
    // Если узел уже имеет позицию - пропускаем
    if (laidOutSubgraph.hasNode(node)) return;

    // Находим соседей, у которых есть позиции
    let sumX = 0, sumY = 0, totalWeight = 0, count = 0;
    try {
      fullGraph.forEachNeighbor(node, (neighbor) => {
        if (laidOutSubgraph.hasNode(neighbor)) {
          let edgeId = fullGraph.edge(node, neighbor) || fullGraph.edge(neighbor, node);
          
          // Если ребра нет - пропускаем
          if (!edgeId) return;
          
          const weight = fullGraph.getEdgeAttribute(edgeId, 'weight') || 1;

          sumX += laidOutSubgraph.getNodeAttribute(neighbor, 'x') * weight;
          sumY += laidOutSubgraph.getNodeAttribute(neighbor, 'y') * weight;
          totalWeight += weight;
          count++;
        }
      });
    }
    catch(NotFoundGraphError) {}

    if (count > 1) {
      // Позиция = взвешенное среднее позиций соседей
      if (totalWeight == 0) totalWeight = 1;
      fullGraph.mergeNodeAttributes(node, {
        x: sumX / totalWeight,
        y: sumY / totalWeight
      });
    }
  });
}
