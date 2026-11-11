'use strict';
// 재 너머 — 공용 기초: 난수, 입력, 소리, 글자, 저장
(function () {
  const G = window.G = { W: 384, H: 216, TS: 16 };

  // ---------- 수학 ----------
  G.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

  G.mulberry = function (a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  G.hash2 = function (x, y, s) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  G.vnoise = function (x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = G.hash2(xi, yi, s), b = G.hash2(xi + 1, yi, s);
    const c = G.hash2(xi, yi + 1, s), d = G.hash2(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };

  G.fbm = (x, y, s) => G.vnoise(x, y, s) * 0.65 + G.vnoise(x * 2.1, y * 2.1, s + 7) * 0.35;

  // ---------- 입력 ----------
  const KEYS = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'a', KeyJ: 'a',
    KeyX: 'b', KeyK: 'b', Enter: 'b',
    KeyC: 'c', KeyL: 'c',
    Space: 'd', ShiftLeft: 'd', ShiftRight: 'd',
    KeyQ: 'q',
    Escape: 'menu', KeyI: 'menu', Tab: 'menu',
    KeyM: 'map', Digit0: 'mute'
  };
  const held = {}, pressed = {};
  G.input = {
    down: a => !!held[a],
    hit: a => !!pressed[a],
    set(a, v) {
      if (v && !held[a]) pressed[a] = true;
      held[a] = v;
    },
    endFrame() { for (const k in pressed) delete pressed[k]; },
    // 대화/메뉴에서 '확인'으로 치는 키
    ok() { return pressed.a || pressed.b || pressed.d; },
    back() { return pressed.menu || pressed.c; },
    clear() { for (const k in held) held[k] = false; for (const k in pressed) delete pressed[k]; }
  };
  window.addEventListener('keydown', e => {
    const a = KEYS[e.code];
    if (!a) return;
    e.preventDefault();
    if (!e.repeat) G.input.set(a, true);
    G.audio.wake();
  });
  window.addEventListener('keyup', e => {
    const a = KEYS[e.code];
    if (a) { e.preventDefault(); G.input.set(a, false); }
  });
  window.addEventListener('blur', () => G.input.clear());

  // ---------- 소리 ----------
  // 효과음만 있다. 배경음악은 만들지 않았다(README 참고).
  let ac = null, noiseBuf = null, muted = false;
  function tone(type, f0, f1, dur, vol, delay) {
    const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, delay) {
    const t = ac.currentTime + (delay || 0);
    const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.buffer = noiseBuf;
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(ac.destination);
    s.start(t); s.stop(t + dur + 0.02);
  }
  const SFX = {
    swing() { noise(0.09, 0.16, 1800); },
    hit() { noise(0.07, 0.3, 700); tone('square', 180, 90, 0.08, 0.12); },
    hurt() { tone('square', 220, 70, 0.22, 0.16); noise(0.12, 0.2, 400); },
    kill() { tone('square', 300, 60, 0.25, 0.12); noise(0.2, 0.2, 300, 0.03); },
    pick() { tone('square', 660, 660, 0.05, 0.09); tone('square', 990, 990, 0.08, 0.09, 0.05); },
    coin() { tone('square', 1320, 1320, 0.04, 0.07); tone('square', 1760, 1760, 0.1, 0.07, 0.04); },
    talk() { tone('square', 340 + Math.random() * 60, 300, 0.025, 0.035); },
    move() { tone('square', 520, 520, 0.03, 0.05); },
    ok() { tone('square', 620, 780, 0.07, 0.07); },
    deny() { tone('square', 150, 120, 0.12, 0.09); },
    roll() { noise(0.14, 0.12, 900); },
    bean() { noise(0.05, 0.12, 3000); },
    eat() { tone('triangle', 300, 420, 0.08, 0.14); tone('triangle', 420, 560, 0.1, 0.14, 0.09); },
    save() { tone('triangle', 392, 392, 0.12, 0.13); tone('triangle', 523, 523, 0.12, 0.13, 0.12); tone('triangle', 659, 659, 0.22, 0.13, 0.24); },
    open() { tone('square', 200, 400, 0.12, 0.09); noise(0.08, 0.1, 1200); },
    thud() { tone('sine', 110, 40, 0.3, 0.4); noise(0.2, 0.3, 200); },
    rooster() { tone('sawtooth', 500, 900, 0.15, 0.06); tone('sawtooth', 900, 700, 0.3, 0.06, 0.15); tone('sawtooth', 700, 400, 0.35, 0.05, 0.45); },
    stone() { tone('square', 900, 500, 0.04, 0.08); noise(0.05, 0.14, 2200); },
    die() { tone('square', 330, 50, 0.7, 0.15); }
  };
  G.audio = {
    wake() {
      if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ac = null; }
    },
    toggle() { muted = !muted; return muted; },
    get muted() { return muted; }
  };
  G.sfx = function (name) {
    if (!ac || muted || ac.state !== 'running') return;
    const f = SFX[name];
    if (f) try { f(); } catch (e) { /* 소리는 실패해도 게임은 돈다 */ }
  };

  // ---------- 글자 ----------
  // 도트 폰트를 글자 단위로 찍어 두고, 알파를 잘라서 번짐 없이 쓴다.
  const FONTS = {
    big: { css: '12px Galmuri11', size: 12, lh: 14 },
    small: { css: '10px Galmuri9', size: 10, lh: 11 }
  };
  const glyphs = new Map();
  const mctx = document.createElement('canvas').getContext('2d');
  function glyph(ch, fk, color) {
    const key = fk + color + ch;
    let g = glyphs.get(key);
    if (g) return g;
    const F = FONTS[fk];
    mctx.font = F.css;
    const adv = Math.max(1, Math.round(mctx.measureText(ch).width));
    const c = document.createElement('canvas');
    c.width = adv + 2; c.height = F.size + 4;
    const x = c.getContext('2d');
    x.font = F.css; x.textBaseline = 'alphabetic'; x.fillStyle = color;
    x.fillText(ch, 0, F.size - 1);
    const im = x.getImageData(0, 0, c.width, c.height), d = im.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 110 ? 255 : 0;
    x.putImageData(im, 0, 0);
    g = { c, adv };
    if (glyphs.size > 6000) glyphs.clear();
    glyphs.set(key, g);
    return g;
  }
  G.text = {
    lh: fk => FONTS[fk || 'big'].lh,
    width(str, fk) {
      fk = fk || 'big';
      let w = 0;
      for (const ch of str) w += glyph(ch, fk, '#fff').adv;
      return w;
    },
    // align: 0 왼쪽, 1 가운데, 2 오른쪽
    draw(ctx, str, x, y, color, fk, align, scale) {
      fk = fk || 'big'; color = color || '#f6f1e3'; scale = scale || 1;
      str = String(str);
      if (align) x -= Math.round(this.width(str, fk) * scale * (align === 1 ? 0.5 : 1));
      x = Math.round(x); y = Math.round(y);
      for (const ch of str) {
        const g = glyph(ch, fk, color);
        if (ch !== ' ') {
          if (scale === 1) ctx.drawImage(g.c, x, y);
          else ctx.drawImage(g.c, x, y, g.c.width * scale, g.c.height * scale);
        }
        x += g.adv * scale;
      }
    },
    // 그림자 한 겹 깔고 쓰기
    drawS(ctx, str, x, y, color, fk, align) {
      this.draw(ctx, str, x + 1, y + 1, '#1b1a1f', fk, align);
      this.draw(ctx, str, x, y, color, fk, align);
    },
    wrap(str, maxW, fk) {
      const out = [];
      for (const para of String(str).split('\n')) {
        let line = '', w = 0, lastSp = -1;
        for (const ch of para) {
          const cw = glyph(ch, fk || 'big', '#fff').adv;
          if (w + cw > maxW && line.length) {
            if (ch !== ' ' && lastSp > 0 && line.length - lastSp < 7) {
              out.push(line.slice(0, lastSp));
              line = line.slice(lastSp + 1);
            } else {
              out.push(line);
              line = '';
            }
            w = this.width(line, fk); lastSp = -1;
            if (ch === ' ' && !line.length) continue;
          }
          if (ch === ' ') lastSp = line.length;
          line += ch; w += cw;
        }
        out.push(line);
      }
      return out;
    }
  };

  // ---------- 저장 ----------
  const KEY = 'jae-neomeo.save.1';
  G.store = {
    read() {
      try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; }
      catch (e) { return null; }
    },
    write(o) {
      try { localStorage.setItem(KEY, JSON.stringify(o)); return true; }
      catch (e) { return false; }
    },
    wipe() { try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ } }
  };
})();
