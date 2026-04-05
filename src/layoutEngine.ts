import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { circular } from 'graphology-layout';
import radialLayout from './radialLayout';
import noverlap from 'graphology-layout-noverlap';
import type graphMetrics from './graphMetricsInterface';
import { subgraph } from 'graphology-operators';
import interpolatePositions from './interpolatePositions';
import stratifiedSampling from './stratifiedSampling';


const circularMinDensity = 0.25;
const circularMaxNumNodes = 50;
const radialMinDegreeGini = 0.5;
const radialMinHubDominance = 10;
const samplingMinNumNodes = 500;

const forceAtlasIterations = 50;


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

  console.log(density > circularMinDensity);

  if (density >= circularMinDensity && 
    numNodes <= circularMaxNumNodes) {
    await circularLayout(graph);
  }
  else if (degreeGini >= radialMinDegreeGini || 
    hubDominance >= radialMinHubDominance) {
    await radialLayout(graph);
  }
  else if (numNodes <= samplingMinNumNodes) {
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
    iterations: forceAtlasIterations,
    settings: sensibleSettings
  });
}

async function forceAtlas2SamplingLayout(graph: Graph) {
  // Сэмплируем, раскладываем подграф, интерполируем остальное

  const sampledNodes = stratifiedSampling(graph, {
    sampleSize: samplingMinNumNodes, 
    method: "proportional", 
    prioritizeHighDegree: true
  });

  const sub = subgraph(graph, (node) => sampledNodes.includes(node));

  const sensibleSettings = forceAtlas2.inferSettings(sub);
  await forceAtlas2.assign(sub, {
    iterations: forceAtlasIterations,
    settings: sensibleSettings
  });

  interpolatePositions(graph, sub);
}
