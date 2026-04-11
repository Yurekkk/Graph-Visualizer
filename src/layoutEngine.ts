import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { circular } from 'graphology-layout';
import radialLayout from './radialLayout';
import noverlap from 'graphology-layout-noverlap';
import type graphMetrics from './graphMetricsInterface';
import { subgraph } from 'graphology-operators';
import interpolatePositions from './interpolatePositions';
import stratifiedSampling from './stratifiedSampling';
import * as vis from './configs/visualConfig.ts';
import * as alg from './configs/algorithmicConfig.ts';
import { calculateGraphMetrics, findCommunities } from './calculateGraphMetrics.ts';
import { toUndirected } from 'graphology-operators';
import seedrandom from 'seedrandom';



// TODO: A lot of tweaking is still needed



export default function smartLayout(
  graph: Graph, 
  metrics: graphMetrics,
  algorithm: string = 'auto',
  _recursion_level: number = 0,
  _meta_or_comm_prefix = ''
) {

  switch (algorithm) {
    case 'auto':
      break;
    case 'meta':
      logAlgoChoice(algorithm, _recursion_level, _meta_or_comm_prefix);
      metaLayout(graph, _recursion_level);
      return;
    case 'circular':
      logAlgoChoice(algorithm, _recursion_level, _meta_or_comm_prefix);
      circularLayout(graph);
      return;
    case 'radial':
      logAlgoChoice(algorithm, _recursion_level, _meta_or_comm_prefix);
      radialLayout(graph);
      return;
    case 'forceAtlas2':
      logAlgoChoice(algorithm, _recursion_level, _meta_or_comm_prefix);
      forceAtlas2Layout(graph); 
      return;
    case 'forceAtlas2wSampling':
      logAlgoChoice(algorithm, _recursion_level, _meta_or_comm_prefix);
      forceAtlas2SamplingLayout(graph);
      return;
    default: 
      throw new Error("Unknown algorithm.");
  }

  if ((metrics.numNodes > alg.metaLayoutMinNodes ||
      metrics.numEdges > alg.metaLayoutMinEdges ||
      metrics.modularity > alg.metaLayoutMinModularity) &&
      _recursion_level < alg.metaLayoutRecursionLevelCap && 
      metrics.numCommunities > 1) {
    logAlgoChoice('meta', _recursion_level, _meta_or_comm_prefix);
    metaLayout(graph, _recursion_level);
  }
  else if (metrics.density >= alg.circularMinDensity && 
    metrics.numNodes <= alg.circularMaxNumNodes) {
    logAlgoChoice('circular', _recursion_level, _meta_or_comm_prefix);
    circularLayout(graph);
  }
  else if (metrics.degreeGini >= alg.radialMinDegreeGini || 
    metrics.hubDominance >= alg.radialMinHubDominance) {
    logAlgoChoice('radial', _recursion_level, _meta_or_comm_prefix);
    radialLayout(graph);
  }
  else if (metrics.numNodes <= alg.samplingMinNumNodes) {
    logAlgoChoice('forceAtlas2', _recursion_level, _meta_or_comm_prefix);
    forceAtlas2Layout(graph);
  } 
  else {
    logAlgoChoice('forceAtlas2Sampling', _recursion_level, _meta_or_comm_prefix);
    forceAtlas2SamplingLayout(graph);
  }

  // Убираем наложения узлов
  // noverlap.assign(graph);
}



function logAlgoChoice(
  algorithm: string,
  _recursion_level: number = 0,
  _meta_or_comm_prefix = '') {
  if (_recursion_level > 0)
    console.log(`- ${_meta_or_comm_prefix} - Выбран ${algorithm}Layout на уровне рекурсии: ${_recursion_level}`);
  else console.log(`Выбран ${algorithm}Layout`);
}



function metaLayout(graph: Graph, _recursion_level: number) {
  const metaGraph = buildMetaGraph(graph);
  let metaMetrics = calculateGraphMetrics(metaGraph);
  let {numCommunities, modularity} = findCommunities(metaGraph);
  metaMetrics = {...metaMetrics, numCommunities, modularity};

  // Рекурсивно раскладываем мета-граф
  smartLayout(metaGraph, metaMetrics, 'auto', _recursion_level + 1, 'metaGraph');

  // Для каждого сообщества - свой внутренний layout

  // Первый проход: раскладываем сообщества, считаем радиусы
  const communities = new Map<string, {commGraph: Graph, 
    centerX: number, centerY: number, radius: number}>();
  let meanCommRadius = 0;
  let count = 0;
  
  metaGraph.forEachNode((commId, _metaAttrs) => {
    const commGraph = buildCommunityGraph(graph, commId);
    let metricsComm = calculateGraphMetrics(commGraph);
    ({numCommunities, modularity} = findCommunities(commGraph));
    metricsComm = {...metricsComm, numCommunities, modularity};

    // Раскладываем сообщество
    smartLayout(commGraph, metricsComm, 'auto', _recursion_level + 1, 'commGraph');

    // Считаем центры и радиусы
    const { centerX, centerY, radius } = getGraphCenterRadius(commGraph);
    meanCommRadius += (radius - meanCommRadius) / ++count;

    communities.set(commId, {commGraph: commGraph, 
      centerX: centerX, centerY: centerY, radius: radius})
  });

  // Второй проход: композиция координат
  metaGraph.forEachNode((commId, metaAttrs) => {
    const {commGraph, centerX: centerX, centerY: centerY, 
      radius: _radius} = communities.get(commId)!;
    commGraph.forEachNode((node, localAttrs) => {
      const metaX = metaAttrs.x * meanCommRadius * alg.metaLayoutSpacing;
      const metaY = metaAttrs.y * meanCommRadius * alg.metaLayoutSpacing;
      // console.log(metaAttrs.x, metaAttrs.y, meanRadius)
      const localX = (localAttrs.x - centerX);
      const localY = (localAttrs.y - centerY);
      graph.setNodeAttribute(node, 'x', metaX + localX);
      graph.setNodeAttribute(node, 'y', metaY + localY);
    });
  });
}



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
    radius = Math.max(radius, Math.sqrt(dx*dx + dy*dy));
  });

  return { centerX: centerX, centerY: centerY, radius: radius };
}



function buildCommunityGraph(graph: Graph, commId: any): Graph {
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
  graph.forEachNode((_node, attrs) => {
    const r = vis.nodeSizeDefault * graph.order / 6.28 * alg.circularSpacing;
    attrs.x *= r;
    attrs.y *= r;
    // console.log(attrs.x, attrs.y)
  })
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
