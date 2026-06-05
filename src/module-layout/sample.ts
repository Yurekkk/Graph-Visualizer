import Graph from 'graphology';

/**
 * Выбирает sampleSize узлов с наибольшей важностью без полной сортировки.
 * Использует Min-Heap для эффективного отбора top-k (O(N log k)).
 */
export default function sample(graph: Graph, sampleSize: number): string[] {
  const totalNodes = graph.order;

  // Если граф маленький - возвращаем все узлы
  if (totalNodes <= sampleSize) return graph.nodes();

  // Min-Heap: храним объекты {node, importance}, минимум по importance в корне
  const heap: { node: string; importance: number }[] = [];

  const push = (node: string, imp: number) => {
    heap.push({ node, importance: imp });
    let i = heap.length - 1;
    // всплытие
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent].importance <= heap[i].importance) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  };

  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      // просеивание вниз
      while (true) {
        let smallest = i;
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        if (left < heap.length && heap[left].importance < heap[smallest].importance)
          smallest = left;
        if (right < heap.length && heap[right].importance < heap[smallest].importance)
          smallest = right;
        if (smallest === i) break;
        [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
        i = smallest;
      }
    }
    return top;
  };

  // Основной проход по всем узлам
  graph.forEachNode((node, attrs) => {
    const imp: number = attrs.importance ?? 0;
    if (heap.length < sampleSize) {
      push(node, imp);
    } else if (imp > heap[0].importance) {
      pop();
      push(node, imp);
    }
  });

  // Возвращаем список узлов (порядок не гарантирован, но это top-k)
  return heap.map(entry => entry.node);
}
