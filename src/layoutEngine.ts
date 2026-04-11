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
// import dagre from 'dagre';
import { calculateGraphMetrics, findCommunities } from './calculateGraphMetrics.ts';
import { buildCommunityGraph, buildMetaGraph, getGraphCenterRadius } from './algorithmicUtils.ts';


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
    // case 'hierarchical':
    //   logAlgoChoice(algorithm, _recursion_level, _meta_or_comm_prefix);
    //   hierarchicalLayout(graph);
    //   return;
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
  else if (metrics.degreeGini >= alg.radialMinDegreeGini) {
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

  // Рекурсивно раскладываем каждое сообщество по отдельности
  // Первый проход: раскладываем сообщества, считаем радиусы
  const communities = new Map<string, {commGraph: Graph, 
    centerX: number, centerY: number, radius: number}>();
  let meanCommRadius = 0;
  let count = 0;
  
  metaGraph.forEachNode((commId, metaAttrs) => {
    const commGraph = buildCommunityGraph(graph, commId);
    let metricsComm = calculateGraphMetrics(commGraph);
    ({numCommunities, modularity} = findCommunities(commGraph));
    metricsComm = {...metricsComm, numCommunities, modularity};

    // Раскладываем сообщество
    smartLayout(commGraph, metricsComm, 'auto', _recursion_level + 1, 'commGraph');
    // noverlap.assign(commGraph);

    // Считаем центры и радиусы
    const { centerX, centerY, radius } = getGraphCenterRadius(commGraph);
    meanCommRadius += (radius - meanCommRadius) / ++count;

    communities.set(commId, {commGraph: commGraph, 
      centerX: centerX, centerY: centerY, radius: radius})

    // Размер узла в мета-графе = радиус соответствующего разложенного commGraph
    metaAttrs.size = radius;
  });

  // Рекурсивно раскладываем мета-граф
  smartLayout(metaGraph, metaMetrics, 'auto', _recursion_level + 1, 'metaGraph');
  noverlap.assign(metaGraph);

  // Второй проход: композиция координат
  metaGraph.forEachNode((commId, metaAttrs) => {
    const {commGraph, centerX: centerX, centerY: centerY, 
      radius: _radius} = communities.get(commId)!;
    commGraph.forEachNode((node, localAttrs) => {
      const metaX = metaAttrs.x;
      const metaY = metaAttrs.y;
      const localX = (localAttrs.x - centerX);
      const localY = (localAttrs.y - centerY);
      graph.setNodeAttribute(node, 'x', metaX + localX);
      graph.setNodeAttribute(node, 'y', metaY + localY);
    });
  });
}



function circularLayout(graph: Graph) {
  circular.assign(graph);
  graph.forEachNode((_node, attrs) => {
    const r = vis.nodeSizeDefault * graph.order / 6.28 * alg.circularSpacing;
    attrs.x *= r;
    attrs.y *= r;
  })
}



/*
function hierarchicalLayout(graph: Graph) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 60 });

  graph.forEachNode(n => dagreGraph.setNode(String(n), { width: 50, height: 30 }));
  graph.forEachEdge((id, _attrs, source, target) => {
    if (source !== target && dagreGraph.hasNode(String(source)) && dagreGraph.hasNode(String(target))) {
      dagreGraph.setEdge(String(source), String(target), { id });
    }
  });

  dagre.layout(dagreGraph);

  dagreGraph.nodes().forEach(node => {
    const pos = dagreGraph.node(node);
    graph.setNodeAttribute(node, 'x', pos.x);
    graph.setNodeAttribute(node, 'y', pos.y);
  });
}
//*/



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
    prioritizeImportantNodes: true
  });

  const sub = subgraph(graph, (node) => sampledNodes.includes(node));

  const sensibleSettings = forceAtlas2.inferSettings(sub);
  forceAtlas2.assign(sub, {
    iterations: alg.forceAtlasIterations,
    settings: sensibleSettings
  });

  interpolatePositions(graph, sub);
}
