import type Graph from "graphology";

export default function findSimpleMetrics(graph: Graph) {
  const numNodes = graph.order;
  const numEdges = graph.size;
  const maxPossibleEdges = numNodes * (numNodes - 1) / 2;
  const density = maxPossibleEdges > 0 ? numEdges / maxPossibleEdges : 0;
  
  // Степени узлов
  const degreeMap = new Map<string, number>();
  graph.forEachNode((node) => degreeMap.set(node, graph.degree(node)));
  
  let maxDegree = -Infinity;
  let minDegree = +Infinity;
  let sumDegrees = 0;
  graph.forEachNode((node) => {
    maxDegree = Math.max(degreeMap.get(node)!, maxDegree);
    minDegree = Math.min(degreeMap.get(node)!, minDegree);
    sumDegrees += degreeMap.get(node)!;
  });

  let maxEdgeWeight = -Infinity;
  let minEdgeWeight = +Infinity;
  graph.forEachEdge((_edgeId, attributes, _source, _target) => {
    const weight = attributes.weight || 1;
    maxEdgeWeight = Math.max(weight, maxEdgeWeight);
    minEdgeWeight = Math.min(weight, minEdgeWeight);
  })

  const hubDominance = 2 * maxDegree / sumDegrees;

  return {
    numNodes,
    numEdges,
    density,
    maxDegree,
    minDegree,
    maxEdgeWeight,
    minEdgeWeight,
    hubDominance
  }
}
