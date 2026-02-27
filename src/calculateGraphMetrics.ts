import { type Node, type Link } from './graphInterfaces';

export function calculateGraphMetrics(nodes: Node[], links: Link[]) {
  const numNodes = nodes.length;
  const numLinks = links.length;
  const maxPossibleLinks = numNodes * (numNodes - 1) / 2;
  const density = numLinks / maxPossibleLinks;
  const avgDegree = (2 * numLinks) / numNodes;
  
  // Степени узлов
  const degreeMap = new Map<string, number>();
  nodes.forEach(n => degreeMap.set(n.id, 0));
  links.forEach(l => {
    degreeMap.set(l.source, (degreeMap.get(l.source) || 0) + 1);
    degreeMap.set(l.target, (degreeMap.get(l.target) || 0) + 1);
  });
  
  const maxDegree = Math.max(...Array.from(degreeMap.values()));
  const minDegree = Math.min(...Array.from(degreeMap.values()));

  // Строим список смежности
  const adjList: Map<string, string[]> = buildAdjList(nodes, links);

  // Нахождение эксцентриситета каждого узла, суммы всех путей, 
  // кол-ва связанных пар и компонент связности
  const eccentricities: number[] = [];
  let totalDist = 0;
  let pairCount = 0;
  let componentsNum = 0;
  const componentIndices = new Map<string, number>(); // к какой компоненте относится нода
  nodes.forEach(n => componentIndices.set(n.id, 0));

  for (const node of nodes) {
    const distances = bfsDistances(node.id, nodes, adjList);

    const maxDist = Math.max(...Array.from(distances.values()).filter(d => d !== Infinity));
    eccentricities.push(maxDist);

    for (const [targetId, dist] of distances) {
      if (targetId !== node.id && dist !== Infinity) {
        totalDist += dist;
        pairCount++;
      }
    }

    if (componentIndices.get(node.id) === 0) {
      componentsNum++;
      for (const [targetId, dist] of distances) {
        if (dist !== Infinity) {
          componentIndices.set(targetId, componentsNum);
        }
      }
    }
  }
  
  // Диаметр, радиус и длина среднего пути
  const diameter = Math.max(...eccentricities);
  const radius = Math.min(...eccentricities);
  const avgPathLen = pairCount > 0 ? totalDist / pairCount : 0;
  
  return {
    numNodes,
    numLinks,
    density,
    avgDegree,
    maxDegree,
    minDegree,
    diameter,
    radius,
    avgPathLen,
    componentsNum
  };
}

// Поиск кратчайших путей от одного узла (BFS)
function bfsDistances(startId: string, nodes: Node[], adjList: Map<string, string[]>): Map<string, number> {
  const distances = new Map<string, number>();
  nodes.forEach(n => distances.set(n.id, Infinity));
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
function buildAdjList(nodes: Node[], links: Link[]): Map<string, string[]> {
  const adjList = new Map<string, string[]>();
  nodes.forEach(n => adjList.set(n.id, []));
  links.forEach(l => {
    adjList.get(l.source)!.push(l.target);
    adjList.get(l.target)!.push(l.source);
  });
  return adjList;
}
