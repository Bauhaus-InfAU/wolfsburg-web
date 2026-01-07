export interface ViewTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export class MapView {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public agentCanvas: HTMLCanvasElement;
  public agentCtx: CanvasRenderingContext2D;

  private transform: ViewTransform = { offsetX: 0, offsetY: 0, scale: 1 };
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private dataBounds = { minX: 0, maxX: 1, minY: 0, maxY: 1 };

  // Callbacks
  public onViewChange: (() => void) | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId)!;
    container.style.position = 'relative';

    // Main canvas for buildings/streets
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '1';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    // Agent canvas overlay
    this.agentCanvas = document.createElement('canvas');
    this.agentCanvas.style.position = 'absolute';
    this.agentCanvas.style.top = '0';
    this.agentCanvas.style.left = '0';
    this.agentCanvas.style.width = '100%';
    this.agentCanvas.style.height = '100%';
    this.agentCanvas.style.pointerEvents = 'none';
    this.agentCanvas.style.zIndex = '10';
    container.appendChild(this.agentCanvas);
    this.agentCtx = this.agentCanvas.getContext('2d')!;

    this.setupEventListeners();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private setupEventListeners(): void {
    // Pan
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.transform.offsetX += dx;
      this.transform.offsetY += dy;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.onViewChange?.();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    });

    // Zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = this.transform.scale * zoomFactor;

      // Zoom toward mouse position
      this.transform.offsetX = mouseX - (mouseX - this.transform.offsetX) * zoomFactor;
      this.transform.offsetY = mouseY - (mouseY - this.transform.offsetY) * zoomFactor;
      this.transform.scale = newScale;

      this.onViewChange?.();
    });

    this.canvas.style.cursor = 'grab';
  }

  private resizeCanvas(): void {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.agentCanvas.width = rect.width;
    this.agentCanvas.height = rect.height;
    this.onViewChange?.();
  }

  setDataBounds(minX: number, minY: number, maxX: number, maxY: number): void {
    this.dataBounds = { minX, maxX, minY, maxY };
  }

  fitToData(): void {
    const { minX, maxX, minY, maxY } = this.dataBounds;
    const dataWidth = maxX - minX;
    const dataHeight = maxY - minY;

    const padding = 50;
    const availableWidth = this.canvas.width - padding * 2;
    const availableHeight = this.canvas.height - padding * 2;

    const scaleX = availableWidth / dataWidth;
    const scaleY = availableHeight / dataHeight;
    this.transform.scale = Math.min(scaleX, scaleY);

    // Center the data
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    this.transform.offsetX = this.canvas.width / 2 - centerX * this.transform.scale;
    this.transform.offsetY = this.canvas.height / 2 + centerY * this.transform.scale; // Flip Y
  }

  // Convert data coordinates to canvas pixels
  dataToCanvas(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this.transform.scale + this.transform.offsetX,
      y: -y * this.transform.scale + this.transform.offsetY, // Flip Y axis
    };
  }

  // Convert canvas pixels to data coordinates
  canvasToData(canvasX: number, canvasY: number): { x: number; y: number } {
    return {
      x: (canvasX - this.transform.offsetX) / this.transform.scale,
      y: -(canvasY - this.transform.offsetY) / this.transform.scale,
    };
  }

  getVisibleBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    const topLeft = this.canvasToData(0, 0);
    const bottomRight = this.canvasToData(this.canvas.width, this.canvas.height);
    return {
      minX: Math.min(topLeft.x, bottomRight.x),
      maxX: Math.max(topLeft.x, bottomRight.x),
      minY: Math.min(topLeft.y, bottomRight.y),
      maxY: Math.max(topLeft.y, bottomRight.y),
    };
  }

  isPointVisible(x: number, y: number): boolean {
    const bounds = this.getVisibleBounds();
    return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
  }

  clearCanvas(): void {
    this.ctx.fillStyle = '#fafafa';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  clearAgentCanvas(): void {
    this.agentCtx.clearRect(0, 0, this.agentCanvas.width, this.agentCanvas.height);
  }

  getCanvasContext(): CanvasRenderingContext2D {
    return this.agentCtx;
  }

  getTransform(): ViewTransform {
    return { ...this.transform };
  }
}
