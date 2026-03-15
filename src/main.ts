import './style.css';
import Sigma from 'sigma';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { hsvToRgb } from './hsvToRgb';
import { type Data } from './graphInterfaces';
import { calculateGraphMetrics } from './calculateGraphMetrics';



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
      size: 10,
      labelSize: 0,
      x: Math.random() * 10 - 5,
      y: Math.random() * 10 - 5,
    });
  });



  // Добавляем связи
  data.links.forEach(link => {
    const value = link.value || 1;
    const ratio = value / maxEdgeWeight;  // 0.0 - 1.0
    const hue = 240 - Math.round(240 * ratio);
    const {r, g, b} = hsvToRgb(hue, 70, 55);
    graph.addEdge(link.source, link.target, {
      weight: link.value,
      size: 3,
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
    const {r, g, b} = hsvToRgb(hue, 90, 75);
    graph.setNodeAttribute(node, 'color', `rgb(${r}, ${g}, ${b})`)
    graph.setNodeAttribute(node, 'originalColor', `rgb(${r}, ${g}, ${b})`)
  })



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

