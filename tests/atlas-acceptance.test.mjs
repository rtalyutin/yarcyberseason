import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { PassThrough } from 'node:stream';
const repo = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const require = createRequire(`${repo}/package.json`);
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;
const { renderToPipeableStream } = require('react-dom/server');
const { createServer } = await import(require.resolve('vite'));
let vite, MatchdayPage, Utility, App;
before(async () => {
  vite = await createServer({ root: repo, configFile:false, esbuild:{jsx:'automatic'},
    define:{__YCS_DATA_VERSION__:'"qa"', __YCS_BUILD_GENERATED_AT__:'"2026-10-27T00:00:00Z"'},
    optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,preTransformRequests:false,hmr:false},appType:'custom' });
  ({ MatchdayPage } = await vite.ssrLoadModule('/src/components/Matchday.jsx'));
  Utility = await vite.ssrLoadModule('/src/components/ThemedUtilityShell.jsx');
});
after(async () => { await vite?.close(); });
const text = n => typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join('') : n?.children?.map(text).join('') || '';
const synthetic = (matches) => ({id:'qa-tournament',slug:'qa-tournament',title:'Synthetic acceptance fixture', discipline:'Dota 2',status:'current',matchday:{},stages:[{id:'swiss',title:'Проверочный тур',matches}]});
const match = (id,date,time,status='scheduled',extra={}) => ({id,date,time,status,team1:`Alpha ${id}`,team2:`Beta ${id}`,bestOf:'BO3', ...extra});
function render(element) { return new Promise((resolve,reject) => { const output=new PassThrough();let html='';output.on('data',c=>html+=c);output.on('end',()=>resolve(html));output.on('error',reject);const stream=renderToPipeableStream(element,{onAllReady(){stream.pipe(output)},onError:reject}); }); }
async function mount(t,element,{url='/tournaments/qa-tournament/matchday?date=2026-10-24',theme='dota2'}={}) {
  const previous={window:globalThis.window,document:globalThis.document,act:globalThis.IS_REACT_ACT_ENVIRONMENT,raf:globalThis.requestAnimationFrame,caf:globalThis.cancelAnimationFrame};
  const listeners=new Map(), storage=new Map([['ycs-theme',theme]]), writes=[], pushes=[], focus=[];
  const win={location:new URL(url,'https://example.test'),matchMedia:()=>({matches:true,addEventListener(){},removeEventListener(){}}),localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{writes.push([k,v]);storage.set(k,v)}},
    addEventListener:(k,f)=>{if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(f)},removeEventListener:(k,f)=>listeners.get(k)?.delete(f)};
  win.history={pushState:(_,__,target)=>{pushes.push(target);win.location=new URL(target,'https://example.test')}};
  globalThis.window=win;globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
  let renderer;
  await act(async()=>{renderer=TestRenderer.create(element,{createNodeMock: el=>({parentElement:{scrollLeft:0,offsetLeft:0},offsetLeft:0,addEventListener(){},removeEventListener(){},querySelector:()=>null,focus:()=>focus.push(el.props.id)})})});
  t.after(async()=>{await act(async()=>renderer.unmount());for(const[type,callbacks]of listeners)assert.equal(callbacks.size,0,`${type} listener leaked after unmount`);globalThis.window=previous.window;globalThis.document=previous.document;globalThis.IS_REACT_ACT_ENVIRONMENT=previous.act;globalThis.requestAnimationFrame=previous.raf;globalThis.cancelAnimationFrame=previous.caf});
  return {renderer,win,focus,writes,pushes,storage,listeners,
    async back(url){win.location=new URL(url,'https://example.test');await act(async()=>{for(const f of listeners.get('popstate')||[])f()})}};
}
const dayRows = r => r.root.findAll(n=>typeof n.type==='string' && n.props['data-match-id']);

test('ATLAS-DAY-01: one day interleaves scheduled/live/completed by time, unknown appointments last',async(t)=>{
  const source=synthetic([match('later','2026-10-24','19:00','scheduled'),match('finished','2026-10-24','13:00','completed',{resultConfirmed:true,scoreKind:'series',score1:1,score2:2}),match('live','2026-10-24','15:00','live'),match('unknown','2026-10-24',undefined,'postponed')]);
  const before=structuredClone(source);const f=await mount(t,React.createElement(MatchdayPage,{tournament:source}));
  assert.deepEqual(dayRows(f.renderer).map(n=>n.props['data-match-id']),['finished','live','later','unknown']);
  assert.deepEqual(source,before);assert.match(text(dayRows(f.renderer).at(-1)),/Время уточняется/);assert.doesNotMatch(text(dayRows(f.renderer).at(-1)),/00:00/);
});

test('ATLAS-DAY-02: canonical link and elapsed time do not create live status or a score',async(t)=>{
  const source=synthetic([match('planned','2026-10-24','10:00','scheduled',{broadcastLinks:{twitch:'https://twitch.tv/synthetic'},score1:9,score2:8,winner:'Alpha planned'})]);
  const f=await mount(t,React.createElement(MatchdayPage,{tournament:source}));const row=dayRows(f.renderer)[0];
  assert.match(text(row),/Ожидается/);assert.doesNotMatch(text(row),/Идёт|LIVE|9:8/);assert.equal(row.findAll(n=>n.props.className?.includes('is-winner')).length,0);
  assert.equal(row.findAllByType('a').filter(n=>n.props.href==='https://twitch.tv/synthetic').length,1);
});

test('ATLAS-DAY-03: unconfirmed completion hides numbers/winner/maps and distinguishes pending result from scheduled',async(t)=>{
  const source=synthetic([match('unconfirmed','2026-10-24','13:00','completed',{resultConfirmed:false,score1:7,score2:6,winner:'Alpha unconfirmed',maps:[{name:'STALE MAP',score1:40,score2:39}]})]);
  const f=await mount(t,React.createElement(MatchdayPage,{tournament:source}));const row=dayRows(f.renderer)[0];
  assert.match(text(row),/Итог уточняется/);assert.doesNotMatch(text(row),/STALE MAP|7:6|40:39/);assert.equal(row.findAll(n=>n.props.className?.includes('is-winner')).length,0);
  const score=row.find(n=>n.props.className==='md2-score');assert.match(text(score),/—/);assert.doesNotMatch(text(score),/VS/);
});

test('ATLAS-DAY-04: manual date activation preserves URL until click, then back restores selected day',async(t)=>{
  const source=synthetic([match('first','2026-10-24','13:00'),match('second','2026-10-25','15:00'),match('last','2026-10-26','17:00')]);
  const f=await mount(t,React.createElement(MatchdayPage,{tournament:source}),{url:'/tournaments/qa-tournament/matchday?date=2026-10-24&keep=1#here'});
  const tabs=()=>f.renderer.root.findAll(n=>n.props.role==='tab');
  assert.equal(tabs()[0].props['aria-selected'],true);
  await act(async()=>tabs()[0].props.onKeyDown({key:'ArrowRight',preventDefault(){}}));
  assert.equal(tabs()[0].props['aria-selected'],true);assert.equal(tabs()[1].props.tabIndex,0);assert.equal(f.pushes.length,0);assert.equal(f.focus.at(-1),'md-tab-2026-10-25');
  await act(async()=>tabs()[1].props.onClick());
  assert.equal(tabs()[1].props['aria-selected'],true);assert.equal(f.win.location.search,'?date=2026-10-25&keep=1');assert.equal(f.win.location.hash,'#here');assert.equal(dayRows(f.renderer)[0].props['data-match-id'],'second');
  await act(async()=>tabs()[1].props.onKeyDown({key:'End',preventDefault(){}}));
  assert.equal(tabs()[1].props['aria-selected'],true);assert.equal(tabs()[2].props.tabIndex,0);assert.equal(f.pushes.length,1);
  await f.back('/tournaments/qa-tournament/matchday?date=2026-10-24');assert.equal(tabs()[0].props['aria-selected'],true);assert.equal(dayRows(f.renderer)[0].props['data-match-id'],'first');
  const focusBeforeResize=f.focus.length,pushesBeforeResize=f.pushes.length;await act(async()=>{for(const listener of f.listeners.get('resize')||[])listener()});assert.equal(tabs()[0].props['aria-selected'],true);assert.equal(f.focus.length,focusBeforeResize);assert.equal(f.pushes.length,pushesBeforeResize);
});

test('ATLAS-DAY-05: cancelled/postponed retain explicit status; no-data retains tournament recovery',async()=>{
  for(const [status,label] of [['cancelled','Отменён'],['postponed','Перенесён']]) { const html=await render(React.createElement(MatchdayPage,{tournament:synthetic([match(status,'2026-10-24',undefined,status)])}));assert.match(html,new RegExp(label));assert.match(html,/Время уточняется/);assert.doesNotMatch(html,/00:00/); }
  const html=await render(React.createElement(MatchdayPage,{tournament:synthetic([])}));assert.match(html,/Матчи ещё не опубликованы/);assert.match(html,/href="\/tournaments\/qa-tournament"/);
});

test('ATLAS-UTILITY-01: theme switches preserve mounted child state and write only theme preference',async(t)=>{
  let mounts=0;
  function Child(){const[value,setValue]=React.useState('');React.useEffect(()=>{mounts++},[]);return React.createElement(React.Fragment,null,React.createElement(Utility.UtilityThemeSwitcher),React.createElement('input',{value,onChange:e=>setValue(e.target.value)}))}
  const f=await mount(t,React.createElement(Utility.ThemedUtilityShell,null,React.createElement(Child)));
  await act(async()=>f.renderer.root.findByType('input').props.onChange({target:{value:'unsaved local form'}}));
  for(const label of ['CS2','Корпоративная','Dota 2']) {await act(async()=>f.renderer.root.findAllByType('button').find(n=>text(n)===label).props.onClick());assert.equal(f.renderer.root.findByType('input').props.value,'unsaved local form')}
  assert.equal(mounts,1);assert.deepEqual(f.writes.map(([k])=>k),['ycs-theme','ycs-theme','ycs-theme']);assert.equal(f.storage.get('ycs-theme'),'dota2');
  assert.equal(f.renderer.root.find(n=>n.props.className==='site-shell atlas-utility-shell').props['data-theme'],'dota2');
});

test('ATLAS-SHELL-01: special routes expose labelled theme controls while retaining legal/auth/noindex content',async()=>{
  ({ App } = await vite.ssrLoadModule('/src/App.jsx'));
  const {getPageMetadata}=await vite.ssrLoadModule('/src/lib/page-metadata.js');
  for(const path of ['/about','/player/profile','/org','/orgs','/webmcp','/forMari']){
    const html=await render(React.createElement(App,{initialPath:path}));
    assert.match(html,/Тема:/,path);for(const label of ['CS2','Dota 2','Корпоративная'])assert.ok(html.includes(label),`${path} missing ${label}`);
    if(path==='/player/profile'){assert.match(html,/Лига цифровой экономики/);assert.doesNotMatch(html,/ООО «ЯрКиберСезон»|Сохранить черновик/);assert.equal(getPageMetadata(path).noindex,true)}
    if(path==='/org'||path==='/orgs'){assert.match(html,/type="password"/);assert.doesNotMatch(html,/Authorization|Bearer|@s0natu/);assert.equal(getPageMetadata(path).noindex,true)}
    if(path==='/about')assert.match(html,/id="requisites"/);
  }
});

test('ATLAS-MOTION-01: theme motion differs, reduced motion suppresses animation, cleanup cancels work',async(t)=>{
  const {useThemeMotion}=await vite.ssrLoadModule('/src/lib/use-theme-motion.js');
  const previous={window:globalThis.window,document:globalThis.document,act:globalThis.IS_REACT_ACT_ENVIRONMENT,raf:globalThis.requestAnimationFrame,caf:globalThis.cancelAnimationFrame};
  let active,mediaChange,queued,cancelled=0;const calls=[];const media={matches:false,addEventListener:(k,f)=>mediaChange=f,removeEventListener(){mediaChange=null}};
  const panel={animate:(frames,options)=>{calls.push({frames,options});return {cancel(){cancelled++}}}};
  const root={addEventListener:(k,f)=>active=f,removeEventListener(){active=null},contains:()=>true,querySelector:()=>panel};
  globalThis.window={matchMedia:()=>media};globalThis.document={getElementById:()=>panel};globalThis.requestAnimationFrame=f=>{queued=f;return 1};globalThis.cancelAnimationFrame=()=>{queued=null};globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  function Harness({theme}){const ref=React.useRef(root);useThemeMotion(ref,theme,'qa');return null}
  let renderer;await act(async()=>renderer=TestRenderer.create(React.createElement(Harness,{theme:'cs2'})));
  t.after(async()=>{await act(async()=>renderer.unmount());globalThis.window=previous.window;globalThis.document=previous.document;globalThis.IS_REACT_ACT_ENVIRONMENT=previous.act;globalThis.requestAnimationFrame=previous.raf;globalThis.cancelAnimationFrame=previous.caf});
  const event={target:{closest:()=>({disabled:false,getAttribute:()=> 'panel'})}};
  const triggered=[];for(const theme of ['cs2','dota2','corporate']){await act(async()=>renderer.update(React.createElement(Harness,{theme})));const before=calls.length;active(event);assert.ok(queued);queued();assert.equal(calls.length,before+1);triggered.push(calls.at(-1));}
  assert.equal(new Set(triggered.map(c=>JSON.stringify(c))).size,3,'three distinct motion profiles');
  assert.ok(calls.every(c=>c.options.duration>0&&c.options.duration<400));
  const beforeReduced=calls.length;media.matches=true;mediaChange();active(event);queued();assert.equal(calls.length,beforeReduced,'reduced motion must not animate');
  assert.ok(cancelled>=3);await act(async()=>renderer.unmount());assert.equal(active,null);assert.equal(mediaChange,null);assert.equal(queued,null);
});

test('ATLAS-DAY-06: technical result does not resurrect stale played-map chips',async(t)=>{
  const source=synthetic([match('technical','2026-10-24','13:00','walkover',{resultConfirmed:true,score1:1,score2:0,winner:'Alpha technical',maps:[{name:'STALE TECHNICAL MAP',score1:42,score2:41}]})]);
  const f=await mount(t,React.createElement(MatchdayPage,{tournament:source}));const row=dayRows(f.renderer)[0];assert.match(text(row),/Техническая победа/);assert.doesNotMatch(text(row),/STALE TECHNICAL MAP|42:41/);assert.match(text(row),/Без сыгранных карт/);
});

test('ATLAS-HOME-01: three skins retain actual tournament, confirmed final and partner roles without demo outcomes',async()=>{
  const {AtlasHome}=await vite.ssrLoadModule('/src/components/AtlasHome.jsx');
  const catalogue=await vite.ssrLoadModule('/src/data/tournaments/index.js');
  const homeModule=await vite.ssrLoadModule('/src/data/home-content.js');
  const source=catalogue.currentTournament;const before=JSON.stringify(source);const home=homeModule.loadHomeContent(new Date('2026-10-27T12:00:00Z'));
  const final=source.stages.flatMap(s=>(s.rounds||[]).flatMap(r=>r.matches||[])).find(m=>m.id===source.results?.finalMatchId);assert.ok(final,'published final fixture is required for this acceptance scenario');assert.equal(final.resultConfirmed,true);assert.ok(Number.isFinite(final.score1)&&Number.isFinite(final.score2));
  for(const theme of ['cs2','dota2','corporate']){
    const html=await render(React.createElement(AtlasHome,{theme}));
    assert.match(html,/href="\/tournaments"/);assert.ok(html.includes(`href="/tournaments/${source.slug}"`));assert.ok(html.includes(`href="/tournaments/${source.slug}/matches/${final.id}"`));
    assert.ok(html.includes(`aria-label="Счёт серии ${final.score1}:${final.score2}"`));assert.ok(html.includes(final.team1)&&html.includes(final.team2));
    for(const p of [...home.partners,...home.officialSupport,...home.finalPartners])assert.ok(html.includes(p.name),`${theme} missing partner ${p.name}`);
    assert.doesNotMatch(html,/Команда А|Команда Б|Синтетический|ДЕМО-СЦЕНАРИЙ/);
    assert.equal(html.includes('click-highlight-trigger'),theme==='cs2');
    assert.equal(html.includes('Не трогать'),theme==='dota2');
    assert.doesNotMatch(html,/Запись финала|Смотреть запись/);
  }
  assert.equal(JSON.stringify(source),before);
});
