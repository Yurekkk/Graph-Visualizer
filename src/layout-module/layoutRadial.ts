import Graph from "graphology";
import * as alg from "../configs/algorithmicConfig";
import * as vis from '../configs/visualConfig.ts';
import type FilteredGraph from "../misc/filteredGraph.ts";



/**
 * Радиальная раскладка графа:
 * - Центр - узел с максимальной степенью.
 * - Уровни определяются удалённостью от корня (BFS).
 * - В пределах уровня узлы размещаются по окружности; 
 *   если сумма диаметров превышает длину окружности, 
 *   уровень разбивается на подслои с учётом растущей ёмкости дальних орбит.
 * - Подслои заполняются, начиная с внешнего (большего радиуса).
 * - Для минимизации пересечений рёбер узлы на уровне/подслое 
 *   сортируются по среднему углу соседей из предыдущего уровня.
 */

export default function radialLayout(graph: Graph | FilteredGraph, rootNode?: string) {
  if (graph.order === 0) return;

  // Корень - узел с максимальной невзвешенной степенью (если не задан)
  if (!rootNode) {
    let maxDegree = -Infinity;
    graph.forEachNode((node) => {
      const deg = graph.degree(node);
      if (deg > maxDegree) {
        maxDegree = deg;
        rootNode = node;
      }
    });
  }
  if (!rootNode) {
    console.log("Радиальная раскладка: не найден корневой узел");
    return;
  }

  // BFS по уровням
  const rings: string[][] = [];
  const visited = new Set<string>();
  const queue: { node: string; level: number }[] = [{ node: rootNode, level: 0 }];
  visited.add(rootNode);

  while (queue.length > 0) {
    const { node, level } = queue.shift()!;
    if (!rings[level]) rings[level] = [];
    rings[level].push(node);

    graph.forEachNeighbor(node, neighbor => {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ node: neighbor, level: level + 1 });
      }
    });
  }

  // Недостижимые узлы - самый далекий слой
  const fallbackLevel = rings.length;
  graph.forEachNode(node => {
    if (!visited.has(node)) {
      if (!rings[fallbackLevel]) rings[fallbackLevel] = [];
      rings[fallbackLevel].push(node);
    }
  });

  const nodeAngleMap = new Map<string, number>();

  function getTargetAngle(node: string, parentRing: string[]): number {
    // Для заданного узла вычисляет средний угол всех его соседей, 
    // которые уже размещены на предыдущем кольце
    let totalAngle = 0;
    let count = 0;
    graph.forEachNeighbor(node, neighbor => {
      if (parentRing.includes(neighbor)) {
        const ang = nodeAngleMap.get(neighbor);
        if (ang !== undefined) {
          totalAngle += ang;
          count++;
        }
      }
    });
    return count > 0 ? totalAngle / count : 0;
  };

  const sortByParentAngles = (nodes: string[], parentRing: string[]) => {
    nodes.sort((a, b) => getTargetAngle(a, parentRing) - getTargetAngle(b, parentRing));
  };

  // Адаптивная расстановка с учётом подслоёв предыдущего уровня
  let currentRadius = 0; // радиус, с которого начинается следующий уровень

  rings.forEach((ringNodes, level) => {
    if (ringNodes.length === 0) return;

    // Уровень 0 - корень в центре
    if (level === 0) {
      const root = ringNodes[0];
      graph.setNodeAttribute(root, "x", 0);
      graph.setNodeAttribute(root, "y", 0);
      nodeAngleMap.set(root, 0);
      currentRadius = vis.nodeMaxSize / 2 + alg.radialRingSpacing;
      return;
    }

    const baseRadius = currentRadius; // начало этого уровня
    const nodesWithSize = ringNodes.map(node => ({
      node,
      radius: vis.nodeMaxSize / 2,
      diameter: vis.nodeMaxSize,
    }));

    const totalWidth = nodesWithSize.reduce((sum, n) => sum + n.diameter, 0);
    const circumference = 2 * Math.PI * baseRadius;

    let maxNodeRadius = 0;
    if (nodesWithSize.length > 0) {
      maxNodeRadius = nodesWithSize.reduce((max, n) => Math.max(max, n.radius), 0);
    }

    // Обычный случай: одна окружность
    if (totalWidth <= circumference || ringNodes.length === 1) {
      if (level > 0 && rings[level - 1]) {
        sortByParentAngles(ringNodes, rings[level - 1]);
      }
      const count = ringNodes.length;
      ringNodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / count;
        graph.setNodeAttribute(node, "x", Math.cos(angle) * baseRadius);
        graph.setNodeAttribute(node, "y", Math.sin(angle) * baseRadius);
        nodeAngleMap.set(node, angle);
      });

      // следующий уровень будет дальше на расстояние + отступ
      currentRadius = baseRadius + maxNodeRadius + alg.radialRingSpacing;
    } else {
      // Переполнение - разбиваем на подслои
      const subRingDelta = maxNodeRadius * alg.radialSubringSpacing;

      const subRings: { node: string; radius: number; diameter: number }[][] = [];
      const capacities: number[] = [];
      const circumferences: number[] = [];

      const addSubRing = () => {
        const idx = subRings.length;
        const r = baseRadius + idx * subRingDelta;
        subRings.push([]);
        capacities.push(0);
        circumferences.push(2 * Math.PI * r);
      };

      addSubRing();
      const items = [...nodesWithSize].sort((a, b) => b.diameter - a.diameter);

      for (const item of items) {
        let placed = false;
        // начинаем с дальнего подслоя
        for (let i = subRings.length - 1; i >= 0; i--) {
          if (capacities[i] + item.diameter <= circumferences[i]) {
            subRings[i].push(item);
            capacities[i] += item.diameter;
            placed = true;
            break;
          }
        }
        if (!placed) {
          addSubRing();
          subRings[subRings.length - 1].push(item);
          capacities[subRings.length - 1] += item.diameter;
        }
      }

      // размещаем подслои
      subRings.forEach((subRing, subIdx) => {
        const radius = baseRadius + subIdx * subRingDelta;

        if (level > 0 && rings[level - 1]) {
          const sizeMap = new Map(subRing.map(s => [s.node, { radius: s.radius, diameter: s.diameter }]));
          const sortedNodes = subRing
            .map(s => s.node)
            .sort((a, b) => getTargetAngle(a, rings[level - 1]) - getTargetAngle(b, rings[level - 1]));
          subRing.length = 0;
          for (const n of sortedNodes) {
            subRing.push({ node: n, ...sizeMap.get(n)! });
          }
        }

        const count = subRing.length;
        if (count === 0) return;
        const angleOffset = subIdx * (Math.PI / (subRings.length * 2));
        subRing.forEach((item, i) => {
          const angle = angleOffset + (2 * Math.PI * i) / count;
          graph.setNodeAttribute(item.node, "x", Math.cos(angle) * radius);
          graph.setNodeAttribute(item.node, "y", Math.sin(angle) * radius);
          nodeAngleMap.set(item.node, angle);
        });
      });

      // дальний радиус последнего подслоя + радиус узла + отступ
      const lastSubRingRadius = baseRadius + (subRings.length - 1) * subRingDelta;
      currentRadius = lastSubRingRadius + maxNodeRadius + alg.radialRingSpacing;
    }
  });
}
