import Sigma from 'sigma';
import Graph from 'graphology';
import { calculateEdgeMetrics, calculateGraphMetrics, calculateNodeMetrics, findCommunities } from './metric-module/calculateGraphMetrics.ts';
import { createNodeBorderProgram } from "@sigma/node-border";
import EdgeCurveProgram from '@sigma/edge-curve';
import parseGraphFile from './graphParser.ts';
import smartLayout from './layout-module/layoutEngine.ts';
import * as vis from './configs/visualConfig.ts';
import { fitViewportToNodes } from '@sigma/utils';
import { clearHighlightState, deselectNode, edgeReducer, hoverNode, 
  nodeReducer, selectNode, unhoverNode } from './hoverClickHandler.ts';



const sigmaContainer = document.getElementById('sigma-container') as HTMLDivElement;
if (!sigmaContainer) throw new Error('Контейнер для графа не найден!');
const statusSpan = document.getElementById('loader-status') as HTMLSpanElement;
if (!statusSpan) throw new Error('Span статуса не найден!');



let renderer: Sigma | null = null;
let graph: Graph | null = null;



async function setStatus(text: string) {
  statusSpan.textContent = text;
  await new Promise(r => setTimeout(r, 1)); // отдаём поток на repaint
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
  clearHighlightState();
  graph = null;
  let start, end;



  await setStatus('Парсим граф...');
  start = performance.now();
  graph = await parseGraphFile(path);
  end = performance.now();
  console.log(`Время парсинга графа: ${(end - start).toFixed(3)} мс`)



  await setStatus('Считаем метрики...');
  start = performance.now();

  let metrics = calculateGraphMetrics(graph);
  calculateNodeMetrics(graph);
  const {
    minEdgeImportance, 
    maxEdgeImportance, 
    avgEdgeImportance} = calculateEdgeMetrics(graph);
  let {numCommunities, modularity} = findCommunities(graph);
  metrics = {...metrics, minEdgeImportance, maxEdgeImportance, 
    avgEdgeImportance, numCommunities, modularity}

  for (const [key, value] of Object.entries(metrics)) {
    console.log(`--- ${key}: ${value}`);
  }

  end = performance.now();
  console.log(`Время расчета метрик: ${(end - start).toFixed(3)} мс`)
  


  await setStatus('Расставляем атрибуты...');
  start = performance.now();

  graph.forEachNode((node, attrs) => {
    graph!.mergeNodeAttributes(node, {
      label: '', // Пустой изначально
      hiddenLabel: attrs.label, // Сохраняем настоящий
      labelColor: vis.labelColor,
      borderColor: vis.borderColor
    });
  });

  graph.forEachEdge((_edge, _attrs, source, target) => {
    graph!.mergeEdgeAttributes(source, target, {
      type: 'curved'
    });
  });

  end = performance.now();
  console.log(`Время расставления атрибутов: ${(end - start).toFixed(3)} мс`)



  await setStatus('Раскладываем граф...');
  start = performance.now();
  smartLayout(graph, metrics, algorithm);
  end = performance.now();
  console.log(`Время работы раскладки: ${(end - start).toFixed(3)} мс`)



  await setStatus('Отрисовываем граф...');
  start = performance.now();

  renderer = new Sigma(graph, sigmaContainer!, {
    defaultNodeType: 'circle',
    defaultEdgeType: 'line',
    labelSize: vis.labelSize,
    zIndex: true,
    autoRescale: false,
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
  console.log(`Время отрисовки: ${(end - start).toFixed(3)} мс`)
  await setStatus('Почти готово...');



  // Hover с подсветкой узла
  renderer.on('enterNode', ({ node }) => hoverNode(node, graph!, renderer!));

  // Unhover
  renderer.on('leaveNode', () => unhoverNode(graph!, renderer!));

  // Node focus по клику
  renderer.on('clickNode', ({ node }) => selectNode(node, graph!, renderer!, metrics));

  // Клик по пустому месту для сброса фокуса
  renderer.on('clickStage', () => deselectNode(graph!, renderer!));

  // const camera = renderer.getCamera();
  // camera.on("updated", () => {
  //   const zoomLevel = camera.ratio;
  // });

  fitViewportToNodes(renderer, graph.nodes());

  await setStatus('');

  const overallEndTime = performance.now();
  console.log(`Всего прошло времени: ${(overallEndTime - overallStartTime).toFixed(3)} мс`)
}
