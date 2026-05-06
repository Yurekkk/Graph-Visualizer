import Graph from 'graphology';
import radialLayout from './layoutRadial.ts';
import type graphMetrics from '../metrics-module/graphMetricsInterface.ts';
import * as alg from '../configs/algorithmicConfig.ts';
import { setRandomCoords } from '../misc/utilsAlgorithmic.ts';
import layoutSpectral from './layoutSpectral.ts';
import circularLayout from './layoutCircular.ts';
import forceAtlas2Layout from './layoutForce.ts';
import hierarchicalLayout from './layoutHierarchical.ts';
import metaLayout from './layoutMeta.ts';
import samplingLayout from './layoutSampling.ts';



// TODO: A lot of tweaking is still needed

/* 
Просто meta layout'ом и force-алгоритмами как будто бы приятнее раскладывается всегда.
Radial, circular и подобное не особо и нужно, если есть forceAtlas.
ForceAtlas, ко всему прочему, еще и аномалии типа выбивающихся из паттерна узлов учтет.

ForceAtlas с сэмплированием всегда тянет узлы ближе к центру сообщества, 
хз че с этим делать. Но зато быстрее
*/



export const layoutFunctions: Record<string, (graph: Graph, _recursion_level?: number) => void> = {
  "meta": (g, l) => metaLayout(g, l!),
  "circular": circularLayout,
  "radial": radialLayout,
  "random": (g, _l) => setRandomCoords(g),
  "hierarchical": hierarchicalLayout,
  "spectral": layoutSpectral,
  "forceAtlas2": forceAtlas2Layout,
  "sampling": samplingLayout,
};



export function smartLayout(
  graph: Graph, 
  metrics: graphMetrics,
  algorithm: string = 'auto',
  _recursion_level: number = 0,
  _meta_or_comm_prefix = '' // чисто для отладки
) {

  if (algorithm !== 'auto') {
    applyLayout(algorithm, graph, _recursion_level, _meta_or_comm_prefix);
  }
  else if (metrics.numNodes > alg.metaLayoutMinNodes &&
      (metrics.modularity ?? -1) > alg.metaLayoutMinModularity &&
      _recursion_level < alg.metaLayoutRecursionLevelCap && 
      (metrics.numCommunities ?? 0) > 1) {
    applyLayout('meta', graph, _recursion_level, _meta_or_comm_prefix);
  }
  else if (metrics.density >= alg.circularMinDensity && 
    metrics.numNodes <= alg.circularMaxNumNodes) {
    applyLayout('circular', graph, _recursion_level, _meta_or_comm_prefix);
  }
  // else if (metrics.degreeGini >= alg.radialMinDegreeGini ||
  //          metrics.hubDominance >= alg.radialMinHubDominance) {
  //   applyLayout('radial', graph, _recursion_level, _meta_or_comm_prefix);
  // }
  // else if (metrics.numNodes > alg.samplingMinNumNodes) {
  //   applyLayout('forceAtlas2wSampling', graph, _recursion_level, _meta_or_comm_prefix);
  // } 
  else {
    applyLayout('forceAtlas2', graph, _recursion_level, _meta_or_comm_prefix);
  }

  // Убираем наложения узлов // Долго
  // noverlap.assign(graph);
}



function applyLayout(algo: string, graph: Graph, 
  _recursion_level: number, _meta_or_comm_prefix: string) {
  const layout = layoutFunctions[algo];
  if (!layout) throw new Error(`Unknown algorithm: ${algo}`);
  logAlgoChoice(algo, _recursion_level, _meta_or_comm_prefix);
  layout(graph, _recursion_level);
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
