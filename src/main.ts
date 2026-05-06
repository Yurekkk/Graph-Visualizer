import initGraph from './initGraph';
import { ThemeManager, initThemeToggle } from './misc/themeManager';
import { layoutFunctions } from './layout-module/layoutEngine';



const graphSelector = document.getElementById('graph-selector') as HTMLSelectElement;
if (!graphSelector) throw new Error('Селектор графов не найден!');
const algorithmSelector = document.getElementById('algorithm-selector') as HTMLSelectElement;
if (!algorithmSelector) throw new Error('Селектор алгоритмов не найден!');
const loader = document.getElementById('loader');
if (!loader) throw new Error('Загрузчик не найден!');



function initSelectors() {
  algorithmSelector!.innerHTML = '';
  const algorithms = Object.keys(layoutFunctions);
  algorithms.forEach((algorithm) => {
    const option = document.createElement('option');
    option.textContent = algorithm;
    option.value = algorithm;
    algorithmSelector!.append(option);
  })


  const graphFiles = import.meta.glob<{ nodes: any[]; edges: any[] }>
    ('../graphs/*', { eager: false });

  graphSelector!.innerHTML = '';
  
  Object.keys(graphFiles).forEach((path) => {
    const option = document.createElement('option');
    option.value = path;
    // Красивое имя файла без расширения и пути
    option.textContent = path.replace('../graphs/', '').replace(/\.[^.]+$/, ''); 
    graphSelector!.appendChild(option);
  });
}



async function start() {
  loader!.style.display = 'flex'; // показываем крутилку
  
  // Ждём, чтобы браузер успел отрисовать лоадер
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  
  await initGraph(graphSelector.value, 
    graphSelector.options[graphSelector.selectedIndex].text, 
    algorithmSelector.value);

  loader!.style.display = 'none'; // скрываем по завершении
}



initSelectors();
ThemeManager.init();
initThemeToggle();

graphSelector.addEventListener('change', () => start());
algorithmSelector.addEventListener('change', () => start());

// Загружаем miserables.json по умолчанию
const miserablesPath = '../graphs/miserables.json';
graphSelector!.value = '../graphs/miserables.json';
initGraph(miserablesPath, 'miserables');
