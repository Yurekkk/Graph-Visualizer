import type Graph from "graphology";

export default function findSimpleMetrics(graph: Graph) {
  const numNodes = graph.order;
  const numEdges = graph.size;
  const maxPossibleEdges = numNodes * (numNodes - 1) / 2;
  const density = maxPossibleEdges > 0 ? numEdges / maxPossibleEdges : 0;
  const avgDegree = numNodes > 0 ? (2 * numEdges) / numNodes : 0;
  
  // Степени узлов
  const degreeMap = new Map<string, number>();
  graph.forEachEdge((_edgeId, attributes, source, target) => {
    degreeMap.set(source, (degreeMap.get(source) || 0) + (attributes.weight || 1));
    degreeMap.set(target, (degreeMap.get(target) || 0) + (attributes.weight || 1));
  });

  graph.forEachNode((node) => {
    graph.setNodeAttribute(node, 'degree', degreeMap.get(node)!);
    graph.setNodeAttribute(node, 'degreeCentrality', degreeMap.get(node)! / (numNodes - 1));
  });
  
  let maxDegree = -Infinity;
  let minDegree = +Infinity;
  let sumDegrees = 0;
  graph.forEachNode((_node, attrs) => {
    maxDegree = Math.max(attrs.degree, maxDegree);
    minDegree = Math.min(attrs.degree, minDegree);
    sumDegrees += attrs.degree;
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
    avgDegree,
    maxDegree,
    minDegree,
    maxEdgeWeight,
    minEdgeWeight,
    hubDominance
  }
}
