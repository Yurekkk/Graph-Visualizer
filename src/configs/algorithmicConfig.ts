// ### Layout Engine ###
export const circularMinDensity = 0.25;
export const circularMaxNumNodes = 50;
export const radialMinDegreeGini = 0.75;
export const radialMinHubDominance = 25;
export const samplingMinNumNodes = 500;

export const forceAtlasIterations = 50;



// ### Node Focus ###
export const maxHighlightedNeighborsNum = 20;
export const maxAccumulatedCost = 3;
export const minWeightCost = 3;   // Стоимость прохода по ребру с минимальным весом, > 0
export const maxWeightCost = 0.1; // Стоимость прохода по ребру с максимальным весом, > 0
// В случае, если maxWeight = minWeight, цена всегда = minWeightCost



// ### Misc ###
export const timestamp_threshold = 500_000_000;
// Если все значения ребер больше этого порога, 
// то, скорее всего, это не веса, а временные метки