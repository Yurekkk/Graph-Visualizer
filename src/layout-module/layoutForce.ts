import forceAtlas2 from 'graphology-layout-forceatlas2';
import { setRandomCoords } from '../misc/utilsAlgorithmic.ts';
import type Graph from 'graphology';
import * as alg from '../configs/algorithmicConfig.ts';



export default function forceAtlas2Layout(graph: Graph) {
  setRandomCoords(graph);
  const sensibleSettings = forceAtlas2.inferSettings(graph);
  forceAtlas2.assign(graph, {
    iterations: alg.forceAtlasIterations,
    settings: {
      ...sensibleSettings,
      barnesHutOptimize: true
    }
  });
}
