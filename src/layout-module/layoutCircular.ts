import type Graph from "graphology";
import { circular } from "graphology-layout";
import * as vis from './configs/visualConfig.ts';
import * as alg from './configs/algorithmicConfig.ts';

export default function circularLayout(graph: Graph) {
  circular.assign(graph);
  const meanSize = (vis.nodeMaxSize + vis.nodeMinSize) / 2;
  const r = meanSize * graph.order / 6.28 * alg.circularSpacing;
  graph.forEachNode((_node, attrs) => {
    attrs.x *= r;
    attrs.y *= r;
  })
}