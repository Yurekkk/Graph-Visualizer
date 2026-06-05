import Graph from "graphology";
import { parse as parseGEXFGraphology } from "graphology-gexf/browser";

export default function parseGEXF(content: string): Graph {
  // Этот парсер еще не тестировался
  const graph = parseGEXFGraphology(Graph, content);
  return graph;
}
