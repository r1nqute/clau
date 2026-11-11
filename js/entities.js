'use strict';
// 움직이는 것들: 주인공, 마을 사람, 짐승, 잡것, 떨어진 물건
(function () {
  const G = window.G;
  const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  const DEF = {
    crab: { hp: 2, spd: 36, dmg: 1, r: 6, cy: 5, drop: ['crab', 0.75] },
    snake: { hp: 2, spd: 0, dmg: 1, r: 6, cy: 4, drop: ['skin', 0.5] },
    dog: { hp: 3, spd: 60, dmg: 1, r: 7, cy: 6, sight: 88 },
    wolf: { hp: 5, spd: 68, dmg: 1, r: 7, cy: 6, sight: 112, drop: ['pelt', 0.5] },
    boar: { hp: 6, spd: 26, dmg: 2, r: 9, cy: 7, drop: ['meat', 0.8] },
    bat: { hp: 1, spd: 52, dmg: 1, r: 5, cy: 10, fly: true },
    wisp: { hp: 1, spd: 27, dmg: 1, r: 5, cy: 8, fly: true, light: 26 },
    imp: { hp: 4, spd: 56, dmg: 1, r: 7, cy: 8, drop: ['broom', 1] },
    boss: { hp: 28, spd: 96, dmg: 1, r: 13, cy: 16, light: 40 }
  };

  const E = G.E = {
    list: [], parts: [],

    reset() {
      this.list.length = 0; this.parts.length = 0;
      const m = G.world.cur;
      for (const sp of m.spawns) sp.ent = null;
      for (const n of m.npcs) {
        this.list.push({ type: 'npc', id: n.id, x: n.tx * 16 + 8, y: n.ty * 16 + 13, t: G.hash2(n.tx, n.ty, 3) * 9 });
      }
    },

    move(e, dx, dy, w, h) {
      let hit = false;
      if (dx) { if (!G.world.boxBlocked(e.x + dx, e.y, w, h)) e.x += dx; else hit = true; }
      if (dy) { if (!G.world.boxBlocked(e.x, e.y + dy, w, h)) e.y += dy; else hit = true; }
      return hit;
    },

    puff(x, y, col, n, spd) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, v = (spd || 40) * (0.3 + Math.random() * 0.7);
        this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, life: 0.25 + Math.random() * 0.3, col, s: Math.random() < 0.4 ? 2 : 1 });
      }
    },

    drop(x, y, item, n) {
      this.list.push({ type: 'pickup', item, n: n || 1, x, y, t: 0, vy: -50, z: 0 });
    },

    spawn(kind, x, y, sp) {
      const d = DEF[kind];
      const e = { type: 'enemy', kind, x, y, hx: x, hy: y, hp: d.hp, def: d, st: 'idle', t: Math.random() * 2, cd: 0, dir: Math.random() < 0.5 ? 'l' : 'r', flash: 0, stun: 0, kbx: 0, kby: 0, vx: 0, vy: 0, anim: Math.random() * 3, z: 0, sp: sp || null };
      this.list.push(e);
      return e;
    },

    // 주인공 둘레 밖에서 조용히 채워 넣고, 멀어지면 치운다
    spawner() {
      const m = G.world.cur, p = G.p, night = G.game.isNight(), now = G.game.clock();
      for (const sp of m.spawns) {
        const d = G.dist(sp.x, sp.y, p.x, p.y);
        if (sp.ent) {
          if (sp.ent.dead) sp.ent = null;
          else if (d > 520 || (sp.night && !night)) {
            if (sp.night && d < 300) this.puff(sp.ent.x, sp.ent.y - 6, '#b9d2cc', 6);
            sp.ent.dead = true; sp.ent = null;
          }
          continue;
        }
        if ((sp.deadUntil || 0) > now) continue;
        if (sp.night && !night) continue;
        if (d < (m.dark ? 150 : 235) || d > 430) continue;
        sp.ent = this.spawn(sp.type, sp.x, sp.y, sp);
      }
    },

    hurtEnemy(e, dmg, fx, fy) {
      if (e.dead || e.hp <= 0) return;
      if (e.kind === 'boss') {
        if (e.st === 'wait' || e.st === 'friend' || e.z > 6) return;
        // 왼다리가 없다. 마주 보고 오른쪽이 빈 쪽.
        if (e.st === 'down' || fx > e.x + 5) { dmg *= 2; this.puff(e.x, e.y - 14, '#f6f1e3', 5, 70); }
      }
      e.hp -= dmg; e.flash = 0.13;
      const dx = e.x - fx, dy = e.y - fy, l = Math.hypot(dx, dy) || 1;
      if (e.kind !== 'boss') { e.kbx = dx / l * 130; e.kby = dy / l * 130; e.stun = 0.2; if (e.st === 'aim' || e.st === 'lunge') { e.st = 'idle'; e.cd = 0.6; } }
      this.puff(e.x, e.y - e.def.cy, '#f6f1e3', 4, 60);
      G.sfx('hit');
      if (e.hp <= 0) this.kill(e);
    },

    kill(e) {
      e.dead = true;
      G.sfx('kill');
      const col = e.kind === 'wisp' ? '#b9d2cc' : e.kind === 'imp' || e.kind === 'boss' ? '#8a5a7a' : '#8e8f8c';
      this.puff(e.x, e.y - e.def.cy, col, e.kind === 'boss' ? 40 : 10, e.kind === 'boss' ? 90 : 50);
      if (e.sp) { e.sp.deadUntil = G.game.clock() + 700; e.sp.ent = null; }
      const d = e.def.drop;
      if (d && Math.random() < d[1]) this.drop(e.x, e.y, d[0], 1);
      if (e.kind === 'imp') this.drop(e.x + 6, e.y, '$', 4 + Math.floor(Math.random() * 6));
      G.game.onKill(e);
    },

    update(dt) {
      const p = G.p, safe = G.game.safe();
      for (const e of this.list) {
        if (e.dead) continue;
        if (e.type === 'npc') { e.t += dt; continue; }
        if (e.type === 'pickup') {
          e.t += dt;
          if (e.z < 0 || e.vy < 0) { e.vy += 400 * dt; e.z += e.vy * dt; if (e.z > 0) { e.z = 0; e.vy = 0; } }
          if (e.t > 0.3 && G.dist(e.x, e.y, p.x, p.y) < 13) {
            e.dead = true;
            if (e.item === '$') G.game.earn(e.n); else G.game.give(e.item, e.n);
          } else if (e.t > 90) e.dead = true;
          continue;
        }
        if (e.type === 'bean') {
          e.t -= dt; e.x += e.vx * dt; e.y += e.vy * dt;
          if (e.t <= 0 || G.world.solidTile(Math.floor(e.x / 16), Math.floor(e.y / 16)) && G.world.tile(Math.floor(e.x / 16), Math.floor(e.y / 16)) !== G.world.T.WATER) { e.dead = true; this.puff(e.x, e.y - 6, '#a63c2e', 3, 30); continue; }
          for (const o of this.list) {
            if (o.type !== 'enemy' || o.dead) continue;
            if (Math.abs(o.x - e.x) < o.def.r + 3 && Math.abs(o.y - o.def.cy - (e.y - 6)) < o.def.r + 4) {
              e.dead = true;
              this.puff(e.x, e.y - 6, '#a63c2e', 6, 50);
              if (o.kind === 'boss') {
                if (o.st !== 'wait' && o.st !== 'friend' && o.beanCd <= 0 && o.z < 6) { o.st = 'down'; o.t = 1.1; o.beanCd = 5; G.sfx('hit'); }
              } else {
                if (o.kind === 'imp') o.stun = 1.3;
                this.hurtEnemy(o, o.kind === 'wisp' || o.kind === 'imp' ? 2 : 1, e.x - e.vx, e.y - e.vy);
              }
              break;
            }
          }
          continue;
        }
        this.ai(e, dt, p, safe);
      }
      for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].dead) this.list.splice(i, 1);
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const q = this.parts[i];
        q.life -= dt;
        if (q.life <= 0) { this.parts.splice(i, 1); continue; }
        q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.92; q.vy *= 0.92;
        if (q.g) q.vy += q.g * dt;
      }
    },

    ai(e, dt, p, safe) {
      const d = e.def;
      e.anim += dt; e.t -= dt; e.cd -= dt;
      if (e.flash > 0) e.flash -= dt;
      if (e.kbx || e.kby) {
        this.move(e, e.kbx * dt, e.kby * dt, 10, 7);
        e.kbx *= 0.8; e.kby *= 0.8;
        if (Math.abs(e.kbx) + Math.abs(e.kby) < 4) e.kbx = e.kby = 0;
      }
      if (e.stun > 0) { e.stun -= dt; return; }
      const dx = p.x - e.x, dy = p.y - e.y;
      let dist = Math.hypot(dx, dy) || 1;
      if (safe && e.kind !== 'boss') dist = 9999;
      const ux = dx / dist, uy = dy / dist;
      const go = (vx, vy) => {
        if (vx > 0.1) e.dir = 'r'; else if (vx < -0.1) e.dir = 'l';
        if (d.fly) { e.x += vx * dt; e.y += vy * dt; return false; }
        return this.move(e, vx * dt, vy * dt, 10, 7);
      };
      const wander = spd => {
        if (e.t <= 0) {
          e.t = 0.8 + Math.random() * 2;
          if (Math.random() < 0.45 || G.dist(e.x, e.y, e.hx, e.hy) > 70) {
            const a = G.dist(e.x, e.y, e.hx, e.hy) > 70 ? Math.atan2(e.hy - e.y, e.hx - e.x) : Math.random() * 6.283;
            e.vx = Math.cos(a) * spd; e.vy = Math.sin(a) * spd;
          } else e.vx = e.vy = 0;
        }
        if (e.vx || e.vy) { if (go(e.vx, e.vy)) e.vx = e.vy = 0; }
      };

      switch (e.kind) {
        case 'crab':
          if (dist < 60) go(Math.sign(dx) * d.spd * 1.3, Math.sign(dy) * d.spd * (Math.abs(dy) > 6 ? 0.5 : 0));
          else {
            if (e.t <= 0) { e.t = 1 + Math.random() * 2; e.vx = Math.random() < 0.3 ? 0 : (Math.random() < 0.5 ? -1 : 1) * d.spd; }
            if (e.vx && go(e.vx, 0)) e.vx = -e.vx;
          }
          break;
        case 'snake':
          if (e.st === 'idle') {
            if (dx > 4) e.dir = 'r'; else if (dx < -4) e.dir = 'l';
            if (dist < 54 && e.cd <= 0) { e.st = 'aim'; e.t = 0.45; }
          } else if (e.st === 'aim') {
            if (e.t <= 0) { e.st = 'lunge'; e.t = 0.26; e.vx = ux * 165; e.vy = uy * 165; }
          } else if (e.st === 'lunge') {
            go(e.vx, e.vy);
            if (e.t <= 0) { e.st = 'idle'; e.cd = 1.5; }
          }
          break;
        case 'dog': case 'wolf':
          if (e.st === 'back') { go(-ux * d.spd * 0.8, -uy * d.spd * 0.8); if (e.t <= 0) e.st = 'idle'; }
          else if (dist < d.sight || (e.st === 'chase' && dist < d.sight + 50)) {
            e.st = 'chase';
            // 살짝 돌아 들어온다
            const side = (e.hx + e.hy) % 2 ? 1 : -1, k = dist > 40 ? 0.45 : 0;
            go((ux - uy * k * side) * d.spd, (uy + ux * k * side) * d.spd);
          } else { e.st = 'idle'; wander(d.spd * 0.4); }
          break;
        case 'boar':
          if (e.st === 'idle') {
            wander(d.spd);
            if (dist < 104 && e.cd <= 0) { e.st = 'aim'; e.t = 0.6; e.dir = dx > 0 ? 'r' : 'l'; }
          } else if (e.st === 'aim') {
            if (e.t <= 0) { e.st = 'charge'; e.t = 1.1; e.vx = ux * 178; e.vy = uy * 178; G.sfx('roll'); }
          } else if (e.st === 'charge') {
            const hit = go(e.vx, e.vy);
            if (Math.random() < 0.5) this.parts.push({ x: e.x, y: e.y, vx: 0, vy: -8, life: 0.3, col: '#c4a676', s: 2 });
            if (hit) { e.st = 'rest'; e.t = 1.0; e.stun = 0; G.sfx('thud'); G.game.shake(3); this.puff(e.x, e.y - 6, '#c4a676', 8); }
            else if (e.t <= 0) { e.st = 'rest'; e.t = 0.5; }
          } else if (e.t <= 0) { e.st = 'idle'; e.cd = 0.8; e.t = 0; }
          break;
        case 'bat':
          if (dist < 120) go(ux * d.spd + Math.sin(e.anim * 7) * 34, uy * d.spd + Math.cos(e.anim * 5) * 34);
          else go(Math.sin(e.anim * 2) * 14 + (e.hx - e.x) * 0.5, Math.cos(e.anim * 3) * 10 + (e.hy - e.y) * 0.5);
          break;
        case 'wisp':
          if (dist < 110) go(ux * d.spd + Math.sin(e.anim * 2.2) * 14, uy * d.spd + Math.cos(e.anim * 1.7) * 10);
          else go(Math.sin(e.anim * 0.9) * 10 + (e.hx - e.x) * 0.3, Math.cos(e.anim * 1.3) * 8 + (e.hy - e.y) * 0.3);
          break;
        case 'imp':
          if (dist < 120 || e.hp < d.hp) {
            const ph = e.anim % 0.55;
            e.z = ph < 0.32 ? Math.sin(ph / 0.32 * 3.14) * 6 : 0;
            if (ph < 0.32) go(ux * d.spd * 1.5, uy * d.spd * 1.5);
          } else { e.z = 0; wander(d.spd * 0.4); }
          break;
        case 'boss': this.boss(e, dt, p, dist, ux, uy); return;
      }
      // 닿으면 다친다
      if (e.st !== 'rest' && Math.abs(dx) < d.r + 4 && Math.abs((p.y - 6) - (e.y - d.cy)) < d.r + 3) {
        if (G.game.hurt(d.dmg, e.x, e.y)) {
          if (e.kind === 'wisp') { e.hp = 0; this.kill(e); }
          else if (e.kind === 'dog' || e.kind === 'wolf') { e.st = 'back'; e.t = 0.55; }
        }
      }
    },

    boss(e, dt, p, dist, ux, uy) {
      if (e.beanCd > 0) e.beanCd -= dt;
      if (e.st === 'wait' || e.st === 'friend') return;
      const near = () => Math.abs(p.x - e.x) < 17 && Math.abs((p.y - 6) - (e.y - 14)) < 16;
      if (e.st === 'idle') { e.st = 'hop'; e.t = 0; e.n = 0; }
      if (e.st === 'hop') {
        e.ph = (e.ph || 0) + dt;
        if (e.ph < 0.3) {
          e.z = Math.sin(e.ph / 0.3 * 3.14) * 9;
          this.move(e, ux * 96 * dt, uy * 96 * dt, 20, 10);
        } else {
          if (e.z !== 0) { e.z = 0; this.puff(e.x, e.y, '#c4a676', 3, 30); }
          if (e.ph > 0.52) {
            e.ph = 0; e.n++;
            if (dist < 40 && e.n >= 2 && (e.shoves || 0) < 2) { e.st = 'shoveAim'; e.t = 0.48; e.shoves = (e.shoves || 0) + 1; }
            else if (e.n >= 4 || (e.shoves >= 2 && e.n >= 2)) { e.st = 'jumpAim'; e.t = 0.4; e.shoves = 0; }
          }
        }
        if (e.z < 5 && near()) G.game.hurt(1, e.x, e.y);
      } else if (e.st === 'shoveAim') {
        if (e.t <= 0) {
          e.st = 'shove'; e.t = 0.25; G.sfx('swing'); G.game.shake(2);
          for (let a = 0; a < 6.283; a += 0.4) this.parts.push({ x: e.x + Math.cos(a) * 14, y: e.y - 10 + Math.sin(a) * 10, vx: Math.cos(a) * 120, vy: Math.sin(a) * 90, life: 0.22, col: '#f6f1e3', s: 2 });
          if (G.dist(p.x, p.y - 6, e.x, e.y - 10) < 36) G.game.hurt(1, e.x, e.y, 260);
        }
      } else if (e.st === 'shove') {
        if (e.t <= 0) { e.st = 'hop'; e.n = 0; e.ph = 0.3; }
      } else if (e.st === 'jumpAim') {
        if (e.t <= 0) { e.st = 'jump'; e.t = 0.75; e.tx = p.x; e.ty = p.y; e.sx = e.x; e.sy = e.y; G.sfx('roll'); }
      } else if (e.st === 'jump') {
        const k = 1 - Math.max(0, e.t) / 0.75;
        e.x = G.lerp(e.sx, e.tx, k); e.y = G.lerp(e.sy, e.ty, k);
        e.z = Math.sin(k * 3.14) * 64;
        if (e.t <= 0) {
          e.z = 0; e.st = 'down'; e.t = 1.7;
          // 돌 속에 내려앉았으면 빈자리로 민다
          for (let i = 0; i < 40 && G.world.boxBlocked(e.x, e.y, 20, 10); i++) { e.x += Math.sign(e.sx - e.x) || 1; e.y += Math.sign(e.sy - e.y); }
          G.sfx('thud'); G.game.shake(6); this.puff(e.x, e.y, '#c4a676', 18, 80);
          if (G.dist(p.x, p.y, e.x, e.y) < 27) G.game.hurt(2, e.x, e.y, 240);
        }
      } else if (e.st === 'down') {
        if (e.t <= 0) { e.st = 'hop'; e.n = 0; e.ph = 0.3; }
      }
    }
  };

  // ======================= 주인공 =======================
  const P = G.p = {
    x: 0, y: 0, dir: 'down', walk: 0, moving: false,
    atk: 0, atkCd: 0, roll: 0, rollCd: 0, rdx: 0, rdy: 0, inv: 0, kbx: 0, kby: 0, hitSet: null, eat: 0,

    reset(x, y, dir) {
      this.x = x; this.y = y; this.dir = dir || 'down';
      this.atk = this.atkCd = this.roll = this.rollCd = this.inv = this.kbx = this.kby = 0;
    },

    blockedByNpc(nx, ny) {
      for (const e of E.list) {
        if (e.type === 'npc' || (e.kind === 'boss' && (e.st === 'wait' || e.st === 'friend'))) {
          const rx = e.kind === 'boss' ? 16 : 10, ry = e.kind === 'boss' ? 9 : 7;
          if (Math.abs(e.x - nx) < rx && Math.abs(e.y - ny) < ry && !(Math.abs(e.x - this.x) < rx && Math.abs(e.y - this.y) < ry)) return true;
        }
      }
      return false;
    },
    step(dx, dy) {
      if (dx && !G.world.boxBlocked(this.x + dx, this.y, 10, 7) && !this.blockedByNpc(this.x + dx, this.y)) this.x += dx;
      if (dy && !G.world.boxBlocked(this.x, this.y + dy, 10, 7) && !this.blockedByNpc(this.x, this.y + dy)) this.y += dy;
    },

    update(dt) {
      const I = G.input, s = G.s;
      if (this.atkCd > 0) this.atkCd -= dt;
      if (this.rollCd > 0) this.rollCd -= dt;
      if (this.inv > 0) this.inv -= dt;
      if (this.eat > 0) this.eat -= dt;
      if (this.kbx || this.kby) {
        this.step(this.kbx * dt, this.kby * dt);
        this.kbx *= 0.82; this.kby *= 0.82;
        if (Math.abs(this.kbx) + Math.abs(this.kby) < 5) this.kbx = this.kby = 0;
      }
      let ix = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0);
      let iy = (I.down('down') ? 1 : 0) - (I.down('up') ? 1 : 0);

      if (this.roll > 0) {
        this.roll -= dt;
        this.step(this.rdx * 168 * dt, this.rdy * 168 * dt);
        if (Math.random() < 0.6) E.parts.push({ x: this.x, y: this.y, vx: 0, vy: -6, life: 0.25, col: '#c4a676', s: 1 });
        return;
      }
      if (I.hit('d') && this.rollCd <= 0) {
        const l = Math.hypot(ix, iy);
        if (l) { this.rdx = ix / l; this.rdy = iy / l; } else { this.rdx = DIRV[this.dir][0]; this.rdy = DIRV[this.dir][1]; }
        this.roll = 0.24; this.rollCd = 0.62; this.inv = Math.max(this.inv, 0.26); this.atk = 0;
        G.sfx('roll');
        return;
      }
      if (I.hit('a') && this.atkCd <= 0) {
        this.atk = 0.17; this.atkCd = 0.36; this.hitSet = new Set();
        G.sfx('swing');
      }
      if (I.hit('b')) G.game.interact();
      if (I.hit('c')) G.game.useQuick();
      if (I.hit('q')) G.game.cycleQuick();

      if (this.atk > 0) {
        this.atk -= dt;
        const v = DIRV[this.dir], cx = this.x + v[0] * 13, cy = this.y - 7 + v[1] * 12;
        const hw = v[0] ? 12 : 15, hh = v[1] ? 12 : 13;
        const dmg = G.WEAPONS[s.gear.weapon].dmg;
        for (const e of E.list) {
          if (e.type !== 'enemy' || e.dead || this.hitSet.has(e)) continue;
          if (Math.abs(e.x - cx) < hw + e.def.r && Math.abs(e.y - e.def.cy - (e.z || 0) - cy) < hh + e.def.r) {
            this.hitSet.add(e);
            E.hurtEnemy(e, dmg, this.x, this.y);
            G.game.shake(1.5);
          }
        }
      }

      const l = Math.hypot(ix, iy);
      this.moving = l > 0;
      if (l) {
        if (this.atk <= 0) {
          // 대각선으로 갈 때는 보던 쪽을 되도록 유지
          if (!((this.dir === 'left' && ix < 0) || (this.dir === 'right' && ix > 0) || (this.dir === 'up' && iy < 0) || (this.dir === 'down' && iy > 0)))
            this.dir = Math.abs(ix) >= Math.abs(iy) ? (ix < 0 ? 'left' : 'right') : (iy < 0 ? 'up' : 'down');
        }
        let spd = s.gear.shoes ? 74 : 64;
        if (this.atk > 0) spd *= 0.35;
        const T = G.world.T, tl = G.world.tile(Math.floor(this.x / 16), Math.floor((this.y - 2) / 16));
        if (tl === T.SHALLOW || tl === T.MUD) spd *= 0.72;
        this.step(ix / l * spd * dt, iy / l * spd * dt);
        this.walk += dt * (spd / 64);
        if (tl === T.SHALLOW && Math.random() < 0.15) E.parts.push({ x: this.x + (Math.random() - 0.5) * 8, y: this.y, vx: 0, vy: -14, life: 0.25, col: '#b9d2cc', s: 1 });
      } else this.walk = 0;
    },

    draw(ctx, cx, cy) {
      const frames = G.spr.player[this.dir];
      let img = frames[this.moving ? Math.floor(this.walk * 7) % 4 : 0];
      const x = Math.round(this.x - cx) - 8, y = Math.round(this.y - cy) - 17;
      const v = DIRV[this.dir];
      const swing = () => {
        if (this.atk <= 0) return;
        const k = 1 - this.atk / 0.17, lvl = G.s.gear.weapon;
        const base = Math.atan2(v[1], v[0]), a = base - 1.25 + k * 2.5;
        const ox = x + 8 + v[0] * 3, oy = y + 11 + v[1] * 2, len = 12 + lvl;
        // 지나간 자리
        ctx.fillStyle = '#f6f1e3';
        for (let j = 0; j < 5; j++) {
          const b = a - j * 0.22;
          if (b < base - 1.3) break;
          ctx.fillRect(Math.round(ox + Math.cos(b) * (len + 1)), Math.round(oy + Math.sin(b) * (len + 1)), j < 2 ? 2 : 1, j < 2 ? 2 : 1);
        }
        const col = lvl === 0 ? '#b99a6b' : lvl === 1 ? '#6b4a32' : '#8a6a44';
        for (let i = 3; i <= len; i++) {
          const px = Math.round(ox + Math.cos(a) * i), py = Math.round(oy + Math.sin(a) * i);
          ctx.fillStyle = '#1b1a1f'; ctx.fillRect(px - 1, py - 1, 3, 3);
        }
        for (let i = 3; i <= len; i++) {
          const px = Math.round(ox + Math.cos(a) * i), py = Math.round(oy + Math.sin(a) * i);
          ctx.fillStyle = col; ctx.fillRect(px, py, lvl && i > len - 5 ? 2 : 1, lvl && i > len - 5 ? 2 : 1);
        }
      };
      if (this.inv > 0 && this.roll <= 0 && Math.floor(this.inv * 14) % 2) return;
      if (this.dir === 'up') swing();
      if (this.roll > 0) {
        // 구르는 동안은 납작하게
        ctx.drawImage(img, x - 1, y + 7, 18, 11);
      } else {
        const bob = this.moving && Math.floor(this.walk * 7) % 2 ? 1 : 0;
        ctx.drawImage(img, x, y - bob + (this.eat > 0 ? 1 : 0));
      }
      if (this.dir !== 'up') swing();
    }
  };

  // ======================= 그리기 =======================
  E.shadow = function (ctx, x, y, w) {
    ctx.fillStyle = 'rgba(20,18,26,0.28)';
    ctx.fillRect(Math.round(x - w / 2) + 1, Math.round(y) - 1, w - 2, 1);
    ctx.fillRect(Math.round(x - w / 2), Math.round(y), w, 2);
    ctx.fillRect(Math.round(x - w / 2) + 1, Math.round(y) + 2, w - 2, 1);
  };

  E.draw = function (e, ctx, cx, cy) {
    const S = G.spr, x = Math.round(e.x - cx), y = Math.round(e.y - cy);
    if (e.type === 'npc') {
      const img = S.npc[e.id];
      this.shadow(ctx, x, y - 1, 12);
      ctx.drawImage(img, x - 8, y - img.height + 1 + (Math.floor(e.t * 1.3) % 4 === 0 ? 1 : 0));
      return;
    }
    if (e.type === 'pickup') {
      const img = e.item === '$' ? S.coin : e.item === 'broom' ? S.broom : S.pouch;
      this.shadow(ctx, x, y, 8);
      if (e.t > 75 && Math.floor(e.t * 6) % 2) return;
      ctx.drawImage(img, x - (img.width >> 1), y - img.height + Math.round(e.z) - (Math.floor(e.t * 3) % 2));
      return;
    }
    if (e.type === 'bean') {
      ctx.fillStyle = '#1b1a1f'; ctx.fillRect(x - 2, y - 9, 4, 4);
      ctx.fillStyle = '#a63c2e'; ctx.fillRect(x - 1, y - 8, 2, 2);
      return;
    }
    const set = S[e.kind][e.dir];
    let fr = Math.floor(e.anim * 5) % 2;
    let ox = 0, oy = 0;
    if (e.kind === 'snake') fr = e.st === 'aim' ? 1 : Math.floor(e.anim * 1.5) % 2;
    if (e.kind === 'boar' && e.st !== 'charge') fr = (e.vx || e.vy) ? fr : 0;
    if ((e.st === 'aim' && e.kind !== 'snake') || e.st === 'shoveAim' || e.st === 'jumpAim') ox = Math.floor(e.anim * 30) % 2 ? 1 : -1;
    if (e.kind === 'bat') { oy = -8 + Math.round(Math.sin(e.anim * 6) * 2); fr = Math.floor(e.anim * 9) % 2; }
    if (e.kind === 'wisp') oy = -4 + Math.round(Math.sin(e.anim * 3) * 2);
    let img = set[fr];
    if (e.kind !== 'wisp') this.shadow(ctx, x, y - 1, e.kind === 'boss' ? 26 : e.kind === 'boar' ? 20 : 12);
    if (e.kind === 'boss' && e.st === 'jump') {
      // 내려앉을 자리
      ctx.fillStyle = 'rgba(166,60,46,0.35)';
      const tx = Math.round(e.tx - cx), ty = Math.round(e.ty - cy);
      ctx.fillRect(tx - 14, ty - 3, 28, 6); ctx.fillRect(tx - 10, ty - 5, 20, 10);
    }
    if (e.flash > 0 || ((e.st === 'aim' || e.st === 'shoveAim') && Math.floor(e.anim * 16) % 2)) img = G.art.white(img);
    const dx = x - (img.width >> 1) + ox, dy = y - img.height + 1 + oy - Math.round(e.z || 0);
    if (e.kind === 'boss' && e.st === 'down') {
      // 나자빠진 꼴
      ctx.save(); ctx.translate(x, y - 8); ctx.rotate(1.5708); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
      return;
    }
    ctx.drawImage(img, dx, dy);
  };

  E.drawParts = function (ctx, cx, cy) {
    for (const q of this.parts) {
      ctx.fillStyle = q.col;
      ctx.fillRect(Math.round(q.x - cx), Math.round(q.y - cy), q.s, q.s);
    }
  };
})();
