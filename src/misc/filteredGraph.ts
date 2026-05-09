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
  private edgeIds: Set<string>;
  public order: number;
  public size: number;
  public type: GraphType;
  public multi: boolean;

  /**
   * @param graph            Исходный граф Graphology
   * @param selectedNodeIds  ID узлов, которые участвуют в раскладке/алгоритме
   */
  constructor(graph: Graph, selectedNodeIds: Set<string>) {
    super();
    this.graph = graph;
    this.nodeIds = selectedNodeIds;
    this.edgeIds = new Set();
    this.order = this.nodeIds.size;
    this.type = "undirected";
    this.multi = false;
    this.size = 0;

    // Заполняем edgeIds, обходя соседей каждого выбранного узла
    this.nodeIds.forEach(node => {
      this.graph.forEachNeighbor(node, (neighbor) => {
        // Сосед тоже должен быть выбран, иначе ребро не включаем
        if (this.nodeIds.has(neighbor)) {
          const edge = this.graph.edge(node, neighbor);
          if (edge && !this.edgeIds.has(edge)) {
            this.edgeIds.add(edge);
            this.size++;
          }
        }
      });
    });
  }

  /** Перебирает только выбранные узлы */
  forEachNode(callback: (node: string, attributes: { [key: string]: any }) => void): void {
    this.nodeIds.forEach((node) => {
      callback(node, this.graph.getNodeAttributes(node));
    });
  }

  /** Перебирает рёбра, у которых оба конца принадлежат выбранным узлам */
  forEachEdge(callback: EdgeIterationCallback<Attributes, Attributes>): void {
    this.edgeIds.forEach((edge) => {
      const [source, target] = this.graph.extremities(edge);
      callback(
        edge, 
        this.graph.getEdgeAttributes(edge), 
        source, 
        target, 
        this.graph.getNodeAttributes(source), 
        this.graph.getNodeAttributes(target), 
        this.graph.isUndirected(edge));
    })
  }
  
  forEachNeighbor(
    node: string,
    callback: (neighbor: string, attributes: { [key: string]: any }) => void
  ): void {
    this.graph.forEachNeighbor(node, (neighbor, attributes) => {
      if (this.nodeIds.has(neighbor)) callback(neighbor, attributes);
    });
  }

  // ==================== Узлы ====================
  
  override hasNode(node: string): boolean {
    return this.nodeIds.has(node) && this.graph.hasNode(node);
  }

  override getNodeAttribute(node: string, attr: string | number): any {
    return this.graph.getNodeAttribute(String(node), String(attr));
  }

  override getNodeAttributes(node: string): { [key: string]: any } {
    return this.graph.getNodeAttributes(String(node));
  }

  override setNodeAttribute(node: string, attr: string | number, value: any): this {
    this.graph.setNodeAttribute(node, String(attr), value);
    return this;
  }

  override mergeNodeAttributes(node: string, attrs: { [key: string]: any }): this {
    this.graph.mergeNodeAttributes(node, attrs);
    return this;
  }

  override updateNodeAttribute(
    node: string,
    attr: string | number,
    updater: (currentValue: any) => any
  ): this {
    const attrKey = String(attr);
    const current = this.graph.getNodeAttribute(node, attrKey);
    this.graph.setNodeAttribute(node, attrKey, updater(current));
    return this;
  }

  override updateNodeAttributes(
    node: string,
    updater: (attributes: { [key: string]: any }) => { [key: string]: any } | void
  ): this {
    const currentAttrs = this.graph.getNodeAttributes(node);
    const newAttrs = updater(currentAttrs);
    if (newAttrs) this.graph.mergeNodeAttributes(node, newAttrs);
    return this;
  }

  override updateEachNodeAttributes(
    updater: (node: string, attributes: { [key: string]: any }) => { [key: string]: any } | void
  ): this {
    this.forEachNode((node, attrs) => {
      const newAttrs = updater(node, attrs);
      if (newAttrs) this.graph.mergeNodeAttributes(node, newAttrs);
    });
    return this;
  }

  override nodes(): string[] {
    return Array.from(this.nodeIds);
  }

  // ==================== Ребра ====================
  
  override hasEdge(edge: string): boolean {
    return this.edgeIds.has(edge) && this.graph.hasEdge(edge);
  }

  override getEdgeAttribute(edge: string, attr: string | number): any {
    return this.graph.getEdgeAttribute(String(edge), String(attr));
  }

  override getEdgeAttributes(edge: string): { [key: string]: any } {
    return this.graph.getEdgeAttributes(String(edge));
  }

  override setEdgeAttribute(edge: string, attr: string | number, value: any): this {
    this.graph.setEdgeAttribute(String(edge), String(attr), value);
    return this;
  }

  override mergeEdgeAttributes(edge: string, attrs: { [key: string]: any }): this {
    this.graph.mergeEdgeAttributes(String(edge), attrs);
    return this;
  }

  override updateEdgeAttribute(
    edge: string,
    attr: string | number,
    updater: (currentValue: any) => any
  ): this {
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
    const key = String(edge);
    const currentAttrs = this.graph.getEdgeAttributes(key);
    const newAttrs = updater(currentAttrs);
    if (newAttrs) this.graph.mergeEdgeAttributes(key, newAttrs);
    return this;
  }

  override updateEachEdgeAttributes(updater: any) {
    this.forEachEdge((edge, attrs) => {
      const newAttrs = updater(edge, attrs);
      if (newAttrs) this.graph.mergeEdgeAttributes(edge, newAttrs);
    });
  }

  override edge(source: string, target: string): string | undefined {
    if (!this.nodeIds.has(source) || !this.nodeIds.has(target)) return undefined;
    return this.graph.edge(source, target);  // делегируем исходному графу
  }

  override extremities(edge: string): [string, string] {
    if (this.hasEdge(edge)) return this.graph.extremities(edge);
    else throw new Error(`Graph has no edge '${String(edge)}'`);
  }
  
  // ==================== Разное ====================

  /**
   * Степень узла без учёта петель, но только среди выбранных соседей.
   * Для направленного графа считает всех соседей (как undirectedDegree).
   */
  override undirectedDegreeWithoutSelfLoops(node: string): number {
    const neighbors = this.graph.neighbors(node).filter((n) => this.nodeIds.has(n));
    return neighbors.filter((n) => n !== node).length;
  }

  override neighbors(node: string): string[] {
    return this.graph.neighbors(node).filter((n) => this.nodeIds.has(n));
  }

  override degree(node: string): number {
    return this.graph.neighbors(node).filter(n => this.nodeIds.has(n)).length;
  }

  override isUndirected(edge: string): boolean {
    return this.graph.isUndirected(String(edge));
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
