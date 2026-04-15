import Sigma from 'sigma';
import Graph from 'graphology';
import { blendWithBackground, edgeColor, edgeSize, nodeColor, nodeSize } from './visualUtils.ts';
import { calculateEdgeMetrics, calculateGraphMetrics, calculateNodeMetrics } from './calculateGraphMetrics.ts';
import { createNodeBorderProgram } from "@sigma/node-border";
import EdgeCurveProgram from '@sigma/edge-curve';
import parseGraphFile from './graphParser.ts';
import smartLayout from './layoutEngine.ts';
import { hoverNode, unhoverNode, selectNode, deselectNode, clearHoveredSelected } from './graphHoverClickHandler.ts';
import * as vis from './configs/visualConfig.ts';
import * as alg from './configs/algorithmicConfig.ts';
import seedrandom from 'seedrandom';
import hideUnimportantNodes from './hideUnimportantNodes.ts';
import { fitViewportToNodes } from '@sigma/utils';
import hideUnimportantEdges from './hideUnimportantEdges.ts';



const sigmaContainer = document.getElementById('sigma-container') as HTMLDivElement;
if (!sigmaContainer) throw new Error('Контейнер для графа не найден!');
const statusSpan = document.getElementById('loader-status') as HTMLSpanElement;
if (!statusSpan) throw new Error('Span статуса не найден!');



let renderer: Sigma | null = null;
let graph: Graph | null = null;



// Кэшируем цвет фона, чтобы не парсить его на каждый кадр
let cachedBgColor: string | null = null;
function getBackgroundColor(): string {
  if (!cachedBgColor) {
    cachedBgColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--bg-color')
    .trim();
  }
  return cachedBgColor;
}

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
  clearHoveredSelected();
  graph = null;
  let start, end;



  await setStatus('Парсим граф...');
  start = performance.now();
  graph = await parseGraphFile(path);
  end = performance.now();
  console.log(`Время парсинга графа: ${(end - start).toFixed(3)} мс`)



  await setStatus('Считаем метрики...');
  let metrics = calculateGraphMetrics(graph);
  calculateNodeMetrics(graph);
  const {
    minEdgeImportance, 
    maxEdgeImportance, 
    avgEdgeImportance} = calculateEdgeMetrics(graph);
  metrics = {...metrics, minEdgeImportance, maxEdgeImportance, avgEdgeImportance}
  for (const [key, value] of Object.entries(metrics)) {
    console.log(`--- ${key}: ${value}`);
  }
  


  await setStatus('Расставляем атрибуты узлов...');
  start = performance.now();
  const numNodesSqrt = Math.sqrt(metrics.numNodes);
  const rng = seedrandom(alg.seed);
  graph.forEachNode((node, attrs) => {
    // Ставим размер узлов в зависимости от степени
    // Окрашиваем узлы в зависимости от номера сообщества
    const size = nodeSize(attrs.degree, metrics);
    const color = nodeColor(attrs.community, metrics);
    // Некоторые атрибуты могут перезаписываться, сохраняем настоящие как hidden
    graph!.mergeNodeAttributes(node, {
      label: '',
      hiddenLabel: attrs.label,
      size: size,
      hiddenSize: size,
      color: color,
      labelColor: vis.labelColor,
      alpha: vis.nodeDefaultAlpha,
      x: (rng() - 0.5) * numNodesSqrt,
      y: (rng() - 0.5) * numNodesSqrt,
      borderColor: vis.borderColor,
      borderSize: vis.borderSizeDefault,
      zIndex: attrs.degree
    });
  });
  end = performance.now();
  console.log(`Время расставления атрибутов узлов: ${(end - start).toFixed(3)} мс`)



  await setStatus('Расставляем атрибуты рёбер...');
  start = performance.now();
  graph.forEachEdge((_edge, attrs, source, target) => {
    const size = edgeSize(attrs.weight, attrs.importance, metrics);
    const color = edgeColor(attrs.weight, attrs.importance, metrics);
    // Некоторые атрибуты могут перезаписываться, сохраняем настоящие как hidden
    graph!.mergeEdgeAttributes(source, target, {
      size: size,
      color: color,
      hiddenColor: color,
      alpha: vis.edgeDefaultAlpha,
      zIndex: attrs.weight,
      type: 'curved'
    });
  });
  end = performance.now();
  console.log(`Время расставления атрибутов рёбер: ${(end - start).toFixed(3)} мс`)



  await setStatus('Раскладываем граф...');
  start = performance.now();
  smartLayout(graph, metrics, algorithm);
  end = performance.now();
  console.log(`Время работы раскладки: ${(end - start).toFixed(3)} мс`)



  // await setStatus('Скрываем наименее полезные узлы...');
  // start = performance.now();
  // hideUnimportantNodes(graph);
  // end = performance.now();
  // console.log(`Время скрытия наименее полезных узлов: ${(end - start).toFixed(3)} мс`)



  // await setStatus('Скрываем наименее полезные рёбра...');
  // start = performance.now();
  // hideUnimportantEdges(graph, metrics);
  // end = performance.now();
  // console.log(`Время скрытия наименее полезных рёбер: ${(end - start).toFixed(3)} мс`)



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

    // Смешиваем цвет узлов и ребер с цветом фона в зависимости от альфы
    // WebGL через жопу поддерживает альфа-канал, поэтому так
    nodeReducer: (node, data) => {
      const alpha = graph!.getNodeAttribute(node, 'alpha') ?? 1;
      const bgColor = getBackgroundColor();
      const blended = blendWithBackground(data.color, bgColor, alpha);
      const borderColorBlended = blendWithBackground(data.borderColor, bgColor, alpha);
      return { ...data, color: blended, borderColor: borderColorBlended };
    },

    edgeReducer: (edge, data) => {
      const alpha = graph!.getEdgeAttribute(edge, 'alpha') ?? 1;
      const bgColor = getBackgroundColor();
      const colorBlended = blendWithBackground(data.color, bgColor, alpha);
      return { ...data, color: colorBlended };
    }
  });

  end = performance.now();
  console.log(`Время отрисовки: ${(end - start).toFixed(3)} мс`)
  await setStatus('Почти готово...');



  // Hover с подсветкой узла
  renderer.on('enterNode', ({ node }) => hoverNode(node, graph!, renderer!, metrics));

  // Unhover
  renderer.on('leaveNode', () => unhoverNode(graph!, renderer!));

  // Node focus по клику
  renderer.on('clickNode', ({ node }) => selectNode(node, graph!, renderer!, metrics));

  // Клик по пустому месту для сброса фокуса
  renderer.on('clickStage', () => deselectNode(graph!, renderer!, metrics));

  // const camera = renderer.getCamera();
  // camera.on("updated", () => {
  //   const zoomLevel = camera.ratio;
  // });

  fitViewportToNodes(renderer, graph.nodes());

  await setStatus('');

  const overallEndTime = performance.now();
  console.log(`Всего прошло времени: ${(overallEndTime - overallStartTime).toFixed(3)} мс`)
}
