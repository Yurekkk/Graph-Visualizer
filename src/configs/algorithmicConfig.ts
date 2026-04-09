// ### Layout Engine ###
export const circularMinDensity = 0.25;
export const circularMaxNumNodes = 50;
export const radialMinDegreeGini = 0.75;
export const radialMinHubDominance = 100;
export const samplingMinNumNodes = 500;

export const forceAtlasIterations = 50;



// ### Node Focus ###
export const maxHighlightedNeighborsNum = 20;
export const maxAccumulatedCost = 3;
export const minWeightCost = 3;   // Стоимость прохода по ребру с минимальным весом, > 0
export const maxWeightCost = 0.1; // Стоимость прохода по ребру с максимальным весом, > 0
// В случае, если maxWeight = minWeight, цена за вес ребра всегда = minWeightCost / 3
export const degreeInfluence = 0.5; // Влияние степени на функцию цены
// Больше значение => поиск больше тяготеет к хабам



// ### Misc ###
// Importance calculations
export const degreeWeight = 0.5;
export const kCoreWeight = 0.5;

export const seed = '42';

export const timestamp_threshold = 500_000_000;
// Если все значения ребер больше этого порога, 
// то, скорее всего, это не веса, а временные метки