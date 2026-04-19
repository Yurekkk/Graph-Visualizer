import Graph from 'graphology';
import { toUndirected } from 'graphology-operators';
import seedrandom from 'seedrandom';
import { subgraph } from 'graphology-operators';
import * as alg from './configs/algorithmicConfig.ts';
import * as vis from './configs/visualConfig.ts';



export function getGraphCenterRadius(graph: Graph): 
  {centerX: number, centerY: number, radius: number} {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0, count = 0;

  graph.forEachNode((_, attrs) => {
    const x = attrs.x ?? 0, y = attrs.y ?? 0;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    sumX += x; sumY += y; count++;
  });

  if (count === 0) return {centerX: 0, centerY: 0, radius: 0};

  const centerX = sumX / count;
  const centerY = sumY / count;
  
  // Радиус: максимальное расстояние от центра до узла
  let radius = 0;
  graph.forEachNode((_, attrs) => {
    const dx = (attrs.x ?? 0) - centerX;
    const dy = (attrs.y ?? 0) - centerY;
    radius = Math.max(radius, dx*dx + dy*dy);
  });
  radius = Math.sqrt(radius);

  return { centerX: centerX, centerY: centerY, radius: radius };
}



export function buildCommunityGraph(graph: Graph, commId: any): Graph {
  // Строим граф сообщества
  const currCommNodes = new Set<string>();
  graph.forEachNode((node, attrs) => {
    if (attrs.community == commId)
      currCommNodes.add(node);
  });
  let commGraph = subgraph(graph, (node) => currCommNodes.has(node));
  commGraph = toUndirected(commGraph);

  // Расставляем
  const rng = seedrandom(alg.seed);
  commGraph.forEachNode((node) => {
    commGraph.updateNodeAttribute(node, 'x', _ => rng() - 0.5);
    commGraph.updateNodeAttribute(node, 'y', _ => rng() - 0.5);
  })

  return commGraph;
}



export function buildMetaGraph(graph: Graph): Graph {
  // Строим мета-граф (сообщества как узлы)
  let metaGraph = new Graph({});
  graph.forEachNode((_node, attrs) => {
    const commId = attrs.community;
    if (!metaGraph.hasNode(commId)) metaGraph.addNode(commId, {size: 1});
    else metaGraph.updateNodeAttribute(commId, 'size', n => n + 1);
  })

  // Рёбра между сообществами
  graph.forEachEdge((_, attrs, source, target) => {
    const c1 = graph.getNodeAttribute(source, 'community');
    const c2 = graph.getNodeAttribute(target, 'community');
    if (c1 && c2 && c1 != c2) {
      if (!metaGraph.hasEdge(c1, c2))
        metaGraph.addEdge(c1, c2, { weight: attrs?.weight ?? 1 });
      else metaGraph.updateEdgeAttribute(c1, c2, 'weight', 
        n => n + (attrs?.weight ?? 1));
    }
  });

  metaGraph = toUndirected(metaGraph);

  // Расставляем
  const rng = seedrandom(alg.seed);
  metaGraph.forEachNode((node) => {
    metaGraph.updateNodeAttribute(node, 'x', _ => rng() - 0.5);
    metaGraph.updateNodeAttribute(node, 'y', _ => rng() - 0.5);
  })

  return metaGraph;
}



export function setRandomCoords(graph: Graph, replaceNansOnly: boolean = false) {
  const spacing = Math.sqrt(graph.order) * (vis.nodeMaxSize + vis.nodeMinSize) * 2;
  const rng = seedrandom(alg.seed);
  graph.forEachNode((node, attrs) => {
    if (!replaceNansOnly || !attrs.x || !attrs.y) {
      graph.mergeNodeAttributes(node, {
        x: (rng() - 0.5) * spacing,
        y: (rng() - 0.5) * spacing
      });
    }
  });
}
