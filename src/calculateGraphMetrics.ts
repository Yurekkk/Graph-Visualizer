import Graph from 'graphology';
// import labelPropagation from "./labelPropagation";
import calculateModularity from 'graphology-metrics/graph/modularity';
import louvain from 'graphology-communities-louvain';
import type graphMetrics from './graphMetricsInterface';
import * as alg from './configs/algorithmicConfig.ts';
import seedrandom from 'seedrandom';
// import betweennessCentrality from 'graphology-metrics/centrality/betweenness';
import coreNumber from 'graphology-cores';
// import pagerank from 'graphology-metrics/centrality/pagerank';

// Все это пока не учитывает, что граф может быть ориентированным
// Может потом добавлю

// Также для каждого узла считает degree, degreeCentrality и core

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
  // const end = performance.now();
  // console.log(`Время вычисления простых метрик: ${(end - start).toFixed(3)} мс`)

  const {numCommunities, modularity} = findCommunities(graph);

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



export function calculateNodeMetrics(graph: Graph) {
  /*
  // Очень долго считает
  start = performance.now();
  betweennessCentrality.assign(graph);
  end = performance.now();
  console.log(`Время вычисления центральности: ${(end - start).toFixed(3)} мс`);
  //*/

  const start = performance.now();
  coreNumber.coreNumber.assign(graph); // k-core
  // pagerank.assign(graph);
  // graph.forEachNode(node => {
  //   const cc = localClusteringCoefficient(graph, node);
  //   graph.setNodeAttribute(node, 'clusteringCoef', cc);
  // });
  calculateImportance(graph);
  const end = performance.now();
  console.log(`Время вычисления узловых метрик: ${(end - start).toFixed(3)} мс`);
}



export function findCommunities(graph: Graph) {
  // let start, end;

  /*
  start = performance.now();
  const _ = labelPropagation(graph, 100);
  end = performance.now();
  console.log(`Время нахождения сообществ (LPA): ${(end - start).toFixed(3)} мс`)
  //*/

  //*
  // start = performance.now();
  louvain.assign(graph, {
    rng: seedrandom(alg.seed), 
    resolution: alg.louvainResolution,
    nodeCommunityAttribute: 'community'
  });
  const numCommunities = findCommunitiesNum(graph);
  // end = performance.now();
  // console.log(`Время нахождения сообществ (louvain): ${(end - start).toFixed(3)} мс`)
  //*/

  // start = performance.now();
  let modularity;
  if (graph.size == 0 || graph.order == 0)
    modularity = 0;
  else modularity = calculateModularity(graph);
  // end = performance.now();
  // console.log(`Время нахождения модулярности: ${(end - start).toFixed(3)} мс`)

  return { numCommunities, modularity };
}



// Нахождение кол-ва сообществ
function findCommunitiesNum(graph: Graph): number {
  const uniqueCommunities = new Set();
  graph.forEachNode((_node, attributes) => {
    uniqueCommunities.add(attributes.community);
  })
  return uniqueCommunities.size;
}



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

  const N = graph.order;
  graph.forEachNode((node) => {
    graph.setNodeAttribute(node, 'degree', degreeMap.get(node)!);
    graph.setNodeAttribute(node, 'degreeCentrality', degreeMap.get(node)! / (N - 1));
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



function calculateImportance(graph: Graph) {
  const stats = { 
    deg: { min: Infinity, max: -Infinity },
    k:  { min: Infinity, max: -Infinity }
  };

  // Собираем максимумы и минимумы
  graph.forEachNode(node => {
    const deg = graph.getNodeAttribute(node, 'degree') ?? 0;
    const k  = graph.getNodeAttribute(node, 'core') ?? 0;

    if (deg < stats.deg.min) stats.deg.min = deg;
    if (deg > stats.deg.max) stats.deg.max = deg;
    if (k   < stats.k.min)   stats.k.min   = k;
    if (k   > stats.k.max)   stats.k.max   = k;
  });

  // Нормализация [0,1] + взвешивание
  graph.forEachNode((node, attrs) => {
    const norm = (val: number, s: { min: number; max: number }) =>
      s.max === s.min ? 1 : (val - s.min) / (s.max - s.min);

    const importance = alg.degreeWeight * norm(attrs.degree, stats.deg) +
                       alg.kCoreWeight * norm(attrs.core, stats.k);

    graph.setNodeAttribute(node, 'importance', importance);
  });
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



/*
function computeImportance(graph: Graph, weights = { pr: 0.4, k: 0.4, cc: 0.2 }) {
  const metrics = new Map<string, { pr: number; k: number; cc: number }>();
  const stats = { 
    pr: { min: Infinity, max: -Infinity },
    k:  { min: Infinity, max: -Infinity },
    cc: { min: Infinity, max: -Infinity }
  };

  // Сбор + логарифмирование (сжимает power-law "хвосты")
  graph.forEachNode(node => {
    const pr = graph.getNodeAttribute(node, 'pagerank') ?? 0;
    const k  = graph.getNodeAttribute(node, 'kcore') ?? 0;
    const cc = graph.getNodeAttribute(node, 'clustering') ?? 0;

    // log1p(x) = ln(1+x). Безопасен для 0, сжимает большие значения
    const lPr = Math.log1p(pr);
    const lK  = Math.log1p(k);
    const lCc = cc; // Без log, так как cc уже [0,1]

    metrics.set(node, { pr: lPr, k: lK, cc: lCc });

    if (lPr < stats.pr.min) stats.pr.min = lPr;
    if (lPr > stats.pr.max) stats.pr.max = lPr;
    if (lK  < stats.k.min)  stats.k.min  = lK;
    if (lK  > stats.k.max)  stats.k.max  = lK;
    if (lCc < stats.cc.min) stats.cc.min = lCc;
    if (lCc > stats.cc.max) stats.cc.max = lCc;
  });

  // Нормализация [0,1] + взвешивание
  metrics.forEach(({ pr, k, cc }, node) => {
    const norm = (val: number, s: { min: number; max: number }) =>
      s.max === s.min ? 0.5 : (val - s.min) / (s.max - s.min);

    const importance = weights.pr * norm(pr, stats.pr) +
                       weights.k  * norm(k,  stats.k) +
                       weights.cc * norm(cc, stats.cc);

    graph.setNodeAttribute(node, 'importance', Math.max(0, Math.min(1, importance)));
  });
}
//*/



// Слишком медленный
function localClusteringCoefficient(graph: Graph, node: string): number {
  const neighbors = graph.neighbors(node);
  const k = neighbors.length;
  
  if (k < 2) return 0; // не хватает соседей для треугольника
  
  // Считаем рёбра между соседями
  const neighborSet = new Set(neighbors);
  let edgesBetween = 0;

  for (const nb of neighbors) {
    for (const other of graph.neighbors(nb)) {
      if (neighborSet.has(other) && nb < other) { // nb<other чтобы не посчитать дважды
        edgesBetween++;
      }
    }
  }
  
  const maxPossible = k * (k - 1) / 2;
  return edgesBetween / maxPossible; // [0, 1]
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
function bfsDistances(startId: string, graph: Graph, 
  adjList: Map<string, string[]>): Map<string, number> {
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
