import Graph from "graphology";
import type { EdgeIterationCallback, Attributes, GraphType } from "graphology-types";

/**
 * Обёртка графа, которая работает только с указанными узлами, 
 * чтобы не делать дорогостоящей операции построения подграфа.
 * Все операции (переборы, чтение/запись атрибутов, подсчёт степеней)
 * ограничиваются множеством selectedNodeIds.
 * Остальные узлы и инцидентные им рёбра «не видны».
 */
export default class FilteredGraph extends Graph {
  private graph: Graph;
  private nodeIds: Set<string>;
  public order: number;
  public type: GraphType;
  public multi: boolean;

  /**
   * @param graph            Исходный граф Graphology
   * @param selectedNodeIds  ID узлов, которые участвуют в раскладке/алгоритме
   */
  constructor(graph: Graph, selectedNodeIds: Set<string> | string[]) {
    super();
    this.graph = graph;
    this.nodeIds = new Set(selectedNodeIds);
    this.order = this.nodeIds.size;
    this.type = "undirected";
    this.multi = false;
  }

  /** Перебирает только выбранные узлы */
  forEachNode(callback: (node: string, attributes: { [key: string]: any }) => void): void {
    this.nodeIds.forEach((node) => {
      if (this.graph.hasNode(node)) {
        callback(node, this.graph.getNodeAttributes(node));
      }
    });
  }

  /** Перебирает рёбра, у которых оба конца принадлежат выбранным узлам */
  forEachEdge(callback: EdgeIterationCallback<Attributes, Attributes>): void {
    this.graph.forEachEdge((edge, attr, source, target) => {
      if (this.nodeIds.has(source) && this.nodeIds.has(target)) {
        callback(edge, attr, source, target, this.graph.getNodeAttributes(source), 
            this.graph.getNodeAttributes(target), this.graph.isUndirected(edge));
      }
    });
  }

  /**
   * Степень узла без учёта петель, но только среди выбранных соседей.
   * Для направленного графа считает всех соседей (как undirectedDegree).
   */
  undirectedDegreeWithoutSelfLoops(node: string): number {
    if (!this.nodeIds.has(node)) return 0;
    const neighbors = this.graph.neighbors(node).filter((n) => this.nodeIds.has(n));
    return neighbors.filter((n) => n !== node).length;
  }

  /** Установить атрибут узла, если он в выбранном множестве */
  setNodeAttribute(node: string, attr: any, value: any): this {
    if (this.nodeIds.has(node)) {
      this.graph.setNodeAttribute(node, attr, value);
    }
    return this;
  }

  /** Объединить атрибуты узла, если узел выбран */
  mergeNodeAttributes(node: string, attributes: { [key: string]: any }): this {
    if (this.nodeIds.has(node)) {
      this.graph.mergeNodeAttributes(node, attributes);
    }
    return this;
  }

  /**
   * Обновить атрибуты для каждого выбранного узла.
   * Функция operation получает узел и его текущие атрибуты,
   * должна вернуть объект с новыми/изменёнными парами ключ-значение.
   */
  updateEachNodeAttributes(
    operation: (node: string, attr: { [key: string]: any }) => { [key: string]: any } | void
  ): void {
    this.nodeIds.forEach((node) => {
      if (this.graph.hasNode(node)) {
        const attrs = this.graph.getNodeAttributes(node);
        const newAttrs = operation(node, attrs);
        if (newAttrs) {
          this.graph.mergeNodeAttributes(node, newAttrs);
        }
      }
    });
  }

  hasNode(node: string): boolean {
    return this.nodeIds.has(node) && this.graph.hasNode(node);
  }

  getNodeAttributes(node: string): { [key: string]: any } {
    if (!this.nodeIds.has(node)) return {};
    return this.graph.getNodeAttributes(node);
  }

  neighbors(node: string): string[] {
    if (!this.nodeIds.has(node)) return [];
    return this.graph.neighbors(node).filter((n) => this.nodeIds.has(n));
  }

  degree(node: string): number {
    if (!this.nodeIds.has(node)) return 0;
    return this.graph.neighbors(node).filter(n => this.nodeIds.has(n)).length;
  }

  forEachNeighbor(
    node: string,
    callback: (neighbor: string, attributes: { [key: string]: any }) => void
  ): void {
    if (!this.nodeIds.has(node)) return;
    this.graph.forEachNeighbor(node, (neighbor, attributes) => {
      if (this.nodeIds.has(neighbor)) {
        callback(neighbor, attributes);
      }
    });
  }

  updateNodeAttribute(node: string, attr: any, updater: (currentValue: any | undefined) => any): this {
    if (!this.nodeIds.has(node)) return this;
    const currentValue = this.graph.getNodeAttribute(node, attr);
    this.graph.setNodeAttribute(node, attr, updater(currentValue));
    return this;
  }
}



/**
 * Создаёт обёртку FilteredGraph, отбирая узлы по заданному критерию.
 * @param ogGraph   исходный граф
 * @param filter    строка (community ID) или функция-предикат (node, attrs) => boolean
 */
export function createFilteredGraph(
  ogGraph: Graph,
  filter: (node: string, attrs: { [key: string]: any }) => boolean
): FilteredGraph {
  const selectedNodeIds = new Set<string>();

  ogGraph.forEachNode((node, attrs) => {
    if (filter(node, attrs)) selectedNodeIds.add(node);
  });

  return new FilteredGraph(ogGraph, selectedNodeIds);
}
