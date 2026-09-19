# Независимая проверка · шаг 6/16 · Матчи

Дата: 19.09.2026; проверяющий `/root/verify_matches`, отдельный исполнитель от автора реализации `/root`. Прикладной код и тесты проверяющий не менял. Задание — независимая ограниченная приёмка раздела «Матчи», без публикации и изменения данных сайта.

**Вердикт: PASS для выполненного Node/SSR gate.** Наблюдаемых дефектов в проверенном объёме нет. Это не приёмка живого интерфейса, доступности, реального Telegram, всего шага 6 или полного MVP.

## Объект и происхождение evidence

- Исходная база: `74b0c6e2a6617cb1fafff0a9557a68baca67d1a9`.
- Проверенный local commit: `dc04340c369af9fe2b9dcbde52722c97338be365`.
- Проверенный application tree: `b4d19bf96f9441770a2c0e3b97a9147a678372b9`.
- После сохранения автором независимо прочитан `origin/codex/telegram-step6-sections`: `ff5009b80bb5207b5004e93f04d5b9ffd01fbf31`, с тем же tree. Diff исполняемых `src`, `tests`, `package.json`, `package-lock.json` между remote и local пустой.
- До проверок рабочее дерево было чистым. В ходе работы автор добавлял документацию `L0-contracts.md`, `STATE.md`, `step6-matches.md`; в конце `git diff --exit-code HEAD -- src tests package.json package-lock.json` остался пустым. Эти документальные изменения не использовались как oracle и не меняли исполняемый объект.
- Среда: Linux, Node `v24.19.0`, Vite `6.4.2`, React `19.2.0`. Проверки проведены 19.09.2026; финальный held-out прогон — `14:19:50.104 UTC`, контроль сборки — `14:20:33.447 UTC`.
- Прочитаны `AGENTS.md`, qa-verification и его references, весь diff базы → candidate, фактические UI-компоненты, L2 adapter/validator, общий `normalizeResult`, RuntimePort и router. Требования получены от координатора до результата проверки.
- Только отчёт является записанным проверяющим файлом проекта; штатная сборка обновляла игнорируемый `dist`. Коммитов, публикаций, сообщений третьим лицам и изменений бота проверяющий не делал.

SHA-256 входов:

| Вход | Digest |
| --- | --- |
| `src/data/tournaments/dota2-autumn-2026.json` | `7a190f528e58500ed4e84b407f36483a0123f23a92884e43a4702d4c9d86c6d7` |
| `src/data/teams.json` | `ac48a0583d2e973d83dc42f4f6d4e9e16668f67e3b0eb68752668a4af39bacab` |
| `src/lib/community.js` | `54cb032574c072a19fafb9150f78e1d3fc65c360aeeb8999aec000f80b4beee4` |
| `package-lock.json` | `73e75eb0f3dd0c972e2d6ba61f61df412b74f2e1861caaf06d00347dce38be8e` |

## Исполненные gate

| Проверка | Ожидаемое | Наблюдаемое |
| --- | --- | --- |
| `node --test tests/*.test.mjs` | Новые и существующие тесты проходят | **133/133 PASS**, 0 failed/skipped; 2432 ms. Включён новый integration test экрана/меню «Матчи» |
| Независимые held-out проверки ниже | Требования выполняются на отличных от авторских fixtures входах | **12/12 PASS** в Node/SSR |
| `npm run build` | Валидная сборка с совместимыми данными сайта | **PASS**, 4644 modules; validator: 50 team records / 120 matches всего сайта |
| `npm run test:sites` после своей сборки | Сохранены штатные outputs и routing worker | **4/4 PASS**; это локальная проверка упаковки, не публикация |
| `git diff --check BASE..HEAD` | Нет whitespace errors | **PASS**, exit 0 |
| Diff базы по данным, общему normalizer и защищённым hosting-файлам | Нет изменений вне заявленного среза | Пустой diff по `src/data`, `src/lib/community.js`, `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, `tests/sites-worker.test.mjs` |

Сборка сохранила прежние предупреждения о двух отсутствующих NimbusSansNarrow OTF основного сайта; это не новый дефект раздела. Из своей сборки получены:

| Файл | SHA-256 |
| --- | --- |
| `dist/client/assets/entry-BRcACWq_.js` | `77e440161de1807fb9eacd272306052edaf52b90dc259a18f0282ca5a677ce0e` |
| `dist/client/assets/entry-65OZ7QRD.css` | `ddad0de8413fe0417d76f41219a76a6cca4a96b9fd87cd9a7ee2aed72c919e43` |
| `dist/client/index.html` | `18133a17b06e923c8b942039757f3de87ef18af48d770ac18256b1e115aaf70e` |

## Независимые различающие сценарии

Выполнен отдельный `node --input-type=module` heredoc с `node:assert/strict`. JSX собран esbuild в памяти (`write:false`, Node CJS, packages external), вызван настоящий `TournamentScreen` через `renderToStaticMarkup`. Авторские `syntheticFixtures` в этот probe не импортировались.

Для синтетического ввода клонирован фактический tournament JSON; `stages` заменён на один Swiss-этап с вложенными `rounds` (`qa-round`, `QA ROUND`). Матчи строились от `{id:'held-out', team1:'Vnext', team2:'Leto Jr', status:'scheduled', bestOf:'BO3'}` с указанными ниже overrides. Registry и projectContent — реальные неизменённые зависимости; вход всегда проходил `buildMiniAppModel`. Это тестовые записи только в памяти, не результаты турнира. `render` использовал `route: tournamentRoute('matches')`.

| ID / критерий | Вход / действие | Ожидаемое | Фактическое наблюдение |
| --- | --- | --- | --- |
| H01 — реальное пустое состояние и границы | Настоящий loader; routes с `section=matches&tournament=cs2`, вне `/tg`, `/tg/matches` | Не появляются вымышленные матчи; query не меняет турнир; два экрана; rift/ru | 0 matches, 7 пустых слотов, «Матчи ещё не опубликованы», нет `<details>` и `0:0`; канонический `/tg/tournament?section=matches`; `/tournaments/cs2` → null, `/tg/matches` → home; реестры только rift/ru |
| H02 — скрытые записи и ID-only slots | В одном вложенном round: hidden match с `published:false`, `HIDDEN_NOTE`, replay; `{id:'empty-slot'}`; partial с `team2:null` | Только partial в списке, без утечки скрытого текста/ссылок/ключей | Ровно один `<details>`, только ID `partial`; «Соперник ещё не определён», нет hidden note/link/match key и empty-slot key |
| H03 — неподтверждённый результат | Шесть статусов scheduled/live/cancelled/postponed/unknown/completed, `resultConfirmed:false`, raw `99:88`, карта `PRIVATE_MAP_MARKER` `72:61`; отдельно confirmed+scheduled | Неподтверждённые raw score/maps не видны; completed ожидает подтверждения; invalid confirmed rejected | Все маркеры отсутствуют, completed подписан ожиданием; confirmed+scheduled выбрасывает `Unresolved confirmed score` |
| H04 — серия и статистика Dota | completed, confirmed, series `0:2`; MAP_A `42:17`, MAP_B без score с outcome | Сохраняются ориентация команд, отдельная семантика серии/карты и неполнота | «Счёт серии 0:2» отдельно от «Счёт карты 42:17»; missing map score явно подписан, winnerSide=2; нет единицы «Раунды» |
| H05 — технические исходы | walkover и bye, confirmed technical `0:1`; добавлена raw карта `TECH_MAP_MUST_HIDE` `23:44` | Технический счёт не становится серией или сыгранной картой | `0:1`, «Технический результат — без сыгранных карт»; нет series label, карты, `23:44` и списка карт |
| H06 — ничья и настоящий ноль | completed confirmed BO2 series `1:1`; опубликованная карта `0:0` | Не теряются ничья и явно заданные нули; ноль не создаётся для неизвестного результата | Показаны «Счёт серии 1:1», «Ничья», «Счёт карты 0:0» |
| H07 — безопасность URL | Для каждого stream/broadcast/replay/document: http, javascript, data, protocol-relative, relative, ftp, HTTPS с username/password либо одним username | Ни одно небезопасное действие не доходит до UI/RuntimePort | links=[]; `isUiAction` false; отсутствует блок материалов матча во всех восьми случаях |
| H08 — aliases и передача runtime | stream `https://EXAMPLE.com:443/live`, broadcast `https://example.com/live`, отдельные replay/doc; runtime передан в TournamentScreen | Один canonical stream, RuntimePort доходит до раздела, ссылки не становятся href | Ровно три external actions; идентичный runtime в props `MatchesSection`; нет href и disabled у кнопок с runtime |
| H09 — действие только по callback | MatchDetails с replay; настоящие browser/telegram adapters с перехватчиками `window.open`/`webApp.openLink`; вызов callback, dispose, повтор callback | На render нет IO; один вызов после callback; disposed adapter не открывает повторно | 0 → 1 → 1 вызов. Browser аргументы: URL, `_blank`, `noopener,noreferrer`; Telegram openLink получает URL. Это вызов React-prop в Node, не физический клик/живой SDK |
| H10 — повторная защита renderer | После L2 в links инъецированы HTTP external и valid internal action; runtime отсутствует | Видна только допустимая external action, недоступная без runtime | Одна disabled button; нет BAD/NOT_EXTERNAL labels |
| H11 — read-only и экранирование | Deep-freeze модели; note `<script>QA_INJECTION</script>` и map name `<img onerror=x>` | Render не меняет модель, входной текст не становится HTML | JSON до/после одинаков; SSR содержит `&lt;script&gt;` и `&lt;img…&gt;`, без raw script/img injection |
| H12 — fail-closed контракт | Нормализованная карта без outcome; source confirmed со scoreKind unknown | Invalid map rejected; неизвестный подтверждённый счёт не придумывается | Validator возвращает `NormalizedMap`; adapter бросает `Unresolved confirmed score` |

Сохранённый итог stdout независимого прогона:

```text
PASS H01 production empty, 7 ID-only slots, pinned route and rift/ru
PASS H02 nested rounds: hidden match and ID-only slot absent, partial pair visible
PASS H03 six unconfirmed statuses suppress stale score/map markers
PASS H04 reverse series result, partial Dota map statistics stay distinct
PASS H05 technical reverse score and bye never become played maps
PASS H06 draw and explicit zero map score retained without inference
PASS H07 unsafe URL matrix fails closed at adapter and action boundary
PASS H08 canonical link deduplication and runtime passed by TournamentScreen
PASS H09 no runtime IO during render; callback dispatches browser and Telegram adapters
PASS H10 unsafe and internal actions removed by renderer if injected after L2
PASS H11 renderer read-only and source text escaped
PASS H12 malformed maps and unresolved confirmed results fail closed
{"heldOutPassed":12,"utc":"2026-09-19T14:19:50.104Z","node":"v24.19.0","platform":"linux"}
```

Первый запуск остановился в H02 из-за слишком широкого regex `hidden`, который зацепил стандартный `aria-hidden`. Это ошибка независимого probe: исходный markup уже содержал только partial, без скрытой записи. Regex уточнён до hidden `data-match-key` и уникальных маркеров; требование не ослаблялось. После поправки probe все 12 сценариев прошли, приложение не менялось.

## Статическая граница и ограничения

Статически подтверждено: MatchesSection читает только DTO; `result.score` приходит через общий normalizer, компонент не рассчитывает победителя/счёт из карт, raw score или времени. Раскрытие реализовано нативными `<details><summary>`, отдельного route детали не создают. Существующий screen передаёт RuntimePort, внешние действия проходят HTTPS guard, CSS добавлен только под tg-классами. Это свойства кода и SSR, не визуальная/клавиатурная приёмка.

Автор повторно сообщил блокировку browser `tab.goto` на `http://127.0.0.1:4173/tg/tournament?section=matches`: `ERR_BLOCKED_BY_CLIENT`. Проверяющий не обходил ограничение другим инструментом, туннелем или публикацией и не заявляет собственного успешного browser прохода. Поэтому **BLOCKED / NOT_VERIFIED** остаются:

- Настоящее раскрытие/закрытие `<details>`, порядок фокуса, Enter/Space, screen reader и отсутствие визуального overflow.
- Новый раздел на телефонных/desktop viewport, safe areas, масштаб/текст 200%.
- Реальные Telegram Android/iOS/Desktop и физическое открытие внешнего URL через host.
- Новая версия на публичном HTTPS, version manifest/обновление, оставшиеся разделы шага 6 и полная матрица шага 7.

Четыре Sites-теста и сборка не снимают эти ограничения и не разрешают выпуск. Browser/Telegram исключения не приняты как PASS; они явно находятся за границей ограниченного Node/SSR verdict.

## Передача

- `handoff_schema`: `FEATURE_HANDOFF/1`.
- `handoff_digest`: `880ed9d2dc0004f39250f4a5c3739840cc1f9c4b37edf78b652dc787f5aa44e4` — SHA-256 локального `qa-verification/references/feature-handoff-contract.md`.
- `evidence_status`: `VERIFIED` для описанного application tree и Node/SSR gate.
- `gate_verdict`: `PASS` для Node/SSR; интерактивный UI/Telegram gate — `BLOCKED`.
- `defects`: наблюдаемых дефектов нет в исполненном scope.
- `exceptions`: нет принятых исключений, превращающих непроверенные сценарии в PASS.
- `operation_status` внешнего выпуска у проверяющего: `NOT_STARTED`.
- `action_decision`: `UNDECIDED` — решение о дальнейшем этапе/выпуске принадлежит координатору и пользователю.
- `hypothesis_assessment`: `NOT_ASSESSED` — продуктовая полезность этим QA не измерялась.
- `next_action`: сохранить отчёт с точной привязкой к code tree; живой UI/Telegram проверить в разрешённой доступной среде в пределах отдельного gate.
- `return_to`: `/root`, автор реализации и координатор.
