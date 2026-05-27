// ### Metrics ###
// Importance calculations
export const degreeWeight = 0.1;
export const kCoreWeight = 0.1;
export const eigenvectorCentralityWeight = 0.8;

// higher values (>1) produce more, smaller clusters, 
// while lower values (<1) produce fewer, larger clusters
export const communitiesResolution = 1.0;

export const eigCentralityMaxIterations = 100;
export const eigCentralityTolerance = 1e-6;



// ### Layouts Settings ###
export const circularSpacing = 1.0;
export const radialRingSpacing = 30;
export const radialSubringSpacing = 2.0;
export const hierarchicalSpacing = 0.2;
export const forceLayoutIterations = 100;
export const forceLayoutScalingRatio = 20.0;
export const samplingLayoutIterations = 50;
export const sampleSizeCoefficient = 0.67; // [0, 1]. Кол-во узлов в выборке = N^sampleSizeCoefficient
export const samplingLayoutSpacing = 5.0; // Коэффициент, на который умножаются координаты разложенного сэмпла, 
                                          // чтобы увеличить расстояия между узлами при интерполяции

export const metaLayoutResolutionDecreaseStep = 0.2;
// На каждом шаге рекурсии разрешение Louvain уменьшается (начиная с communitiesResolution), 
// чтобы алгоритм не зацикливался на слишком маленьких сообществах + так быстрее

export const spectralSpacing = 1000.0;
export const spectralMaxIterations = 20;    // макс. итераций степенного метода
export const spectralCgMaxIterations = 50;  // макс. итераций CG на одном шаге
export const spectralDenseThreshold = 200;  // размер компоненты, до которого используем плотный метод
export const spectralCgTolerance = 1e-6;



// ### Layout Engine Decision Tree ###
export const metaLayoutRecursionLevelCap = 5; 

export const metaLayoutMinNodes = 50;      // &&
export const metaLayoutMinModularity = 0.1;

export const circularMinDensity = 0.9;

export const radialMinHubDominance = 0.85; // &&
export const radialMinNumNodes = 10;

export const samplingMinDegreeGini = 0.4;  // &&
export const samplingMinNumNodes = 100;



// ### Node Focus ###
export const maxHighlightedNeighborsNum = 30;
export const maxAccumulatedCost = 5;
export const importanceInfluence = 3;



// ### Misc ###
export const edgesHoverHighlightLimit = 5000; 
// Если в графе больше такого количества рёбер, то подсветка соседей 
// при наведении отключается, чтобы не тормозить интерфейс

export const logAlgorithmChoices = false;
export const seed = '42';
export const timestamp_threshold = 500_000_000;
// Если все значения ребер больше этого порога, 
// то, скорее всего, это не веса, а временные метки