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



export function updateLayoutMetrics(metrics: Record<string, number>): void {
  const content = document.getElementById('layout-metrics')!;
  content.innerHTML = '';

  // Заполняем строки метрик
  for (const [key, label] of Object.entries(layoutMetricsLabels)) {
    const value = metrics[key as keyof typeof metrics];
    if (value === undefined || value === null) continue;

    const formatted = Number.isInteger(value) ? value : Number(value.toFixed(4));
    const row = document.createElement('div');
    row.className = 'metric-row';
    row.innerHTML = `<span class="metric-label">${label}</span><span class="metric-value">${formatted}</span>`;
    content.appendChild(row);
  }

  // Кнопка копирования
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Скопировать';
  copyBtn.className = 'copy-metrics-btn';
  copyBtn.addEventListener('click', () => {
    const values: string[] = [];
    content.querySelectorAll('.metric-value').forEach(el => {
      values.push(el.textContent || '');
    });
    if (values.length === 0) return;

    const textToCopy = values.map(v => v.replace('.', ',')).join('\t');
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        copyBtn.textContent = 'Скопировано!';
        setTimeout(() => { copyBtn.textContent = 'Скопировать'; }, 1500);
      })
      .catch(() => alert('Не удалось скопировать'));
  });
  content.appendChild(copyBtn);
}



export function resetLayoutMetrics(): void {
  const content = document.getElementById('layout-metrics');
  if (content) content.innerHTML = ''; // очищаем все метрики
}
