'use strict';
// 땅. 지형은 손으로 정한 좌표(마을·길·강·고개) 위에 씨앗 고정 잡음으로 가장자리만 흐트러뜨렸다.
// 매번 같은 지도가 나온다.
(function () {
  const G = window.G;
  const T = { GRASS: 0, DIRT: 1, SAND: 2, WATER: 3, SHALLOW: 4, ROCK: 5, SALT: 6, PADDY: 7, BRIDGE: 8, FLOOR: 9, MUD: 10, HIGH: 11, CAVEF: 12, CAVEW: 13, VOID: 14 };
  const SOLID_T = []; SOLID_T[T.WATER] = SOLID_T[T.ROCK] = SOLID_T[T.CAVEW] = SOLID_T[T.VOID] = 1;
  const HARD = []; HARD[T.SALT] = HARD[T.PADDY] = HARD[T.BRIDGE] = HARD[T.FLOOR] = HARD[T.VOID] = 1;

  const LOOKABLE = { jar: 1, well: 1, hay: 1, scarecrow: 1, boat: 1, wreck: 1, pagoda: 1, stall: 1, fire: 1, dangsan: 1, kiln: 1, sotdae: 1, stump: 1 };
  function makeMap(id, w, h) {
    return { id, w, h, t: new Uint8Array(w * h), solid: new Uint8Array(w * h), props: [], buckets: new Map(), chunks: new Map(), npcs: [], spawns: [], warps: [], dark: false };
  }
  function addProp(m, s, tx, ty, o) {
    const p = Object.assign({ s, x: tx * 16 + 8, y: ty * 16 + 15, v: 0 }, o || {});
    if (!p.use && LOOKABLE[s]) p.use = 'look';
    if (p.soft) { p.x += Math.floor(G.hash2(tx, ty, 91) * 11) - 5; p.y -= Math.floor(G.hash2(tx, ty, 92) * 9); p.v = G.hash2(tx, ty, 93) < 0.5 ? 0 : 1; }
    m.props.push(p);
    const k = (Math.floor(p.y / 128) << 8) | Math.floor(p.x / 128);
    let b = m.buckets.get(k);
    if (!b) m.buckets.set(k, b = []);
    b.push(p);
    return p;
  }
  function block(m, tx, ty, w, h) {
    for (let y = ty; y < ty + (h || 1); y++) for (let x = tx; x < tx + (w || 1); x++)
      if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.solid[y * m.w + x] = 1;
  }

  // ======================= 바깥 세상 =======================
  const VILLAGES = [[36, 97], [76, 69], [22, 55], [132, 52], [68, 11]];
  const FOREST = [28, 58, 25, 19];

  function buildWorld() {
    const W = 160, H = 120, m = makeMap('world', W, H), r = G.mulberry(90210);
    const res = new Uint8Array(W * H);
    const I = (x, y) => y * W + x;
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const get = (x, y) => inb(x, y) ? m.t[I(x, y)] : T.ROCK;
    const set = (x, y, t) => { if (inb(x, y)) m.t[I(x, y)] = t; };
    const mtop = x => Math.round(20 + G.fbm(x / 13, 0.5, 3) * 8);
    const mbot = x => Math.round(35 + G.fbm(x / 11, 0.5, 9) * 7);
    const coast = x => Math.round(107 + G.fbm(x / 12, 0.5, 5) * 5);
    m.mtop = mtop; m.mbot = mbot; m.coast = coast;

    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const mt = mtop(x), mb = mbot(x), c = coast(x);
      let t = T.GRASS;
      if (y < mt) t = T.HIGH;
      else if (y <= mb) t = T.ROCK;
      if (y > c) t = T.WATER;
      else if (y > c - 3) t = T.SAND;
      const e = 2 + G.vnoise(x / 5, y / 5, 13) * 2.5;
      if (y <= c && (x < e || x > W - 1 - e || y < e)) t = T.ROCK;
      if (t === T.GRASS && x > 96 && x < 151 && y > 88 && y < c - 3 && G.vnoise(x / 4, y / 4, 31) > 0.62) t = T.SHALLOW;
      set(x, y, t);
    }
    // 갯벌
    for (let x = 40; x <= 66; x++) { const c = coast(x); for (let y = c - 1; y <= c + 3; y++) set(x, y, T.MUD); }
    for (let x = 97; x <= 142; x++) { const c = coast(x); for (let y = c; y <= c + 1; y++) set(x, y, T.MUD); }

    function blob(cx, cy, rx, ry, t, keep) {
      for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        if (!inb(x, y)) continue;
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy + (G.vnoise(x / 2.5, y / 2.5, 19) - 0.5) * 0.5 < 1) {
          const cur = get(x, y);
          if (keep && (cur === T.WATER || cur === T.BRIDGE || cur === T.SALT)) continue;
          set(x, y, t);
          if (keep) res[I(x, y)] = 1;
        }
      }
    }
    blob(139, 72, 6, 4, T.ROCK); blob(9, 84, 4, 5, T.ROCK); blob(112, 78, 4, 3, T.ROCK);
    blob(40, 6, 5, 2, T.ROCK); blob(122, 8, 6, 3, T.ROCK);
    blob(106, 11, 5.5, 3.8, T.SHALLOW); blob(106, 11, 3.6, 2.2, T.WATER);
    blob(13, 67, 3, 2, T.WATER);

    function path(pts, wd, t, wig) {
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
        const len = Math.hypot(bx - ax, by - ay) || 1;
        for (let s = 0; s <= len; s += 0.35) {
          const k = s / len;
          let px = ax + (bx - ax) * k, py = ay + (by - ay) * k;
          if (wig) {
            const o = (G.vnoise(px / 6, py / 6, 17) - 0.5) * wig;
            px += -(by - ay) / len * o; py += (bx - ax) / len * o;
          }
          const x0 = Math.round(px - wd / 2), y0 = Math.round(py - wd / 2);
          for (let b = 0; b < wd; b++) for (let a = 0; a < wd; a++) {
            const x = x0 + a, y = y0 + b;
            if (!inb(x, y)) continue;
            const cur = get(x, y);
            if (t === T.DIRT && (cur === T.WATER || cur === T.BRIDGE)) set(x, y, T.BRIDGE);
            else set(x, y, t);
            res[I(x, y)] = 1;
          }
        }
      }
    }
    // 한내(강)
    path([[100, 33], [99, 44], [97, 52], [88, 60], [87, 70], [90, 80], [92, 92], [90, 102], [90, 114]], 3, T.WATER, 3);
    // 길
    const D = T.DIRT;
    path([[38, 98], [48, 91], [60, 81], [70, 73], [76, 70]], 2, D, 3);                   // 소래 – 한내
    path([[76, 68], [74, 56], [72, 46]], 2, D, 3);                                        // 한내 – 고개 아래
    path([[72, 46], [71, 39], [73, 33], [72, 28], [71, 23], [72, 16], [69, 12]], 3, D, 0); // 검은재
    path([[78, 69], [86, 68], [92, 67], [104, 62], [118, 55], [128, 53]], 2, D, 2);       // 한내 – 절터
    path([[72, 68], [60, 63], [46, 58], [34, 56], [25, 55]], 2, D, 3);                    // 한내 – 숯막
    path([[40, 99], [56, 100], [74, 99], [86, 99], [96, 98], [110, 97], [126, 100]], 2, D, 2); // 갯가 길
    path([[22, 53], [20, 48], [18, 45]], 2, D, 1);                                        // 숯막 – 서낭당
    path([[62, 11], [44, 13], [30, 11], [21, 11]], 2, D, 3);                              // 너와골 – 마루터기
    path([[75, 11], [90, 13], [100, 13]], 2, D, 2);                                       // 너와골 – 못
    blob(72, 28, 5.5, 4, D, true);                                                        // 씨름판

    // 굴 어귀: 절터 북동쪽 벼랑 밑
    let caveY = 60;
    while (caveY > 20 && get(138, caveY) !== T.ROCK) caveY--;
    path([[133, 55], [137, 50], [138.5, caveY + 2]], 2, D, 0);
    for (let x = 135; x <= 141; x++) { set(x, caveY, T.ROCK); set(x, caveY - 1, T.ROCK); }
    set(138, caveY, D); set(137, caveY + 1, D); set(138, caveY + 1, D); set(139, caveY + 1, D);
    res[I(137, caveY + 1)] = res[I(138, caveY + 1)] = res[I(139, caveY + 1)] = 1;
    m.cave = { tx: 138, ty: caveY };
    m.warps.push({ tx: 138, ty: caveY, to: 'cave', x: 17 * 16 + 8, y: 25 * 16 + 8, dir: 'up' });
    addProp(m, 'cavemouth', 138, caveY, { y: caveY * 16 + 15, flat: true });

    // 마당
    blob(37, 97, 9, 4.5, D, true); blob(76, 69, 8, 5, D, true); blob(22, 55, 4.5, 3.5, D, true);
    blob(68, 11, 8, 3.5, D, true); blob(18, 44, 3.5, 3, T.GRASS, true); blob(20, 10, 3, 2.5, T.HIGH, true);
    blob(128, 101, 3.5, 2.5, T.SAND, true);

    const reserve = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inb(x, y)) res[I(x, y)] = 1; };
    function house(kind, tx, ty, light) {
      for (let y = ty - 2; y <= ty + 2; y++) for (let x = tx - 1; x <= tx + 4; x++) {
        const c = get(x, y);
        if (c === T.ROCK || c === T.WATER) set(x, y, y < 30 ? T.HIGH : T.GRASS);
      }
      addProp(m, kind, tx + 2, ty + 1, { x: (tx + 2) * 16, y: (ty + 2) * 16 - 1, light: light === false ? 0 : 30, ldx: kind === 'jumak' ? -18 : 0, ldy: -12 });
      block(m, tx, ty, 4, 2); reserve(tx - 1, ty - 2, 6, 5);
      set(tx + 1, ty + 2, D); set(tx + 2, ty + 2, D);
    }
    // --- 소래 갯마을
    house('house', 28, 92); house('house', 35, 91); house('house', 42, 92); house('house', 45, 97, false);
    for (let y = 99; y <= 104; y++) for (let x = 13; x <= 27; x++) {
      const c = get(x, y);
      if (c === T.WATER || c === T.ROCK) continue;
      set(x, y, ((x - 13) % 5 !== 4 && (y - 99) % 3 !== 2) ? T.SALT : T.SAND); res[I(x, y)] = 1;
    }
    path([[28, 99], [34, 98]], 2, D, 0);
    { // 나루
      const c = coast(34);
      for (let y = c - 1; y <= c + 5; y++) { set(34, y, T.BRIDGE); set(35, y, T.BRIDGE); res[I(34, y)] = res[I(35, y)] = 1; }
      addProp(m, 'boat', 37, c + 4, { x: 38 * 16, flat: false });
      m.pier = { tx: 34, ty: c + 4 };
    }
    addProp(m, 'jangseung', 41, 99, { use: 'save', id: 'sorae' }); block(m, 41, 99);
    addProp(m, 'jar', 33, 93); addProp(m, 'jar', 34, 93, { x: 34 * 16 + 4 }); block(m, 33, 93, 2, 1);
    addProp(m, 'well', 40, 95); block(m, 40, 95);
    addProp(m, 'gam', 26, 95, { v: 0 }); block(m, 26, 95);
    addProp(m, 'gam', 47, 93, { v: 1 }); block(m, 47, 93);
    addProp(m, 'sotdae', 43, 101); block(m, 43, 101);
    m.npcs.push({ id: 'yeom', tx: 37, ty: 94 }, { id: 'kid', tx: 31, ty: 96 }, { id: 'anak', tx: 21, ty: 98 }, { id: 'fisher', tx: 36, ty: coast(36) - 1 });

    // --- 한내 장터
    house('jumak', 69, 63); house('house', 79, 62); house('house', 65, 69);
    addProp(m, 'stall', 75, 66, { x: 75 * 16 + 8, v: 0 }); block(m, 74, 66, 2, 1); reserve(74, 65, 3, 2);
    addProp(m, 'stall', 80, 67, { x: 80 * 16 + 8, v: 1 }); block(m, 79, 67, 2, 1); reserve(79, 66, 3, 2);
    addProp(m, 'jangseung', 73, 72, { use: 'save', id: 'hannae' }); block(m, 73, 72);
    addProp(m, 'fire', 77, 70, { anim: true, light: 54 }); block(m, 77, 70);
    addProp(m, 'jar', 68, 65); block(m, 68, 65);
    addProp(m, 'gam', 83, 65, { v: 0 }); block(m, 83, 65);
    addProp(m, 'sign', 75, 60, { use: 'sign', id: 'north' }); block(m, 75, 60);
    addProp(m, 'sign', 63, 79, { use: 'sign', id: 'mid' }); block(m, 63, 79);
    m.npcs.push({ id: 'jumo', tx: 71, ty: 66 }, { id: 'peddler', tx: 76, ty: 67 }, { id: 'grain', tx: 81, ty: 68 });

    // --- 숯막
    addProp(m, 'hut', 20, 53, { x: 20 * 16 + 8, y: 54 * 16 - 1 }); block(m, 19, 53, 3, 1); reserve(18, 51, 5, 3);
    addProp(m, 'kiln', 25, 53, { x: 25 * 16 + 8, y: 54 * 16 - 1, light: 22, ldy: -4 }); block(m, 24, 53, 3, 1); reserve(24, 51, 3, 3);
    addProp(m, 'stump', 21, 57); block(m, 21, 57);
    m.npcs.push({ id: 'coal', tx: 23, ty: 55 });
    // --- 서낭당
    addProp(m, 'dangsan', 18, 43); block(m, 18, 43); reserve(16, 40, 5, 4);
    addProp(m, 'doltap', 20, 44, { use: 'doltap', id: 'd1' }); block(m, 20, 44);
    addProp(m, 'sotdae', 16, 45); block(m, 16, 45);

    // --- 절터
    for (let y = 49; y <= 55; y++) for (let x = 127; x <= 137; x++) {
      if (G.hash2(x, y, 61) < 0.86) set(x, y, T.FLOOR);
      res[I(x, y)] = 1;
    }
    addProp(m, 'pagoda', 132, 51); block(m, 131, 51, 2, 1);
    for (const [x, y] of [[128, 50], [136, 50], [128, 54], [136, 54], [130, 49], [134, 49]]) { addProp(m, 'rock', x, y, { v: 0 }); block(m, x, y); }
    addProp(m, 'doltap', 135, 52, { use: 'doltap', id: 'd3' }); block(m, 135, 52);
    addProp(m, 'jangseung', 125, 55, { use: 'save', id: 'temple' }); block(m, 125, 55); reserve(124, 53, 3, 3);
    m.npcs.push({ id: 'monk', tx: 130, ty: 53 });

    // --- 너와골
    house('neowa', 61, 7); house('neowa', 67, 6); house('neowa', 74, 7);
    addProp(m, 'jangseung', 73, 14, { use: 'save', id: 'neowa' }); block(m, 73, 14); reserve(72, 12, 3, 3);
    addProp(m, 'fire', 70, 12, { anim: true, light: 54 }); block(m, 70, 12);
    addProp(m, 'jar', 66, 9); block(m, 66, 9);
    m.npcs.push({ id: 'ijang', tx: 69, ty: 9 }, { id: 'herb', tx: 63, ty: 10 }, { id: 'dallae', tx: 76, ty: 10 });

    // --- 고개 아래 장승, 씨름판 돌
    addProp(m, 'jangseung', 74, 47, { use: 'save', id: 'pass' }); block(m, 74, 47); reserve(73, 45, 3, 3);
    addProp(m, 'sign', 70, 45, { use: 'sign', id: 'pass' }); block(m, 70, 45); reserve(69, 44, 2, 2);
    // --- 흩어진 것들
    addProp(m, 'doltap', 130, 100, { use: 'doltap', id: 'd2' }); block(m, 130, 100);
    addProp(m, 'wreck', 127, 102, { x: 127 * 16 }); block(m, 126, 102, 2, 1);
    addProp(m, 'chest', 129, 102, { use: 'chest', id: 'c_wreck' }); block(m, 129, 102);
    addProp(m, 'doltap', 19, 9, { use: 'doltap', id: 'd4' }); block(m, 19, 9);
    addProp(m, 'chest', 21, 9, { use: 'chest', id: 'c_view' }); block(m, 21, 9);
    addProp(m, 'doltap', 101, 12, { use: 'doltap', id: 'd5' }); block(m, 101, 12); reserve(100, 11, 3, 3);
    // 연이 걸린 나무
    set(112, 94, T.GRASS); set(112, 95, T.GRASS); set(111, 95, T.GRASS); set(113, 95, T.GRASS);
    addProp(m, 'kitetree', 112, 94, { use: 'kite', id: 'kite' }); block(m, 112, 94); reserve(110, 92, 5, 5);

    // --- 논
    for (let oy = 77; oy <= 89; oy += 5) for (let ox = 44; ox <= 65; ox += 7) {
      let ok = true;
      for (let y = oy; y < oy + 4 && ok; y++) for (let x = ox; x < ox + 6; x++) if (get(x, y) !== T.GRASS) { ok = false; break; }
      if (!ok) continue;
      let any = false;
      for (let y = oy; y < oy + 4; y++) for (let x = ox; x < ox + 6; x++) if (!res[I(x, y)]) { set(x, y, T.PADDY); res[I(x, y)] = 2; any = true; }
      if (any && r() < 0.7) {
        const hx = ox + 1 + Math.floor(r() * 4), hy = oy + 1 + Math.floor(r() * 2);
        if (res[I(hx, hy)] === 2) { addProp(m, r() < 0.3 ? 'scarecrow' : 'hay', hx, hy); block(m, hx, hy); }
      }
    }

    // --- 나무, 갈대, 돌
    const inForest = (x, y) => { const dx = (x - FOREST[0]) / FOREST[2], dy = (y - FOREST[1]) / FOREST[3]; return dx * dx + dy * dy + (G.vnoise(x / 4, y / 4, 23) - 0.5) * 0.5 < 1; };
    m.inForest = inForest;
    const nearWater = (x, y) => get(x + 1, y) === T.WATER || get(x - 1, y) === T.WATER || get(x, y + 1) === T.WATER || get(x, y - 1) === T.WATER;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (res[I(x, y)] || m.solid[I(x, y)]) continue;
      const t = get(x, y), q = r(), q2 = r();
      const grove = G.vnoise(x / 8, y / 8, 41);
      if (t === T.GRASS) {
        const marsh = x > 94 && y > 87;
        if (marsh) {
          if (q < 0.42) addProp(m, 'reed', x, y, { v: 0, soft: true });
          else if (q < 0.44) { addProp(m, 'bush', x, y, { v: q2 < 0.5 ? 0 : 1 }); block(m, x, y); }
          continue;
        }
        if (nearWater(x, y) && q < 0.45) { addProp(m, 'reed', x, y, { soft: true }); continue; }
        const f = inForest(x, y);
        const den = f ? (grove > 0.35 ? 0.34 : 0.14) : (grove > 0.66 ? 0.24 : 0.014);
        if (q < den) {
          if (f) addProp(m, 'pine', x, y, { v: Math.floor(q2 * 3) });
          else addProp(m, q2 < 0.2 ? 'pine' : 'oak', x, y, { v: Math.floor(q2 * 31) % 3 });
          block(m, x, y);
        } else if (q < den + 0.012) { addProp(m, 'bush', x, y, { v: q2 < 0.5 ? 0 : 1 }); block(m, x, y); }
        else if (q < den + 0.02) { addProp(m, 'rock', x, y, { v: q2 < 0.6 ? 0 : 1 }); block(m, x, y); }
        else if (f && q < den + 0.035) { addProp(m, 'stump', x, y); block(m, x, y); }
      } else if (t === T.HIGH) {
        const den = grove > 0.66 ? 0.3 : 0.02;
        if (q < den) { addProp(m, 'pine', x, y, { v: Math.floor(q2 * 3) }); block(m, x, y); }
        else if (q < den + 0.02) { addProp(m, 'rock', x, y, { v: q2 < 0.4 ? 2 : 1 }); block(m, x, y); }
      } else if (t === T.ROCK) {
        if (y > 4 && get(x, y + 1) === T.ROCK && get(x, y - 1) === T.ROCK) {
          if (q < 0.07) addProp(m, 'pine', x, y, { v: Math.floor(q2 * 3) });
          else if (q < 0.1) addProp(m, 'rock', x, y, { v: 2 });
        }
      } else if (t === T.SHALLOW) {
        if (q < 0.3) addProp(m, 'reed', x, y, { soft: true });
      } else if (t === T.SAND) {
        if (q < 0.008) { addProp(m, 'rock', x, y, { v: 0 }); block(m, x, y); }
      }
    }

    // --- 나오는 것들
    const zones = [
      [44, 101, 132, 111, 'crab', 13, 0, [T.SAND, T.MUD]],
      [96, 88, 148, 104, 'snake', 8, 0, [T.GRASS, T.SHALLOW]],
      [96, 88, 148, 104, 'wisp', 6, 1, [T.GRASS, T.SHALLOW]],
      [62, 40, 82, 48, 'wisp', 2, 1, [T.GRASS, T.DIRT]],
      [44, 74, 70, 93, 'dog', 4, 0, [T.GRASS, T.PADDY]],
      [96, 54, 126, 72, 'dog', 5, 0, [T.GRASS]],
      [50, 44, 70, 60, 'dog', 3, 0, [T.GRASS]],
      [5, 40, 50, 76, 'boar', 9, 0, [T.GRASS]],
      [5, 4, 56, 19, 'wolf', 5, 0, [T.HIGH]],
      [84, 4, 155, 19, 'wolf', 6, 0, [T.HIGH]]
    ];
    for (const [x0, y0, x1, y1, type, n, night, ok] of zones) {
      let made = 0, tries = 0;
      while (made < n && tries++ < 4000) {
        const x = x0 + Math.floor(r() * (x1 - x0)), y = y0 + Math.floor(r() * (y1 - y0));
        if (!inb(x, y) || m.solid[I(x, y)] || ok.indexOf(get(x, y)) < 0) continue;
        if (type === 'boar' && !inForest(x, y)) continue;
        if (VILLAGES.some(v => Math.hypot(v[0] - x, v[1] - y) < 10)) continue;
        if (m.spawns.some(s => Math.hypot(s.x / 16 - x, s.y / 16 - y) < 4)) continue;
        m.spawns.push({ x: x * 16 + 8, y: y * 16 + 12, type, night });
        made++;
      }
    }
    m.start = { x: 38 * 16 + 8, y: 96 * 16 + 8 };
    return m;
  }

  // ======================= 도깨비굴 =======================
  const CAVE = [
    '############################################',
    '############################################',
    '#######......###########....################',
    '#####..........########.......##############',
    '####....b.......######....d....#############',
    '####.............####...........############',
    '#####......o.....###.............###########',
    '######...........##.....F........###########',
    '########....###..........##......###########',
    '##########..####........####....############',
    '##########..#####......#####...#############',
    '#########...######....######..##############',
    '########....#######..#######..##############',
    '########..b.########.########..#############',
    '#######....#########.#########..############',
    '#######.....########.##########..###########',
    '########.....######...########....##########',
    '#########.....####.....######......#########',
    '##########.....##...d...####...d....########',
    '###########.............###....o....########',
    '############...........####....C....########',
    '#############....b....######.......#########',
    '##############.......########..c.###########',
    '###############.....########################',
    '################...#########################',
    '################...#########################',
    '################.E.#########################',
    '############################################'
  ];
  function buildCave(world) {
    const h = CAVE.length, w = CAVE[0].length, m = makeMap('cave', w, h);
    m.dark = true;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = CAVE[y][x];
      m.t[y * w + x] = ch === '#' ? T.CAVEW : T.CAVEF;
      const px = x * 16 + 8, py = y * 16 + 12;
      if (ch === 'b') m.spawns.push({ x: px, y: py, type: 'bat', night: 0 });
      else if (ch === 'd') m.spawns.push({ x: px, y: py, type: 'imp', night: 0 });
      else if (ch === 'o') { addProp(m, 'rock', x, y, { v: 2 }); block(m, x, y); }
      else if (ch === 'F') { addProp(m, 'fire', x, y, { anim: true, light: 60 }); block(m, x, y); }
      else if (ch === 'C') { addProp(m, 'chest', x, y, { use: 'chest', id: 'c_moktak' }); block(m, x, y); }
      else if (ch === 'c') { addProp(m, 'chest', x, y, { use: 'chest', id: 'c_cave' }); block(m, x, y); }
      else if (ch === 'E') m.warps.push({ tx: x, ty: y, to: 'world', x: world.cave.tx * 16 + 8, y: (world.cave.ty + 1) * 16 + 12, dir: 'down' });
    }
    return m;
  }

  // ======================= 바닥 그리기 =======================
  const hex = s => { const n = parseInt(s.slice(1), 16); return 0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16); };
  const C = {};
  ['#718c45', '#62803f', '#9c9a56', '#5f7a3c', '#88a04e', '#b08f62', '#9a7a50', '#c4a676', '#8f7049', '#d6c48e', '#c6b27a', '#e6d8a8', '#bda972',
    '#7a6e5e', '#6a5f51', '#958a78', '#3f6f86', '#396780', '#d7e6da', '#6b9aa6', '#2f566e', '#5b8a8f', '#4e7a80', '#86b0ac',
    '#5c554f', '#4e4843', '#3b3632', '#9a9488', '#5f5a54', '#7d7870', '#746f68', '#666159', '#918b80',
    '#7f8a56', '#6c7b4d', '#94905f', '#667446', '#98a068', '#c9d3cf', '#f2f2ea', '#a9bcbb', '#8a7a66', '#a08a55', '#d7bd6c', '#8f7a4a', '#8a7a55',
    '#8f6f48', '#6b4a32', '#46301f', '#77746c', '#9d998e', '#8b877d', '#7d8a5a', '#4b4651', '#403b46', '#5a5560', '#2f2a36', '#272230', '#1d1922', '#17141c', '#221e28', '#0c0b0f'
  ].forEach(s => C[s] = hex(s));

  function terrainAt(m, wx, wy) {
    const w = m.w, h = m.h;
    let tx = wx >> 4, ty = wy >> 4;
    tx = tx < 0 ? 0 : tx >= w ? w - 1 : tx; ty = ty < 0 ? 0 : ty >= h ? h - 1 : ty;
    const t = m.t[ty * w + tx];
    if (HARD[t]) return t;
    const ox = (G.vnoise(wx / 6, wy / 6, 101) - 0.5) * 9, oy = (G.vnoise(wx / 6, wy / 6, 202) - 0.5) * 9;
    let ux = (wx + ox) >> 4, uy = (wy + oy) >> 4;
    ux = ux < 0 ? 0 : ux >= w ? w - 1 : ux; uy = uy < 0 ? 0 : uy >= h ? h - 1 : uy;
    const t2 = m.t[uy * w + ux];
    return HARD[t2] ? t : t2;
  }

  const CH = 256, MG = 12, SZ = CH + MG * 2;
  function paintChunk(m, cx, cy) {
    const terr = new Uint8Array(SZ * SZ);
    const bx = cx * CH - MG, by = cy * CH - MG;
    for (let py = 0; py < SZ; py++) for (let px = 0; px < SZ; px++) terr[py * SZ + px] = terrainAt(m, bx + px, by + py);
    const cvs = G.art.cv(CH, CH), ctx = cvs.getContext('2d');
    const img = ctx.createImageData(CH, CH), out = new Uint32Array(img.data.buffer);
    const tileAt = (x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h) ? -1 : m.t[y * m.w + x];
    const wet = t => t === T.WATER || t === T.SHALLOW || t === T.BRIDGE;
    const grassy = t => t === T.GRASS || t === T.HIGH;
    for (let py = 0; py < CH; py++) for (let px = 0; px < CH; px++) {
      const i = (py + MG) * SZ + px + MG, t = terr[i];
      const wx = bx + MG + px, wy = by + MG + py;
      const h = G.hash2(wx, wy, 1);
      let c;
      switch (t) {
        case T.GRASS: {
          const n = G.vnoise(wx / 38, wy / 38, 7);
          c = n > 0.63 ? C['#9c9a56'] : n < 0.32 ? C['#62803f'] : C['#718c45'];
          if (h < 0.045) c = C['#5f7a3c']; else if (h > 0.965) c = C['#88a04e'];
          break;
        }
        case T.HIGH: {
          const n = G.vnoise(wx / 30, wy / 30, 8);
          c = n > 0.66 ? C['#94905f'] : n < 0.34 ? C['#6c7b4d'] : C['#7f8a56'];
          if (h < 0.045) c = C['#667446']; else if (h > 0.965) c = C['#98a068'];
          break;
        }
        case T.DIRT:
          c = h < 0.06 ? C['#9a7a50'] : h > 0.95 ? C['#c4a676'] : C['#b08f62'];
          if (grassy(terr[i - SZ]) || terr[i - SZ] === T.ROCK) c = C['#8f7049'];
          break;
        case T.SAND:
          c = h < 0.06 ? C['#c6b27a'] : h > 0.95 ? C['#e6d8a8'] : C['#d6c48e'];
          if (grassy(terr[i - SZ])) c = C['#bda972'];
          break;
        case T.MUD:
          c = h < 0.08 ? C['#6a5f51'] : h > 0.95 ? C['#958a78'] : C['#7a6e5e'];
          if ((wy + Math.floor(G.vnoise(wx / 9, wy / 4, 4) * 5)) % 7 === 0) c = C['#6a5f51'];
          break;
        case T.WATER:
          c = G.vnoise(wx / 22, wy / 12, 6) > 0.6 ? C['#396780'] : C['#3f6f86'];
          if (!wet(terr[i - SZ])) c = C['#d7e6da'];
          else if (!wet(terr[i - SZ * 2]) || !wet(terr[i - 1]) || !wet(terr[i + 1])) c = C['#6b9aa6'];
          else if (!wet(terr[i + SZ])) c = C['#2f566e'];
          break;
        case T.SHALLOW:
          c = h < 0.07 ? C['#4e7a80'] : h > 0.955 ? C['#86b0ac'] : C['#5b8a8f'];
          if (!wet(terr[i - SZ])) c = C['#4e7a80'];
          break;
        case T.ROCK: {
          const below = terr[i + SZ * 10];
          if (below !== T.ROCK) {
            c = G.hash2(wx >> 1, wy >> 3, 2) < 0.3 ? C['#4e4843'] : C['#5c554f'];
            if (terr[i + SZ * 2] !== T.ROCK) c = C['#3b3632'];
          } else if (terr[i - SZ] !== T.ROCK || terr[i - SZ * 2] !== T.ROCK) c = C['#9a9488'];
          else {
            const b0 = Math.floor(G.vnoise(wx / 30, wy / 20, 55) * 8), b1 = Math.floor(G.vnoise(wx / 30, (wy + 2) / 20, 55) * 8);
            if (b0 !== b1) c = C['#5f5a54'];
            else c = b0 & 1 ? C['#7d7870'] : C['#746f68'];
            if (h < 0.03) c = C['#666159']; else if (h > 0.975) c = C['#918b80'];
          }
          break;
        }
        case T.SALT: case T.PADDY: {
          const tx = wx >> 4, ty = wy >> 4, lx = wx & 15, ly = wy & 15;
          const edge = (lx === 0 && tileAt(tx - 1, ty) !== t) || (lx === 15 && tileAt(tx + 1, ty) !== t) || (ly === 0 && tileAt(tx, ty - 1) !== t) || (ly === 15 && tileAt(tx, ty + 1) !== t);
          if (t === T.SALT) c = edge ? C['#8a7a66'] : h < 0.1 ? C['#f2f2ea'] : h > 0.93 ? C['#a9bcbb'] : C['#c9d3cf'];
          else c = edge ? C['#8a7a55'] : (ly & 3) === 2 ? (((lx + (wy >> 2)) % 3 === 0) ? C['#d7bd6c'] : C['#8f7a4a']) : C['#a08a55'];
          break;
        }
        case T.BRIDGE: {
          const tx = wx >> 4, ty = wy >> 4, lx = wx & 15, ly = wy & 15;
          const wl = tileAt(tx - 1, ty) === T.WATER, wr = tileAt(tx + 1, ty) === T.WATER, wu = tileAt(tx, ty - 1) === T.WATER, wd = tileAt(tx, ty + 1) === T.WATER;
          c = (wl || wr) ? (ly % 5 === 0 ? C['#6b4a32'] : C['#8f6f48']) : (lx % 5 === 0 ? C['#6b4a32'] : C['#8f6f48']);
          if ((wl && lx < 2) || (wr && lx > 13) || (wu && ly < 2) || (wd && ly > 13)) c = C['#46301f'];
          break;
        }
        case T.FLOOR: {
          const row = wy >> 3;
          c = ((wy & 7) === 0 || ((wx + (row & 1) * 8) & 15) === 0) ? C['#77746c'] : h < 0.06 ? C['#8b877d'] : h > 0.955 ? C['#7d8a5a'] : C['#9d998e'];
          break;
        }
        case T.CAVEF:
          c = h < 0.07 ? C['#403b46'] : h > 0.95 ? C['#5a5560'] : C['#4b4651'];
          if (terr[i - SZ] === T.CAVEW) c = C['#403b46'];
          break;
        case T.CAVEW:
          if (terr[i + SZ * 12] === T.CAVEF) {
            c = G.hash2(wx >> 1, wy >> 3, 3) < 0.3 ? C['#272230'] : C['#2f2a36'];
            if (terr[i + SZ] === T.CAVEF) c = C['#1d1922'];
          } else c = h > 0.975 ? C['#221e28'] : C['#17141c'];
          break;
        default: c = C['#0c0b0f'];
      }
      out[py * CH + px] = c;
    }
    ctx.putImageData(img, 0, 0);
    // 풀포기, 들꽃, 자갈
    const dot = (col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(x, y, w || 1, h || 1); };
    for (let ty = cy * 16; ty < cy * 16 + 16; ty++) for (let tx = cx * 16; tx < cx * 16 + 16; tx++) {
      const t = tileAt(tx, ty);
      if (t < 0) continue;
      const hh = G.hash2(tx, ty, 77);
      const ox = 2 + Math.floor(G.hash2(tx, ty, 78) * 9), oy = 2 + Math.floor(G.hash2(tx, ty, 79) * 9);
      const X = tx * 16 + ox - cx * CH, Y = ty * 16 + oy - cy * CH;
      if (terr[(Y + MG) * SZ + X + MG] !== t || terr[(Y + MG + 3) * SZ + X + MG + 4] !== t) continue;
      if (t === T.GRASS || t === T.HIGH) {
        const dk = t === T.GRASS ? '#557238' : '#5c6b42', lt = t === T.GRASS ? '#93a856' : '#a0a66c';
        if (hh < 0.24) {
          dot(dk, X, Y + 1, 1, 2); dot(dk, X + 2, Y, 1, 3); dot(dk, X + 4, Y + 1, 1, 2);
          if (hh < 0.1) dot(lt, X + 2, Y, 1, 1);
        } else if (hh < 0.275) {
          dot('#f6f1e3', X + 1, Y); dot('#f6f1e3', X, Y + 1); dot('#f6f1e3', X + 2, Y + 1); dot('#f6f1e3', X + 1, Y + 2); dot('#e6cc78', X + 1, Y + 1);
        } else if (hh < 0.3) {
          dot('#a678a0', X + 1, Y); dot('#a678a0', X, Y + 1); dot('#a678a0', X + 2, Y + 1); dot('#a678a0', X + 1, Y + 2); dot('#e6cc78', X + 1, Y + 1);
          dot(dk, X + 1, Y + 3, 1, 2);
        }
      } else if (t === T.DIRT) {
        if (hh < 0.12) { dot('#7d6444', X, Y + 1, 3, 1); dot('#a7a59c', X, Y, 2, 1); }
      } else if (t === T.SAND) {
        if (hh < 0.07) { dot('#f6f1e3', X, Y, 2, 1); dot('#cf9a8a', X, Y + 1, 2, 1); }
      } else if (t === T.CAVEF) {
        if (hh < 0.1) { dot('#35303b', X, Y + 1, 3, 1); dot('#6a6570', X, Y, 2, 1); }
      }
    }
    return cvs;
  }

  // ======================= 바깥에서 쓰는 것 =======================
  const MINI = [];
  MINI[T.GRASS] = '#718c45'; MINI[T.DIRT] = '#c4a676'; MINI[T.SAND] = '#d6c48e'; MINI[T.WATER] = '#3f6f86'; MINI[T.SHALLOW] = '#5b8a8f';
  MINI[T.ROCK] = '#6a655f'; MINI[T.SALT] = '#dfe6e2'; MINI[T.PADDY] = '#a89358'; MINI[T.BRIDGE] = '#8f6f48'; MINI[T.FLOOR] = '#9d998e';
  MINI[T.MUD] = '#7a6e5e'; MINI[T.HIGH] = '#7f8a56';

  const world = G.world = {
    T, maps: {}, cur: null,
    init() {
      this.maps.world = buildWorld();
      this.maps.cave = buildCave(this.maps.world);
      this.cur = this.maps.world;
    },
    use(id) { this.cur = this.maps[id]; },
    tile(tx, ty) {
      const m = this.cur;
      return (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) ? T.VOID : m.t[ty * m.w + tx];
    },
    solidTile(tx, ty) {
      const m = this.cur;
      if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return true;
      const i = ty * m.w + tx;
      return !!(SOLID_T[m.t[i]] || m.solid[i]);
    },
    // 발밑 상자(가운데 x, 아래 y, 너비 w, 높이 h)가 막히는가
    boxBlocked(x, y, w, h) {
      const x0 = Math.floor((x - w / 2) / 16), x1 = Math.floor((x + w / 2 - 0.01) / 16);
      const y0 = Math.floor((y - h) / 16), y1 = Math.floor((y - 0.01) / 16);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.solidTile(tx, ty)) return true;
      return false;
    },
    chunk(cx, cy) {
      const m = this.cur, k = cy * 64 + cx;
      let c = m.chunks.get(k);
      if (!c) { c = paintChunk(m, cx, cy); m.chunks.set(k, c); }
      return c;
    },
    drawGround(ctx, camx, camy, time) {
      const m = this.cur;
      const cx0 = Math.floor(camx / CH), cx1 = Math.floor((camx + G.W - 1) / CH);
      const cy0 = Math.floor(camy / CH), cy1 = Math.floor((camy + G.H - 1) / CH);
      const mcx = Math.ceil(m.w / 16), mcy = Math.ceil(m.h / 16);
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        if (cx < 0 || cy < 0 || cx >= mcx || cy >= mcy) continue;
        ctx.drawImage(this.chunk(cx, cy), cx * CH - camx, cy * CH - camy);
      }
      // 화면 밖 한 칸은 한 프레임에 하나씩 미리 칠해 둔다
      let warmed = false;
      for (let cy = cy0 - 1; cy <= cy1 + 1 && !warmed; cy++) for (let cx = cx0 - 1; cx <= cx1 + 1; cx++) {
        if (cx < 0 || cy < 0 || cx >= mcx || cy >= mcy) continue;
        if (!m.chunks.has(cy * 64 + cx)) { this.chunk(cx, cy); warmed = true; break; }
      }
      // 물결
      const tx0 = Math.floor(camx / 16), ty0 = Math.floor(camy / 16);
      ctx.fillStyle = '#6fa0ad';
      for (let ty = ty0; ty <= ty0 + 14; ty++) for (let tx = tx0; tx <= tx0 + 24; tx++) {
        if (this.tile(tx, ty) !== T.WATER) continue;
        const hh = G.hash2(tx, ty, 5);
        if (hh > 0.34) continue;
        if (this.tile(tx - 1, ty) !== T.WATER || this.tile(tx + 1, ty) !== T.WATER || this.tile(tx, ty - 1) !== T.WATER || this.tile(tx, ty + 1) !== T.WATER) continue;
        const ph = (time * 0.5 + hh * 31) % 3;
        if (ph > 1.4) continue;
        const X = tx * 16 + Math.floor(hh * 290) % 9 + Math.floor(ph * 3) - camx, Y = ty * 16 + Math.floor(hh * 570) % 12 - camy;
        ctx.fillRect(X, Y, ph < 0.3 || ph > 1.1 ? 3 : 5, 1);
      }
    },
    // 화면에 걸치는 소품
    visibleProps(camx, camy, out) {
      const m = this.cur;
      const bx0 = Math.floor((camx - 40) / 128), bx1 = Math.floor((camx + G.W + 40) / 128);
      const by0 = Math.floor((camy - 8) / 128), by1 = Math.floor((camy + G.H + 70) / 128);
      for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) {
        const b = m.buckets.get((by << 8) | bx);
        if (!b) continue;
        for (const p of b) if (p.x > camx - 40 && p.x < camx + G.W + 40 && p.y > camy - 4 && p.y < camy + G.H + 70) out.push(p);
      }
      return out;
    },
    findUse(px, py, rad) {
      let best = null, bd = rad;
      for (const p of this.cur.props) {
        if (!p.use) continue;
        const d = Math.hypot(p.x - px, p.y - 6 - py);
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    },
    region(px, py) {
      const m = this.cur;
      if (m.id === 'cave') return '도깨비굴';
      const x = px / 16, y = py / 16, d = (a, b) => Math.hypot(a - x, b - y);
      if (d(68, 11) < 11) return '너와골';
      if (x > 62 && x < 82 && y > 16 && y < 44) return '검은재';
      if (y < m.mtop(Math.floor(x)) + 1) return '재 너머';
      if (d(36, 98) < 13) return '소래 갯마을';
      if (d(76, 69) < 10) return '한내 장터';
      if (d(132, 52) < 9) return '절터';
      if (d(22, 55) < 5) return '숯막';
      if (m.inForest(x, y)) return '솔밭';
      if (x > 94 && y > 87) return '갈대밭';
      if (y > 100) return '갯가';
      if (x > 43 && x < 71 && y > 75 && y < 94) return '한내 들';
      return '';
    },
    miniColor(t) { return MINI[t] || '#17141c'; }
  };
})();
