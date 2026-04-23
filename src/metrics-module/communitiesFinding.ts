import type Graph from "graphology";
import louvain from "graphology-communities-louvain";
import { connectedComponents } from "graphology-components";
import seedrandom from "seedrandom";
import * as alg from '../configs/algorithmicConfig.ts';
import calculateModularity from 'graphology-metrics/graph/modularity';



export function findCommunities(graph: Graph, resolution: number = alg.louvainResolution) {
  // let start, end;

  // start = performance.now();
  louvain.assign(graph, {
    rng: seedrandom(alg.seed), 
    resolution: resolution,
    nodeCommunityAttribute: 'community'
  });
  // end = performance.now();
  // console.log(`Время нахождения сообществ (louvain): ${(end - start).toFixed(3)} мс`)

  // Разделяем сообщества с несколькими компонентами связности на разные сообщества
  remapCommunitiesPerComponent(graph);

  const numCommunities = findCommunitiesNum(graph);

  // start = performance.now();
  let modularity;
  if (graph.size == 0 || graph.order == 0) modularity = 0;
  else modularity = calculateModularity(graph);
  // end = performance.now();
  // console.log(`Время нахождения модулярности: ${(end - start).toFixed(3)} мс`)

  return { numCommunities, modularity };
}



// Нахождение кол-ва сообществ
function findCommunitiesNum(graph: Graph): number {
  const uniqueCommunities = new Set();
  graph.forEachNode((_node, attributes) => {
    uniqueCommunities.add(attributes.community);
  })
  return uniqueCommunities.size;
}



function remapCommunitiesPerComponent(graph: Graph) {
  // Louvain может узлы из разных компонент связности запихивать в одно сообщество
  // Разделяем сообщества с несколькими компонентами связности на разные сообщества

  const components = connectedComponents(graph); // string[][]

  let nextId = 0;
  for (const component of components) {
    // Уникальные старые ID сообществ в этой компоненте
    const oldIds = new Set<number>();
    for (const node of component)
      oldIds.add(graph.getNodeAttribute(node, 'community'));

    // Маппинг: старый в новый уникальный ID
    const map = new Map<number, number>();
    for (const id of oldIds) map.set(id, nextId++);

    // Применяем
    for (const node of component) {
      const c = graph.getNodeAttribute(node, 'community');
      graph.setNodeAttribute(node, 'community', map.get(c));
    }
  }
}
