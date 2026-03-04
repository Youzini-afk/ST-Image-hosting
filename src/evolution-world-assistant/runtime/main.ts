import { loadSettings, loadLastRun, loadLastIo } from './settings';
import { initRuntimeEvents, disposeRuntimeEvents } from './events';
import { initGlobalApi, disposeGlobalApi } from './api';

let initialized = false;

export function initRuntime() {
  if (initialized) {
    return;
  }

  loadSettings();
  loadLastRun();
  loadLastIo();
  initGlobalApi();
  initRuntimeEvents();

  if (_.isFunction(initializeGlobal)) {
    initializeGlobal('EvolutionWorldAPI', window.EvolutionWorldAPI ?? {});
  }

  initialized = true;
  console.info('[Evolution World] runtime initialized');
}

export function disposeRuntime() {
  if (!initialized) {
    return;
  }

  disposeRuntimeEvents();
  disposeGlobalApi();

  initialized = false;
  console.info('[Evolution World] runtime disposed');
}
