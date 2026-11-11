'use strict';
// 물건, 가게, 사람들 말, 할 일
(function () {
  const G = window.G;

  G.ITEMS = {
    rice: { name: '주먹밥', heal: 2, desc: '소금 간만 한 밥 한 덩이. 감 둘만큼 기운이 난다.' },
    gotgam: { name: '곶감', heal: 1, desc: '분이 하얗게 올랐다. 감 하나만큼 기운이 난다.' },
    muk: { name: '메밀묵', heal: 3, desc: '주모가 쑨 묵. 감 셋만큼 기운이 난다. 좋아하는 이가 따로 있다고 한다.' },
    bean: { name: '팥', thrown: true, desc: '던지는 것. 붉은 것은 잡것을 쫓는다고들 한다.' },
    salt: { name: '소금', good: true, desc: '소래 염전 소금. 한 되.' },
    fish: { name: '마른 생선', good: true, desc: '갯바람에 말린 것. 한 두름.' },
    coal: { name: '숯', good: true, desc: '솔밭 숯막에서 구운 참숯. 한 섬.' },
    grain: { name: '쌀', good: true, desc: '한내 들 쌀. 한 되.' },
    herb: { name: '약초', good: true, desc: '재 너머 산에서 캔 것. 한 묶음.' },
    crab: { name: '게', sell: 2, desc: '갯가에서 잡았다. 아직 꿈틀거린다.' },
    skin: { name: '뱀 허물', sell: 4, desc: '약재상이 사 간다고 들었다.' },
    meat: { name: '멧돼지 고기', sell: 7, desc: '질기지만 고기는 고기다.' },
    pelt: { name: '늑대 가죽', sell: 12, desc: '겨울 나기 전에 찾는 사람이 많다.' },
    broom: { name: '몽당빗자루', sell: 15, desc: '굴에서 날뛰던 것이 쓰러진 자리에 이것만 남았다.' },
    moktak: { name: '목탁', key: true, desc: '손때가 반질반질하다. 절터 스님 것.' },
    letter: { name: '주모의 편지', key: true, desc: '너와골 달래에게. 봉한 자리에 밥풀이 묻어 있다.' },
    kite: { name: '연', key: true, desc: '방패연. 귀퉁이에 "돌이"라고 삐뚤게 써 있다.' }
  };
  G.WEAPONS = [
    { name: '지게 작대기', dmg: 1, desc: '지게 받치던 작대기.' },
    { name: '박달 방망이', dmg: 2, desc: '숯쟁이가 쓰던 것. 묵직하다.' },
    { name: '닳은 도리깨', dmg: 3, desc: '씨름판에 남아 있던 것. 손에 쥐면 팔이 먼저 나간다.' }
  ];
  G.GEAR = {
    jige: { name: '큰 지게', desc: '짐을 열 개까지 진다.' },
    shoes: { name: '새 짚신', desc: '걸음이 조금 빨라진다.' },
    lantern: { name: '초롱', desc: '밤길과 굴 속이 넓게 보인다.' }
  };

  // sell: 가게가 파는 값, buys: 가게가 사 주는 값
  G.SHOPS = {
    sorae: { title: '염 영감 객주', sell: [['salt', 4], ['fish', 6], ['rice', 3]], buys: { salt: 3, fish: 5, coal: 12, grain: 9, herb: 18 } },
    hannae: { title: '싸전', sell: [['grain', 7], ['salt', 9], ['fish', 12]], buys: { salt: 7, fish: 10, coal: 9, grain: 5, herb: 14 } },
    misc: { title: '장돌뱅이 좌판', sell: [['rice', 3], ['gotgam', 2], ['bean', 2], ['@jige', 60], ['@shoes', 35], ['@lantern', 45]], buys: {} },
    jumak: { title: '주막', sell: [['rice', 3]], buys: {} },
    coal: { title: '숯막', sell: [['coal', 5]], buys: { grain: 11, salt: 10, fish: 11 } },
    neowa: { title: '약초꾼', sell: [['herb', 7], ['coal', 8], ['gotgam', 2]], buys: { salt: 20, fish: 18, grain: 13, coal: 6, herb: 5 } }
  };

  G.SIGNS = {
    north: '북 — 검은재, 너와골\n남 — 한내 장터',
    mid: '서남 — 소래 갯마을\n동북 — 한내 장터',
    pass: '검은재.\n누가 숯으로 덧써 놓았다. "해 지고 넘지 마시오"\n그 밑에 다른 글씨. "해 떠 있을 땐 못 넘소"'
  };
  G.CHESTS = {
    c_wreck: { money: 40, items: { gotgam: 2 }, text: '물 먹은 궤짝. 엽전 꿰미와 곶감이 들어 있다.' },
    c_view: { money: 60, text: '누가 묻어 둔 궤짝. 엽전이 들어 있다.' },
    c_cave: { money: 50, items: { bean: 5 }, text: '엽전과 팥 한 줌. 저희가 무서워하는 걸 왜 모아 뒀을까.' },
    c_moktak: { items: { moktak: 1 }, text: '목탁이다. 채는 없다.' }
  };

  const say = (n, t) => G.ui.say(n, t);

  G.NPCS = {
    yeom: {
      name: '염 영감', talk(s) {
        const f = s.flags;
        if (!f.main) {
          say('염 영감', ['왔느냐. 소금 넉 되, 지게에 얹어 놨다.',
            '검은재 너머 너와골에 소금 끊긴 지가 석 달이다. 고개에 뭐가 나온다고 장꾼들이 발을 끊었어.',
            '가 볼 테면 가 봐라. 거기선 소금 한 되에 스무 푼은 쳐 준다.',
            '한내 장터 지나서 북쪽이다. 길은 장승 보고 찾고.']);
          G.ui.run(() => { f.main = 1; G.game.toast('할 일이 생겼다: 재 너머 소금'); });
          return;
        }
        if (f.main === 3 && !f.yeomDone) {
          f.yeomDone = 1;
          say('염 영감', ['너와골에서 기별이 왔더라.', '……밥은 먹고 다니냐.']);
        } else say('염 영감', G.game.isNight() ? '밤길 걷지 말라니까. 뭘 줄까.' : '소금은 여기가 제일 싸다. 질 수 있는 만큼 가져가.');
        G.ui.shop('sorae');
      }
    },
    kid: {
      name: '돌이', talk(s) {
        const f = s.flags;
        if (f.kite === 2) { say('돌이', '바람 불면 날리러 갈 거야. 아재도 볼래?'); return; }
        if (G.game.count('kite')) {
          say('돌이', ['어, 내 연!', '이거 할매가 준 건데, 아재 먹어.']);
          G.ui.run(() => { G.game.take('kite', 1); G.game.give('gotgam', 3); f.kite = 2; });
          return;
        }
        f.kite = 1;
        say('돌이', ['내 연…… 줄이 끊어져서 갈대밭 쪽으로 날아갔어.', '동쪽에, 강 건너서, 키 큰 나무 있는 데.']);
      }
    },
    anak: {
      name: '아낙', talk() {
        if (G.game.isNight()) say('아낙', '밤엔 갯가에 불이 떠다녀. 파란 거. 따라가면 못 써.');
        else say('아낙', ['볕이 짧아져서 소금이 더디 와.', '올해 마지막 소금이야. 서리 오면 염전도 접어.']);
      }
    },
    fisher: {
      name: '어부', talk(s) {
        s.flags.fisherN = (s.flags.fisherN || 0) + 1;
        if (s.flags.fisherN % 2) say('어부', ['배는 못 태워 준다. 밑창이 샜어.', '고칠 나무를 사려면 고기를 잡아야 하는데, 고기를 잡으려면 배가 있어야 하고.']);
        else say('어부', '게는 동쪽 모래톱에 많다. 옆으로 오니까 앞에서 치면 돼.');
      }
    },
    jumo: {
      name: '주모', talk(s) {
        const f = s.flags, cost = f.crab === 2 ? 0 : 5;
        if (!f.metJumo) { f.metJumo = 1; say('주모', ['처음 보는 얼굴이네. 소래서 왔어?', '염 영감은 여태 정정하고? 그 양반 외상이 아직 석 냥이야.']); }
        else say('주모', '왔어.');
        const opts = ['하룻밤 묵는다' + (cost ? ' (' + cost + '푼)' : ''), '먹을 것을 산다', '이야기를 듣는다', '그만둔다'];
        G.ui.choice(opts, i => {
          if (i === 0) {
            if (!G.game.pay(cost)) { say('주모', '외상은 염 영감 하나로 족해.'); return; }
            say('주모', cost ? '윗목은 차니까 아랫목에 누워.' : '아랫목 비워 놨어.');
            G.ui.run(() => G.game.sleep());
          } else if (i === 1) G.ui.shop('jumak');
          else if (i === 2) this.story(s);
        });
      },
      story(s) {
        const f = s.flags;
        if (!f.crab) {
          f.crab = 1;
          say('주모', ['게장을 담가야 하는데 갯가까지 갈 사람이 없네.', '게 다섯 마리만 잡아다 줘. 그럼 잠은 그냥 재워 줄게. 묵도 쑤어 놓고.']);
        } else if (f.crab === 1) {
          const n = G.game.count('crab');
          if (n >= 5) {
            say('주모', ['됐네, 됐어. 실한 걸로 잡았네.', '이제 잠은 그냥 자. 묵은 다섯 푼.']);
            G.ui.run(() => { G.game.take('crab', 5); f.crab = 2; G.game.toast('주막에서 메밀묵을 판다'); });
          } else say('주모', n ? '아직 ' + (5 - n) + '마리 모자라.' : '게는 소래에서 동쪽 모래톱.');
        } else if (!f.letter) {
          say('주모', ['너와골에 동생이 살아. 달래라고.', '고개 막히고는 기별을 못 했어. 넘어가거든 이것 좀 전해 줘.']);
          G.ui.run(() => { f.letter = 1; G.game.give('letter', 1); });
        } else {
          f.rumor = ((f.rumor || 0) + 1) % 4;
          say('주모', [
            ['고개의 그 양반은 묵이라면 사족을 못 쓴다던데. 옛말이야, 옛말.', '세 모는 들고 가야 체면이 서겠지.'],
            ['동쪽 절터에 스님 하나가 눌러앉았어. 절도 없는데 뭘 지키는지.'],
            ['숯쟁이 영감은 사람보다 멧돼지를 더 자주 본대. 솔밭 서쪽 깊숙이 살아.'],
            ['돌탑 보이거든 돌 하나 얹고 가. 손해 볼 건 없잖아.']
          ][f.rumor]);
        }
      }
    },
    peddler: {
      name: '장돌뱅이', talk() { say('장돌뱅이', '없는 것 빼고 다 있소.'); G.ui.shop('misc'); }
    },
    grain: {
      name: '싸전 주인', talk(s) {
        say('싸전 주인', s.flags.main >= 2 ? '고개가 열렸다며? 쌀값이 오르겠구먼.' : '쌀은 한내 쌀이지. 갯것도 받아.');
        G.ui.shop('hannae');
      }
    },
    coal: {
      name: '숯쟁이', talk(s) {
        const f = s.flags;
        if (!f.boar) {
          f.boar = 1; f.boarKills = 0;
          say('숯쟁이', ['……사람이네. 멧돼지인 줄 알았지.', '요새 그놈들이 가마 옆까지 내려와. 세 마리만 쫓아 주면 내가 쓰던 방망이를 주지. 박달나무야.']);
          return;
        }
        if (f.boar === 1) {
          const left = 3 - (f.boarKills || 0);
          if (left > 0) { say('숯쟁이', '아직 ' + left + '마리. 달려들 땐 옆으로 비켜.'); G.ui.shop('coal'); return; }
          say('숯쟁이', ['조용해졌네. 받아.', '작대기보단 나을 거다.']);
          G.ui.run(() => { f.boar = 2; s.gear.weapon = Math.max(s.gear.weapon, 1); G.sfx('save'); G.game.toast('박달 방망이를 얻었다'); });
          return;
        }
        say('숯쟁이', '숯은 다섯 푼. 쌀 가져오면 후하게 쳐 준다.');
        G.ui.shop('coal');
      }
    },
    monk: {
      name: '스님', talk(s) {
        const f = s.flags;
        if (!f.moktak) {
          f.moktak = 1;
          say('스님', ['절은 없고 터만 남았습니다. 저도 지나가다 눌러앉은 것이고요.',
            '북동쪽 벼랑 밑 굴에 사는 것들이 목탁을 집어 갔습니다.',
            '두드릴 것이 없으니 염불이 영 헛돕니다. 혹 그쪽으로 가시거든.']);
          return;
        }
        if (f.moktak === 1) {
          if (G.game.count('moktak')) {
            say('스님', ['아, 이겁니다. 고맙습니다.', '드릴 것이 이것뿐입니다. 제가 쓴 부적이라 영험은 장담 못 합니다만.']);
            G.ui.run(() => { G.game.take('moktak', 1); f.moktak = 2; s.maxhp++; s.hp = s.maxhp; G.sfx('save'); G.game.toast('부적을 받았다. 감이 하나 늘었다'); });
          } else say('스님', '굴은 여기서 북동쪽입니다. 어두우니 불을 챙기시지요.');
          return;
        }
        say('스님', s.flags.pass ? '고개가 열렸다지요. 저는 여기가 좋습니다.' : ['고개의 그이와 씨름을 하시려거든 왼다리를 거십시오.', '옛이야기엔 다 그렇게 나옵니다. 그이의 왼편, 그러니까 마주 보고 오른쪽에 서서 치라는 말이겠지요.']);
      }
    },
    ijang: {
      name: '이장', talk(s) {
        const f = s.flags;
        if (f.main === 3) { say('이장', '김장을 다시 담갔소. 올겨울은 나겠어.'); return; }
        if (!f.metIjang) { f.metIjang = 1; say('이장', ['고개를 넘어왔다고? 사람이?', '소금…… 소금 있소?']); }
        else say('이장', '소금은, 가져왔소?');
        if (G.game.count('salt') < 3) { say('이장', '세 되만 있어도 온 마을이 한 달은 버티는데.'); return; }
        G.ui.choice(['소금 세 되를 내놓는다', '아직은'], i => {
          if (i !== 0) return;
          G.game.take('salt', 3);
          say('이장', ['이게 얼마 만이오.', '값은 마을에서 모은 것이오. 받아 두시오.']);
          G.ui.run(() => { f.main = 3; G.game.earn(80); });
          G.ui.card(['그날 저녁 너와골에서는', '집집이 간이 맞는 국을 끓였다.', '', '재 너머', '', '준비한 이야기는 여기까지입니다.', '길은 그대로 열려 있습니다.']);
        });
      }
    },
    herb: {
      name: '약초꾼', talk() { say('약초꾼', '산엣것은 싸고 갯것은 비싸오. 반대로 들고 다니면 돈이 되지.'); G.ui.shop('neowa'); }
    },
    dallae: {
      name: '달래', talk(s) {
        const f = s.flags;
        if (f.letter === 1 && G.game.count('letter')) {
          say('달래', ['언니 글씨네.', '……', '고개가 열렸으면 설에는 내려가 볼 수 있겠다. 이건 심부름 값.']);
          G.ui.run(() => { G.game.take('letter', 1); f.letter = 2; G.game.earn(30); G.game.give('gotgam', 2); });
          return;
        }
        say('달래', f.letter === 2 ? '언니한테 잘 지낸다고 전해 줘요. 살은 좀 빠졌다고 하고.' : '아랫마을 사람이에요? 한내 주막은 아직 있어요?');
      }
    }
  };

  // 고개의 외다리
  G.BOSS = {
    meet(s, onFight, onMuk, onLeave) {
      const f = s.flags;
      if (!f.metBoss) {
        f.metBoss = 1;
        say('외다리', ['어이, 김 서방!']);
        say('', '김가가 아니라고 했다.');
        say('외다리', ['사람은 다 김 서방이야.', '씨름 한판 하자. 이기면 보내 주지. 닭 울기 전까지다.']);
      } else say('외다리', '또 왔네, 김 서방. 한판 하자.');
      const opts = ['씨름을 받는다'];
      const muk = G.game.count('muk') >= 3;
      if (muk) opts.push('메밀묵 세 모를 내민다');
      opts.push('돌아선다');
      G.ui.choice(opts, i => {
        if (i === 0) { say('외다리', '좋다!'); G.ui.run(onFight); }
        else if (muk && i === 1) {
          G.game.take('muk', 3);
          say('외다리', ['묵이냐. 메밀묵이냐.', '……', '가라. 고개는 네 거다.', '아니, 잠깐. 내일 밤에 또 와라. 꾼 돈 갚아야지.']);
          say('', '꿔 준 적이 없다고 했다.');
          say('외다리', '갚는다니까.');
          G.ui.run(onMuk);
        } else G.ui.run(onLeave);
      });
    },
    friend(s) {
      const f = s.flags;
      if (f.paidDay === s.day) { say('외다리', '오늘 치는 줬다. 내일 또 와.'); return; }
      f.paidDay = s.day;
      say('외다리', ['왔냐, 김 서방. 어제 꾼 돈.', '세지 마라. 맞다.']);
      G.ui.run(() => G.game.earn(10));
    }
  };

  // 봇짐의 '할 일' 쪽에 적히는 글
  G.questLog = function (s) {
    const f = s.flags, out = [];
    const add = (title, text, done) => out.push({ title, text, done });
    if (f.main) {
      if (f.main === 3) add('재 너머 소금', '너와골에 소금을 넘겼다.', true);
      else if (f.pass) add('재 너머 소금', '고개가 열렸다. 너와골 이장에게 소금 세 되를.');
      else add('재 너머 소금', '너와골에 소금이 끊겼다. 한내 장터에서 북쪽, 검은재를 넘어야 한다.' + (f.looped ? ' 낮에는 길이 제자리로 돌아온다.' : ''));
    }
    if (f.boar) add('숯막의 멧돼지', f.boar === 2 ? '멧돼지를 쫓고 박달 방망이를 받았다.' : '솔밭 멧돼지 세 마리. (' + Math.min(3, f.boarKills || 0) + '/3) 끝나면 숯쟁이에게.', f.boar === 2);
    if (f.crab) add('주모의 게장', f.crab === 2 ? '게를 잡아다 주었다. 주막 잠자리는 공짜.' : '게 다섯 마리를 한내 주모에게. (' + Math.min(5, G.game.count('crab')) + '/5)', f.crab === 2);
    if (f.letter) add('달래에게', f.letter === 2 ? '편지를 전했다.' : '주모의 편지를 너와골 달래에게.', f.letter === 2);
    if (f.moktak) add('스님의 목탁', f.moktak === 2 ? '목탁을 찾아 주었다.' : '절터 북동쪽 굴에서 목탁을 찾아 스님에게.', f.moktak === 2);
    if (f.kite) add('돌이의 연', f.kite === 2 ? '연을 찾아 주었다.' : '강 건너 갈대밭, 키 큰 나무에 걸린 연.', f.kite === 2);
    const d = ['d1', 'd2', 'd3', 'd4', 'd5'].filter(k => f[k]).length;
    if (d) add('돌탑', d >= 5 ? '다섯 군데에 모두 돌을 얹었다.' : '돌을 얹은 돌탑 ' + d + '/5', d >= 5);
    return out;
  };
})();
