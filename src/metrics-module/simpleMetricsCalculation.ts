import type Graph from "graphology";



export function findSimpleMetrics(graph: Graph) {
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



export function findDegreeGini(graph: Graph): number {
  const n = graph.order;
  if (n <= 1) return 0;

  // Собираем степени всех узлов
  const degrees: number[] = [];
  graph.forEachNode((node) => {
    degrees.push(graph.degree(node));
  });

  degrees.sort((a, b) => a - b);

  // Считаем по формуле
  let sumDegrees = 0;
  let weightedSum = 0;
  
  for (let i = 0; i < n; i++) {
    const d = degrees[i];
    sumDegrees += d;
    weightedSum += (i + 1) * d; // i+1 потому что формула 1-based
  }

  if (sumDegrees === 0) return 0; // граф без рёбер

  const gini = (2 * weightedSum) / (n * sumDegrees) - (n + 1) / n;
  
  // Численная стабилизация
  return Math.max(0, Math.min(1, gini));
}
