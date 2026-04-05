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



export default async function smartLayout(
  graph: Graph, 
  metrics: graphMetrics
): Promise<void> {

  const {
    numNodes,
    numEdges,
    density,
    avgDegree,
    maxDegree,
    minDegree,
    maxEdgeWeight,
    minEdgeWeight,
    numCommunities,
    modularity,
    hubDominance,
    degreeGini
  } = metrics;

  if (density >= alg.circularMinDensity && 
    numNodes <= alg.circularMaxNumNodes) {
    await circularLayout(graph);
  }
  else if (degreeGini >= alg.radialMinDegreeGini || 
    hubDominance >= alg.radialMinHubDominance) {
    await radialLayout(graph);
  }
  else if (numNodes <= alg.samplingMinNumNodes) {
    await forceAtlas2Layout(graph);
  } 
  else {
    await forceAtlas2SamplingLayout(graph);
  }

  // Убираем наложения узлов
  // noverlap.assign(graph);
}

async function circularLayout(graph: Graph) {
  await circular.assign(graph);
}

async function forceAtlas2Layout(graph: Graph) {
  // Прямая раскладка
  const sensibleSettings = forceAtlas2.inferSettings(graph);
  await forceAtlas2.assign(graph, {
    iterations: alg.forceAtlasIterations,
    settings: sensibleSettings
  });
}

async function forceAtlas2SamplingLayout(graph: Graph) {
  // Сэмплируем, раскладываем подграф, интерполируем остальное

  const sampledNodes = stratifiedSampling(graph, {
    sampleSize: alg.samplingMinNumNodes, 
    method: "proportional", 
    prioritizeHighDegree: true
  });

  const sub = subgraph(graph, (node) => sampledNodes.includes(node));

  const sensibleSettings = forceAtlas2.inferSettings(sub);
  await forceAtlas2.assign(sub, {
    iterations: alg.forceAtlasIterations,
    settings: sensibleSettings
  });

  interpolatePositions(graph, sub);
}
