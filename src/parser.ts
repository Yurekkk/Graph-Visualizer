import Graph from 'graphology';
import { parse as parseGEXFGraphology } from "graphology-gexf/browser";



// Если все значения ребер больше этого порога, 
// то, скорее всего, это не веса, а временные метки
const TIMESTAMP_THRESHOLD = 500_000_000;

// gexf parser has not been tested



interface Node {
  id: string;
  [key: string]: any;
}

interface Edge {
  source: string;
  target: string;
  weight?: number;
  [key: string]: any;
}



export default async function parseGraphFile(
  filePath: string,
  format:string = 'auto'
): Promise<Graph> {
  const response = await fetch(filePath);
  const content = await response.text();

  if (format === 'auto') {
    format = detectFormat(filePath);
  }

  switch (format) {
    case 'json':
      return parseJSON(content);
    case 'gexf':
      return parseGEXF(content);
    case 'mtx':
      return parseMTX(content);
    case 'csv':
      return parseCSV(content);
    default:
      throw new Error(`Неподдерживаемый формат: ${format}`);
  }
}



function detectFormat(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'json':
      return 'json';
    case 'gexf':
    case 'xml':
      return 'gexf';
    case 'mtx':
    case 'matrix':
      return 'mtx';
    case 'csv':
    case 'tsv':
    case 'edges':
      return 'csv';
    default:
      return ext ?? 'unknown';
  }
}



function parseJSON(content: string): Graph {
  const graph = new Graph();
  const data = JSON.parse(content);

  if (data.nodes) {
    data.nodes.forEach((node: Node) => {
      graph.addNode(node.id, {
        ...node,
        label: node.label ?? node.id,
      });
    });
  }

  const edges = data.edges || data.links;

  if (edges) {
    edges.forEach((edge: Edge) => {
      graph.addEdge(edge.source, edge.target, {
        ...edge,
        weight: edge.weight ?? edge.size ?? edge.value ?? 1,
      });
    });
  }

  return graph;
}



function parseGEXF(content: string): Graph {
  const graph = parseGEXFGraphology(Graph, content);
  return graph;
}



function parseMTX(content: string): Graph {
  const graph = new Graph();
  const lines = content.trim().split('\n');
  const nodes = new Set<string>();
  const edges: Array<{ source: string; target: string; weight: number }> = [];

  let lineIndex = 0;

  // Пропускаем комментарии
  while (lines[lineIndex]?.startsWith('%')) {
    lineIndex++;
  }

  // Первая строка: rows cols entries
  const [rows, cols, _entries] = lines[lineIndex]
    .trim()
    .split(/\s+/)
    .map(Number);
  lineIndex++;

  const isSymmetric = rows === cols;

  for (let i = lineIndex; i < lines.length; i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts.length < 2) continue;

    const row = parts[0];
    const col = parts[1];
    const weight = parts[2] ? parseFloat(parts[2]) : 1;

    nodes.add(row);
    nodes.add(col);

    edges.push({ source: row, target: col, weight });

    // Для симметричных матриц добавляем обратное ребро
    if (isSymmetric && row !== col) {
      edges.push({ source: col, target: row, weight });
    }
  }

  nodes.forEach((id) => {
    graph.addNode(id, { label: id });
  });

  let valuesAreTimestamps = true;
  for (const edge of edges) {
    if (edge.weight < TIMESTAMP_THRESHOLD) {
      valuesAreTimestamps = false;
      break;
    }
  }

  edges.forEach((edge) => {
    if (!graph.hasEdge(edge.source, edge.target)) {
      graph.addEdge(edge.source, edge.target, {
        weight: valuesAreTimestamps ? 1 : edge.weight
      });
    }
    else {
      const edgeID = graph.edge(edge.source, edge.target);
      const oldWeight = graph.getEdgeAttribute(edgeID, 'weight');
      graph.setEdgeAttribute(edge.source, edge.target, 'weight', 
        oldWeight + (valuesAreTimestamps ? 1 : edge.weight));
    }
  });

  return graph;
}



function parseCSV(content: string): Graph {
  const graph = new Graph();
  const lines = content.trim().split('\n');
  const nodes = new Set<string>();
  const edges: Array<{ source: string; target: string; weight: number }> = [];

  // Определяем разделитель
  const delimiter = lines[0].includes('\t') ? '\t' : ',';

  // Проверяем, есть ли заголовок
  const hasHeader = !/^\d/.test(lines[0]);
  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].trim().split(delimiter);
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
    if (edge.weight < TIMESTAMP_THRESHOLD) {
      valuesAreTimestamps = false;
      break;
    }
  }

  edges.forEach((edge) => {
    if (!graph.hasEdge(edge.source, edge.target)) {
      graph.addEdge(edge.source, edge.target, {
        weight: valuesAreTimestamps ? 1 : edge.weight
      });
    }
    else {
      const edgeID = graph.edge(edge.source, edge.target);
      const oldWeight = graph.getEdgeAttribute(edgeID, 'weight');
      graph.setEdgeAttribute(edge.source, edge.target, 'weight', 
        oldWeight + (valuesAreTimestamps ? 1 : edge.weight));
    }
  });

  return graph;
}
