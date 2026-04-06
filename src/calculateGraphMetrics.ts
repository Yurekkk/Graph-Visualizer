import Graph from 'graphology';
// import labelPropagation from "./labelPropagation";
import calculateModularity from 'graphology-metrics/graph/modularity';
import louvain from 'graphology-communities-louvain';
import type graphMetrics from './graphMetricsInterface';
import * as alg from './configs/algorithmicConfig.ts';
import seedrandom from 'seedrandom';

// Все это пока не учитывает, что граф может быть ориентированным
// Может потом добавлю

export default function calculateGraphMetrics(graph: Graph): graphMetrics {
  let start, end;

  start = performance.now();
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
  end = performance.now();
  console.log(`Время вычисления простых метрик: ${end - start} мс`)

  /*
  start = performance.now();
  const _ = labelPropagation(graph, 100);
  end = performance.now();
  console.log(`Время нахождения сообществ (LPA): ${end - start} мс`)
  //*/

  //*
  start = performance.now();
  louvain.assign(graph, {rng: seedrandom(alg.seed)});
  const numCommunities = findCommunitiesNum(graph);
  end = performance.now();
  console.log(`Время нахождения сообществ (louvain): ${end - start} мс`)
  //*/

  start = performance.now();
  const modularity = calculateModularity(graph);
  end = performance.now();
  console.log(`Время нахождения модулярности: ${end - start} мс`)

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
    modularity,
    hubDominance,
    degreeGini
  };
}

// Нахождение кол-ва сообществ
function findCommunitiesNum(graph: Graph): number {
  const uniqueCommunities = new Set();
  graph.forEachNode((_node, attributes) => {
    uniqueCommunities.add(attributes.community);
  })
  return uniqueCommunities.size;
}

// Нахождение простых метрик
function findSimpleMetrics(graph: Graph) {
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

  graph.forEachNode((node) => {
    graph.setNodeAttribute(node, 'degree', degreeMap.get(node)!);
  });
  
  const maxDegree = Math.max(...Array.from(degreeMap.values()));
  const minDegree = Math.min(...Array.from(degreeMap.values()));

  let maxEdgeWeight = -Infinity;
  let minEdgeWeight = +Infinity;
  graph.forEachEdge((_edgeId, attributes, _source, _target) => {
    const weight = attributes.weight || 1;
    if (weight > maxEdgeWeight) 
      maxEdgeWeight = weight;
    if (weight < minEdgeWeight) 
      minEdgeWeight = weight;
  })

  const hubDominance = maxDegree / avgDegree;

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

function findDegreeGini(graph: Graph): number {
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
