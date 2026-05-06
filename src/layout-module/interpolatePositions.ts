import Graph from 'graphology';
import * as alg from '../configs/algorithmicConfig.ts';
import * as vis from '../configs/visualConfig.ts';
import seedrandom from 'seedrandom';

export default function interpolatePositions(
  fullGraph: Graph,
  laidOutSubgraph: Graph
): void {

  const avgNodeSize = (vis.nodeMaxSize + vis.nodeMinSize) / 2;
  const spacing = Math.sqrt(fullGraph.order) * avgNodeSize;
  const rng = seedrandom(alg.seed);

  fullGraph.forEachNode((node) => {
    // Если узел уже имеет позицию - пропускаем
    if (laidOutSubgraph.hasNode(node)) {
      fullGraph.setNodeAttribute(node, 'x', laidOutSubgraph.getNodeAttribute(node, 'x'));
      fullGraph.setNodeAttribute(node, 'y', laidOutSubgraph.getNodeAttribute(node, 'y'));
      return;
    }

    // Находим соседей, у которых есть позиции
    let sumX = 0, sumY = 0, totalWeight = 0, count = 0;
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
          count++;
        }
      });
    }
    catch(NotFoundGraphError) {}

    if (count == 0) {
      // Изолированный узел - случайная позиция
      const angle = rng() * 2 * Math.PI;
      const r = (rng() + 0.5) * spacing;
      fullGraph.mergeNodeAttributes(node, {
        x: r * Math.cos(angle),
        y: r * Math.sin(angle)
      });
    }
    else if (count == 1) {
      // Узел со всего одним соседом - ставим рядом с соседом
      const angle = rng() * 2 * Math.PI;
      const r = (2 * rng() + 1) * avgNodeSize * 2;
      fullGraph.mergeNodeAttributes(node, {
        x: sumX + r * Math.cos(angle),
        y: sumY + r * Math.sin(angle)
      });
    }
    else {
      // Позиция = взвешенное среднее позиций соседей
      if (totalWeight == 0) totalWeight = 1;
      fullGraph.mergeNodeAttributes(node, {
        x: sumX / totalWeight,
        y: sumY / totalWeight
      });
    }
  });
}