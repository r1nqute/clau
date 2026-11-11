'use strict';
// 판 돌리기: 상태, 시간, 고개의 규칙, 그리기 순서
(function () {
  const G = window.G;
  let canvas, ctx, nightCv, nctx;
  let state = 'title', time = 0, shakeAmt = 0, camx = 0, camy = 0;
  let titleSel = 0, hasSave = false, lastRegion = '', emitT = 0, target = null;
  const fade = { a: 0, dir: 0, cb: null };
  const pass = { boss: null, fight: false, asked: false };
  const ARENA = { x: 72 * 16 + 8, y: 27 * 16 + 8 };
  const VILLAGES = [[36, 97], [76, 69], [22, 55], [132, 52], [68, 11]];

  function fresh() {
    const st = G.world.maps.world.start;
    return {
      hp: 5, maxhp: 5, money: 20, inv: { salt: 4, rice: 2 }, gear: { weapon: 0, jige: 0, shoes: 0, lantern: 0 }, quick: 'rice',
      flags: {}, time: 7 * 60, day: 1, map: 'world', x: st.x, y: st.y,
      respawn: { map: 'world', x: st.x, y: st.y }, explored: new Array(300).fill(0)
    };
  }
  function fadeTo(cb) { if (fade.dir === 0 && fade.a === 0) { fade.dir = 1; fade.cb = cb; } }

  const game = G.game = {
    count: id => G.s.inv[id] || 0,
    give(id, n) {
      const s = G.s; n = n || 1;
      s.inv[id] = (s.inv[id] || 0) + n;
      const d = G.ITEMS[id];
      if ((d.heal || d.thrown) && !(s.inv[s.quick] > 0)) s.quick = id;
      G.sfx('pick'); G.ui.toast(d.name + ' +' + n);
    },
    take(id, n) { G.s.inv[id] = Math.max(0, (G.s.inv[id] || 0) - n); },
    load() { let n = 0; for (const id in G.s.inv) if (G.ITEMS[id].good) n += G.s.inv[id]; return n; },
    cap() { return G.s.gear.jige ? 10 : 6; },
    pay(n) { if (G.s.money < n) { G.sfx('deny'); return false; } G.s.money -= n; if (n) G.sfx('coin'); return true; },
    earn(n) { G.s.money += n; G.sfx('coin'); G.ui.toast('엽전 +' + n); },
    toast(t) { G.ui.toast(t); },
    isNight() { const h = G.s.time / 60; return h >= 20 || h < 5; },
    clock() { return G.s.day * 1440 + G.s.time; },
    hourName() {
      const h = G.s.time / 60;
      return h < 4 ? '한밤' : h < 7 ? '새벽' : h < 11 ? '아침' : h < 14 ? '한낮' : h < 17 ? '낮' : h < 20 ? '해거름' : '밤';
    },
    dayText() { return '길 나선 지 ' + G.s.day + '일째, ' + this.hourName(); },
    safe() {
      if (G.world.cur.id !== 'world') return false;
      const x = G.p.x / 16, y = G.p.y / 16;
      return VILLAGES.some(v => Math.hypot(v[0] - x, v[1] - y) < 7);
    },
    shake(n) { shakeAmt = Math.max(shakeAmt, n); },

    hurt(dmg, ex, ey, kb) {
      const p = G.p, s = G.s;
      if (p.inv > 0 || state !== 'play' || fade.dir) return false;
      s.hp -= dmg; p.inv = 1.0; p.atk = 0;
      const dx = p.x - ex, dy = p.y - ey, l = Math.hypot(dx, dy) || 1;
      p.kbx = dx / l * (kb || 170); p.kby = dy / l * (kb || 170);
      G.sfx('hurt'); this.shake(4);
      G.E.puff(p.x, p.y - 8, '#cf6a3d', 6, 60);
      if (s.hp <= 0) this.die();
      return true;
    },
    die() {
      const s = G.s;
      s.hp = 0; G.sfx('die');
      state = 'dead';
      setTimeout(() => {
        fade.dir = 1; fade.cb = () => {
          const lost = Math.floor(s.money * 0.2);
          s.money -= lost; s.hp = s.maxhp;
          pass.fight = false; pass.asked = false; pass.boss = null;
          enter(s.respawn.map, s.respawn.x, s.respawn.y, 'down');
          state = 'play';
          G.ui.say('', lost ? ['정신을 차려 보니 장승 앞이다.', '누가 업어다 놓았는지는 모르겠다. 엽전이 ' + lost + '푼 빈다.'] : '정신을 차려 보니 장승 앞이다.');
        };
      }, 900);
    },

    eat(id) {
      const s = G.s, d = G.ITEMS[id];
      if (!(s.inv[id] > 0)) return;
      if (s.hp >= s.maxhp) { G.sfx('deny'); G.ui.toast('배가 부르다.'); return; }
      s.inv[id]--; s.hp = Math.min(s.maxhp, s.hp + d.heal);
      G.p.eat = 0.3; G.sfx('eat');
      G.E.puff(G.p.x, G.p.y - 14, '#e6cc78', 5, 30);
    },
    useQuick() {
      const s = G.s, id = s.quick;
      if (!id || !(s.inv[id] > 0)) { this.cycleQuick(); return; }
      const d = G.ITEMS[id];
      if (d.heal) this.eat(id);
      else if (d.thrown) {
        const p = G.p, v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.dir];
        s.inv[id]--;
        G.E.list.push({ type: 'bean', x: p.x + v[0] * 8, y: p.y + v[1] * 6, vx: v[0] * 190, vy: v[1] * 190, t: 0.55 });
        G.sfx('bean');
      }
    },
    cycleQuick() {
      const s = G.s, ids = Object.keys(s.inv).filter(id => s.inv[id] > 0 && (G.ITEMS[id].heal || G.ITEMS[id].thrown));
      if (!ids.length) { s.quick = null; return; }
      s.quick = ids[(ids.indexOf(s.quick) + 1) % ids.length];
      G.sfx('move');
    },

    findTarget() {
      const p = G.p, v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.dir];
      const fx = p.x + v[0] * 10, fy = p.y - 4 + v[1] * 10;
      let best = null, bd = 19;
      for (const e of G.E.list) {
        const boss = e.kind === 'boss' && (e.st === 'wait' || e.st === 'friend');
        if (e.type !== 'npc' && !boss) continue;
        const d = G.dist(e.x, e.y - 4, fx, fy) - (boss ? 10 : 0);
        if (d < bd) { bd = d; best = { ent: e, x: e.x, y: e.y - (boss ? 38 : 22) }; }
      }
      if (best) return best;
      const pr = G.world.findUse(fx, fy, 17);
      if (pr) {
        if (pr.use === 'chest' && G.s.flags[pr.id]) return null;
        if (pr.use === 'doltap' && G.s.flags[pr.id]) return null;
        if (pr.use === 'kite' && G.s.flags.kiteTaken) return null;
        const sp = G.spr[pr.s], h = (Array.isArray(sp) ? sp[0] : sp).height;
        return { prop: pr, x: pr.x, y: pr.y - h - 3 };
      }
      return null;
    },
    interact() {
      const t = this.findTarget(), s = G.s, f = s.flags;
      if (!t) return;
      if (t.ent) {
        if (t.ent.kind === 'boss') { if (t.ent.st === 'friend') G.BOSS.friend(s); else bossMeet(); return; }
        G.NPCS[t.ent.id].talk(s);
        return;
      }
      const pr = t.prop;
      if (pr.use === 'sign') G.ui.say('', G.SIGNS[pr.id]);
      else if (pr.use === 'save') {
        const night = this.isNight();
        G.ui.say('', '장승이 서 있다. 눈을 부라리고 있는데 어쩐지 마음이 놓인다.');
        G.ui.choice(['여기까지 기록한다', night ? '날이 샐 때까지 쉰다' : '해가 질 때까지 쉰다', '그만둔다'], i => {
          if (i === 0) { s.respawn = { map: s.map, x: pr.x, y: pr.y + 12 }; this.save(); G.sfx('save'); G.ui.toast('기록했다.'); }
          else if (i === 1) fadeTo(() => {
            if (night) { if (s.time > 6 * 60) s.day++; s.time = 6 * 60; } else s.time = 20 * 60 + 5;
            G.ui.toast(night ? '날이 밝았다.' : '해가 졌다.');
          });
        });
      } else if (pr.use === 'chest') {
        const c = G.CHESTS[pr.id];
        f[pr.id] = 1; G.sfx('open');
        G.ui.say('', c.text);
        G.ui.run(() => { if (c.money) this.earn(c.money); for (const id in (c.items || {})) this.give(id, c.items[id]); });
      } else if (pr.use === 'doltap') {
        f[pr.id] = 1; G.sfx('stone');
        const n = ['d1', 'd2', 'd3', 'd4', 'd5'].filter(k => f[k]).length;
        if (n >= 5) {
          G.ui.say('', ['돌을 하나 얹었다. 이것으로 다섯 군데.', '빈 것도 없는데 뭔가 채워진 기분이다.']);
          G.ui.run(() => { s.maxhp++; s.hp = s.maxhp; G.sfx('save'); G.ui.toast('감이 하나 늘었다'); });
        } else G.ui.say('', '돌을 하나 얹었다. (' + n + '/5)');
      } else if (pr.use === 'kite') {
        f.kiteTaken = 1;
        G.ui.say('', '가지에 연이 걸려 있다. 작대기로 걷어 내렸다.');
        G.ui.run(() => this.give('kite', 1));
      }
    },

    sleep() {
      fadeTo(() => {
        const s = G.s;
        if (s.time > 6 * 60) s.day++;
        s.time = 6 * 60; s.hp = s.maxhp;
        s.respawn = { map: 'world', x: 71 * 16 + 8, y: 67 * 16 + 8 };
        this.save(); G.sfx('save');
        G.ui.toast('아침이다. 기록했다.');
      });
    },
    save() {
      const s = G.s;
      s.x = G.p.x; s.y = G.p.y;
      if (!G.store.write(s)) G.ui.toast('이 브라우저에서는 기록이 남지 않는다.');
    },
    onKill(e) {
      const f = G.s.flags;
      if (e.kind === 'boar' && f.boar === 1) {
        f.boarKills = (f.boarKills || 0) + 1;
        if (f.boarKills === 3) G.ui.toast('멧돼지 세 마리. 숯쟁이에게 가자.');
      }
      if (e.kind === 'boss') {
        f.pass = 1; pass.fight = false; pass.boss = null;
        G.s.gear.weapon = 2;
        G.ui.say('', ['그것이 쓰러진 자리에 닳은 도리깨 한 자루가 놓여 있다.', '주워 들었다. 고갯바람이 북쪽에서 불어온다.']);
        G.ui.run(() => { G.ui.toast('고개가 열렸다'); this.save(); });
      }
    }
  };

  function enter(map, x, y, dir) {
    G.s.map = map;
    G.world.use(map);
    G.E.reset();
    G.p.reset(x, y, dir);
    pass.boss = null; pass.fight = false;
    lastRegion = '';
    snapCam();
  }
  function snapCam() {
    const m = G.world.cur;
    camx = G.clamp(G.p.x - G.W / 2, 0, m.w * 16 - G.W);
    camy = G.clamp(G.p.y - 8 - G.H / 2, 0, m.h * 16 - G.H);
  }

  // ---------- 검은재 ----------
  function bossMeet() {
    const s = G.s, b = pass.boss;
    pass.asked = true;
    G.BOSS.meet(s,
      () => { if (b && !b.dead) { b.st = 'idle'; pass.fight = true; } },
      () => {
        s.flags.pass = 2;
        if (b) { b.st = 'friend'; b.x = 76 * 16; b.y = 27 * 16; }
        G.ui.toast('고개가 열렸다'); game.save();
      },
      () => { G.p.y = Math.max(G.p.y, 34 * 16 + 6); });
  }
  function passLogic() {
    const s = G.s, f = s.flags, p = G.p, E = G.E;
    if (s.map !== 'world') return;
    if (pass.boss && pass.boss.dead) pass.boss = null;
    const night = game.isNight();
    const near = G.dist(p.x, p.y, ARENA.x, ARENA.y) < 340;
    const inPass = p.x > 62 * 16 && p.x < 83 * 16 && p.y < 36 * 16 && p.y > 17 * 16;
    if (f.pass) {
      if (f.pass === 2 && night && near && !pass.boss) {
        pass.boss = E.spawn('boss', 76 * 16, 27 * 16); pass.boss.st = 'friend'; pass.boss.beanCd = 0;
      } else if (pass.boss && !night) { E.puff(pass.boss.x, pass.boss.y - 14, '#8a5a7a', 14); pass.boss.dead = true; pass.boss = null; }
      return;
    }
    if (!night) {
      if (pass.boss) {
        if (pass.fight) { G.sfx('rooster'); G.ui.say('', ['멀리서 닭이 울었다.', '그것은 간데없다. 씨름판에 외발자국만 남았다.']); }
        E.puff(pass.boss.x, pass.boss.y - 14, '#8a5a7a', 14);
        pass.boss.dead = true; pass.boss = null; pass.fight = false;
      }
      if (inPass && p.y < 33 * 16 && fade.dir === 0) {
        fadeTo(() => {
          p.reset(72 * 16 + 8, 45 * 16, 'down'); snapCam();
          f.looped = (f.looped || 0) + 1;
          G.ui.say('', f.looped === 1 ? ['분명 고개를 올랐는데, 다시 고개 아래다.', '해가 떠 있는 동안은 길이 열리지 않는 모양이다.'] : '또 제자리다.');
        });
      }
      return;
    }
    if (!pass.boss && near) { pass.boss = E.spawn('boss', ARENA.x, ARENA.y); pass.boss.st = 'wait'; pass.boss.beanCd = 0; }
    if (pass.boss && pass.boss.st === 'wait' && inPass && p.y < 31 * 16 && !pass.asked && !G.ui.busy()) bossMeet();
    if (!inPass || p.y > 34 * 16) pass.asked = false;
    if (inPass && p.y < 24 * 16 + 8) p.y = 24 * 16 + 8;
    if (pass.fight && p.y > 33 * 16 + 4) p.y = 33 * 16 + 4;
  }

  // ---------- 한 틱 ----------
  const DT = 1 / 60;
  function update() {
    time += DT;
    const I = G.input;
    if (I.hit('mute')) G.ui.toast(G.audio.toggle() ? '소리 끔' : '소리 켬');
    if (fade.dir) {
      fade.a += fade.dir * DT * 2.6;
      if (fade.dir > 0 && fade.a >= 1) { fade.a = 1; fade.dir = -1; const cb = fade.cb; fade.cb = null; if (cb) cb(); }
      else if (fade.dir < 0 && fade.a <= 0) { fade.a = 0; fade.dir = 0; }
    }
    if (shakeAmt > 0) shakeAmt = Math.max(0, shakeAmt - DT * 18);

    if (state === 'title') {
      const n = hasSave ? 2 : 1;
      if (I.hit('up') || I.hit('down')) { titleSel = (titleSel + 1) % n; G.sfx('move'); }
      if (I.ok() && fade.dir === 0) {
        G.sfx('ok');
        const cont = hasSave && titleSel === 0;
        fadeTo(() => begin(cont));
      }
      const m = G.world.cur;
      camx = G.clamp((36 + Math.sin(time * 0.05) * 9) * 16 - G.W / 2, 0, m.w * 16 - G.W);
      camy = 91 * 16;
      G.E.update(DT);
      return;
    }
    if (state === 'dead') { G.E.update(DT); return; }

    // 창을 닫은 그 키가 같은 틱에 다시 먹히지 않게, 닫힌 틱은 건너뛴다
    const wasBusy = G.ui.busy();
    G.ui.update(DT);
    if (wasBusy || G.ui.busy() || fade.dir > 0) { target = null; return; }
    if (I.hit('menu')) { G.ui.openMenu(0); return; }
    if (I.hit('map')) { G.ui.openMenu(2); return; }

    const s = G.s, p = G.p;
    const wasNight = game.isNight();
    s.time += DT * 2.4;
    if (s.time >= 1440) { s.time -= 1440; s.day++; }
    if (wasNight && !game.isNight() && s.map === 'world') G.sfx('rooster');

    p.update(DT);
    passLogic();
    G.E.spawner();
    G.E.update(DT);
    target = state === 'play' && !G.ui.busy() ? game.findTarget() : null;

    // 굴 드나들기
    const tx = Math.floor(p.x / 16), ty = Math.floor((p.y - 3) / 16);
    for (const w of G.world.cur.warps) {
      if (w.tx === tx && w.ty === ty && fade.dir === 0) { fadeTo(() => enter(w.to, w.x, w.y, w.dir)); break; }
    }
    if (s.map === 'world') {
      // 눈에 들어온 만큼(한 화면 남짓) 지도에 그려진다
      for (let oy = -8; oy <= 8; oy += 8) for (let ox = -12; ox <= 12; ox += 6)
        s.explored[G.clamp((ty + oy) >> 3, 0, 14) * 20 + G.clamp((tx + ox) >> 3, 0, 19)] = 1;
    }
    const reg = G.world.region(p.x, p.y);
    if (reg !== lastRegion) { if (reg) G.ui.banner(reg); lastRegion = reg; }

    // 연기와 불티
    emitT -= DT;
    if (emitT <= 0) {
      emitT = 0.12;
      for (const pr of vis) {
        if (pr.s === 'kiln') G.E.parts.push({ x: pr.x - 6 + Math.random() * 12, y: pr.y - 28, vx: 4 + Math.random() * 6, vy: -16 - Math.random() * 8, life: 1.4, col: Math.random() < 0.5 ? '#8e8f8c' : '#5a5c63', s: 2 });
        else if (pr.s === 'fire' && Math.random() < 0.5) G.E.parts.push({ x: pr.x - 3 + Math.random() * 6, y: pr.y - 10, vx: (Math.random() - 0.5) * 10, vy: -22 - Math.random() * 14, life: 0.7, col: Math.random() < 0.5 ? '#cf6a3d' : '#e6cc78', s: 1 });
      }
    }
    const m = G.world.cur;
    const gx = G.clamp(p.x - G.W / 2, 0, m.w * 16 - G.W), gy = G.clamp(p.y - 8 - G.H / 2, 0, m.h * 16 - G.H);
    camx += (gx - camx) * 0.18; camy += (gy - camy) * 0.18;
  }

  function begin(cont) {
    const saved = cont ? G.store.read() : null;
    G.s = saved || fresh();
    const s = G.s;
    if (!s.explored || s.explored.length !== 300) s.explored = new Array(300).fill(0);
    G.ui.reset();
    enter(s.map, s.x, s.y, 'down');
    state = 'play';
    if (!saved) {
      G.ui.say('', ['상강이 지났다. 소래 염전의 올해 마지막 소금이 지게에 얹혔다.', '객주 염 영감이 부른다. 바로 위쪽 집 앞이다.']);
      G.ui.run(() => G.ui.toast('X: 말 걸기   Z: 치기   Esc: 봇짐'));
    }
  }

  // ---------- 그리기 ----------
  let vis = [];
  const drawList = [];
  function darkness() {
    if (G.world.cur.dark) return 0.9;
    const h = (state === 'title' ? 19.2 * 60 : G.s.time) / 60;
    if (h < 4.5 || h >= 20) return 0.72;
    if (h < 6.5) return 0.72 * (1 - (h - 4.5) / 2);
    if (h < 17.5) return 0;
    return 0.72 * (h - 17.5) / 2.5;
  }
  function light(x, y, r) {
    nctx.globalAlpha = 0.3; nctx.beginPath(); nctx.arc(x, y, r, 0, Math.PI * 2); nctx.fill();
    nctx.globalAlpha = 0.4; nctx.beginPath(); nctx.arc(x, y, r * 0.74, 0, Math.PI * 2); nctx.fill();
    nctx.globalAlpha = 0.7; nctx.beginPath(); nctx.arc(x, y, r * 0.48, 0, Math.PI * 2); nctx.fill();
  }
  function propSprite(pr) {
    const f = state === 'title' ? {} : G.s.flags;
    let name = pr.s, v = pr.v || 0;
    if (pr.use === 'chest' && f[pr.id]) name = 'chestOpen';
    else if (pr.use === 'doltap' && f[pr.id]) name = 'doltap2';
    else if (pr.use === 'kite' && f.kiteTaken) { name = 'oak'; v = 2; }
    let sp = G.spr[name];
    if (Array.isArray(sp)) sp = pr.anim ? sp[Math.floor(time * 7) % sp.length] : sp[v % sp.length];
    return sp;
  }
  function render() {
    const sx = shakeAmt ? Math.round((Math.random() - 0.5) * shakeAmt) : 0, sy = shakeAmt ? Math.round((Math.random() - 0.5) * shakeAmt) : 0;
    const cx = Math.round(camx) + sx, cy = Math.round(camy) + sy;
    ctx.fillStyle = '#0c0b0f'; ctx.fillRect(0, 0, G.W, G.H);
    G.world.drawGround(ctx, cx, cy, time);

    vis.length = 0; G.world.visibleProps(cx, cy, vis);
    drawList.length = 0;
    for (const pr of vis) {
      if (pr.flat) { const sp = propSprite(pr); ctx.drawImage(sp, Math.round(pr.x - cx - (sp.ax !== undefined ? sp.ax : sp.width / 2)), Math.round(pr.y - cy - sp.height + 1)); }
      else drawList.push(pr);
    }
    for (const e of G.E.list) if (e.x > cx - 40 && e.x < cx + G.W + 40 && e.y > cy - 20 && e.y < cy + G.H + 80) drawList.push(e);
    if (state !== 'title') drawList.push(G.p);
    drawList.sort((a, b) => a.y - b.y);
    for (const o of drawList) {
      if (o === G.p) {
        if (state === 'dead') { const img = G.spr.player.down[0]; ctx.save(); ctx.translate(Math.round(o.x - cx), Math.round(o.y - cy) - 5); ctx.rotate(1.5708); ctx.drawImage(img, -8, -9); ctx.restore(); }
        else { G.E.shadow(ctx, o.x - cx, o.y - cy - 1, 12); o.draw(ctx, cx, cy); }
      } else if (o.type) G.E.draw(o, ctx, cx, cy);
      else {
        const sp = propSprite(o);
        ctx.drawImage(sp, Math.round(o.x - cx - (sp.ax !== undefined ? sp.ax : sp.width / 2)), Math.round(o.y - cy - sp.height + 1));
      }
    }
    G.E.drawParts(ctx, cx, cy);

    // 살필 수 있는 것 위에 작은 표시
    if (target) {
      const bx = Math.round(target.x - cx), by = Math.round(target.y - cy) + (Math.floor(time * 3) % 2);
      ctx.fillStyle = '#1b1a1f'; ctx.fillRect(bx - 4, by - 1, 9, 3); ctx.fillRect(bx - 3, by + 2, 7, 1); ctx.fillRect(bx - 2, by + 3, 5, 1); ctx.fillRect(bx - 1, by + 4, 3, 1);
      ctx.fillStyle = '#e6cc78'; ctx.fillRect(bx - 3, by, 7, 1); ctx.fillRect(bx - 2, by + 1, 5, 1); ctx.fillRect(bx - 1, by + 2, 3, 1); ctx.fillRect(bx, by + 3, 1, 1);
    }

    // 어스름과 밤
    const h = (state === 'title' ? 19.2 * 60 : G.s.time) / 60;
    if (!G.world.cur.dark && h > 16 && h < 20) {
      ctx.fillStyle = 'rgba(207,106,61,' + (0.16 * (1 - Math.abs(h - 18.2) / 2.2)).toFixed(3) + ')';
      if (Math.abs(h - 18.2) < 2.2) ctx.fillRect(0, 0, G.W, G.H);
    }
    const a = darkness();
    if (a > 0.01) {
      nctx.globalCompositeOperation = 'source-over'; nctx.globalAlpha = 1;
      nctx.clearRect(0, 0, G.W, G.H);
      nctx.fillStyle = G.world.cur.dark ? 'rgba(8,7,12,' + a + ')' : 'rgba(13,16,42,' + a + ')';
      nctx.fillRect(0, 0, G.W, G.H);
      nctx.globalCompositeOperation = 'destination-out'; nctx.fillStyle = '#fff';
      if (state !== 'title') light(G.p.x - cx, G.p.y - cy - 8, G.s.gear.lantern ? 70 : (G.world.cur.dark ? 44 : 36));
      for (const pr of vis) if (pr.light) light(pr.x - cx + (pr.ldx || 0), pr.y - cy + (pr.ldy || -8), pr.light + (pr.anim ? Math.sin(time * 9 + pr.x) * 2 : 0));
      for (const e of G.E.list) if (e.def && e.def.light) light(e.x - cx, e.y - cy - e.def.cy, e.def.light + Math.sin(time * 5 + e.x) * 2);
      ctx.drawImage(nightCv, 0, 0);
    }

    if (state === 'title') drawTitle();
    else {
      G.ui.hud(ctx, time);
      if (pass.fight && pass.boss && !pass.boss.dead) G.ui.bossBar(ctx, pass.boss);
      G.ui.draw(ctx, time);
    }
    if (fade.a > 0) { ctx.fillStyle = 'rgba(12,11,15,' + Math.min(1, fade.a).toFixed(3) + ')'; ctx.fillRect(0, 0, G.W, G.H); }
  }

  function drawTitle() {
    const TX = G.text;
    ctx.fillStyle = 'rgba(12,11,15,0.35)'; ctx.fillRect(0, 0, G.W, G.H);
    TX.draw(ctx, '재 너머', G.W / 2 + 2, 50, '#1b1a1f', 'big', 1, 3);
    TX.draw(ctx, '재 너머', G.W / 2, 48, '#f6f1e3', 'big', 1, 3);
    TX.drawS(ctx, '소금 지고 고개 넘는 이야기', G.W / 2, 100, '#e6cc78', 'big', 1);
    const opts = hasSave ? ['이어서 걷는다', '처음부터'] : ['길을 나선다'];
    for (let i = 0; i < opts.length; i++) {
      const y = 138 + i * 16, sel = i === titleSel;
      TX.drawS(ctx, opts[i], G.W / 2, y, sel ? '#f6f1e3' : '#8e8f8c', 'big', 1);
      if (sel) { const w = TX.width(opts[i]); ctx.fillStyle = '#e6cc78'; ctx.fillRect(G.W / 2 - w / 2 - 9, y + 6, 4, 2); ctx.fillRect(G.W / 2 + w / 2 + 5, y + 6, 4, 2); }
    }
    TX.drawS(ctx, 'Z / X / Enter', G.W / 2, 196, '#8e8f8c', 'small', 1);
  }

  // ---------- 시작 ----------
  function resize() {
    const host = canvas.parentElement;
    const ww = host.clientWidth || window.innerWidth, wh = host.clientHeight || window.innerHeight;
    let sc = Math.min(ww / G.W, wh / G.H);
    // 딱 떨어지는 배율이 화면을 거의 채울 때만 정수 배율로
    const fl = Math.floor(sc);
    if (fl >= 2 && fl / sc > 0.86) sc = fl;
    canvas.style.width = Math.floor(G.W * sc) + 'px';
    canvas.style.height = Math.floor(G.H * sc) + 'px';
  }
  let acc = 0, last = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    acc += Math.min(0.1, (t - last) / 1000); last = t;
    let n = 0;
    while (acc >= DT && n++ < 5) { update(); G.input.endFrame(); acc -= DT; }
    if (n >= 5) acc = 0;
    render();
  }

  G.main = {
    start() {
      canvas = document.getElementById('game');
      canvas.width = G.W; canvas.height = G.H;
      ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
      nightCv = G.art.cv(G.W, G.H); nctx = nightCv.getContext('2d');
      G.art.build();
      G.world.init();
      G.world.use('world');
      G.E.reset();
      G.s = fresh();
      hasSave = !!G.store.read();
      window.addEventListener('resize', resize); resize();
      last = performance.now();
      requestAnimationFrame(frame);
    },
    // 시험용 손잡이
    debug: { get state() { return state; }, pass, enter, tick(n) { for (let i = 0; i < n; i++) { update(); G.input.endFrame(); } render(); } }
  };
})();
