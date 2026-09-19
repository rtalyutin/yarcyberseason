# Независимая проверка архива Telegram Mini App

- Дата: 2026-09-19T19:26:10.013Z.
- Исполнитель: отдельный агент `/root/verify_archive`; реализацию выполнял `/root`.
- Поручение: сначала добавить прошедшие турниры в Mini App и опубликовать изменения; QA не выполняет публикацию.
- `handoff_schema=FEATURE_HANDOFF/1`; `handoff_digest=880ed9d2dc0004f39250f4a5c3739840cc1f9c4b37edf78b652dc787f5aa44e4`.
- `artifact_revision`: commit `7577f8e432dc17871fac0433f31b79ab4289486b`, tree `51f03fbf6ab2450a7e9fdb75c335de4a1b3e13f1`. Перед и после проверок рабочая копия кода чистая; после создаётся только этот отчёт.
- Среда: Node `v24.19.0`, установленные зависимости проекта; реальные JSON из `src/data/tournaments`, реестр `src/data/teams.json`, React SSR и имитация window/history без браузера.
- `evidence_status=VERIFIED`, `gate_verdict=PASS` для локальных данных, маршрутизации, поведения обработчиков и SSR; `action_decision=CONTINUE`, `hypothesis_assessment=NOT_ASSESSED`.
- `operation_status=NOT_STARTED`: внешних операций не выполнял; разрешение публикации оценивает координатор по запросу пользователя.

## Результат

Собственный сценарий: **9/9 PASS** на окончательном commit. Полный `node --test tests/*.test.mjs`: **155/155 PASS** на предшествующем commit `5edc787dc798b4df5a3d9dd4400caca1aa6b1cdf`, tree `4bd5a1e286e9bab72fe6972ae07d73a7021b3fa9`. Последующее изменение касается только архивных подписей количества записей и пояснения; все девять зависимых проверок повторены на окончательной версии. Полный suite на неё не переносится как отдельный новый запуск.

| Критерий | Исполненный сценарий | Наблюдение |
|---|---|---|
| Каталог и current | Реальные loader/adapter, сравнение входов до/после, неверный slug | Ровно4 архива; default Dota autumn:16 участников,0 матчей,нет results; неизвестный loader slug отклонён, входы не меняются |
| Изоляция и точность | Для каждого JSON сравнить ID всех опубликованных матчей, stage type, каждую строку/ячейку исходных таблиц | Матчи current/CS2 Aug/Main/Feb/Qual:0/45/29/33/13; ключи и tournamentId принадлежат выбранному турниру; исходные отрицательные points сохранены |
| Главная и действия | SSR Home; вызвать реальные onClick четырёх карточек и всех разделов каждого архива | Четыре карточки; CS2 Aug→results, остальные→standings; все маршруты сохраняют slug |
| URL/history | Собственная имитация window/history; navigate, fresh router из URL, popstate, неизвестный турнир | Выбор турнира/раздела сохраняется; home→tournament push, смена раздела replace; неизвестный slug→current overview |
| Выбор модели во view | SSR MiniAppView с route snapshot каждого архива | Заголовок и матчи принадлежат выбранному архиву, данные current не подставляются |
| Неполные архивы | Реальный Main playoff, Feb playoff и Qual schedule/standings | Main6 подтверждённых матчей/0 рёбер+предупреждение; Feb13 матчей,нет чемпиона/results; Qual13 матчей,start/end/date/scheduledAt null,нет playoff;22 строки,включая−6очков |
| Итоги CS2 | Published placements/final и SSR результатов | KEGA/bobr1ki/SAITEN; финал bobr1ki–KEGA2:3 в исходном порядке;3 места,1 раскрытие финала,без выдуманных карт |
| Честный count | SSR архивных header и participants | «Записей команд», пояснение о неполном списке и исторических названиях; число registry ID не объявлено общим числом участников |
| Регрессия SSR | Отрисовать каждый доступный раздел всех пяти моделей | Нет заглушки «Этот раздел ещё готовится», архивные страницы различимы по title,не показывают закрытую регистрацию current |

## Найденный и исправленный дефект

`ARCHIVE-1`, исходная версия `5edc787…`: адаптер получает список уникальных registry ID, но UI выводил без оговорки «Команд:12» для CS2 Aug при опубликованном fact«16 команд»; Feb12 при fact11 из-за отдельных исторических записей FIST; Qual20 при22 строках таблицы. Это создавало ложное впечатление подтверждённого общего размера турнира.

Воспроизведение: загрузить соответствующую модель и SSR `TournamentScreen` с `section=participants`; прочитать `.tg-tournament-meta` и `#participant-title`. Различающий9-й тест дал FAIL. Исправление в `7577f8e…`: оба счётчика подписаны «Записей команд», перед списком добавлено пояснение о неполноте/исторических названиях. Исходные JSON и привязки не менялись. Тот же тест дал PASS; закрыто.

## Границы доказательств

Мок window/history проверяет функции маршрутизации и восстановление состояния из URL; это не наблюдение реального reload/history браузера. SSR не доказывает гидратацию, геометрию, клавиатурный фокус, SVG-линии, адаптацию360/390/430/768/wide и работу Telegram SDK. Эти браузерные/Telegram критерии здесь **NOT_VERIFIED**; отдельный browser gate **BLOCKED** до наблюдения. Координатор сообщил повторный `ERR_BLOCKED_BY_CLIENT` локального preview и выполняет production smoke после выпуска. Этот отчёт не заменяет его проверки и не даёт разрешение на публикацию.

`next_action`: координатору продолжить разрешённый release и smoke, сохранив указанные ограничения. `return_to=/root`.

## Воспроизведение

- `node /tmp/ycs-independent-archive.mjs` — исходник полностью приведён ниже; SHA256 `c46a9ccba2a053be7feaca880c349d81249f324eec58dc8bb16702157c159886`.
- `node --test tests/*.test.mjs` — полный suite предшествующего candidate,155/155; лог `/tmp/ycs-independent-archive-suite.log`, SHA256 `704beff1aff632a7c0a8df7d26b82b232b47e47d69e236a850b20b593d2045e6`.
- Исходное воспроизведение дефекта: `/tmp/ycs-independent-archive-before-fix.log`, SHA256 `e030d8ff3b16d5a239f9894743c70a05f30b903206b9a9a91f2024446837008a`.
- Последний raw результат: `/tmp/ycs-independent-archive-result.json`; полный код сценария позволяет воспроизвести проверки после утраты временных файлов.

<details>
<summary>Самостоятельный исполняемый сценарий QA</summary>

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import crypto from 'node:crypto';
const root='/workspace/scratch/4d5e017d884a/yarcyberseason';
process.chdir(root);
const require=createRequire(root+'/package.json');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {build}=require('esbuild');
const imp=p=>import(pathToFileURL(root+'/'+p));
const {loadMiniAppModel,loadArchivedModels}=await imp('src/telegram/data/load.js');
const {buildMiniAppModel}=await imp('src/telegram/data/model.js');
const {projectContent}=await imp('src/data/project-content.js');
const {createMiniAppRouter}=await imp('src/telegram/router.js');
const {getMessages,DEFAULT_PREFERENCES}=await imp('src/telegram/preferences.js');
const {resolveMiniAppLocation,serializeMiniAppRoute,tournamentRoute}=await imp('src/telegram/contracts.js');
const bundle=await build({entryPoints:['src/telegram/MiniApp.jsx'],bundle:true,write:false,platform:'node',format:'cjs',packages:'external'});
const out={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(require,out,out.exports);
const {HomeScreen,ArchiveList,TournamentScreen,MiniAppView}=out.exports;
const registry=JSON.parse(fs.readFileSync('src/data/teams.json'));
const files=['dota2-autumn-2026','current-cs2-2026','dota2-main-2026','cs2-february-2026','dota2-qual-2026'];
const raw=files.map(f=>JSON.parse(fs.readFileSync('src/data/tournaments/'+f+'.json')));
const current=loadMiniAppModel();const archives=loadArchivedModels();const models=new Map([current,...archives].map(m=>[m.tournament.slug,m]));
const slugs=[...models.keys()];const sections=slug=>models.get(slug).sections.map(s=>s.id);
const obs=[];
const render=(m,section)=>renderToStaticMarkup(React.createElement(TournamentScreen,{model:m,route:tournamentRoute(section,m.tournament.slug),navigate(){}}));
function childrenOf(el,pred,out=[]) {if(!el||typeof el!=='object')return out;if(Array.isArray(el)){el.forEach(x=>childrenOf(x,pred,out));return out;}if(pred(el))out.push(el);childrenOf(el.props?.children,pred,out);return out;}
function textContent(el){if(el==null||typeof el==='boolean')return '';if(Array.isArray(el))return el.map(textContent).join('');if(typeof el!=='object')return String(el);return textContent(el.props?.children);}
function check(name,f){try{const value=f();obs.push({name,status:'PASS',...(value?{observation:value}:{})});console.log('PASS',name,value||'');}catch(error){obs.push({name,status:'FAIL',error:error.stack});console.error('FAIL',name,error.stack);}}
function browserWindow(path='/tg'){
 const ev=new Map();const w={location:{},addEventListener(n,f){ev.set(n,f);},removeEventListener(n,f){if(ev.get(n)===f)ev.delete(n);},pop(path){move(path);ev.get('popstate')?.();}};
 const move=path=>{const u=new URL(path,'https://qa.invalid');Object.assign(w.location,{pathname:u.pathname,search:u.search,href:u.href,reload(){throw Error('unexpected reload');}});};move(path);
 w.history={state:null,calls:[],replaceState(s,t,p){this.state=s;this.calls.push(['replace',p]);move(p);},pushState(s,t,p){this.state=s;this.calls.push(['push',p]);move(p);}};return w;
}
check('catalog, default and no source mutation',()=>{
 assert.deepEqual(archives.map(m=>m.tournament.slug),['cs2-august-2026','dota2-main-2026','cs2-february-2026','dota2-qual-2026']);
 assert.equal(current.tournament.slug,'dota2-autumn-2026');assert.equal(current.participants.length,16);assert.equal(current.matches.length,0);assert.equal(current.results,null);
 const frozen=structuredClone({raw,registry,projectContent});for(const t of raw)buildMiniAppModel(t,registry,projectContent);assert.deepEqual({raw,registry,projectContent},frozen);
 assert.throws(()=>loadMiniAppModel('not-a-tournament'));
 return '4 archives, current Dota16/0, unknown loader rejected, source unchanged';
});
check('all selected models are isolated with exact published matches and tables',()=>{
 const counts=[0,45,29,33,13];
 for(let i=0;i<raw.length;i++){
  const t=raw[i],m=models.get(t.slug);assert.equal(m.matches.length,counts[i]);assert.ok(m.matches.every(x=>x.tournamentId===t.id&&x.key===`${t.id}/${x.id}`));
  const declared=t.stages.flatMap(s=>(s.rounds||[{matches:s.matches||[]}]).flatMap(r=>r.matches||[])).filter(x=>x.published!==false&&(x.team1||x.team2));
  assert.deepEqual(m.matches.map(x=>x.id).sort(),declared.map(x=>x.id).sort());
  for(const s of t.stages){const mapped=m.stages.find(x=>x.id===s.id);assert.equal(mapped.type,s.type);for(const g of s.groups||[]){const table=mapped.tables.find(x=>x.id===g.id);assert.equal(table.rows.length,g.rows.length);for(const row of g.rows){const got=table.rows.find(x=>x.displayName===row.team);assert.ok(got);for(const key of ['position','played','won','lost','mapRecord'])if(Object.hasOwn(row,key))assert.equal(got.cells[key],row[key]);if(Object.hasOwn(row,'points'))assert.equal(got.cells.final,row.points);if(Object.hasOwn(row,'finalLabel'))assert.equal(got.cells.final,row.finalLabel);}}}
 }
 return 'matches0/45/29/33/13; source table names, positions, stats including points=-6 retained';
});
check('archive home and all button targets',()=>{
 const home=renderToStaticMarkup(React.createElement(HomeScreen,{model:current,archives,navigate(){}}));assert.match(home,/Прошедшие турниры/);
 for(const m of archives)assert.ok(home.includes(m.tournament.title));
 const got=[];const tree=ArchiveList({archives,navigate:r=>got.push(r)});const buttons=childrenOf(tree,e=>e.type==='button');assert.equal(buttons.length,4);buttons.forEach(b=>b.props.onClick());
 assert.deepEqual(got.map(r=>r.tournamentSlug),archives.map(m=>m.tournament.slug));assert.equal(got[0].section,'results');assert.deepEqual(got.slice(1).map(r=>r.section),['standings','standings','standings']);
 for(const m of archives){for(const s of m.sections){const captured=[];const tree=TournamentScreen({model:m,route:tournamentRoute(s.id,m.tournament.slug),navigate:r=>captured.push(r)});const nav=childrenOf(tree,e=>e.type==='nav')[0];for(const b of childrenOf(nav,e=>e.type==='button'))b.props.onClick();assert.ok(captured.every(r=>r.tournamentSlug===m.tournament.slug));} }
 return '4 cards + every archive section target retains selected slug';
});
check('deep links, changes, reload, history and invalid tournament',()=>{
 const runtime={readLaunchTarget(){return null;}};
 for(const m of archives){const w=browserWindow('/tg');const r=createMiniAppRouter(w,runtime,sections,slugs);r.navigate(tournamentRoute('matches',m.tournament.slug));assert.equal(w.history.calls.at(-1)[0],'push');r.navigate(tournamentRoute('schedule',m.tournament.slug));assert.equal(w.history.calls.at(-1)[0],'replace');assert.equal(new URL(w.location.href).searchParams.get('tournament'),m.tournament.slug);
  const fresh=browserWindow(w.location.pathname+w.location.search);const rr=createMiniAppRouter(fresh,runtime,sections,slugs);assert.equal(rr.getSnapshot().route.tournamentSlug,m.tournament.slug);assert.equal(rr.getSnapshot().route.section,'schedule');
  r.navigate({screen:'home'});w.pop(serializeMiniAppRoute(tournamentRoute('matches',m.tournament.slug)));assert.equal(r.getSnapshot().route.tournamentSlug,m.tournament.slug);assert.equal(r.getSnapshot().route.section,'matches');r.dispose();rr.dispose();
  const direct=resolveMiniAppLocation({pathname:'/tg/tournament',search:'?tournament='+m.tournament.slug,tournamentSlugs:slugs,availableSections:sections});assert.equal(direct.route.tournamentSlug,m.tournament.slug);assert.equal(direct.route.section,m.results?'results':'standings');
 }
 const invalid=resolveMiniAppLocation({pathname:'/tg/tournament',search:'?tournament=evil&section=results',tournamentSlugs:slugs,availableSections:sections});assert.equal(invalid.route.tournamentSlug,undefined);assert.equal(invalid.route.section,'overview');
 return 'fresh router and popstate preserve archive; unknown slug returns current overview';
});
check('view selects each archive model from its route',()=>{
 const runtime={kind:'browser'};
 for(const m of archives){const route=tournamentRoute('matches',m.tournament.slug);const state={route,canonicalUrl:serializeMiniAppRoute(route),notice:null};const router={subscribe(){return ()=>{};},getSnapshot(){return state;},navigate(){}};const html=renderToStaticMarkup(React.createElement(MiniAppView,{model:current,archives,models,runtime,router,copy:getMessages('ru'),preferences:DEFAULT_PREFERENCES,onPreferences(){}}));assert.ok(html.includes(m.tournament.title));assert.ok(html.includes(m.matches[0].team1.replaceAll('&','&amp;')));assert.doesNotMatch(html,/Матчи ещё не опубликованы/);}
 return 'MiniAppView route snapshot resolves each own archive model';
});
check('source uncertainty, partial historical playoff and missing year',()=>{
 const main=models.get('dota2-main-2026'),feb=models.get('cs2-february-2026'),qual=models.get('dota2-qual-2026');
 const mainStage=main.stages.find(s=>s.id==='playoffs');assert.equal(mainStage.type,'historical_matches');assert.equal(mainStage.rounds.flatMap(r=>r.slots).length,6);assert.equal(mainStage.edges.length,0);const mainHTML=render(main,'playoffs');assert.match(mainHTML,/Исходная сетка не сохранена целиком/);assert.equal((mainHTML.match(/<details/g)||[]).length,6);
 assert.equal(feb.results,null);assert.equal(feb.stages.find(s=>s.id==='playoffs').rounds.flatMap(r=>r.slots).length,13);assert.match(render(feb,'playoffs'),/итоговый результат и чемпион не опубликованы/);
 assert.equal(qual.tournament.dates.start,null);assert.equal(qual.tournament.dates.end,null);assert.ok(qual.matches.every(m=>m.date===null&&m.scheduledAt===null));assert.ok(!qual.sections.some(s=>s.id==='playoffs'));assert.match(render(qual,'schedule'),/год.*не указан/);assert.match(render(qual,'standings'),/>-6</);
 for(const m of [main,feb,qual])assert.ok(!m.sections.some(s=>s.id==='results'));
 return 'Main6 partial matches/no edges; Feb13/no champion; Qual null year/no playoff/negative points';
});
check('completed CS2 results and normalized final',()=>{
 const cs=models.get('cs2-august-2026');assert.deepEqual(cs.results.placements.map(p=>[p.position,p.team]),[[1,'PIVNAYA KEGA'],[2,'bobr1ki'],[3,'SAITEN x BAD.RABBIT']]);
 const final=cs.matches.find(m=>m.id===cs.results.finalMatchId);assert.equal(final.team1,'bobr1ki');assert.equal(final.team2,'PIVNAYA KEGA');assert.deepEqual(final.result.score,[2,3]);assert.equal(final.result.maps.length,0);
 const html=render(cs,'results');assert.match(html,/Счёт серии<\/span><strong>2:3/);assert.equal((html.match(/data-position=/g)||[]).length,3);assert.equal((html.match(/<details/g)||[]).length,1);assert.doesNotMatch(html,/tg-map-results/);
 return 'published KEGA/bobr1ki/SAITEN podium,2:3 in source order,no map fabrication';
});
check('archive record counts never claim a verified tournament total',()=>{
 for(const m of archives){const html=render(m,'participants');const meta=html.match(/<div class="tg-tournament-meta">.*?<\/div>/)?.[0]||'';const heading=html.match(/<h2 id="participant-title">.*?<\/h2>/)?.[0]||'';assert.doesNotMatch(meta,/>Команд: /);assert.doesNotMatch(heading,/>Команд: /);assert.match(meta,/(сохран|архив|запис)/i);assert.match(html,/(неполн|не.*полны|различ|названи|общ.*числ)/i);}
 return 'archive count qualified as saved records, source limits explained';
});
check('all exposed sections render and participant/source context remains honest',()=>{
 for(const m of models.values())for(const section of m.sections){const html=render(m,section.id);assert.doesNotMatch(html,/Этот раздел ещё готовится/);if(m!==current){assert.ok(html.includes(m.tournament.title));assert.doesNotMatch(html,/Регистрация закрыта/);}}
 return 'all current + archived section SSR rendered';
});
const result={at:new Date().toISOString(),executor:'/root/verify_archive',checks:obs,pass:obs.filter(x=>x.status==='PASS').length,fail:obs.filter(x=>x.status==='FAIL').length};
fs.writeFileSync('/tmp/ycs-independent-archive-result.json',JSON.stringify(result,null,2));process.exitCode=result.fail?1:0;
```

</details>
