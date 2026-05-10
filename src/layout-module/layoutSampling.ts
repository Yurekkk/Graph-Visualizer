import interpolatePositions from './interpolatePositions.ts';
import sample from './sample.ts';
import { setRandomCoords } from '../misc/utilsAlgorithmic.ts';
import type Graph from 'graphology';
import * as alg from '../configs/algorithmicConfig.ts';
// import * as vis from '../configs/visualConfig.ts';
import { smartLayout } from './layoutEngine.ts';
import { calculateGraphMetrics } from '../metrics-module/metricsCalculations.ts';
import { findCommunities } from '../metrics-module/communitiesFinding.ts';
import FilteredGraph from '../misc/filteredGraph.ts';
import radialLayout from './layoutRadial.ts';



export default function samplingLayout(graph: Graph) {
  // Сэмплируем, раскладываем подграф, интерполируем остальное

  setRandomCoords(graph);

  const sampleSize = graph.order ** alg.sampleSizeCoefficient;

  const sampledNodes = sample(graph, sampleSize);

  const sampledGraph = new FilteredGraph(graph, new Set(sampledNodes));
  let subMetrics = calculateGraphMetrics(sampledGraph);
  let {numCommunities, modularity} = findCommunities(sampledGraph);
  subMetrics = {...subMetrics, numCommunities, modularity};

  smartLayout(sampledGraph, subMetrics);

  // const avgNodeSize = (vis.nodeMaxSize + vis.nodeMinSize) / 2;
  // const spacing = Math.sqrt(graph.order);
  sampledGraph.forEachNode((_node, attrs) => {
    attrs.x *= 5;
    attrs.y *= 5;
  });

  interpolatePositions(graph, sampledGraph); // Для узлов, у которых есть два соседа

  // Расставляем узлы, у которых всего один сосед, радиальной раскладкой вокруг этого соседа
  sampledNodes.forEach((centerNode) => {
    const x = sampledGraph.getNodeAttribute(centerNode, 'x');
    const y = sampledGraph.getNodeAttribute(centerNode, 'y');

    const nodesForRadialGraph = new Set<string>;
    nodesForRadialGraph.add(centerNode);
    graph.forEachNeighbor(centerNode, (neighbor) => {
      if (graph.degree(neighbor) === 1) nodesForRadialGraph.add(neighbor);
    });

    const radialGraph = new FilteredGraph(graph, nodesForRadialGraph);
    radialLayout(radialGraph, centerNode);

    radialGraph.forEachNode((_node, attrs) => {
      attrs.x += x;
      attrs.y += y;
    });
  });
}
