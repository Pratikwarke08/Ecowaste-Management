export type ThemeChoice = 'light' | 'dark' | 'system' | string | undefined;

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(choice: ThemeChoice): 'light' | 'dark' {
  if (choice === 'dark') return 'dark';
  if (choice === 'light') return 'light';
  return systemPrefersDark() ? 'dark' : 'light';
}

export function applyTheme(choice: ThemeChoice) {
  try {
    const theme = resolveTheme(choice);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  } catch {
    // Silently ignore theme application errors
  }
}

export function bootstrapThemeFromStorage() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) {
      applyTheme('system');
      return;
    }
    const user = JSON.parse(raw);
    const theme = user?.settings?.preferences?.theme as ThemeChoice;
    applyTheme(theme || 'system');
  } catch {
    applyTheme('system');
  }
}
