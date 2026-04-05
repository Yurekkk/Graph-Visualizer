import Sigma from 'sigma';
import Graph from 'graphology';
import findCloseImportantNeighbours from './findCloseImportantNeigbors.ts';
import { fitViewportToNodes } from '@sigma/utils';
import * as vis from './configs/visual.ts';



let selectedNodeId: string | null = null;
let hoveredNodeId:  string | null = null;



export function hoverNode(newHoveredNodeId: string, graph: Graph, renderer: Sigma) {
  if (hoveredNodeId === newHoveredNodeId) return;

  if (hoveredNodeId != null)
    unhoverNode(graph, renderer, false);

  hoveredNodeId = newHoveredNodeId;

  // Показываем лейбл и увеличиваем узел
  const hiddenLabel = graph.getNodeAttribute(hoveredNodeId, 'hiddenLabel');
  graph.setNodeAttribute(hoveredNodeId, 'label', hiddenLabel);
  if (hoveredNodeId !== selectedNodeId)
    graph.setNodeAttribute(hoveredNodeId, 'size', vis.nodeSizeHover);
  graph.setNodeAttribute(hoveredNodeId, 'borderSize', vis.borderSizeHover);

  // Подсвечиваем соседей
  // graph.forEachNeighbor(hoveredNodeId, (neighbor) => {
  //   graph.setNodeAttribute(neighbor, 'borderSize', vis.borderSizeNeighbor);
  // });

  renderer.refresh();
}



export function unhoverNode(graph: Graph, renderer: Sigma, refresh: boolean = true) {
  if (hoveredNodeId == null) return;

  // Скрываем лейбл и уменьшаем узел
  graph.setNodeAttribute(hoveredNodeId, 'label', '');
  if (hoveredNodeId !== selectedNodeId)
    graph.setNodeAttribute(hoveredNodeId, 'size', vis.nodeSizeDefault);
  graph.setNodeAttribute(hoveredNodeId, 'borderSize', vis.borderSizeDefault);

  // Убираем подсветку у соседей
  // graph.forEachNeighbor(hoveredNodeId, (neighbor) => {
  //   graph.setNodeAttribute(neighbor, 'borderSize', vis.borderSizeDefault);
  // });

  hoveredNodeId = null;

  if (refresh) renderer.refresh();
}



export function selectNode(newSelectedNodeId: string, graph: Graph, renderer: Sigma) {
  if (selectedNodeId === newSelectedNodeId) return;

  if (selectedNodeId != null) {
    graph.setNodeAttribute(selectedNodeId, 'size', vis.nodeSizeDefault);
    graph.setNodeAttribute(selectedNodeId, 'borderSize', vis.borderSizeDefault);
  }
  selectedNodeId = newSelectedNodeId;
  graph.setNodeAttribute(selectedNodeId, 'size', vis.nodeSizeSelected);
  graph.setNodeAttribute(selectedNodeId, 'borderSize', vis.borderSizeSelect);

  const importantIds = findCloseImportantNeighbours(selectedNodeId, graph);

  // Подстраиваем вид под нужные узлы
  fitViewportToNodes(renderer, [...importantIds, selectedNodeId], { animate: true });

  // Делаем важные узлы и ребра непрозрачными
  // Делаем все остальные узлы и ребра полупрозрачными
  graph.forEachNode((node, _attrs) => {
    if (importantIds.includes(node) || node === selectedNodeId)
      graph.setNodeAttribute(node, 'alpha', vis.nodeDefaultAlpha);
    else
      graph.setNodeAttribute(node, 'alpha', vis.nodeHiddenAlpha);
  })

  graph.forEachEdge((edge, _attrs, source, target) => {
    if ((importantIds.includes(source) || source === selectedNodeId) &&
        (importantIds.includes(target) || target === selectedNodeId))
      graph.setEdgeAttribute(edge, 'alpha', vis.edgeDefaultAlpha);
    else
      graph.setEdgeAttribute(edge, 'alpha', vis.edgeHiddenAlpha);
  })
  
  renderer.refresh();
}



export function deselectNode(graph: Graph, renderer: Sigma) {
  if (selectedNodeId == null) return;
  graph.setNodeAttribute(selectedNodeId, 'size', vis.nodeSizeDefault);
  graph.setNodeAttribute(selectedNodeId, 'borderSize', vis.borderSizeDefault);
  selectedNodeId = null;

  // Возвращаем непрозрачность всем узлам и ребрам
  graph.forEachNode((node, _attrs) => {
    graph.setNodeAttribute(node, 'alpha', vis.nodeDefaultAlpha);
  })

  graph.forEachEdge((edge, _attrs, _source, _target) => {
    graph.setEdgeAttribute(edge, 'alpha', vis.edgeDefaultAlpha);
  })

  renderer.refresh();
}