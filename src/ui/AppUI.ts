import { VolumeData, FractureStatistics, ProcessingParameters } from '../types';
import { VolumeLoader } from '../loaders/VolumeLoader';
import { HessianFilter } from '../processing/HessianFilter';
import { MarchingCubes } from '../processing/MarchingCubes';
import { VolumeRenderer } from '../rendering/VolumeRenderer';
import { FractureAnalyzer } from '../analysis/FractureAnalyzer';

export class AppUI {
  private container: HTMLElement;
  private sidebar!: HTMLElement;
  private renderContainer!: HTMLElement;
  private statsPanel!: HTMLElement;
  private rosePlotContainer!: HTMLElement;

  private volumeLoader: VolumeLoader;
  private hessianFilter: HessianFilter;
  private volumeRenderer: VolumeRenderer;
  private fractureAnalyzer: FractureAnalyzer;

  private volumeData: VolumeData | null = null;
  private fractureStats: FractureStatistics | null = null;
  private processingParams: ProcessingParameters = {
    sigma: 1.5,
    threshold: 0.01,
    eigenvalueRatio: 0.5,
    isoValue: 0.3
  };

  private processingStatus: HTMLElement;
  private progressBar: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.volumeLoader = new VolumeLoader();
    this.hessianFilter = new HessianFilter();
    this.fractureAnalyzer = new FractureAnalyzer();

    this.createLayout();
    this.volumeRenderer = new VolumeRenderer(this.renderContainer);
    this.volumeRenderer.addAxesHelper(30);
    this.processingStatus = document.createElement('div');
    this.progressBar = document.createElement('div');
  }

  private createLayout(): void {
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'row';
    this.container.style.width = '100%';
    this.container.style.height = '100%';

    this.sidebar = document.createElement('div');
    this.sidebar.style.width = '320px';
    this.sidebar.style.backgroundColor = '#16213e';
    this.sidebar.style.color = '#fff';
    this.sidebar.style.padding = '20px';
    this.sidebar.style.overflowY = 'auto';
    this.sidebar.style.boxShadow = '2px 0 10px rgba(0,0,0,0.3)';

    this.renderContainer = document.createElement('div');
    this.renderContainer.style.flex = '1';
    this.renderContainer.style.position = 'relative';

    this.statsPanel = document.createElement('div');
    this.statsPanel.style.position = 'absolute';
    this.statsPanel.style.top = '20px';
    this.statsPanel.style.right = '20px';
    this.statsPanel.style.backgroundColor = 'rgba(22, 33, 62, 0.9)';
    this.statsPanel.style.color = '#fff';
    this.statsPanel.style.padding = '15px';
    this.statsPanel.style.borderRadius = '8px';
    this.statsPanel.style.minWidth = '250px';
    this.statsPanel.style.display = 'none';

    this.rosePlotContainer = document.createElement('div');
    this.rosePlotContainer.style.position = 'absolute';
    this.rosePlotContainer.style.bottom = '20px';
    this.rosePlotContainer.style.right = '20px';
    this.rosePlotContainer.style.backgroundColor = 'rgba(22, 33, 62, 0.9)';
    this.rosePlotContainer.style.color = '#fff';
    this.rosePlotContainer.style.padding = '15px';
    this.rosePlotContainer.style.borderRadius = '8px';
    this.rosePlotContainer.style.display = 'none';

    this.container.appendChild(this.sidebar);
    this.container.appendChild(this.renderContainer);
    this.renderContainer.appendChild(this.statsPanel);
    this.renderContainer.appendChild(this.rosePlotContainer);

    this.createSidebarContent();
  }

  private createSidebarContent(): void {
    const title = document.createElement('h2');
    title.textContent = '裂隙网络提取与可视化';
    title.style.marginTop = '0';
    title.style.color = '#4a9eff';
    title.style.borderBottom = '2px solid #4a9eff';
    title.style.paddingBottom = '10px';
    this.sidebar.appendChild(title);

    this.createFileUploadSection();
    this.createProcessingSection();
    this.createRenderingSection();
    this.createAnalysisSection();
    this.createViewControls();
  }

  private createFileUploadSection(): void {
    const section = this.createSection('数据加载');

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '.vti,.vtk,.raw,.png,.jpg,.jpeg,.tiff,.tif,.bmp,.dcm,.dicom';
    fileInput.style.display = 'none';
    fileInput.id = 'file-upload';

    const uploadBtn = document.createElement('button');
    uploadBtn.textContent = '选择文件';
    uploadBtn.style.width = '100%';
    uploadBtn.style.padding = '10px';
    uploadBtn.style.backgroundColor = '#4a9eff';
    uploadBtn.style.color = '#fff';
    uploadBtn.style.border = 'none';
    uploadBtn.style.borderRadius = '4px';
    uploadBtn.style.cursor = 'pointer';
    uploadBtn.style.marginBottom = '10px';
    uploadBtn.onclick = () => fileInput.click();

    const synthBtn = document.createElement('button');
    synthBtn.textContent = '生成示例数据';
    synthBtn.style.width = '100%';
    synthBtn.style.padding = '10px';
    synthBtn.style.backgroundColor = '#0f3460';
    synthBtn.style.color = '#fff';
    synthBtn.style.border = '1px solid #4a9eff';
    synthBtn.style.borderRadius = '4px';
    synthBtn.style.cursor = 'pointer';
    synthBtn.onclick = () => this.loadSyntheticData();

    fileInput.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        this.loadFiles(Array.from(files));
      }
    };

    const fileInfo = document.createElement('div');
    fileInfo.id = 'file-info';
    fileInfo.style.fontSize = '12px';
    fileInfo.style.color = '#aaa';
    fileInfo.style.marginTop = '10px';

    section.appendChild(fileInput);
    section.appendChild(uploadBtn);
    section.appendChild(synthBtn);
    section.appendChild(fileInfo);
    this.sidebar.appendChild(section);
  }

  private createProcessingSection(): void {
    const section = this.createSection('裂隙增强参数');

    const sigmaSlider = this.createSlider(
      'sigma', 'Sigma (σ)', 0.5, 5, this.processingParams.sigma, 0.1,
      (value) => { this.processingParams.sigma = value; }
    );

    const thresholdSlider = this.createSlider(
      'threshold', '阈值', 0.001, 0.1, this.processingParams.threshold, 0.001,
      (value) => { this.processingParams.threshold = value; }
    );

    const ratioSlider = this.createSlider(
      'eigenvalueRatio', '特征值比', 0.1, 0.9, this.processingParams.eigenvalueRatio, 0.05,
      (value) => { this.processingParams.eigenvalueRatio = value; }
    );

    const isoSlider = this.createSlider(
      'isoValue', '等值面值', 0.1, 0.8, this.processingParams.isoValue, 0.05,
      (value) => { this.processingParams.isoValue = value; }
    );

    const processBtn = document.createElement('button');
    processBtn.textContent = '执行裂隙增强';
    processBtn.style.width = '100%';
    processBtn.style.padding = '12px';
    processBtn.style.backgroundColor = '#e94560';
    processBtn.style.color = '#fff';
    processBtn.style.border = 'none';
    processBtn.style.borderRadius = '4px';
    processBtn.style.cursor = 'pointer';
    processBtn.style.marginTop = '15px';
    processBtn.style.fontWeight = 'bold';
    processBtn.onclick = () => this.processFractures();

    this.processingStatus = document.createElement('div');
    this.processingStatus.style.marginTop = '10px';
    this.processingStatus.style.fontSize = '12px';
    this.processingStatus.style.color = '#4a9eff';
    this.processingStatus.style.textAlign = 'center';

    this.progressBar = document.createElement('div');
    this.progressBar.style.height = '4px';
    this.progressBar.style.backgroundColor = '#0f3460';
    this.progressBar.style.borderRadius = '2px';
    this.progressBar.style.marginTop = '5px';
    this.progressBar.style.overflow = 'hidden';

    const progressFill = document.createElement('div');
    progressFill.id = 'progress-fill';
    progressFill.style.height = '100%';
    progressFill.style.width = '0%';
    progressFill.style.backgroundColor = '#4a9eff';
    progressFill.style.transition = 'width 0.3s ease';
    this.progressBar.appendChild(progressFill);

    section.appendChild(sigmaSlider);
    section.appendChild(thresholdSlider);
    section.appendChild(ratioSlider);
    section.appendChild(isoSlider);
    section.appendChild(processBtn);
    section.appendChild(this.processingStatus);
    section.appendChild(this.progressBar);
    this.sidebar.appendChild(section);
  }

  private createRenderingSection(): void {
    const section = this.createSection('渲染控制');

    const volumeOpacity = this.createSlider(
      'volumeOpacity', '岩体透明度', 0, 1, 0.8, 0.05,
      (value) => { this.volumeRenderer.setVolumeOpacity(value); }
    );

    const fractureOpacity = this.createSlider(
      'fractureOpacity', '裂隙透明度', 0, 1, 0.9, 0.05,
      (value) => { this.volumeRenderer.setFractureOpacity(value); }
    );

    const volumeCheck = this.createCheckbox('显示岩体', true,
      (checked) => { this.volumeRenderer.setVolumeVisible(checked); }
    );

    const fractureCheck = this.createCheckbox('显示裂隙', true,
      (checked) => { this.volumeRenderer.setFractureVisible(checked); }
    );

    const wireframeCheck = this.createCheckbox('显示边框', true,
      (checked) => { this.volumeRenderer.setWireframeVisible(checked); }
    );

    const extractBtn = document.createElement('button');
    extractBtn.textContent = '提取裂隙面片';
    extractBtn.style.width = '100%';
    extractBtn.style.padding = '10px';
    extractBtn.style.backgroundColor = '#0f3460';
    extractBtn.style.color = '#fff';
    extractBtn.style.border = '1px solid #e94560';
    extractBtn.style.borderRadius = '4px';
    extractBtn.style.cursor = 'pointer';
    extractBtn.style.marginTop = '10px';
    extractBtn.onclick = () => this.extractFractureMesh();

    section.appendChild(volumeOpacity);
    section.appendChild(fractureOpacity);
    section.appendChild(volumeCheck);
    section.appendChild(fractureCheck);
    section.appendChild(wireframeCheck);
    section.appendChild(extractBtn);
    this.sidebar.appendChild(section);
  }

  private createAnalysisSection(): void {
    const section = this.createSection('统计分析');

    const analyzeBtn = document.createElement('button');
    analyzeBtn.textContent = '计算裂隙统计';
    analyzeBtn.style.width = '100%';
    analyzeBtn.style.padding = '10px';
    analyzeBtn.style.backgroundColor = '#0f3460';
    analyzeBtn.style.color = '#fff';
    analyzeBtn.style.border = '1px solid #4a9eff';
    analyzeBtn.style.borderRadius = '4px';
    analyzeBtn.style.cursor = 'pointer';
    analyzeBtn.style.marginBottom = '10px';
    analyzeBtn.onclick = () => this.analyzeFractures();

    const showRoseBtn = document.createElement('button');
    showRoseBtn.textContent = '显示玫瑰花图';
    showRoseBtn.style.width = '100%';
    showRoseBtn.style.padding = '10px';
    showRoseBtn.style.backgroundColor = '#0f3460';
    showRoseBtn.style.color = '#fff';
    showRoseBtn.style.border = '1px solid #4a9eff';
    showRoseBtn.style.borderRadius = '4px';
    showRoseBtn.style.cursor = 'pointer';
    showRoseBtn.onclick = () => this.showRosePlots();

    const exportBtn = document.createElement('button');
    exportBtn.textContent = '导出统计报告';
    exportBtn.style.width = '100%';
    exportBtn.style.padding = '10px';
    exportBtn.style.backgroundColor = '#0f3460';
    exportBtn.style.color = '#fff';
    exportBtn.style.border = '1px solid #4a9eff';
    exportBtn.style.borderRadius = '4px';
    exportBtn.style.cursor = 'pointer';
    exportBtn.style.marginTop = '10px';
    exportBtn.onclick = () => this.exportReport();

    section.appendChild(analyzeBtn);
    section.appendChild(showRoseBtn);
    section.appendChild(exportBtn);
    this.sidebar.appendChild(section);
  }

  private createViewControls(): void {
    const section = this.createSection('视图控制');

    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'grid';
    btnContainer.style.gridTemplateColumns = '1fr 1fr';
    btnContainer.style.gap = '8px';

    const views: { label: string; view: 'front' | 'side' | 'top' | '3d' }[] = [
      { label: '正视图', view: 'front' },
      { label: '侧视图', view: 'side' },
      { label: '顶视图', view: 'top' },
      { label: '3D视图', view: '3d' }
    ];

    views.forEach(({ label, view }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.padding = '8px';
      btn.style.backgroundColor = '#0f3460';
      btn.style.color = '#fff';
      btn.style.border = '1px solid #4a9eff';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.onclick = () => this.volumeRenderer.setView(view);
      btnContainer.appendChild(btn);
    });

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '重置相机';
    resetBtn.style.width = '100%';
    resetBtn.style.padding = '8px';
    resetBtn.style.backgroundColor = '#0f3460';
    resetBtn.style.color = '#fff';
    resetBtn.style.border = '1px solid #4a9eff';
    resetBtn.style.borderRadius = '4px';
    resetBtn.style.cursor = 'pointer';
    resetBtn.style.marginTop = '10px';
    resetBtn.onclick = () => this.volumeRenderer.resetCamera();

    section.appendChild(btnContainer);
    section.appendChild(resetBtn);
    this.sidebar.appendChild(section);
  }

  private createSection(title: string): HTMLElement {
    const section = document.createElement('div');
    section.style.marginBottom = '25px';

    const h3 = document.createElement('h3');
    h3.textContent = title;
    h3.style.color = '#4a9eff';
    h3.style.fontSize = '14px';
    h3.style.marginBottom = '12px';
    h3.style.marginTop = '0';
    section.appendChild(h3);

    return section;
  }

  private createSlider(
    id: string,
    label: string,
    min: number,
    max: number,
    value: number,
    step: number,
    onChange: (value: number) => void
  ): HTMLElement {
    const container = document.createElement('div');
    container.style.marginBottom = '12px';

    const labelDiv = document.createElement('div');
    labelDiv.style.display = 'flex';
    labelDiv.style.justifyContent = 'space-between';
    labelDiv.style.fontSize = '12px';
    labelDiv.style.marginBottom = '5px';

    const labelText = document.createElement('span');
    labelText.textContent = label;

    const valueText = document.createElement('span');
    valueText.id = `${id}-value`;
    valueText.textContent = value.toFixed(2);
    valueText.style.color = '#4a9eff';
    valueText.style.fontWeight = 'bold';

    labelDiv.appendChild(labelText);
    labelDiv.appendChild(valueText);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = id;
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = value.toString();
    slider.style.width = '100%';
    slider.style.cursor = 'pointer';

    slider.oninput = (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      valueText.textContent = val.toFixed(2);
      onChange(val);
    };

    container.appendChild(labelDiv);
    container.appendChild(slider);

    return container;
  }

  private createCheckbox(
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void
  ): HTMLElement {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.marginBottom = '8px';
    container.style.fontSize = '13px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.style.marginRight = '8px';
    checkbox.style.cursor = 'pointer';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    labelSpan.style.cursor = 'pointer';

    checkbox.onchange = (e) => {
      onChange((e.target as HTMLInputElement).checked);
    };

    labelSpan.onclick = () => {
      checkbox.checked = !checkbox.checked;
      onChange(checkbox.checked);
    };

    container.appendChild(checkbox);
    container.appendChild(labelSpan);

    return container;
  }

  private async loadFiles(files: File[]): Promise<void> {
    this.showProcessing('正在加载数据...');
    this.setProgress(10);

    try {
      this.volumeData = await this.volumeLoader.loadFromFiles(files);
      this.setProgress(100);
      this.updateFileInfo();
      this.volumeRenderer.setVolumeData(this.volumeData);
      this.hideProcessing();
    } catch (error) {
      this.showProcessing(`加载失败: ${(error as Error).message}`, true);
    }
  }

  private async loadSyntheticData(): Promise<void> {
    this.showProcessing('正在生成示例数据...');
    this.setProgress(30);

    setTimeout(() => {
      this.volumeData = this.volumeLoader.createSyntheticFractureData();
      this.setProgress(100);
      this.updateFileInfo();
      this.volumeRenderer.setVolumeData(this.volumeData!);
      this.hideProcessing();
    }, 500);
  }

  private updateFileInfo(): void {
    if (!this.volumeData) return;

    const fileInfo = document.getElementById('file-info');
    if (fileInfo) {
      const { dimensions, spacing, scalarRange } = this.volumeData;
      fileInfo.innerHTML = `
        <div style="margin-bottom: 5px;"><strong>数据尺寸:</strong> ${dimensions.x} × ${dimensions.y} × ${dimensions.z}</div>
        <div style="margin-bottom: 5px;"><strong>体素间距:</strong> ${spacing.x.toFixed(2)} × ${spacing.y.toFixed(2)} × ${spacing.z.toFixed(2)}</div>
        <div><strong>值范围:</strong> [${scalarRange[0].toFixed(1)}, ${scalarRange[1].toFixed(1)}]</div>
      `;
    }
  }

  private async processFractures(): Promise<void> {
    if (!this.volumeData) {
      alert('请先加载数据');
      return;
    }

    this.showProcessing('正在计算Hessian矩阵...');
    this.setProgress(20);

    setTimeout(() => {
      this.setProgress(40);
      this.showProcessing('正在计算特征值...');

      setTimeout(() => {
        this.setProgress(60);
        this.showProcessing('正在增强裂隙响应...');

        const result = this.hessianFilter.enhanceFractures(this.volumeData!, this.processingParams);

        this.setProgress(80);
        this.showProcessing('正在提取岩体表面...');

        const mcVolume = new MarchingCubes(this.volumeData!, 100);
        const volumeMesh = mcVolume.extractSurface();
        this.volumeRenderer.createVolumeMesh(volumeMesh);

        this.setProgress(90);
        this.showProcessing('正在计算裂隙法线...');

        const hessian = this.hessianFilter.computeHessian(
          this.volumeData!.scalarData as Float32Array,
          this.volumeData!.dimensions,
          this.processingParams.sigma
        );

        const { normals, fractureMask } = this.hessianFilter.computeFractureNormals(
          this.volumeData!,
          result.eigenvalues,
          hessian
        );

        this.setProgress(100);
        this.showProcessing('裂隙增强完成!');

        setTimeout(() => {
          this.hideProcessing();
        }, 1000);

        (window as any).processingResult = result;
        (window as any).fractureNormals = normals;
        (window as any).fractureMask = fractureMask;

      }, 300);
    }, 300);
  }

  private async extractFractureMesh(): Promise<void> {
    if (!this.volumeData) {
      alert('请先加载并处理数据');
      return;
    }

    const processingResult = (window as any).processingResult;
    const fractureMask = (window as any).fractureMask;
    const fractureNormals = (window as any).fractureNormals;

    if (!processingResult || !fractureMask || !fractureNormals) {
      alert('请先执行裂隙增强');
      return;
    }

    this.showProcessing('正在提取裂隙面片...');
    this.setProgress(50);

    setTimeout(() => {
      const mcFracture = new MarchingCubes(this.volumeData!, this.processingParams.isoValue);
      const fractureMesh = mcFracture.extractFractureSurface(
        fractureMask,
        fractureNormals,
        processingResult.responseVolume
      );

      this.volumeRenderer.createFractureMesh(fractureMesh);

      this.setProgress(100);
      this.showProcessing(`提取完成! 共 ${fractureMesh.positions.length / 3} 个顶点, ${fractureMesh.indices.length / 3} 个三角形`);

      (window as any).fractureMeshData = fractureMesh;

      setTimeout(() => {
        this.hideProcessing();
      }, 1500);
    }, 200);
  }

  private async analyzeFractures(): Promise<void> {
    const fractureMeshData = (window as any).fractureMeshData;
    const fractureMask = (window as any).fractureMask;
    const fractureNormals = (window as any).fractureNormals;

    if (!fractureMask || !fractureNormals) {
      alert('请先执行裂隙增强');
      return;
    }

    this.showProcessing('正在计算统计数据...');
    this.setProgress(50);

    setTimeout(() => {
      if (fractureMeshData) {
        this.fractureStats = this.fractureAnalyzer.computeStatisticsFromMesh(fractureMeshData);
      } else if (this.volumeData && fractureMask && fractureNormals) {
        this.fractureStats = this.fractureAnalyzer.computeFractureDensity(
          this.volumeData,
          fractureMask,
          fractureNormals
        );
      }

      this.setProgress(100);
      this.updateStatsPanel();
      this.statsPanel.style.display = 'block';
      this.showProcessing('统计计算完成!');

      setTimeout(() => {
        this.hideProcessing();
      }, 1000);
    }, 300);
  }

  private updateStatsPanel(): void {
    if (!this.fractureStats) return;

    this.statsPanel.innerHTML = `
      <h3 style="margin-top: 0; color: #4a9eff; border-bottom: 1px solid #4a9eff; padding-bottom: 8px;">裂隙统计结果</h3>
      <div style="font-size: 13px; line-height: 1.8;">
        <div style="display: flex; justify-content: space-between;">
          <span>裂隙密度:</span>
          <span style="color: #e94560; font-weight: bold;">${(this.fractureStats.density * 100).toFixed(4)}%</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>裂隙总面积:</span>
          <span style="color: #4a9eff;">${this.fractureStats.totalArea.toFixed(2)} 像素²</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>岩体总体积:</span>
          <span>${this.fractureStats.totalVolume.toFixed(2)} 像素³</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>裂隙面片数:</span>
          <span>${this.fractureStats.fractureCount}</span>
        </div>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #333;">
          <div style="display: flex; justify-content: space-between;">
            <span>优势走向:</span>
            <span style="color: #4a9eff; font-weight: bold;">
              ${this.findDominantDirection().toFixed(1)}°
            </span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>优势倾角:</span>
            <span style="color: #4a9eff; font-weight: bold;">
              ${this.findDominantDip().toFixed(1)}°
            </span>
          </div>
        </div>
      </div>
    `;
  }

  private findDominantDirection(): number {
    if (!this.fractureStats) return 0;
    const { orientationHistogram } = this.fractureStats;
    let maxCount = 0;
    let maxIdx = 0;

    for (let i = 0; i < orientationHistogram.dipDirection.length; i++) {
      let sum = 0;
      for (let j = 0; j < orientationHistogram.dip.length; j++) {
        sum += orientationHistogram.counts[j][i];
      }
      if (sum > maxCount) {
        maxCount = sum;
        maxIdx = i;
      }
    }

    return orientationHistogram.dipDirection[maxIdx];
  }

  private findDominantDip(): number {
    if (!this.fractureStats) return 0;
    const { orientationHistogram } = this.fractureStats;
    let maxCount = 0;
    let maxIdx = 0;

    for (let i = 0; i < orientationHistogram.dip.length; i++) {
      let sum = 0;
      for (let j = 0; j < orientationHistogram.dipDirection.length; j++) {
        sum += orientationHistogram.counts[i][j];
      }
      if (sum > maxCount) {
        maxCount = sum;
        maxIdx = i;
      }
    }

    return orientationHistogram.dip[maxIdx];
  }

  private showRosePlots(): void {
    if (!this.fractureStats) {
      alert('请先执行统计分析');
      return;
    }

    this.rosePlotContainer.style.display = 'block';
    this.rosePlotContainer.innerHTML = '';

    const title = document.createElement('h4');
    title.textContent = '裂隙方向玫瑰花图';
    title.style.marginTop = '0';
    title.style.marginBottom = '10px';
    title.style.color = '#4a9eff';
    this.rosePlotContainer.appendChild(title);

    const plotContainer = document.createElement('div');
    plotContainer.style.display = 'flex';
    plotContainer.style.gap = '15px';

    const strikeCanvas = document.createElement('canvas');
    strikeCanvas.width = 200;
    strikeCanvas.height = 200;
    this.fractureAnalyzer.drawRosePlot(strikeCanvas, this.fractureStats, 'strike');

    const dipCanvas = document.createElement('canvas');
    dipCanvas.width = 200;
    dipCanvas.height = 200;
    this.fractureAnalyzer.drawRosePlot(dipCanvas, this.fractureStats, 'dip');

    plotContainer.appendChild(strikeCanvas);
    plotContainer.appendChild(dipCanvas);
    this.rosePlotContainer.appendChild(plotContainer);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.style.width = '100%';
    closeBtn.style.padding = '8px';
    closeBtn.style.marginTop = '10px';
    closeBtn.style.backgroundColor = '#0f3460';
    closeBtn.style.color = '#fff';
    closeBtn.style.border = '1px solid #4a9eff';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => {
      this.rosePlotContainer.style.display = 'none';
    };
    this.rosePlotContainer.appendChild(closeBtn);
  }

  private exportReport(): void {
    if (!this.fractureStats) {
      alert('请先执行统计分析');
      return;
    }

    const report = this.fractureAnalyzer.generateStatisticsReport(this.fractureStats);
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fracture-analysis-report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private showProcessing(message: string, isError: boolean = false): void {
    this.processingStatus.textContent = message;
    this.processingStatus.style.color = isError ? '#e94560' : '#4a9eff';
    this.processingStatus.style.display = 'block';
  }

  private hideProcessing(): void {
    this.processingStatus.style.display = 'none';
    this.setProgress(0);
  }

  private setProgress(percent: number): void {
    const fill = document.getElementById('progress-fill');
    if (fill) {
      fill.style.width = `${percent}%`;
    }
  }

  dispose(): void {
    this.volumeRenderer.dispose();
  }
}
