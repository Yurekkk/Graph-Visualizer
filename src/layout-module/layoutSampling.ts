import { subgraph } from 'graphology-operators';
import interpolatePositions from './interpolatePositions.ts';
import stratifiedSampling from './stratifiedSampling.ts';
import { setRandomCoords } from '../misc/utilsAlgorithmic.ts';
import type Graph from 'graphology';
import * as alg from '../configs/algorithmicConfig.ts';
import { smartLayout } from './layoutEngine.ts';
import { calculateGraphMetrics } from '../metrics-module/metricsCalculations.ts';
import { findCommunities } from '../metrics-module/communitiesFinding.ts';



export default function samplingLayout(graph: Graph) {
  // Сэмплируем, раскладываем подграф, интерполируем остальное

  const sampledNodes = stratifiedSampling(graph, {
    sampleSize: alg.samplingMinNumNodes, 
    method: "proportional", 
    prioritizeImportantNodes: true
  });

  const subGraph = subgraph(graph, (node) => sampledNodes.includes(node));
  let subMetrics = calculateGraphMetrics(subGraph);
  let {numCommunities, modularity} = findCommunities(subGraph);
  subMetrics = {...subMetrics, numCommunities, modularity};

  smartLayout(subGraph, subMetrics);

  setRandomCoords(subGraph, true); // only for nans
  interpolatePositions(graph, subGraph);
}
