import Graph from 'graphology';

// TODO?,: Че-нибудь сделать с тем, что в radial layout скрывает не листы

export default function hideUnimportantNodes(graph: Graph) {
  // Собираем узлы
  const nodes = graph.nodes().map(id => ({
    id,
    x: graph.getNodeAttribute(id, 'x') ?? 0,
    y: graph.getNodeAttribute(id, 'y') ?? 0,
    size: graph.getNodeAttribute(id, 'size') ?? 1,
    imp: graph.getNodeAttribute(id, 'importance') ?? 0
  }));

  // Сортируем: важные в начале (их будем сохранять)
  nodes.sort((a, b) => b.imp - a.imp);

  const toHide = new Set<string>();

  // Попарная проверка (скрытый узел больше не участвует)
  for (let i = 0; i < nodes.length; i++) {
    if (toHide.has(nodes[i].id)) continue;
    for (let j = i + 1; j < nodes.length; j++) {
      if (toHide.has(nodes[j].id)) continue;

      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const minDist = nodes[i].size + nodes[j].size;

      // Если пересечение окружностей, то скрываем менее важный
      if (dx*dx + dy*dy < minDist * minDist) {
        toHide.add(nodes[j].id);
      }
    }
  }

  // Применяем
  toHide.forEach(id => graph.setNodeAttribute(id, 'hidden', true));
}