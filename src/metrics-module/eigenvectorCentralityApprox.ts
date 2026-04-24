import Graph from 'graphology';
import * as alg from '../configs/algorithmicConfig.ts';

export default function eigenvectorCentralityApprox(graph: Graph) {
  const nodes = graph.nodes();
  const n = nodes.length;
  if (n === 0) return;

  // Инициализируем вектор центральности равными значениями
  const x: Float64Array = new Float64Array(n);
  const prev: Float64Array = new Float64Array(n);
  x.fill(1.0);

  // Строим отображение узел -> индекс для быстрого доступа
  const nodeToIndex = new Map<string, number>();
  nodes.forEach((node, idx) => nodeToIndex.set(node, idx));

  // Степенной метод (power iteration)
  for (let iter = 0; iter < alg.eigCentralityMaxIterations; iter++) {
    // Сохраняем предыдущее значение для проверки сходимости
    prev.set(x);

    // Вычисляем новое значение: x_i = sum_{j -> i} x_j   (для in-direction)
    // Для ненаправленного графа рёбра считаются обоюдными.
    x.fill(0.0);

    // Ненаправленный граф: каждое ребро даёт вклад в обе стороны
    graph.forEachEdge((_edge, attrs, source, target) => {
      const si = nodeToIndex.get(source)!;
      const ti = nodeToIndex.get(target)!;
      x[si] += prev[ti] * attrs.weight;
      x[ti] += prev[si] * attrs.weight;
    });

    // Нормализация
    const norm = Math.sqrt(x.reduce((acc, val) => acc + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < n; i++) x[i] /= norm;
    }

    // Проверка сходимости: сравниваем с предыдущим вектором
    let diff = 0.0;
    for (let i = 0; i < n; i++)
      diff += Math.abs(x[i] - prev[i]);
    if (diff < alg.eigCentralityTolerance)
      // Досрочная сходимость - выходим
      break;
  }

  // Записываем значения
  nodes.forEach((node, idx) => {
    graph.setNodeAttribute(node, "eigenvectorCentrality", x[idx]);
  });
}
