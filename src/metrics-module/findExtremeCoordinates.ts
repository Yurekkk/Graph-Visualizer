import type Graph from "graphology";

export default function findExtremeCoordinates(graph: Graph): 
  { maxX: number, minX: number, maxY: number, minY: number } {
  let maxX = -Infinity, minX = Infinity, maxY = -Infinity, minY = Infinity;
  graph.forEachNode((_node, attrs) => {
    const x = attrs?.x ?? 0;
    const y = attrs?.y ?? 0;
    if (x > maxX) maxX = x;
    if (x < minX) minX = x;
    if (y > maxY) maxY = y;
    if (y < minY) minY = y;
  });
  return { maxX, minX, maxY, minY };
}
