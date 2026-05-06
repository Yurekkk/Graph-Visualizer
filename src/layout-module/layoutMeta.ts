import type Graph from "graphology";
import { buildCommunityGraph, buildMetaGraph, getGraphCenterRadius } from "../misc/utilsAlgorithmic";
import noverlap from "graphology-layout-noverlap";
import { findCommunities } from "../metrics-module/communitiesFinding";
import { calculateGraphMetrics } from "../metrics-module/metricsCalculations";
import { smartLayout } from "./layoutEngine";
import * as alg from '../configs/algorithmicConfig.ts';



let buildingSubgraphsTime = 0;
let metricsCalculationTime = 0;
let communitiesFindingTime = 0;
let start, end;



export default function metaLayout(graph: Graph, _recursion_level: number) {
    start = performance.now();
  const metaGraph = buildMetaGraph(graph);
    end = performance.now();
    buildingSubgraphsTime += end - start;

    start = performance.now();
  let metaMetrics = calculateGraphMetrics(metaGraph);
    end = performance.now();
    metricsCalculationTime += end - start;

    start = performance.now();
  const resolution = alg.louvainResolution - alg.metaLayoutResolutionDecreaseStep * _recursion_level;
  let {numCommunities, modularity} = findCommunities(metaGraph, resolution);
  metaMetrics = {...metaMetrics, numCommunities, modularity};
    end = performance.now();
    communitiesFindingTime += end - start;

  const communities = new Map<string, {commGraph: Graph, 
    centerX: number, centerY: number, radius: number}>();
  
  // Рекурсивно раскладываем каждое сообщество по отдельности
  // Первый проход: раскладываем сообщества, считаем радиусы
  metaGraph.forEachNode((commId, metaAttrs) => {
      start = performance.now();
    const commGraph = buildCommunityGraph(graph, commId);
      end = performance.now();
      buildingSubgraphsTime += end - start;

      start = performance.now();
    let metricsComm = calculateGraphMetrics(commGraph);
      end = performance.now();
      metricsCalculationTime += end - start;

      start = performance.now();
    ({numCommunities, modularity} = findCommunities(commGraph));
    metricsComm = {...metricsComm, numCommunities, modularity};
      end = performance.now();
      communitiesFindingTime += end - start;

    // Раскладываем сообщество
    smartLayout(commGraph, metricsComm, 'auto', _recursion_level + 1, 'commGraph');
    // noverlap.assign(commGraph); // Долго

    // Считаем центры и радиусы
    const { centerX, centerY, radius } = getGraphCenterRadius(commGraph);

    communities.set(commId, {commGraph: commGraph, 
      centerX: centerX, centerY: centerY, radius: radius})

    // Размер узла в мета-графе = радиус соответствующего разложенного commGraph
    metaAttrs.size = radius;
  });

  // Рекурсивно раскладываем мета-граф
  smartLayout(metaGraph, metaMetrics, 'auto', _recursion_level + 1, 'metaGraph');
  noverlap.assign(metaGraph); // Тут быстро достаточно

  // Второй проход: композиция координат
  metaGraph.forEachNode((commId, metaAttrs) => {
    const {commGraph, centerX: centerX, centerY: centerY, 
      radius: _radius} = communities.get(commId)!;
    commGraph.forEachNode((node, localAttrs) => {
      const metaX = metaAttrs.x;
      const metaY = metaAttrs.y;
      const localX = (localAttrs.x - centerX);
      const localY = (localAttrs.y - centerY);
      graph.setNodeAttribute(node, 'x', metaX + localX);
      graph.setNodeAttribute(node, 'y', metaY + localY);
    });
  });

  if (_recursion_level === 0) {
    console.log(`- Время построения подграфов: ${buildingSubgraphsTime.toFixed(3)} мс`);
    console.log(`- Время расчета метрик подграфов: ${metricsCalculationTime.toFixed(3)} мс`);
    console.log(`- Время нахождения сообществ в подграфах: ${communitiesFindingTime.toFixed(3)} мс`);
    buildingSubgraphsTime = 0;
    metricsCalculationTime = 0;
    communitiesFindingTime = 0;
  }
}
