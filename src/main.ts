import './style.css';
import Sigma from 'sigma';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { hsvToRgb } from './hsvToRgb';
import { type Data } from './graphInterfaces';
import { calculateGraphMetrics } from './calculateGraphMetrics';
import { createNodeBorderProgram } from "@sigma/node-border";



// Некоторые константы
const nodeSize = 12;
const nodeSizeHover = 20;
const nodeSaturation = 90;
const nodeValue = 75;

const edgeSize = 3;
const edgeMaxHue = 240;
const edgeSaturation = 70;
const edgeValue = 55;

const borderColor = '#ffffff';
const borderSizeDefault = 0.05; // Дробь от размера всего узла, [0, 1]
const borderSizeNeighbor = 0.35; // [0, 1]
const borderSizeHover = 0.2; // [0, 1]

const labelColor = '#000000';
const labelSize = 20;



async function initGraph() {

  const container = document.getElementById('sigma-container');
  if (!container) {
    throw new Error('Контейнер для графа не найден!');
  }

  const graph = new Graph();

  const response = await fetch('../miserables.json');
  if (!response.ok) throw new Error('Не удалось загрузить файл.');
  
  const data: Data = await response.json();
  const maxEdgeWeight = Math.max(...data.links.map(l => l.value || 1));



  // Добавляем узлы
  data.nodes.forEach(node => {
    graph.addNode(node.id, {
      label: '',                          // Пустой изначально
      hiddenLabel: node.label || node.id, // Сохраняем настоящий
      size: nodeSize,
      x: Math.random() * 10 - 5,
      y: Math.random() * 10 - 5,
      borderColor: borderColor,
      borderSize: 0.0
    });
  });



  // Добавляем связи
  data.links.forEach(link => {
    const value = link.value || 1;
    const ratio = value / maxEdgeWeight;  // 0.0 - 1.0
    const hue = edgeMaxHue * (1 - ratio); // синий - красный
    const {r, g, b} = hsvToRgb(hue, edgeSaturation, edgeValue);
    graph.addEdge(link.source, link.target, {
      weight: link.value,
      size: edgeSize,
      color: `rgb(${r}, ${g}, ${b})`,
      type: 'line',
    });
  });


  
  // Считаем и выводим метрики
  const {
    numNodes,
    numEdges,
    density,
    avgDegree,
    maxDegree,
    minDegree,
    numCommunities
  } = calculateGraphMetrics(graph);
  console.log(`Кол-во узлов: ${numNodes}`);
  console.log(`Кол-во ребер: ${numEdges}`);
  console.log(`Плотность: ${density}`);
  console.log(`Средняя степень: ${avgDegree}`);
  console.log(`Максимальная степень: ${maxDegree}`);
  console.log(`Минимальная степень: ${minDegree}`);
  console.log(`Кол-во сообществ: ${numCommunities}`);



  // Окрашиваем узлы в зависимости от номера сообщества
  graph.forEachNode((node, attributes) => {
    const hue = (attributes.community / numCommunities) * 360;
    const {r, g, b} = hsvToRgb(hue, nodeSaturation, nodeValue);
    graph.setNodeAttribute(node, 'color', `rgb(${r}, ${g}, ${b})`)
  })



  // Запускаем ForceAtlas2 для раскладки
  const sensibleSettings = forceAtlas2.inferSettings(graph);
  forceAtlas2.assign(graph, {
    iterations: 100,
    settings: sensibleSettings
  });



  // Инициализируем Sigma
  const renderer = new Sigma(graph, container, {
    defaultNodeType: 'circle',
    defaultEdgeType: 'line',
    labelColor: { color: labelColor },
    labelSize: labelSize,
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
  });



  // Hover с подсветкой соседей
  renderer.on('enterNode', ({ node }) => {
    // Показываем лейбл и увеличиваем узел
    const hiddenLabel = graph.getNodeAttribute(node, 'hiddenLabel');
    graph.setNodeAttribute(node, 'label', hiddenLabel);
    graph.setNodeAttribute(node, 'size', nodeSizeHover);
    graph.setNodeAttribute(node, 'borderSize', borderSizeHover);

    // Подсвечиваем соседей
    graph.forEachNeighbor(node, (neighbor) => {
      graph.setNodeAttribute(neighbor, 'borderSize', borderSizeNeighbor);
    });

    renderer.refresh();
  });

  renderer.on('leaveNode', ({ node }) => {
    // Скрываем лейбл и уменьшаем узел
    graph.setNodeAttribute(node, 'label', '');
    graph.setNodeAttribute(node, 'size', nodeSize);
    graph.setNodeAttribute(node, 'borderSize', borderSizeDefault);

    // Убираем подсветку у соседей
    graph.forEachNeighbor(node, (neighbor) => {
      graph.setNodeAttribute(neighbor, 'borderSize', borderSizeDefault);
    });

    renderer.refresh();
  });

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGraph);
} else {
  initGraph();
}

