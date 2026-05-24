// Central application state — single source of truth
// Screens: attract | overview | expedition | timeline | archive | person

const AppState = {
  screen: 'attract',
  params: {},
  history: [],
  filters: { tags: new Set(), query: '' },
  lastInputAt: Date.now(),
  activeWaypointId: null,
  mapViewMode: 'naar', // 'naar' | 'op' — route to or on Antarctica
};

const listeners = new Set();

export function getState() {
  return AppState;
}

export function updateState(patch) {
  Object.assign(AppState, patch);
  listeners.forEach(fn => fn(AppState));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Navigation history management
export function pushHistory(screen, params) {
  AppState.history.push({ screen, params: { ...params } });
}

export function popHistory() {
  return AppState.history.pop() ?? null;
}

export function clearHistory() {
  AppState.history = [];
}

export function touchActivity() {
  AppState.lastInputAt = Date.now();
}
