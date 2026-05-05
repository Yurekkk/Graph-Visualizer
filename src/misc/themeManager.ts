import * as vis from '../configs/visualConfig.ts';



export type Theme = 'dark' | 'light';



export class ThemeManager {
  private static theme: Theme = 'dark';
  private static listeners = new Set<() => void>();
  private static readonly STORAGE_KEY = 'graph-visualizer-theme';

  static init() {
    // Восстанавливаем сохранённую тему
    const saved = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved || (prefersDark ? 'dark' : 'light');

    this.setTheme(initial);
  }

  static setTheme(theme: Theme) {
    this.theme = theme;

    // Обновляем CSS-переменные
    document.documentElement.style.setProperty('--bg-color', 
      theme === 'dark' ? vis.DarkTheme.backgroundColor : vis.LightTheme.backgroundColor);
    document.documentElement.style.setProperty('--text-color', 
      theme === 'dark' ? vis.DarkTheme.textColor : vis.LightTheme.textColor);
    document.documentElement.style.setProperty('--panel-bg', 
      theme === 'dark' ? vis.DarkTheme.panelBackgroundColor : vis.LightTheme.panelBackgroundColor);
    document.documentElement.style.setProperty('--border-color', 
      theme === 'dark' ? vis.DarkTheme.cssBorderColor : vis.LightTheme.cssBorderColor);
    
    // Уведомляем подписчиков (Sigma и т.п.)
    for (const cb of this.listeners) cb();
    
    // Сохраняем выбор
    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  static getTheme(): Theme {
    return this.theme;
  }

  static onChange(cb: () => void) {
    this.listeners.add(cb);
  }
}



export function initThemeToggle() {
  const toggle = document.getElementById('theme-switch') as HTMLInputElement | null;
  if (!toggle) {
    console.warn(`Переключатель тем не найден!`);
    return;
  }

  // Синхронизируем чекбокс с текущей темой
  const syncToggle = () => {
    toggle.checked = ThemeManager.getTheme() === 'dark';
  };
  
  syncToggle(); // при инициализации
  ThemeManager.onChange(syncToggle); // при смене извне

  // Обработчик переключения пользователем
  toggle.addEventListener('change', () => {
    const theme: Theme = toggle.checked ? 'dark' : 'light';
    ThemeManager.setTheme(theme);
  });
}
