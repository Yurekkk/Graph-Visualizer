import Graph from 'graphology';
import { parse as parseGEXFGraphology } from "graphology-gexf/browser";
import { timestamp_threshold } from './configs/algorithmicConfig';


// TODO: Пофикси двунаправленность связей


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
  format: string = 'auto'
): Promise<Graph> {
  const response = await fetch(filePath);
  const content = await response.text();

  if (format === 'auto') format = detectFormat(filePath);

  switch (format) {
    case 'json':
      return parseJSON(content);
    case 'gexf':
      return parseGEXF(content);
    case 'mtx':
      return parseMTX(content);
    case 'csv':
      return parseCSV(content);
    case 'dot':
      return parseDOT(content);
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
    case 'dot':
      return 'dot';
    default:
      return ext ?? 'unknown';
  }
}



function parseJSON(content: string): Graph {
  const graph = new Graph({type: 'undirected', allowSelfLoops: false});
  const data = JSON.parse(content);

  if (data.nodes) {
    data.nodes.forEach((node: Node) => {
      graph.addNode(node.id ?? node.key, {
        ...node,
        ...node.attributes,
        label: node.label ?? node.attributes?.label ?? node.id ?? node.key,
      });
    });
  }

  const edges = data.edges || data.links;

  if (edges) {
    edges.forEach((edge: Edge) => {
      if (edge.source !== edge.target) {
        graph.addEdge(edge.source, edge.target, {
          ...edge,
          ...edge.attributes,
          weight: edge.weight ?? edge.size ?? edge.value ?? edge.attributes?.weight ??
            edge.attributes?.size ?? edge.attributes?.value ?? 1,
        });
      }
    });
  }

  return graph;
}



function parseGEXF(content: string): Graph {
  // Этот парсер еще не тестировался
  const graph = parseGEXFGraphology(Graph, content);
  return graph;
}



function parseMTX(content: string): Graph {
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



function parseCSV(content: string): Graph {
  const graph = new Graph({type: 'undirected', allowSelfLoops: false});
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



function parseDOT(content: string): Graph {
  const graph = new Graph({type: 'undirected', allowSelfLoops: false});
  
  // Удаляем комментарии // и /* */
  const clean = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  // Находим все объявления узлов: n0; n1; ...
  const nodeRegex = /^\s*(\w+)\s*;/gm;
  let match;
  while ((match = nodeRegex.exec(clean)) !== null) {
    const id = match[1];
    if (!graph.hasNode(id)) {
      graph.addNode(id, { label: id });
    }
  }

  // Находим все ребра: n0 -- n9 [attrs];
  // Группа 1: источник, 2: тип (-- или -->), 3: цель, 4: атрибуты (опционально)
  const edgeRegex = /(\w+)\s*(--|->)\s*(\w+)(?:\s*\[(.*?)\])?/g;
  
  while ((match = edgeRegex.exec(clean)) !== null) {
    const source = match[1];
    const target = match[3];
    const attrsString = match[4]; // "id=e42"

    // Парсинг атрибутов из строки "id=e42, weight=5"
    const attributes: any = {};
    if (attrsString) {
      const attrPairs = attrsString.split(',');
      attrPairs.forEach(pair => {
        const [key, val] = pair.trim().split('=');
        if (key && val) {
          // Убираем кавычки если есть
          attributes[key.trim()] = val.trim().replace(/^["']|["']$/g, '');
        }
      });
    }

    if (!graph.hasEdge(source, target) && source !== target) {
      graph.addEdge(source, target, attributes);
    }
  }

  return graph;
}
