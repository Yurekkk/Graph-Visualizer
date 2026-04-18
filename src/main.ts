import './style.css';
import initGraph from './initGraph';



const graphSelector = document.getElementById('graph-selector') as HTMLSelectElement;
if (!graphSelector) throw new Error('Селектор графов не найден!');
const algorithmSelector = document.getElementById('algorithm-selector') as HTMLSelectElement;
if (!algorithmSelector) throw new Error('Селектор алгоритмов не найден!');
const loader = document.getElementById('loader');
if (!loader) throw new Error('Загрузчик не найден!');



function initSelectors() {
  algorithmSelector!.innerHTML = '';
  const algorithms = [
    'auto', 
    'meta', 
    'circular', 
    'radial', 
    // 'hierarchical', 
    'forceAtlas2', 
    'forceAtlas2wSampling'
  ];
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

  // Загружаем miserables.json по умолчанию
  const miserablesPath = '../graphs/miserables.json';
  graphSelector!.value = '../graphs/miserables.json';
  initGraph(miserablesPath, 'miserables');
}



graphSelector.addEventListener('change', () => start());
algorithmSelector.addEventListener('change', () => start());



async function start() {
  loader!.style.display = 'flex'; // показываем крутилку
  
  // Ждём 1 кадр, чтобы браузер успел отрисовать лоадер
  await new Promise(r => setTimeout(r, 1));
  
  await initGraph(graphSelector.value, 
    graphSelector.options[graphSelector.selectedIndex].text, 
    algorithmSelector.value);

  loader!.style.display = 'none'; // скрываем по завершении
}



initSelectors();
