import forceAtlas2 from 'graphology-layout-forceatlas2';
import { setRandomCoords } from '../misc/utilsAlgorithmic.ts';
import type Graph from 'graphology';
import * as alg from '../configs/algorithmicConfig.ts';

// import forceAlgo from 'graphology-layout-force';   
// ^это^ херь полная, и медленно, и плохо раскладывает



export default function forceLayout(graph: Graph, barnesHutOptimize: boolean = true) {
  setRandomCoords(graph);

  graph.updateEachEdgeAttributes((_edge, attrs) => {
    const w = attrs.weight;
    if (w == null) return {};
    const scaled = Math.sign(w) * Math.pow(Math.abs(w), 0.4);
    // Сильно сжимаем веса, чтобы не было слишком больших разниц в притяжении/отталкивании
    return { ...attrs, weight: scaled };
  });

  const sensibleSettings = forceAtlas2.inferSettings(graph);
  const positions = forceAtlas2(graph, {
    iterations: alg.forceLayoutIterations,
    settings: {
      ...sensibleSettings,
      barnesHutOptimize: barnesHutOptimize,
      scalingRatio: alg.forceLayoutScalingRatio,
      edgeWeightInfluence: 1.0
    }
  });
  graph.forEachNode((node) => {
    graph.mergeNodeAttributes(node, {
      x: positions[node].x,
      y: positions[node].y
    })
  });
}
