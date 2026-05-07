import type Graph from "graphology";
import { buildCommunityGraph, buildMetaGraph, getGraphCenterRadius } from "../misc/utilsAlgorithmic";
import noverlap from "graphology-layout-noverlap";
import { findCommunities } from "../metrics-module/communitiesFinding";
import { calculateGraphMetrics } from "../metrics-module/metricsCalculations";
import { smartLayout } from "./layoutEngine";
import * as alg from '../configs/algorithmicConfig.ts';
import type { Attributes } from "graphology-types";



type Timer = { value: number };

let buildingSubgraphsTimer: Timer = {value: 0};
let metricsCalculationTimer: Timer = {value: 0};
let communitiesFindingTimer: Timer = {value: 0};

function timed(accumulator: Timer, fn: () => any) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  accumulator.value += end - start;
  return result;
}



export default function metaLayout(graph: Graph, _recursion_level: number) {
  // Мета-граф придется строить в любом случае
  const metaGraph = timed(buildingSubgraphsTimer, () => buildMetaGraph(graph));
  let metaMetrics = timed(metricsCalculationTimer, () => calculateGraphMetrics(metaGraph));
  const resolution = alg.communitiesResolution - alg.metaLayoutResolutionDecreaseStep * _recursion_level;
  let {numCommunities, modularity} = timed(communitiesFindingTimer, () => findCommunities(metaGraph, resolution));
  metaMetrics = {...metaMetrics, numCommunities, modularity};

  const communities = new Map<string, {commGraph: Graph, 
    centerX: number, centerY: number, radius: number}>();

  // На будущее: fixed работает, хоть его и нет в документации по неведомым причинам
  // graph.forEachNode((node) => graph.setNodeAttribute(node, "fixed", true))
  
  // Рекурсивно раскладываем каждое сообщество по отдельности
  // Первый проход: раскладываем сообщества, считаем радиусы
  metaGraph.forEachNode((commId: string, metaAttrs: Attributes) => {
    const commGraph = timed(buildingSubgraphsTimer, () => buildCommunityGraph(graph, commId));
    let metricsComm = timed(metricsCalculationTimer, () => calculateGraphMetrics(commGraph));
    ({numCommunities, modularity} = timed(communitiesFindingTimer, () => findCommunities(commGraph)));
    metricsComm = {...metricsComm, numCommunities, modularity};

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
  metaGraph.forEachNode((commId: string, metaAttrs: Attributes) => {
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
    console.log(`- Время построения подграфов: ${buildingSubgraphsTimer.value.toFixed(3)} мс`);
    console.log(`- Время расчета метрик подграфов: ${metricsCalculationTimer.value.toFixed(3)} мс`);
    console.log(`- Время нахождения сообществ в подграфах: ${communitiesFindingTimer.value.toFixed(3)} мс`);
    buildingSubgraphsTimer.value = 0;
    metricsCalculationTimer.value = 0;
    communitiesFindingTimer.value = 0;
  }
}
