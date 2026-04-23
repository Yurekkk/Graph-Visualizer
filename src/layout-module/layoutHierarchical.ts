import dagre from 'dagre';
import type Graph from 'graphology';
import * as alg from './configs/algorithmicConfig.ts';



export default function hierarchicalLayout(graph: Graph) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 60 });

  graph.forEachNode(n => dagreGraph.setNode(String(n), { width: 50, height: 30 }));
  graph.forEachEdge((id, _attrs, source, target) => {
    if (source !== target && dagreGraph.hasNode(String(source)) && dagreGraph.hasNode(String(target))) {
      dagreGraph.setEdge(String(source), String(target), { id });
    }
  });

  dagre.layout(dagreGraph);

  dagreGraph.nodes().forEach(node => {
    const pos = dagreGraph.node(node);
    graph.setNodeAttribute(node, 'x', pos.x * alg.hierarchicalSpacing);
    graph.setNodeAttribute(node, 'y', pos.y * alg.hierarchicalSpacing);
  });
}