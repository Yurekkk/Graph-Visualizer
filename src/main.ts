import './style.css';
import Sigma from 'sigma';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { hsvToRgb } from './hsvToRgb';
import { type Data } from './graphInterfaces';
import { calculateGraphMetrics } from './calculateGraphMetrics';

function logMetrics(data: Data) {
  const {
    numNodes,
    numLinks,
    density,
    avgDegree,
    maxDegree,
    minDegree,
    diameter,
    radius,
    avgPathLen,
    componentsNum
  } = calculateGraphMetrics(data.nodes, data.links);
  console.log(`Кол-во узлов: ${numNodes}`);
  console.log(`Кол-во ребер: ${numLinks}`);
  console.log(`Плотность: ${density}`);
  console.log(`Средняя степень: ${avgDegree}`);
  console.log(`Максимальная степень: ${maxDegree}`);
  console.log(`Минимальная степень: ${minDegree}`);
  console.log(`Диаметр: ${diameter}`);
  console.log(`Радиус: ${radius}`);
  console.log(`Средний путь: ${avgPathLen}`);
  console.log(`Кол-во компонент связности: ${componentsNum}`);
}

async function initGraph() {

  const container = document.getElementById('sigma-container');
  if (!container) {
    throw new Error('Контейнер для графа не найден!');
  }

  const graph = new Graph();

  const response = await fetch('../miserables.json');
  if (!response.ok) throw new Error('Не удалось загрузить miserables.json');
  
  const data: Data = await response.json();
  const maxGroup = Math.max(...data.nodes.map(n => n.group));
  const maxValue = Math.max(...data.links.map(l => l.value || 1));

  logMetrics(data);



  // Добавляем узлы
  data.nodes.forEach((node) => {
    const hue = (node.group / maxGroup) * 360;
    const {r, g, b} = hsvToRgb(hue, 90, 75);
    graph.addNode(node.id, {
      label: '',                          // Пустой изначально
      hiddenLabel: node.label || node.id, // Сохраняем настоящий
      size: 10,
      labelSize: 0,
      originalColor: `rgb(${r}, ${g}, ${b})`,
      color: `rgb(${r}, ${g}, ${b})`,
      x: Math.random() * 10 - 5,
      y: Math.random() * 10 - 5,
    });
  });



  // Добавляем связи
  data.links.forEach((link) => {
    const value = link.value || 1;
    const ratio = value / maxValue;  // 0.0 - 1.0
    const hue = 240 - Math.round(240 * ratio);
    const {r, g, b} = hsvToRgb(hue, 70, 55);
    graph.addEdge(link.source, link.target, {
      size: 3,
      color: `rgb(${r}, ${g}, ${b})`,
      type: 'line',
    });
  });



  // Запускаем ForceAtlas2 для раскладки
  const sensibleSettings = forceAtlas2.inferSettings(graph);
  forceAtlas2.assign(graph, {
      iterations: 50,
      settings: sensibleSettings
  });



  // Инициализируем Sigma после раскладки
  const renderer = new Sigma(graph, container, {
    renderEdgeLabels: false,
    defaultNodeType: 'circle',
    defaultEdgeType: 'line',
    labelColor: { color: '#000000' },
  });



  // Hover с подсветкой соседей
  renderer.on('enterNode', ({ node }) => {
    // Показываем лейбл и увеличиваем узел
    const hiddenLabel = graph.getNodeAttribute(node, 'hiddenLabel');
    graph.setNodeAttribute(node, 'label', hiddenLabel);
    graph.setNodeAttribute(node, 'size', 15);

    // Подсвечиваем соседей
    graph.forEachNeighbor(node, (neighbor) => {
      graph.setNodeAttribute(neighbor, 'color', '#ffffff');
      graph.setNodeAttribute(neighbor, 'size', 12);
    });

    renderer.refresh();
  });

  renderer.on('leaveNode', ({ node }) => {
    // Скрываем лейбл и уменьшаем узел
    graph.setNodeAttribute(node, 'label', '');
    graph.setNodeAttribute(node, 'size', 10);

    // Восстанавливаем оригинальные цвета соседей
    graph.forEachNeighbor(node, (neighbor) => {
      const originalColor = graph.getNodeAttribute(neighbor, 'originalColor');
      graph.setNodeAttribute(neighbor, 'color', originalColor);
      graph.setNodeAttribute(neighbor, 'size', 10);
    });

    renderer.refresh();
  });

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGraph);
} else {
  initGraph();
}

