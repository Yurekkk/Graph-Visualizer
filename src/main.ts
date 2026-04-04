import './style.css';
import Sigma from 'sigma';
import Graph from 'graphology';
import hsvToRgb from './hsvToRgb';
import calculateGraphMetrics from './calculateGraphMetrics';
import { createNodeBorderProgram } from "@sigma/node-border";
import EdgeCurveProgram from '@sigma/edge-curve';
import parseGraphFile from './graphParser.ts';
import smartLayout from './layoutEngine.ts';



const container = document.getElementById('sigma-container') as HTMLSelectElement;
if (!container) throw new Error('Контейнер для графа не найден!');
const selector = document.getElementById('graph-selector') as HTMLSelectElement;
if (!selector) throw new Error('Селектор не найден!');
let renderer: Sigma | null = null;
let graph: Graph | null = null;



// Константы
const nodeSize = 10;
const nodeSizeHover = 20;
const nodeSaturation = 90;
const nodeValue = 75;

const edgeMinSize = 2;
const edgeMaxSize = 6;
const edgeDefaultSize = 3;
const edgeMinHue = 0;
const edgeMaxHue = 240;
const edgeDefaultHue = 240;
const edgeSaturation = 70;
const edgeValue = 55;

const borderColor = '#ffffff';
const borderSizeDefault = 0.075; // Дробь от размера всего узла, [0, 1]
const borderSizeNeighbor = 0.35; // [0, 1]
const borderSizeHover = 0.2;     // [0, 1]

const labelColor = '#000000';
const labelSize = 20;



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
    modularity
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



  // Расставляем атрибуты узлов
  const numNodesSqrt = Math.sqrt(numNodes);
  graph.forEachNode((node, attributes) => {
    // Окрашиваем узлы в зависимости от номера сообщества
    const hue = (attributes.community / numCommunities) * 360;
    const {r, g, b} = hsvToRgb(hue, nodeSaturation, nodeValue);

    graph!.mergeNodeAttributes(node, {
      label: '',                     // Пустой изначально
      hiddenLabel: attributes.label, // Сохраняем настоящий
      size: nodeSize,
      color: `rgb(${r}, ${g}, ${b})`,
      x: (Math.random() - 0.5) * numNodesSqrt,
      y: (Math.random() - 0.5) * numNodesSqrt,
      borderColor: borderColor,
      borderSize: borderSizeDefault
    });
  });



  // Расставляем атрибуты ребер
  graph.forEachEdge((_edge, attributes, source, target) => {
    // Окрашиваем ребра и ставим их ширину в зависимости от их веса
    let hue, size;
    if (maxEdgeWeight !== minEdgeWeight) {
      const ratio = (attributes.weight - minEdgeWeight) / 
                    (maxEdgeWeight - minEdgeWeight); // 0.0 - 1.0
      hue = (edgeMaxHue - edgeMinHue) * 
            (1 - ratio) + edgeMinHue; // синий - красный
      size = (edgeMaxSize - edgeMinSize) * ratio + edgeMinSize;
    }
    else {
      hue = edgeDefaultHue;
      size = edgeDefaultSize;
    }
    const {r, g, b} = hsvToRgb(hue, edgeSaturation, edgeValue);

    graph!.mergeEdgeAttributes(source, target, {
      size: size,
      color: `rgb(${r}, ${g}, ${b})`,
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
    labelColor: { color: labelColor },
    labelSize: labelSize,
    zIndex: true,
    nodeProgramClasses: {
      circle: createNodeBorderProgram({
        borders: [
          { 
            size: { attribute: "borderSize", defaultValue: borderSizeDefault }, 
            color: { attribute: "borderColor" } 
          },
          { size: { fill: true }, color: { attribute: "color" } },
        ]
      }),
    },
    edgeProgramClasses: {
      curved: EdgeCurveProgram,
    }
  });
  end = performance.now();
  console.log(`Время отрисовки: ${end - start} мс`)



  // Hover с подсветкой соседей
  renderer.on('enterNode', ({ node }) => {
    // Показываем лейбл и увеличиваем узел
    const hiddenLabel = graph!.getNodeAttribute(node, 'hiddenLabel');
    graph!.setNodeAttribute(node, 'label', hiddenLabel);
    graph!.setNodeAttribute(node, 'size', nodeSizeHover);
    graph!.setNodeAttribute(node, 'borderSize', borderSizeHover);

    // Подсвечиваем соседей
    graph!.forEachNeighbor(node, (neighbor) => {
      graph!.setNodeAttribute(neighbor, 'borderSize', borderSizeNeighbor);
    });

    renderer!.refresh();
  });

  renderer.on('leaveNode', ({ node }) => {
    // Скрываем лейбл и уменьшаем узел
    graph!.setNodeAttribute(node, 'label', '');
    graph!.setNodeAttribute(node, 'size', nodeSize);
    graph!.setNodeAttribute(node, 'borderSize', borderSizeDefault);

    // Убираем подсветку у соседей
    graph!.forEachNeighbor(node, (neighbor) => {
      graph!.setNodeAttribute(neighbor, 'borderSize', borderSizeDefault);
    });

    renderer!.refresh();
  });
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
