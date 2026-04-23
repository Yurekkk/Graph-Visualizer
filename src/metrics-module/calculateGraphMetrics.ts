import Graph from 'graphology';
import type graphMetrics from './graphMetricsInterface.ts';
// import betweennessCentrality from 'graphology-metrics/centrality/betweenness';
import coreNumber from 'graphology-cores';
// import pagerank from 'graphology-metrics/centrality/pagerank';
import { calculateEdgesImportance, calculateNodesImportance } from './importanceCalculations.ts';
import { findDegreeGini, findSimpleMetrics } from './simpleMetricsCalculation.ts';
// import computeSpectralGap from './spectralGap.ts';



// TODO: Все таки считать betweeness centrality, если граф маленький

// TODO?: Все это пока не учитывает, что граф может быть ориентированным
// Может потом добавлю

// Также для каждого узла считает degree, degreeCentrality, community и core



export function calculateGraphMetrics(graph: Graph): graphMetrics {
  // const start = performance.now();
  
  const {
    numNodes,
    numEdges,
    density,
    avgDegree,
    maxDegree,
    minDegree,
    maxEdgeWeight,
    minEdgeWeight,
    hubDominance
  } = findSimpleMetrics(graph);
  const degreeGini = findDegreeGini(graph);
  // const spectralGap = computeSpectralGap(graph); // долго

  // const end = performance.now();
  // console.log(`Время вычисления простых метрик: ${(end - start).toFixed(3)} мс`)

  return {
    numNodes,
    numEdges,
    density,
    avgDegree,
    maxDegree,
    minDegree,
    maxEdgeWeight,
    minEdgeWeight,
    hubDominance,
    degreeGini
  };
}



export function calculateNodeMetrics(graph: Graph) {
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

  coreNumber.coreNumber.assign(graph); // k-core // оно горит красным, но все правильно
  // pagerank.assign(graph);
  // graph.forEachNode(node => {
  //   const cc = localClusteringCoefficient(graph, node);
  //   graph.setNodeAttribute(node, 'clusteringCoef', cc);
  // });
  calculateNodesImportance(graph);
}



export function calculateEdgeMetrics(graph: Graph) {
  const {minEdgeImportance, maxEdgeImportance, avgEdgeImportance} = calculateEdgesImportance(graph);
  return {minEdgeImportance, maxEdgeImportance, avgEdgeImportance};
}
