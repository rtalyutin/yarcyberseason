# Независимая проверка части шага 6: «Формат» и «Расписание»

Дата: 2026-09-19, UTC. Исполнитель: отдельный агент `/root/verify_step6`, не автор реализации. Применены AGENTS.md и qa-verification. Исходники, git и внешние системы проверяющий не изменял; единственная запись — этот отчёт.

## Объект и граница вердикта

- Baseline: `8862d0d19e90b2c7a260d4993fe43f8b18f0bdbd`.
- Первая проверка: `1cda3ba25341bf8c02f8cc0ccd60babf9c944da0`, ветка `codex/telegram-step6-sections`; начальная рабочая копия чистая. **FAIL**: два воспроизведённых дефекта ниже.
- Повтор после исправления владельцем: `3dde1754b235ecbc0ad63c4262869dfbe5898927`, та же ветка. **PASS только ограниченного SSR/Node gate этих двух разделов**.
- Локальный tree повторно проверен: `c3cbcb9f9fc6c73e2cb72267d57a666e0de9e2ad`. Координатор сообщил о сохранении того же tree как remote commit `733288381445bdee400241cb4e616d7428958c77`; remote этим исполнителем не проверялся.
- На повторе присутствуют посторонние для исполняемого объекта изменения владельца: `M docs/telegram-miniapp/STATE.md`, `?? docs/telegram-miniapp/step6-sections.md`. Исходники на повторе соответствуют commit. После записи отчёта добавляется только этот файл.
- Среда: Linux, Node `v24.19.0`, установленный React/ReactDOM; esbuild bundle в памяти (`write:false`), SSR `renderToStaticMarkup`. Проверяются данные и сформированная разметка, не фактическая геометрия браузера.

Не аттестованы весь шаг 6, обновления версий, оставшиеся разделы, полная QA-матрица, реальный Telegram, визуал, взаимодействия браузера и публикация. Отдельный build проверяющий не выполнял. Отсутствие этих проверок не объявляется PASS; они вне выбранного SSR/Node gate и остаются отдельной приёмкой. Разрешение на выпуск не выдаётся.

## Идентичность входов

SHA-256:

| Файл | Digest |
| --- | --- |
| `src/data/tournaments/dota2-autumn-2026.json` | `7a190f528e58500ed4e84b407f36483a0123f23a92884e43a4702d4c9d86c6d7` |
| `src/data/teams.json` | `ac48a0583d2e973d83dc42f4f6d4e9e16668f67e3b0eb68752668a4af39bacab` |
| `src/data/project-content.js` | `79ff70cc2cfa77156b91306eecf55a6c96bea47fd5064de7482c6c55af71ce61` |
| `src/telegram/data/model.js` | `583ec7f785c223ec7afee94d810104d20fdd862c03c2a2d91f7382d973e4c174` |
| `src/telegram/MiniApp.jsx` | `dc28893eda3ab978e9ef2a76118e156a08c037c7807d317c9b50363f3ca603e9` |
| `src/telegram/TournamentSections.jsx`, first | `d0b7ba7efc6f1dba70886139018079e0e4c26dd130ccafc580a5ddcd2f7300de` |
| `src/telegram/TournamentSections.jsx`, repeat | `22bac9c8087b693504011fb533fae4f159c579a14b58fec2bfaa80db3d27f2ea` |
| `src/telegram/preferences.js`, repeat | `73168293b5294fe9cf4714fd9db527c994d806378693b28dc4d172a89c1011e6` |
| `src/telegram/styles/miniapp.css` | `b6d22d65c825c15e25da12d6b0b6edae6a2eae5392b131d28e5e6efc7d3ee6c7` |
| `package-lock.json` | `73e75eb0f3dd0c972e2d6ba61f61df412b74f2e1861caaf06d00347dce38be8e` |

## Выполненные проверки

| Критерий / сценарий | Ожидаемое | Фактическое |
| --- | --- | --- |
| Исходный JSON → «Формат» | Все названия этапов, notices, labels/values правил без переизложения | SSR содержит обе стадии, все опубликованные notices и все три пары label/value; регистрационное сообщение и правила конкурса покрыты штатными тестами |
| Исходный timeline → «Расписание» | Дословные label/date, никаких придуманных дат/времени | Все четыре label/date сохранены; «Набрано 16 команд» не превращено в календарную дату; нет `00:00` |
| Реальные семь ID-only слотов | Не назначенные матчи | Нет `data-match-key`, есть честное пустое состояние матчей |
| Held-out offset `2026-10-10T23:45:00-07:00` | 11 октября, 09:45 МСК | `11 октября 2026 г. в 09:45 МСК` |
| Held-out date-only `2026-10-10` | Дата без времени/МСК | `10 октября 2026 г.` |
| Held-out date + time `23:50` | Не приписывать МСК | `10 октября 2026 г. · 23:50 · часовой пояс не указан` |
| Held-out dateDisplay `10 октября` | Не дописывать год/время | `10 октября` |
| Нет даты | Не вычислять дату из турнира/часов | `Дата уточняется` |
| `published:false`; отсутствие обеих команд | Не отображать назначенным матчем | В обоих случаях DTO matches=0 и нет `data-match-key` |
| completed / walkover / bye, confirmation=false | Явно неподтверждённый результат, без сырого счёта | После исправления все три: `Результат ожидает подтверждения`; нет `1:0` |
| completed / walkover / bye, confirmation=true | Не занижать подтверждённый результат до pending | DTO confirmed=true, pending-текст отсутствует |
| cancelled / postponed | Сохранить опубликованный статус | После исправления `Отменён` / `Перенесён` |
| Read-only render | DTO не мутирует | JSON до/после рендера обоих разделов совпадает |
| Регрессия baseline SSR | Home и header без изменений; старое содержимое турнира сохранено | Home совпадает побайтно; Header совпадает для browser/telegram × home/tournament; overview/participants совпадают после исключения намеренно расширенного nav |
| Routes/runtime/site/theme/lang | Нет посторонней реализации | Дифф ограничен 4 UI-файлами и 2 тестовыми файлами; config, router, runtime, data, main/site/hosting неизменны. 63 теста подтверждают выбранные контракты и регрессии. Desktop CSS inspected, но визуальный PASS не выдан |

## Найденные дефекты и повтор

### QA-S6-01 — неподтверждённый технический исход показан как состоявшийся

Версия обнаружения: `1cda3ba`. Синтетические, не реальные турнирные данные: действительный матч со `status:walkover` или `bye`, `resultConfirmed:false`, `scoreKind:technical`, score1=1, score2=0. Общий адаптер принимает данные и возвращает `result.confirmed:false`.

Ожидаемое: явная оговорка ожидания подтверждения. Фактическое: «Техническая победа» / «Проход без игры» без оговорки. Причина в новом `ScheduleSection`: guard охватывал только `completed`. Влияние: интерфейс объявлял неподтверждённый спортивный исход. Адресат: владелец реализации расписания.

Повтор на `3dde175`: оба исхода показывают «Результат ожидает подтверждения», сырые 1:0 не отображаются; также проверены completed=false и три подтверждённых варианта. **Исправление подтверждено в ограниченном SSR gate**.

### QA-S6-02 — опубликованные отмена и перенос названы неопубликованным статусом

Версия обнаружения: `1cda3ba`. Синтетический действительный матч со `status:cancelled` или `postponed`; оба значения поддерживаются общей моделью.

Ожидаемое: отображение отмены / переноса. Фактическое: «Статус не опубликован» из-за отсутствия этих значений в новом словаре. Влияние: потеря опубликованной операционной информации расписания. Адресат: владелец реализации расписания.

Повтор на `3dde175`: «Отменён» / «Перенесён». **Исправление подтверждено**. Это была синтетическая проверка будущих записей, не сообщение о существующем отменённом матче текущего JSON.

## Команды и воспроизведение

Из корня проекта выполнены:

```sh
git status --short
git branch --show-current
git rev-parse HEAD
git diff 8862d0d19e90b2c7a260d4993fe43f8b18f0bdbd HEAD
node --test tests/telegram*.test.mjs tests/tournament.test.mjs tests/data-integrity.test.mjs tests/sites-worker.test.mjs
```

Результат первого тестового запуска: tests=61, pass=61, fail=0. После исправления: tests=63, pass=63, fail=0. Штатные тесты не были единственным oracle: оба исходных дефекта обнаружены отдельной проверкой, несмотря на исходные 61 PASS.

Ниже воспроизводимый held-out probe: fixture строится из исходного JSON в памяти, авторские syntheticFixtures не используются. Запуск `node --input-type=module` с этим кодом через stdin. В проверке исправления все assertions проходят; на первой версии падают состояния технических исходов и отмены/переноса.

```js
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildMiniAppModel} from './src/telegram/data/model.js';
import {projectContent} from './src/data/project-content.js';
const raw=JSON.parse(readFileSync('src/data/tournaments/dota2-autumn-2026.json','utf8'));
const registry=JSON.parse(readFileSync('src/data/teams.json','utf8'));
const bundle=await build({entryPoints:['src/telegram/MiniApp.jsx'],bundle:true,write:false,platform:'node',format:'cjs',packages:'external'});
const mod={exports:{}};
new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
const render=(m,s)=>renderToStaticMarkup(React.createElement(mod.exports.TournamentScreen,{model:m,route:{screen:'tournament',section:s},navigate(){}}));
const probe=(overrides)=>{
  const t=structuredClone(raw);t.timeline=[];
  t.stages=[{id:'qa',type:'swiss',title:'QA held-out',rules:[],groups:[],matches:[{
    id:'qa-one',team1:t.participants[0].displayName,team2:t.participants[1].displayName,
    status:'scheduled',...overrides}]}];
  const model=buildMiniAppModel(t,registry,projectContent);
  return {model,html:render(model,'schedule')};
};
const real=buildMiniAppModel(raw,registry,projectContent),rules=render(real,'rules'),schedule=render(real,'schedule');
for(const stage of raw.stages){
  assert.ok(rules.includes(stage.title));assert.ok(rules.includes(stage.notice));
  for(const rule of stage.rules||[])for(const text of [rule.label,rule.value])assert.ok(rules.includes(text));
}
for(const item of raw.timeline)for(const text of [item.label,item.date])assert.ok(schedule.includes(text));
assert.ok(!schedule.includes('data-match-key'));assert.ok(!schedule.includes('00:00'));
for(const [input,expected] of [
  [{scheduledAt:'2026-10-10T23:45:00-07:00'},/^11 октября 2026 г\..*09:45 МСК$/],
  [{date:'2026-10-10'},/^10 октября 2026 г\.$/],
  [{date:'2026-10-10',time:'23:50'},/^10 октября 2026 г\. · 23:50 · часовой пояс не указан$/],
  [{dateDisplay:'10 октября'},/^10 октября$/],[{},/^Дата уточняется$/]
]){
  const {model,html}=probe(input);assert.match(model.matches[0].dateDisplay,expected);
  assert.ok(html.includes(model.matches[0].dateDisplay));console.log(input,model.matches[0].dateDisplay);
}
for(const status of ['completed','walkover','bye','cancelled','postponed']){
  const {model,html}=probe({status,resultConfirmed:false,
    scoreKind:status==='completed'?'series':['walkover','bye'].includes(status)?'technical':'unknown',score1:1,score2:0});
  const text=html.match(/<p class="tg-source-state">(.*?)<\/p>/)?.[1];
  console.log(status,model.matches[0].result.confirmed,text);
  assert.match(text,{cancelled:/отменён/i,postponed:/перенесён/i}[status]||/^Результат ожидает подтверждения$/);
  assert.ok(!html.includes('1:0'));
}
for(const status of ['completed','walkover','bye']){
  const {model,html}=probe({status,resultConfirmed:true,scoreKind:status==='completed'?'series':'technical',bestOf:'BO1',score1:1,score2:0});
  assert.equal(model.matches[0].result.confirmed,true);
  assert.ok(!html.includes('Результат ожидает подтверждения'));
}
for(const overrides of [{published:false},{team1:undefined,team2:undefined}]){
  const {model,html}=probe(overrides);assert.equal(model.matches.length,0);assert.ok(!html.includes('data-match-key'));
}
const before=JSON.stringify(real);render(real,'rules');render(real,'schedule');assert.equal(JSON.stringify(real),before);
```

Во время подготовки probes устранены три ошибки самого тестового harness, не дефекты приложения: неподдерживаемый тип этапа `match_schedule` заменён на допустимый `swiss`; ожидание запятой в Intl-формате заменено на проверку значимой даты/времени (среда использует «в»); ожидание буквального «Матч отменён» заменено на семантическое «Отменён». Итоговый probe выше выполнен целиком с exit=0. Эти исправления не меняли продуктовый критерий.

## Handoff

- `handoff_schema`: `FEATURE_HANDOFF/1`
- `handoff_digest`: `880ed9d2dc0004f39250f4a5c3739840cc1f9c4b37edf78b652dc787f5aa44e4`
- `evidence_status`: `VERIFIED` для описанного SSR/Node gate на `3dde175`.
- `gate_verdict`: `PASS` только в указанной границе; исходный `1cda3ba` сохраняет `FAIL`.
- Открытых дефектов в проверенной границе после повтора не обнаружено. Исключения не принимались.
- `action_decision`: `UNDECIDED`; решение о следующем этапе принадлежит координатору.
- `hypothesis_assessment`: `NOT_ASSESSED` — продуктовая гипотеза не проверялась.
- `next_action`: координатору сохранить ограничение объёма, отдельно провести требуемую browser/visual/real-Telegram приёмку; не закрывать весь шаг 6 этим отчётом.
- `return_to`: `/root`, владелец реализации и процесса.
