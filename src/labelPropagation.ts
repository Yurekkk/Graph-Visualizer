import Graph from 'graphology';

// Возвращает кол-во найденных сообществ
export default function labelPropagation(
  graph: Graph,
  maxIterations: number = 100,
  seed: number = Math.random()
): number {

  const nodes = graph.nodes();
  let communities = new Map<string, string>();
  
  // Инициализация: каждый узел — своё сообщество
  nodes.forEach(node => communities.set(node, node));

  // PRNG для воспроизводимости
  let rand = seed;
  const random = () => {
    rand = (22695477 * rand + 1) % 2**31;
    return rand / 2**31;
  }

  const counts = new Map<string, number>();
  
  // Основной цикл
  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;
    const shuffled = [...nodes].sort(() => random() - 0.5);
    
    for (const currNode of shuffled) {
      counts.clear();
      
      graph.forEachNeighbor(currNode, (neighbor, _attributes) => {
        const edge = graph.edge(currNode, neighbor) || 
                     graph.edge(neighbor, currNode);
        const comm = communities.get(neighbor)!;
        const weight = graph.getEdgeAttribute(edge, "weight") || 1;
        counts.set(comm, (counts.get(comm) || 0) + weight);
      });

      if (counts.size === 0) continue; // Изолированный узел

      // Находим лучшую метку
      let bestComm = communities.get(currNode);
      let bestWeight = -Infinity;

      for (const [comm, weight] of counts) {
        if (weight > bestWeight || weight === bestWeight && 
            bestComm === communities.get(currNode)) {
          bestWeight = weight;
          bestComm = comm;
        }
      }

      if (bestComm !== communities.get(currNode)) {
        communities.set(currNode, bestComm!);
        changed = true;
      }
    }
    
    if (!changed) break;
  }


  // Нумеруем сообщества
  const uniqueCommunities = Array.from(new Set(communities.values()));
  const communityMap = new Map<string, number>();
  uniqueCommunities.forEach((comm, index) => {
    communityMap.set(comm, index);
  });

  // Записываем в граф номера
  nodes.forEach(node => {
    const oldComm = communities.get(node);
    const newComm = communityMap.get(oldComm!);
    graph.setNodeAttribute(node, "community", newComm);
  });

  return uniqueCommunities.length;
}
