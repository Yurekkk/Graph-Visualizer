import { subgraph } from 'graphology-operators';
import interpolatePositions from '../interpolatePositions';
import stratifiedSampling from '../stratifiedSampling';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { setRandomCoords } from '../utilsAlgorithmic';
import type Graph from 'graphology';
import * as alg from '../configs/algorithmicConfig.ts';



export function forceAtlas2Layout(graph: Graph) {
  setRandomCoords(graph);
  // Прямая раскладка
  const sensibleSettings = forceAtlas2.inferSettings(graph);
  forceAtlas2.assign(graph, {
    iterations: alg.forceAtlasIterations,
    settings: {
      ...sensibleSettings,
      barnesHutOptimize: true
    }
  });
}



export function forceAtlas2SamplingLayout(graph: Graph) {
  // Сэмплируем, раскладываем подграф, интерполируем остальное

  const sampledNodes = stratifiedSampling(graph, {
    sampleSize: alg.samplingMinNumNodes, 
    method: "proportional", 
    prioritizeImportantNodes: true
  });

  const sub = subgraph(graph, (node) => sampledNodes.includes(node));
  setRandomCoords(sub);

  const sensibleSettings = forceAtlas2.inferSettings(sub);
  forceAtlas2.assign(sub, {
    iterations: alg.forceAtlasIterations,
    settings: {
      ...sensibleSettings,
      barnesHutOptimize: true,
    }
  });

  setRandomCoords(sub, true);
  interpolatePositions(graph, sub);
}
