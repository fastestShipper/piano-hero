import type { Judgment } from '../game/scoring';

const JUDGMENT_TEXT: Record<Judgment, string> = {
  perfect: 'PERFECTO',
  great: 'GENIAL',
  good: 'BIEN',
  miss: 'FALLO',
};

export interface Hud {
  update(score: number, combo: number, multiplier: number, acc: number): void;
  flashJudgment(j: Judgment): void;
  setVisible(v: boolean): void;
}

export function createHud(): Hud {
  const root = document.getElementById('hud')!;
  root.innerHTML = `
    <div class="hud-score">
      <span class="hud-label">Puntos</span>
      <span class="hud-score-value" id="hud-score">0</span>
    </div>
    <div class="hud-acc">
      <span class="hud-label">Precision</span>
      <span class="hud-acc-value" id="hud-acc">100%</span>
    </div>
    <div class="hud-combo" id="hud-combo">
      <span class="hud-combo-value" id="hud-combo-value">0</span>
      <span class="hud-combo-label">combo <b id="hud-mult">x1</b></span>
    </div>
    <div class="hud-judgment" id="hud-judgment"></div>
  `;
  const scoreEl = document.getElementById('hud-score')!;
  const accEl = document.getElementById('hud-acc')!;
  const comboBox = document.getElementById('hud-combo')!;
  const comboEl = document.getElementById('hud-combo-value')!;
  const multEl = document.getElementById('hud-mult')!;
  const judgmentEl = document.getElementById('hud-judgment')!;
  let lastCombo = 0;
  let flashTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    update(score: number, combo: number, multiplier: number, acc: number): void {
      scoreEl.textContent = score.toLocaleString('es-PE');
      accEl.textContent = `${Math.round(acc * 100)}%`;
      comboEl.textContent = String(combo);
      multEl.textContent = `x${multiplier}`;
      comboBox.classList.toggle('is-hot', combo >= 10);
      if (combo > 0 && combo % 10 === 0 && combo !== lastCombo) {
        comboBox.classList.remove('milestone');
        void comboBox.offsetWidth; // restart the CSS animation
        comboBox.classList.add('milestone');
      }
      lastCombo = combo;
    },

    flashJudgment(j: Judgment): void {
      judgmentEl.textContent = JUDGMENT_TEXT[j];
      judgmentEl.className = `hud-judgment show j-${j}`;
      if (flashTimer) clearTimeout(flashTimer);
      flashTimer = setTimeout(() => judgmentEl.classList.remove('show'), 450);
    },

    setVisible(v: boolean): void {
      root.style.display = v ? 'block' : 'none';
    },
  };
}
