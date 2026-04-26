import Graph from 'graphology';
import type graphMetrics from '../metrics-module/graphMetricsInterface';

export default function hideUnimportantEdges(graph: Graph, metrics: graphMetrics) {
  // Текущие степени по нескрытым ребрам
  const deg = new Map<string, number>();
  graph.forEachNode(n => deg.set(n, 0));
  graph.forEachEdge((id, _, s, t) => {
    if (graph.getEdgeAttribute(id, 'hidden') !== true && s !== t) {
      deg.set(s, (deg.get(s) || 0) + 1);
      deg.set(t, (deg.get(t) || 0) + 1);
    }
  });

  // Собираем кандидатов (importance < avg)
  const candidates: { id: string; s: string; t: string; imp: number }[] = [];
  graph.forEachEdge((id, attrs, s, t) => {
    if (attrs.hidden !== true && (attrs.importance ?? 0) < metrics.avgEdgeImportance!) {
      candidates.push({ id, s, t, imp: attrs.importance ?? 0 });
    }
  });

  // Сортируем: сначала скрываем наименее важные
  // Гарантирует, что сначала уйдут самые слабые связи
  candidates.sort((a, b) => a.imp - b.imp);

  // Применяем правила
  for (const { id, s, t } of candidates) {
    const sHidden = graph.getNodeAttribute(s, 'hidden') === true;
    const tHidden = graph.getNodeAttribute(t, 'hidden') === true;

    // Скрываем, если узлы уже скрыты
    if (sHidden || tHidden) {
      graph.setEdgeAttribute(id, 'hidden', true);
      continue;
    }

    // Не скрываем, если узел станет изолированным
    if ((deg.get(s) || 0) > 1 && (deg.get(t) || 0) > 1) {
      graph.setEdgeAttribute(id, 'hidden', true);
      deg.set(s, deg.get(s)! - 1);
      deg.set(t, deg.get(t)! - 1);
    }
  }
}