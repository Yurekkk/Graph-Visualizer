import type Graph from "graphology";



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
