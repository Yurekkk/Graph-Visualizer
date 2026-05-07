import type Graph from "graphology";
// import louvain from "graphology-communities-louvain";
import leiden from '@aflsolutions/graphology-communities-leiden';
import seedrandom from "seedrandom";
import * as alg from '../configs/algorithmicConfig.ts';



export function findCommunities(graph: Graph, resolution: number = alg.communitiesResolution) {
  const start = performance.now();

  // louvain.assign(graph, {
  //   rng: seedrandom(alg.seed), 
  //   resolution: resolution,
  //   nodeCommunityAttribute: 'community'
  // });

  const details = leiden.detailed(graph, {
    rng: seedrandom(alg.seed), 
    resolution: resolution,
    weighted: true,
    attributes: {
      weight: 'weight',
      community: 'community'
    }
  });

  const end = performance.now();
  console.log(`Время нахождения сообществ: ${(end - start).toFixed(3)} мс`)

  const numCommunities = details.count;
  const modularity = details.modularity;
  return { numCommunities, modularity };
}
