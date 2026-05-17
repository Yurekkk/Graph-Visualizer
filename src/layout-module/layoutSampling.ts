import sample from './sample.ts';
import { setRandomCoords } from '../misc/utilsAlgorithmic.ts';
import type Graph from 'graphology';
import * as alg from '../configs/algorithmicConfig.ts';
// import * as vis from '../configs/visualConfig.ts';
import { smartLayout } from './layoutEngine.ts';
import FilteredGraph from '../misc/filteredGraph.ts';
import radialLayout from './layoutRadial.ts';
import findSimpleMetrics from '../metrics-module/simpleMetricsCalculation.ts';
import { findCommunities } from '../metrics-module/communitiesFinding.ts';
import forceAtlas2 from 'graphology-layout-forceatlas2';



/**
 * Итеративная раскладка на основе семплирования.
 *
 * 1. Выбираются `sampleSize` узлов с наибольшей важностью (importance).
 * 2. Эти узлы раскладываются подходящим алгоритмом (smartLayout).
 * 3. Оставшиеся (несэмплированные) узлы расставляются итеративно:
 *    - узлы с >=2 уже разложенными соседями получают координаты как взвешенное среднее координат соседей;
 *    - узлы с 1 разложенным соседом размещаются радиально вокруг этого соседа;
 *    - иначе узлы ждут следующей итерации.
 * Итерации продолжаются, пока на очередном проходе удаётся разложить хотя бы один узел.
 */

export default function samplingLayout(graph: Graph, _recursion_level: number = 0) {

  setRandomCoords(graph);

  // Семплирование важных узлов
  const sampleSize = graph.order ** alg.sampleSizeCoefficient;
  const sampledNodes = sample(graph, sampleSize);
  const sampledGraph = new FilteredGraph(graph, new Set(sampledNodes));

  const newCommAttr = "community_lvl" + (_recursion_level + 1);
  const resolution = alg.communitiesResolution - alg.metaLayoutResolutionDecreaseStep * _recursion_level;

  let subMetrics = findSimpleMetrics(sampledGraph);
  subMetrics = { ...subMetrics, ...findCommunities(sampledGraph, resolution, newCommAttr) };

  // Раскладываем сэмплированный подграф
  smartLayout(sampledGraph, subMetrics);

  // Увеличиваем размах, чтобы оставить место для интерполяции
  sampledGraph.forEachNode((_node, attrs) => {
    attrs.x *= alg.samplingLayoutSpacing;
    attrs.y *= alg.samplingLayoutSpacing;
  });

  // Множества уже разложенных и ещё неразложенных узлов
  const laidOutNodes = new Set<string>(sampledNodes);
  const unsetNodes = new Set<string>();
  graph.forEachNode((node) => {
    if (!laidOutNodes.has(node)) unsetNodes.add(node);
  });

  // Итеративное размещение оставшихся узлов
  let changed;
  for (let i = 0; i < alg.samplingLayoutIterations; i++) {
    changed = false;

    // --- Фаза 1: интерполяция для узлов с >=2 разложенными соседями ---
    for (const node of unsetNodes) {
      let sumX = 0, sumY = 0, totalWeight = 0, count = 0;

      graph.forEachNeighbor(node, (neighbor) => {
        if (laidOutNodes.has(neighbor)) {
          let edgeId = graph.edge(node, neighbor) || graph.edge(neighbor, node);
          if (!edgeId) return;
          const weight = graph.getEdgeAttribute(edgeId, 'weight') || 1;
          sumX += graph.getNodeAttribute(neighbor, 'x') * weight;
          sumY += graph.getNodeAttribute(neighbor, 'y') * weight;
          totalWeight += weight;
          count++;
        }
      });
      // catch(NotFoundGraphError) {} TODO

      if (count >= 2) {
        // Позиция = взвешенное среднее позиций соседей
        if (totalWeight === 0) totalWeight = 1;
        graph.mergeNodeAttributes(node, {
          x: sumX / totalWeight,
          y: sumY / totalWeight,
        });

        unsetNodes.delete(node);
        laidOutNodes.add(node);
        changed = true;
      }
    }

    // --- Фаза 2: радиальная раскладка для узлов с ровно 1 разложенным соседом ---
    // Группируем неразложенные узлы по их единственному разложенному соседу
    const centerToLeaves = new Map<string, string[]>();
    for (const node of unsetNodes) {
      let singleCenter: string | null = null;
      let laidOutCount = 0;
      graph.forEachNeighbor(node, (neighbor) => {
        if (laidOutNodes.has(neighbor)) {
          laidOutCount++;
          if (laidOutCount > 1) return;
          singleCenter = neighbor;
        }
      });
      if (laidOutCount === 1 && singleCenter) {
        if (!centerToLeaves.has(singleCenter)) centerToLeaves.set(singleCenter, []);
        centerToLeaves.get(singleCenter)!.push(node);
      }
    }

    // Для каждого центра с хотя бы одним листом строим временный граф и вызываем radialLayout
    for (const [center, leaves] of centerToLeaves.entries()) {
      const tempGraph = new FilteredGraph(graph, new Set([center, ...leaves]));

      radialLayout(tempGraph, center); // центр в (0,0), листья по окружности

      const centerX = graph.getNodeAttribute(center, 'x') ?? 0;
      const centerY = graph.getNodeAttribute(center, 'y') ?? 0;

      leaves.forEach((leaf) => {
        const localX = tempGraph.getNodeAttribute(leaf, 'x') ?? 0;
        const localY = tempGraph.getNodeAttribute(leaf, 'y') ?? 0;
        graph.setNodeAttribute(leaf, 'x', centerX + localX);
        graph.setNodeAttribute(leaf, 'y', centerY + localY);
        unsetNodes.delete(leaf);
        laidOutNodes.add(leaf);
      });
      changed = true;
    }

    if (!changed) break;
  }

  forceAtlas2.assign(graph, {iterations: 1, settings: {barnesHutOptimize: true}});
}
