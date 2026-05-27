import Graph from 'graphology';
import radialLayout from './layoutRadial.ts';
import type graphMetrics from '../metrics-module/graphMetricsInterface.ts';
import * as alg from '../configs/algorithmicConfig.ts';
import { setRandomCoords } from '../misc/utilsAlgorithmic.ts';
import layoutSpectral from './layoutSpectral.ts';
import circularLayout from './layoutCircular.ts';
import forceLayout from './layoutForce.ts';
import hierarchicalLayout from './layoutHierarchical.ts';
import metaLayout from './layoutMeta.ts';
import samplingLayout from './layoutSampling.ts';
import findDegreeGini from '../metrics-module/findDegreeGini.ts';
import type FilteredGraph from '../misc/filteredGraph.ts';



// Все-таки metaLayout лучше всего все отрисовывает и должен проверяться в первую очередь
// Будем считать эту часть готовой, короче

// noverlap.assign(graph); - Долго



export const layoutFunctions: Record<string, (graph: Graph, _recursion_level?: number) => void> = {
  "auto": () => {},
  "circular": circularLayout,
  "force": (g, _l) => forceLayout(g),
  "hierarchical": hierarchicalLayout,           // Не используется в smartLayout
  "meta": (g, l) => metaLayout(g, l!),
  "radial": (g, _l) => radialLayout(g),
  "random": (g, _l) => setRandomCoords(g),      // Не используется в smartLayout
  "sampling": (g, l) => samplingLayout(g, l!),
  "spectral": layoutSpectral,                   // Не используется в smartLayout
};



export function smartLayout(
  graph: Graph | FilteredGraph, 
  metrics: graphMetrics,
  algorithm: string = 'auto',
  _recursion_level: number = 0,
  _meta_or_comm_prefix = '' // чисто для отладки
) {

  if (algorithm !== 'auto') {
    assignLayout(algorithm, graph, _recursion_level, _meta_or_comm_prefix);
    return;
  }

  if (metrics.numNodes > alg.metaLayoutMinNodes &&
      _recursion_level < alg.metaLayoutRecursionLevelCap && 
      (metrics.modularity ?? -1) > alg.metaLayoutMinModularity &&
      (metrics.numCommunities ?? 0) > 1) {
    assignLayout('meta', graph, _recursion_level, _meta_or_comm_prefix);
    return;
  }

  if (metrics.density >= alg.circularMinDensity) {
    assignLayout('circular', graph, _recursion_level, _meta_or_comm_prefix);
    return;
  }

  if (metrics.numNodes >= alg.radialMinNumNodes &&
      metrics.hubDominance >= alg.radialMinHubDominance) {
    assignLayout('radial', graph, _recursion_level, _meta_or_comm_prefix);
    return;
  }

  metrics = {...metrics, degreeGini: findDegreeGini(graph)};
  if (metrics.numNodes > alg.samplingMinNumNodes &&
      metrics.degreeGini! >= alg.samplingMinDegreeGini) {
    assignLayout('sampling', graph, _recursion_level, _meta_or_comm_prefix);
    return;
  } 

  else {
    assignLayout('force', graph, _recursion_level, _meta_or_comm_prefix);
    return;
  }
}



function assignLayout(algo: string, graph: Graph, 
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
    console.log(`# ${_meta_or_comm_prefix} - Выбран ${algorithm}Layout на уровне рекурсии: ${_recursion_level}`);
  else console.log(`# Выбран ${algorithm}Layout`);
}
