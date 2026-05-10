import type Graph from "graphology";
// import betweennessCentrality from 'graphology-metrics/centrality/betweenness';
import coreNumber from 'graphology-cores';
// import pagerank from 'graphology-metrics/centrality/pagerank';
import eigenvectorCentralityApprox from './eigenvectorCentralityApprox.ts';
import { calculateNodesImportance } from "./importanceCalculations";

// Для каждого узла считает degree, degreeCentrality, community, core, eigenvectorCentrality и importance

export default function calculateNodeMetrics(graph: Graph) {
  /*
  // betweennessCentrality было бы даже лучше для узлов и ребер 
  // в качестве importance, но очень долго считает, сложность O(V*E)
  // V = 3600, E = 3800 => 6 секунд
  // V = 8000, E = 8100 => 31.5 секунд
  start = performance.now();
  betweennessCentrality.assign(graph);
  end = performance.now();
  console.log(`Время вычисления центральности: ${(end - start).toFixed(3)} мс`);
  //*/

  // Степени узлов
  const degreeMap = new Map<string, number>();
  graph.forEachEdge((_edgeId, attributes, source, target) => {
    degreeMap.set(source, (degreeMap.get(source) || 0) + (attributes.weight || 1));
    degreeMap.set(target, (degreeMap.get(target) || 0) + (attributes.weight || 1));
  });

  graph.forEachNode((node) => {
    graph.setNodeAttribute(node, 'degree', degreeMap.get(node)!);
    graph.setNodeAttribute(node, 'degreeCentrality', degreeMap.get(node)! / (graph.order - 1));
  });

  coreNumber.coreNumber.assign(graph); // k-core // оно горит красным, но все правильно

  // pagerank.assign(graph, {weighted: true});

  eigenvectorCentralityApprox(graph);

  // graph.forEachNode(node => {
  //   const cc = localClusteringCoefficient(graph, node);
  //   graph.setNodeAttribute(node, 'clusteringCoef', cc);
  // });
  
  const {minNodeImportance, maxNodeImportance, avgNodeImportance} = calculateNodesImportance(graph);
  return {minNodeImportance, maxNodeImportance, avgNodeImportance};
}
