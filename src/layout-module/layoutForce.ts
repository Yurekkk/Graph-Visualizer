import forceAtlas2 from 'graphology-layout-forceatlas2';
import { setRandomCoords } from '../misc/utilsAlgorithmic.ts';
import type Graph from 'graphology';
import * as alg from '../configs/algorithmicConfig.ts';

// import forceAlgo from 'graphology-layout-force';   
// ^это^ херь полная, и медленно, и плохо раскладывает



export default function forceLayout(graph: Graph) {
  setRandomCoords(graph);
  const sensibleSettings = forceAtlas2.inferSettings(graph);
  forceAtlas2.assign(graph, {
    iterations: alg.forceLayoutIterations,
    settings: {
      ...sensibleSettings,
      barnesHutOptimize: true
    }
  });
}
