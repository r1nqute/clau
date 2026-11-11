'use strict';
// 화면 위에 얹히는 것: 대화, 고르기, 가게, 봇짐, 지도, 머리 위 표시
(function () {
  const G = window.G, TX = G.text;
  const INK = '#1b1a1f', PAPER = '#e8e2d0', LIGHT = '#f6f1e3', DIM = '#8e8f8c', GOLD = '#e6cc78', RED = '#cf6a3d';

  const q = [];
  let cur = null, inCb = false, ins = 0;
  function enq(it) { if (inCb) q.splice(ins++, 0, it); else q.push(it); }
  function call(fn, a) { inCb = true; ins = 0; try { fn(a); } finally { inCb = false; } }
  function next() {
    cur = null;
    while (q.length) {
      const it = q.shift();
      if (it.k === 'run') { call(it.fn); continue; }
      cur = it;
      if (it.k === 'shop') buildShop(it);
      return;
    }
  }

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = INK; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = PAPER;
    ctx.fillRect(x + 2, y + 1, w - 4, 1); ctx.fillRect(x + 2, y + h - 2, w - 4, 1);
    ctx.fillRect(x + 1, y + 2, 1, h - 4); ctx.fillRect(x + w - 2, y + 2, 1, h - 4);
  }
  function cursor(ctx, x, y) {
    ctx.fillStyle = GOLD;
    ctx.fillRect(x, y + 3, 1, 7); ctx.fillRect(x + 1, y + 4, 1, 5); ctx.fillRect(x + 2, y + 5, 1, 3); ctx.fillRect(x + 3, y + 6, 1, 1);
  }

  // ---------- 가게 ----------
  function buildShop(it) {
    const sh = G.SHOPS[it.id], s = G.s;
    it.buy = [];
    for (const [id, price] of sh.sell) {
      if (id[0] === '@') { const g = id.slice(1); if (!s.gear[g]) it.buy.push({ gear: g, price, name: G.GEAR[g].name, desc: G.GEAR[g].desc }); }
      else it.buy.push({ id, price, name: G.ITEMS[id].name, desc: G.ITEMS[id].desc });
    }
    if (it.id === 'jumak' && s.flags.crab === 2) it.buy.push({ id: 'muk', price: 5, name: G.ITEMS.muk.name, desc: G.ITEMS.muk.desc });
    it.sell = [];
    for (const id in s.inv) {
      if (!s.inv[id]) continue;
      const d = G.ITEMS[id];
      const price = sh.buys[id] || (it.id !== 'jumak' ? d.sell : 0);
      if (price) it.sell.push({ id, price, name: d.name, desc: d.desc });
    }
    if (it.tab === undefined) { it.tab = 0; it.sel = 0; }
    const list = it.tab ? it.sell : it.buy;
    it.sel = G.clamp(it.sel, 0, Math.max(0, list.length - 1));
  }
  function shopUpdate(it) {
    const I = G.input, s = G.s;
    const list = it.tab ? it.sell : it.buy;
    if (I.hit('left') || I.hit('right')) { it.tab = 1 - it.tab; it.sel = 0; G.sfx('move'); return; }
    if (I.hit('up') && list.length) { it.sel = (it.sel + list.length - 1) % list.length; G.sfx('move'); }
    if (I.hit('down') && list.length) { it.sel = (it.sel + 1) % list.length; G.sfx('move'); }
    if (I.back()) { G.sfx('move'); next(); return; }
    if (I.hit('a') || I.hit('b')) {
      const e = list[it.sel];
      if (!e) return;
      if (it.tab === 0) {
        if (s.money < e.price) { G.sfx('deny'); it.msg = '엽전이 모자란다.'; return; }
        if (e.gear) { s.money -= e.price; s.gear[e.gear] = 1; G.sfx('coin'); it.msg = e.name + ' — 샀다.'; }
        else {
          if (G.ITEMS[e.id].good && G.game.load() >= G.game.cap()) { G.sfx('deny'); it.msg = '지게가 찼다.'; return; }
          s.money -= e.price; s.inv[e.id] = (s.inv[e.id] || 0) + 1; G.sfx('coin'); it.msg = '';
          if (!s.quick && !G.ITEMS[e.id].good) s.quick = e.id;
        }
      } else {
        s.inv[e.id]--; s.money += e.price; G.sfx('coin'); it.msg = '';
      }
      buildShop(it);
    }
  }
  function shopDraw(ctx, it) {
    const s = G.s, sh = G.SHOPS[it.id];
    panel(ctx, 44, 14, 296, 190);
    TX.draw(ctx, sh.title, 56, 21, GOLD);
    TX.draw(ctx, '산다', 196, 21, it.tab === 0 ? LIGHT : DIM);
    TX.draw(ctx, '판다', 232, 21, it.tab === 1 ? LIGHT : DIM);
    ctx.fillStyle = GOLD; ctx.fillRect(it.tab ? 232 : 196, 35, 22, 1);
    ctx.drawImage(G.spr.coin, 278, 24);
    TX.draw(ctx, s.money + '푼', 330, 21, LIGHT, 'big', 2);
    ctx.fillStyle = '#33303a'; ctx.fillRect(52, 40, 280, 1);
    const list = it.tab ? it.sell : it.buy;
    if (!list.length) TX.draw(ctx, it.tab ? '팔 만한 것이 없다.' : '살 것이 없다.', 62, 46, DIM);
    const top = G.clamp(it.sel - 6, 0, Math.max(0, list.length - 8));
    for (let i = top; i < Math.min(list.length, top + 8); i++) {
      const e = list[i], y = 45 + (i - top) * 14;
      if (i === it.sel) cursor(ctx, 53, y);
      TX.draw(ctx, e.name, 62, y, i === it.sel ? LIGHT : PAPER);
      if (e.id) TX.draw(ctx, '가진 것 ' + (s.inv[e.id] || 0), 226, y, DIM, 'big', 2);
      TX.draw(ctx, e.price + '푼', 330, y, (it.tab === 0 && s.money < e.price) ? RED : GOLD, 'big', 2);
    }
    ctx.fillStyle = '#33303a'; ctx.fillRect(52, 159, 280, 1);
    const e = list[it.sel];
    const desc = it.msg || (e ? e.desc : '');
    const lines = TX.wrap(desc, 272, 'small');
    for (let i = 0; i < Math.min(2, lines.length); i++) TX.draw(ctx, lines[i], 56, 163 + i * 11, it.msg ? RED : PAPER, 'small');
    TX.draw(ctx, '짐 ' + G.game.load() + '/' + G.game.cap(), 330, 188, GOLD, 'small', 2);
    TX.draw(ctx, '←→ 사기·팔기   Z 고르기   C 나가기', 56, 188, DIM, 'small');
  }

  // ---------- 봇짐 ----------
  const TABS = ['봇짐', '할 일', '지도', '조작'];
  const menu = { open: false, tab: 0, sel: 0, mini: null };
  function invList() {
    const s = G.s, out = [];
    for (const id in s.inv) if (s.inv[id] > 0) out.push(id);
    const rank = id => { const d = G.ITEMS[id]; return d.heal || d.thrown ? 0 : d.good ? 1 : d.key ? 3 : 2; };
    out.sort((a, b) => rank(a) - rank(b));
    return out;
  }
  function menuUpdate() {
    const I = G.input;
    if (I.back() || I.hit('map')) { menu.open = false; G.sfx('move'); return; }
    if (I.hit('left')) { menu.tab = (menu.tab + TABS.length - 1) % TABS.length; menu.sel = 0; G.sfx('move'); }
    if (I.hit('right')) { menu.tab = (menu.tab + 1) % TABS.length; menu.sel = 0; G.sfx('move'); }
    if (menu.tab === 0) {
      const list = invList();
      if (I.hit('up') && list.length) { menu.sel = (menu.sel + list.length - 1) % list.length; G.sfx('move'); }
      if (I.hit('down') && list.length) { menu.sel = (menu.sel + 1) % list.length; G.sfx('move'); }
      menu.sel = G.clamp(menu.sel, 0, Math.max(0, list.length - 1));
      if ((I.hit('a') || I.hit('b')) && list.length) {
        const id = list[menu.sel], d = G.ITEMS[id];
        if (d.heal) G.game.eat(id);
        else if (d.thrown) { G.s.quick = id; G.sfx('ok'); }
        else G.sfx('deny');
      }
    }
  }
  function buildMini() {
    const m = G.world.maps.world, c = G.art.cv(m.w, m.h), x = c.getContext('2d');
    for (let ty = 0; ty < m.h; ty++) for (let tx = 0; tx < m.w; tx++) {
      x.fillStyle = G.world.miniColor(m.t[ty * m.w + tx]);
      x.fillRect(tx, ty, 1, 1);
    }
    x.fillStyle = '#3d6240';
    for (const p of m.props) if (p.s === 'pine' || p.s === 'oak') x.fillRect(Math.floor(p.x / 16), Math.floor(p.y / 16), 1, 1);
    x.fillStyle = '#46301f';
    for (const p of m.props) if (p.s === 'house' || p.s === 'neowa' || p.s === 'jumak' || p.s === 'hut') x.fillRect(Math.floor(p.x / 16) - 1, Math.floor(p.y / 16) - 1, 3, 2);
    return c;
  }
  const PLACES = [['소래', 36, 97], ['한내', 76, 69], ['숯막', 22, 55], ['절터', 132, 52], ['너와골', 68, 11], ['검은재', 72, 29]];
  function menuDraw(ctx, time) {
    const s = G.s;
    panel(ctx, 20, 10, 344, 196);
    let x = 34;
    for (let i = 0; i < TABS.length; i++) {
      TX.draw(ctx, TABS[i], x, 16, i === menu.tab ? LIGHT : DIM);
      if (i === menu.tab) { ctx.fillStyle = GOLD; ctx.fillRect(x, 30, TX.width(TABS[i]), 1); }
      x += TX.width(TABS[i]) + 16;
    }
    ctx.drawImage(G.spr.coin, 300, 19);
    TX.draw(ctx, s.money + '푼', 352, 16, LIGHT, 'big', 2);
    ctx.fillStyle = '#33303a'; ctx.fillRect(28, 34, 328, 1);

    if (menu.tab === 0) {
      const list = invList();
      if (!list.length) TX.draw(ctx, '빈 봇짐.', 44, 42, DIM);
      const top = G.clamp(menu.sel - 7, 0, Math.max(0, list.length - 9));
      for (let i = top; i < Math.min(list.length, top + 9); i++) {
        const id = list[i], d = G.ITEMS[id], y = 40 + (i - top) * 14;
        if (i === menu.sel) cursor(ctx, 31, y);
        TX.draw(ctx, d.name, 40, y, i === menu.sel ? LIGHT : PAPER);
        TX.draw(ctx, '' + s.inv[id], 150, y, GOLD, 'big', 2);
        if (id === s.quick) TX.draw(ctx, 'C', 156, y + 2, RED, 'small');
      }
      ctx.fillStyle = '#33303a'; ctx.fillRect(172, 40, 1, 124);
      TX.draw(ctx, '든 것', 182, 40, DIM, 'small');
      TX.draw(ctx, G.WEAPONS[s.gear.weapon].name, 182, 52, PAPER);
      let y = 66;
      TX.draw(ctx, s.gear.jige ? '큰 지게' : '지게', 182, y, PAPER);
      TX.draw(ctx, '짐 ' + G.game.load() + '/' + G.game.cap(), 348, y, GOLD, 'big', 2); y += 14;
      if (s.gear.shoes) { TX.draw(ctx, '새 짚신', 182, y, PAPER); y += 14; }
      if (s.gear.lantern) { TX.draw(ctx, '초롱', 182, y, PAPER); y += 14; }
      if (s.maxhp > 5) { TX.draw(ctx, '감 ' + s.maxhp + '개', 182, y, PAPER); y += 14; }
      TX.draw(ctx, G.game.dayText(), 182, 150, DIM, 'small');
      ctx.fillStyle = '#33303a'; ctx.fillRect(28, 168, 328, 1);
      if (list.length) {
        const d = G.ITEMS[list[menu.sel]];
        const lines = TX.wrap(d.desc, 320, 'small');
        for (let i = 0; i < Math.min(2, lines.length); i++) TX.draw(ctx, lines[i], 32, 171 + i * 10, PAPER, 'small');
        TX.draw(ctx, d.heal ? 'Z 먹는다' : d.thrown ? 'Z 손에 쥔다 (C로 던진다)' : '', 32, 192, DIM, 'small');
      }
    } else if (menu.tab === 1) {
      const log = G.questLog(s);
      if (!log.length) TX.draw(ctx, '아직 맡은 일이 없다.', 34, 42, DIM);
      let y = 40;
      for (const e of log) {
        if (y > 184) break;
        TX.draw(ctx, (e.done ? '○ ' : '● ') + e.title, 32, y, e.done ? DIM : GOLD);
        y += 14;
        for (const ln of TX.wrap(e.text, 300, 'small')) { TX.draw(ctx, ln, 46, y, e.done ? DIM : PAPER, 'small'); y += 11; }
        y += 4;
      }
    } else if (menu.tab === 2) {
      if (G.world.cur.id !== 'world') { TX.draw(ctx, '굴 속에서는 어디가 어딘지 알 수 없다.', 34, 42, DIM); return; }
      if (!menu.mini) menu.mini = buildMini();
      const ox = 112, oy = 46;
      ctx.fillStyle = PAPER; ctx.fillRect(ox - 2, oy - 2, 164, 124);
      ctx.drawImage(menu.mini, ox, oy);
      ctx.fillStyle = '#17141c';
      for (let cy = 0; cy < 15; cy++) for (let cx = 0; cx < 20; cx++) if (!s.explored[cy * 20 + cx]) ctx.fillRect(ox + cx * 8, oy + cy * 8, 8, 8);
      for (const [name, tx, ty] of PLACES) {
        if (!s.explored[(ty >> 3) * 20 + (tx >> 3)]) continue;
        TX.draw(ctx, name, ox + tx + 1, oy + ty - 11, INK, 'small', 1);
        TX.draw(ctx, name, ox + tx, oy + ty - 12, LIGHT, 'small', 1);
      }
      if (Math.floor(time * 3) % 2) { ctx.fillStyle = INK; ctx.fillRect(ox + Math.floor(G.p.x / 16) - 2, oy + Math.floor(G.p.y / 16) - 2, 5, 5); ctx.fillStyle = '#cf6a3d'; ctx.fillRect(ox + Math.floor(G.p.x / 16) - 1, oy + Math.floor(G.p.y / 16) - 1, 3, 3); }
      TX.draw(ctx, '가 본 곳만 그려진다.', 192, 176, DIM, 'small', 1);
    } else {
      const rows = [['걷기', '방향키 / WASD'], ['치기', 'Z / J'], ['말 걸기 · 살피기', 'X / K / Enter'], ['먹기 · 던지기', 'C / L'], ['쥔 것 바꾸기', 'Q'],
        ['구르기', 'Space / Shift'], ['봇짐', 'Esc / I / Tab'], ['지도', 'M'], ['소리 끄기', '0']];
      let y = 42;
      for (const [a, b] of rows) { TX.draw(ctx, a, 40, y, PAPER); TX.draw(ctx, b, 180, y, GOLD); y += 14; }
      TX.draw(ctx, '장승 앞에서 살피면 기록된다. 쓰러지면 마지막 장승에서 깬다.', 40, 176, DIM, 'small');
      TX.draw(ctx, '구르는 동안은 맞지 않는다.', 40, 188, DIM, 'small');
    }
  }

  // ---------- 바깥에서 부르는 것 ----------
  const toasts = [];
  let banner = null;
  const ui = G.ui = {
    say(name, text) {
      const arr = Array.isArray(text) ? text : [text];
      for (const t of arr) {
        const lines = TX.wrap(t, 344, 'big');
        for (let i = 0; i < lines.length; i += 3) {
          const pg = lines.slice(i, i + 3);
          enq({ k: 'say', name, lines: pg, n: 0, total: pg.join('').length });
        }
      }
    },
    choice(opts, cb) { enq({ k: 'choice', opts, cb, sel: 0 }); },
    run(fn) { enq({ k: 'run', fn }); },
    shop(id) { enq({ k: 'shop', id }); },
    card(lines) { enq({ k: 'card', lines, t: 0 }); },
    busy() { return cur !== null || q.length > 0 || menu.open; },
    talking() { return cur !== null || q.length > 0; },
    openMenu(tab) { menu.open = true; menu.tab = tab || 0; menu.sel = 0; G.sfx('move'); },
    toast(t) { toasts.push({ t, life: 3 }); if (toasts.length > 4) toasts.shift(); },
    banner(t) { banner = { t, life: 3 }; },
    reset() { q.length = 0; cur = null; menu.open = false; toasts.length = 0; banner = null; },

    update(dt) {
      for (let i = toasts.length - 1; i >= 0; i--) if ((toasts[i].life -= dt) <= 0) toasts.splice(i, 1);
      if (banner && (banner.life -= dt) <= 0) banner = null;
      if (!cur && q.length) next();
      if (cur) {
        const I = G.input;
        if (cur.k === 'say') {
          if (cur.n < cur.total) {
            const before = Math.floor(cur.n);
            cur.n = Math.min(cur.total, cur.n + dt * 42);
            if (Math.floor(cur.n) !== before && Math.floor(cur.n) % 3 === 0) G.sfx('talk');
            if (I.ok()) cur.n = cur.total;
          } else if (I.ok()) next();
        } else if (cur.k === 'choice') {
          const n = cur.opts.length;
          if (I.hit('up')) { cur.sel = (cur.sel + n - 1) % n; G.sfx('move'); }
          if (I.hit('down')) { cur.sel = (cur.sel + 1) % n; G.sfx('move'); }
          if (I.hit('a') || I.hit('b')) {
            const c = cur; cur = null; G.sfx('ok');
            call(c.cb.bind(null), c.sel);
            next();
          }
        } else if (cur.k === 'shop') shopUpdate(cur);
        else if (cur.k === 'card') { cur.t += dt; if (cur.t > 2.5 && I.ok()) next(); }
        return;
      }
      if (menu.open) menuUpdate();
    },

    draw(ctx, time) {
      if (cur && cur.k === 'card') {
        ctx.fillStyle = 'rgba(12,11,15,' + Math.min(1, cur.t * 1.2) + ')'; ctx.fillRect(0, 0, G.W, G.H);
        const h = cur.lines.length * 16, y0 = (G.H - h) / 2;
        for (let i = 0; i < cur.lines.length; i++) {
          if (cur.t < 0.8 + i * 0.45) break;
          const big = cur.lines[i] === '재 너머';
          TX.draw(ctx, cur.lines[i], G.W / 2, y0 + i * 16 - (big ? 6 : 0), big ? GOLD : i > 3 ? DIM : LIGHT, 'big', 1, big ? 2 : 1);
        }
        return;
      }
      if (cur && cur.k === 'shop') { shopDraw(ctx, cur); return; }
      if (menu.open && !cur) { menuDraw(ctx, time); return; }
      if (cur && (cur.k === 'say' || cur.k === 'choice')) {
        if (cur.k === 'say') {
          panel(ctx, 8, 154, 368, 56);
          if (cur.name) {
            const w = TX.width(cur.name) + 14;
            panel(ctx, 14, 141, w, 18);
            TX.draw(ctx, cur.name, 21, 144, GOLD);
          }
          let left = Math.floor(cur.n);
          for (let i = 0; i < cur.lines.length && left > 0; i++) {
            const ln = cur.lines[i];
            TX.draw(ctx, ln.slice(0, left), 20, 162 + i * 15, cur.name ? LIGHT : PAPER);
            left -= ln.length;
          }
          if (cur.n >= cur.total && Math.floor(time * 2.5) % 2) {
            ctx.fillStyle = GOLD; ctx.fillRect(360, 200, 7, 1); ctx.fillRect(361, 201, 5, 1); ctx.fillRect(362, 202, 3, 1); ctx.fillRect(363, 203, 1, 1);
          }
        } else {
          let w = 0;
          for (const o of cur.opts) w = Math.max(w, TX.width(o));
          const h = cur.opts.length * 15 + 12, x = 376 - w - 34, y = 208 - h;
          panel(ctx, x, y, w + 34, h);
          for (let i = 0; i < cur.opts.length; i++) {
            if (i === cur.sel) cursor(ctx, x + 9, y + 6 + i * 15);
            TX.draw(ctx, cur.opts[i], x + 19, y + 6 + i * 15, i === cur.sel ? LIGHT : DIM);
          }
        }
      }
    },

    hud(ctx, time) {
      const s = G.s;
      for (let i = 0; i < s.maxhp; i++) ctx.drawImage(i < s.hp ? G.spr.hpFull : G.spr.hpEmpty, 5 + i * 10, 5);
      ctx.drawImage(G.spr.coin, 378 - TX.width('' + s.money, 'small') - 10, 5);
      TX.drawS(ctx, '' + s.money, 378, 4, LIGHT, 'small', 2);
      TX.drawS(ctx, '짐 ' + G.game.load() + '/' + G.game.cap(), 378, 16, G.game.load() >= G.game.cap() ? RED : PAPER, 'small', 2);
      // 해와 달
      const hr = s.time / 60, night = hr >= 19.5 || hr < 5.5;
      const bx = 5, by = 18;
      ctx.fillStyle = INK; ctx.fillRect(bx, by, 9, 9);
      if (night) { ctx.fillStyle = '#b9d2cc'; ctx.fillRect(bx + 2, by + 1, 5, 7); ctx.fillRect(bx + 1, by + 2, 7, 5); ctx.fillStyle = INK; ctx.fillRect(bx + 4, by + 1, 4, 5); }
      else { ctx.fillStyle = hr > 17 ? '#cf6a3d' : '#e6cc78'; ctx.fillRect(bx + 2, by + 1, 5, 7); ctx.fillRect(bx + 1, by + 2, 7, 5); }
      TX.drawS(ctx, G.game.hourName(), 17, 17, PAPER, 'small');
      if (s.quick && s.inv[s.quick] > 0) {
        const t = G.ITEMS[s.quick].name + ' ' + s.inv[s.quick];
        const w = TX.width(t, 'small') + 20;
        ctx.fillStyle = 'rgba(27,26,31,0.75)'; ctx.fillRect(G.W - w - 4, G.H - 17, w, 13);
        TX.draw(ctx, 'C', G.W - w, G.H - 16, RED, 'small');
        TX.draw(ctx, t, G.W - 8, G.H - 16, LIGHT, 'small', 2);
      }
      let y = G.H - 18;
      for (let i = toasts.length - 1; i >= 0; i--) {
        const t = toasts[i];
        const w = TX.width(t.t, 'small') + 8;
        ctx.fillStyle = 'rgba(27,26,31,' + (t.life < 0.5 ? t.life * 1.5 : 0.75) + ')'; ctx.fillRect(4, y, w, 13);
        if (t.life > 0.25) TX.draw(ctx, t.t, 8, y + 1, LIGHT, 'small');
        y -= 15;
      }
      if (banner && banner.life < 2.7 && banner.life > 0.3) {
        const w = TX.width(banner.t) + 28;
        ctx.fillStyle = 'rgba(27,26,31,0.7)'; ctx.fillRect((G.W - w) / 2, 34, w, 19);
        ctx.fillStyle = GOLD; ctx.fillRect((G.W - w) / 2 + 4, 36, w - 8, 1); ctx.fillRect((G.W - w) / 2 + 4, 50, w - 8, 1);
        TX.draw(ctx, banner.t, G.W / 2, 37, LIGHT, 'big', 1);
      }
    },
    bossBar(ctx, e) {
      const w = 160, x = (G.W - w) / 2, y = 196;
      TX.drawS(ctx, '외다리', G.W / 2, y - 14, LIGHT, 'small', 1);
      ctx.fillStyle = INK; ctx.fillRect(x - 1, y - 1, w + 2, 6);
      ctx.fillStyle = '#7a2a24'; ctx.fillRect(x, y, w, 4);
      ctx.fillStyle = '#cf6a3d'; ctx.fillRect(x, y, Math.max(0, Math.round(w * e.hp / e.def.hp)), 4);
    },
    panel
  };
})();
