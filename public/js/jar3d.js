/**
 * 3D Animated Idea Jar (G'oyalar Banki 3D Shaffof Bankasi)
 * Features:
 * - 3D Translucent glass jar with refraction & golden lid
 * - Swirling glowing idea sparks (particles) floating inside
 * - Interactive mouse/touch tilt & rotation
 * - Sparkle pulses and warm golden aura
 */

class IdeaJar3D {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.parentElement.clientWidth || 360;
    this.height = 480;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.mouseX = 0;
    this.mouseY = 0;
    this.targetRotationY = 0;
    this.targetRotationX = 0;
    this.currentRotationY = 0;
    this.currentRotationX = 0;

    // Glowing idea particles inside jar
    this.particles = [];
    this.particleCount = 45;
    this.initParticles();

    // Event listeners
    this.bindEvents();

    // Start animation loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initParticles() {
    this.particles = [];
    const colors = ['#f5cf7b', '#e8bd68', '#ffffff', '#38bdf8', '#4ade80', '#fb923c'];

    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * 140,
        y: (Math.random() - 0.5) * 180 + 20,
        z: (Math.random() - 0.5) * 140,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 1.2 - 0.2,
        vz: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 3.5 + 2,
        baseSize: Math.random() * 3.5 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.04 + Math.random() * 0.04,
        sparkle: Math.random() > 0.7
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      if (!this.canvas.parentElement) return;
      this.width = this.canvas.parentElement.clientWidth || 360;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    });

    const onMove = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const nx = (clientX - rect.left) / rect.width - 0.5;
      const ny = (clientY - rect.top) / rect.height - 0.5;
      this.targetRotationY = nx * 0.8;
      this.targetRotationX = -ny * 0.4;
    };

    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    });
  }

  animate(time) {
    requestAnimationFrame(this.animate);
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Smooth rotation interpolation
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.06;
    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.06;

    // Auto gentle floating rotation
    const autoFloat = Math.sin(time * 0.0015) * 12;
    const autoTilt = Math.cos(time * 0.001) * 0.08;
    const rotY = this.currentRotationY + autoTilt;
    const rotX = this.currentRotationX;

    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2 + autoFloat + 10;

    // 1. Warm Glow Aura behind jar
    const aura = ctx.createRadialGradient(centerX, centerY + 20, 30, centerX, centerY + 20, 180);
    aura.addColorStop(0, 'rgba(232, 189, 104, 0.22)');
    aura.addColorStop(0.5, 'rgba(184, 134, 53, 0.08)');
    aura.addColorStop(1, 'rgba(8, 13, 25, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, w, h);

    // 2. Draw Jar Body (Back Glass Layer)
    ctx.save();
    ctx.translate(centerX, centerY);

    // Subtle 3D perspective skew
    ctx.transform(1, rotX * 0.3, rotY * 0.15, 1, 0, 0);

    const jarW = 190;
    const jarH = 260;
    const jarX = -jarW / 2;
    const jarY = -jarH / 2 + 30;
    const r = 40;

    // Outer Back Glow
    ctx.shadowColor = '#e8bd68';
    ctx.shadowBlur = 25;
    ctx.strokeStyle = 'rgba(232, 189, 104, 0.35)';
    ctx.lineWidth = 3;

    // Rounded Jar Path
    this.drawJarShape(ctx, jarX, jarY, jarW, jarH, r);
    ctx.fillStyle = 'rgba(17, 28, 48, 0.45)';
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // 3. Render 3D Floating Idea Sparks inside the Jar
    // Sort particles by rotated Z depth
    const sinY = Math.sin(rotY);
    const cosY = Math.cos(rotY);

    const transformedParticles = this.particles.map(p => {
      // Rotate around Y axis
      const rx = p.x * cosY - p.z * sinY;
      const rz = p.x * sinY + p.z * cosY;
      return { p, rx, rz, ry: p.y };
    });

    transformedParticles.sort((a, b) => a.rz - b.rz);

    for (const item of transformedParticles) {
      const p = item.p;
      // Update physics
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.pulse += p.pulseSpeed;

      // Jar boundaries
      const maxDistX = 65;
      const maxY = 130;
      const minY = -90;

      if (Math.abs(p.x) > maxDistX) { p.vx *= -1; p.x = Math.sign(p.x) * maxDistX; }
      if (Math.abs(p.z) > maxDistX) { p.vz *= -1; p.z = Math.sign(p.z) * maxDistX; }
      if (p.y > maxY) { p.vy *= -1; p.y = maxY; }
      if (p.y < minY) { p.vy *= -1; p.y = minY; }

      // Depth perspective
      const scale = (item.rz + 200) / 200;
      const curSize = Math.max(1, (p.baseSize + Math.sin(p.pulse) * 1.5) * scale);
      const alpha = Math.min(1, Math.max(0.2, (item.rz + 150) / 250));

      // Draw particle glow
      const pg = ctx.createRadialGradient(item.rx, item.ry, 0, item.rx, item.ry, curSize * 3);
      pg.addColorStop(0, p.color);
      pg.addColorStop(0.5, p.color.replace(')', `, ${alpha * 0.6})`).replace('rgb', 'rgba').replace('#', 'rgba('));
      pg.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(item.rx, item.ry, curSize * 3, 0, Math.PI * 2);
      ctx.fillStyle = pg;
      ctx.fill();

      // Sparkle cross star
      if (p.sparkle && Math.sin(p.pulse) > 0.4) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(item.rx - curSize * 2, item.ry);
        ctx.lineTo(item.rx + curSize * 2, item.ry);
        ctx.moveTo(item.rx, item.ry - curSize * 2);
        ctx.lineTo(item.rx, item.ry + curSize * 2);
        ctx.stroke();
      }
    }

    // 4. Draw Center Glowing Brand Emblem inside Jar: "IDEA BANK"
    ctx.font = '900 24px Outfit, Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(245, 207, 123, 0.95)';
    ctx.shadowColor = 'rgba(232, 189, 104, 0.8)';
    ctx.shadowBlur = 18;
    ctx.fillText('✦ G‘OYALAR ✦', 0, 15);
    ctx.font = '700 13px Montserrat, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.letterSpacing = '3px';
    ctx.fillText('BANKI', 0, 42);
    ctx.shadowBlur = 0;

    // 5. Draw Glass Reflections & Sheen (Front Layer)
    const glassSheen = ctx.createLinearGradient(jarX, jarY, jarX + jarW, jarY + jarH);
    glassSheen.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    glassSheen.addColorStop(0.25, 'rgba(255, 255, 255, 0.06)');
    glassSheen.addColorStop(0.5, 'rgba(232, 189, 104, 0.08)');
    glassSheen.addColorStop(0.75, 'rgba(255, 255, 255, 0.04)');
    glassSheen.addColorStop(1, 'rgba(255, 255, 255, 0.18)');

    this.drawJarShape(ctx, jarX, jarY, jarW, jarH, r);
    ctx.fillStyle = glassSheen;
    ctx.fill();

    // Curved glass highlight arc
    ctx.beginPath();
    ctx.ellipse(jarX + 35, jarY + 80, 18, 55, Math.PI / 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fill();

    // 6. Draw Golden Metallic Lid
    const lidW = 150;
    const lidH = 34;
    const lidX = -lidW / 2;
    const lidY = jarY - lidH + 4;

    const lidGrad = ctx.createLinearGradient(lidX, lidY, lidX + lidW, lidY);
    lidGrad.addColorStop(0, '#78531f');
    lidGrad.addColorStop(0.25, '#d4a74b');
    lidGrad.addColorStop(0.5, '#fff0bd');
    lidGrad.addColorStop(0.75, '#b88635');
    lidGrad.addColorStop(1, '#5c3a10');

    ctx.shadowColor = 'rgba(232, 189, 104, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = lidGrad;
    ctx.strokeStyle = '#f5cf7b';
    ctx.lineWidth = 1.5;

    // Lid Rounded Rect
    this.roundRect(ctx, lidX, lidY, lidW, lidH, 8);
    ctx.fill();
    ctx.stroke();

    // Lid Rim Top
    const rimW = 130;
    const rimH = 10;
    const rimX = -rimW / 2;
    const rimY = lidY - rimH + 2;
    this.roundRect(ctx, rimX, rimY, rimW, rimH, 4);
    ctx.fillStyle = '#f5cf7b';
    ctx.fill();

    ctx.restore();
  }

  drawJarShape(ctx, x, y, w, h, r) {
    ctx.beginPath();
    // Neck curve
    const neckW = 138;
    const neckX = -neckW / 2;
    ctx.moveTo(neckX, y);
    ctx.lineTo(-neckX, y);

    // Shoulder curve to body
    ctx.bezierCurveTo(x + w, y + 10, x + w, y + 30, x + w, y + 45);

    // Right body side down to rounded bottom
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);

    // Bottom
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);

    // Left body side up to shoulder
    ctx.lineTo(x, y + 45);
    ctx.bezierCurveTo(x, y + 30, x, y + 10, neckX, y);
    ctx.closePath();
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

window.IdeaJar3D = IdeaJar3D;
