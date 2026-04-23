import Graph from 'graphology';
import radialLayout from './layoutRadial.ts';
import noverlap from 'graphology-layout-noverlap';
import type graphMetrics from '../metric-module/graphMetricsInterface.ts';
import * as alg from '../configs/algorithmicConfig.ts';
import { calculateGraphMetrics, findCommunities } from '../metric-module/calculateGraphMetrics.ts';
import { buildCommunityGraph, buildMetaGraph, getGraphCenterRadius, 
  setRandomCoords } from '../utilsAlgorithmic.ts';
import layoutSpectral from './layoutSpectral.ts';
import circularLayout from './layoutCircular.ts';
import { forceAtlas2Layout, forceAtlas2SamplingLayout } from './layoutsForce.ts';
import hierarchicalLayout from './layoutHierarchical.ts';



// TODO: A lot of tweaking is still needed

/* 
Просто meta layout'ом и force-алгоритмами как будто бы приятнее раскладывается всегда.
Radial, circular и подобное не особо и нужно, если есть forceAtlas.
ForceAtlas, ко всему прочему, еще и аномалии типа выбивающихся из паттерна узлов учтет.

ForceAtlas с сэмплированием всегда тянет узлы ближе к центру сообщества, 
хз че с этим делать. Но зато быстрее
*/



export default function smartLayout(
  graph: Graph, 
  metrics: graphMetrics,
  algorithm: string = 'auto',
  _recursion_level: number = 0,
  _meta_or_comm_prefix = '' // чисто для отладки
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
    case 'random':
      logAlgoChoice(algorithm, _recursion_level, _meta_or_comm_prefix);
      setRandomCoords(graph);
      return;
    case 'hierarchical':
      logAlgoChoice(algorithm, _recursion_level, _meta_or_comm_prefix);
      hierarchicalLayout(graph);
      return;
    case 'spectral':
      logAlgoChoice(algorithm, _recursion_level, _meta_or_comm_prefix);
      layoutSpectral(graph);
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

  if (metrics.numNodes > alg.metaLayoutMinNodes &&
      (metrics.modularity ?? -1) > alg.metaLayoutMinModularity &&
      _recursion_level < alg.metaLayoutRecursionLevelCap && 
      (metrics.numCommunities ?? 0) > 1) {
    logAlgoChoice('meta', _recursion_level, _meta_or_comm_prefix);
    metaLayout(graph, _recursion_level);
  }
  // else if (metrics.density >= alg.circularMinDensity && 
  //   metrics.numNodes <= alg.circularMaxNumNodes) {
  //   logAlgoChoice('circular', _recursion_level, _meta_or_comm_prefix);
  //   circularLayout(graph);
  // }
  // else if (metrics.degreeGini >= alg.radialMinDegreeGini ||
  //          metrics.hubDominance >= alg.radialMinHubDominance) {
  //   logAlgoChoice('radial', _recursion_level, _meta_or_comm_prefix);
  //   radialLayout(graph);
  // }
  // else if (metrics.numNodes > alg.samplingMinNumNodes) {
  //   logAlgoChoice('forceAtlas2Sampling', _recursion_level, _meta_or_comm_prefix);
  //   forceAtlas2SamplingLayout(graph);
  // } 
  else {
    logAlgoChoice('forceAtlas2', _recursion_level, _meta_or_comm_prefix);
    forceAtlas2Layout(graph);
  }

  // Убираем наложения узлов // Долго
  // noverlap.assign(graph);
}



function logAlgoChoice(
  algorithm: string,
  _recursion_level: number = 0,
  _meta_or_comm_prefix = '') {
  if (!alg.logAlgorithmChoices) return;
  if (_recursion_level > 0)
    console.log(`- ${_meta_or_comm_prefix} - Выбран ${algorithm}Layout на уровне рекурсии: ${_recursion_level}`);
  else console.log(`- Выбран ${algorithm}Layout`);
}



function metaLayout(graph: Graph, _recursion_level: number) {
  const metaGraph = buildMetaGraph(graph);
  let metaMetrics = calculateGraphMetrics(metaGraph);
  const resolution = alg.louvainResolution - alg.metaLayoutResolutionDecreaseStep * _recursion_level;
  let {numCommunities, modularity} = findCommunities(metaGraph, resolution);
  metaMetrics = {...metaMetrics, numCommunities, modularity};

  const communities = new Map<string, {commGraph: Graph, 
    centerX: number, centerY: number, radius: number}>();
  
  // Рекурсивно раскладываем каждое сообщество по отдельности
  // Первый проход: раскладываем сообщества, считаем радиусы
  metaGraph.forEachNode((commId, metaAttrs) => {
    const commGraph = buildCommunityGraph(graph, commId);
    let metricsComm = calculateGraphMetrics(commGraph);
    ({numCommunities, modularity} = findCommunities(commGraph));
    metricsComm = {...metricsComm, numCommunities, modularity};

    // Раскладываем сообщество
    smartLayout(commGraph, metricsComm, 'auto', _recursion_level + 1, 'commGraph');
    // noverlap.assign(commGraph); // Долго

    // Считаем центры и радиусы
    const { centerX, centerY, radius } = getGraphCenterRadius(commGraph);

    communities.set(commId, {commGraph: commGraph, 
      centerX: centerX, centerY: centerY, radius: radius})

    // Размер узла в мета-графе = радиус соответствующего разложенного commGraph
    metaAttrs.size = radius;
  });

  // Рекурсивно раскладываем мета-граф
  smartLayout(metaGraph, metaMetrics, 'auto', _recursion_level + 1, 'metaGraph');
  noverlap.assign(metaGraph); // Тут быстро достаточно

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
