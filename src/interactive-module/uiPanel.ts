import type Graph from 'graphology';
import type graphMetrics from '../metrics-module/graphMetricsInterface';



const graphMetricsLabels: Record<string, string> = {
  numNodes: 'Кол-во узлов', 
  numEdges: 'Кол-во ребер', 
  density: 'Плотность',
  avgDegree: 'Средняя степень узла', 
  maxDegree: 'Макс. степень узла', 
  minDegree: 'Мин. степень узла',
  maxEdgeWeight: 'Макс. вес ребра', 
  minEdgeWeight: 'Мин. вес ребра',
  degreeGini: 'Индекс Джини', 
  numCommunities: 'Кол-во сообществ',
  modularity: 'Модулярность'
};



const nodeMetricsLabels: Record<string, string> = {
  degree: 'Степень', 
  degreeCentrality: 'Степенная центр-ть', 
  core: 'k-core',
  eigenvectorCentrality: 'Собств. центр-ть', 
  importance: 'Важность', 
  community: 'Номер сообщества'
};



const layoutMetricsLabels: Record<string, string> = {
  crossings: 'Пересечений рёбер',
  stress: 'Стресс',
  edgeLengthCV: 'CV длины рёбер',
  parsingTime: 'Парсинг (мс)',
  metricsTime: 'Расчет метрик (мс)',
  communitiesTime: 'Нахождение сообществ (мс)',
  // attributesTime: 'Расстановка атрибутов (мс)',
  layoutTime: 'Работа раскладки (мс)',
  renderingTime: 'Отрисовка (мс)',
  overallTime: 'Всего времени (мс)'
};



export function updateGraphMetrics(metrics: graphMetrics): void {
  const container = document.getElementById('graph-metrics')!;
  container.innerHTML = '';
  
  for (const [key, label] of Object.entries(graphMetricsLabels)) {
    const value = metrics[key as keyof graphMetrics];
    if (value === undefined || value === null) continue;

    let formatted;
    if (typeof value === 'number')
      formatted = Number.isInteger(value) ? value : value.toFixed(3);
    else formatted = value;
    
    const row = document.createElement('div');
    row.className = 'metric-row';
    row.innerHTML = `<span class="metric-label">${label}</span><span class="metric-value">${formatted}</span>`;
    container.appendChild(row);
  }
}



export function updateNodeMetrics(nodeId: string, graph: Graph): void {
  const container = document.getElementById('node-metrics')!;
  container.innerHTML = '';
  
  const label = graph.getNodeAttribute(nodeId, 'label') || graph.getNodeAttribute(nodeId, 'hiddenLabel') || `#${nodeId}`;
  const header = document.createElement('div');
  header.className = 'node-header';
  header.textContent = `Узел: ${label}`;
  container.appendChild(header);

  for (const [key, displayKey] of Object.entries(nodeMetricsLabels)) {
    const value = graph.getNodeAttribute(nodeId, key as keyof typeof nodeMetricsLabels);
    if (value !== undefined) {
      let formatted;
      if (typeof value === 'number')
        formatted = Number.isInteger(value) ? value : value.toFixed(3);
      else formatted = value;
      const row = document.createElement('div');
      row.className = 'metric-row';
      row.innerHTML = `<span class="metric-label">${displayKey}</span><span class="metric-value">${formatted}</span>`;
      container.appendChild(row);
    }
  }
}



export function resetNodeMetrics(): void {
  const container = document.getElementById('node-metrics')!;
  container.innerHTML = '<span class="placeholder">Выберите узел</span>';
}



export function updateLayoutMetrics(metrics: { crossings: number; stress: number }): void {
  const panel = document.getElementById('layout-metrics-panel')!;
  const content = document.getElementById('layout-metrics')!;
  content.innerHTML = '';

  for (const [key, label] of Object.entries(layoutMetricsLabels)) {
    const value = metrics[key as keyof typeof metrics];
    if (value === undefined || value === null) continue;

    const formatted = Number.isInteger(value) ? value : value.toFixed(1);
    const row = document.createElement('div');
    row.className = 'metric-row';
    row.innerHTML = `<span class="metric-label">${label}</span><span class="metric-value">${formatted}</span>`;
    content.appendChild(row);
  }

  panel.style.display = 'block'; // показываем панель
}



export function resetLayoutMetrics(): void {
  const panel = document.getElementById('layout-metrics-panel');
  if (panel) panel.style.display = 'none';
  const content = document.getElementById('layout-metrics');
  if (content) content.innerHTML = ''; // очищаем все метрики
}
