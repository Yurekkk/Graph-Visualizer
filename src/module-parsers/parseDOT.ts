import Graph from "graphology";

export default function parseDOT(content: string): Graph {
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
