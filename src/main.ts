import './style.css';
import Sigma from 'sigma';
import Graph from 'graphology';
import { blendWithBackground, edgeColor, edgeSize, nodeColor, nodeSize } from './visualUtils.ts';
import calculateGraphMetrics from './calculateGraphMetrics.ts';
import { createNodeBorderProgram } from "@sigma/node-border";
import EdgeCurveProgram from '@sigma/edge-curve';
import parseGraphFile from './graphParser.ts';
import smartLayout from './layoutEngine.ts';
import { hoverNode, unhoverNode, selectNode, deselectNode } from './graphHoverClickHandler.ts';
import * as vis from './configs/visualConfig.ts';
import * as alg from './configs/algorithmicConfig.ts';
import seedrandom from 'seedrandom';



const container = document.getElementById('sigma-container') as HTMLSelectElement;
if (!container) throw new Error('Контейнер для графа не найден!');
const selector = document.getElementById('graph-selector') as HTMLSelectElement;
if (!selector) throw new Error('Селектор не найден!');
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



async function initGraph(path: string, title: string) {
  console.log(`=============== Отрисовка графа ${title} ===============`)

  if (renderer) {
    renderer.removeAllListeners();
    renderer.kill(); 
    renderer = null;
  }
  graph = null;
  let start, end;



  // Парсим граф
  graph = await parseGraphFile(path);



  // Считаем и выводим метрики
  const metrics = calculateGraphMetrics(graph);
  for (const [key, value] of Object.entries(metrics)) {
    console.log(`${key}: ${value}`);
  }
  


  // Расставляем атрибуты узлов
  const numNodesSqrt = Math.sqrt(metrics.numNodes);
  const rng = seedrandom(alg.seed);
  graph.forEachNode((node, attrs) => {
    // Окрашиваем узлы в зависимости от номера сообщества
    const size = nodeSize();
    const color = nodeColor(attrs.community, metrics);
    // Некоторые атрибуты могут перезаписываться, сохраняем настоящие как hidden
    graph!.mergeNodeAttributes(node, {
      label: '',
      hiddenLabel: attrs.label,
      size: size,
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



  // Расставляем атрибуты ребер
  graph.forEachEdge((_edge, attrs, source, target) => {
    const size = edgeSize(attrs.weight, metrics);
    const color = edgeColor(attrs.weight, metrics);
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



  // Раскладываем граф
  start = performance.now();
  smartLayout(graph, metrics);
  end = performance.now();
  console.log(`Время работы раскладки: ${end - start} мс`)



  // Инициализируем Sigma и отрисовываем граф
  start = performance.now();

  renderer = new Sigma(graph, container!, {
    defaultNodeType: 'circle',
    defaultEdgeType: 'line',
    labelSize: vis.labelSize,
    zIndex: true,

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

    edgeProgramClasses: {
      curved: EdgeCurveProgram,
    },

    // Смешиваем цвет узлов и ребер с цветом фона в зависимости от альфы
    // Sigma.js, по-видимому, не поддерживает альфа-канал, поэтому так
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
  console.log(`Время отрисовки: ${end - start} мс`)



  // Hover с подсветкой узла
  renderer.on('enterNode', ({ node }) => hoverNode(node, graph!, renderer!, metrics));

  // Unhover
  renderer.on('leaveNode', () => unhoverNode(graph!, renderer!));

  // Node focus по клику
  renderer.on('clickNode', ({ node }) => selectNode(node, graph!, renderer!, metrics));

  // Клик по пустому месту для сброса фокуса
  renderer.on('clickStage', () => deselectNode(graph!, renderer!));
}



function initSelector() {
  const graphFiles = import.meta.glob<{ nodes: any[]; edges: any[] }>
    ('../graphs/*', { eager: false });

  selector!.innerHTML = '';
  
  Object.keys(graphFiles).forEach((path) => {
    const option = document.createElement('option');
    option.value = path;
    // Красивое имя файла без расширения и пути
    option.textContent = path.replace('../graphs/', '').replace(/\.[^.]+$/, ''); 
    selector!.appendChild(option);
  });

  // Загружаем miserables.json по умолчанию
  const miserablesPath = '../graphs/miserables.json';
  selector!.value = '../graphs/miserables.json';
  initGraph(miserablesPath, 'miserables');
}

selector.addEventListener('change', (e) => {
    initGraph((e.target as HTMLSelectElement).value,
              (e.target as HTMLSelectElement).selectedOptions[0].text);
});



initSelector();
