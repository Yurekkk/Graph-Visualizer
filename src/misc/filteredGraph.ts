import Graph from "graphology";
import type { EdgeIterationCallback, Attributes, GraphType } from "graphology-types";

/**
 * Обёртка графа, которая работает только с указанными узлами, 
 * чтобы не делать дорогостоящей операции построения подграфа.
 * Все операции ограничиваются множеством selectedNodeIds.
 * Остальные узлы и инцидентные им рёбра не видны.
 * Не реализует все методы оригинального класса, а только то, что было нужно.
 */
export default class FilteredGraph extends Graph {
  private graph: Graph;
  private nodeIds: Set<string>;
  public order: number;
  public type: GraphType;
  public multi: boolean;
  private _nodes: Set<string>;
  private _edges: Set<string>;

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

    this._nodes = this.nodeIds;
    this._edges = new Set();
    this.graph.forEachEdge((edge, _attr, source, target) => {
      if (this.nodeIds.has(source) && this.nodeIds.has(target))
        this._edges.add(edge);
    });
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

  // ==================== Узлы ====================

  override getNodeAttribute(node: string, attr: string | number): any {
    if (!this.hasNode(node)) return undefined;
    return this.graph.getNodeAttribute(String(node), String(attr));
  }

  override getNodeAttributes(node: string): { [key: string]: any } {
    if (!this.hasNode(node)) return {};
    return this.graph.getNodeAttributes(String(node));
  }

  override setNodeAttribute(node: string, attr: string | number, value: any): this {
    if (this.nodeIds.has(node))
      this.graph.setNodeAttribute(node, String(attr), value);
    return this;
  }

  override mergeNodeAttributes(node: string, attrs: { [key: string]: any }): this {
    if (this.nodeIds.has(node))
      this.graph.mergeNodeAttributes(node, attrs);
    return this;
  }

  override updateNodeAttribute(
    node: string,
    attr: string | number,
    updater: (currentValue: any) => any
  ): this {
    if (this.nodeIds.has(node)) {
      const attrKey = String(attr);
      const current = this.graph.getNodeAttribute(node, attrKey);
      this.graph.setNodeAttribute(node, attrKey, updater(current));
    }
    return this;
  }

  override updateNodeAttributes(
    node: string,
    updater: (attributes: { [key: string]: any }) => { [key: string]: any } | void
  ): this {
    if (this.nodeIds.has(node)) {
      const currentAttrs = this.graph.getNodeAttributes(node);
      const newAttrs = updater(currentAttrs);
      if (newAttrs) this.graph.mergeNodeAttributes(node, newAttrs);
    }
    return this;
  }

  override updateEachNodeAttributes(
    updater: (node: string, attributes: { [key: string]: any }) => { [key: string]: any } | void
  ): this {
    this.forEachNode((node, attrs) => {
      const newAttrs = updater(node, attrs);
      if (newAttrs) {
        this.graph.mergeNodeAttributes(node, newAttrs);
      }
    });
    return this;
  }

  // ==================== Ребра ====================

  override getEdgeAttribute(edge: string, attr: string | number): any {
    if (!this.hasEdge(edge)) return undefined;
    return this.graph.getEdgeAttribute(String(edge), String(attr));
  }

  override getEdgeAttributes(edge: string): { [key: string]: any } {
    if (!this.hasEdge(edge)) {
      throw new Error(`Graph has no edge '${String(edge)}'`);
    }
    return this.graph.getEdgeAttributes(String(edge));
  }

  override setEdgeAttribute(edge: string, attr: string | number, value: any): this {
    if (!this.hasEdge(edge)) return this;
    this.graph.setEdgeAttribute(String(edge), String(attr), value);
    return this;
  }

  override mergeEdgeAttributes(edge: string, attrs: { [key: string]: any }): this {
    if (!this.hasEdge(edge)) return this;
    this.graph.mergeEdgeAttributes(String(edge), attrs);
    return this;
  }

  override updateEdgeAttribute(
    edge: string,
    attr: string | number,
    updater: (currentValue: any) => any
  ): this {
    if (!this.hasEdge(edge)) return this;
    const edgeKey = String(edge);
    const attrKey = String(attr);
    const current = this.graph.getEdgeAttribute(edgeKey, attrKey);
    this.graph.setEdgeAttribute(edgeKey, attrKey, updater(current));
    return this;
  }

  override updateEdgeAttributes(
    edge: string,
    updater: (attributes: { [key: string]: any }) => { [key: string]: any } | void
  ): this {
    if (!this.hasEdge(edge)) return this;
    const key = String(edge);
    const currentAttrs = this.graph.getEdgeAttributes(key);
    const newAttrs = updater(currentAttrs);
    if (newAttrs) {
      this.graph.mergeEdgeAttributes(key, newAttrs);
    }
    return this;
  }

  override updateEachEdgeAttributes(updater: any) {
    this.forEachEdge((edge, attrs) => {
      const newAttrs = updater(edge, attrs);
      if (newAttrs) {
        this.graph.mergeEdgeAttributes(edge, newAttrs);
      }
    });
  }
  
  // ==================== Разное ====================

  /**
   * Степень узла без учёта петель, но только среди выбранных соседей.
   * Для направленного графа считает всех соседей (как undirectedDegree).
   */
  undirectedDegreeWithoutSelfLoops(node: string): number {
    if (!this.nodeIds.has(node)) return 0;
    const neighbors = this.graph.neighbors(node).filter((n) => this.nodeIds.has(n));
    return neighbors.filter((n) => n !== node).length;
  }

  hasNode(node: string): boolean {
    return this.nodeIds.has(node) && this.graph.hasNode(node);
  }

  neighbors(node: string): string[] {
    if (!this.nodeIds.has(node)) return [];
    return this.graph.neighbors(node).filter((n) => this.nodeIds.has(n));
  }

  degree(node: string): number {
    if (!this.nodeIds.has(node)) return 0;
    return this.graph.neighbors(node).filter(n => this.nodeIds.has(n)).length;
  }

  nodes(): string[] {
    return Array.from(this.nodeIds);
  }

  /**
   * Возвращает ключ ребра между source и target,
   * если оба узла принадлежат filtered-представлению и такое ребро существует.
   */
  override edge(source: unknown, target: unknown): string | undefined {
    const s = String(source);
    const t = String(target);
    if (!this.nodeIds.has(s) || !this.nodeIds.has(t)) return undefined;
    return this.graph.edge(s, t);  // делегируем исходному графу
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
