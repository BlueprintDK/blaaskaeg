/* Blå skæg – Kanondyst (vores eget artilleri-spil) for 2-4 spillere.
 * På sin tur sigter man (vinkel + kraft) og skyder. Vinden skifter hver tur. Granaterne sprænger kratere i terrænet,
 * og kanoner falder ned, hvis jorden under dem forsvinder. Sidste kanon med liv vinder (+5). Et nedskud giver +2.
 * Våben: Granat (ubegrænset), Storbombe (2 stk.), Trippelskud (2 stk.), Jorddrop (fås ved at skyde flyet ned, maks 3).
 * Jorddrop lægger en jordbunke – en begravet kanon kan kun grave sig fri (højst 55 px jord pr. tur).
 * Sværhedsgrader (vælges i lobbyen): Let / Normal / Svær – vind, turtid, sigtelinje, klippehøjde og hvor tit flyet kommer. */
(function () {
  const { esc, rnd } = BS;
  const VW = 1000, VH = 620, KOL = 4, NK = VW / KOL, TYNGDE = 260, FART = 7.6, DT = .016;
  /* 18/11-2026 (Michael): sværhedsgrader – vind, turtid, hvor meget af banen man ser, klippehøjde og hvor tit flyet kommer */
  const NIV = {
    let: { navn: 'Let', vind: 20, frist: 60000, forud: 150, tinde: .6, fly: 1 / 30 },
    normal: { navn: 'Normal', vind: 40, frist: 45000, forud: 70, tinde: 1, fly: 1 / 45 },
    svær: { navn: 'Svær', vind: 70, frist: 30000, forud: 0, tinde: 1.35, fly: 1 / 70 },
  };
  /* 18/11-2026 (Michael: «flere typer bomber»): Hoppebombe preller én gang af jorden, Klyngebombe deler sig i 5 på toppen
     af buen, Borebombe borer sig ned og laver et dybt krater (god mod begravede). Megabombe og Jorddrop fås kun fra flyets kasser. */
  const VÅBEN = { std: { navn: 'Granat', r: 34, dmg: 42 }, stor: { navn: 'Storbombe', r: 64, dmg: 58 }, tre: { navn: 'Trippelskud', r: 26, dmg: 26 },
    hop: { navn: 'Hoppebombe', r: 40, dmg: 46 }, klynge: { navn: 'Klyngebombe', r: 26, dmg: 24 }, bor: { navn: 'Borebombe', r: 38, dmg: 54 },
    mega: { navn: 'Megabombe', r: 105, dmg: 75 }, jord: { navn: 'Jorddrop', r: 72, dmg: 0 } };   // jorddrop: lægger en jordbunke
  const IKON = { std: '💣', stor: '💥', tre: '🎆', hop: '🏀', klynge: '🎇', bor: '🔩', mega: '☢️', jord: '🟫' };
  const START_VÅBEN = () => ({ stor: 2, tre: 2, hop: 2, klynge: 1, bor: 1, mega: 0, jord: TEST ? 2 : 0 });
  /* 18/11-2026 (Michael: «flere typer airdrops»): flyet har en tilfældig kasse med – den ses på kassen under flyet */
  const KASSER = { jord: { ikon: '🟫', navn: 'jorddrop', farve: '#a8743d' }, skjold: { ikon: '🛡️', navn: 'skjold', farve: '#4cc9f0' },
    rep: { ikon: '❤️', navn: '+30 liv', farve: '#ef476f' }, mega: { ikon: '☢️', navn: 'megabombe', farve: '#ffd166' }, klynge: { ikon: '🎇', navn: 'klyngebombe', farve: '#8338ec' } };
  const KASSE_VÆGT = [['jord', 3], ['skjold', 2], ['rep', 2], ['klynge', 2], ['mega', 1]];
  const tilfKasse = () => { let r = Math.random() * KASSE_VÆGT.reduce((s, k) => s + k[1], 0); for (const [k, w] of KASSE_VÆGT) { r -= w; if (r <= 0) return k; } return 'jord'; };
  function åbnKasse(H, t, k) {
    if (k === 'jord') t.våben.jord = Math.min(3, (t.våben.jord || 0) + 1);
    if (k === 'skjold') t.skjold = 40;
    if (k === 'rep') t.hp = Math.min(100, t.hp + 30);
    if (k === 'mega') t.våben.mega = Math.min(2, (t.våben.mega || 0) + 1);
    if (k === 'klynge') t.våben.klynge = Math.min(3, (t.våben.klynge || 0) + 1);
  }
  const skjoldTag = (o, s) => { if (o.skjold > 0) { const a = Math.min(o.skjold, s); o.skjold -= a; s -= a; } return s; };
  /* layout: stående = som før (banner, bane, ur, styring under hinanden); liggende = bane til venstre, resten i en kolonne */
  const KD_CSS = '.kd-lay{display:grid;grid-template-areas:"ban" "bane" "ur" "styr";gap:0}'
    + '#kd-ban{grid-area:ban}.kd-bane{grid-area:bane}#kd-ur{grid-area:ur;margin-top:8px}#kd-styr{grid-area:styr}'
    + '#kd-cv{display:block;width:100%;border-radius:16px;touch-action:none}'
    + '.kd-våben{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px}.kd-våben .btn{font-size:14px;padding:10px 8px}'
    + '@media (orientation:landscape) and (max-height:600px),(min-width:900px) and (orientation:landscape){'
    + '#app:has(.kd-lay){max-width:none;padding-top:calc(4px + env(safe-area-inset-top));padding-left:calc(10px + env(safe-area-inset-left));padding-right:calc(10px + env(safe-area-inset-right))}'
    + '#app:has(.kd-lay) .top{margin-bottom:4px}#app:has(.kd-lay) .top .btn{padding:7px 12px}'
    + '.kd-lay{grid-template-columns:minmax(0,1fr) 250px;grid-template-areas:"bane ban" "bane ur" "bane styr";column-gap:12px;align-content:start}'
    + '#kd-cv{width:auto;height:auto;max-width:100%;max-height:calc(100vh - 64px - env(safe-area-inset-top) - env(safe-area-inset-bottom));margin:0 auto}'
    + '#kd-ban .banner{font-size:15px;padding:8px;margin:0 0 6px}#kd-ur{margin-top:0}'
    + '#kd-styr .hint{font-size:12px!important}.kd-våben{grid-template-columns:1fr 1fr}.kd-våben .btn{font-size:12.5px;padding:8px 4px}'
    + '.kd-drej{display:none}}'
    + '@media (orientation:landscape){.kd-drej{display:none}}';
  const TEST = false;   // kun til udvikling: true giver 2 jorddrop fra start og fly med det samme
  /* en kanon er begravet, når der ligger jord oven over den – så kan den kun grave sig fri */
  const begravet = (J, t) => t.hp > 0 && [-10, 0, 10].some(dx => jordVed(J, t.x + dx) < t.y - 30);
  const jordVed = (J, x) => { const i = Math.max(0, Math.min(NK - 1, Math.round(x / KOL))); return J[i]; };
  function nytTerræn(fak) {
    const p = [Math.random() * 6, Math.random() * 6, Math.random() * 6, Math.random() * 6], J = [];
    /* 18/11-2026 (Michael): højere klipper – større bjerge, skarpe tinder og stejle kløfter */
    const tinder = [0, 1, 2].map(() => ({ x: 120 + Math.random() * 760, h: (110 + Math.random() * 130) * (fak || 1), b: 40 + Math.random() * 50 }));
    for (let i = 0; i < NK; i++) {
      const x = i * KOL;
      let y = 430 + 120 * Math.sin(x * .0058 + p[0]) + 55 * Math.sin(x * .017 + p[1]) + 22 * Math.sin(x * .05 + p[2]) + 8 * Math.sin(x * .14 + p[3]);
      tinder.forEach(t => { const d = Math.abs(x - t.x) / t.b; if (d < 1) y -= t.h * Math.pow(1 - d, 1.4); });   // spidse klippetoppe
      J.push(y < 110 ? 110 - (110 - y) * .35 : Math.min(585, y));             // blød top i stedet for flad klippe
    }
    for (let i = 0; i < NK; i++) J[i] = Math.max(55, J[i]);
    return J;
  }
  /* kanonen falder, hvis jorden under den forsvinder – men løftes ikke op, når der kommer jord ovenpå (så er den begravet) */
  function sænk(G, t) { const ny = jordVed(G.jord, t.x); if (ny > t.y + 1) { const fald = ny - t.y; t.y = ny; if (fald > 24) { const s = skjoldTag(t, Math.round((fald - 24) / 4)); t.hp -= s; return s; } } return 0; }
  const flyX = (f, T) => f.x0 + f.vx * (T - f.t0) / 1000;
  function næste(G) { const n = G.tanks.length; for (let k = 1; k <= n; k++) { const j = (G.tur + k) % n; if (G.tanks[j].hp > 0 && !G.tanks[j].ude) return j; } return G.tur; }

  /* én projektil-bane. art: 'bombe' | 'jord' | 'hop' (preller én gang) | 'klynge' (stopper på toppen og deler sig) | 'bor' (borer ned) */
  function flyv(H, G, t, x, y, vx, vy, art, s0, tf) {
    const pts = [[Math.round(x), Math.round(y)]]; let ramt = null, type = art === 'jord' ? 'jord' : 'bombe', hop = 0;
    for (let s = s0; s < 3000; s++) {
      const vyFør = vy;
      vx += G.vind * DT; vy += TYNGDE * DT; x += vx * DT; y += vy * DT;
      if (s % 2 === 0) pts.push([Math.round(x), Math.round(y)]);
      if (x < -40 || x > VW + 40 || y > VH + 40) break;
      if (art === 'klynge' && vyFør < 0 && vy >= 0) return { pts, ramt: null, type: 'del', x, y, vx, vy, s };
      /* flyet: rammer man det, falder det ned, og man får kassens indhold */
      if (G.fly) { const fx = flyX(G.fly, tf + s * DT * 1000); if (fx > 10 && fx < VW - 10 && Math.hypot(fx - x, G.fly.y - y) < 34) {
        ramt = [x, y]; type = 'fly'; const k = G.fly.kasse || 'jord'; G.fly = null; åbnKasse(H, t, k);
        G.flyNed = { af: t.e, n: (G.flyNed ? G.flyNed.n : 0) + 1, kasse: k }; H.giv(t.e, 1); break; } }
      if (x >= 0 && x <= VW && y >= jordVed(G.jord, x)) {
        if (art === 'klynge') return { pts, ramt: null, type: 'del', x, y: jordVed(G.jord, x) - 6, vx: vx * .3, vy: -170, s };   // rammer før toppen: deler sig ved nedslaget
        if (art === 'hop' && hop === 0) { hop = 1; y = jordVed(G.jord, x) - 2; vy = -Math.abs(vy) * .55; vx *= .8; continue; }
        ramt = [x, jordVed(G.jord, x) + (art === 'bor' ? 70 : 0)]; if (art === 'bor') type = 'bor'; break;
      }
      const tank = G.tanks.find(o => o.hp > 0 && Math.hypot(o.x - x, o.y - 14 - y) < 24 && (o !== t || s > 25));
      if (tank) { if (art === 'klynge') return { pts, ramt: null, type: 'del', x, y: y - 6, vx: vx * .3, vy: -170, s }; ramt = [x, y]; break; }
    }
    pts.push([Math.round(x), Math.round(y)]);
    return { pts, ramt, type };
  }
  function skyd(H, G, t) {
    const valg = t.våbenValg, w = VÅBEN[valg] || VÅBEN.std;
    const vinkler = valg === 'tre' ? [t.vinkel - 6, t.vinkel, t.vinkel + 6] : [t.vinkel];
    const art = valg === 'jord' ? 'jord' : valg === 'hop' ? 'hop' : valg === 'klynge' ? 'klynge' : valg === 'bor' ? 'bor' : 'bombe';
    const baner = [], eks = [], tf = Date.now();
    const læg = (b, r, dmg) => { baner.push(b.pts); eks.push(b.ramt ? { x: Math.round(b.ramt[0]), y: Math.round(b.ramt[1]), r: b.type === 'fly' ? 30 : r, dmg, type: b.type } : null); };
    vinkler.forEach(vg => {
      const a = vg * Math.PI / 180, v = t.kraft * FART;
      const b = flyv(H, G, t, t.x + Math.cos(a) * 38, t.y - 24 - Math.sin(a) * 38, Math.cos(a) * v, -Math.sin(a) * v, art, 0, tf);
      if (b.type === 'del') {
        /* klyngebomben deler sig i 5 – hver lille bombe får hovedbanen foran sig, så animationen starter dem på toppen */
        [-2, -1, 0, 1, 2].forEach(k => { const c = flyv(H, G, t, b.x, b.y, b.vx + k * 48, b.vy - 30, 'bombe', b.s, tf); læg({ pts: b.pts.concat(c.pts), ramt: c.ramt, type: c.type }, w.r, w.dmg); });
      } else læg(b, w.r, w.dmg);
    });
    /* sprængninger: kratere + skade – eller en jordbunke ved jorddrop */
    const skade = {};
    eks.forEach(e => {
      if (!e) return;
      if (e.type === 'jord') {
        for (let i = 0; i < NK; i++) { const dx = i * KOL - e.x; if (Math.abs(dx) < e.r) { const top = e.y + 20 - Math.sqrt(e.r * e.r - dx * dx) * 1.05; if (top < G.jord[i]) G.jord[i] = Math.max(40, top); } }
        return;
      }
      if (e.type === 'fly') return;
      for (let i = 0; i < NK; i++) { const dx = i * KOL - e.x; if (Math.abs(dx) < e.r) { const bund = e.y + Math.sqrt(e.r * e.r - dx * dx); if (bund > G.jord[i]) G.jord[i] = Math.min(VH - 4, bund); } }
      G.tanks.forEach(o => { if (o.hp <= 0) return; const d = Math.hypot(o.x - e.x, o.y - 10 - e.y); if (d < e.r + 14) { const s = skjoldTag(o, Math.round(e.dmg * (1 - d / (e.r + 14)) + 4)); o.hp -= s; skade[o.e] = (skade[o.e] || 0) + s; } });
    });
    G.tanks.forEach(o => { if (o.hp > 0) { const s = sænk(G, o); if (s) skade[o.e] = (skade[o.e] || 0) + s; } });
    const døde = [];
    G.tanks.forEach(o => { if (o.hp <= 0 && !o.død) { o.hp = 0; o.død = true; døde.push(o.e); if (o.e !== t.e) H.giv(t.e, 2); } });
    if (t.våbenValg !== 'std') { t.våben[t.våbenValg]--; if (t.våben[t.våbenValg] <= 0) t.våbenValg = 'std'; }
    const varighed = Math.max(...baner.map(b => b.length)) * DT * 2;
    G.skud = { n: (G.skud ? G.skud.n : 0) + 1, af: t.e, baner, eks, skade, døde, varighed };
    G.lås = Date.now() + varighed * 1000 + 1700;
  }
  /* en begravet kanon graver et hul op over sig selv (ingen skade) – tykke bunker kræver flere ture */
  function grav(G, t) {
    const cx = t.x, cy = t.y - 34, r = 44;
    for (let i = 0; i < NK; i++) { const dx = i * KOL - cx; if (Math.abs(dx) < r) { const bund = cy + Math.sqrt(r * r - dx * dx); if (bund > G.jord[i]) G.jord[i] = Math.min(t.y, bund, G.jord[i] + 55); } }   // højst 55 px pr. tur
    G.skud = { n: (G.skud ? G.skud.n : 0) + 1, af: t.e, baner: [[[cx, jordVed(G.jord, cx)]]], eks: [{ x: cx, y: Math.round(jordVed(G.jord, cx)), r, type: 'grav' }], skade: {}, døde: [], varighed: .05 };
    G.lås = Date.now() + 1300;
  }
  const nyVind = G => Math.round((Math.random() - .5) * 2 * NIV[G.niv].vind);

  BS.registrer({
    id: 'kanon', navn: 'Kanondyst', e: '💣', min: 2, max: 4, tickMs: 250,
    d: 'Sigt med vinkel og kraft, regn med vinden og spræng de andre kanoner.',
    valg: { navn: 'niveau', liste: [['normal', '😎 Normal'], ['let', '🙂 Let – svag vind, lang sigtelinje'], ['svær', '🔥 Svær – stærk vind, ingen sigtelinje']] },
    start(H, opt) {
      const niv = NIV[opt && opt.niveau] ? opt.niveau : 'normal', N = NIV[niv];
      const ps = H.spillere(), J = nytTerræn(N.tinde), n = ps.length;
      const tanks = ps.map((p, i) => { const x = Math.round((i + .5) * VW / n + (Math.random() - .5) * 60); return { e: p.enhed, x, y: jordVed(J, x), hp: 100, skjold: 0, vinkel: x < VW / 2 ? 50 : 130, kraft: 55, våben: START_VÅBEN(), våbenValg: 'std' }; });
      tanks.forEach(t => { const i = Math.round(t.x / KOL); for (let k = -5; k <= 5; k++) if (J[i + k] != null) J[i + k] = t.y; });   // en lille flad plads til hver kanon
      const G = { niv, jord: J, tanks, tur: rnd(n), vind: 0, skud: null, lås: 0, frist: Date.now() + N.frist, fly: null, flyNed: null, slut: null };
      G.vind = nyVind(G); return G;
    },
    tick(H, G) {
      if (G.slut) return false;
      const N = NIV[G.niv], nu = Date.now(); let æ = false;
      /* flyet: kommer sjældent og tilfældigt, flyver tværs over himlen */
      if (G.fly && (flyX(G.fly, nu) < -90 || flyX(G.fly, nu) > VW + 90)) { G.fly = null; æ = true; }
      if (!G.fly && !G.lås && Math.random() < (TEST ? 1 : N.fly / 4)) { const d = Math.random() < .5 ? 1 : -1; G.fly = { x0: d > 0 ? -70 : VW + 70, y: 70 + rnd(70), vx: d * (60 + rnd(30)), t0: nu, kasse: tilfKasse() }; æ = true; }
      if (G.lås && nu > G.lås) {
        G.lås = 0;
        const levende = G.tanks.filter(t => t.hp > 0);
        if (levende.length <= 1) { G.slut = { vinder: levende[0] ? levende[0].e : null }; if (levende[0]) H.giv(levende[0].e, 5); return true; }
        G.tur = næste(G); G.vind = nyVind(G); G.frist = nu + N.frist; return true;
      }
      if (!G.lås && nu > G.frist) { G.tur = næste(G); G.vind = nyVind(G); G.frist = nu + N.frist; G.sprang = (G.sprang || 0) + 1; return true; }
      return æ;
    },
    kald(H, G, e, d) {
      if (G.slut || G.lås) return; const t = G.tanks[G.tur]; if (t.e !== e) return;
      if (d.sigt) { t.vinkel = Math.max(0, Math.min(180, Math.round(+d.sigt[0]))); t.kraft = Math.max(5, Math.min(100, Math.round(+d.sigt[1]))); }
      if (d.våben && VÅBEN[d.våben] && (d.våben === 'std' || t.våben[d.våben] > 0)) t.våbenValg = d.våben;
      if (d.grav && begravet(G.jord, t)) { grav(G, t); return; }
      if (d.fyr && !begravet(G.jord, t)) skyd(H, G, t);
    },
    frakoblet(H, G, e) { const t = G.tanks.find(x => x.e === e); if (t) t.ude = true; if (G.tanks[G.tur].e === e && !G.lås) { G.tur = næste(G); G.frist = Date.now() + NIV[G.niv].frist; } },
    skiftEnhed(H, G, gl, ny) { G.tanks.forEach(t => { if (t.e === gl) { t.e = ny; t.ude = false; } }); if (G.flyNed && G.flyNed.af === gl) G.flyNed.af = ny; },
    /* 19/11-2026: samme telefon tilbage efter udfald → med igen (før blev den sprunget over resten af spillet) */
    tilbage(H, G, e) { G.tanks.forEach(t => { if (t.e === e) t.ude = false; }); },
    felles: true,
    view(H, G) {
      const N = NIV[G.niv], nu = Date.now();
      return { jord: G.jord.map(Math.round), tanks: G.tanks.map(t => ({ e: t.e, x: t.x, y: Math.round(t.y), hp: t.hp, skjold: t.skjold || 0, vinkel: t.vinkel, kraft: t.kraft, våben: t.våben, valg: t.våbenValg, begravet: begravet(G.jord, t) })),
        tur: G.tur, vind: G.vind, skud: G.skud, låst: !!G.lås, rest: G.lås ? N.frist : Math.max(0, G.frist - nu), frist: N.frist, forud: N.forud, niv: N.navn,
        fly: G.fly ? { x: Math.round(flyX(G.fly, nu)), y: G.fly.y, vx: G.fly.vx, kasse: G.fly.kasse } : null, flyNed: G.flyNed, sprang: G.sprang || 0, slut: G.slut };
    },
    tegn(el, v, api) {
      if (!el.querySelector('#kd-cv')) {
        /* 18/11-2026 (Michael: «vil passe bedre i landscape»): liggende telefon = banen fylder skærmen, styring i en kolonne til højre */
        if (!document.getElementById('kd-css')) { const s = document.createElement('style'); s.id = 'kd-css'; s.textContent = KD_CSS; document.head.appendChild(s); }
        el.innerHTML = '<div class="kd-lay"><div id="kd-ban"></div><div class="kd-bane"><canvas id="kd-cv" width="1000" height="620"></canvas></div><div id="kd-ur"></div><div id="kd-styr"></div></div>'
          + '<div class="kd-drej center" style="margin-top:10px"><button class="btn sec" id="kd-ligg">📱↻ Liggende fuld skærm</button>'
          + '<p class="hint" style="margin:6px 0 0">eller drej telefonen (kræver automatisk rotation)</p></div>';
        /* 19/11-2026 (Michael: «gik ikke i landscape da jeg drejede skærmen»): knap, der går i fuld skærm og låser liggende
           (Android/Chrome). iPhone kan ikke låse retningen fra en hjemmeside – der skal man selv dreje telefonen. */
        el.querySelector('#kd-ligg').onclick = async () => {
          try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (e) {}
          try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); else throw 0; }
          catch (e) { api.toast(BS.t('Drej telefonen – din telefon kan ikke dreje skærmen automatisk herfra')); }
        };
        el._fx = { partikler: [], ryst: 0 }; el._vis = null;
        const cv = el.querySelector('#kd-cv');
        sigteStyring(el, cv, api);
        const løkke = () => {
          if (!cv.isConnected) {   // spillet er slut/stoppet: slip liggende lås og fuld skærm igen
            try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
            try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
            return;
          }
          tegnScene(el, cv, api); requestAnimationFrame(løkke);
        };
        requestAnimationFrame(løkke);
      }
      /* nyt skud: animér, og vis først det nye terræn/liv, når granaten er landet */
      if (!el._vis) el._vis = { jord: v.jord.slice(), tanks: JSON.parse(JSON.stringify(v.tanks)) };
      if (v.skud && el._skudN !== v.skud.n) { el._skudN = v.skud.n; el._anim = { s: v.skud, t0: performance.now(), efter: { jord: v.jord.slice(), tanks: JSON.parse(JSON.stringify(v.tanks)) }, bang: {} }; api.lyd.klik(); }
      else if (!el._anim) el._vis = { jord: v.jord.slice(), tanks: JSON.parse(JSON.stringify(v.tanks)) };
      else el._anim.efter = { jord: v.jord.slice(), tanks: JSON.parse(JSON.stringify(v.tanks)) };
      el._v = v;
      /* lokal sigte følger værtens, medmindre man selv sigter lige nu */
      const t = v.tanks[v.tur], min = !v.slut && !v.låst && t.e === api.mig;
      if (!el._sigter || !min) el._sigte = [t.vinkel, t.kraft];
      const ban = v.slut ? '<div class="banner min">🏆 ' + (v.slut.vinder ? esc(api.navn(v.slut.vinder)) + ' vandt Kanondysten!' : 'Alle blev sprængt i luften!') + '</div>'
        : v.låst ? '<div class="banner">💥 ' + esc(api.navn(v.skud.af)) + (v.skud.eks[0] && v.skud.eks[0].type === 'grav' ? ' graver sig fri…' : ' skyder…') + '</div>'
        : '<div class="banner' + (min ? ' min' : '') + '">' + (min ? (t.begravet ? '⛏️ Du er begravet – grav dig fri!' : '🎯 Din tur – træk på banen for at sigte') : '⏳ ' + esc(api.navn(t.e)) + (t.begravet ? ' graver' : ' sigter')) + '</div>';
      const b = el.querySelector('#kd-ban'); if (b._h !== ban) { b._h = ban; b.innerHTML = ban; }
      const ur = el.querySelector('#kd-ur'); if (!v.slut && !v.låst) { if (ur._f !== v.tur + ':' + (v.skud ? v.skud.n : 0) + ':' + v.sprang) { ur._f = v.tur + ':' + (v.skud ? v.skud.n : 0) + ':' + v.sprang; BS.turUr(ur, v.rest, v.frist); } } else if (ur._f !== '') { BS.turUr(document.createElement('div'), 0); ur.innerHTML = ''; ur._f = ''; }   // stop uret mens der skydes
      const st = !min ? '<p class="hint center" style="margin:6px 0">Niveau: ' + esc(v.niv) + ' · ✈️ skyd flyet ned og få kassen 📦</p>'
        : t.begravet ? '<p class="hint center" style="margin:8px 0">Der ligger jord oven på din kanon. Grav dig fri – tykke bunker kan kræve flere ture.</p><button class="btn big" id="kd-grav" style="background:linear-gradient(135deg,#8a5a2b,#c08a4a)">⛏️ Grav dig fri</button>'
        : '<p class="hint center" style="margin:8px 0 4px;font-size:15px">🪃 <b>Træk baglæns</b> på banen som en slangebøsse – <b>slip</b> for at skyde</p>'
        + '<p class="hint center" style="margin:0 0 8px" id="kd-tal"></p>'
        + '<div class="kd-våben">' + Object.entries(VÅBEN).filter(([k]) => k === 'std' || (t.våben[k] || 0) > 0 || ['stor', 'tre', 'hop', 'klynge', 'bor'].includes(k)).map(([k, w]) => { const n = k === 'std' ? '∞' : (t.våben[k] || 0); return '<button class="btn ' + (t.valg === k ? '' : 'sec') + '" data-våben="' + k + '"' + (n === 0 ? ' disabled' : '') + '>' + IKON[k] + ' ' + w.navn + ' (' + n + ')</button>'; }).join('') + '</div>'
        + '<p class="hint center" style="margin:6px 0 0">✈️ Skyd flyet ned og få kassen: 🟫 jord · 🛡️ skjold · ❤️ liv · 🎇 klynge · ☢️ mega</p>';
      const sk = el.querySelector('#kd-styr'), sig = st + (min ? t.valg : '');
      if (sk._h !== sig) {
        sk._h = sig; sk.innerHTML = st;
        sk.querySelectorAll('[data-våben]').forEach(x => { x.onclick = () => api.kald({ våben: x.dataset.våben }); });
        const g = sk.querySelector('#kd-grav'); if (g) g.onclick = () => { g.disabled = true; api.kald({ grav: 1 }); api.vib(40); };
      }
      if (v.flyNed && el._flyNed !== v.flyNed.n) { if (el._flyNed != null) { const k = KASSER[v.flyNed.kasse] || KASSER.jord; api.toast('✈️ ' + api.navn(v.flyNed.af) + ' skød flyet ned: ' + k.navn + ' ' + k.ikon); } el._flyNed = v.flyNed.n; }
      if (v.fly) el._fly = { x: v.fly.x, y: v.fly.y, vx: v.fly.vx, kasse: v.fly.kasse, t: performance.now() }; else if (!el._anim) el._fly = null;
      if (v.slut && el._slut !== 1) { el._slut = 1; v.slut.vinder === api.mig ? api.lyd.vind() : api.lyd.fejl(); }
      if (min && el._minT !== v.tur + ':' + (v.skud ? v.skud.n : 0)) { el._minT = v.tur + ':' + (v.skud ? v.skud.n : 0); api.vib(40); }
    },
  });

  /* ---------- sigte som i en slangebøsse (18/11-2026, Michael: «som Angry Birds») ----------
     Sæt fingeren hvor som helst og TRÆK BAGUD: kanonen skyder den modsatte vej af trækket, og jo længere
     du trækker, jo hårdere. Mens du trækker, vises den første del af banen som prikker. SLIP = skud.
     Trækker du helt tilbage til startpunktet (under 25 px), annulleres skuddet. */
  const TRÆK_PR_KRAFT = 2.6;
  function sigteStyring(el, cv, api) {
    let aktiv = null, sidst = 0;
    const pkt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * VW, (e.clientY - r.top) / r.height * VH, e.clientX, e.clientY]; };
    const opd = e => {
      const [, , cx, cy] = pkt(e), r = cv.getBoundingClientRect(), skala = VW / r.width;
      const dx = (aktiv.sx - cx) * skala, dy = (aktiv.sy - cy) * skala, L = Math.hypot(dx, dy);
      aktiv.L = L;
      if (L < 25) { el._træk = null; return; }
      let a = Math.atan2(-dy, dx) * 180 / Math.PI; if (a < 0) a = a < -90 ? 180 : 0;
      const k = Math.max(5, Math.min(100, L / TRÆK_PR_KRAFT));
      el._sigte = [Math.round(a), Math.round(k)]; el._træk = { L: Math.min(L, 100 * TRÆK_PR_KRAFT) };
      const nu = Date.now(); if (nu - sidst > 90) { sidst = nu; api.kald({ sigt: el._sigte.slice() }); }
    };
    const kan = () => { const v = el._v; return v && !v.slut && !v.låst && v.tanks[v.tur].e === api.mig && !v.tanks[v.tur].begravet; };
    cv.addEventListener('pointerdown', e => { if (!kan()) return; e.preventDefault(); aktiv = { sx: e.clientX, sy: e.clientY, L: 0 }; el._sigter = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
    cv.addEventListener('pointermove', e => { if (aktiv) opd(e); });
    const slip = () => {
      if (!aktiv) return; const L = aktiv.L; aktiv = null; el._sigter = false; el._træk = null;
      if (L >= 25 && kan()) { api.kald({ sigt: el._sigte.slice(), fyr: 1 }); api.vib([30, 30, 60]); }
      else api.kald({ sigt: el._sigte.slice() });
    };
    cv.addEventListener('pointerup', slip); cv.addEventListener('pointercancel', () => { aktiv = null; el._sigter = false; el._træk = null; });
  }
  /* forudsigelse af banen (samme fysik som værten) – kun den første del, så vinden stadig kræver fingerspidsfølelse */
  function forudsig(v, t, ang, kr) {
    const a = ang * Math.PI / 180, vv = kr * FART;
    let x = t.x + Math.cos(a) * 38, y = t.y - 24 - Math.sin(a) * 38, vx = Math.cos(a) * vv, vy = -Math.sin(a) * vv;
    const pts = [];
    for (let s = 0; s < (v.forud != null ? v.forud : 70); s++) {
      vx += v.vind * DT; vy += TYNGDE * DT; x += vx * DT; y += vy * DT;
      if (s % 5 === 0) pts.push([x, y]);
      if (x < 0 || x > VW || y > VH || (y >= jordVed(v.jord, x))) break;
    }
    return pts;
  }

  /* ---------- grafik ---------- */
  let HIMMEL = null, JORDTEX = null;
  function himmel() {
    if (HIMMEL) return HIMMEL;
    const c0 = document.createElement('canvas'); c0.width = VW; c0.height = VH; const c = c0.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#070b2a'); g.addColorStop(.45, '#2b1b5a'); g.addColorStop(.75, '#a23b72'); g.addColorStop(1, '#f6a15b');
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    const sol = c.createRadialGradient(760, 430, 10, 760, 430, 190); sol.addColorStop(0, 'rgba(255,236,170,1)'); sol.addColorStop(.18, 'rgba(255,190,110,.9)'); sol.addColorStop(1, 'rgba(255,120,90,0)');
    c.fillStyle = sol; c.fillRect(0, 0, VW, VH);
    let seed = 3; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 160; i++) { c.fillStyle = 'rgba(255,255,255,' + (.3 + r() * .7) + ')'; c.fillRect(r() * VW, r() * 260, r() < .1 ? 2 : 1.3, r() < .1 ? 2 : 1.3); }
    [['rgba(60,30,90,.75)', 330, 90, .004], ['rgba(40,20,70,.9)', 380, 70, .007]].forEach(([f, base, amp, fr]) => {
      const ph = r() * 9; c.fillStyle = f; c.beginPath(); c.moveTo(0, VH);
      for (let x = 0; x <= VW; x += 8) c.lineTo(x, base - amp * Math.abs(Math.sin(x * fr + ph)) - amp * .4 * Math.sin(x * fr * 3.1 + ph));
      c.lineTo(VW, VH); c.closePath(); c.fill();
    });
    HIMMEL = c0; return c0;
  }
  function jordTex() {
    if (JORDTEX) return JORDTEX;
    const c0 = document.createElement('canvas'); c0.width = VW; c0.height = VH; const c = c0.getContext('2d');
    const g = c.createLinearGradient(0, 180, 0, VH); g.addColorStop(0, '#8a5a2b'); g.addColorStop(.5, '#6b3f1d'); g.addColorStop(1, '#3a2010');
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    let seed = 9; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let y = 240; y < VH; y += 26) { c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 3; c.beginPath(); for (let x = 0; x <= VW; x += 20) c.lineTo(x, y + Math.sin(x * .02 + y) * 6); c.stroke(); }
    for (let i = 0; i < 900; i++) { c.fillStyle = r() < .5 ? 'rgba(0,0,0,.18)' : 'rgba(255,220,170,.12)'; const s = 1 + r() * 4; c.beginPath(); c.arc(r() * VW, 180 + r() * (VH - 180), s, 0, 7); c.fill(); }
    JORDTEX = c0; return c0;
  }
  function tegnScene(el, cv, api) {
    const v = el._v; if (!v) return;
    const c = cv.getContext('2d'), nu = performance.now(), fx = el._fx;
    /* animation af skud */
    let skal = null, spor = [];
    const A = el._anim;
    if (A) {
      const t = (nu - A.t0) / 1000, idx = Math.floor(t / (DT * 2));
      A.s.baner.forEach((b, bi) => {
        const e = A.s.eks[bi];
        if (idx < b.length) { skal = skal || []; skal.push(b[idx]); spor.push(b.slice(Math.max(0, idx - 18), idx + 1)); }
        else if (!A.bang[bi] && !e) A.bang[bi] = true;
        else if (e && !A.bang[bi]) {
          A.bang[bi] = true;
          if (e.type === 'jord' || e.type === 'grav') {
            /* jordbunke / gravning: brune jordklumper og støv i stedet for ild */
            e.type === 'jord' ? api.lyd.plask() : api.lyd.klik(); fx.ryst = e.type === 'jord' ? 7 : 3;
            for (let k = 0; k < (e.type === 'jord' ? 50 : 24); k++) { const a = -Math.PI * Math.random(), s = 60 + Math.random() * 220; fx.partikler.push({ x: e.x + (Math.random() - .5) * e.r, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, liv: .8 + Math.random() * .6, f: ['#8a5a2b', '#6b3f1d', '#a8743d'][k % 3], st: 3 + Math.random() * 5 }); }
            for (let k = 0; k < 8; k++) fx.partikler.push({ x: e.x + (Math.random() - .5) * e.r, y: e.y - 10, vx: (Math.random() - .5) * 30, vy: -15 - Math.random() * 25, liv: 1.6, røg: true, brun: true, st: 14 + Math.random() * 14 });
          } else {
            api.lyd.ram(); fx.ryst = 14;
            if (e.type === 'fly') { api.lyd.sænket(); el._fly = null; for (let k = 0; k < 10; k++) fx.partikler.push({ x: e.x, y: e.y, vx: (Math.random() - .5) * 200, vy: -60 - Math.random() * 120, liv: 2.5, f: k % 2 ? '#e9eef8' : '#ef476f', st: 4 + Math.random() * 4 }); }
            for (let k = 0; k < 40; k++) { const a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 260; fx.partikler.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, liv: 1 + Math.random() * .6, f: Math.random() < .5 ? '#ffd166' : '#ff6b3d', st: 2 + Math.random() * 3 }); }
            for (let k = 0; k < 14; k++) fx.partikler.push({ x: e.x + (Math.random() - .5) * e.r, y: e.y - Math.random() * 20, vx: (Math.random() - .5) * 30, vy: -20 - Math.random() * 40, liv: 2.2, røg: true, st: 14 + Math.random() * 16 });
            fx.ild = (fx.ild || []).concat([{ x: e.x, y: e.y, r: e.r, t0: nu }]);
          }
          el._vis = A.efter;                 // krateret/bunken og skaden vises, når granaten rammer
        }
      });
      if (t > A.s.varighed + 1.2) { el._vis = A.efter; el._anim = null; if (A.s.døde.length) api.lyd.sænket(); if (!v.fly) el._fly = null; }
    }
    const V = el._vis;
    c.save();
    if (fx.ryst > .3) { c.translate((Math.random() - .5) * fx.ryst, (Math.random() - .5) * fx.ryst); fx.ryst *= .88; }
    c.drawImage(himmel(), 0, 0);
    /* blinkende stjerner */
    for (let i = 0; i < 12; i++) { const a = .5 + .5 * Math.sin(nu / 400 + i * 2.1); c.fillStyle = 'rgba(255,255,255,' + a + ')'; c.fillRect((i * 83 + 40) % VW, (i * 47 + 20) % 220, 2, 2); }
    /* flyet med jorddrop-kassen */
    if (el._fly) { const f = el._fly; tegnFly(c, f.x + f.vx * (nu - f.t) / 1000, f.y, Math.sign(f.vx), nu, f.kasse); }
    /* begravede kanoner tegnes FØR jorden, så jorden ligger oven på dem */
    const tegnT = (t, i) => { const live = v.tanks[i] || t, vink = (i === v.tur && live.e === api.mig && el._sigte) ? el._sigte[0] : live.vinkel; tegnKanon(c, t, api.farve(t.e), t.hp > 0 ? vink : null, i === v.tur && !v.slut, api.navn(t.e), nu); };
    V.tanks.forEach((t, i) => { if (t.begravet) tegnT(t, i); });
    /* terræn */
    c.save(); c.beginPath(); c.moveTo(0, VH); V.jord.forEach((y, i) => c.lineTo(i * KOL, y)); c.lineTo(VW, V.jord[NK - 1]); c.lineTo(VW, VH); c.closePath(); c.clip();
    c.drawImage(jordTex(), 0, 0); c.restore();
    c.beginPath(); V.jord.forEach((y, i) => i ? c.lineTo(i * KOL, y) : c.moveTo(0, y)); c.lineTo(VW, V.jord[NK - 1]);
    c.strokeStyle = '#3f7d22'; c.lineWidth = 10; c.lineJoin = 'round'; c.stroke(); c.strokeStyle = '#7ccf4a'; c.lineWidth = 5; c.stroke();
    /* kanoner (de begravede får et skilt på overfladen) */
    V.tanks.forEach((t, i) => {
      if (!t.begravet) { tegnT(t, i); return; }
      const sy = jordVed(V.jord, t.x) - 14, nv = api.navn(t.e);
      c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.fillText('⛏️', t.x, sy - 4 + Math.sin(nu / 200) * 3);
      c.font = 'bold 16px sans-serif'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(nv + ' ' + BS.t('(begravet)'), t.x, sy - 26); c.fillStyle = '#fff'; c.fillText(nv + ' ' + BS.t('(begravet)'), t.x, sy - 26);
    });
    /* sigtelinje for den, der har tur */
    const tt = v.tanks[v.tur];
    if (!v.slut && !v.låst && !A && tt.hp > 0 && !tt.begravet) {
      const [ang, kr] = tt.e === api.mig && el._sigte ? el._sigte : [tt.vinkel, tt.kraft];
      const a = ang * Math.PI / 180, bx = tt.x, by = tt.y - 24;
      /* slangebøssens elastik: fra kanonen og bagud, længere jo hårdere */
      const elast = 18 + kr * .9, ex = bx - Math.cos(a) * elast, ey = by + Math.sin(a) * elast;
      c.strokeStyle = 'rgba(120,70,40,.9)'; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(bx - 10, by - 4); c.lineTo(ex, ey); c.lineTo(bx + 10, by - 4); c.stroke();
      c.fillStyle = '#3a2416'; c.beginPath(); c.arc(ex, ey, 7, 0, 7); c.fill();
      /* prikket bane */
      const pts = forudsig(v, tt, ang, kr);
      pts.forEach(([x, y], k) => { c.fillStyle = 'rgba(255,255,255,' + (0.95 - k / pts.length * .7) + ')'; c.beginPath(); c.arc(x, y, Math.max(2.5, 6 - k * .3), 0, 7); c.fill(); });
      c.fillStyle = '#fff'; c.font = 'bold 20px sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.6)';
      const lx = ex, ly = ey + 26; c.strokeText(ang + '° · ' + kr + '%', lx, ly); c.fillText(ang + '° · ' + kr + '%', lx, ly);
      const tal = el.querySelector('#kd-tal'); if (tal && tt.e === api.mig) tal.textContent = 'Vinkel ' + ang + '° · Kraft ' + kr + '%';
    }
    /* granater med lysende hale */
    spor.forEach(s => { s.forEach(([x, y], k) => { c.fillStyle = 'rgba(255,200,120,' + (k / s.length * .6) + ')'; c.beginPath(); c.arc(x, y, 2 + k / s.length * 4, 0, 7); c.fill(); }); });
    (skal || []).forEach(([x, y]) => { const g = c.createRadialGradient(x, y, 0, x, y, 16); g.addColorStop(0, '#fff'); g.addColorStop(.3, '#ffd166'); g.addColorStop(1, 'rgba(255,120,60,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 16, 0, 7); c.fill(); });
    /* ildkugler */
    fx.ild = (fx.ild || []).filter(f => {
      const t = (nu - f.t0) / 600; if (t > 1) return false;
      const r = f.r * (.4 + Math.min(1, t * 2.5) * .9), g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      g.addColorStop(0, 'rgba(255,255,220,' + (1 - t) + ')'); g.addColorStop(.35, 'rgba(255,190,70,' + (1 - t) + ')'); g.addColorStop(.7, 'rgba(240,80,40,' + (.8 - t * .8) + ')'); g.addColorStop(1, 'rgba(120,30,20,0)');
      c.fillStyle = g; c.beginPath(); c.arc(f.x, f.y, r, 0, 7); c.fill(); return true;
    });
    /* partikler: gnister og røg */
    const dt = 1 / 60;
    fx.partikler = fx.partikler.filter(p => {
      p.liv -= dt; if (p.liv <= 0) return false; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.røg) { p.st += 12 * dt; c.fillStyle = (p.brun ? 'rgba(120,85,50,' : 'rgba(70,60,80,') + Math.min(.45, p.liv * .25) + ')'; }
      else { p.vy += 400 * dt; c.fillStyle = p.f; c.globalAlpha = Math.min(1, p.liv); }
      c.beginPath(); c.arc(p.x, p.y, p.st, 0, 7); c.fill(); c.globalAlpha = 1; return true;
    });
    c.restore();
    /* vind */
    const vs = v.vind; c.fillStyle = 'rgba(0,0,0,.35)'; rund(c, VW / 2 - 110, 12, 220, 44, 14); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 20px sans-serif'; c.textAlign = 'center'; c.fillText(BS.t('Vind') + ' ' + (vs === 0 ? '–' : Math.abs(vs)), VW / 2, 42);
    if (vs) { const d = Math.sign(vs), L = 16 + Math.abs(vs) * .7; c.strokeStyle = '#9fe3ff'; c.lineWidth = 5; c.beginPath(); c.moveTo(VW / 2 + 60 * d, 34); c.lineTo(VW / 2 + (60 + L) * d, 34); c.lineTo(VW / 2 + (52 + L) * d, 26); c.moveTo(VW / 2 + (60 + L) * d, 34); c.lineTo(VW / 2 + (52 + L) * d, 42); c.stroke(); }
  }
  /* kanonen tegnes 1,5× større end i fysikken, så den kan ses på en telefon */
  function tegnKanon(c, t, f, vinkel, aktiv, navn, nu) {
    c.save(); c.translate(t.x, t.y); c.scale(1.5, 1.5); c.translate(-t.x, -t.y);
    kanon(c, t, f, vinkel, aktiv, navn, nu);
    c.restore();
  }
  function kanon(c, t, f, vinkel, aktiv, navn, nu) {
    const x = t.x, y = t.y;
    if (t.hp <= 0) { c.fillStyle = '#2b2b33'; rund(c, x - 18, y - 10, 36, 10, 4); c.fill(); c.fillStyle = 'rgba(80,80,90,.5)'; c.beginPath(); c.arc(x + Math.sin(nu / 300) * 3, y - 24 - (nu / 40 % 20), 8, 0, 7); c.fill(); return; }
    if (aktiv) { const g = c.createRadialGradient(x, y - 10, 5, x, y - 10, 46); g.addColorStop(0, 'rgba(255,209,102,.45)'); g.addColorStop(1, 'rgba(255,209,102,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y - 10, 46, 0, 7); c.fill(); }
    /* skjold fra flyets kasse: en lysende boble, der bliver svagere, jo mindre der er tilbage */
    if (t.skjold > 0) { const a = .25 + .5 * t.skjold / 40; c.strokeStyle = 'rgba(76,201,240,' + a + ')'; c.lineWidth = 3; c.fillStyle = 'rgba(76,201,240,' + a * .25 + ')'; c.beginPath(); c.arc(x, y - 14, 30 + Math.sin(nu / 250) * 1.5, Math.PI, 0); c.closePath(); c.fill(); c.stroke(); }
    /* løb */
    const a = vinkel * Math.PI / 180;
    c.strokeStyle = '#2d3240'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y - 16); c.lineTo(x + Math.cos(a) * 26, y - 16 - Math.sin(a) * 26); c.stroke();
    c.strokeStyle = '#5a6275'; c.lineWidth = 3; c.stroke();
    /* larvefødder */
    c.fillStyle = '#23262f'; rund(c, x - 20, y - 9, 40, 10, 5); c.fill();
    c.fillStyle = '#4a4f5c'; for (let k = -15; k <= 15; k += 7.5) { c.beginPath(); c.arc(x + k, y - 4, 3.2, 0, 7); c.fill(); }
    /* skrog og tårn */
    const g = c.createLinearGradient(0, y - 22, 0, y - 8); g.addColorStop(0, f); g.addColorStop(1, 'rgba(0,0,0,.35)');
    c.fillStyle = f; c.beginPath(); c.moveTo(x - 18, y - 9); c.lineTo(x - 13, y - 17); c.lineTo(x + 13, y - 17); c.lineTo(x + 18, y - 9); c.closePath(); c.fill();
    c.fillStyle = g; c.fill();
    c.fillStyle = f; c.beginPath(); c.arc(x, y - 17, 9, Math.PI, 0); c.fill();
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.arc(x - 3, y - 20, 3, 0, 7); c.fill();
    /* navn og liv */
    c.font = 'bold 16px sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(navn, x, y - 46); c.fillStyle = '#fff'; c.fillText(navn, x, y - 46);
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - 22, y - 40, 44, 7); c.fillStyle = t.hp > 50 ? '#06d6a0' : t.hp > 25 ? '#ffd166' : '#ef476f'; c.fillRect(x - 21, y - 39, 42 * t.hp / 100, 5);
  }
  /* flyet: hvidt propelfly med rød stribe og en hængende kasse med jorddrop */
  function tegnFly(c, x, y, ret, nu, kasse) {
    const K = KASSER[kasse] || KASSER.jord;
    c.save(); c.translate(x, y + Math.sin(nu / 500) * 4); c.scale(ret * 1.3, 1.3);
    c.strokeStyle = '#6b4a2a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-4, 6); c.lineTo(-8, 26); c.moveTo(4, 6); c.lineTo(0, 26); c.stroke();     // reb
    c.fillStyle = K.farve; c.fillRect(-16, 24, 22, 18); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 2; c.strokeRect(-16, 24, 22, 18);     // kasse i kassens farve
    c.save(); c.scale(ret, 1); c.font = '13px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(K.ikon, -5 * ret, 33.5); c.restore();
    c.fillStyle = '#ef476f'; c.beginPath(); c.moveTo(-30, -2); c.lineTo(-40, -14); c.lineTo(-33, -14); c.lineTo(-24, -3); c.closePath(); c.fill(); // hale
    const g = c.createLinearGradient(0, -9, 0, 9); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#b8c3da');
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 32, 8, 0, 0, 7); c.fill();                                                                       // krop
    c.fillStyle = '#ef476f'; c.fillRect(-28, -1.5, 52, 3);
    c.fillStyle = '#9fe3ff'; c.beginPath(); c.ellipse(12, -4, 7, 4, 0, 0, 7); c.fill();                                                               // cockpit
    c.fillStyle = '#d9e0ee'; c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.lineTo(-2, 16); c.lineTo(-12, 16); c.closePath(); c.fill();          // vinge
    c.fillStyle = 'rgba(40,40,50,.55)'; c.beginPath(); c.ellipse(33, 0, 2.5, 11 * Math.abs(Math.sin(nu / 25)) + 2, 0, 0, 7); c.fill();               // propel
    c.restore();
  }
  function rund(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
})();
