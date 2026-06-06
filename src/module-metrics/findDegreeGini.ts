import type Graph from "graphology";

export default function findDegreeGini(graph: Graph): number {
  const n = graph.order;
  if (n <= 1) return 0;

  // Собираем степени всех узлов
  const degrees: number[] = [];
  graph.forEachNode((node) => degrees.push(
    graph.getNodeAttribute(node, 'degree') || graph.degree(node)));

  degrees.sort((a, b) => a - b);

  // Считаем по формуле
  let sumDegrees = 0;
  let weightedSum = 0;
  
  for (let i = 0; i < n; i++) {
    const d = degrees[i];
    sumDegrees += d;
    weightedSum += (i + 1) * d; // i+1 потому что формула 1-based
  }

  if (sumDegrees === 0) return 0; // граф без рёбер

  const gini = (2 * weightedSum) / (n * sumDegrees) - (n + 1) / n;
  
  // Численная стабилизация
  return Math.max(0, Math.min(1, gini));
}
