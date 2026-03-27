import Graph from 'graphology';

export default function stratifiedSampling(
  graph: Graph,
  options: {
    sampleSize: number;
    method?: 'proportional' | 'equal';
    prioritizeHighDegree?: boolean;
  }
): string[] {

  const {
    sampleSize,
    method = 'proportional',
    prioritizeHighDegree = true
  } = options;

  const totalNodes = graph.order;
  
  // Если граф маленький — возвращаем все узлы
  if (totalNodes <= sampleSize) {
    return graph.nodes();
  }

  // Группируем узлы по стратам (сообществам)
  const strata = new Map<number, string[]>();
  graph.forEachNode((node, attrs) => {
    const stratum = attrs['community'] ?? 0;
    if (!strata.has(stratum)) strata.set(stratum, []);
    strata.get(stratum)!.push(node);
  });

  const sampled: string[] = [];

  if (method === 'proportional') {
    // Пропорционально размеру страты
    for (const [_stratum, nodes] of strata) {
      const proportion = nodes.length / totalNodes;
      const count = Math.max(1, Math.round(sampleSize * proportion));
      let shuffled;
      if (!prioritizeHighDegree)
        shuffled = nodes.sort(() => Math.random() - 0.5);
      else 
        shuffled = nodes.sort((a, b) => {
          return graph.getNodeAttribute(b, "degree") - 
            graph.getNodeAttribute(a, "degree");  // По убыванию
        });
      sampled.push(...shuffled.slice(0, count));
    }
  } 
  else {
    // Равномерно из каждой страты
    const perStratum = Math.floor(sampleSize / strata.size);
    for (const [, nodes] of strata) {
      let shuffled;
      if (!prioritizeHighDegree)
        shuffled = nodes.sort(() => Math.random() - 0.5);
      else 
        shuffled = nodes.sort((a, b) => {
          return graph.getNodeAttribute(b, "degree") - 
            graph.getNodeAttribute(a, "degree");  // По убыванию
        });
      sampled.push(...shuffled.slice(0, perStratum));
    }
  }

  return sampled;
}