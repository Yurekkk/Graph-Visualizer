import Sigma from 'sigma';
import Graph from 'graphology';
import { createNodeBorderProgram } from "@sigma/node-border";
import EdgeCurveProgram from '@sigma/edge-curve';
import parseGraphFile from './misc/graphParser.ts';
import { smartLayout } from './layout-module/layoutEngine.ts';
import * as vis from './configs/visualConfig.ts';
import * as alg from './configs/algorithmicConfig.ts';
import { fitViewportToNodes } from '@sigma/utils';
import { clearHighlightState, deselectNode, edgeReducer, hoverNode, 
  nodeReducer, selectNode, unhoverNode } from './interactive-module/hoverClickHandler.ts';
import { findCommunities } from './metrics-module/communitiesFinding.ts';
import { ThemeManager } from './interactive-module/themeManager.ts';
import findSimpleMetrics from './metrics-module/simpleMetricsCalculation.ts';
import calculateNodeMetrics from './metrics-module/calculateNodeMetrics.ts';
import { calculateEdgesImportance } from './metrics-module/importanceCalculations.ts';
import type graphMetrics from './metrics-module/graphMetricsInterface.ts';
import { resetLayoutMetrics, updateGraphMetrics, updateLayoutMetrics } from './interactive-module/uiPanel.ts';
// import hideUnimportantNodes from './misc/hideUnimportantNodes.ts';
// import hideUnimportantEdges from './misc/hideUnimportantEdges.ts';



// TODO?: Все таки считать betweeness centrality, если граф маленький
// TODO: Добавить поддержку ориентированного графа



const sigmaContainer = document.getElementById('sigma-container') as HTMLDivElement;
if (!sigmaContainer) throw new Error('Контейнер для графа не найден!');
const statusSpan = document.getElementById('loader-status') as HTMLSpanElement;
if (!statusSpan) throw new Error('Span статуса не найден!');



let renderer: Sigma | null = null;
let graph: Graph | null = null;
let layoutMetricsWorker: Worker | null = null;



async function setStatus(text: string) {
  statusSpan.textContent = text;
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}



export default async function initGraph(path: string, title: string, algorithm: string = 'auto') {
  console.log(`=============== Отрисовка графа ${title} ===============`)

  const overallStartTime = performance.now();

  if (renderer) {
    await setStatus('Чистим предыдущий граф...');
    renderer.removeAllListeners();
    renderer.kill(); 
    renderer = null;
  }
  if (layoutMetricsWorker) layoutMetricsWorker.terminate();
  clearHighlightState();
  resetLayoutMetrics();
  graph = null;
  let start, end;



  await setStatus('Парсим граф...');
  start = performance.now();
  graph = await parseGraphFile(path);
  end = performance.now();
  const parsingTime = (end - start);
  console.log(`Время парсинга графа: ${parsingTime.toFixed(3)} мс`)



  await setStatus('Считаем метрики...');
  start = performance.now();
  let metrics = {
    ...findSimpleMetrics(graph),
    ...calculateNodeMetrics(graph),
    ...calculateEdgesImportance(graph)
  } as graphMetrics;
  end = performance.now();
  const metricsTime = (end - start);
  console.log(`Время расчета простых метрик: ${metricsTime.toFixed(3)} мс`)



  await setStatus('Находим сообщества...');
  start = performance.now();
  metrics = { ...metrics, ...findCommunities(graph) };
  end = performance.now();
  const communitiesTime = (end - start);
  console.log(`Время нахождения сообществ (Leiden): ${communitiesTime.toFixed(3)} мс`)
  


  await setStatus('Расставляем атрибуты...');
  start = performance.now();

  graph.forEachNode((node, _attrs) => {
    graph!.mergeNodeAttributes(node, {
      hidden: true
    });
  });

  graph.forEachEdge((_edge, _attrs, source, target) => {
    graph!.mergeEdgeAttributes(source, target, {
      type: 'curved',
      hidden: true
    });
  });

  end = performance.now();
  const attributesTime = (end - start);
  console.log(`Время расставления атрибутов: ${attributesTime.toFixed(3)} мс`)



  await setStatus('Раскладываем граф...');
  start = performance.now();
  smartLayout(graph, metrics, algorithm);
  end = performance.now();
  const layoutTime = (end - start);
  console.log(`Время работы раскладки: ${layoutTime.toFixed(3)} мс`)



  // await setStatus('Убираем неважные узлы и ребра...');
  // start = performance.now();
  // hideUnimportantNodes(graph);
  // hideUnimportantEdges(graph, metrics);
  // end = performance.now();
  // console.log(`Время убирания неважных узлов и ребер: ${(end - start).toFixed(3)} мс`)



  await setStatus('Отрисовываем граф...');
  start = performance.now();
  
  renderer = new Sigma(graph, sigmaContainer!, {
    defaultNodeType: 'circle',
    defaultEdgeType: 'line',
    labelSize: vis.labelSize,
    labelColor: {attribute: "labelColor"},
    zIndex: true,
    autoRescale: false,
    enableEdgeEvents: false,
    renderLabels: false,
    renderEdgeLabels: false,
    edgeProgramClasses: {curved: EdgeCurveProgram},

    nodeProgramClasses: {
      circle: createNodeBorderProgram({
        borders: [
          { 
            size: { attribute: "borderSize", defaultValue: vis.borderSizeDefault }, 
            color: { attribute: "borderColor" } 
          },
          { size: { fill: true }, color: { attribute: "color" } },
        ]
      }),
    },
    
    nodeReducer: (node, data) => nodeReducer(node, data, metrics),
    edgeReducer: (edge, data) => edgeReducer(edge, data, graph!, metrics)
  });

  end = performance.now();
  const renderingTime = (end - start);
  console.log(`Время отрисовки: ${renderingTime.toFixed(3)} мс`)
  await setStatus('Почти готово...');



  // Если слишком много ребер, то наведение работает слишком долго
  if (metrics.numEdges < alg.edgesHoverHighlightLimit) {
    // Hover с подсветкой узла
    renderer.on('enterNode', ({ node }) => hoverNode(node, graph!, renderer!));
    // Unhover
    renderer.on('leaveNode', () => unhoverNode(graph!, renderer!));
  }

  // Node focus по клику
  renderer.on('clickNode', ({ node }) => selectNode(node, graph!, renderer!, metrics));
  // Клик по пустому месту для сброса фокуса
  renderer.on('clickStage', () => deselectNode(graph!, renderer!));

  // Изменение темы
  ThemeManager.onChange(() => {renderer!.refresh()});
  ThemeManager.init();

  // const camera = renderer.getCamera();
  // camera.on("updated", () => {
  //   const zoomLevel = camera.ratio;
  // });

  fitViewportToNodes(renderer, graph.nodes());
  updateGraphMetrics(metrics);

  const overallEndTime = performance.now();
  const overallTime = (overallEndTime - overallStartTime);
  console.log(`Всего прошло времени: ${overallTime.toFixed(3)} мс`)

  for (const [key, value] of Object.entries(metrics))
    console.log(`--- ${key}: ${value}`);

  await setStatus('');



  // Расчет метрик самой раскладки
  layoutMetricsWorker = new Worker(
    new URL('./layout-analysis-module/metricsWorker.ts', import.meta.url),
    { type: 'module' }
  );
  layoutMetricsWorker.postMessage({ graphData: graph.export() });
  layoutMetricsWorker.onmessage = (e) => {
    updateLayoutMetrics({...e.data, parsingTime, metricsTime, communitiesTime, 
      attributesTime, layoutTime, renderingTime, overallTime});
    layoutMetricsWorker!.terminate();
  }
}
