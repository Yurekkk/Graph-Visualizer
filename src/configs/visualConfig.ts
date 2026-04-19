// ### Общая отрисовка  ###
export const edgesMaxDrawnLimit = 1000;



// ### Узлы ###
export const nodeMinSize = 6;   // При минимальной степени
export const nodeMaxSize = 20;  // При максимальной степени
export const nodeSizeHover = null;    // Если null, то размер не меняется при ховере
export const nodeSizeSelected = null; // Если null, то размер не меняется при клике
export const nodeTransparentAlpha = 0.05;
export const nodeDefaultAlpha = 1.0;



// ### Ребра ###
export const edgeMinSize = 2;  // При минимальном весе ребра
export const edgeMaxSize = 4;  // При максимальном весе ребра
export const edgeDefaultSize = 3;
export const edgeMinTurboT = 0.025; // Минимальный параметр для interpolateTurbo
// Темно-фиолетовый цвет в начале палитры выглядит уродливо, поэтому так ^
export const edgeTransparentAlpha = 0.05;
export const edgeDefaultAlpha = 0.1;
export const edgeHoverAlpha = 1.0;
export const edgeClickAlpha = 1.0;
export const edgeHoverColor = '#ffffff';



// ### Границы ###
export const borderColor = '#ffffff';
export const borderSizeDefault = 0.125; // Дробь от размера всего узла, [0, 1]
export const borderSizeNeighbor = 0.35; // [0, 1]
export const borderSizeHover = 0.2;     // [0, 1]
export const borderSizeSelect = 0.15;



// ### Misc ###
export const labelColor = '#000000';
export const labelSize = 20;
export const cameraFitPadding = 50; // в пикселях
export const zLayerMargin = 1e+12; // Запас на один z-слой для одного типа узлов
// [0, zLayerMargin] для usual узлов, [zLayerMargin, 2 * zLayerMargin] для selected узлов и т. д.