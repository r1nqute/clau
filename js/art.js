'use strict';
// 그림. 사람·짐승은 글자 격자로 한 점씩 찍었고, 나무·집처럼 큰 것은 코드로 그렸다.
(function () {
  const G = window.G;
  const PAL = {
    k: '#1b1a1f', K: '#33303a', g: '#5a5c63', G: '#8e8f8c', w: '#e8e2d0', W: '#f6f1e3',
    s: '#e0b088', S: '#b97f5e', h: '#2a211e',
    r: '#a63c2e', R: '#cf6a3d', d: '#7a2a24',
    y: '#cfa64a', Y: '#e6cc78',
    b: '#6b4a32', B: '#46301f', t: '#93714a', T: '#b99a6b',
    n: '#3f5a3a', N: '#5f7d42', l: '#8fa253', L: '#b8b56a',
    u: '#2f4a66', U: '#47708c', c: '#7fa9b0', C: '#b9d2cc',
    p: '#5b3d5c', P: '#8a5a7a', i: '#314b5a', I: '#4c6f7f'
  };
  G.PAL = PAL;

  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function mk(rows, over) {
    let w = 0;
    for (const r of rows) w = Math.max(w, r.length);
    const c = cv(w, rows.length), x = c.getContext('2d');
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      for (let i = 0; i < r.length; i++) {
        const ch = r[i];
        if (ch === '.' || ch === ' ') continue;
        const col = (over && over[ch]) || PAL[ch];
        if (!col) continue;
        x.fillStyle = col; x.fillRect(i, j, 1, 1);
      }
    }
    return c;
  }
  function flip(src) {
    const c = cv(src.width, src.height), x = c.getContext('2d');
    x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
    return c;
  }
  function shiftY(src, dy) {
    const c = cv(src.width, src.height), x = c.getContext('2d');
    x.drawImage(src, 0, dy);
    return c;
  }
  const whites = new Map();
  function white(src) {
    let c = whites.get(src);
    if (c) return c;
    c = cv(src.width, src.height);
    const x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#f6f1e3'; x.fillRect(0, 0, c.width, c.height);
    whites.set(src, c);
    return c;
  }

  // ================= 주인공 =================
  const HAT = [
    '......kkkk......',
    '.....kYYYYk.....',
    '....kYYYYYYk....',
    '..kkyYYYYYYykk..',
    '.kYYYYYYYYYYYYk.',
    '.kyyyyyyyyyyyyk.'
  ];
  const P_DOWN = HAT.concat([
    '..kkhsssssshkk..',
    '...kskssssksk...',
    '...kssssssssk...',
    '....kssSSssk....',
    '...kkwwwwwwkk...',
    '..kwwiwwwwwwwk..',
    '..kswwiwwwwwsk..',
    '..kkwwwiwwwwkk..',
    '...kGwwwwwwGk...'
  ]);
  const P_UP = HAT.concat([
    '..kkhhhhhhhhkk..',
    '...khhhhhhhhk...',
    '...kshhhhhhsk...',
    '....kiiiiiik....',
    '...kkiIIIIikk...',
    '..kwwiIIIIiwwk..',
    '..kswiiiiiiwsk..',
    '..kkwwiiiiwwkk..',
    '...kGwwwwwwGk...'
  ]);
  const P_SIDE = HAT.concat([
    '..kkhhssssskk...',
    '....khsssksk....',
    '....khssssssk...',
    '.....kssssSk....',
    '...kkkwwwwkk....',
    '..kiikwwwwwk....',
    '..kiIkwwswwk....',
    '..kiikwwwwkk....',
    '...kkGwwwwk.....'
  ]);
  const LEGS_F = ['...kwwwkkwwwk...', '...kyyk..kyyk...', '....kk....kk....'];
  const LEGS_F2 = ['...kwwwkkwwwk...', '...kyyk..kkk....', '....kk..........'];
  const LEGS_F3 = ['...kwwwkkwwwk...', '....kkk..kyyk...', '..........kk....'];
  const LEGS_S = ['....kwwkwwk.....', '....kyykyyk.....', '.....kk.kk......'];
  const LEGS_S2 = ['...kwwwkkwwk....', '..kyyk...kyyk...', '...kk.....kk....'];

  // ================= 마을 사람 =================
  const HEAD = {
    knot: [
      '.......kk.......',
      '......khhk......',
      '......khhk......',
      '.....kkhhkk.....',
      '....khhhhhhk....',
      '...khhhhhhhhk...',
      '...khsssssshk...',
      '...kskssssksk...',
      '...kssssssssk...',
      '....kss66ssk....'
    ],
    gat: [
      '................',
      '.....kkkkkk.....',
      '.....kKKKKk.....',
      '.....kKKKKk.....',
      '.kkkkkKKKKkkkkk.',
      '.kKKKKKKKKKKKKk.',
      '..kkksssssskkk..',
      '...kskssssksk...',
      '...kssssssssk...',
      '....kss66ssk....'
    ],
    woman: [
      '................',
      '................',
      '.....kkkkkk.....',
      '....khhhhhhk....',
      '...khhhhhhhhk...',
      '...khhhhhhhhk...',
      '...khhsssshhk...',
      '...kskssssksk...',
      '...kssssssssk...',
      '....kssSSssk....'
    ],
    bald: [
      '................',
      '................',
      '.....kkkkkk.....',
      '....kssssssk....',
      '...kssssssssk...',
      '...kssssssssk...',
      '...kssssssssk...',
      '...kskssssksk...',
      '...kssssssssk...',
      '....kssSSssk....'
    ],
    hat: HAT.concat([
      '..kkhsssssshkk..',
      '...kskssssksk...',
      '...kssssssssk...',
      '....kss66ssk....'
    ])
  };
  const BODY_M = [
    '...kk222222kk...',
    '..k2223223222k..',
    '..ks22322322sk..',
    '..kk22222222kk..',
    '...k44444444k...',
    '...k444kk444k...',
    '...kyyk..kyyk...',
    '....kk....kk....'
  ];
  const BODY_W = [
    '...kk222222kk...',
    '..k2222552222k..',
    '..ks22255222sk..',
    '...k44444444k...',
    '..k4444444444k..',
    '..k4447444744k..',
    '.k444744447444k.',
    '.kkkkkkkkkkkkkk.'
  ];
  const CHILD = [
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '...khhhhhhhhk...',
    '...khsssssshk...',
    '...kskssssksk...',
    '...kssssssssk...',
    '....kssssssk....',
    '....k222222k....',
    '...ks222222sk...',
    '....k222222k....',
    '....k44kk44k....',
    '....kyykkyyk....',
    '.....kk..kk.....'
  ];
  function person(head, body, c) {
    const over = {
      '2': PAL[c.top] || c.top, '3': PAL[c.shade] || c.shade, '4': PAL[c.bot] || c.bot,
      '5': PAL[c.acc || 'r'], '6': PAL[c.chin || 'S'], '7': PAL[c.bshade || c.bot] || c.bshade
    };
    if (c.hair) over.h = PAL[c.hair];
    return mk(HEAD[head].concat(body), over);
  }

  // ================= 짐승과 잡것 =================
  const CRAB = [
    '..kk........kk..',
    '.kRRk......kRRk.',
    '.kRk..kkkk..kRk.',
    '..kRkkRRRRkkRk..',
    '...kRRkRRkRRk...',
    '..kRRRRRRRRRRk..',
    '..kRrRRRRRRrRk..',
    '...krrRRRRrrk...',
    '..kkkrrrrrrkkk..'
  ];
  const CRAB_L1 = ['.kRkkRkkkkRkkRk.', '.kk.kk....kk.kk.'];
  const CRAB_L2 = ['..kRkkRkkRkkRk..', '..kk.kk..kk.kk..'];

  const SNAKE = [
    '............kk..',
    '...........kllk.',
    '..kkkk....klklk.',
    '.kllllk...kllk.r',
    'kllnnllk.kllk...',
    'klnkknllkllk....',
    'kllk.kllllk.....',
    '.kk...kkkk......'
  ];
  const SNAKE2 = [
    '................',
    '............kk..',
    '..kkkk.....kllk.',
    '.kllllk...klklkr',
    'kllnnllk..kllk..',
    'klnkknllkkllk...',
    'kllk.klllllk....',
    '.kk...kkkkk.....'
  ];

  const BOAR = [
    '......kkkkkkkkk',
    '....kkBBBBBBBBBkkk',
    '...kBBBbbBBBBBBBBBkk',
    '..kBBbbbbBBBBBBBBBBBk',
    '..kBBbbBBBBBBBBBBkBBBk',
    '.kkBBBBBBBBBBBBBBBBBBBkk',
    '.kBBBBBBBBBBBBBBBBBBwBSk',
    '..kBBBBBBBBBBBBBBBBBwkk',
    '..kBBBBBBBBBBBBBBBBkk'
  ];
  const BOAR_L1 = ['..kBBkkBBBBBBkBBBkk', '..kBk.kBk...kBkBk', '..kBk.kBk...kBkBk', '..kkk.kkk...kkkkk'];
  const BOAR_L2 = ['..kBBkkBBBBBBkBBBkk', '.kBk..kBk..kBk.kBk', '.kkk..kBk..kkk.kBk', '......kkk......kkk'];

  const DOG = [
    '..............k..k',
    '.............kTkkTk',
    'kk...........kTTTTTk',
    'kTk.........kTTkTTTkk',
    '.kTkkkkkkkkkkTTTTTTTk',
    '.kTTTTTTTTTTTTTTTkkk',
    '..kTTTTTTTTTTTTTTk',
    '..kTTtTTTTTTTtTTk',
    '..kTTkkkkkkkTTTk'
  ];
  const DOG_L1 = ['..kTk.kTk..kTkTk', '..kTk.kTk..kTkTk', '..kkk.kkk..kkkkk'];
  const DOG_L2 = ['.kTk..kTk.kTk.kTk', '.kkk..kTk.kkk.kTk', '......kkk.....kkk'];

  const BAT1 = [
    'kk............kk',
    'kpk...k..k...kpk',
    'kppk.kkkkkk.kppk',
    'kpppkkprrpkkpppk',
    '.kppppppppppppk.',
    '..kkpkkppkkpkk..',
    '.....kkkkkk.....'
  ];
  const BAT2 = [
    '......k..k......',
    '.....kkkkkk.....',
    '..kkkkprrpkkkk..',
    '.kppppppppppppk.',
    'kpppkkppppkkpppk',
    'kppk..kkkk..kppk',
    'kkk..........kkk'
  ];

  const WISP = [
    '.....U',
    '....UcU',
    '....UcCU',
    '...UcCCU',
    '..UcCCCcU',
    '.UcCCWCCcU',
    '.UcCWWWCcU',
    'UcCCWWWCCcU',
    'UcCCWWWCCcU',
    'UcCCCWCCCcU',
    '.UcCCCCCcU',
    '..UcccccU',
    '...UUUUU'
  ];

  const IMP = [
    '...k..kkkk..k...',
    '..khkkhhhhkkhk..',
    '..khhhhhhhhhhk..',
    '.khhhhhhhhhhhhk.',
    '.khRRRRRRRRRRhk.',
    '.kRRwkRRRRwkRRk.',
    '.kRRkkRRRRkkRRk.',
    '.kRRRRRRRRRRRRk.',
    '..kRkwkwkwkwRk..',
    '..kRRkkkkkkRRk..',
    '...kkRRRRRRkk...',
    '..kTTkkkkkkTTk..',
    '.kRkTTTTTTTTkRk.',
    '.kRkTTtTTtTTkRk.',
    '..kkTtTTTTtTkk..',
    '...kRRkkkkRRk...',
    '...kkk....kkk...'
  ];

  // 김서방. 뿔도 가시 방망이도 없다. 털 많고 덩치 큰 외다리.
  const BOSS = [
    '..........kk........kk..........',
    '.........khhk..kk..khhk.........',
    '........khhhhkkhhkkhhhhk........',
    '.......khhhhhhhhhhhhhhhhk.......',
    '......khhhhhhhhhhhhhhhhhhk......',
    '.....khhhhhhhhhhhhhhhhhhhhk.....',
    '.....khhhRRRRRRRRRRRRRRhhhk.....',
    '....khhRRRRRRRRRRRRRRRRRRhhk....',
    '....khRRkkkRRRRRRRRRRkkkRRhk....',
    '....kRRRwwkRRRRRRRRRRwwkRRRk....',
    '....kRRRwkkRRRRrrRRRRwkkRRRk....',
    '....kRRRRRRRRRrrrrRRRRRRRRRk....',
    '.....kRRkRRRRRRRRRRRRRRkRRk.....',
    '.....kRRkwkwkwkwkwkwkwkkRRk.....',
    '.....kRRRkkkkkkkkkkkkkkRRRk.....',
    '......kRRRRRRRRRRRRRRRRRRk......',
    '....kkkkkRRRRRRRRRRRRRRkkkkk....',
    '...kTTTTTkkkkkkkkkkkkkkTTTTTk...',
    '..kTTTTTTTTTTTTTTTTTTTTTTTTTTk..',
    '.kRRkTTTTTTTtTTTTTTtTTTTTTTkRRk.',
    '.kRRkTTTTTTTTtTTTTtTTTTTTTTkRRk.',
    'kRRRkTTTTTTTTTTTTTTTTTTTTTTkRRRk',
    'kRRk.kTTTTTTTTTTTTTTTTTTTTk.kRRk',
    'kRRk.kTTtTTTTTTTTTTTTTTtTTk.kRRk',
    'kRRk.kTTTTTTTTTTTTTTTTTTTTk.kRRk',
    '.kk..kTTTTTtTTTTTTTtTTTTTTk..kk.',
    '.....kkTkTTTkTTTTTTkTTTkTkk.....',
    '......kkkkkkkRRRRRRkkkkkkk......',
    '............kRRRRRRk............',
    '............kRRRRRRk............',
    '............kRRRRRk.............',
    '...........kRRRRRRk.............',
    '..........kRRRRRRRk.............',
    '..........kkkkkkkkk.............'
  ];

  // ================= 놓인 것들 =================
  const JANGSEUNG = [
    '....kkkkkkkk',
    '...kbbbbbbbbk',
    '...kbTTTTTTbk',
    '..kkbbbbbbbbkk',
    '..kTTTTTTTTTTk',
    '..kTkkTTTTkkTk',
    '..kTwkTTTTwkTk',
    '..kTTTTbbTTTTk',
    '..kTTTTbbTTTTk',
    '..kTTbTTTTbTTk',
    '..kTkwkwkwkwTk',
    '..kTTkkkkkkTTk',
    '...kTTTTTTTTk',
    '...kbTTTTTTbk',
    '...kbTTkkTTbk',
    '...kbTTTkTTbk',
    '...kbTkkkTTbk',
    '...kbTTTTTTbk',
    '...kbTTkkTTbk',
    '...kbTkTTkTbk',
    '...kbTTkkTTbk',
    '...kbTTTTTTbk',
    '...kbTkkkkTbk',
    '...kbTTkTTTbk',
    '...kbTTTTTTbk',
    '...kbbTTTTbbk',
    '...kkbbbbbbkk',
    '....kkkkkkkk'
  ];
  const DOLTAP = [
    '......kkkk',
    '.....kGWGGk',
    '.....kggggk',
    '....kkkkkkkk',
    '....kGWGkGGk',
    '....kGGGkggk',
    '...kkkkkkkkkk',
    '...kGWkGGGkGk',
    '...kGGkGGgkgk',
    '..kkkkkkkkkkkk',
    '..kGWGGkGWGGGk',
    '..kGGGgkGGGggk',
    '.kkkkkkkkkkkkkk',
    '.kGWGkGGWGkGGGk',
    '.kGGgkGGGgkGggk',
    '.kkkkkkkkkkkkkk'
  ];
  const DOLTAP_TOP = ['.......kk', '......kWWk', '......kWGk'];

  const SIGN = [
    '.kkkkkkkkkkkkk',
    'kTTTTTTTTTTTTTk',
    'kTkkTkkkTkkTTTk',
    'kTTTTTTTTTTTTTk',
    'kTkkkTkkTTkkTTk',
    'kTTTTTTTTTTTTTk',
    '.kkkkkkbkkkkkk',
    '......kbk',
    '......kbk',
    '......kbk',
    '......kbk',
    '.....kkbkk'
  ];
  const CHEST = [
    '.kkkkkkkkkkkkkk.',
    'kbbbbbbbbbbbbbbk',
    'kbTTTTTTTTTTTTbk',
    'kbbbbbbbbbbbbbbk',
    'kkkkkkkYYkkkkkkk',
    'kbbbbbkYYkbbbbbk',
    'kbTTTTbkkbTTTTbk',
    'kbTTTTTTTTTTTTbk',
    'kbTTTTTTTTTTTTbk',
    'kbbbbbbbbbbbbbbk',
    '.kkkkkkkkkkkkkk.'
  ];
  const CHEST_OPEN = [
    '.kkkkkkkkkkkkkk.',
    'kBBBBBBBBBBBBBBk',
    'kBkkkkkkkkkkkkBk',
    'kBkkkkkkkkkkkkBk',
    'kkkkkkkkkkkkkkkk',
    'kbbbbbbbbbbbbbbk',
    'kbTTTTTTTTTTTTbk',
    'kbTTTTTTTTTTTTbk',
    'kbTTTTTTTTTTTTbk',
    'kbbbbbbbbbbbbbbk',
    '.kkkkkkkkkkkkkk.'
  ];
  const FIRE = [
    '................',
    '.......R........',
    '......RR........',
    '......RYR.......',
    '.....RYYR..R....',
    '.....RYYRR.R....',
    '....RRYWYR......',
    '....RYYWYYR.....',
    '....RYWWWYR.....',
    '...kRYWWWYRk....',
    '..kbkRYYYRkbk...',
    '.kbbbkkRkkbbbk..',
    '.kBbbbbkbbbbBk..',
    '..kkBBbbbBBkk...',
    '....kkkkkkk.....'
  ];
  const SCARECROW = [
    '.....kkkkkk',
    '....kyYYYYyk',
    '...kkyyyyyykk',
    '..kYYYYYYYYYYk',
    '...kkTTTTTTkk',
    '....kTkTTkTk',
    '....kTTTTTTk',
    '.....kTrrTk',
    'kkkkkkwwwwkkkkkk',
    'kbbbkwwwwwwkbbbk',
    'kkkkkwwGwwwkkkkk',
    '....kwwwGwwk',
    '....kwGwwwwk',
    '....kwwwwGwk',
    '.....kywwyk',
    '....kyykkyyk',
    '.....k.bb.k',
    '.......bb',
    '.......bb',
    '.......bb',
    '.......bb',
    '......kbbk'
  ];
  const JAR = [
    '...kkkkkk',
    '..kBBBBBBk',
    '...kkkkkk',
    '..kBBbBBBk',
    '.kBBbbBBBBk',
    'kBBbbBBBBBBk',
    'kBBbBBBBBBBk',
    'kBBBBBBBBBBk',
    'kBBBBBBBBBBk',
    '.kBBBBBBBBk',
    '.kBBBBBBBBk',
    '..kBBBBBBk',
    '...kkkkkk'
  ];
  const HAY = [
    '.........kk',
    '........kYYk',
    '.......kYyYYk',
    '......kYYyYYYk',
    '.....kYyYYYyYYk',
    '.....kYYYyYYYYk',
    '....kYYyYYYYyYYk',
    '....kYyYYYyYYYYk',
    '...kYYYYyYYYYyYYk',
    '...kYyYYYYYyYYYYk',
    '..kYYYyYYyYYYYyYYk',
    '..kYyYYYYYYYyYYYYk',
    '.kyYYYyYYyYYYYYyYyk',
    '.kyyYYYYYYYyYYYYyyk',
    '.kyyyYYyYYYYYyYyyyk',
    '..kkyyyyyyyyyyyykk',
    '....kkkkkkkkkkkk'
  ];
  const REED = [
    '...C.....C...C..',
    '..CLC...CLC.CLC.',
    '..CLC...CLC.CLC.',
    '...L..C..L...L..',
    '...L.CLC.L...L..',
    '...y.CLC.y..Ly..',
    '...y..L..y..y...',
    '..ly..L.ly..y...',
    '..ly..y.ly.ly...',
    '..ly..y.ly.ly...',
    '..ly.ly.ly.ly...',
    '.llyllyllyllyl..'
  ];
  const STUMP = [
    '..kkkkkkkk',
    '.kTTTTTTTTk',
    'kTTtTTTtTTTk',
    'kTtTTtTTTtTk',
    'kbTTTTTTTTbk',
    'kbbbbbbbbbbk',
    'kBbbBbbbBbbk',
    '.kkBbbBbbkk',
    '...kkkkkk'
  ];
  const PERSIMMON = [
    '...kNk...',
    '..kkNkk..',
    '.kRRRRRk.',
    'kRRYRRRRk',
    'kRYRRRRRk',
    'kRRRRRRrk',
    'kRRRRRrrk',
    '.krRRrrk.',
    '..kkkkk..'
  ];
  const COIN = [
    '.kkkkk.',
    'kYYYYyk',
    'kYkkkyk',
    'kYkKkyk',
    'kYkkkyk',
    'kyyyyyk',
    '.kkkkk.'
  ];
  const POUCH = [
    '...kk....',
    '..kwwk...',
    '.kkiikk..',
    'kIIIIIIk.',
    'kIIiIIIk.',
    'kIIIIiIk.',
    '.kiiiik..',
    '..kkkk...'
  ];
  const BROOM = [
    '.......kk',
    '......kbk',
    '.....kbk',
    '....kbk',
    '..kkbk',
    '.kyykk',
    'kyyyyk',
    'kyyyk',
    '.kkk'
  ];

  // ================= 코드로 그린 것 =================
  function shadePix(x, c, X, Y) { x.fillStyle = c; x.fillRect(X, Y, 1, 1); }

  // 타원 몇 개를 겹쳐 수관을 만들고, 위는 밝게 아래는 어둡게.
  function canopy(c, ells, col, seed, sparse) {
    const w = c.width, h = c.height, x = c.getContext('2d');
    const m = new Uint8Array(w * h), sh = new Float32Array(w * h);
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
      let best = 9;
      for (const e of ells) {
        const dx = (X - e[0]) / e[2], dy = (Y - e[1]) / e[3];
        const d = dx * dx + dy * dy + (G.vnoise(X / 2.2, Y / 2.2, seed) - 0.5) * 0.45;
        if (d < 1) {
          const v = dy * 0.75 + dx * 0.3 + (G.vnoise(X / 3, Y / 3, seed + 3) - 0.5) * 0.9;
          if (best === 9 || v < best) best = v;
        }
      }
      if (best !== 9) {
        if (sparse && G.hash2(X >> 1, Y >> 1, seed) < sparse) continue;
        m[Y * w + X] = 1; sh[Y * w + X] = best;
      }
    }
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
      if (!m[Y * w + X]) continue;
      const edge = !X || !Y || X === w - 1 || Y === h - 1 ||
        !m[Y * w + X - 1] || !m[Y * w + X + 1] || !m[(Y - 1) * w + X] || !m[(Y + 1) * w + X];
      const v = sh[Y * w + X];
      shadePix(x, edge ? col[0] : v < -0.32 ? col[3] : v > 0.3 ? col[1] : col[2], X, Y);
    }
  }
  function trunk(c, cx, y0, y1, wd, cols, lean) {
    const x = c.getContext('2d');
    for (let Y = y0; Y <= y1; Y++) {
      const off = Math.round(Math.sin((Y - y0) / 6) * (lean || 0));
      const half = wd / 2 + (Y > y1 - 2 ? 1 : 0);
      for (let X = Math.floor(cx - half); X <= Math.ceil(cx + half - 1); X++) {
        const e = X === Math.floor(cx - half) || X === Math.ceil(cx + half - 1);
        shadePix(x, e ? cols[0] : (X < cx ? cols[2] : cols[1]), X + off, Y);
      }
    }
  }
  const PINE = ['#1c2c26', '#2c4a34', '#3d6240', '#587a48'];
  const OAK = ['#4a271b', '#8a4b2a', '#b86a34', '#d99a45'];
  const GINK = ['#5a4a1c', '#a8862f', '#d1ab3e', '#ead46a'];
  const GAM = ['#3d3020', '#6f5a30', '#8f7a3c', '#a89548'];
  const BUSH = ['#22352a', '#3f5a3a', '#557238', '#7a914a'];

  function pine(seed) {
    const c = cv(30, 42), r = G.mulberry(seed);
    trunk(c, 15, 18, 40, 3, ['#2e1c16', '#6e3f2d', '#8f5a3c'], 1.2);
    const j = () => (r() - 0.5) * 3;
    canopy(c, [[15 + j(), 9, 11, 6], [8 + j(), 15 + j(), 7, 4.5], [22 + j(), 17 + j(), 6.5, 4], [15, 21 + j(), 6, 3.2]], PINE, seed);
    c.ax = 15; return c;
  }
  function leafy(seed, col) {
    const c = cv(30, 40), r = G.mulberry(seed);
    trunk(c, 15, 24, 38, 4, ['#2a1c16', '#4c3524', '#6b4a32'], 0);
    const j = () => (r() - 0.5) * 3;
    canopy(c, [[15, 13, 14, 12.5], [7 + j(), 20, 7, 6.5], [23 + j(), 19, 7, 7]], col, seed);
    c.ax = 15; return c;
  }
  function gamTree(seed) {
    const c = cv(30, 40), x = c.getContext('2d'), r = G.mulberry(seed);
    trunk(c, 15, 16, 38, 3, ['#2a1c16', '#4c3524', '#6b4a32'], 0.8);
    // 가지
    x.fillStyle = '#2a1c16';
    for (let i = 0; i < 9; i++) { x.fillRect(15 - i, 18 - i, 2, 1); x.fillRect(15 + i, 17 - i, 2, 1); }
    for (let i = 0; i < 6; i++) { x.fillRect(11 - i, 22 - Math.round(i * 0.6), 2, 1); x.fillRect(19 + i, 23 - Math.round(i * 0.7), 2, 1); }
    canopy(c, [[15, 11, 12, 8], [8, 18, 5, 4], [23, 18, 5, 4]], GAM, seed, 0.5);
    for (let i = 0; i < 11; i++) {
      const X = 4 + Math.floor(r() * 22), Y = 5 + Math.floor(r() * 16);
      x.fillStyle = '#1b1a1f'; x.fillRect(X - 1, Y, 4, 2); x.fillRect(X, Y - 1, 2, 4);
      x.fillStyle = '#e0672a'; x.fillRect(X, Y, 2, 2);
      x.fillStyle = '#f09a4a'; x.fillRect(X, Y, 1, 1);
    }
    c.ax = 15; return c;
  }
  function dangsan() {
    const c = cv(60, 66), x = c.getContext('2d');
    trunk(c, 30, 34, 64, 9, ['#2a1c16', '#4c3524', '#6b4a32'], 0);
    canopy(c, [[30, 18, 26, 16], [13, 28, 11, 8], [47, 28, 11, 8], [30, 32, 14, 6]], GINK, 77);
    // 금줄
    x.fillStyle = '#1b1a1f'; x.fillRect(24, 49, 13, 3);
    x.fillStyle = '#e8e2d0'; x.fillRect(25, 50, 11, 1);
    x.fillStyle = '#a63c2e'; x.fillRect(27, 51, 1, 3);
    x.fillStyle = '#e8e2d0'; x.fillRect(30, 51, 1, 4); x.fillRect(33, 51, 1, 3);
    c.ax = 30; return c;
  }
  function bush(seed) {
    const c = cv(16, 12);
    canopy(c, [[8, 7, 7.5, 5]], BUSH, seed);
    c.ax = 8; return c;
  }
  function rock(seed, big) {
    const w = big ? 22 : 14, h = big ? 16 : 11, c = cv(w, h);
    canopy(c, [[w / 2, h / 2 + 1, w / 2 - 0.5, h / 2 - 1]], ['#2b2a2e', '#5a5c63', '#7d7e7c', '#a3a39c'], seed);
    c.ax = w / 2; return c;
  }

  function rect(x, col, X, Y, w, h) { x.fillStyle = col; x.fillRect(X, Y, w, h); }

  function house(kind) {
    const w = 72, h = 60, c = cv(kind === 'jumak' ? 90 : w, h), x = c.getContext('2d');
    const wt = 30, wb = 57;
    const wall = kind === 'neowa' ? '#7f6a52' : '#b99a6b';
    const wallD = kind === 'neowa' ? '#6a5642' : '#a3855a';
    rect(x, PAL.k, 5, wt, 62, wb - wt + 2);
    rect(x, wall, 6, wt, 60, wb - wt);
    for (let i = 0; i < 90; i++) {
      const X = 6 + Math.floor(G.hash2(i, 1, 5) * 60), Y = wt + Math.floor(G.hash2(i, 2, 5) * (wb - wt));
      rect(x, wallD, X, Y, 2, 1);
    }
    rect(x, '#6f6c66', 6, wb - 3, 60, 3);
    for (let X = 7; X < 65; X += 5) rect(x, '#55524e', X + Math.floor(G.hash2(X, 0, 2) * 2), wb - 3, 1, 3);
    for (const X of [6, 24, 45, 64]) rect(x, '#46301f', X, wt, 2, wb - 3 - wt);
    rect(x, '#46301f', 6, wt + 7, 60, 1);
    // 창호문
    const dx = kind === 'jumak' ? 12 : 29;
    rect(x, '#46301f', dx - 1, wt + 9, 15, wb - 3 - wt - 9);
    rect(x, '#e8e2d0', dx, wt + 10, 13, wb - 4 - wt - 10);
    x.fillStyle = '#93714a';
    for (let X = dx + 3; X < dx + 13; X += 3) x.fillRect(X, wt + 10, 1, 14);
    for (let Y = wt + 13; Y < wb - 4; Y += 4) x.fillRect(dx, Y, 13, 1);
    rect(x, '#46301f', dx + 6, wt + 10, 1, 14);
    // 들창
    const wx = kind === 'jumak' ? 30 : 50;
    rect(x, '#46301f', wx - 1, wt + 11, 11, 9);
    rect(x, '#e8e2d0', wx, wt + 12, 9, 7);
    x.fillStyle = '#93714a'; x.fillRect(wx + 4, wt + 12, 1, 7); x.fillRect(wx, wt + 15, 9, 1);
    if (kind === 'jumak') {
      // 평상
      rect(x, PAL.k, 43, 47, 24, 8); rect(x, '#8a6a44', 44, 48, 22, 4); rect(x, '#6b4a32', 44, 52, 22, 2);
      x.fillStyle = '#6b4a32'; for (let X = 47; X < 66; X += 4) x.fillRect(X, 48, 1, 4);
    }
    // 지붕
    const top = [], bot = [];
    for (let X = 0; X < w; X++) {
      const t = Math.abs(X / (w - 1) - 0.5) * 2;
      if (kind === 'neowa') { top[X] = Math.round(5 + 13 * t); bot[X] = 35; }
      else { top[X] = Math.round(3 + 17 * Math.pow(t, 2.4)); bot[X] = 34 + Math.round(G.hash2(X >> 1, 3, 9) * 2) - Math.round(4 * Math.pow(t, 3)); }
    }
    for (let X = 0; X < w; X++) {
      for (let Y = top[X]; Y <= bot[X]; Y++) {
        const edge = Y === top[X] || Y === bot[X] || X === 0 || X === w - 1 ||
          (X > 0 && (Y < top[X - 1] || Y > bot[X - 1])) || (X < w - 1 && (Y < top[X + 1] || Y > bot[X + 1]));
        let col;
        if (edge) col = PAL.k;
        else if (kind === 'neowa') {
          const row = Math.floor((Y - top[X] * 0.4) / 5);
          const jx = (X + row * 3) % 7 === 0, jy = Math.floor(Y - top[X] * 0.4) % 5 === 0;
          col = jy ? '#4a3d32' : jx ? '#55473a' : (G.hash2(Math.floor((X + row * 3) / 7), row, 4) < 0.4 ? '#8a7964' : '#77675a');
          if (Y > bot[X] - 3) col = '#4a3d32';
        } else {
          const ly = Y - top[X];
          const band = Math.floor(ly + G.hash2(X >> 1, 0, 8) * 2.2) % 6;
          col = ly < 3 ? '#ecd78c' : band === 0 ? '#9a7630' : (band === 1 ? '#bd963f' : (G.hash2(X, Y, 3) < 0.12 ? '#e6cc78' : '#cfa64a'));
          if (Y > bot[X] - 3) col = '#8a6a2b';
        }
        shadePix(x, col, X, Y);
      }
    }
    if (kind === 'neowa') {
      // 지붕 누르는 돌
      for (const [X, Y] of [[18, 18], [34, 10], [52, 20], [42, 26], [26, 27]]) {
        rect(x, PAL.k, X - 1, Y, 6, 4); rect(x, '#8e8f8c', X, Y, 4, 3); rect(x, '#b3b3aa', X, Y, 2, 1);
      }
    } else {
      // 용마름
      for (let X = 16; X < 56; X++) shadePix(x, X % 3 ? '#a67f33' : '#7d5d27', X, top[X] + 1);
    }
    if (kind === 'jumak') {
      // 장대와 초롱
      rect(x, PAL.k, 79, 8, 3, 50); rect(x, '#6b4a32', 80, 9, 1, 48);
      rect(x, PAL.k, 80, 8, 9, 2);
      rect(x, PAL.k, 82, 11, 7, 12); rect(x, '#a63c2e', 83, 12, 5, 5); rect(x, '#314b5a', 83, 17, 5, 5);
      rect(x, '#e6cc78', 84, 14, 3, 5);
    }
    c.ax = 36; return c;
  }

  function hut() {
    const c = cv(44, 40), x = c.getContext('2d');
    rect(x, PAL.k, 7, 22, 30, 17); rect(x, '#7f6a52', 8, 23, 28, 15);
    rect(x, '#2a211e', 17, 26, 10, 12);
    for (let X = 0; X < 44; X++) {
      const t = Math.abs(X / 43 - 0.5) * 2;
      const tp = Math.round(2 + 20 * t), bt = 25 - Math.round(3 * t * t);
      for (let Y = tp; Y <= bt; Y++) {
        const e = Y === tp || Y === bt || X === 0 || X === 43;
        const band = Math.floor(Y - tp + G.hash2(X >> 1, 0, 6) * 2) % 5;
        shadePix(x, e ? PAL.k : band === 0 ? '#7d5d27' : (Y - tp < 2 ? '#d9bd6a' : '#b08a3a'), X, Y);
      }
    }
    c.ax = 22; return c;
  }

  function kiln() {
    const c = cv(40, 30), x = c.getContext('2d');
    canopy(c, [[20, 20, 19, 15]], ['#1b1a1f', '#5a4636', '#7a6048', '#93785a'], 31);
    x.clearRect(0, 29, 40, 1);
    rect(x, PAL.k, 14, 16, 12, 14); rect(x, '#2a1410', 15, 17, 10, 13);
    rect(x, '#a63c2e', 17, 24, 6, 5); rect(x, '#cf6a3d', 18, 26, 4, 3); rect(x, '#e6cc78', 19, 27, 2, 2);
    rect(x, PAL.k, 0, 29, 40, 1);
    c.ax = 20; return c;
  }

  function stall(kind) {
    const c = cv(40, 34), x = c.getContext('2d');
    rect(x, PAL.k, 3, 8, 2, 25); rect(x, PAL.k, 35, 8, 2, 25);
    rect(x, '#6b4a32', 3, 9, 1, 24); rect(x, '#6b4a32', 35, 9, 1, 24);
    // 차일
    rect(x, PAL.k, 0, 0, 40, 10);
    for (let X = 1; X < 39; X++) rect(x, Math.floor(X / 5) % 2 ? '#e8e2d0' : (kind ? '#a63c2e' : '#314b5a'), X, 1, 1, 8);
    for (let X = 1; X < 39; X += 4) rect(x, PAL.k, X + 2, 8, 2, 2);
    // 좌판
    rect(x, PAL.k, 4, 20, 32, 9); rect(x, '#8a6a44', 5, 21, 30, 3); rect(x, '#6b4a32', 5, 24, 30, 4);
    const goods = kind ? ['#e8e2d0', '#cfa64a', '#e8e2d0', '#b99a6b'] : ['#cf6a3d', '#5f7d42', '#8e8f8c', '#a63c2e'];
    for (let i = 0; i < 4; i++) { rect(x, PAL.k, 7 + i * 7, 17, 6, 5); rect(x, goods[i], 8 + i * 7, 18, 4, 3); }
    c.ax = 20; return c;
  }

  function well() {
    const c = cv(22, 20), x = c.getContext('2d');
    canopy(c, [[11, 11, 10.5, 8]], ['#1b1a1f', '#5a5c63', '#8e8f8c', '#a9a9a2'], 12);
    rect(x, PAL.k, 5, 7, 12, 7); rect(x, '#2f4a66', 6, 8, 10, 5); rect(x, '#47708c', 7, 9, 4, 1);
    c.ax = 11; return c;
  }

  function pagoda() {
    const c = cv(34, 54), x = c.getContext('2d');
    const tier = (cy, bw, ew) => {
      // 지붕돌
      rect(x, PAL.k, 17 - ew, cy, ew * 2, 5);
      rect(x, '#b3b0a4', 17 - ew + 1, cy + 1, ew * 2 - 2, 1);
      rect(x, '#8e8b80', 17 - ew + 1, cy + 2, ew * 2 - 2, 2);
      rect(x, PAL.k, 17 - ew - 1, cy - 1, 2, 2); rect(x, PAL.k, 17 + ew - 1, cy - 1, 2, 2);
      // 몸돌
      rect(x, PAL.k, 17 - bw, cy + 5, bw * 2, 8);
      rect(x, '#9a968c', 17 - bw + 1, cy + 5, bw * 2 - 2, 8);
      rect(x, '#b3b0a4', 17 - bw + 1, cy + 5, 2, 8);
      rect(x, '#6f6c66', 17 + bw - 3, cy + 5, 2, 8);
    };
    rect(x, PAL.k, 15, 0, 4, 8); rect(x, '#9a968c', 16, 1, 2, 7); rect(x, PAL.k, 14, 3, 6, 2);
    tier(7, 5, 9); tier(20, 7, 12); tier(33, 9, 15);
    rect(x, PAL.k, 3, 46, 28, 8); rect(x, '#8e8b80', 4, 47, 26, 6); rect(x, '#b3b0a4', 4, 47, 26, 1);
    // 이끼
    for (let i = 0; i < 26; i++) {
      const X = 5 + Math.floor(G.hash2(i, 5, 1) * 24), Y = 10 + Math.floor(G.hash2(i, 6, 1) * 42);
      const d = x.getImageData(X, Y, 1, 1).data;
      if (d[3] && d[0] > 100) rect(x, '#6a7d4a', X, Y, 1, 1);
    }
    c.ax = 17; return c;
  }

  function boat(wreck) {
    const c = cv(46, 20), x = c.getContext('2d');
    for (let X = 0; X < 46; X++) {
      const t = Math.abs(X / 45 - 0.5) * 2;
      const tp = Math.round(3 + 5 * t * t * t), bt = Math.round(17 - 9 * Math.pow(t, 2.5));
      for (let Y = tp; Y <= bt; Y++) {
        const e = Y === tp || Y === bt || X === 0 || X === 45 || Y > Math.round(17 - 9 * Math.pow(Math.abs((X + 1) / 45 - 0.5) * 2, 2.5)) || Y > Math.round(17 - 9 * Math.pow(Math.abs((X - 1) / 45 - 0.5) * 2, 2.5));
        let col = e ? PAL.k : Y < tp + 3 ? '#8a6a44' : (Y - tp) % 4 === 0 ? '#46301f' : '#6b4a32';
        if (!e && Y > tp + 2 && Y < bt - 3 && X > 8 && X < 38) col = (X % 9 === 0) ? '#6b4a32' : '#3a281c';
        if (wreck && G.hash2(X >> 2, Y >> 2, 44) < 0.16 && X > 12 && X < 40) continue;
        shadePix(x, col, X, Y);
      }
    }
    c.ax = 23; return c;
  }

  function caveMouth() {
    const c = cv(36, 30), x = c.getContext('2d');
    canopy(c, [[18, 18, 17, 16]], ['#1b1a1f', '#4d4944', '#6a655f', '#8a857b'], 21);
    for (let Y = 8; Y < 30; Y++) for (let X = 8; X < 28; X++) {
      const dx = (X - 18) / 9, dy = (Y - 22) / 13;
      if (dx * dx + dy * dy < 1) shadePix(x, dx * dx + dy * dy > 0.78 ? '#1b1a1f' : '#0c0b0f', X, Y);
    }
    c.ax = 18; return c;
  }

  function sotdae() {
    const rows = ['..kk', '.kBBkkk', 'kBBBBBBk', '.kkBBBkk'];
    for (let i = 0; i < 30; i++) rows.push('...kbk');
    const c = mk(rows); c.ax = 4; return c;
  }

  function kiteTree() {
    const c = leafy(404, GINK), x = c.getContext('2d');
    const k = [[0, 3], [1, 2], [1, 3], [1, 4], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [5, 2], [5, 3], [5, 4], [6, 3]];
    rect(x, PAL.k, 16, 4, 9, 9);
    x.clearRect(16, 4, 9, 9);
    for (const [a, b] of k) { rect(x, PAL.k, 16 + b, 4 + a, 3, 3); }
    for (const [a, b] of k) rect(x, (a + b) % 2 ? '#e8e2d0' : '#a63c2e', 17 + b, 5 + a, 1, 1);
    rect(x, '#e8e2d0', 20, 12, 1, 5); rect(x, '#a63c2e', 21, 16, 1, 3);
    return c;
  }

  // ================= 한데 모으기 =================
  G.art = {
    cv, mk, flip, white,
    build() {
      const S = G.spr = {};
      const pl = (base, legs) => mk(base.concat(legs));
      const side = [pl(P_SIDE, LEGS_S), pl(P_SIDE, LEGS_S2)];
      S.player = {
        down: [pl(P_DOWN, LEGS_F), pl(P_DOWN, LEGS_F2), pl(P_DOWN, LEGS_F), pl(P_DOWN, LEGS_F3)],
        up: [pl(P_UP, LEGS_F), pl(P_UP, LEGS_F2), pl(P_UP, LEGS_F), pl(P_UP, LEGS_F3)],
        right: [side[0], side[1], side[0], side[1]],
        left: [flip(side[0]), flip(side[1]), flip(side[0]), flip(side[1])]
      };

      S.npc = {
        yeom: person('gat', BODY_M, { top: 'I', shade: 'i', bot: 'w', chin: 'w' }),
        kid: mk(CHILD, { '2': PAL.l, '4': PAL.i }),
        anak: person('woman', BODY_W, { top: 'w', shade: 'G', bot: 'I', bshade: 'i', acc: 'r' }),
        fisher: person('hat', BODY_M, { top: 'T', shade: 't', bot: 'G' }),
        jumo: person('woman', BODY_W, { top: 'l', shade: 'N', bot: 'r', bshade: 'd', acc: 'w' }),
        peddler: person('hat', BODY_M, { top: 'I', shade: 'i', bot: 'w' }),
        grain: person('knot', BODY_M, { top: 'T', shade: 't', bot: 'w' }),
        coal: person('knot', BODY_M, { top: 'K', shade: 'k', bot: 'g', chin: 'G', hair: 'G' }),
        monk: person('bald', BODY_M, { top: 'G', shade: 'g', bot: 'g' }),
        ijang: person('gat', BODY_M, { top: 'w', shade: 'G', bot: 'w', chin: 'w' }),
        dallae: person('woman', BODY_W, { top: 'Y', shade: 'y', bot: 'P', bshade: 'p', acc: 'i' }),
        herb: person('hat', BODY_M, { top: 'N', shade: 'n', bot: 'T' })
      };

      const two = (a, b) => { const A = mk(a), B = mk(b); return { r: [A, B], l: [flip(A), flip(B)] }; };
      S.crab = two(CRAB.concat(CRAB_L1), CRAB.concat(CRAB_L2));
      S.snake = two(SNAKE, SNAKE2);
      S.boar = two(BOAR.concat(BOAR_L1), BOAR.concat(BOAR_L2));
      S.dog = two(DOG.concat(DOG_L1), DOG.concat(DOG_L2));
      const wolfPal = { T: '#8e8f8c', t: '#5a5c63' };
      const w1 = mk(DOG.concat(DOG_L1), wolfPal), w2 = mk(DOG.concat(DOG_L2), wolfPal);
      S.wolf = { r: [w1, w2], l: [flip(w1), flip(w2)] };
      S.bat = two(BAT1, BAT2);
      const wi = mk(WISP);
      S.wisp = { r: [wi, flip(wi)], l: [wi, flip(wi)] };
      const im = mk(IMP);
      S.imp = { r: [im, shiftY(im, 1)], l: [flip(im), shiftY(flip(im), 1)] };
      const bo = mk(BOSS);
      S.boss = { r: [bo, bo], l: [bo, bo] };

      S.jangseung = mk(JANGSEUNG); S.jangseung.ax = 8;
      S.doltap = mk(DOLTAP);
      S.doltap2 = mk(DOLTAP_TOP.concat(DOLTAP));
      S.sign = mk(SIGN);
      S.chest = mk(CHEST); S.chestOpen = mk(CHEST_OPEN);
      const f = mk(FIRE); S.fire = [f, flip(f)];
      S.scarecrow = mk(SCARECROW);
      S.jar = mk(JAR); S.hay = mk(HAY); S.reed = [mk(REED), flip(mk(REED))]; S.stump = mk(STUMP);
      S.hpFull = mk(PERSIMMON);
      S.hpEmpty = mk(PERSIMMON, { R: PAL.K, Y: PAL.K, r: PAL.K, N: PAL.K });
      S.coin = mk(COIN); S.pouch = mk(POUCH); S.broom = mk(BROOM);

      S.pine = [pine(11), pine(23), pine(37)];
      S.oak = [leafy(51, OAK), leafy(64, OAK), leafy(72, GINK)];
      S.gam = [gamTree(81), gamTree(93)];
      S.dangsan = dangsan();
      S.bush = [bush(5), bush(9)];
      S.rock = [rock(3), rock(8), rock(15, true)];
      S.house = house('thatch'); S.neowa = house('neowa'); S.jumak = house('jumak');
      S.hut = hut(); S.kiln = kiln();
      S.stall = [stall(0), stall(1)];
      S.well = well(); S.pagoda = pagoda();
      S.boat = boat(false); S.wreck = boat(true);
      S.cavemouth = caveMouth(); S.sotdae = sotdae(); S.kitetree = kiteTree();
    }
  };
})();
