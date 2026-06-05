import Graph from "graphology";
import { timestamp_threshold } from '../configs/algorithmicConfig';

export default function parseMTX(content: string): Graph {
  const graph = new Graph({type: 'undirected', allowSelfLoops: false});
  const lines = content.trim().split('\n');
  const nodes = new Set<string>();
  const edges: Array<{ source: string; target: string; weight: number }> = [];

  let lineIndex = 0;

  // Пропускаем комментарии
  while (lines[lineIndex]?.startsWith('%')) {
    lineIndex++;
  }

  // Первая строка: rows cols entries
  const [_rows, _cols, _entries] = lines[lineIndex]
    .trim()
    .split(/\s+/)
    .map(Number);
  lineIndex++;

  for (let i = lineIndex; i < lines.length; i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts.length < 2) continue;

    const row = parts[0];
    const col = parts[1];
    const weight = parts[2] ? parseFloat(parts[2]) : 1;

    nodes.add(row);
    nodes.add(col);

    edges.push({ source: row, target: col, weight });
  }

  nodes.forEach((id) => {
    graph.addNode(id, { label: id });
  });

  let valuesAreTimestamps = true;
  for (const edge of edges) {
    if (edge.weight < timestamp_threshold) {
      valuesAreTimestamps = false;
      break;
    }
  }

  edges.forEach((edge) => {
    if (edge.source !== edge.target && 
    !graph.hasEdge(edge.source, edge.target)) {
      graph.addEdge(edge.source, edge.target, {
        weight: valuesAreTimestamps ? 1 : edge.weight
      });
    }
  });

  return graph;
}
