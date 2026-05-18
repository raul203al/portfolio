import { Component, ElementRef, OnInit, ViewChild, inject, PLATFORM_ID, OnDestroy, AfterViewInit, signal, Renderer2 } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AppStateService } from '../../core/services/app-state.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { gsap } from 'gsap';

interface IdeTask {
  id: string;
  ext: 'ts' | 'sql' | 'java' | 'kt' | 'html';
  file: string;
  code: string;
}

interface BgParticle {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  alpha: number; alphaV: number;
  warm: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  private router = inject(Router);
  private appState = inject(AppStateService);
  private platformId = inject(PLATFORM_ID);
  private renderer = inject(Renderer2);
  private translate = inject(TranslateService);

  @ViewChild('connectionCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  frontendTech = [
    { name: 'Angular', icon: 'devicon-angularjs-plain' },
    { name: 'TypeScript', icon: 'devicon-typescript-plain' },
    { name: 'JavaScript', icon: 'devicon-javascript-plain' },
    { name: 'HTML', icon: 'devicon-html5-plain' },
    { name: 'CSS', icon: 'devicon-css3-plain' },
    { name: 'Ionic', icon: 'devicon-ionic-original' },
    { name: 'Capacitor', icon: 'devicon-capacitor-plain' },
    { name: 'Electron', icon: 'devicon-electron-original' },
  ];

  backendTech = [
    { name: 'Node.js', icon: 'devicon-nodejs-plain' },
    { name: 'Java', icon: 'devicon-java-plain' },
    { name: 'Kotlin', icon: 'devicon-kotlin-plain' },
    { name: 'MySQL', icon: 'devicon-mysql-plain' }
  ];

  devopsTech = [
    { name: 'Docker', icon: 'devicon-docker-plain' },
    { name: 'Traefik', icon: 'icon-desktop' },
    { name: 'Linux', icon: 'devicon-linux-plain' },
    { name: 'Git', icon: 'devicon-git-plain' }
  ];

  isIntroFinished = signal<boolean>(false);
  isZoomedOut = signal<boolean>(false);
  revealedCards = signal<Record<string, boolean>>({});
  virtualizedCards = signal<Record<string, boolean>>({});
  currentTheme = signal<string>('default');
  currentLang = signal<string>('es');
  isReturningVisit = false;

  private animationId?: number;

  private readonly IDE_TASKS: IdeTask[] = [
    {
      id: "connection-canvas", ext: "ts", file: "canvas-renderer.ts",
      code: "class BgRenderer {\n  particles = 110;\n  cables = 4;\n  render(ctx: Ctx) {\n    this.drawDust(ctx);\n    this.drawCables(ctx);\n  }\n}"
    },
    { id: "card-1", ext: "ts",   file: "identity.ts",        code: "export const user = {\n  name: 'José Raúl',\n  role: 'Developer'\n};" },
    { id: "card-2", ext: "java", file: "experienceBean.java", code: "public class ExperienceBean {\n  List<String> getAll() { }\n}" },
    { id: "card-3", ext: "sql",  file: "stack.sql",           code: "SELECT * FROM stack\nWHERE experience = 'Expert';" },
    { id: "card-4", ext: "html", file: "projects.html",       code: "<div class=\"projects\">\n  <h1>GIS & SaaS Platform</h1>\n</div>" },
    {
      id: "danger-zone-el", ext: "java", file: "DangerCtrl.java",
      code: "@Component\npublic class DangerCtrl {\n  @OnClick\n  void activate() {\n    screen.crack();\n    gravity.off();\n    doors.close();\n  }\n}"
    },
  ];

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('theme');
      if (saved) this.setTheme(saved);

      const savedLang = localStorage.getItem('lang');
      const browserLang = navigator.language?.slice(0, 2) ?? 'es';
      const lang = savedLang ?? (browserLang === 'en' ? 'en' : 'es');
      this.translate.use(lang);
      this.currentLang.set(lang);

      if (this.appState.hasIntroPlayed()) {
        this.isReturningVisit = true;
        this.isIntroFinished.set(true);
        const allRevealed: Record<string, boolean> = {};
        this.IDE_TASKS.forEach(t => allRevealed[t.id] = true);
        this.revealedCards.set(allRevealed);
        setTimeout(() => this.initKintsugi(), 100);
      }
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId) && !this.appState.hasIntroPlayed()) {
      setTimeout(() => this.runSequence(), 600);
    }
  }

  ngOnDestroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.spinStates.forEach(s => {
      if (s.rampId) clearInterval(s.rampId);
      if (s.particleId) clearInterval(s.particleId);
      if (s.rippleId) clearInterval(s.rippleId);
      s.decelTween?.kill();
      s.tl.kill();
    });
  }

  private async runSequence() {
    const tasks = this.IDE_TASKS;

    // Tarea 0 — bg-canvas: vuela al canvas completo y activa el fondo
    await this.deployWindow(tasks[0]);
    setTimeout(() => this.initKintsugi(), 150);

    // Tareas 1-4 — cards intermedias
    for (let i = 1; i < tasks.length - 1; i++) {
      await this.deployWindow(tasks[i]);
    }

    // Última tarea — DangerCtrl: vuela al botón y lo revela
    await this.deployWindow(tasks[tasks.length - 1]);

    this.appState.setIntroPlayed(true);
    setTimeout(() => this.isIntroFinished.set(true), 300);
  }

  private deployWindow(task: IdeTask, flyEase = 'expo.inOut'): Promise<void> {
    return new Promise((resolve) => {
      const win = this.renderer.createElement('div');
      this.renderer.addClass(win, 'ide-window');
      this.renderer.addClass(win, `type-${task.ext}`);

      win.innerHTML = `
        <div class="ide-header">
          <div style="display:flex; gap: 4px;"><div class="ide-dot"></div><div class="ide-dot"></div><div class="ide-dot"></div></div>
          <span style="margin-left:8px; text-transform: uppercase;">${task.file}</span>
        </div>
        <div class="ide-body" id="code-${task.id}"></div>
      `;

      this.renderer.setStyle(win, 'opacity', '0');
      this.renderer.setStyle(win, 'transform', 'translateY(20px)');

      const posX = 50 + Math.random() * (window.innerWidth - 400);
      const posY = 100 + Math.random() * (window.innerHeight - 250);
      this.renderer.setStyle(win, 'left', `${posX}px`);
      this.renderer.setStyle(win, 'top', `${posY}px`);

      this.renderer.appendChild(document.body, win);

      gsap.to(win, { opacity: 1, y: 0, scale: 1, duration: 0.4 });

      let charIdx = 0;
      const codeElement = document.getElementById(`code-${task.id}`);

      const typing = setInterval(() => {
        if (codeElement) {
          codeElement.textContent += task.code.charAt(charIdx);
          charIdx++;
        }

        if (charIdx >= task.code.length) {
          clearInterval(typing);
          setTimeout(() => {
            const target = document.getElementById(task.id);
            if (!target) {
              this.renderer.removeChild(document.body, win);
              resolve();
              return;
            }

            const dest = target.getBoundingClientRect();

            gsap.to(win, {
              duration: 1,
              left: dest.left + window.scrollX,
              top: dest.top + window.scrollY,
              width: dest.width,
              height: dest.height,
              ease: flyEase,
              onComplete: () => {
                this.renderer.removeChild(document.body, win);

                const revealed = { ...this.revealedCards() };
                revealed[task.id] = true;
                this.revealedCards.set(revealed);

                const virtualized = { ...this.virtualizedCards() };
                virtualized[task.id] = true;
                this.virtualizedCards.set(virtualized);

                resolve();
              }
            });
          }, 500);
        }
      }, 15);
    });
  }

  private pulseT    = 0;
  private bgParticles: BgParticle[] = [];

  private readonly CABLE_PAIRS: Array<[string, string, number]> = [
    ['card-1', 'card-3', 0.00],
    ['card-1', 'card-2', 0.25],
    ['card-3', 'card-2', 0.50],
    ['card-2', 'card-4', 0.75],
  ];

  private initKintsugi() {
    if (this.animationId) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = document.documentElement.scrollWidth;
      canvas.height = document.documentElement.scrollHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Spawn partículas una sola vez
    if (this.bgParticles.length === 0) {
      for (let i = 0; i < 110; i++) {
        this.bgParticles.push({
          x:      Math.random() * window.innerWidth,
          y:      Math.random() * window.innerHeight,
          vx:     (Math.random() - 0.5) * 0.38,
          vy:     (Math.random() - 0.5) * 0.38,
          r:      0.5 + Math.random() * 2.2,
          alpha:  Math.random() * 0.55 + 0.08,
          alphaV: (0.003 + Math.random() * 0.005) * (Math.random() > 0.5 ? 1 : -1),
          warm:   Math.random() > 0.65
        });
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (window.innerWidth < 1200) {
        this.animationId = requestAnimationFrame(draw);
        return;
      }

      this.pulseT = (this.pulseT + 0.004) % 1;
      const W = window.innerWidth;
      const H = window.innerHeight;

      // Leer colores del tema activo una vez por frame
      const cs = getComputedStyle(document.documentElement);
      const pc = this.parseColor(cs.getPropertyValue('--teto-red').trim());
      const ac = this.parseColor(cs.getPropertyValue('--accent').trim());
      const p  = `${pc.r},${pc.g},${pc.b}`;
      const a  = `${ac.r},${ac.g},${ac.b}`;

      // — Partículas ambientales —
      this.bgParticles.forEach(pt => {
        pt.x += pt.vx; pt.y += pt.vy;
        pt.alpha += pt.alphaV;
        if (pt.alpha > 0.7 || pt.alpha < 0.04) pt.alphaV *= -1;
        if (pt.x < -4) pt.x = W + 4;
        if (pt.x > W + 4) pt.x = -4;
        if (pt.y < -4) pt.y = H + 4;
        if (pt.y > H + 4) pt.y = -4;

        const col = `rgba(${pt.warm ? a : p},${pt.alpha})`;
        ctx.beginPath();
        ctx.fillStyle   = col;
        ctx.shadowBlur  = pt.r * 6;
        ctx.shadowColor = `rgba(${p},${pt.alpha * 0.7})`;
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // — Glow pulsante en bordes de cada card —
      const cardIds = ['card-1', 'card-2', 'card-3', 'card-4'];
      const glowAlpha = 0.06 + 0.04 * Math.sin(this.pulseT * Math.PI * 2);
      cardIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = rect.left + window.scrollX;
        const y = rect.top  + window.scrollY;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${p},${glowAlpha})`;
        ctx.lineWidth   = 12;
        ctx.shadowBlur  = 20;
        ctx.shadowColor = `rgba(${p},${glowAlpha * 2})`;
        ctx.roundRect(x, y, rect.width, rect.height, 12);
        ctx.stroke();
      });
      ctx.shadowBlur = 0;

      this.CABLE_PAIRS.forEach(([fromId, toId, offset]) => {
        const fromEl = document.getElementById(fromId);
        const toEl   = document.getElementById(toId);
        if (!fromEl || !toEl) return;

        const fr = fromEl.getBoundingClientRect();
        const tr = toEl.getBoundingClientRect();
        const start = { x: fr.left + fr.width  / 2 + window.scrollX,
                        y: fr.top  + fr.height / 2 + window.scrollY };
        const end   = { x: tr.left + tr.width  / 2 + window.scrollX,
                        y: tr.top  + tr.height / 2 + window.scrollY };

        // Capa 1 — cable base visible (gris medio)
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(70,70,70,0.9)';
        ctx.lineWidth   = 5;
        ctx.shadowBlur  = 0;
        this.drawCurve(ctx, start, end);
        ctx.stroke();

        // Capa 2 — glow color primario
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${p},0.75)`;
        ctx.lineWidth   = 2.5;
        ctx.shadowBlur  = 22;
        ctx.shadowColor = `rgba(${p},0.9)`;
        this.drawCurve(ctx, start, end);
        ctx.stroke();

        // Capa 3 — núcleo color acento
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${a},0.5)`;
        ctx.lineWidth   = 1;
        ctx.shadowBlur  = 6;
        ctx.shadowColor = `rgba(${a},0.7)`;
        this.drawCurve(ctx, start, end);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Pulso viajando por el cable
        const t   = (this.pulseT + offset) % 1;
        const pos = this.getCablePoint(start, end, t);
        const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 14);
        grad.addColorStop(0,    'rgba(255,255,255,1)');
        grad.addColorStop(0.2,  `rgba(${a},0.95)`);
        grad.addColorStop(0.55, `rgba(${p},0.6)`);
        grad.addColorStop(1,    `rgba(${p},0)`);
        ctx.beginPath();
        ctx.fillStyle   = grad;
        ctx.shadowBlur  = 28;
        ctx.shadowColor = `rgba(${p},1)`;
        ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      this.animationId = requestAnimationFrame(draw);
    };
    draw();
  }

  private getCPs(start: {x:number,y:number}, end: {x:number,y:number}) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (Math.abs(dy) > Math.abs(dx)) {
      return {
        cp1: { x: start.x, y: start.y + dy / 3 },
        cp2: { x: end.x,   y: end.y   - dy / 3 }
      };
    }
    return {
      cp1: { x: start.x + dx / 3,   y: start.y },
      cp2: { x: start.x + dx / 1.5, y: end.y   }
    };
  }

  private drawCurve(ctx: CanvasRenderingContext2D, start: {x:number,y:number}, end: {x:number,y:number}) {
    const { cp1, cp2 } = this.getCPs(start, end);
    ctx.moveTo(start.x, start.y);
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
  }

  private getCablePoint(start: {x:number,y:number}, end: {x:number,y:number}, t: number): {x:number,y:number} {
    const { cp1, cp2 } = this.getCPs(start, end);
    const mt = 1 - t;
    return {
      x: mt*mt*mt*start.x + 3*mt*mt*t*cp1.x + 3*mt*t*t*cp2.x + t*t*t*end.x,
      y: mt*mt*mt*start.y + 3*mt*mt*t*cp1.y + 3*mt*t*t*cp2.y + t*t*t*end.y
    };
  }

  private parseColor(val: string): {r: number, g: number, b: number} {
    const hex = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(val);
    if (hex) return { r: parseInt(hex[1], 16), g: parseInt(hex[2], 16), b: parseInt(hex[3], 16) };
    const rgb = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(val);
    if (rgb) return { r: +rgb[1], g: +rgb[2], b: +rgb[3] };
    return { r: 209, g: 25, b: 62 };
  }

  setTheme(theme: string) {
    document.documentElement.classList.add('theme-transitioning');
    this.currentTheme.set(theme);
    this.renderer.setAttribute(document.documentElement, 'data-theme', theme);
    localStorage.setItem('theme', theme);
    setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 500);
  }

  setLanguage(lang: string) {
    this.translate.use(lang);
    this.currentLang.set(lang);
    localStorage.setItem('lang', lang);
  }

  private spinStates = new Map<Element, {
    tl: gsap.core.Timeline;
    icon: HTMLElement;
    rampId?: ReturnType<typeof setInterval>;
    particleId?: ReturnType<typeof setInterval>;
    rippleId?: ReturnType<typeof setInterval>;
    decelTween?: gsap.core.Tween;
  }>();

  onTechPillHover(event: MouseEvent) {
    if (!isPlatformBrowser(this.platformId)) return;
    const pill = event.currentTarget as HTMLElement;

    if (this.spinStates.has(pill)) return;

    const icon = pill.querySelector('i') as HTMLElement | null;
    if (!icon) return;

    gsap.set(icon, { transformPerspective: 120 });

    const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'none' } })
      .to(icon, { rotationY: 90, rotationX: 18, scale: 1.18, duration: 0.35 })
      .to(icon, { rotationY: 180, rotationX: 0, scale: 1.12, duration: 0.35 })
      .to(icon, { rotationY: 270, rotationX: -18, scale: 1.18, duration: 0.35 })
      .to(icon, { rotationY: 360, rotationX: 0, scale: 1, duration: 0.35 });

    const state = { tl, icon };
    this.spinStates.set(pill, state);
    this._ramp(pill, state);
    pill.addEventListener('mouseleave', () => this._decel(pill), { once: true });
  }

  private _ramp(pill: HTMLElement, s: NonNullable<ReturnType<typeof this.spinStates.get>>) {
    if (s.rampId) clearInterval(s.rampId);
    s.rampId = setInterval(() => {
      const next = Math.min(s.tl.timeScale() * 1.14, 8);
      s.tl.timeScale(next);
      if (next >= 6.5 && !pill.classList.contains('spinning-max')) {
        pill.classList.add('spinning-max');
        s.particleId = setInterval(() => this.spawnParticles(s.icon), 320);
        s.rippleId = setInterval(() => this.spawnRipple(s.icon), 420);
      }
    }, 80);
  }

  private _decel(pill: HTMLElement) {
    const s = this.spinStates.get(pill);
    if (!s) return;
    if (s.rampId) { clearInterval(s.rampId); s.rampId = undefined; }
    if (s.particleId) { clearInterval(s.particleId); s.particleId = undefined; }
    if (s.rippleId) { clearInterval(s.rippleId); s.rippleId = undefined; }
    pill.classList.remove('spinning-max');

    s.tl.kill();

    const curY = gsap.getProperty(s.icon, 'rotationY') as number;
    const mod = ((curY % 360) + 360) % 360;
    const remaining = mod < 3 ? 0 : 360 - mod;
    const targetY = curY + remaining;
    const duration = remaining === 0 ? 0.35 : Math.max(0.55, remaining / 360 * 2.4);

    s.decelTween = gsap.to(s.icon, {
      rotationY: targetY,
      rotationX: 0,
      scale: 1,
      duration,
      ease: 'power3.out',
      onComplete: () => {
        gsap.set(s.icon, { clearProps: 'transform' });
        this.spinStates.delete(pill);
      }
    });
  }

  private spawnRipple(anchor: HTMLElement) {
    const rect = anchor.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ['var(--teto-red)', '#38bdf8'];
    for (let i = 0; i < 2; i++) {
      const r = this.renderer.createElement('div');
      this.renderer.addClass(r, 'icon-ripple');
      this.renderer.setStyle(r, 'left', `${cx}px`);
      this.renderer.setStyle(r, 'top', `${cy}px`);
      this.renderer.setStyle(r, '--rc', colors[i]);
      this.renderer.setStyle(r, 'animation-delay', `${i * 180}ms`);
      this.renderer.appendChild(document.body, r);
      setTimeout(() => { if (r.parentNode) this.renderer.removeChild(document.body, r); }, 900 + i * 180);
    }
  }

  private spawnParticles(anchor: HTMLElement) {
    const rect = anchor.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ['#D1193E', '#38bdf8', '#f472b6', '#ffffff'];
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 26 + Math.random() * 22;
      const size = 2.5 + Math.random() * 3;
      const delay = Math.random() * 60;
      const p = this.renderer.createElement('div');
      this.renderer.addClass(p, 'tech-particle');
      this.renderer.setStyle(p, 'left', `${cx}px`);
      this.renderer.setStyle(p, 'top', `${cy}px`);
      this.renderer.setStyle(p, 'width', `${size}px`);
      this.renderer.setStyle(p, 'height', `${size}px`);
      this.renderer.setStyle(p, 'background', colors[i % colors.length]);
      this.renderer.setStyle(p, '--tx', `${Math.cos(angle) * dist}px`);
      this.renderer.setStyle(p, '--ty', `${Math.sin(angle) * dist}px`);
      this.renderer.setStyle(p, 'animation-delay', `${delay}ms`);
      this.renderer.appendChild(document.body, p);
      setTimeout(() => { if (p.parentNode) this.renderer.removeChild(document.body, p); }, 800 + delay);
    }
  }

  onTechKeydown(tech: string, event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const dashboard = document.querySelector('.dashboard-container') as HTMLElement;
      if (dashboard) {
        this.renderer.setStyle(dashboard, 'transformOrigin', '50% 50%');
      }
      this.isZoomedOut.set(true);
      setTimeout(() => this.router.navigate(['/world', tech]), 800);
    }
  }

  private _breakPlaying = false;

  onDangerClick(event: MouseEvent) {
    if (this._breakPlaying) return;

    const flash = this.renderer.createElement('div');
    this.renderer.setStyle(flash, 'position', 'fixed');
    this.renderer.setStyle(flash, 'inset', '0');
    this.renderer.setStyle(flash, 'background', 'rgba(209,25,62,0.22)');
    this.renderer.setStyle(flash, 'z-index', '9997');
    this.renderer.setStyle(flash, 'pointer-events', 'none');
    this.renderer.appendChild(document.body, flash);
    gsap.to(flash, {
      opacity: 0, duration: 0.5, ease: 'power2.out',
      onComplete: () => this.renderer.removeChild(document.body, flash)
    });

    gsap.to(document.body, {
      x: 10, duration: 0.055, repeat: 9, yoyo: true, ease: 'none',
      onComplete: () => gsap.set(document.body, { x: 0 })
    });

    const btn = (event.currentTarget as HTMLElement).querySelector('.danger-btn') as HTMLElement;
    if (btn) {
      for (let i = 0; i < 3; i++) setTimeout(() => this.spawnRipple(btn), i * 180);
    }

    setTimeout(() => this._playBreakAnimation(), 650);
  }

  private _playBreakAnimation() {
    this._breakPlaying = true;

    // — Overlay de grietas —
    const overlay = this.renderer.createElement('div');
    this.renderer.addClass(overlay, 'screen-crack');
    overlay.innerHTML = `
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <g stroke="rgba(255,255,255,0.88)" stroke-width="0.22" fill="none" stroke-linecap="round">
          <polyline points="50,38 47,22 43,12 39,0"/>
          <polyline points="47,22 41,16 38,8"/>
          <polyline points="50,38 33,24 24,12 16,0"/>
          <polyline points="33,24 28,32 18,30"/>
          <polyline points="50,38 12,26 4,20 0,16"/>
          <polyline points="12,26 8,36 0,35"/>
          <polyline points="50,38 4,48 0,47"/>
          <polyline points="50,38 8,62 2,74 0,82"/>
          <polyline points="8,62 16,66 12,76"/>
          <polyline points="50,38 30,70 26,84 22,100"/>
          <polyline points="30,70 36,76 32,86"/>
          <polyline points="50,38 50,78 50,100"/>
          <polyline points="50,38 66,74 70,90 68,100"/>
          <polyline points="66,74 60,80 62,90"/>
          <polyline points="50,38 82,66 90,78 100,82"/>
          <polyline points="82,66 78,74 86,76"/>
          <polyline points="50,38 96,52 100,53"/>
          <polyline points="50,38 94,34 100,30"/>
          <polyline points="94,34 90,42 98,44"/>
          <polyline points="50,38 78,18 86,8 92,0"/>
          <polyline points="78,18 72,26 80,28"/>
          <polyline points="50,38 62,16 66,6 70,0"/>
          <polyline points="62,16 57,24 65,22"/>
        </g>
      </svg>`;
    this.renderer.appendChild(document.body, overlay);
    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.12 });

    const cards = Array.from(document.querySelectorAll<HTMLElement>('.bento-item'));
    cards.forEach(c => c.classList.remove('float-anim'));
    gsap.killTweensOf(cards);

    const floorY = cards.map(card => {
      const rect = card.getBoundingClientRect();
      return window.innerHeight - rect.top - rect.height - 4;
    });

    // Fase 1 — 0g: flotan hacia arriba
    gsap.to(cards, {
      y: -30,
      x: (i: number) => -8 + (i * 6 % 16),
      rotation: (i: number) => -5 + (i * 4 % 11),
      duration: 0.55,
      ease: 'power1.out',
      stagger: { amount: 0.2, from: 'random' as const }
    });

    // Fase 2 — gravedad brutal: caen al suelo con rebote
    setTimeout(() => {
      cards.forEach((card, i) => {
        gsap.to(card, {
          y: floorY[i],
          x: -20 + (i * 17 % 40),
          rotation: -30 + (i * 23 % 60),
          duration: 0.8,
          ease: 'bounce.out',
          delay: i * 0.07
        });
      });
    }, 580);

    // Fase 3 — compuertas cierran (t=2.1s)
    setTimeout(() => {
      const doorTop = this.renderer.createElement('div');
      const doorBot = this.renderer.createElement('div');
      this.renderer.addClass(doorTop, 'blast-door');
      this.renderer.addClass(doorTop, 'blast-door-top');
      this.renderer.addClass(doorBot, 'blast-door');
      this.renderer.addClass(doorBot, 'blast-door-bot');
      doorTop.innerHTML = `<span class="blast-label">⚙ REPARANDO PANTALLA</span>`;
      this.renderer.appendChild(document.body, doorTop);
      this.renderer.appendChild(document.body, doorBot);

      // Oculta scroll mientras las compuertas están activas
      document.body.style.overflow = 'hidden';

      const halfH = window.innerHeight / 2;

      // Posición inicial fuera de pantalla en píxeles exactos
      gsap.set(doorTop, { y: -halfH });
      gsap.set(doorBot, { y:  halfH });

      // Cierran hacia el centro
      gsap.to(doorTop, { y: 0, duration: 0.55, ease: 'power3.inOut' });
      gsap.to(doorBot, {
        y: 0, duration: 0.55, ease: 'power3.inOut',
        onComplete: () => {
          // Golpe al cerrar
          gsap.to(document.body, {
            x: 6, duration: 0.04, repeat: 3, yoyo: true, ease: 'none',
            onComplete: () => gsap.set(document.body, { x: 0 })
          });
        }
      });

      // Con compuertas cerradas: reparación silenciosa (t+0.65s)
      setTimeout(() => {
        gsap.to(overlay, { opacity: 0, duration: 0.2 });
        gsap.set(cards, { y: 0, x: 0, rotation: 0, clearProps: 'transform' });
        cards.forEach(c => c.classList.add('float-anim'));
        if (overlay.parentNode) this.renderer.removeChild(document.body, overlay);
      }, 650);

      // Compuertas abren (t+1.8s)
      setTimeout(() => {
        document.body.style.overflow = '';
        gsap.to(doorTop, {
          y: -halfH, duration: 0.6, ease: 'power3.inOut',
          onComplete: () => { if (doorTop.parentNode) this.renderer.removeChild(document.body, doorTop); }
        });
        gsap.to(doorBot, {
          y: halfH, duration: 0.6, ease: 'power3.inOut',
          onComplete: () => {
            if (doorBot.parentNode) this.renderer.removeChild(document.body, doorBot);
            this._breakPlaying = false;
          }
        });
      }, 1800);

    }, 2100);
  }

  goToWorld(tech: string, event: MouseEvent) {
    const dashboard = document.querySelector('.dashboard-container') as HTMLElement;
    if (dashboard) {
      const rect = dashboard.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      this.renderer.setStyle(dashboard, 'transformOrigin', `${x}% ${y}%`);
    }

    this.isZoomedOut.set(true);
    setTimeout(() => {
      this.router.navigate(['/world', tech]);
    }, 800);
  }
}
