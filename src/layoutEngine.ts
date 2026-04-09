import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { circular } from 'graphology-layout';
import radialLayout from './radialLayout';
import noverlap from 'graphology-layout-noverlap';
import type graphMetrics from './graphMetricsInterface';
import { subgraph } from 'graphology-operators';
import interpolatePositions from './interpolatePositions';
import stratifiedSampling from './stratifiedSampling';
import * as alg from './configs/algorithmicConfig.ts';
import { calculateGraphMetrics, findCommunities } from './calculateGraphMetrics.ts';
import { toUndirected } from 'graphology-operators';
import seedrandom from 'seedrandom';



// TODO: A lot of tweaking is still needed



export default function smartLayout(
  graph: Graph, 
  metrics: graphMetrics,
  _recursion_level: number = 0
) {

  if ((metrics.numNodes > alg.metaLayoutMinNodes ||
      metrics.numEdges > alg.metaLayoutMinEdges ||
      metrics.modularity > alg.metaLayoutMinModularity) &&
      _recursion_level < 2 && metrics.numCommunities > 1) {
    console.log("metaLayout chosen at recursion level: ", _recursion_level);
    metaLayout(graph, _recursion_level);
  }
  else if (metrics.density >= alg.circularMinDensity && 
    metrics.numNodes <= alg.circularMaxNumNodes) {
    console.log("circularLayout chosen at recursion level: ", _recursion_level);
    circularLayout(graph);
  }
  else if (metrics.degreeGini >= alg.radialMinDegreeGini || 
    metrics.hubDominance >= alg.radialMinHubDominance) {
    console.log("radialLayout chosen at recursion level: ", _recursion_level);
    radialLayout(graph);
  }
  else if (metrics.numNodes <= alg.samplingMinNumNodes) {
    console.log("forceAtlas2Layout chosen at recursion level: ", _recursion_level);
    forceAtlas2Layout(graph);
  } 
  else {
    console.log("forceAtlas2SamplingLayout chosen at recursion level: ", _recursion_level);
    forceAtlas2SamplingLayout(graph);
  }

  // Убираем наложения узлов
  // noverlap.assign(graph);
}



function metaLayout(graph: Graph, _recursion_level: number) {
  const metaGraph = buildMetaGraph(graph);
  if (metaGraph.order == 0 || metaGraph.size == 0) return;
  let metaMetrics = calculateGraphMetrics(metaGraph);
  let {numCommunities, modularity} = findCommunities(metaGraph);
  metaMetrics = {...metaMetrics, numCommunities, modularity};

  // Рекурсивно раскладываем мета-граф
  smartLayout(metaGraph, metaMetrics, _recursion_level + 1);

  // Для каждого сообщества - свой внутренний layout
  metaGraph.forEachNode((commId, metaAttrs) => {
    const metaPos = {
      x: metaAttrs.x,
      y: metaAttrs.y,
      size: metaAttrs.size
    };

    const commGraph = buildCommunityGraph(graph, commId);
    if (commGraph.order == 0 || commGraph.size == 0) return;
    let metricsComm = calculateGraphMetrics(commGraph);
    ({numCommunities, modularity} = findCommunities(commGraph));
    metricsComm = {...metricsComm, numCommunities, modularity};

    // Раскладываем сообщество
    smartLayout(commGraph, metricsComm, _recursion_level + 1);

    // Композиция координат: мета-центр + локальные со смещением
    commGraph.forEachNode((node, attrs) => {
      const localX = attrs.x;
      const localY = attrs.y;

      graph.setNodeAttribute(node, 'x', metaPos.x * alg.metaLayoutSpacing + localX);
      graph.setNodeAttribute(node, 'y', metaPos.y * alg.metaLayoutSpacing + localY);
    });
  });
}



function buildCommunityGraph(graph: Graph, commId: any) {
  // Строим граф сообщества
  const currCommNodes = new Set<string>();
  graph.forEachNode((node, attrs) => {
    if (attrs.community == commId)
      currCommNodes.add(node);
  });
  const commGraph = subgraph(graph, (node) => currCommNodes.has(node));

  // Расставляем
  const rng = seedrandom(alg.seed);
  commGraph.forEachNode((node) => {
    commGraph.updateNodeAttribute(node, 'x', _ => rng() - 0.5);
    commGraph.updateNodeAttribute(node, 'y', _ => rng() - 0.5);
  })

  return toUndirected(commGraph);
}



function buildMetaGraph(graph: Graph): Graph {
  // Строим мета-граф (сообщества как узлы)
  const metaGraph = new Graph({});
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

  // Расставляем
  const rng = seedrandom(alg.seed);
  metaGraph.forEachNode((node) => {
    metaGraph.updateNodeAttribute(node, 'x', _ => rng() - 0.5);
    metaGraph.updateNodeAttribute(node, 'y', _ => rng() - 0.5);
  })

  return toUndirected(metaGraph);
}



function circularLayout(graph: Graph) {
  circular.assign(graph);
}



function forceAtlas2Layout(graph: Graph) {
  // Прямая раскладка
  const sensibleSettings = forceAtlas2.inferSettings(graph);
  forceAtlas2.assign(graph, {
    iterations: alg.forceAtlasIterations,
    settings: sensibleSettings
  });
}



function forceAtlas2SamplingLayout(graph: Graph) {
  // Сэмплируем, раскладываем подграф, интерполируем остальное

  const sampledNodes = stratifiedSampling(graph, {
    sampleSize: alg.samplingMinNumNodes, 
    method: "proportional", 
    prioritizeHighDegree: true
  });

  const sub = subgraph(graph, (node) => sampledNodes.includes(node));

  const sensibleSettings = forceAtlas2.inferSettings(sub);
  forceAtlas2.assign(sub, {
    iterations: alg.forceAtlasIterations,
    settings: sensibleSettings
  });

  interpolatePositions(graph, sub);
}
