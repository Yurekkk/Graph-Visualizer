import type Graph from "graphology";

export default function computeEdgeLengthCV(graph: Graph): number {
  const edges = graph.edges();
  const E = edges.length;
  if (E === 0) return 0;

  let sum = 0, sumSq = 0;
  for (const edge of edges) {
    const [s, t] = graph.extremities(edge);
    const dx = graph.getNodeAttribute(s, 'x') - graph.getNodeAttribute(t, 'x');
    const dy = graph.getNodeAttribute(s, 'y') - graph.getNodeAttribute(t, 'y');
    const len = Math.sqrt(dx * dx + dy * dy);
    sum += len;
    sumSq += len * len;
  }

  const mean = sum / E;
  const variance = sumSq / E - mean * mean;
  if (variance <= 0 || mean === 0) return 0;
  return Math.sqrt(variance) / mean;
}