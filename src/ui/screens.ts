import type { Chart } from '../game/chart';
import type { ScoreState } from '../game/scoring';
import { accuracy, rating } from '../game/scoring';

export interface ResultsData {
  chart: Chart;
  score: ScoreState;
}

export interface Screens {
  showMenu(
    songs: readonly Chart[],
    onPlay: (chart: Chart) => void,
    onFreePlay: () => void,
    onCalibrate: () => void,
  ): void;
  showLoading(message: string): void;
  showError(message: string, onRetry: () => void): void;
  showCountdown(seconds: number): void;
  hideCountdown(): void;
  showResults(data: ResultsData, onReplay: () => void, onMenu: () => void): void;
  showPause(visible: boolean): void;
  hideAll(): void;
}

const STARS = (difficulty: number): string => '★'.repeat(difficulty) + '☆'.repeat(3 - difficulty);

export function createScreens(): Screens {
  const root = document.getElementById('screens')!;

  function clear(): void {
    root.innerHTML = '';
  }

  function panel(className: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = `screen ${className}`;
    root.appendChild(el);
    return el;
  }

  let countdownEl: HTMLDivElement | null = null;
  let pauseEl: HTMLDivElement | null = null;

  return {
    showMenu(songs, onPlay, onFreePlay, onCalibrate): void {
      clear();
      const menu = panel('screen-menu');

      const title = document.createElement('h1');
      title.className = 'menu-title';
      title.textContent = 'PIANO HERO';
      const subtitle = document.createElement('p');
      subtitle.className = 'menu-subtitle';
      subtitle.textContent = 'Toca piano de verdad con tu teclado';
      menu.append(title, subtitle);

      const list = document.createElement('div');
      list.className = 'song-list';
      for (const chart of songs) {
        const card = document.createElement('button');
        card.className = 'song-card';
        const name = document.createElement('span');
        name.className = 'song-name';
        name.textContent = chart.title;
        const meta = document.createElement('span');
        meta.className = 'song-meta';
        meta.textContent = `${STARS(chart.difficulty)}  ·  ${chart.bpm} bpm`;
        card.append(name, meta);
        card.addEventListener('click', () => onPlay(chart));
        list.appendChild(card);
      }
      menu.appendChild(list);

      const actions = document.createElement('div');
      actions.className = 'menu-actions';
      const freeBtn = document.createElement('button');
      freeBtn.className = 'menu-button';
      freeBtn.textContent = 'Modo libre';
      freeBtn.addEventListener('click', onFreePlay);
      const calBtn = document.createElement('button');
      calBtn.className = 'menu-button ghost';
      calBtn.textContent = 'Calibrar';
      calBtn.addEventListener('click', onCalibrate);
      actions.append(freeBtn, calBtn);
      menu.appendChild(actions);

      const help = document.createElement('p');
      help.className = 'menu-help';
      help.textContent = 'Fila inferior: octava grave. Fila superior: do central en E. Las notas te muestran la tecla.';
      menu.appendChild(help);
    },

    showLoading(message: string): void {
      clear();
      const el = panel('screen-loading');
      const text = document.createElement('p');
      text.textContent = message;
      el.appendChild(text);
    },

    showError(message: string, onRetry: () => void): void {
      clear();
      const el = panel('screen-loading');
      const text = document.createElement('p');
      text.textContent = message;
      const btn = document.createElement('button');
      btn.className = 'menu-button';
      btn.textContent = 'Reintentar';
      btn.addEventListener('click', onRetry);
      el.append(text, btn);
    },

    showCountdown(seconds: number): void {
      if (!countdownEl) {
        countdownEl = document.createElement('div');
        countdownEl.className = 'countdown';
        root.appendChild(countdownEl);
      }
      const label = seconds > 0 ? String(seconds) : 'YA';
      if (countdownEl.textContent !== label) {
        countdownEl.textContent = label;
        countdownEl.classList.remove('tick');
        void countdownEl.offsetWidth;
        countdownEl.classList.add('tick');
      }
    },

    hideCountdown(): void {
      countdownEl?.remove();
      countdownEl = null;
    },

    showResults(data, onReplay, onMenu): void {
      clear();
      const el = panel('screen-results');
      const acc = accuracy(data.score);

      const grade = document.createElement('div');
      grade.className = `results-grade grade-${rating(acc).toLowerCase()}`;
      grade.textContent = rating(acc);
      const songName = document.createElement('p');
      songName.className = 'results-song';
      songName.textContent = data.chart.title;
      el.append(grade, songName);

      const stats = document.createElement('div');
      stats.className = 'results-stats';
      const rows: [string, string][] = [
        ['Puntos', data.score.score.toLocaleString('es-PE')],
        ['Precision', `${Math.round(acc * 100)}%`],
        ['Combo maximo', String(data.score.maxCombo)],
        ['Perfecto', String(data.score.counts.perfect)],
        ['Genial', String(data.score.counts.great)],
        ['Bien', String(data.score.counts.good)],
        ['Fallos', String(data.score.counts.miss)],
      ];
      for (const [label, value] of rows) {
        const row = document.createElement('div');
        row.className = 'results-row';
        const l = document.createElement('span');
        l.textContent = label;
        const v = document.createElement('b');
        v.textContent = value;
        row.append(l, v);
        stats.appendChild(row);
      }
      el.appendChild(stats);

      const actions = document.createElement('div');
      actions.className = 'menu-actions';
      const replay = document.createElement('button');
      replay.className = 'menu-button';
      replay.textContent = 'Repetir';
      replay.addEventListener('click', onReplay);
      const menu = document.createElement('button');
      menu.className = 'menu-button ghost';
      menu.textContent = 'Menu';
      menu.addEventListener('click', onMenu);
      actions.append(replay, menu);
      el.appendChild(actions);
    },

    showPause(visible: boolean): void {
      if (visible && !pauseEl) {
        pauseEl = document.createElement('div');
        pauseEl.className = 'screen screen-pause';
        const text = document.createElement('p');
        text.textContent = 'Pausa';
        const hint = document.createElement('span');
        hint.textContent = 'Esc para continuar';
        pauseEl.append(text, hint);
        root.appendChild(pauseEl);
      } else if (!visible && pauseEl) {
        pauseEl.remove();
        pauseEl = null;
      }
    },

    hideAll(): void {
      clear();
      countdownEl = null;
      pauseEl = null;
    },
  };
}
