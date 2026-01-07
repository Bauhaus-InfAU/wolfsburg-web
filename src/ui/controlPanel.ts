import {
  DESTINATION_LAND_USES,
  LAND_USE_DISPLAY_NAMES,
  LAND_USE_COLORS,
} from '../config/constants';
import { SimulationEngine } from '../simulation/simulationEngine';

export class ControlPanel {
  private engine: SimulationEngine;

  private playBtn: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLSpanElement;
  private spawnSlider: HTMLInputElement;
  private spawnValue: HTMLSpanElement;
  private decaySlider: HTMLInputElement;
  private decayValue: HTMLSpanElement;
  private distanceSlider: HTMLInputElement;
  private distanceValue: HTMLSpanElement;

  constructor(engine: SimulationEngine) {
    this.engine = engine;

    // Get elements
    this.playBtn = document.getElementById('btn-play') as HTMLButtonElement;
    this.pauseBtn = document.getElementById('btn-pause') as HTMLButtonElement;
    this.resetBtn = document.getElementById('btn-reset') as HTMLButtonElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value') as HTMLSpanElement;
    this.spawnSlider = document.getElementById('spawn-slider') as HTMLInputElement;
    this.spawnValue = document.getElementById('spawn-value') as HTMLSpanElement;
    this.decaySlider = document.getElementById('decay-slider') as HTMLInputElement;
    this.decayValue = document.getElementById('decay-value') as HTMLSpanElement;
    this.distanceSlider = document.getElementById('distance-slider') as HTMLInputElement;
    this.distanceValue = document.getElementById('distance-value') as HTMLSpanElement;

    this.setupEventListeners();
    this.createLandUseToggles();
  }

  private setupEventListeners(): void {
    // Playback controls
    this.playBtn.addEventListener('click', () => {
      this.engine.start();
      this.updatePlaybackButtons(true);
    });

    this.pauseBtn.addEventListener('click', () => {
      this.engine.pause();
      this.updatePlaybackButtons(false);
    });

    this.resetBtn.addEventListener('click', () => {
      this.engine.reset();
      this.updatePlaybackButtons(false);
    });

    // Speed slider
    this.speedSlider.addEventListener('input', () => {
      const speed = parseInt(this.speedSlider.value, 10);
      this.engine.setSpeed(speed);
      this.speedValue.textContent = `${speed}x`;
    });

    // Spawn rate slider
    this.spawnSlider.addEventListener('input', () => {
      const rate = parseFloat(this.spawnSlider.value);
      this.engine.setSpawnRate(rate);
      this.spawnValue.textContent = rate.toFixed(1);
    });

    // Decay slider
    this.decaySlider.addEventListener('input', () => {
      const beta = parseFloat(this.decaySlider.value);
      this.engine.setDecayBeta(beta);
      this.decayValue.textContent = beta.toFixed(4);
    });

    // Distance slider
    this.distanceSlider.addEventListener('input', () => {
      const distance = parseFloat(this.distanceSlider.value);
      this.engine.setMaxDistance(distance);
      this.distanceValue.textContent = distance.toFixed(0);
    });
  }

  private updatePlaybackButtons(isPlaying: boolean): void {
    this.playBtn.disabled = isPlaying;
    this.pauseBtn.disabled = !isPlaying;
  }

  private createLandUseToggles(): void {
    const container = document.getElementById('landuse-toggles');
    if (!container) return;

    container.innerHTML = '';

    for (const landUse of DESTINATION_LAND_USES) {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.dataset.landuse = landUse;

      checkbox.addEventListener('change', () => {
        this.engine.toggleLandUse(landUse, checkbox.checked);
      });

      const colorDot = document.createElement('span');
      colorDot.style.display = 'inline-block';
      colorDot.style.width = '10px';
      colorDot.style.height = '10px';
      colorDot.style.borderRadius = '50%';
      colorDot.style.backgroundColor = LAND_USE_COLORS[landUse];
      colorDot.style.marginRight = '4px';

      label.appendChild(checkbox);
      label.appendChild(colorDot);
      label.appendChild(document.createTextNode(LAND_USE_DISPLAY_NAMES[landUse]));

      container.appendChild(label);
    }
  }
}
