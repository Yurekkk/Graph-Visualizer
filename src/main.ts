import './style.css';
import Sigma from 'sigma';
import Graph from 'graphology';
import { blendWithBackground, hsvToRgb } from './colorUtils.ts';
import calculateGraphMetrics from './calculateGraphMetrics.ts';
import { createNodeBorderProgram } from "@sigma/node-border";
import EdgeCurveProgram from '@sigma/edge-curve';
import parseGraphFile from './graphParser.ts';
import smartLayout from './layoutEngine.ts';
import { hoverNode, unhoverNode, selectNode, deselectNode } from './graphVisualsHandler.ts';
import * as vis from './configs/visual.ts';



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



  graph = await parseGraphFile(path);

  // Считаем и выводим метрики
  const metrics = calculateGraphMetrics(graph);
  const {
    numNodes,
    numEdges,
    density,
    avgDegree,
    maxDegree,
    minDegree,
    maxEdgeWeight,
    minEdgeWeight,
    numCommunities,
    modularity,
    hubDominance,
    degreeGini
  } = metrics;
  console.log(`Кол-во узлов: ${numNodes}`);
  console.log(`Кол-во ребер: ${numEdges}`);
  console.log(`Плотность: ${density}`);
  console.log(`Средняя степень: ${avgDegree}`);
  console.log(`Максимальная степень: ${maxDegree}`);
  console.log(`Минимальная степень: ${minDegree}`);
  console.log(`Максимальный вес ребра: ${maxEdgeWeight}`);
  console.log(`Минимальный вес ребра: ${minEdgeWeight}`);
  console.log(`Кол-во сообществ: ${numCommunities}`);
  console.log(`Модулярность: ${modularity}`);
  console.log(`hubDominance: ${hubDominance}`);
  console.log(`degreeGini: ${degreeGini}`);



  // Расставляем атрибуты узлов
  const numNodesSqrt = Math.sqrt(numNodes);
  graph.forEachNode((node, attributes) => {
    // Окрашиваем узлы в зависимости от номера сообщества
    const hue = (attributes.community / numCommunities) * 360;
    const {r, g, b} = hsvToRgb(hue, vis.nodeSaturation, vis.nodeValue);

    graph!.mergeNodeAttributes(node, {
      label: '',                     // Пустой изначально
      hiddenLabel: attributes.label, // Сохраняем настоящий
      size: vis.nodeSizeDefault,
      color: `rgba(${r}, ${g}, ${b})`,
      alpha: vis.nodeDefaultAlpha,
      x: (Math.random() - 0.5) * numNodesSqrt,
      y: (Math.random() - 0.5) * numNodesSqrt,
      borderColor: vis.borderColor,
      borderSize: vis.borderSizeDefault
    });
  });



  // Расставляем атрибуты ребер
  graph.forEachEdge((_edge, attributes, source, target) => {
    // Окрашиваем ребра и ставим их ширину в зависимости от их веса
    let hue, size;
    if (maxEdgeWeight !== minEdgeWeight) {
      const ratio = (attributes.weight - minEdgeWeight) / 
                    (maxEdgeWeight - minEdgeWeight); // 0.0 - 1.0
      hue = (vis.edgeMaxHue - vis.edgeMinHue) * 
            (1 - ratio) + vis.edgeMinHue; // синий - красный
      size = (vis.edgeMaxSize - vis.edgeMinSize) * ratio + vis.edgeMinSize;
    }
    else {
      hue = vis.edgeDefaultHue;
      size = vis.edgeDefaultSize;
    }
    const {r, g, b} = hsvToRgb(hue, vis.edgeSaturation, vis.edgeValue);

    graph!.mergeEdgeAttributes(source, target, {
      size: size,
      color: `rgba(${r}, ${g}, ${b})`,
      alpha: vis.edgeDefaultAlpha,
      zIndex: attributes.weight,
      type: 'curved'
    });
  });



  // Раскладываем граф
  start = performance.now();
  smartLayout(graph, metrics);
  end = performance.now();
  console.log(`Время работы раскладки: ${end - start} мс`)



  // Инициализируем Sigma
  start = performance.now();

  renderer = new Sigma(graph, container!, {
    defaultNodeType: 'circle',
    defaultEdgeType: 'line',
    labelColor: { color: vis.labelColor },
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
  renderer.on('enterNode', ({ node }) => hoverNode(node, graph!, renderer!));

  // Unhover
  renderer.on('leaveNode', () => unhoverNode(graph!, renderer!));

  // Подсветка узла и его соседей по клику
  renderer.on('clickNode', ({ node }) => selectNode(node, graph!, renderer!));

  // Клик по пустому месту для сброса выделения
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
