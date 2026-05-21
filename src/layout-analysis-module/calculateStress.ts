import type Graph from "graphology";

export default function calculateStress(graph: Graph): number {
  const nodes = graph.nodes();
  const n = nodes.length;
  const positions: { x: number; y: number }[] = nodes.map(id => ({
    x: graph.getNodeAttribute(id, 'x'),
    y: graph.getNodeAttribute(id, 'y'),
  }));

  // Вычисляем все кратчайшие расстояния (невзвешенный BFS)
  const graphDistances: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
//   const indexMap = new Map<string, number>(nodes.map((id, i) => [id, i]));

  for (let i = 0; i < n; i++) {
    const startId = nodes[i];
    const dist = new Map<string, number>();
    const queue = [startId];
    dist.set(startId, 0);

    while (queue.length > 0) {
      const v = queue.shift()!;
      const d = dist.get(v)!;
      graph.forEachNeighbor(v, (neighbor) => {
        if (!dist.has(neighbor)) {
          dist.set(neighbor, d + 1);
          queue.push(neighbor);
        }
      });
    }

    for (let j = 0; j < n; j++) {
      const d = dist.get(nodes[j]);
      if (d !== undefined) {
        graphDistances[i][j] = d;
        graphDistances[j][i] = d; // неориентированный граф
      }
    }
  }

  // Вычисляем стресс
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dg = graphDistances[i][j];
      if (!isFinite(dg)) continue; // несвязные компоненты

      const dx = positions[i].x - positions[j].x;
      const dy = positions[i].y - positions[j].y;
      const geomDist = Math.sqrt(dx * dx + dy * dy);

      const diff = dg - geomDist;
      numerator += diff * diff / (dg * dg);
      denominator += dg * dg / (dg * dg);
    }
  }

  if (denominator === 0) return 0;
  return numerator / denominator;
}
