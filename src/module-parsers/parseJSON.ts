import Graph from "graphology";

export default function parseJSON(content: string): Graph {
  const graph = new Graph({ type: 'undirected', allowSelfLoops: false });
  const data = JSON.parse(content);

  // Добавляем узлы
  if (data.nodes) {
    data.nodes.forEach((item: any) => {
      if (typeof item === 'string') {
        // простой список идентификаторов
        graph.addNode(item, { label: item });
      } else {
        const id = item.id ?? item.key;
        graph.addNode(id, {
          ...item,
          ...item.attributes,
          label: item.label ?? item.attributes?.label ?? id,
        });
      }
    });
  }

  const edges = data.edges || data.links;
  if (edges) {
    edges.forEach((item: any) => {
      let source: string, target: string, extra: any = {};

      if (Array.isArray(item)) {
        // формат [source, target]
        source = item[0];
        target = item[1];
        // если есть третий элемент – объект с атрибутами
        if (item.length > 2 && typeof item[2] === 'object') {
          extra = item[2];
        }
      } else {
        // объектный формат
        source = item.source;
        target = item.target;
        extra = { ...item, ...item.attributes };
        delete extra.source;
        delete extra.target;
      }

      if (source !== target) {
        graph.addEdge(source, target, {
          ...extra,
          weight: extra.weight ?? extra.size ?? extra.value ?? 1,
        });
      }
    });
  }

  return graph;
}
