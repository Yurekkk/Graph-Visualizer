import Graph from "graphology";
import { timestamp_threshold } from '../configs/algorithmicConfig';

export default function parseCSV(content: string): Graph {
  const graph = new Graph({type: 'undirected', allowSelfLoops: false});
  const lines = content.trim().split('\n');
  const nodes = new Set<string>();
  const edges: Array<{ source: string; target: string; weight: number }> = [];

  let lineIndex = 0;

  // Пропускаем комментарии
  while (lines[lineIndex]?.startsWith('%'))
    lineIndex++;

  // Определяем разделитель
  const delimiter = lines[0].includes('\t') ? '\t' : 
                    lines[0].includes(',')  ? ','  : ' ';

  // Проверяем, есть ли заголовок
  const hasHeader = !/^\d/.test(lines[lineIndex]);
  if (hasHeader) lineIndex++;

  for (; lineIndex < lines.length; lineIndex++) {
    const parts = lines[lineIndex].trim().split(delimiter);
    if (parts.length < 2) continue;

    const source = parts[0].trim();
    const target = parts[1].trim();
    const weight = parts[2] ? parseFloat(parts[2]) : 1;

    nodes.add(source);
    nodes.add(target);
    edges.push({ source, target, weight });
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
