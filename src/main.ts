import initGraph from './initGraph';
import { ThemeManager, initThemeToggle } from './interactive-module/themeManager';
import { layoutFunctions } from './layout-module/smartLayout';



const algorithmSelector = document.getElementById('algorithm-selector') as HTMLSelectElement;
if (!algorithmSelector) throw new Error('Селектор алгоритмов не найден!');
const loader = document.getElementById('loader');
if (!loader) throw new Error('Загрузчик не найден!');
const fileInput = document.getElementById('file-input');
if (!fileInput) throw new Error('fileInput не найден!');
const uploadZone = document.getElementById('file-upload-zone');
if (!uploadZone) throw new Error('uploadZone не найден!');
const graphNameValue = document.getElementById('graph-name-value');
if (!graphNameValue) throw new Error('graph-name-value не найден!');

let currentFile: File | null = null;
let currentFileName: string = '';



function updateGraphNameDisplay(fileName: string) {
  graphNameValue!.textContent = fileName;
}



async function loadFileFromUrl(url: string, fileName: string): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type });
}



function initUploadZone() {
  // Клик на зону -> открыть диалог
  uploadZone!.addEventListener('click', () => fileInput!.click());

  // Выбор файла
  fileInput!.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) handleFileLoad(file);
  });

  // Drag & drop
  uploadZone!.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone!.classList.add('dragover');
  });

  uploadZone!.addEventListener('dragleave', () => {
    uploadZone!.classList.remove('dragover');
  });

  uploadZone!.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone!.classList.remove('dragover');
    const dragEvent = e as DragEvent;
    const file = dragEvent.dataTransfer?.files[0];
    if (file) handleFileLoad(file);
  });

  async function handleFileLoad(file: File) {
    currentFile = file;
    currentFileName = file.name.replace(/\.[^.]+$/, '');
    updateGraphNameDisplay(currentFileName);
    await start();
  }
}



function initAlgorithmSelector() {
  algorithmSelector!.innerHTML = '';
  const algorithms = Object.keys(layoutFunctions);
  algorithms.forEach((algorithm) => {
    const option = document.createElement('option');
    option.textContent = algorithm;
    option.value = algorithm;
    algorithmSelector!.append(option);
  })
  algorithmSelector.addEventListener('change', () => start());
}



async function start() {
  if (!currentFile) return;
  
  loader!.style.display = 'flex'; // показываем крутилку
  
  // Ждём, чтобы браузер успел отрисовать лоадер
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  
  await initGraph(currentFile, currentFileName, algorithmSelector.value);

  loader!.style.display = 'none'; // скрываем по завершении
}



initUploadZone();
initAlgorithmSelector();
ThemeManager.init();
initThemeToggle();

// Загружаем miserables.json по умолчанию
const miserablesPath = '../graphs/miserables.json';
loadFileFromUrl(miserablesPath, 'miserables.json').then((file) => {
  currentFile = file;
  updateGraphNameDisplay('miserables');
  currentFileName = 'miserables';
  initGraph(file, 'miserables', 'auto');
});
