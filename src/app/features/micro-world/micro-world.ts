import { Component, ElementRef, OnInit, AfterViewInit, ViewChild, inject, PLATFORM_ID, OnDestroy, HostListener, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {
  Scene, OrthographicCamera, WebGLRenderer,
  SpotLight, AmbientLight, DirectionalLight,
  CanvasTexture, MeshStandardMaterial, MeshBasicMaterial,
  BoxGeometry, CylinderGeometry, SphereGeometry, PlaneGeometry, CapsuleGeometry,
  Mesh, Group, PCFSoftShadowMap
} from 'three';

@Component({
  selector: 'app-micro-world',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './micro-world.html',
  styleUrls: ['./micro-world.scss']
})
export class MicroWorldComponent implements OnInit, AfterViewInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('canvasWrapper', { static: false }) canvasWrapper!: ElementRef;

  webglSupported = signal<boolean>(true);

  private scene!: Scene;
  private camera!: OrthographicCamera;
  private renderer!: WebGLRenderer;
  private techSpotlight!: SpotLight;
  private codeTexture!: CanvasTexture;
  private codeCanvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;

  tech: string = '';
  private animationId?: number;
  private ZOOM_FAR = 0.02;
  private ZOOM_NEAR = 1.0;
  private targetZoom = 1.0;
  private currentZoom = 0.02;

  private codeSnippets = [
    "import { Component } from '@angular/core';", "const data = await api.get('/skills');",
    "if(status === 'deploying') { start(data); }", "function init() { return new Observable(); }",
    "npm install @ionic/core", "JAVA_HOME=/usr/bin/java-17-oracle", "class PortfolioReactor { build() { } }"
  ];
  private charIndex = 0;
  private linesOnScreen: Array<{text: string, color: string}> = [];
  private MAX_LINES = 10;
  private LINE_HEIGHT = 18;
  private currentSnippet = "";
  private isBsod = false;
  private bsodTimer = 0;
  private currentThemeAccent = '#38bdf8';
  private editorBg = '#0f172a';

  private readonly THEME_WORLD: Record<string, { rugHex: number, floorHex: number, wallHex: number, editorBg: string }> = {
    'default':   { rugHex: 0x38bdf8, floorHex: 0x1e293b, wallHex: 0x0f172a, editorBg: '#0f172a' },
    'suzuka':    { rugHex: 0x00B388, floorHex: 0xcce8e0, wallHex: 0xd4ede6, editorBg: '#0a2018' },
    'vega':      { rugHex: 0x4E54C8, floorHex: 0x111828, wallHex: 0x0a1020, editorBg: '#0a0b1e' },
    'manhattan': { rugHex: 0xFBBF24, floorHex: 0x231917, wallHex: 0x1a1210, editorBg: '#120e0a' },
  };

  private techThemes: Record<string, { light: number, accent: string }> = {
    'Angular':    { light: 0xef4444, accent: '#ef4444' },
    'Node.js':    { light: 0x22c55e, accent: '#22c55e' },
    'Java':       { light: 0xf59e0b, accent: '#f59e0b' },
    'Ionic':      { light: 0x38bdf8, accent: '#38bdf8' },
    'Capacitor':  { light: 0x3178c6, accent: '#3178c6' },
    'TypeScript': { light: 0x007acc, accent: '#007acc' },
    'Electron':   { light: 0x47849e, accent: '#47849e' },
    'HTML/CSS':   { light: 0xe34f26, accent: '#e34f26' },
    'Kotlin':     { light: 0x7f52ff, accent: '#7f52ff' },
    'MySQL':      { light: 0x00758f, accent: '#00758f' },
    'Docker':     { light: 0x2496ed, accent: '#2496ed' },
    'Traefik':    { light: 0x24a1c1, accent: '#24a1c1' },
    'Linux':      { light: 0xffcc33, accent: '#ffcc33' },
    'Git':        { light: 0xf05032, accent: '#f05032' }
  };

  private rightHandGroup?: Group;

  private readonly visibilityHandler = () => {
    if (document.hidden) {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = undefined;
      }
    } else if (this.webglSupported()) {
      this.animate();
    }
  };

  ngOnInit() {
    this.tech = this.route.snapshot.paramMap.get('tech') || 'Angular';
    const techTheme = this.techThemes[this.tech] ?? { light: 0xffffff, accent: '#38bdf8' };
    this.currentThemeAccent = techTheme.accent;

    if (isPlatformBrowser(this.platformId)) {
      const savedTheme = localStorage.getItem('theme') || 'default';
      document.documentElement.setAttribute('data-theme', savedTheme);
      this.editorBg = (this.THEME_WORLD[savedTheme] ?? this.THEME_WORLD['default']).editorBg;

      if (!this.isWebGLSupported()) this.webglSupported.set(false);
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId) && this.webglSupported()) {
      document.addEventListener('visibilitychange', this.visibilityHandler);
      this.init3D();
    }
  }

  ngOnDestroy() {
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (!this.camera || !this.renderer) return;
    const aspect = window.innerWidth / window.innerHeight;
    const d = 8.5;
    this.camera.left = -d * aspect;
    this.camera.right = d * aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private isWebGLSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
      return false;
    }
  }

  private init3D() {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    this.scene = new Scene();
    const aspect = window.innerWidth / window.innerHeight;
    const d = 8.5;
    this.camera = new OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);
    this.camera.position.set(15, 15, 15);
    this.camera.lookAt(0, -1, 0);
    this.camera.zoom = this.currentZoom;
    this.camera.updateProjectionMatrix();

    this.renderer = new WebGLRenderer({ antialias: !isMobile, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !isMobile;
    if (!isMobile) this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.canvasWrapper.nativeElement.appendChild(this.renderer.domElement);

    this.scene.add(new AmbientLight(0xffffff, 0.4));
    const generalLight = new DirectionalLight(0xffffff, 0.5);
    generalLight.position.set(10, 20, 15);
    generalLight.castShadow = !isMobile;
    if (!isMobile) {
      generalLight.shadow.mapSize.width = 1024;
      generalLight.shadow.mapSize.height = 1024;
    }
    this.scene.add(generalLight);

    this.techSpotlight = new SpotLight(0xffffff, 30);
    this.techSpotlight.position.set(0, 12, 0);
    this.techSpotlight.angle = Math.PI / 4;
    this.techSpotlight.penumbra = 0.6;
    this.techSpotlight.decay = 1.5;
    this.techSpotlight.distance = 40;
    this.techSpotlight.castShadow = !isMobile;
    this.scene.add(this.techSpotlight);
    this.scene.add(this.techSpotlight.target);

    const theme = this.techThemes[this.tech] ?? { light: 0xffffff, accent: '#38bdf8' };
    this.techSpotlight.color.setHex(theme.light);

    this.buildRoom();

    this.ctx.fillStyle = this.editorBg;
    this.ctx.fillRect(0, 0, 256, 256);
    this.currentSnippet = this.codeSnippets[0];
    this.codeTexture.needsUpdate = true;

    this.animate();
  }

  private buildRoom() {
    const savedTheme = localStorage.getItem('theme') || 'default';
    const wt = this.THEME_WORLD[savedTheme] ?? this.THEME_WORLD['default'];

    const matSkin    = new MeshStandardMaterial({ color: 0xffe0bd });
    const clothesMat = new MeshStandardMaterial({ color: 0x334155 });
    const matDesk    = new MeshStandardMaterial({ color: 0x475569 });
    const matLaptop  = new MeshStandardMaterial({ color: 0x94a3b8 });
    const matFloor   = new MeshStandardMaterial({ color: wt.floorHex });
    const matWall    = new MeshStandardMaterial({ color: wt.wallHex });
    const matHair    = new MeshStandardMaterial({ color: 0x3d2314, flatShading: true });

    const roomGroup = new Group();
    this.scene.add(roomGroup);

    const floor = new Mesh(new BoxGeometry(16, 0.5, 16), matFloor);
    floor.position.set(0, -4, 0); floor.receiveShadow = true; roomGroup.add(floor);

    const wallLeft = new Mesh(new BoxGeometry(16, 12, 0.5), matWall);
    wallLeft.position.set(0, 2, -8); wallLeft.receiveShadow = true; roomGroup.add(wallLeft);

    const wallRight = new Mesh(new BoxGeometry(0.5, 12, 16), matWall);
    wallRight.position.set(-8, 2, 0); wallRight.receiveShadow = true; roomGroup.add(wallRight);

    const rug = new Mesh(new PlaneGeometry(7, 6), new MeshStandardMaterial({ color: wt.rugHex }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, -3.74, 0); rug.receiveShadow = true; roomGroup.add(rug);

    const binGroup = new Group();
    binGroup.position.set(-6.5, -3.75, -6.5); roomGroup.add(binGroup);
    const binBody = new Mesh(new CylinderGeometry(0.5, 0.4, 0.8, 16), new MeshStandardMaterial({ color: 0x555555 }));
    binBody.position.y = 0.4; binBody.castShadow = true; binGroup.add(binBody);
    const crumpledPaper = new Mesh(new BoxGeometry(0.2, 0.2, 0.2), new MeshStandardMaterial({ color: 0xffffff }));
    crumpledPaper.position.set(0.1, 0.75, 0.1); crumpledPaper.rotation.set(0.4, 0.4, 0.4); binGroup.add(crumpledPaper);

    const deskGroup = new Group(); roomGroup.add(deskGroup);
    const deskTop = new Mesh(new BoxGeometry(8, 0.4, 3), matDesk);
    deskTop.position.y = -0.2; deskTop.castShadow = true; deskTop.receiveShadow = true; deskGroup.add(deskTop);

    const legGeo = new CylinderGeometry(0.15, 0.15, 3.8, 16);
    const legPositions: [number, number, number][] = [[-3.5, -2.1, -1], [3.5, -2.1, -1], [-3.5, -2.1, 1], [3.5, -2.1, 1]];
    legPositions.forEach(pos => {
      const leg = new Mesh(legGeo, matDesk);
      leg.position.set(...pos); leg.castShadow = true; deskGroup.add(leg);
    });

    const laptopBase = new Mesh(new BoxGeometry(2.5, 0.1, 1.8), matLaptop);
    laptopBase.position.set(0, 0.05, 0.5); laptopBase.castShadow = true; deskGroup.add(laptopBase);

    const screenFrame = new Mesh(new BoxGeometry(2.5, 1.6, 0.1), matLaptop);
    screenFrame.position.set(0, 0.85, -0.4); screenFrame.rotation.x = -0.15; deskGroup.add(screenFrame);

    this.codeCanvas = document.createElement('canvas');
    this.codeCanvas.width = 256; this.codeCanvas.height = 256;
    this.ctx = this.codeCanvas.getContext('2d')!;
    this.codeTexture = new CanvasTexture(this.codeCanvas);
    const screenMesh = new Mesh(new PlaneGeometry(2.3, 1.4), new MeshBasicMaterial({ map: this.codeTexture }));
    screenMesh.position.set(0, 0.85, -0.34); screenMesh.rotation.x = -0.15; deskGroup.add(screenMesh);

    const officeChair = new Group(); officeChair.position.set(0, -3.8, 2.0); roomGroup.add(officeChair);
    const starBase = new Group(); starBase.position.y = 0.2; officeChair.add(starBase);
    for (let i = 0; i < 5; i++) {
      const spokeGroup = new Group(); spokeGroup.rotation.y = (Math.PI * 2 / 5) * i; starBase.add(spokeGroup);
      const spoke = new Mesh(new CylinderGeometry(0.08, 0.08, 1.2), clothesMat); spoke.rotation.x = Math.PI / 2; spoke.position.z = 0.6; spokeGroup.add(spoke);
      const wheel = new Mesh(new SphereGeometry(0.15, 8, 8), matWall); wheel.position.set(0, -0.15, 1.15); spokeGroup.add(wheel);
    }
    const piston = new Mesh(new CylinderGeometry(0.12, 0.12, 1.4), matDesk); piston.position.y = 1.0; officeChair.add(piston);
    const seat = new Mesh(new BoxGeometry(1.6, 0.3, 1.6), clothesMat); seat.position.y = 1.8; seat.castShadow = true; officeChair.add(seat);
    const backrest = new Mesh(new BoxGeometry(1.5, 1.4, 0.3), clothesMat); backrest.position.set(0, 2.6, 0.7); backrest.castShadow = true; officeChair.add(backrest);

    const char = new Group(); char.scale.set(0.9, 0.9, 0.9); char.position.set(0, -1.2, 1.9); roomGroup.add(char);
    const charBody = new Mesh(new CapsuleGeometry(1, 1, 16, 16), clothesMat); charBody.position.y = 1; charBody.castShadow = true; char.add(charBody);
    const head = new Mesh(new SphereGeometry(1.0, 32, 32), matSkin); head.position.y = 2.8; head.castShadow = true; char.add(head);

    const hairGroup = new Group(); hairGroup.position.set(0, 2.8, 0); char.add(hairGroup);
    const topHair = new Mesh(new BoxGeometry(2.1, 0.6, 2.1), matHair); topHair.position.y = 0.8; hairGroup.add(topHair);
    const backHair = new Mesh(new BoxGeometry(2.1, 1.4, 0.6), matHair); backHair.position.set(0, 0.1, 0.8); hairGroup.add(backHair);

    this.rightHandGroup = new Group(); this.rightHandGroup.position.set(1.1, 1.6, 0); char.add(this.rightHandGroup);
    const rArm = new Mesh(new CapsuleGeometry(0.25, 1.2, 8, 8), clothesMat); rArm.position.y = 0.6; this.rightHandGroup.add(rArm);
    const rHand = new Mesh(new SphereGeometry(0.35), matSkin); rHand.position.set(0, 1.4, 0); rHand.castShadow = true; this.rightHandGroup.add(rHand);
  }

  private triggerKeystroke() {
    if (this.isBsod) {
      this.bsodTimer--;
      if (this.bsodTimer <= 0) {
        this.isBsod = false; this.charIndex = 0; this.linesOnScreen = [];
        this.ctx.fillStyle = this.editorBg; this.ctx.fillRect(0, 0, 256, 256);
      }
      return;
    }

    if (Math.random() < 0.033) {
      this.isBsod = true; this.bsodTimer = 40;
      this.ctx.fillStyle = '#0000aa'; this.ctx.fillRect(0, 0, 256, 256);
      this.ctx.fillStyle = '#ffffff'; this.ctx.font = 'bold 16px monospace';
      this.ctx.fillText("ERROR 500", 80, 50);
      this.ctx.font = '12px monospace'; this.ctx.fillText("A fatal exception has occurred.", 10, 100);
      this.ctx.fillText("Press any key to panic.", 10, 140);
      this.codeTexture.needsUpdate = true; return;
    }

    this.ctx.fillStyle = '#0f172a'; this.ctx.fillRect(0, 0, 256, 256);
    this.linesOnScreen.forEach((l, i) => {
      this.ctx.fillStyle = l.color;
      this.ctx.font = '14px monospace';
      this.ctx.fillText(l.text, 10, 20 + (i * this.LINE_HEIGHT));
    });

    const activeLineY = 20 + (this.linesOnScreen.length * this.LINE_HEIGHT);

    if (activeLineY < 230) {
      this.ctx.fillStyle = this.currentThemeAccent;
      this.ctx.font = '14px monospace';
      this.ctx.fillText(this.currentSnippet.substring(0, this.charIndex) + '_', 10, activeLineY);
      this.charIndex += 2;
      if (this.charIndex >= this.currentSnippet.length) {
        const draculaColors = ['#ec4899', '#22c55e', '#38bdf8'];
        this.linesOnScreen.push({ text: this.currentSnippet, color: draculaColors[this.linesOnScreen.length % 3] });
        if (this.linesOnScreen.length > this.MAX_LINES) this.linesOnScreen.shift();
        this.charIndex = 0;
        this.currentSnippet = this.codeSnippets[Math.floor(Math.random() * this.codeSnippets.length)];
      }
      this.codeTexture.needsUpdate = true;
    }
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    const t = Date.now() * 0.001;

    if (Math.abs(this.camera.zoom - this.targetZoom) > 0.001) {
      this.camera.zoom += (this.targetZoom - this.camera.zoom) * 0.05;
      this.camera.updateProjectionMatrix();
    }

    const rightOscillation = Math.cos(t * 30);
    if (this.rightHandGroup) {
      this.rightHandGroup.rotation.x = -1.5 + rightOscillation * 0.08;
      this.rightHandGroup.rotation.z = 0.15;
    }
    if (rightOscillation > 0.95) this.triggerKeystroke();

    this.renderer.render(this.scene, this.camera);
  }

  goBack() {
    this.targetZoom = this.ZOOM_FAR;
    setTimeout(() => {
      this.router.navigate(['/dashboard']);
    }, 450);
  }
}
