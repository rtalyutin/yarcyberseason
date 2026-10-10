# Telegram Mini App — состояние проекта

## TASK_STATE — MVP/results update, 10.10.2026

- Authorization: «меняй в коде и обновляй результаты» after agreement on per-player,
  per-map ±15% from every complete REAL player-map score of this tournament,
  excluding calculated replacements, with automatic recalculation on new data.
- Approved outcomes: Borisogleb–ARB1:0, Aegis–Tech Titans1:0
  (9037645797,34:32,3331seconds, no league selected), liqa sto–strela0:1 technical.
  Swiss standings/calendar/results projection updated, five other R1 matches
  remain scheduled. Technical no-play gives no MVP.
- Prepared implementation: exact rational mean/factors, provenance/identity
  validation, pending no-baseline/no-identities, recovery replacing estimates,
  discovery failure known-ID retry, sports confirmations before API with CAS
  readback, stale/conflict protections, UI label without fake metrics.
- Tech903 has no verified ten-account map binding in the data; players:[] stays
  pending. No production calculated individual award has been asserted.
- Existing active backend observed at rtalyutin-tg-mcp-4776.twc1.net, collector
  enabled/configured, source54628232/f41b3eb0; latest attempted import error.
 8179 endpoint502 and league20164API403 at this observation.
- PREPARED, publication not yet claimed. Narrow source/independent QA and build
  evidence will be bound to frozen tree and runtime fingerprint before publish.
- Current workspace has no linked tgcloud project/CLI token (status read-only).
  Static Serverless update is BLOCKED_ACCESS until existing access is restored.
  Prior deployments remain historical evidence, not evidence for this update.
- Preserve private captain agreements/roster/S3 state, current bot menu, three
  cloud modules/config, one writer and all unrelated sources. No ACL/env change.


## ACTIVE_CONTRACT — captain-deploy-6, 09.10.2026

### TASK_STATE — authenticated reader live; approved round period required, 09.10.2026 19:54 МСК

- Owner correction18:22: «да никто файл не создавал. вот и все». Results JSON
  were not created; screenshot18:19 shows results/_checks rather than the
  requested snapshots.403 is not proof of lost existing content or wrong ACL.
  Withdraw the assistant-added prerequisite requiring future results files.
  No placeholders, manual private writes, second writer or broad public ACL.
- Original current-content condition PASS. One default-menu setChatMenuButton
  on bot8672463486/@YarCyberSeason_bot, app8672463486, points Miniapp to
  https://app8672463486.tgcloud.ai/tg. Immediate15:28:44Z readback was old,
  recorded UNKNOWN; no repeated mutation. Separate15:29:23Z GET and independent
  QA confirm new URL. Main profile URL/per-chat overrides not changed/verified.
- Root static-only source546 deployment revision2→3 was independently verified
  with419files. The later approved home-parity release supersedes it: fresh
  cloud GET16:21:43Z revision4 matches all433files/30,067,451 bytes to frozen
  c25867/a116 artifact, bundle27dd20776d263b22335b9ba54add257e791737f97f95ecfd3ffb0f64b2ea435b,
  canonicalmanifest552c9bf9aee4ae10385bb758c02d45fc7cbbed97828c37da4ab2bc88730b19f1.
  All3canonicalmodulebytes, servingconfig and new default-menu retained;
  all80calendarbytes and17sourceJSON preserved. Independent20HTTP response
  receipt16:09:28–16:09:55Z remains correlated with the exact artifact. Current
  QA gate PASS_CURRENT_STATIC_AND_RUNTIME_OBSERVATION, not full READY.
- Authenticated-results correction published: source main
  8e3d079bc90ac51cae250ab0a02f1d38fcdec118/tree02b0c4eae7fb5880a6962a10c2e4cea093d29e1a,
  exactly7source paths,396other leaf paths preserved. Tg-mcp main
  8c5d2495da9695862d82e6e8348a513b3b3fd4af/tree36709e46e3f59f2e47d6bf0a1d0856229b821294,
  exactly7target paths,443others preserved; PR46 merged16:52:37Z.
  Captain18asset FP275bf52630dcf98dd887882d3c6212eeb349b82c67c42395bfbd1bb1a6b3718f
  pins the published source8e3 only; collector pin/files/manifest and published
  ETag store8a5a8357 are unchanged. No env/ACL/bot/Serverless/S3-setting operation.
- Qualification: source30+heldout5 PASS; target9+heldout2 PASS and build PASS.
  A synthetic changing getter was reproduced and fixed with single-capture
  safe fields before publication; no production disclosure is asserted.
  First requiredCI37961062997 passed337/338 and failed the unpropagated
  vendored test input. Three fixture lines were updated to the accepted
  readSnapshot API; all assertions retained, independently reproduced/retested.
  Final requiredCI37961897943 on actualmain8c5 passed338/338 root,
  128/128workspace and30/30UI, zero skips; both asset checks PASS.
- First post-main16:53:13Z health still served source985/FPca1d; this was
  recorded as pending activation, with no repeated deploy mutation.
  Fresh16:54:49Z captain health now serves source8e3/FP275bf526, enabled/configured,
  CAPTAIN_STARTED,idle,errornull; rosterImport applied16, observed revision3;
  cleanupErrorCode:null, storage phase:read/errorCode:null. This observes
  the current global revision, not a proof that private state stayed at2.
  Passive readiness: resultsAvailable:true, matchCount:8, windowCount:0.
  The authenticated read is available; approved selection windows are absent.
  configured:true is not evidence of agreement readiness. Provider root cause
  of the former conflict remains unverified; ETag compatibility is preserved.
- Collector remains source54628232/FPf41b3eb013f39adcab03165f1bd905dd8a2592d762f0673b1b160e0cf8b5b5d1,
  enabled/configured,YCS_STARTED,waiting. Its files/manifest were not changed
  by root. Preserve home parity, /org correction, approved roster and calendar.
- Proposed old diagnostic source6/target4 candidates passed narrow local QA
  but were NOT_PUBLISHED: freshheadguard found sourcea116/target5c before any
  mutation. They overlap the newer ETag/store/home/docs changes and are STALE.
  Do not overwrite newer store/runtime/test/manifest or equate the separately
  pinned captain and collector sourceRevision values.
- Corrected results reader is live: fixed-key signed GetObject only; confirmed
  NoSuchKey before the first valid snapshot is known absence. Denial, unknown
  404, malformed/oversized content and timeout fail closed; latest snapshot,
  cache, existing consent and two-hour cutoff remain. No manual public JSON.
- Remaining owner input: the allowed first-round start/end dates and hours
  in Moscow time, common to all8pairs or individually specified. CAP-05 in
  the accepted TZ and regulation3.3.5–3.3.7 require a published round period.
  Known appointments and tournament9–25October/stage9–23October do not define
  that period. Prepare exact YCS_CAPTAIN_WINDOWS_JSON only after this answer;
  settings access/activation still needs the existing owner route. Chat and
  viewing are not blocked by missing windows; new agreement is correctly
  blocked. Do not invent periods or request placeholder results.
- Final operation gate: SOURCE/TARGET_PUBLICATION_VERIFIED and
  PASS_LIVE_AUTHENTICATED_READ_OBSERVATION, not fullcabinetREADY. Genuine
  signed captain entry/chat/two-party consent, future public updates,
  concurrent CAS and version/backup/Object Lock retention remain NOT_VERIFIED.
  Evidence: captain-authenticated-results-publication-receipt.json,
  captain-runtime-after-authresults-main-2.json and the independent
  captain-integration-qa/authresults-* qualification/correlation ledgers.



## Completed release — home-content-parity-1, 09.10.2026

Роман поручил совпадение содержания главной Telegram-миниаппа с главной сайта при другом отображении. Уточнение «о тг миниапе)» заменяет первоначальное предположение VK. Сохраняются «Разлом», русский язык, две существующие страницы, кабинет капитана с прежней проверкой доступа, выход/Back и все архивы. Спортивные JSON, расписание, результаты и предыдущие условия выпуска не меняются.

### TASK_STATE — правка опубликована

- База: source main `54628232536332267eeeaa566eb31af438b47b37`. Разрешение выпуска: «Отправляй. Не забывай что миниапп - серверлесс» (09.10.2026 19:01 МСК), повторное «отправляй» 19:06. Сохранён свежий upstream `985cb35` с независимой правкой ETag кабинета. Application source опубликован в main `c25867cd1c27bd425685761ac9738858fafa0206`, tree `6ebf17a84c7a74f519e8042cdf0b4bc06c1c8bc7`; Git readback подтвердил этот SHA. Tree точно совпадает с локальной сборочной ревизией `9e95d5a`. Git CLI не имел credentials; штатные GitHub API tree/commit/ref с expected_sha выполнены без force.
- Общие `src/data/home-content.js` и `src/lib/home-content.js` связывают содержание двух главных с каноническим каталогом турниров. Результаты читаются из актуальной binding при рендере. В Telegram добавлены актуальный заголовок, даты/призовой фонд, выбранный эфир и его честное состояние, завершённый сезон CS2, подписи чемпионов в архиве, партнёрский контакт и реквизиты. Остальные архивы доступны под «Все результаты»; страницы турниров и runtime bridge сохранены.
- Авторская проверка финального кода: build PASS, 192 canonical URLs и 3 aliases; focused home/archive/navigation/tournament 28/28 PASS и static routes 6/6 PASS. Полный Telegram suite 100/102: два ожидания старого описания трансляции воспроизводятся на исходной базе.
- Независимый `/root/verify_home_parity`: 10/10 групп PASS по выполненному Node/React SSR и обработчикам; все тексты главной сайта сохранены в трёх темах, 29 существенных значений перенесены в Telegram, 4 архива доступны; 10 состояний эфира, предыдущий результат, применение results overlay в обоих потребителях, маршруты, внешние ссылки, Back/Close/Escape проверены. Все 17 JSON побайтово совпадают с базой. Его финальный общий suite 118/120 с теми же двумя исходными ошибками, Sites 6/6 PASS; изолированная исходная база 22/24 на затронутых старых тестах. Сырые свидетельства: `/workspace/scratch/5cff6a932f9d/qa-home-parity/independent-probe-results.json`, `independent-probe.log`, `independent-final-suite.log`, `independent-final-sites.log`, `independent-base-note-tests.log`; итоговый отчёт `independent-report.md`. Это SSR/fixtures, не браузер/реальные Telegram или backend.
- Release build PASS; 43/43 targeted tests PASS на объединённом source, включая fresh ETag, home/archive/routes/tournament и static routes. Actual CLI `tgcloud push dist/client` выполнил только static deployment revision3→4 за31.1s. Bundle `27dd20776d263b22335b9ba54add257e791737f97f95ecfd3ffb0f64b2ea435b`, 433 файла/30,067,451 байт. Авторский fresh GET /get подтверждает exact manifest и byte-identical3modules; serving config unchanged. Действующий URL `https://app8672463486.tgcloud.ai/tg`.
- Независимый `/root/verify_home_parity` fresh readback16:09:28–16:09:55UTC: revision4, весь433-file manifest exact,3modules и serving config сохранены;20/20public GET status/MIME/SHA-256/size PASS (9route URLs,11actual JS/CSS/logos). Это весь manifest плюс20downloaded responses, не загрузка всех433blobs. Отчёт/сырые свидетельства в `/workspace/scratch/5cff6a932f9d/qa-home-parity/release-independent-report.md`, `release-independent-readback.json`, `release-independent-readback.log`.
- Browser gate: прежний localhost CUA BLOCKED сохранён как история. Опубликованный Serverless /tg теперь фактически открыт в CUA/Chrome: React Mini App загружен, headline/факты/эфир/итоги/архив/партнёры/реквизиты отображаются. Wide1363×936, document width1348=clientWidth1348 (нет page overflow). Выполнены переход «Расписание матчей»→current matches, возврат домой, раскрытие «Все результаты»→четвёртый Dota Qual archive standings, возврат домой. Genuine Telegram initData/captain/Close, мобильная геометрия и динамический S3 этой проверкой не подтверждены.
- Выпуск содержания на существующий Serverless завершён; operation_status=SUCCEEDED, deployment/exposure=VERIFIED в статическом/browser scope. Меню бота,3cloud-модуля,backend/collector,Timeweb/S3 не изменены. Переключение default bot menu независимо выполнено в captain release выше; настоящая Telegram/мобильная приёмка и прежние captain/collector gates остаются отдельными. Откат статики: собрать прежний source и выполнить только conditional static push после fresh readback, в пределах разрешённого восстановления; полный push/force не использовать.

## Historical contract — captain-deploy-6, 09.10.2026

### Historical TASK_STATE — CORS readback, 09.10.2026 17:53 МСК

- Роман выбрал ручное изменение CORS вместо передачи Timeweb token или
  добавления server env; обработка TIMEWEB_CLOUD_TOKEN не создавалась.
  Screenshot17:47 показывает текущий bucket, точные new+old Origins,
  GET/HEAD, Allowed Headers*, Expose empty и MaxAge0. В17:49 «нажал»
  подтверждает выполнение Сохранить пользователем; ниже инструментальный readback.
- Независимый fresh six-GET readback14:50:04.599–14:50:18.228 UTC:
  CORS gate PASS — все3source-defined JSON URLs для new+old Origins
  возвращают exact соответствующий Access-Control-Allow-Origin и Vary:Origin.
  Все6ответов остаются403/XML. New-origin CORS blocker снят; обязательный
  dynamic object-read gate остаётся FAIL/unestablished, menu switch BLOCKED.
- Дополнительный узкий контроль14:53:39.635–14:53:48.002 UTC:3GET тех же
  объектов с oldOrigin и Referer=oldwebsite/ также403AccessDenied. Добавление
  этого Referer не меняет наблюдаемый отказ; причина403 не установлена.
- Read-only source review: autumn writer/client ключи совпадают; uploader
  не задаёт public-read ACL (CacheControl:public не предоставляет доступ).
  Первые объекты могут отсутствовать до подтверждённых серий; текущий worker
  не пишет spring MVP. Client treats404 separately,403 сохраняет fallback
  с unavailable status. Это не доказывает actual bucket policy/ACL/existence.
- Screenshot владельца17:55 показывает endpoint https://s3.twcstorage.ru,
  тот же bucket и регионru-1, совпадающие с кодом; Access/Secret Keys скрыты.
  Это connection card, не список объектов: наличие results JSON ещё UNKNOWN.
- Superseded requested dependency: владелец открывает папку results текущего bucket и
  показывает наличие `dota2-main-2026-mvp.json`, `dota2-autumn-2026.json`,
  `dota2-autumn-2026-mvp.json`. До установления причины не менять ACL/policy,
  не создавать placeholder results/second writer и не переключать URL.
  Новый CLI/Timeweb token для выполненной ручной CORS настройки не нужен.
  Remote modules/static revision2 и предыдущий default menu не изменялись
  этим read-only этапом; genuine captain/S3 CAS/retention gates прежние.

- Explicit authority: 16:53 МСК «Нет, я токен тебе дам, а ты уже действуешь»;
  CLI credential supplied16:56. Ранее разрешён выпуск кабинета и условный
  перенос URL с сохранением всего контента. Контракт API v3/contract-5,
  Tg-mcp, текущий bucket, один collector и отсутствие bot messages сохранены.
- Deployed input: source main `7180a1fe8b001bfc0f35dd0e4376be517c135cf7`,
  tree `f1bd9ffcf9647295aa7aeb74f83b03046cbbabcf`; target main
  `19f936bd39c95f7ee3ee30db7f5ff56814cc2cfb` unchanged. Root config correction
  остаётся действующей. Credentials находятся только в ignored CLI storage;
  токен не включён в git, сборку, документы или QA snapshots.
- Fresh live baseline13:58:01–13:58:11 UTC: captain1.0.0/source d604497…/
  fingerprint5a6af64f… enabled=true/configured=true/CAPTAIN_STARTED/idle,
  attempts22/error=null; lastSuccess13:58:00.049Z. Collector enabled=true/
  configured=true/YCS_STARTED/waiting, fingerprint309cbe… unchanged,
  pendingMaps0. Это runtime readback, не самостоятельный S3 CAS/retention test.
- Actual @tgcloud/cli0.2.0 authenticated fetch established app8672463486,
  revision0/modules empty/static null. Transient sdk.getMe verified numeric
  bot8672463486 and @YarCyberSeason_bot. Helper endpoint не публиковался.
- Targeted push only `endpoints/captain`, `lib/captain-relay`, `lib/config`:
  operation_status=SUCCEEDED, evidence_status=VERIFIED, revision0→1.
  Remote readback14:03:54.250Z and independent comparison14:04:49.199Z:
  exact3modules/sourcebytes; no unexpected handler/module; static unchanged.
- Static-only push `dist/client`: SUCCEEDED/VERIFIED, revision1→2, remote
  readback14:07:21.815Z. Actual URL https://app8672463486.tgcloud.ai/.
  All419 paths/hash/size match:28,400,846 bytes, canonical manifest SHA256
  `10b4aa151110593a4e6416a67bfd6d0f323b349fcaa73bd8bd5384a77c7444ba`;
  platform hash `98344ebbebef9a178a2eab01959b95a4af517f262023fac5a5167338e0f629e8`.
  SPA=true, Referrer-Policy=no-referrer; all3modules unchanged. Static gate PASS.
- Independent new-host23GETs14:09:50–14:10:32 UTC: current tournament and
  four archives, representative linked team/roster pages, home/next, /org,
  /orgs, /tg routes and criticalJS/CSS/images all200/exactbytes/MIME correct.
  Root browser `/tg/tournament?section=captain` loads autumn16-team Mini App
  and captain anonymous entry requirement; no private content shown. This
  proves public loading, not a genuine signed Telegram/captain workflow.
- Runtime negative check on exact canonical module bytes through actual cloud
  sdk.fetch rejects forged initData with unauthorized. Public backend empty
  identity returns401/no-store. No accepted application/S3 mutation performed.
- Historical pre-save CAP-HOST-CONTENT-1 dynamic gate FAIL/BLOCKED: six S3GETs
  14:09:08–14:09:32 UTC cover spring MVP, autumn results and autumn MVP with
  old and new Origins. All403AccessDenied; old responses allow existing
  origin, all new-origin responses lack Access-Control-Allow-Origin. Cause
  of403/unavailable readable404 is unverified; do not infer data loss or
  that the old browser behaves identically. Bundled fallback is not proof
  that dynamic updates work. Static/module PASS does not close this gate.
- Default getChatMenuButton still reads text Miniapp and original website
  `https://xn--90aiaibl0ahlel5n.xn--p1ai/tg`. No menu/Main Mini App URL,
  webhook, schema, Timeweb env or S3 configuration was changed by this turn.
  Telegram CLI credential grants no Timeweb/S3 settings access; no callable
  bucket-settings tool is available and Timeweb browser is unavailable.
- Completed user action: existing bucket→Настройки→CORS→Изменить, add Origin
  `https://app8672463486.tgcloud.ai` without path/trailing slash, preserving
  current origins/methods/headers. CORS readback PASS above; object-read
  verification still required before default-menu URL switch to new-host /tg.
  Do not invent match windows or change public object policy/ACL to bypass403.
- Still unverified: genuine signed Telegram entry, assignment/chat/two-captain
  consent on production, real S3 CAS/write, versions/backups/Object Lock
  retention. Root owns state; separate QA independently verified the exact
  deployment and dynamic-origin blocker. Earlier disabled/no-CLI/undeployed
  observations below are historical and superseded by this fresh readback.

- Выпуск кабинета, 15:10 МСК: «Теперь давай кабинет капитана выложим также».
  Разрешена публикация ранее согласованного captain-cabinet-5/API v3 на
  существующей инфраструктуре: backend Tg-mcp рядом с уже включённым
  сборщиком; frontend и Serverless endpoint по принятому контракту. Условие
  прежнего размещения выполнено: collector activation VERIFIED. Нового app,
  bucket, второго writer, уведомлений или изменения правил доступа нет.
  Telegram Serverless сохраняется; переход на direct browser transport не
  выбран. Переключение Main Mini App допускается по разрешению 09:33 только
  после CAP-HOST-CONTENT-1. Согласованный дизайн и вся переписка до официального
  завершения с последующим удалением сохраняются.
  Inputs: source cabinet `d604497fe5cbdc9be19b18eef7e5c41a92a4b5f1`;
  свежие remote main Tg-mcp `825e2f3f3fc122864d5c2f6159205843475a04a0`
  (tree `177a07f50a1166b595688c62110f170b972290db`) и yarcyberseason
  `726e6b73d517319679bff3d7947033546b3952c6`
  (tree `fdcefd3caefd2eff355c5f6eea4ef9a7dcf08fa0`), изменений после них нет.
  Stage implementation SUCCEEDED: отдельный awaitable API hook на текущем
  listener, один captain service для API/organizer/cleanup, fail closed
  `YCS_CAPTAIN_ENABLED` default false, без запуска source backend/server.
  Source wiring — известный публичный Tg-mcp URL для /org и Serverless relay.
  Независимая проверка 29/29 PASS без skips: service/assets 16, реальный
  compiled runtime/HTTP/lifecycle 10, frontend/relay wiring 3. Author check,
  build и regression PASS. Target main опубликован:
  `19f936bd39c95f7ee3ee30db7f5ff56814cc2cfb`, tree
  `df78e1e9d4ffe9b1183272c69869019f715cd6a8`; PR45 и existing CI run
  `37929977671`/job `113818027720` SUCCESS во всех stages. Source main:
  `706856e1c903f1274a1d93c017a7b848383393ec`, tree
  `d3136f46a623fcddd5ee3033ea42cc1be1f31ecf`. Guarded nonforce publication
  VERIFIED; env, S3, BotFather и cloud Serverless не менялись.
  Независимый live readback 12:32:46–12:33:08 UTC: /healthz и оба status
  endpoint HTTP200/no-store. Captain version1.0.0/source d604497…/fingerprint
  `5a6af64ff8fab7e1c92452b1e2fac28cc2da883ff6957b770bdbdfdbeaf407e1`,
  CAPTAIN_DISABLED, enabled=false/configured=false/attempts0. Disabled status
  не доказывает отсутствие секретов. Collector enabled=true/configured=true,
  YCS_STARTED/waiting, прежний fingerprint309cbe…, pendingMaps0. Backend
  deployment VERIFIED; frontend deployment readback ещё OPEN.
  Actual CLI @tgcloud/cli0.2.0 выявил ошибку static.source=../dist/client в
  serverless/tgcloud.json. Correction local3021138a401dbce619c3d091bbb9d726d3c2a800
  переносит config и три byte-identical JS в root tgcloud/, static.source
  теперь dist/client. Offline CLI status exit0 без validation error; bot
  unlinked. Author build/tests PASS, 419 web files byte-identical при одном
  buildGeneratedAt. Correction gate PASS на final local
  `536ac8e73376477fd1409e2714cc05810b8ee737`: независимые три wiring cases
  повторно 3/3 PASS/0skip; actualCLI0.2 rootstatus exit0, три модуля и
  419 staticfiles обнаружены, network/write/credential-read/subprocess
  attempts0. Прежние 26 backend/service cases остаются применимы по
  независимому bytehash readback, не перезапускались и заново не засчитывались.
  Correction source main `f077e3542872441ed73ba4d579d5a38f0e9d2e59`, exact tree
  `72c04fc68010865f4812ab980b1ef1bbb64dfe4c` = accepted QA candidate;
  guarded nonforce от706856e и readback VERIFIED, target19f936bd… прежний.
  Root public browser smoke: /org/ новая страница «Матчи и капитаны» с
  login shell; /tg/tournament?section=captain показывает кабинет и требование
  Telegram-входа без приватных данных; действующий сайт/архив доступен. Это
  public anonymous UI, не real Telegram/капитан/чат/timepicker gate. HTTP
  readback /org,/orgs,/tg 200; публичные logo/assets побайтово сохранены.
  Timeweb /my/apps в cloudbrowser показывает Site Unavailable после одного
  reload; настройки server env недоступны. CLI token/project link отсутствует.
  Operation: code publication SUCCEEDED/VERIFIED, backend deployment
  VERIFIED disabled, public frontend smoke PASS. Activation BLOCKED на
  конкретных входах ниже; endpoint не публиковался, Main Mini App не менялся.
  Activation gates OPEN: numeric bot id, AES key, organizer credentials,
  Serverless CLI/project access, реальные S3 CAS/write и политика
  versions/backups/Object Lock. Окна игр не выдумывать: без подтверждённого
  окна согласование недоступно, чтение/чат/cleanup от него не зависят.
  Timeweb env channel assistant по-прежнему недоступен; настройки collector
  применил Роман. Deployment disabled допускает размещение кода, но не
  завершает activation/Telegram gate. Root владеет этим состоянием; backend,
  wiring, QA и DevOps имеют раздельные области.

- Перенос сборщика, 13:57 МСК: «давай сборщик перенесем на tg-mcp».
  Явно разрешён перенос опубликованного OpenDota results/MVP collector в
  существующий Timeweb backend Tg-mcp; прежний запрет переноса заменён
  только в этой области. Текущий S3 и остальные функции backend сохраняются,
  writer один. Кабинет капитана и переключение URL Mini App не входят в эту
  новую операцию. Source main Tg-mcp свежо проверен DevOps:
  `a1631103c2a169bdf87ee4eb84e76df7c5beef15`; изолированная реализация
  `../tg-mcp-collector`, branch `codex/ycs-dota-collector`.
  Target подготовлен: local `4583d7410e0e1e68ad563a50d9f60130e1fefe89`,
  tree `177a07f50a1166b595688c62110f170b972290db`, 23 файла. Исходные 8
  modules/data побайтово равны опубликованному `32e4f2e`; payload fingerprint
  `309cbe517263e6dae843cc90bd7796b2efcf8dadbd98cda0e0971aa01c070454`.
  Developer check/build и 54 tests PASS. Независимый gate 25/25 PASS:
  source guard 3, target importer/timer 8, lifecycle 13 и actual compiled
  child/pg failure/HTTP 1. Root дополнительно запустил compiled main:
  `/healthz` и `/healthz/ycs-dota` PASS, ожидаемый fingerprint, SIGTERM exit0.
  Source guard local `77aef78dbbf4ec8760e41385e3fbb0eda9e3d206`, tree
  `fdcefd3caefd2eff355c5f6eea4ef9a7dcf08fa0`: прежний worker только opt-in,
  4 файла, author 6/6 и независимые 3/3 PASS; frontend/data не менялись.
  Передано DevOps/Release: target branch/draft PR → существующий CI →
  guarded main той же версии → source guard main; без force/new app/workflow.
  До публикации release stage был IN_PROGRESS; runtime activation BLOCKED:
  канал настройки env Timeweb не найден, локально Timeweb token и AWS keys
  absent. Target был выключен до explicit flag=true и server keys. Перед публикацией
  live `/healthz` 200 JSON, `/healthz/ycs-dota` 503 HTML: новую версию не
  подтверждает. Следующий readback — remote main/tree/CI и exact live status.
  DevOps опубликовал target candidate remote
  `825e2f3f3fc122864d5c2f6159205843475a04a0`, тот же tree `177a07f…`;
  draft PR https://github.com/rtalyutin/Tg-mcp/pull/44, existing CI run
  https://github.com/rtalyutin/Tg-mcp/actions/runs/37922787134.
  CI исполняет PR merge tree, побайтово равный принятому target tree;
  Все stages CI run `37922787134`/job `113794481752` завершены SUCCESS,
  включая check/check:workspace/build/root tests/workspace/UI tests.
  Tg-mcp main штатно fast-forward обновлён на `825e2f3f…`; DevOps readback
  exact main SHA, tree `177a07f…` и документации PASS. Source guard также
  опубликован: yarcyberseason main
  `726e6b73d517319679bff3d7947033546b3952c6`, точный tree
  `fdcefd3caefd2eff355c5f6eea4ef9a7dcf08fa0`. DevOps прочитал worker exact
  bytes, scope ровно 4 согласованных файла. Оба main update без force с
  expected SHA; PR44 автоматически marked merged. Source publication
  SUCCEEDED/VERIFIED; Timeweb/env не менялись. Runtime activation не следует
  из CI/main publication.
  Старый source guard также объединён в локальную ветку кабинета, merge
  `a0e6cbd`; сохранены её актуальные договорённости, устранён только конфликт
  AGENTS. Совмещённые captain/Telegram/organizer/runtime тесты **144/144 PASS**.
  Код кабинета не публиковался; source guard не включает его в source main.
  Root первый live readback после main publication: `/healthz` 200 JSON,
  `/healthz/ycs-dota` 503 HTML. Последующий readback уже подтвердил
  `/healthz/ycs-dota` **200 JSON**, version `1.0.0`, exact source `32e4f2e…`
  и payload fingerprint `309cbe517263e6dae843cc90bd7796b2efcf8dadbd98cda0e0971aa01c070454`.
  Live module deployment VERIFIED; `enabled=false`, `configured=false`,
  `code=YCS_DISABLED`, `status=disabled`, timestamps null/pendingMaps0.
  Прежний вывод о неподтверждённом деплое заменён этим свежим readback.
  Frontend `/tg` остаётся 200 HTML, 15338 bytes, SHA-256
  `83f1559d8634d51a6104e1dde7e848f4fe399d7b723bccfaa933619742767366`.
  Активация VERIFIED после «готово» Романа в 14:42 МСК: root и независимый
  QA заново получили `/healthz/ycs-dota` **200 JSON** с ожидаемыми version,
  sourceRevision и payload fingerprint; `enabled=true`, `configured=true`,
  `code=YCS_STARTED`, `status=waiting`, обе timestamps null, pendingMaps0.
  Независимые live GET 09.10.2026 11:43:46–11:43:57 UTC; `/healthz` также
  **200**, `{"status":"ok"}`, оба ответа no-store. Сборщик включён на
  существующем Timeweb Tg-mcp. До первого опубликованного матча сегодня
  в 20:30 МСК ожидание штатно: попыток импорта пока нет. Настройки применены
  Романом; assistant не менял live env и не получал секреты.
  Прежний activation BLOCKED заменён свежим подтверждением запуска.
  `configured=true` подтверждает наличие требуемых настроек, но не права
  ключей на S3. Полная цепочка OpenDota → запись S3 → readback → клиенты
  остаётся UNVERIFIED до первого реального результата. Проверка активации
  завершена; повторной авторизации переноса не требуется. Кабинет капитана
  и переключение URL Mini App в этой операции не публиковались.

- Исторический поиск, 12:26 МСК: Роман просит найти в чатах место записи
  API-сборщика матчей; дополнительная интеграция Tg-mcp не подтверждена.
  Поиск Personal Context дважды вернул ошибку поиска разговоров. Прочитано
  целиком сохранённое ТЗ 0.2 от 30.09,
  `libfile_7e956158125c8191aca50f3d7e193501`: код в yarcyberseason, данные S3.
  Git provenance VERIFIED: 30.09 11:25 МСК `e49d558` добавил
  `scripts/dota-results-import.mjs` и `.github/workflows/dota-results.yml`;
  13:20 `5b931a5` удалил workflow и добавил application worker;
  16:42 `088afb3` выделил backend/. 03.10 09:04 `4f06f08` расширил MVP.
  DevOps дочитал shallow history; root независимо прочитал commits/workflow
  и проверил ancestry всех четырёх commits к базе `32e4f2e`.
  Код в базе: `backend/dota-results-import.mjs`,
  `backend/dota-results-worker.mjs`, `backend/server.mjs`,
  `backend/dota-mvp-import.mjs`; GitHub workflow уже отсутствует.
  Именно исторический workflow содержит scheduled запуск API-сборщика;
  это yarcyberseason, не текущий Telegram publisher в Tg-mcp.
  В commit `5b931a5` фактическая активация Timeweb/S3 оставлена unverified.
  Историческое место кода установлено; фактическое размещение и запуск
  остаются UNKNOWN. Полные старые чаты недоступны через использованный поиск.
  Код, конфигурация и runtime не менялись; разрешение на предложенную
  дополнительную интеграцию не получено. Других приложений/логов не запрашивать.
- Поправка проверки, 12:18 МСК: «Других нет. Сборщик же не работает.
  Он по расписанию. Посмотри репу tg mcp». По сообщению Романа список
  Timeweb-приложений ограничен YCS2 и YCS-back для tg; повторный запрос
  другого приложения/тех же логов снят. CAP-BACKEND-COLLECTOR-2 заменяет
  проверку только по stdout: отсутствие строки запуска не исключает
  scheduled collector. Проверять актуальные расписания, команды и ветки.
- Readback CAP-BACKEND-COLLECTOR-2 — VERIFIED для исследованного кода:
  DevOps заново получил Tg-mcp main
  `a1631103c2a169bdf87ee4eb84e76df7c5beef15` и 45 remote branch tips.
  Root и QA независимо сверили исходники и все tips. Единственный cron
  workflow — `.github/workflows/telegram-worker.yml`,
  `2-59/5 * * * *` → `node scripts/telegram-worker.ts` → очередь
  `/internal/telegram/*` → `send`/`sendPhoto`, публикация в Telegram.
  В старых tips cron `*/5`; назначение то же. OpenDota/dota-results/STRATZ
  и матчевого S3 writer в проверенных tips нет; Dota упомянута в портфолио.
  Standalone workspace имеет общие DB-defined schedules, но встроенный
  host-gateway задаёт `worker_ready:false`; это не подтверждает YCS collector.
  Отдельный внешний cron и runtime-БД не проверены. Матчевый timer находится
  в `yarcyberseason/backend/dota-results-worker.mjs`: сериализованный poll
  каждые 5 минут в опубликованном периоде. Его установка в Tg-mcp не найдена.
  Gate условного размещения остаётся BLOCKED; готовность кабинета и его
  локальные проверки не изменились. Next: согласовать дополнительную
  интеграцию готового YCS collector/API в существующий backend либо получить
  свидетельство иного действующего scheduled запуска. Ничего не запускалось,
  внешние настройки и удалённые репозитории не менялись.
- Условие размещения, 10:01 МСК: «Да, если там же стоит сборщик данных
  матча якс». Интеграция в показанный Tg-mcp разрешена только после проверки,
  что там уже установлен сборщик матчей ЯКС. Telegram-message collector и
  `/healthz` не доказывают это условие. CAP-BACKEND-COLLECTOR-1:
  установить место и фактический runtime Dota/OpenDota/MVP collector до
  зависимых изменений; второй writer или перенос сборщика не разрешены.
  Проверка read-only IN_PROGRESS; интеграция и выпуск NOT_STARTED.
- Readback CAP-BACKEND-COLLECTOR-1: DevOps получил чистый snapshot Tg-mcp
  `a1631103c2a169bdf87ee4eb84e76df7c5beef15`; root независимо прочитал
  production entry, runtime и документацию collector. Подтверждён сбор
  Telegram Business сообщений для итогов дня, не Dota/OpenDota матчей.
  В проверенных исходниках Tg-mcp матчевый worker/прокси не найден; состав
  фактических процессов Timeweb этим не доказан, `/healthz` сообщает только
  `{"status":"ok"}`. Код матчевого сборщика находится в yarcyberseason:
  `backend/server.mjs` → `startResultsWorker`; подготовленный кабинет уже
  подключён к этому же серверу. Размещение collector runtime остаётся UNKNOWN,
  gate условной интеграции Tg-mcp BLOCKED. Прежний Next (STALE после
  поправки 12:18): название/URL
  действующего приложения ЯКС с репозиторием yarcyberseason и Dockerfile,
  либо принадлежащая приложению 4776 строка лога YCS results backend.
  Секреты не нужны. Установка/перенос writer и интеграция Tg-mcp не выполнялись.
- Подключение, 09:33 МСК: Роман разрешил перенос URL Mini App на Telegram
  Serverless при условии «контент будет также доступен, как сейчас».
  Критерий CAP-HOST-CONTENT-1: сохранить текущие турниры, архивы, составы,
  результаты, ресурсы и динамические обновления; до переключения URL проверить
  их на новом host. Это условие действует до явной поправки Романа.
  Скрин выбранного YCSbot показывает включённый Serverless (VERIFIED по
  пользовательскому наблюдению); endpoint, числовой bot id и новый host ещё не
  проверены. Скрин Timeweb показывает Tg-mcp, домен
  `rtalyutin-tg-mcp-4776.twc1.net`; связь с backend `/org` не установлена.
  Секреты и доступ к Serverless-проекту не передавались. Переключение URL и
  внешняя публикация NOT_STARTED. Next: read-only сверка backend и доступности
  контента, затем подключение штатного CLI без передачи секретов в чат.
- Read-only проверка подключения после скринов, 09.10.2026: публичный сайт
  `/api/orgs/matches` возвращает HTTP 200 `text/html` (главная), не API. В live
  frontend API base пустой. У показанного Tg-mcp `/healthz` даёт 200 JSON,
  `/api/orgs/matches` — 503 JSON. Эти ответы независимо воспроизведены root;
  DevOps проверил production entry point репозитория Tg-mcp: подготовленный
  YCS API в него не подключён. Настройка одного URL этого не исправит.
  Прежний Next (STALE после поправки 12:18): подтвердить дополнительную интеграцию сервиса ЯКС в
  показанный Tg-mcp либо дать URL иного уже действующего results backend.
  Новое приложение/ресурсы не выбраны, интеграция другого репозитория и
  внешние конфигурационные изменения NOT_STARTED.
- Локальная подготовка CAP-HOST-CONTENT-1: связанная сборка содержит 5 турниров,
  128 матчей, 41 состав/217 записей игроков; аудит разрешил 29 logo-ссылок и
  8 ресурсов Mini App CSS в реальные файлы. Убрано широкое immutable-правило
  `/assets/*` из `serverless/tgcloud.json`, чтобы unhashed картинки/шрифты не
  сохранялись устаревшими после обновлений. Авторские client/relay checks
  17/17 PASS, build PASS; root независимо проверил точный однострочный diff,
  JSON, прежние static source/SPA. Код сервиса contract-5 не менялся.
  Реальный новый host и равенство локального кандидата текущей публикации
  ещё не проверены. Для переключения нужны `/tg`, рабочий endpoint, CORS S3
  на exact новый origin и публикация будущих статических изменений также в
  Telegram; «На сайт» сейчас ведёт на root нового origin. Эти gates открыты.
- ТЗ: редакция 1.7, Library version 7, stable ID
  `libfile_aa4c990dcf4481918642cf77470dc625`; актуальные уточнения Романа:
  реестр капитанов на `/org`, чат внутри Mini App, таймпикер МСК и кнопка
  «Время согласовано», S3 и просмотр на `/org`, без сообщений ботом.
- Коррекция `CAP-STORAGE-2`, 09.10.2026: «2. Нет, используемый текущий» и
  «Саму переписку хранить не надо». Текущий S3 используется для реестра,
  согласований и заявок. Исходное «не хранить переписку» уточнено ниже:
  хранить её до официального завершения матча, затем удалять.
  Предложенный ассистентом RAM-буфер на 30 минут отменён следующей поправкой;
  старую отправку нельзя повторить в новой комнате автоматически. Критерий
  действует до явного изменения Романом; меняет storage/service/API/клиент,
  ТЗ и их тесты, сохраняет дизайн, время, `/org` и запрет сообщений ботом.
- Коррекция `CAP-DELIVERY-3`, 09.10.2026, 03:13 МСК: «люди заходят раз в
  неделю бывает». Сообщения должны дождаться офлайн-получателя. Модель
  30-минутного RAM-буфера и зависящие части ТЗ редакции 1.6/API/code/QA —
  **STALE** для этого сценария. Постоянный архив по-прежнему не нужен.
- Коррекция `CAP-RETENTION-5`, 09.10.2026, 08:19 МСК: после согласия «Давай»
  Роман сразу уточнил: «Вернее. После окончания матча удаляем». Вся переписка
  сохраняется зашифрованной в текущем S3 до официального завершения. Прочтение,
  неделя отсутствия, перезапуск или смена капитана не удаляют сообщения.
  Новый назначенный капитан получает разговор своей команды, прежний теряет
  доступ. После завершения сервис очищает переписку и её служебные следы без
  открытых клиентов; подтверждённое время, назначения и заявки сохраняются.
  Удаление после прочтения и RAM-лимит отменены. Регрессионные критерии:
  недельная доставка/restart; чтение без удаления; claim не закрывает чат;
  фоновое удаление после official result; late retry не восстанавливает чат.
  Действуют до следующей явной поправки Романа. Отказ от архива сохранён.
- Прикладной/API контракт: [captain-cabinet.md](captain-cabinet.md).
- Авторский ход: договориться и зафиксировать время под перепиской в одной
  карточке матча; прежний Rift/Russian и обе Mini App страницы сохраняются.
- TASK_STATE: локальная реализация подготовлена в ветке
  `codex/captain-cabinet-service`, база `32e4f2e10b37f518dde99f3dd54d83abbafd8194`.
  Публикация, изменение BotFather и production S3 не выполнялись.
- Предыдущее evidence для captain-cabinet-1 (commit `d790ab1`); затронутые
  storage/chat/API проверки и сборка **STALE** до новой проверки:
  `node --test
  tests/captain*.test.mjs tests/telegram*.test.mjs tests/organizer*.test.mjs
  tests/dota-results-runtime.test.mjs` — **126/126 PASS**; production build PASS
  (4668 modules, 52 команды, 128 матчей). Два прежних предупреждения Nimbus OTF.
  `npm run test:sites` после сборки — **6/6 PASS**; `git diff --check` PASS.
- Независимые локальные проверки прежнего сервиса — **8/8 PASS**, включая подмену
  Telegram identity, чужой матч, отзыв доступа, CAS-конкуренцию и потерянный
  ответ. Отчёт и точный fingerprint: [captain-verification.md](captain-verification.md).
- Браузерный gate BLOCKED: Chromium отсутствует, download не дал архив;
  Cloud Browser не видит локальный сервер (`ERR_CONNECTION_REFUSED`). Сценарий
  двух капитанов/организатора сохранён в `scripts/manual/captain-browser-probes.mjs`,
  но его клики и скриншоты не выдаются за выполненную проверку. Реальные
  Telegram WebView/Serverless и S3/CAS/ACL остаются непроверенными.
- Локальный кандидат correction-2: 137/137 объединённых тестов и production
  build PASS, но это evidence прежнего 30-минутного контракта; недельную доставку
  он не подтверждает. Этот кандидат не публиковался.
- Текущий кандидат contract-5 реализован: schema3 с шифрованной перепиской
  до официального завершения, sticky chatClosed, фоновая очистка на старте
  и каждые 60 секунд, UI закрывает отправку и снимает поздние повторы.
  Прочтение не удаляет сообщения. Удаление не зависит от настройки окон игр.
  Совмещённый suite **143/143 PASS** (`captain*`, `telegram*`, `organizer*`,
  `dota-results-runtime`); production build PASS (4668 modules, 52 команды,
  128 матчей, 192 канонических URL и 3 aliases). Браузерный gate остаётся BLOCKED.
  Независимые сценарии **17/17 PASS**: неделя/restart, 101 сообщение без потери,
  чтение/заявка без удаления, CAS очистки, поздний retry, фоновая работа и stop.
  Fingerprint `82e1bf5d98eb401f9e7cbade64b2172dff861317bee43dc1c8735216efa229ac`;
  подробности: [captain-verification.md](captain-verification.md). Diff-check PASS.
- Локальная реализация contract-5 проверена; выпуск требует описанных ниже
  реальных входов/проверок и отдельного разрешения. В этой среде не настроены
  AWS credentials, bot id и encryption key, поэтому реальный S3 не проверялся.
  Next: подготовка выпуска после подключения этих входов и выбора Serverless host.
  Внешние операции `NOT_STARTED`; текущий S3 и прочие принятые функции сохраняются.
- Полнота будущего выпуска зависит от Serverless у выбранного бота, решения
  по его host, encryption key для текущего S3, серверных write-прав/CAS,
  политики versions/backups/Object Lock, работающей фоновой очистки и
  подтверждённых окон матчей. Ни один
  прежний выпуск ниже не разрешает автоматически публикацию этого изменения.
  Разрешение 09:33 выше отдельно снимает запрет на перенос URL Mini App при
  выполнении CAP-HOST-CONTENT-1; прежние локальные проверки не подтверждают
  доступность контента на новом host.

Предыдущие состояния ниже сохранены как история независимых функций.

## ACTIVE_CONTRACT — archive-release-1, 19.09.2026

- Поручение Романа: «Сначала добавь отображение прошедших турниров и выложи изменения». Разрешены реализация и выпуск на существующем домене /tg, включая готовые Swiss/Playoffs/Results. BotFather, формы, сторонние сообщения и отдельный Sites не входят в scope.
- Авторитетное ТЗ обновлено дополнением §14 (версия файла 3), stable ID libfile_aa4c990dcf4481918642cf77470dc625. Новая область заменяет прежний запрет архивов; два пути, текущий Dota по умолчанию, Разлом/русский и основной сайт сохраняются.
- Замысел Metamorph: нейтральные карточки прошедших турниров ниже принятого главного блока; те же типографика, панели и cyan действия. Нет отдельной игровой сцены для архивов.
- Приёмка: каталог4; независимые данные каждого турнира; URL/history/reload; таблицы и исторические матчи; partial Main; неизвестный год Qual; реальные CS2 итоги.

## TASK_STATE — публикация архива

- Код local7577f8e432dc17871fac0433f31b79ab4289486b; remote8b9999a92fa7c42dc59d074f9dc195b34dba9faa; одинаковый tree51f03fbf6ab2450a7e9fdb75c335de4a1b3e13f1. Ветка codex/telegram-step6-sections.
- Сборка PASS; полный suite155/155 до последней точечной поправки подписи; после неё5/5 archive tests и повторная production build PASS. JSON validator:50команд,120матчей. Сами данные не изменялись.
- Найденное независимым QA несоответствие счётчика исправлено: архив показывает «Записей команд», с пояснением неполноты, без выдачи количества registry ID за размер турнира.
- Browser localhost: ERR_BLOCKED_BY_CLIENT. После публикации Chrome на действующем домене подтвердил сценарии ниже. Настоящие Telegram Android/iOS/Desktop, mobile viewport и полная клавиатурная приёмка не проверены; полный MVP gate ими не закрыт.
- План операции: сверить origin/main=e12ed8d4786dee71df9eaae24f2aa8131a9de789, неизменный candidate tree, независимый verdict; GitHub update_ref(main,force=false), readback; дождаться автоматической публикации; сравнить dist bytes и проверить home→archive→sections→back. Охват: весь существующий домен, без flags/миграций.
- Независимый verifier:9/9 групп PASS на окончательном коде; отчёт [independent-archive.md](independent-archive.md).
- Main обновлён штатно на8b9999a92fa7c42dc59d074f9dc195b34dba9faa; git ls-remote подтвердил commit. После автоматического обновления домена deployment/exposure=SUCCEEDED, operation_status=SUCCEEDED. Следующий плановый шаг после архива остаётся новый6/16: Rich Card. Перенесённые14–16 остаются в конце; этот выпуск не закрывает полный MVP и не даёт разрешение публиковать следующие шаги.

## Проверка опубликованной версии — 19.09.2026

- Авторизация: текущий запрос Романа; штатный GitHub update_ref(main, force=false) вернул success, readback подтвердил8b9999a… . До обновления домен отдавал прежний HTML; затем /tg и все перечисленные ниже файлы дали HTTP200 и побайтово совпали с final dist. Это доказывает новую исполняемую сборку, а не только новый main.
- Production Chrome: четыре карточки на home; CS2 Aug открывается на results с KEGA/bobr1ki/SAITEN и финалом2:3 в исходном порядке; раскрытие показывает отсутствие опубликованного счёта карт. Переход в «Матчи» и reload сохраняют tournament=cs2-august-2026&section=matches.
- Dota Main открывается на4 таблицах; «Плей-офф» сохраняет slug и показывает исходное предупреждение о неполной сетке. February CS2:3 таблицы, раздел «Итоги» отсутствует. Qual: дата «Декабрь · год в карточках не указан», нет «Плей-офф», исходные−6очков сохранены. Кнопка «На главную» возвращает /tg; основной турнир открывает Dota VER.2 с16командами.
- Осмотрены viewport screenshots home и Main playoff; desktop1363px, home scrollWidth1348px — горизонтального выхода страницы нет. Full-page screenshot и CUA-scroll дали timeout среды; обычный viewport screenshot и semantic clicks сработали. Mobile/настоящий Telegram не проверены.
- В выборке8 console errors только chrome-extension metadata сообщения; ошибок приложения в этой выборке нет. Не утверждается полный сбор всех console logs.
- `evidence_status=VERIFIED`, `gate_verdict=PASS` для конкретного release/desktop smoke и локальных проверок. Полная QA15/MVP не закрыты. `action_decision=CONTINUE` к Rich Card; `hypothesis_assessment=NOT_ASSESSED`.
- Сохранены ТЗ§14 (file version3) и уточнение текущей автоматизации; расписание/включение не изменялись. JSON, site source, worker, hosting, BotFather и внешняя форма не менялись.
- Восстановление при необходимости: прежний main e12ed8d4786dee71df9eaae24f2aa8131a9de789; создать согласованный обычный revert/новый commit, без force, и проверить обслуживаемые файлы тем же способом. Данные/миграции отсутствуют, откат не выполнялся. Это разовый smoke, фоновый мониторинг не создавался.

| Ресурс | SHA-256 проверенного live файла |
| --- | --- |
| /tg | `1e2bc55c8ad565aef85b6bab978bdbe06339b18cc2b58524767ff94309714897` |
| /assets/index-YPzns1vO.js | `b9d09bcbb0d2a907020f3aabeb41b8dda3b38d522275300c6be0e4285b2e3267` |
| /assets/community-XGWnkf1W.js | `ed733748246a97c0b78db09221158e7734ac3171e9b671313f645f506a044037` |
| /assets/entry-CJ1fNVx-.css | `b1bed76c2c44aa08e5fe790088deeaefbf6aaaa156a307c82e36432390923488` |
| /assets/entry-CeQi7L3E.js | `93331922d2a793d12188f6f7328f373cd754a8127ab4027eec4862594ccce54e` |

## История — перестановка плана

### Предыдущее состояние

### Исторический ACTIVE_CONTRACT

- Ревизия `plan-reorder-1`, 19.09.2026: «Перенеси шаги 6-8 в конец». Только перестановка плана и синхронизация ТЗ/ежедневной задачи/текущего журнала; реализация нового шага и публикация не выполняются.
- Порядок в прежних номерах: **1–5 → 9–16 → 6–8**. Новая нумерация: прежние 9–16 = новые 6–13; прежние 6–8 = новые 14–16. Исторические commit, отчёты и их номера сохраняются.
- Сохраняются выполненные разделы, два базовых маршрута, выбранный турнир, Разлом/ru, JSON, критерии QA и границы разрешений. Перенос не означает успешную проверку либо разрешение на публикацию/отправки.

### Исторический TASK_STATE

- План §13 ТЗ обновлён до дополнения 1.3; canonical Library ID `libfile_aa4c990dcf4481918642cf77470dc625`. Исполнение продолжается по **новому шагу 6/16 (прежнему 9): прототип карточки матча и проверка совместимости**. До зависимой отправки нужны разрешённый тестовый чат и соответствующая серверная среда; эти параметры не выбраны этой правкой.
- Новые 14–16 отложены до завершения 13. Из нового 14 уже выполнены Формат, Расписание, Матчи, Swiss, Плей-офф и Итоги. Обновление версии/manifest остаётся отложенным, не реализованным. Новые 15/16 — итоговая независимая приёмка и разрешённый выпуск базового MVP; они не закрыты.
- Последний application code GitHub `9a8b796ac89722619cbc307cf894f660fd95b804`, tree `1d685c2eeed06f397a782877d394b518a8f2cbb4`; сохранённые отчёты `7bbc1ababcc3c40825e39ef75845328b69a30049`. Для этого кода build и 150/150 тестов PASS, независимые 8/8 для Итогов PASS. Browser/реальные Telegram-клиенты остаются непроверенными в отмеченном объёме.
- Canonical branch `codex/telegram-step6-sections`; main на сверке `e12ed8d4786dee71df9eaae24f2aa8131a9de789`. Этот запуск меняет документацию и порядок существующей ежедневной задачи, не приложение/main/бота и не расписание.
- Старое условие «завершить базовый шаг 8 до карточки» отменено явным решением пользователя. Проверки и разрешения каждого конкретного нового включения сохраняются; старые незавершённые этапы не отмечать PASS. Следующий запуск сверяет актуальные ТЗ, ветку и более поздние решения.

## История — Итоги, прежний шаг 6, 19.09.2026

### ACTIVE_CONTRACT прежнего среза

- Ревизия `implementation-8`, 19.09.2026: «реализуй» после предложения следующего пункта «Итоги». Scope — только раздел результатов внутри выбранного турнира шага 6/16.
- Сохранить два маршрута, явный `dota2-autumn-2026`, Разлом/ru, сделанные разделы, JSON и существующий хостинг. Итоги появляются только при валидном объекте результатов, без выдуманных мест, победителей, карт и призовых.
- Реализация, тесты, независимая проверка и сохранение в рабочей ветке разрешены. Новая публикация, изменение бота и внешних сервисов не разрешены.
- Визуальная основа — существующие токены/отступы/типографика; опубликованные места читаются по номеру, карточка финала переиспользует MatchRow. Самостоятельный редизайн не входит в scope.

### TASK_STATE прежнего среза

- `EXECUTE`, `primary_trace=Handoff`, `feature_id=telegram-miniapp-step6-results`, `handoff_schema=FEATURE_HANDOFF/1`.
- Шаг 6/16 IN_PROGRESS. База `d42d0c1dc46193eb181d0604e871137aaabee26a`; canonical branch `codex/telegram-step6-sections`; local `codex/telegram-step6-results`. Main `e12ed8d4786dee71df9eaae24f2aa8131a9de789`.
- Применимые требования ТЗ восстановлены из `/tmp/ycs-miniapp-tz-current.md`, ранее прочитанного актуального Library ID; ASSISTANT-SELF-LINE полностью прочитан в предыдущей части диалога. Данные текущего турнира не содержат results.
- Реализация завершена. Code local `7e6c8a8d6eb52f9bd2bdb700102734f0c6682a3e`, GitHub `9a8b796ac89722619cbc307cf894f660fd95b804`, общий tree `1d685c2eeed06f397a782877d394b518a8f2cbb4`. Сохранение сверено через git fetch и полный diff. [Отчёт реализации](step6-results.md).
- Build PASS; проектные тесты **150/150 PASS**, новые сценарии **8/8 PASS**. Независимый `/root/verify_results` подготовил сценарии до чтения candidate, затем выполнил **8/8 групп PASS** и общую регрессию **150/150 PASS**. [Независимый отчёт](independent-step6-results.md). Наблюдаемых дефектов нет.
- Итоги используют опубликованные placements и общий MatchRow финала; отсутствие мест не приводит к вычислению podium. Усилены локальные проверки принадлежности команды, повторов identity и согласованности мест с финалом. Исходные JSON/shared lib/контракты/роутер не менялись.
- `evidence_status=VERIFIED`, `gate_verdict=PASS` для Node/SSR и сборки. Полный UI gate BLOCKED: после восстановления browser новый tab 8 снова получил `ERR_BLOCKED_BY_CLIENT` для локального preview. Визуальная геометрия, browser focus/disclosure, mobile/desktop и реальные Telegram-клиенты — NOT_VERIFIED; старую приёмку не переносить на эту версию.
- `operation_status=NOT_STARTED` для публикации. Main/бот не изменены. Следующий ограниченный результат: version manifest и неблокирующее предложение обновления по действию пользователя. Шаг 6/16 и полный MVP не закрыты. `action_decision=CONTINUE`, `hypothesis_assessment=NOT_ASSESSED`.

## История операции — 19.09.2026, публикация разделов шага 6

- ACTIVE_CONTRACT выпуска: опубликовать сохранённый и проверенный срез по явному «Публикуй». Цель — существующий https://xn--90aiaibl0ahlel5n.xn--p1ai/tg; отдельный Sites не создавался.
- Код `ff5009b80bb5207b5004e93f04d5b9ffd01fbf31`, документация `33fb2a313462eb3027f4f0511ea6bac0b359d9d2`; diff исполняемых файлов с проверенной локальной версией пуст. Существующие 133/133 теста и 12/12 независимых Node/SSR проверок относятся к этому неизменному коду; повторный полный прогон в выпуске не выполнялся.
- Перед операцией подтверждены чистая рабочая копия, ancestry main → candidate и ограниченный diff только разделов Mini App/тестов/документации. Выполнен штатный GitHub update_ref(main, force=false); readback через git ls-remote подтвердил точный commit.
- После ответа предыдущей сборки домен обновился автоматически. HTTP 200 и побайтовое совпадение с проверенным dist для HTML, bootstrap JS, MiniApp JS и CSS:
  - /tg: `18133a17b06e923c8b942039757f3de87ef18af48d770ac18256b1e115aaf70e`
  - /assets/index-BGHGoE5x.js: `4ca021a1b354020534f78249b739893f32d9a5cbe2e6bc62e2a5d91da086d1b5`
  - /assets/entry-BRcACWq_.js: `77e440161de1807fb9eacd272306052edaf52b90dc259a18f0282ca5a677ce0e`
  - /assets/entry-65OZ7QRD.css: `ddad0de8413fe0417d76f41219a76a6cca4a96b9fd87cd9a7ee2aed72c919e43`
- Живой Chrome на production: прямой /tg/tournament?section=matches открывается; пять разделов видны. Формат показывает опубликованные Swiss/плей-офф/условия, Расписание — этапы и честное пустое расписание матчей, Матчи — «Матчи ещё не опубликованы». Переходы кликами PASS. Screenshot осмотрен; на viewport 1363px scrollWidth=1363px. В полученных console errors только chrome-extension сообщения, ошибок приложения в этой выборке нет.
- `evidence_status=VERIFIED`, `gate_verdict=PASS` для публикации точной сборки и перечисленного desktop browser smoke. Полный шаг 6 остаётся IN_PROGRESS. Отсутствие опубликованных матчей ограничивает production-проверку раскрытия; настоящие Telegram-клиенты, mobile и полная клавиатурная проверка не выполнялись.
- Предыдущая исходная версия для возможного code rollback: `8862d0d19e90b2c7a260d4993fe43f8b18f0bdbd`. Данные/миграции не менялись; откат не выполнялся, при необходимости — отдельная согласованная штатная операция без force. Фоновый мониторинг не создавался.
- Далее: Swiss/плей-офф по общей модели. Публикация этого среза не закрывает весь шаг 6 и не разрешает автоматически публиковать следующие изменения.

## История — 19.09.2026, Формат и Расписание

Первый срез шага 6 сохранён в code commit `733288381445bdee400241cb4e616d7428958c77`, журнал — `74b0c6e2a6617cb1fafff0a9557a68baca67d1a9`. Build и 120/120 тестов PASS; независимый `/root/verify_step6` выявил и перепроверил исправления двух дефектов статусов. Сохранены [отчёт реализации](step6-sections.md) и [независимый отчёт](independent-step6-sections.md). Новый срез «Матчи» продолжает эту ветку, не повторяет приёмку шага 5.

## История — 16.09.2026, подготовка desktop/закрытия

Исправление подготовлено по скриншоту Романа: desktop-композиция, отдельное закрытие, Esc и сохранение выхода при ошибке данных. Источник и ограничения проверки — [desktop-fix.md](desktop-fix.md). Ветка исправления `codex/telegram-desktop-fix`; её изменения также должны сохраняться при продолжении `codex/telegram-miniapp`. Main `301127ca09a1d4aabef1bebfaee537db773b9ca4` объединён без потери данных. Build и 109/109 тестов PASS, независимая проверка исходников/runtime/JSX завершена. Новый визуальный рендер и закрытие настоящего Telegram Desktop НЕ проверены: локальный browser заблокирован политикой. Новая версия пока не опубликована; публикация требует разрешения по действующему правилу. Принятый шаг 5 не перезапускается; шаг 6 остаётся следующим плановым.

## Последняя операция — 16.09.2026, шаг 5 принят пользователем

- Роман сообщил: «Я проверил, бот отдает сайт в тг. Все корректно». Это явная приёмка опубликованного Mini App в Telegram; шаг 5/8 закрыт, блокер перехода к шагу 6 снят.
- Объект приёмки: `@YarCyberSeason_bot`, https://xn--90aiaibl0ahlel5n.xn--p1ai/tg. Последняя идентифицированная публикация: merge commit `2800ce2e4aa48642ffe0f86343b2ffb0b160bc40`; её HTTP/хеши/браузер проверены 15.09.2026. Устройство, версия клиента и хеш сборки во время пользовательского запуска отдельно не сообщены.
- Источник realTelegram evidence — наблюдение пользователя, не новый инструментальный запуск ассистентом. Подтверждено корректное открытие сайта ботом в Telegram; отдельным девяти сценариям и всем платформам PASS не присваивается. Подробная матрица остаётся на шаге 7.
- Ежедневная задача `6aa2f3c2f7008191a096acc08360d7d2` возобновлена: update подтвердил `is_enabled=true`; прежнее ежедневное расписание около 10:00 Europe/Amsterdam сохранено. Следующий запуск выполняет один следующий незавершённый шаг — 6/8.
- Шаг 6: регламент, расписание, матчи, результаты, Swiss/плей-офф, пустые состояния и обновление версии в двух существующих экранах. Реализация шага 6 в этой операции не выполнялась. Будущая публикация новых изменений остаётся отдельно согласуемым шагом 8.
- Этот блок заменяет прежние состояния NOT_EXECUTED/BLOCKED для пользовательской приёмки и остановки ежедневной задачи. История публикации и проверки ниже сохраняется.

## История операции — 15.09.2026, публикация проверена

- Пользователь явно подтвердил обновление ответом «Обнови» на просьбу слить PR #3 в main и обновить действующий сайт. Прежний блокер согласования снят этой инструкцией.
- PR #3 переведён из draft. Штатный merge-инструмент дважды вернул internal error; каждый раз readback подтвердил, что PR открыт и не слит. Перед альтернативной операцией GitHub подтвердил: mergeable=true, mergeable_state=clean, main protected=false, required status checks отключены.
- Проверен сформированный GitHub merge commit `2800ce2e4aa48642ffe0f86343b2ffb0b160bc40`: родители — актуальный main `58c9754f7035d04a24ad8dcc511988705d015537` и принятый PR head `e2bb6f9f381bf93941579acf433ad25d187daba7`; tree `6a477dadf12779c274af47649629bce3431873b9` совпадает с проверенной версией. Main перемещён на этот commit без force после явного разрешения пользователя. Новый readback подтвердил main и PR #3 state=closed, merged=true, merge_commit_sha=2800ce2e4aa48642ffe0f86343b2ffb0b160bc40.
- После первоначального ответа старой сборки домен начал отдавать новую. Проверено HTTP 200 и точное совпадение SHA-256 с build для `/tg`, `/tg/tournament?section=participants`, index JS, MiniApp entry JS и CSS. Хеши указаны ниже в разделе интеграции.
- Живой Chrome на домене: главная → «Открыть турнир» → «Участники» → «На главную» PASS. Все 16 команд отображаются. Отдельная новая вкладка с прямым URL участников открылась и вернулась на `/tg` без истории главной. `/about` показывает актуальных организаторов/честное пустое состояние и общий заголовок без переключателя темы. На `/tg` загружен только miniapp CSS; ширина viewport и scrollWidth равны 1363 px.
- operation_status размещения: `SUCCEEDED`; public HTTPS/browser: `VERIFIED` в перечисленных сценариях. Это не утверждение о работе всех мобильных клиентов.
- BotFather не изменялся. realTelegram и jointAcceptance: `NOT_EXECUTED`. Следующий шаг: владелец задаёт опубликованный URL в Main Mini App бота `@YarCyberSeason_bot`, затем совместная проверка в Telegram. Шаг 6 и автоматическое продолжение остаются заблокированы до подтверждения Романа. Этот блок заменяет предыдущие сообщения о блокере main/неопубликованном `/tg`.

## Исторический контракт implementation-4

- Ревизия: `implementation-4`, поручение от 10.09.2026; ТЗ 1.1 от 10.09.2026 + поправки пользователя 14.09.2026: принятый «Разлом», русский, расширяемые темы/языки и сохранение выбора; отдельная совместная проверка шага 5, всего восемь шагов.
- Цель: miniapp на данных и стеке существующего `rtalyutin/yarcyberseason`, без отдельного backend.
- Ровно два экрана: `/tg` и `/tg/tournament`. Разделы участники, регламент, расписание, матчи, результаты, Swiss и плей-офф находятся внутри турнира.
- Выбран только `dota2-autumn-2026`, 10–25 октября 2026; не использовать `currentTournament` для выбора.
- Не добавлять архив, каталог/страницы команд, страницу матча, Matchday, кабинет, платежи, уведомления, админку или миниигры. Существующие возможности обычного сайта сохраняются.
- Не менять внешнюю форму регистрации, турнирные правила, реальные результаты, состав партнёров или оформление обычного сайта.
- Разрешены реализация по плану, локальные проверки и сохранение кода/журнала в изолированной ветке этого репозитория. Один следующий незавершённый шаг за запуск.
- Разрешение 15.09.2026: пользователь выбрал @YarCyberSeason_bot и потребовал miniapp на `/tg` действующего ЯрКиберСезон.рф из-за недоступности Sites. Разрешены интеграция с актуальным main и размещение двух готовых экранов на этом домене. Настройки BotFather, изменения иных внешних систем и сообщения третьим лицам не выполняются.
- Дизайн принят на шаге 3. На шаге 5 выбран HTTPS-адрес `https://xn--90aiaibl0ahlel5n.xn--p1ai/tg` существующего сайта и бот `YarCyberSeason_bot`. Отдельный Sites отвергнут. Это размещение текущих двух экранов для совместной проверки, а не выпуск полного MVP шага 8. Совместную проверку нельзя заменить тестами; шаг 6 запрещён до подтверждения Романа.
- Design gate закрыт: «Дизайн разлома пока пусть будет»; на уточнение набора — «Только разлом и русский». Переключатели показывать лишь при появлении второго доступного варианта; не добавлять английский или вариант B в MVP.
- Старый ACTIVE_CONTRACT «только ТЗ» закрыт; он не ограничивает текущее поручение реализации.

## Историческое состояние шага 5

- Режим: `EXECUTE`; primary_trace: `Handoff`.
- Текущий результат: **5/8 — ACCEPTED_USER, 16.09.2026**. Шаги 1–5 завершены; следующий — 6/8.
- evidence_status: `VERIFIED` для корректного запуска в Telegram по сообщению Романа; gate_verdict: `PASS` для пользовательской приёмки шага 5. Это не полная приёмка MVP или всех сред.
- handoff_schema: `FEATURE_HANDOFF/1`; handoff_digest: `880ed9d2dc0004f39250f4a5c3739840cc1f9c4b37edf78b652dc787f5aa44e4` — SHA256 файла схемы передачи, не приложения; повторно сверен с актуальным reference 15.09.2026. Версия приложения и evidence указаны отдельно ниже.
- feature_id: `telegram-miniapp`; producer: `/root`; verifier шага 4: `/root/verify_step4`; verifier подготовки шага 5: `/root/verify_step5_preparation`; consumer: Роман для совместной проверки конкретной сборки.
- Ветка: `codex/telegram-miniapp`; исходная проверенная версия: `90126c18dbbf47af9ed00bebc030cc425e273cef`; актуальный main при финальной сверке шага 3: `f62a113bbec92e3049508313b93ce1ab78b87073`.
- artifact_revision шага 4: код `6b8cc74`, затем merge актуального main `6da86af3b16b89a66a323d677bef84f89b51fc15` в `0b91fcb8c2b2949f45cfd6e22c08a1ae589df9fe`; финальный evidence-коммит содержит только журнал, отчёт, HTML-стенд и фактический screenshot.
- Результат шага: отдельный miniapp entry/CSS; два React-экрана; router; SDK bootstrap/fallback; сохраняемые предпочтения rift/ru; фактические 16 участников и 12 существующих логотипов. Остальные разделы турнира ещё не реализованы и честно обозначены как готовящиеся при прямом входе; navigation показывает только обзор и участников.
- Публикация на действующем домене: `SUCCEEDED`; запуск ботом в Telegram подтверждён Романом. Ассистент настройки BotFather не менял.
- action_decision: `CONTINUE` к шагу 6 по прежнему ежедневному расписанию; hypothesis_assessment: `NOT_ASSESSED` — реализация, не эксперимент о спросе или эстетическом превосходстве.
- Следующее действие **6/8**: остальные разделы турнира и обновление версии. Подтверждение Романа получено; шаг 5 и настройку уже работающего бота не повторять.
- Автопродолжение возобновлено 16.09.2026 после приёмки пользователя; задача та же, расписание сохранено. Предыдущая пауза от 15.09 снята.
- Историческая сборка `a60052e131cb8fb770a51e3c4a8260cf957dc22c` заменяется для шага 5 интеграцией с main `58c9754f7035d04a24ad8dcc511988705d015537`. Это необходимое следствие выбора действующего сайта. Оформление MiniApp не менялось; выбран botUsername. Исторический `telegram-review-check.mjs` проверяет только a60052e и не служит gate интегрированной версии. Новые хеши записаны ниже.
- Main сверён 15.09.2026: `58c9754f7035d04a24ad8dcc511988705d015537`; новые меню, About, профили, регламент и архивные ссылки объединены без конфликтов и сохранены. Перед обновлением main проверить, что он не продвинулся.

### Авторитетные входы

- GitHub: `https://github.com/rtalyutin/yarcyberseason`.
- ТЗ: `/ЯКС. Все в одном./YarCyberSeason-Telegram-MiniApp-TZ.md`, Library ID `libfile_aa4c990dcf4481918642cf77470dc625`.
- ТЗ прочитано целиком 11.09.2026, 504 строки, 71384 байта; версия в содержании 1.1. Текст локального файла совпал с актуальным чтением. SHA-256 локального файла: `8c89b5ea1a07a8131b420b12a9f5eb9f66264bfb405252fe7e74733380a774cb`.
- Перед каждым продолжением читать актуальное ТЗ по стабильному ID, не считать сохранность scratch гарантированной.
- `AGENTS.md` на базе: SHA-256 `70cdb91a4cbcddc0f6fe54ab9dce060a0ed75e87ca90b9b25413d7ce5c7f8ecc`. Вложенных AGENTS.md в отслеживаемом дереве не найдено.
- Sites identity из `.openai/hosting.json`: `appgprj_6a8b38b48cec819184375be4f3b5495a`. Read-only get_site подтвердил тот же проект, active, version 26. Не создавался новый Site; его исходники, версии и публикации не менялись.

### Сверка и сохранение изменений пользователя

- `git ls-remote` и `git fetch origin` подтвердили: актуальный main **равен** проверенной базе ТЗ `90126c18dbbf47af9ed00bebc030cc425e273cef`. На GitHub отсутствовала ветка miniapp; журнал или реализация miniapp в main не найдены.
- Повторно использован существующий checkout; новый репозиторий, worktree или Site не создавался. До переключения отслеживаемые файлы checkout были чистыми.
- Прежняя локальная ветка `fix/dota-1800-transitions` сохранена на `da2ddcf4085eb247feb66aae56dfaaf661f29cd6`. В ней есть не вошедшие в GitHub main изменения меню, включая `b6d4773fdb06ae27fd9963977938fe501c6c66a3`. Они НЕ удалялись, НЕ переносились в miniapp и НЕ объявлялись опубликованными.
- Другие обнаруженные рабочие копии с пользовательскими изменениями не редактировались. При поступлении правок меню в main повторно сверить `App.jsx`, `main.jsx`, `Prototype.jsx`, заголовок и CSS перед интеграцией оболочек. Не возвращать старое меню поверх новых правок.
- Перед шагом 2 main изменился с `90126c1` на `4b134f3`: добавлены оригинальные логотипы Borisogleb, Tech Titans и WAYPROD и три пути `logo` в `teams.json`. Изменение объединено в ветку без конфликта; реальная fixture проверяет эти актуальные пути. Прежние документы шага 1 сохранены.
- Перед шагом 3 удалённый `main` повторно проверен и остаётся `4b134f3`; дополнительных пользовательских изменений для объединения нет. Ветка шага 3 продолжает сохранённый `f7003fc` без перезаписи основного сайта.
- Во время финальной сверки шага 3 `main` продвинулся до `f62a113`: добавлены read-only WebMCP, TEAM SPERMINT вместо 4fans и присланные логотипы Dota-команд. Эти изменения объединены после изолированного commit шага 3; конфликтов с miniapp не было. Макет и реальная fixture обновлены/повторно проверены на новом названии.
- Зависимости пришлось восстановить: существовавшая ссылка node_modules указывала на отсутствующий временный каталог. Установлены 66 пакетов из текущего package-lock через `npm ci --ignore-scripts --no-audit --no-fund`; package.json/lockfile не изменились.

## Шаг 1 — сопоставление с ТЗ

| Область | Что установлено в исходниках | Зависимый следующий результат |
| --- | --- | --- |
| Стек | React 19.2.0, Vite 6.4.2, JS/JSX, npm lock | L0 на JSDoc/JS; не мигрировать стек |
| Маршруты | App статически импортирует Prototype; отдельно lazy `/forMari`; `main.jsx` статически импортирует общий CSS | Позднее разделить оболочки до импорта сайта, сохранив `/forMari` |
| Выбор | `currentTournament = currentCs2`; Dota JSON отдельный | Явная конфигурация slug в L0 |
| Регистрация | 16 участников, `closed`, `capacity_reached`; primaryAction на участников | Не подменять статус доступностью резервной формы |
| Сетки | Swiss groups пуст; плей-офф содержит 7 ID-only слотов | Не считать слот матчем, не рисовать вымышленные результаты |
| Нормализация | `normalizeResult`, `flattenMatches`, `validateCommunity` существуют | Единый normalized result в списке и сетке; скрытые узлы исключаются |
| Частичная сетка | Валидатор строит индекс по flattenMatches, исключающему ID-only | Узкое исправление DATA-05 на этапе адаптера; L0 готовит соответствующие fixtures |
| Партнёры | ФКС ЯО, Минспорта ЯО, Додо Пицца находятся в JSX главной | Позднее извлечь общий модуль без изменения состава |
| Сборка | Vite → community-build → prepare-sites-build | Сохранить календари и Sites outputs; manifest пока отсутствует |
| Размещение | Worker имеет SPA fallback; Sites identity существует | Это не доказательство актуального production, cache headers или запуска Telegram |

## Проверки 11.09.2026

Версия проверяемого кода: `90126c18dbbf47af9ed00bebc030cc425e273cef`; Node `v24.19.0`, npm `11.9.0`, Linux; Sites execution profile `managed-linux`, configurator `configured=false` — структура проекта не изменена.

- `node --test tests/*.test.mjs`: **53/53 PASS**, в том числе community/render, tournament, Matchday, Sites, Swiss simulator и пасхалки. Это существующие тесты, не 24 сценария приёмки ещё не написанного miniapp.
- `npm run build`: exit 0; валидированы 50 команд и 120 матчей всего сайта; сгенерировано 78 календарей. Исходные JSON не менялись.
- `npm run test:sites`: **4/4 PASS**, после сборки.
- Проверены наличие `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json` и совпадение project_id исходника/сборки. Хеши и stdout находятся в `baseline-2026-09-11.json`.
- `git diff --exit-code` после установки, тестов и сборки: exit 0; отслеживаемые исходники не изменились.
- Первый преждевременный запуск тестов во время установки зависимостей: 52/53, отсутствовал React entrypoint. Это сбой подготовки среды; после завершения установки полный запуск 53/53. Не классифицируется как дефект приложения.
- Предупреждения базовой сборки: не найдены `NimbusSansNarrow-Regular.otf` и `NimbusSansNarrow-Bold.otf`. Сборка проходит; фактический внешний вид шрифтов браузером не проверен. Не исправлять в шаге 1 и не объявлять полную визуальную регрессию PASS.
- Независимый read-only verifier `/root/verify_step1` проверил базу, сохранность исходников, ТЗ, реальные данные и выполнил репродукцию DATA-05 с отрицательным контролем. Вердикт: **PASS подготовки основы**. Его проверка не включает тесты/сборку основного исполнителя, браузер, Telegram, production или remote readback. Команда и stdout сохранены в `independent-verification.md`.
- Прямой `git push` завершился exit 128: нет терминальной GitHub-аутентификации. Это не потеря данных: для сохранения разрешённой ветки используется подключённый GitHub API; дерево проверяется по SHA и чтением удалённого ref. В будущем этот способ доступен без изменения main, создания другого репозитория или ослабления прав доступа.

## Продолжение без временного workspace

1. Открыть существующий проект и ветку `codex/telegram-miniapp` на GitHub; если checkout пропал, восстановить эту ветку того же репозитория, не создавать новый репозиторий/Site.
2. Прочитать этот журнал, актуальное ТЗ и применимые AGENTS.md. Сверить удалённую ветку и main; не перезаписывать локальные/внешние изменения.
3. Проверить подтверждение сохранения последнего результата через remote ref/readback. Commit результата — commit, содержащий актуальную ревизию этого журнала (`git log -1 -- docs/telegram-miniapp/STATE.md`); это не commit опубликованной сборки.
4. Прочитать `docs/telegram-miniapp/design/README.md` и зафиксировать выбор пользователя A/B. До выбора не превращать один из макетов в рабочие React-экраны молча. L2/L4 переиспользовать как проверенные независимые результаты.
5. Не перескакивать gate дизайна на шаге 3 и разрешение выпуска на шаге 7. Ни успешный push, ни PASS тестов не разрешают публикацию.

## Шаг 2 — пакет L0

- `src/telegram/config.js`: фиксирует `/tg`, `dota2-autumn-2026`, `Europe/Moscow`, восемь section и девять startapp targets; botUsername остаётся `null`.
- `src/telegram/contracts.js`: JSDoc-модели и исполняемые guards/преобразования для MiniAppRoute, UiAction, MiniAppModel, StageViewModel, RuntimePort и VersionManifest.
- `resolveMiniAppLocation`: распознаёт только `/tg` и `/tg/tournament`; неизвестный section или параметр другого турнира нормализуется; путь вне `/tg` не перехватывается.
- `matches[]` — единственный владелец normalized result; StageViewModel ссылается на него по `matchKey`. Guard отклоняет отсутствующую ссылку и дубликаты match/slot key.
- `tests/fixtures/telegram/fixtures.mjs`: одна реальная fixture читает актуальные JSON из source; восемь синтетических помечены `fixture: true` и покрывают empty/scheduled/confirmed/unconfirmed/technical/bad-team/hidden/ID-only-target.
- `tests/telegram-contracts.test.mjs`: 9 сценариев; доступна команда `npm run test:telegram`.
- Наглядная карта контрактов, маршрутов и fixtures: `docs/telegram-miniapp/L0-contracts.md`.

### Проверки L0 12.09.2026

- `npm run test:telegram`: **9/9 PASS**.
- `node --test tests/*.test.mjs`: **62/62 PASS**, включая 53 прежних и 9 новых.
- `npm run build`: **PASS**; Vite собрал 4611 модулей; проверены 50 команд и 120 матчей; Sites outputs подготовлены. Два прежних предупреждения NimbusSansNarrow сохранены как ограничение, не исправлялись в L0.
- `npm run test:sites`: **4/4 PASS** после сборки; `.openai/hosting.json` сохранил project_id `appgprj_6a8b38b48cec819184375be4f3b5495a`.
- `node --check` для новых JS/MJS и `git diff --check`: PASS.
- Независимый verifier сначала обнаружил три пробела guard: лишние raw-поля в слотах, непроверенный формат `slotKey` и неполную структурную проверку DTO. После исправлений повторная проверка дала **PASS**; held-out probes отклоняют неверные `maps`, `additionalAwards`, raw-поля и чужие/ошибочные slot keys. Контрольные хеши до и после read-only probes совпали. Подробности: `independent-l0-verification.md`.
- Браузер, UI, Telegram, tg-version.json и production не проверялись: они ещё не реализованы. Успешная сборка — регрессия основы, не приёмка miniapp.
- Машиночитаемая сводка: `docs/telegram-miniapp/l0-verification-2026-09-12.json`.

## Шаг 3 — дизайн, данные и RuntimePort

### L1 — конкретный выбор

- `docs/telegram-miniapp/design/design-options.html` и `design-options.svg`: по два экрана для направлений A «Разлом» и B «Турнирная сетка» на ширине 390 px. A рекомендуется как прямое продолжение утверждённого Dota HOME; B — более нейтральная data-first альтернатива.
- Макеты используют настоящий логотип ЯКС, существующую карту/партнёров и только фактическое состояние: 16/16, регистрация закрыта, список реальных участников; матчи и результаты не выдуманы.
- `src/telegram/design/tokens.css`: общие цвета, типографика, интервалы и максимальная ширина; правила 360/390/430/768, safe-area, focus, reduced-motion, внутреннего скролла навигации/сетки описаны в `design/README.md`.
- HTML фактически отдан локальным Vite: четыре phone-frame найдены, логотип и карта ответили HTTP 200, градиенты отсутствуют. Облачный браузер не получил доступ к loopback preview, поэтому визуальная реакция пользователя и browser screenshot честно остаются непроверенными.

### L2 — адаптер фактических данных

- `src/telegram/data/load.js` импортирует только `dota2-autumn-2026.json`, полный `teams.json` и общий `project-content.js`; `currentTournament` не используется.
- `model.js` создаёт MiniAppModel без изменения входов: участники разрешаются через реестр, результаты нормализуются общей функцией, скрытые матчи исключаются, ID-only записи остаются пустыми слотами, stage slots ссылаются на единственный `matches[].result`.
- `actions.js` преобразует только разрешённые действия внутри двух экранов и безопасные HTTPS-ссылки; архив, команды, другой турнир, Matchday, отдельный матч, чужой origin и опасные схемы отбрасываются.
- `validate.js` проверяет выбранный slug, проекцию реестра, дубли, teamId, ссылки сетки, связь итогов с опубликованным подтверждённым финалом и действие закрытой регистрации на `participants`. Общий `validateCommunity` узко исправлен: индекс объявленных ID включает пустые/скрытые слоты, проверяет slot 1/2, но `flattenMatches` по-прежнему не превращает их в матчи.
- Swiss-строки сортируются по опубликованному `position`; строки без позиции идут после них в исходном стабильном порядке. Самостоятельный расчёт мест не выполняется.
- Фактическая модель 13.09.2026: 16 участников; регистрация `closed`, capacity 16; 0 опубликованных матчей; Swiss empty; 7 пустых playoff slots; results отсутствует.

### L4 — контейнеры

- Browser RuntimePort: allowlisted `startapp`, безопасное внешнее открытие, visibility resume и снятие подписок.
- Telegram RuntimePort: `ready`, `expand`, allowlisted `initDataUnsafe.start_param`, замена/скрытие BackButton handler, `activated` + visibility resume, viewport/safe/content-safe CSS variables, `openLink`/`openTelegramLink`, полный dispose.
- `create-runtime.js` выбирает Telegram только при доступном `window.Telegram.WebApp`, иначе сохраняет browser fallback.

### Проверки шага 3 — 13.09.2026

- `npm run test:telegram`: **22/22 PASS** (9 L0 + 13 L2/L4).
- `node --test tests/*.test.mjs`: **85/85 PASS** на дереве с объединённым `main` `f62a113`. До объединения было 75/75; добавленные пользователем 10 WebMCP-тестов также прошли. Первый параллельный прогон до добавления трёх регрессий был 71/72: Sites-тест стартовал до появления `dist/client/index.html`; последовательный повтор после build прошёл, дефект кода не воспроизведён.
- `npm run build`: **PASS**; 4616 модулей, 50 команд и 120 матчей; два прежних предупреждения NimbusSansNarrow сохранены.
- `npm run test:sites`: **4/4 PASS**; project_id не изменён, версия/публикация Sites не создавались.
- `node --check`, `git diff --check`, статические проверки дизайн-пакета: PASS.
- Независимый verifier сначала воспроизвёл три L2-дефекта: порядок Swiss, пустые/несвязанные итоги и действие закрытой регистрации. После исправлений повторно проверены 9 held-out групп, включая absolute/protocol-relative/backslash origin bypasses; итоговый технический verdict L1/L2/L4 — **PASS**, новых дефектов нет. Шаг остаётся `BLOCKED_USER_SELECTION` только по обязательному выбору дизайна.
- Реальный Telegram Android/iOS/Desktop, рабочий React-сценарий и production не проверялись и не объявляются PASS.
- Машиночитаемая сводка: `step3-verification-2026-09-13.json`; независимый verdict: `independent-step3-verification.md`.

### Актуальные восемь шагов (поправка пользователя 14.09.2026)

1. Восстановить основу — VERIFIED / PASS.
2. Контракты L0 — VERIFIED / PASS.
3. Дизайн, адаптер данных, Telegram/browser порты; выбор дизайна пользователем — VERIFIED / PASS, «Разлом» принят.
4. Сценарий главная → турнир → участники → назад, direct/startapp — VERIFIED / PASS в browser и Node/SSR; реальные Telegram-клиенты непроверены.
5. Совместная проверка с Романом — ACCEPTED_USER / PASS 16.09.2026; корректный запуск в Telegram подтверждён, подробные платформенные сценарии отдельно не аттестованы.
6. Полный экран турнира и обновление версии — NEXT / NOT_STARTED; зависимость от шага 5 закрыта.
7. Независимая приёмка 24 сценариев и регрессия — NOT_STARTED.
8. Подготовка выпуска/отката, отдельно разрешённый выпуск и проверка Telegram — NOT_STARTED.

Исторические отчёты ниже и отдельные файлы шагов 1–4 сохранены; прежняя нумерация в них относится к старому плану и не определяет следующее действие.

## Шаг 4 — рабочий сценарий, 14.09.2026

### Восстановление и изменения

- Актуальное ТЗ 1.1 повторно прочитано по стабильному Library ID; источник остаётся 504 строки/71384 байта. Актуальные указания о теме и языке приняты из сообщений пользователя; обновлён AGENTS.md, исходное ТЗ не переписано.
- Существующий checkout был чистым на `3bec94b`; использована прежняя ветка, новый repo/worktree/Site не создавался. Read-only get_site подтвердил прежний project_id и version 26.
- Важное правило продолжения: remote.origin.fetch настроен только на miniapp-ветку. Обычного `git fetch origin` НЕДОСТАТОЧНО для сверки main; использовать `git ls-remote origin refs/heads/main` и явный `git fetch origin main:refs/remotes/origin/main`.
- Выявлены и без конфликтов объединены четыре новых commit main: Leto Jr logo, общий PDF регламента Dota, ARB/Mi Ne Pushim logos, исторические roster snapshots. Новые действия/данные не удалены; составы и статистика не включены в ограниченный ParticipantView miniapp.
- `src/main.jsx` выбирает оболочку до импорта App/CSS. `/forMari`, `/webmcp`, обычные страницы и стили сохранены, файлы worker/hosting не изменены.
- `router.js`: home→tournament push; section/back replace; прямой back всегда `/tg`; launch приоритетен один раз, затем raw query/hash удаляются. WeakSet + безопасный boolean в history.state защищают retry/remount/reload от повторного SDK launch. Raw Telegram данные не сохраняются.
- `load-bridge.js`: официальный SDK только для miniapp, максимум 4 секунды ожидания, shared promise, fallback при ошибке; SDK с platform=unknown использует browser port. Источник: https://core.telegram.org/bots/webapps (проверен 14.09.2026).
- `MiniApp.jsx`: boot/loading/error/retry, lifecycle cleanup, ready после появления модели/UI, header BackButton, главная/обзор/участники, нейтральный fallback отсутствующего/сломанного логотипа. Реальные записи показываются без ссылок на дополнительные экраны.
- `preferences.js`: versioned device-local key, allowlisted registries, ru словарь UI, нормализация/сохранение и отказоустойчивость. Встроенных вариантов только rift/ru; скрытые до второго варианта selectors. Опубликованный текст данных остаётся в общем JSON; добавление перевода данных — отдельная будущая задача.
- Перенос «Разлома» выполнен через Метаморф: карта и оригинальная raster frame сохранены, luminance-mask подключена после выявленного визуального дефекта checkerboard. Основной сайт визуально не менялся.

### Проверки и пределы

- На коде `0b91fcb`: `npm run build` PASS, 4633 модуля, 50 команд/120 матчей; `node --test tests/*.test.mjs` **99/99 PASS**; `npm run test:sites` **4/4 PASS**; отдельный miniapp suite **32/32 PASS** (10 новых тестов шага 4).
- Bundle identity: entry JS `entry-C7_1bOwf.js`, SHA256 `a184333d3f2b694b56085c6eee832caacda657c2d214ef0ae87d561a37fd5de4`; entry CSS `entry-xXhKGvy7.css`, SHA256 `f4e92b5bf181e1db60484e3656f3c53a72dccf939728a64b9559a1616c3e4484`.
- Браузер Cloud Chrome, supervised Vite preview: реальный home→tournament→participants→back, direct participants→back, browser startapp=participants, back→reload PASS. DOM содержит 16 записей, правильные Dota названия и закрытую регистрацию. Успешные браузерные действия — на исходниках dev preview, не доказательство запуска production bundle в Telegram.
- Два настоящих React-приложения в iframe QA-стенда проверены с width 360/390/430/768. document clientWidth/scrollWidth совпали: home 360/360,390/390,430/430,753/753; participants 345/345,375/375,415/415,753/753. Разница с frame width — вертикальный scrollbar; горизонтального переполнения нет. Это не эмуляция ОС или Telegram safe-area.
- Фактический browser screenshot: `step4-preview.jpg`, после merge новых логотипов и исправления маски. `step4-preview.html` — только QA-стенд, не третий маршрут приложения и не публикуемый интерфейс.
- Независимый verifier воспроизвёл replay SDK launch после remount и fresh-module reload; оба дефекта устранены и перепроверены. Node held-out bridge success/error/timeout, cleanup, navigation, SSR и data compatibility PASS. Подробности: `independent-step4-verification.md`.
- Не проверены: настоящий Telegram Android/iOS/Desktop; 200% текст; интерактивный отказ/повтор модели и React remount в browser; полный сетевой граф, CDN, production URL; остальные 24 QA сценария целиком. Отдельная загрузка проверена исходниками/сборкой, не полным сетевым trace.
- Сохранены прежние предупреждения отсутствующих NimbusSansNarrow OTF обычного сайта. Miniapp использует имеющиеся WOFF2. Full-page screenshot infrastructure timeout: сохранён и осмотрен screenshot viewport, а не заявлен full-page export.
- operation_status выпуска: `NOT_STARTED`. Никаких publish, bot changes, merge в main или сообщений третьим лицам.

## Шаг 5 — подготовка совместной проверки, 15.09.2026

### Реальные изменения этого запуска

- Синхронизированы ACTIVE_CONTRACT `implementation-3`, TASK_STATE и актуальная нумерация 1–8. Исторические отчёты 1–4 не переписаны. Совместная проверка теперь отдельный обязательный gate перед полным экраном турнира.
- Добавлен `step5-joint-check.md`: закреплённая версия, реальные пути, сценарий из девяти наблюдений, фактический список 16 команд, правила записи замечаний и явного подтверждения. Готовый публичный URL не выдуман.
- Добавлен исполняемый `scripts/telegram-review-check.mjs`: fail-closed сверка source с a60052e, хешей miniapp JS/CSS, реестров rift/ru, фактических данных, идентичности проекта и инвентаря сборки. Скрипт не пишет файлы и не обращается к Telegram/хостингу. Это QA-подготовка, не manifest/обновление версии из шага 6.
- Приложение, данные, визуал, hosting-конфигурация и основной сайт не изменены. Повторно создавался только build в игнорируемом dist. Существующие новые коммиты main сохранены без объединения в закреплённую версию.

### Выполненные проверки

- Перед работой checkout чистый; local HEAD и remote miniapp одинаковы: `a60052e131cb8fb770a51e3c4a8260cf957dc22c`.
- Remote main: `58c9754f7035d04a24ad8dcc511988705d015537`; пять новых коммитов относительно интегрированного main: командные профили, архивные OpenDota-ссылки, организаторы, регламент, единая навигация. Dota autumn JSON и teams.json не отличаются от закреплённой версии. Основной сайт в этой сборке не включает эти пять изменений — нельзя выпускать её поверх актуального main без последующей интеграции и проверки.
- Актуальное ТЗ 1.1 прочитано по исходному Library ID; старый контракт подготовки ТЗ не отменяет текущую реализацию. ASSISTANT-SELF-LINE прочитан полностью, не менялся.
- Read-only Sites get_site: тот же project_id, active, latest_version_number=26; current_preview_url отсутствует. Существующий live URL не выдавался за проверяемый miniapp. Публикаций/изменений доступа/бота не было.
- `npm run build`: PASS, 4633 модуля, 50 команд/120 матчей всего сайта. Два прежних предупреждения NimbusSansNarrow OTF остаются; интерфейс не переделывался.
- `node --test tests/*.test.mjs`: **99/99 PASS**, включая 4 Sites-теста; Node v24.19.0, Linux, исходный application tree a60052e.
- `node scripts/telegram-review-check.mjs`: **PASS**, 15.09.2026 08:37:26 UTC. 207 файлов dist; SHA256 отсортированного JSON-инвентаря path+sha256: `24d22f0c338a994f70178749584842eda9c75fa22f0ff2798caec3b730468325`.
- Вновь полученный entry JS `entry-C7_1bOwf.js`: SHA256 `a184333d3f2b694b56085c6eee832caacda657c2d214ef0ae87d561a37fd5de4`; CSS `entry-xXhKGvy7.css`: `f4e92b5bf181e1db60484e3656f3c53a72dccf939728a64b9559a1616c3e4484`. Совпали с проверенным шагом 4.
- Независимый `/root/verify_step5_preparation` выполнил 32/32 miniapp, 99/99 всех тестов и отдельный held-out Node/SSR probe: explicit slug, даты, 16 уникальных участников/DOM-записей, closed, 0 matches, rift/ru, отсутствие ссылок команд/выдуманного 0:0. Это локальное evidence, не браузер/Telegram.
- Verifier отдельно исполнил новый `telegram-review-check.mjs`: PASS, те же хеши и inventory. Readback программы совместного прохода подтвердил разделение проверок и запрет шага 6. Замечание о неясной принадлежности handoff_digest устранено явной маркировкой и повторным sha256sum reference-файла; код приложения не менялся.
- Браузерные ширины и screenshot относятся к 14.09.2026, шагу 4; свежими тестами 15.09 они НЕ названы. Изображение в новом документе переиспользовано без изменения с этой оговоркой.

### Незакрытая граница

- Совместный browser/phone/Telegram проход: NOT_EXECUTED. Android, iOS, Desktop Telegram, BackButton/safe-area на реальном устройстве: NOT_VERIFIED. Подтверждение Романа отсутствует.
- Доступного пользователю live-preview этой конкретной сборки нет; внутренний QA-preview не является handoff-ссылкой. Не выполнен внешний обход ограничений через production, новый Site или туннель.
- Для продолжения требуются @bot, выбранная тестовая HTTPS-среда/адрес и явное разрешение на конкретное размещение/настройку. После этого — предоставить проверенные ссылки и пройти сценарий с Романом. Код шага 6, manifest, публикация и настройки бота не начинались.


## Шаг 5 — интеграция на действующий домен, 15.09.2026

- authorization_ref: «Недоступность. Миниапп на tg действующего сайта ЯрКиберСезон.рф». Выбран ранее переданный `@YarCyberSeason_bot`.
- GitHub main перед интеграцией: `58c9754f7035d04a24ad8dcc511988705d015537`; miniapp: `3faba2a6f0bef72534ced38e0adcd043447192ca`.
- Merge выполнен без конфликтов; прикладной diff от main — существующий MiniApp, lazy entry, общий реестр партнёров и ранее проверенные поправки валидатора. Не добавлялись разделы шага 6.
- Полный набор: 99/99 PASS после merge. После задания botUsername и соответствующей поправки контракта: 32/32 Telegram PASS. Финальная production-сборка PASS (4641 modules; 50 team records, 120 matches).
- Независимое сравнение подтвердило сохранение байтов текущего main для SiteHeader, AboutPage, CommunityPages, ThemeSwitcher, TournamentNavigator, MatchMapLinks, CSS, регламента и архивного JSON. Отчёт исполнения — `independent-step5-integration.md`.
- Cloud Browser заблокировал локальный `http://127.0.0.1:4173/tg`: `ERR_BLOCKED_BY_CLIENT`. Это ограничение браузерной проверки в этой среде. Тесты/SSR не заменяют real Telegram или согласие Романа.
- Основной домен перед обновлением отдавал HTTP 200, сервер Caddy, старый entry `/assets/index-CevRll_b.js`; контроль исходного сайта выполнен без авторизации.
- Финальные build hashes (SHA-256):
  - `index.html`: `a4fb96270a8153437f851ce145b2f3646d41fc429f1b693e6e9e15fce232dcc4`
  - `assets/index-D6Lga4Vz.js`: `eda2cbe96fa193ee8217d9ddfffe7b109cdb1eff93dc0fe3dd390c8ecc00cccc`
  - `assets/entry-DnlqwGF1.js`: `c3339fee26ed12591227b35a7cd91a00ca108fe9499a4824cac3e1e7b8fadbe8`
  - `assets/entry-xXhKGvy7.css`: `f4e92b5bf181e1db60484e3656f3c53a72dccf939728a64b9559a1616c3e4484`
- operation_status размещения: `NOT_STARTED`; jointAcceptance и realTelegram: `NOT_EXECUTED`. При выполнении сохранить фактический remote commit, HTTP readback и состояние запуска отдельно.
