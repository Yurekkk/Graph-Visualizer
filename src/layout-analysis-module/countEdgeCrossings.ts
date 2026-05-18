import type Graph from "graphology";

function orientation(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
}

function segmentsIntersect(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): boolean {
  const o1 = orientation(x1, y1, x2, y2, x3, y3);
  const o2 = orientation(x1, y1, x2, y2, x4, y4);
  const o3 = orientation(x3, y3, x4, y4, x1, y1);
  const o4 = orientation(x3, y3, x4, y4, x2, y2);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

export default function countEdgeCrossings(graph: Graph): number {
  const edges = graph.edges();
  let crossings = 0;

  for (let i = 0; i < edges.length; i++) {
    const [s1, t1] = graph.extremities(edges[i]);
    const x1 = graph.getNodeAttribute(s1, 'x');
    const y1 = graph.getNodeAttribute(s1, 'y');
    const x2 = graph.getNodeAttribute(t1, 'x');
    const y2 = graph.getNodeAttribute(t1, 'y');

    for (let j = i + 1; j < edges.length; j++) {
      const [s2, t2] = graph.extremities(edges[j]);
      if (s1 === s2 || s1 === t2 || t1 === s2 || t1 === t2) continue;

      const x3 = graph.getNodeAttribute(s2, 'x');
      const y3 = graph.getNodeAttribute(s2, 'y');
      const x4 = graph.getNodeAttribute(t2, 'x');
      const y4 = graph.getNodeAttribute(t2, 'y');

      if (segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4))
        crossings++;
    }
  }
  
  return crossings;
}