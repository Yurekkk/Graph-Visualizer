import Graph from 'graphology';
import labelPropagation from "./labelPropagation";
import calculateModularity from 'graphology-metrics/graph/modularity';

// Все это пока не учитывает, что граф может быть ориентированным
// Может потом добавлю

export default function calculateGraphMetrics(graph: Graph) {
  const numNodes = graph.nodes().length;
  const numEdges = graph.edges().length;
  const maxPossibleEdges = numNodes * (numNodes - 1) / 2;
  const density = maxPossibleEdges > 0 ? numEdges / maxPossibleEdges : 0;
  const avgDegree = numNodes > 0 ? (2 * numEdges) / numNodes : 0;
  
  // Степени узлов
  const degreeMap = new Map<string, number>();
  graph.forEachNode(n => degreeMap.set(n, 0));
  graph.forEachEdge((_edgeId, attributes, source, target) => {
    degreeMap.set(source, (degreeMap.get(source) || 0) + (attributes.weight || 1));
    degreeMap.set(target, (degreeMap.get(target) || 0) + (attributes.weight || 1));
  });
  
  const maxDegree = Math.max(...Array.from(degreeMap.values()));
  const minDegree = Math.min(...Array.from(degreeMap.values()));

  const numCommunities = labelPropagation(graph);

  let maxEdgeWeight = -Infinity;
  let minEdgeWeight = +Infinity;
  graph.forEachEdge((_edgeId, attributes, _source, _target) => {
    const weight = attributes.weight || 1;
    if (weight > maxEdgeWeight) 
      maxEdgeWeight = weight;
    if (weight < minEdgeWeight) 
      minEdgeWeight = weight;
  })

  const modularity = calculateModularity(graph, {
    getNodeCommunity: 'community',
    getEdgeWeight: 'weight'
  });

  return {
    numNodes,
    numEdges,
    density,
    avgDegree,
    maxDegree,
    minDegree,
    maxEdgeWeight,
    minEdgeWeight,
    numCommunities,
    modularity
  };
}

// Нахождение компонент связности, диаметра, радиуса и длины среднего пути
function findEccentricitiesAndSuch(graph: Graph, adjList: Map<string, string[]>) {

  // Нахождение эксцентриситета каждого узла, суммы всех путей, 
  // кол-ва связанных пар и компонент связности
  const eccentricities: number[] = [];
  let totalDist = 0;
  let pairCount = 0;
  let componentsNum = 0;
  const componentIndices = new Map<string, number>(); // к какой компоненте относится нода
  graph.forEachNode(n => componentIndices.set(n, 0));

  graph.forEachNode(n => {
    const distances = bfsDistances(n, graph, adjList);

    const maxDist = Math.max(...Array.from(distances.values()).filter(d => d !== Infinity));
    eccentricities.push(maxDist);

    for (const [targetId, dist] of distances) {
      if (targetId !== n && dist !== Infinity) {
        totalDist += dist;
        pairCount++;
      }
    }

    if (componentIndices.get(n) === 0) {
      componentsNum++;
      for (const [targetId, dist] of distances) {
        if (dist !== Infinity) {
          componentIndices.set(targetId, componentsNum);
        }
      }
    }
  })
  
  // Нахождение диаметра, радиуса и длины среднего пути
  const diameter = Math.max(...eccentricities);
  const radius = Math.min(...eccentricities);
  const avgPathLen = pairCount > 0 ? totalDist / pairCount : 0;

  return {
    componentIndices,
    diameter,
    radius,
    avgPathLen
  }
}

// Поиск кратчайших путей от одного узла (BFS)
function bfsDistances(startId: string, graph: Graph, adjList: Map<string, string[]>): Map<string, number> {
  const distances = new Map<string, number>();
  graph.forEachNode(n => distances.set(n, Infinity));
  distances.set(startId, 0);
  
  const queue = [startId];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjList.get(current) || [];
    
    for (const neighbor of neighbors) {
      if (distances.get(neighbor)! === Infinity) { // Если узел не посещен
        distances.set(neighbor, distances.get(current)! + 1);
        queue.push(neighbor);
      }
    }
  }
  
  return distances;
}

// Построение списка смежности
function buildAdjList(graph: Graph): Map<string, string[]> {
  const adjList = new Map<string, string[]>();
  graph.forEachNode(n => adjList.set(n, []));
  graph.forEachEdge((_edgeId, _attributes, source, target) => {
    adjList.get(source)!.push(target);
    adjList.get(target)!.push(source);
  });
  return adjList;
}
