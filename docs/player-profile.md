# Профиль игрока — контракт и состояние

## ACTIVE_CONTRACT · revision 3 · 18 октября 2026

Реализовать согласованное ТЗ YCS-Player-Profile-TZ-v1.0 с последними поправками:
отдельная `/player/profile?Dis=cs`, открыта любому; Telegram или VK; общий
ник и фото, сведения по дисциплине, живой предпросмотр и последующее редактирование.
ФИО необязательно. Фото, ФИО и ник хранятся в существующем S3, без персональных
данных в git. Финальное фото называется `fio-nick.ext`; без ФИО — `??-nick.ext`,
при занятом имени — `??-nick-1.ext`, далее `-2` и т.д. Резервирование должно
исключать перезапись фотографии другого игрока даже при параллельных запросах.

Авторский замысел: вместо невидимого результата анкеты — карточка, которую
игрок собирает на глазах. Ник, ФИО, роли, город и фактический кадр фото в
предпросмотре совпадают с текущим вводом. Один общий шаблон и существующие темы.
Независимые спортивные данные, маршруты, права капитанов и Mini App сохраняются.

Разрешено: локальная реализация по «Реализуй» и её проверки на тестовых данных.
19 октября пользователь поручил «выложи и скажи как найти»: разрешены отправка
в текущую main и публикация на существующем сайте. Настоящие провайдеры, S3,
тексты использования и production routing проверяются отдельно от локальных
тестов; их отсутствие не имитируется demo-входом. Сбор данных остаётся выключен
до настройки действующей серверной среды.

## TASK_STATE

stage: release-ready · publication authorized · data collection BLOCKED

- Frontend: форма и карточка, кадрирование Canvas 2D, повторный вход в popup,
  сохранность черновика, CAS conflict и проверка неизвестного исхода записи.
- Backend: отдельные player-profile modules в существующем сервере.
- Приёмка: независимые HTTP/CAS/React lifecycle проверки выполнены; итоговые
  counts и проверенная область указаны в разделе Independent QA ниже.
- Регрессия NAME-01 revision 3: ФИО optional; `??` буквально, числовой суффикс
  при коллизии; последний ответ пользователя от 18.10.2026 22:26 МСК.
- Внешние операции: разрешена публикация, результат remote/deployment проверяется
  отдельно после отправки; локальный build не считается production-readback.
- Завершено локально: build PASS; профильные проверки и независимые manifests
  приведены ниже. Итоговый запуск 19 октября: 50/50 профильных тестов PASS,
  включая упаковку backend и недоступный context. Отдельная runtime/media/organizer регрессия 30/30 PASS.
  Исторические hashes изменённых файлов помечены STALE.
- Следующий шаг: конфигурация приложений Telegram/VK и целевого сервиса,
  проверка рабочего S3/приватности. Нужны недоступные текущей локальной проверке
  настройки и целевая серверная среда. Новые приложения/buckets/hosts не создавались. Секреты в чат
  не запрашиваются; они устанавливаются в серверной среде.

## Хранение и API

- Приватный документ S3: `private/player-profiles/v1/state.json` в существующем
  bucket. Это собственный источник профилей; sporting/captain/media state не меняется.
- Параметры профиля хранятся как `{type,value}` по серверному каталогу. Авторизация,
  идентичности, версии и квитанции — технические записи в том же CAS-документе.
- Фотография проверяется Sharp и перекодируется в JPEG 1024×1024. Приём: JPEG,
  PNG, WebP, до 10 MiB и 64 MP. Исходник с EXIF/GPS не сохраняется.
- Финальные объекты: `private/player-profiles/v1/photos/??-nick.jpg` (либо ФИО).
  `??` — буквальная часть S3 key; публичного URL на этот key нет. Чтение только
  по проверенной сессии через asset ID, а не по угадываемому имени.
- Два одновременных профиля с одним ником получают разные имена через условное
  создание `IfNoneMatch:*`. Новая фотография не заменяет прежние байты до commit.
- Отдельный обработчик `/api/player/v1`: context, session, auth/start,
  auth/callback/telegram, auth/callback/vk, logout, me, photos и operations.
- Запись `PUT me` использует ожидаемую версию и стабильный request ID. При
  таймауте клиент проверяет квитанцию; `not_found` не объявляет откат. Безопасный
  повтор в течение 24 часов использует неизменные ID и тело.
- Профиль приватен. Разрешения на использование появляются только из
  утверждённого серверного каталога, по умолчанию он пуст. Новые роли/дисциплины
  не придумываются: включён подтверждённый код `cs`, роли необязательны.

## Подключение на существующих серверах

Frontend обращается к `/api/player/v1` своего origin. В dev Vite направляет
этот prefix на локальный backend 127.0.0.1:8080. Для существующего Node frontend
`scripts/server.mjs` используется узкий proxy с `YCS_PLAYER_UPSTREAM`, равным
origin действующего backend. В отсутствие upstream профильный API возвращает
503, остальные страницы и API сохраняют прежнее поведение. Cookie/CORS через
произвольный сторонний домен не является заменой same-origin proxy.

На текущем статическом хостинге без player API страница показывает публичный
каталог CS2 и заблокированную форму с явной ошибкой соединения. Она не создаёт
сессию, профиль или сохранённые данные. Неизвестная дисциплина не подменяется CS2.
Корневой Dockerfile включает все player modules и общий каталог; упаковочный
тест запускает сервер из объявленного COPY manifest. Docker image отдельно
не собирался, поскольку в среде отсутствует Docker CLI.

Backend устанавливается по `backend/package-lock.json`; runtime Node >=22.12.
Новые production dependencies — `sharp` и `jose`; React renderer — только dev.

| Переменная backend | Назначение |
|---|---|
| `YCS_PLAYER_ENABLED=true` | Включение функции после настройки; по умолчанию выключена |
| `YCS_PLAYER_ORIGIN` | Точный HTTPS origin существующего сайта |
| `YCS_PLAYER_SESSION_SECRET` | Серверный секрет минимум 32 байта; не Vite-переменная |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Доступ сервера к существующему S3 |
| `YCS_PLAYER_BUCKET` | Существующий bucket; поддерживается прежний `YCS_CAPTAIN_BUCKET` |
| `YCS_PLAYER_TELEGRAM_CLIENT_ID`, `YCS_PLAYER_TELEGRAM_CLIENT_SECRET` | Настройки Telegram Login OIDC |
| `YCS_PLAYER_VK_CLIENT_ID` | Зарегистрированное приложение VK ID |
| `YCS_PLAYER_DISCIPLINES_JSON` | Дополнительные подтверждённые дисциплины и роли |
| `YCS_PLAYER_FIELDS_JSON` | Дополнительные типизированные строковые параметры |
| `YCS_PLAYER_PERMISSIONS_JSON` | Утверждённые тексты, версии и состав разрешений |
| `YCS_PLAYER_SESSION_TTL_SECONDS` | Срок сессии; по умолчанию сутки |

Callback URI регистрируются в соответствующем приложении на том же origin:
`/api/player/v1/auth/callback/telegram` и `/api/player/v1/auth/callback/vk`.
Telegram OIDC использует стандартный RS256, code+PKCE, server-side проверку
issuer/audience/expiry/nonce; VK — PKCE и проверку exchange state/user-info.
Секреты, токены и исходные фото в браузерную сборку не включаются.

## Проверки и границы готовности

`npm run test:player-profile` запускает авторские и независимые тесты, включая
реальный локальный HTTP и управляемый S3 double. `npm run build` создаёт маршрут
и metadata noindex; personal data в статическом HTML нет. Lifecycle-тесты
исполняют настоящий React без браузерного DOM и не доказывают layout/viewport.

Регрессия runtime/media/organizer UI: 30/30 PASS. Два падения `test:sites`
в prerender архивного CS2 grand-final воспроизведены на неизменённом исходном
HEAD `fe10fba`; к новой странице не относятся и не исправлялись в её scope.
Отдельный captain-suite также имеет прежнее ожидание 30 fixtures вместо 39.

BLOCKED перед реальным выпуском: OAuth app config, настоящий S3 read/write и
проверка bucket policy/приватности, production same-origin routing, утверждённые
возрастные/обработки данных условия и retention/backup/staging cleanup. Код
намеренно не запускает удаление файлов без такой политики; staging quota 30
на владельца не является полноценной очисткой. Документ состояния ограничен
8 MiB, политика хранения квитанций/старых assets должна быть утверждена до
массового приёма. Реального TG/VK входа и проверки настоящего устройства нет.

Cloud browser: localhost вернул connection refused; terminal.local отвергнут
политикой браузера с запретом обхода. Визуальная и браузерная приёмка BLOCKED;
standalone Playwright/CDP/альтернативная поверхность для обхода не использовались.

Первичные технические источники: [Telegram Login](https://core.telegram.org/bots/telegram-login),
[VK ID SDK](https://vkcom.github.io/vkid-web-sdk/docs/),
[Sharp](https://sharp.pixelplumbing.com/api-input/). Фактические интеграции
подтверждаются отдельно от документации и synthetic-provider тестов.

## Independent QA · 18 октября 2026, 19:43 UTC

Исполнитель: отдельный агент `profile_verifier`, не автор реализации. Проверены
согласованное ТЗ v1.0 и приоритетная NAME-01 revision 3; авторские тесты не
использовались как единственный oracle. Собственный набор работает через HTTP,
протокольный S3 double и настоящий React lifecycle. Все сведения синтетические;
запросов к реальным провайдерам, бакету и production не было.

Объект: HEAD `fe10fba8c4c637d53563e266a107928c0b6e876b` плюс изменённые и
неотслеживаемые файлы по manifest ниже. Среда: Node v24.19.0, React 19.2.0,
react-test-renderer 19.2.0. Команда независимой перепроверки:

```text
node --test tests/player-profile-verifier*.test.mjs
tests 15
pass 15
fail 0
cancelled 0
skipped 0
todo 0
```

| Критерий | Независимое исполняемое наблюдение |
|---|---|
| NAME-01 | Без ФИО сохранены буквально `??-Ник.jpg`, `??-Ник-1.jpg`, `??-Ник-2.jpg`; с ФИО — `Иван-Иванов-Ник.jpg`. ФИО/ник присутствуют в приватном S3 state, фото — отдельным объектом. |
| CAS и отсутствие перезаписи | Управляемый overlap: первый резервирует имя и задерживается, второй сохраняет `-1`, затем первый продолжает. Обе записи сохранены, все фото PUT используют If-None-Match `*`. |
| Повтор и неизвестный исход | Обрыв до CAS возвращает `save_unknown`, квитанция `not_found`; повтор исходного запроса фиксирует единственную версию. Потерянные ответы создания фото и завершённого CAS разрешаются по байтам/квитанции. Старая версия не затирает новую. |
| Владение и авторизация | Анонимное фото — 401, другому владельцу — 404; присвоение чужого asset запрещено. Выход/истечение сессии отзывают доступ. Равные subjects Telegram/VK не объединяются; подтверждённая привязка открывает прежнего владельца; replay/state swap запрещены. |
| Данные дисциплин | Один player ID, независимые Steam/роли; protected-field forgery атомарно отвергнут. Числовой Steam ID теперь даёт 422. |
| Фото | EXIF orientation 6 применяется до crop; синтетический цветовой oracle подтверждает верную область. Выход 1024×1024 JPEG, EXIF/orientation отсутствуют. |
| Frontend caller → API | Реальные createPlayerClient/form helpers проходят HTTP session → auth start/callback → upload → save → me/photo/receipt → logout. Эмулируются только cookie jar, Origin и внешние сервисы. |
| Lifecycle React | Unknown → окончательный 422 снимает блокировку и сохраняет исходный объект запроса; смена владельца сразу очищает старый черновик и держит lock до отложенного me. При том же владельце сохраняются текст, bitmap и crop. Смена Dis не переносит чужой контекст. |
| Отмена замены фото | Кнопка закрывает выбранный bitmap и возвращает сохранённое фото; другие правки остаются. Следующее сохранение использует прежний photoAssetId, upload не вызывается. |

Первоначальный независимый запуск имел 8 PASS / 1 FAIL: сервер принимал
числовой Steam ID и сохранял уже округлённое значение. Сырой фрагмент:

```text
numeric Steam ID accepted as {"platform":"steam","identifier":76561198000000000,"verification":"self_declared"}
200 !== 422
```

Автор исправил проверку типа; DATA-02 затем прошёл. Статический разбор отдельно
выявил раннюю разблокировку при смене владельца, застревание unknown после
окончательного 4xx, перенос dirty при смене Dis и отсутствие отмены замены фото.
После исправлений эти сценарии исполнены в пяти headless React тестах; исходная
ошибочная UI-версия в renderer не запускалась, поэтому её FAIL не приписывается.

`evidence_status=VERIFIED`, `gate_verdict=PASS` только для 15 названных локальных
тестов. Общая готовность реального сбора: `BLOCKED`. Настоящий browser runtime,
viewport/телефон/клавиатура, popup/callback Telegram и VK, production routing,
реальный S3 CAS/ACL и retention/backup не проверены этим агентом. Browser был
недоступен/заблокирован политикой; обходные браузерные поверхности не применялись.
React renderer не подтверждает пиксели, производительность Canvas или браузерные
ограничения popup. Субъективная приёмка Романа — не проверена. Local proxy и
остальная регрессия проекта относятся к отдельным проверкам координатора.

`handoff_schema=FEATURE_HANDOFF/1`,
`handoff_digest=880ed9d2dc0004f39250f4a5c3739840cc1f9c4b37edf78b652dc787f5aa44e4`.
`return_to=/root`; внешние операции `NOT_STARTED`. Следующее действие —
координатор сверяет итоговые hashes и выполняет только зависимые проверки после
дальнейших изменений; перечисленные внешние gates требуют целевой среды.

Проверенный source/test manifest, SHA-256:

```text
70f8de91aebe876fc82f3853f809a671221ec85cc19b617abd62eb42695c72fa backend/player-profile-api.mjs
a7222466ddf8d2fc37378661b8f7e1e888300084b87717b59e7e467174a896a1 backend/player-profile-auth.mjs
d1438d7b578c1e847221e6eca0fd2cd6702a9b76bebfb419fbfdbfa6c725afe7 backend/player-profile-config.mjs
890c033af560da57491851ed7bfdd4965fceffff3a3d0c473c2633c3c0094d00 backend/player-profile-service.mjs
01e7dccf25677533a695f68c639aca15f71667d8acbc7f9c2ae2d2e6983c34b0 backend/player-profile-store.mjs
1647153fed4a285f8e2e4bc43d201a4587a1109203515156e6dde28428567bb5 src/components/PlayerProfilePage.jsx
5162aadebc4ace93090891c2b32c217b032e5c8ec6df901bc32af4f6f95c82b4 src/lib/player-profile-client.js
dd6412deecc3063e7bed8159cd68bf97445f29d05932fd5da168ccbc4763b470 src/lib/player-profile.js
96d6eec6c374ae3c4b71f73e136d1e76da3e33e9d9a3ef2308952918095d1dec src/player-profile.css
00330a9c3128378782e69d98e2b602da5db4cd2d13bc08978d84fa77aa054566 tests/player-profile-verifier-ui.test.mjs
494eb51fc14beea982188d47cbcb6471920c33814e0605bdce501a5b23c2a3e5 tests/player-profile-verifier.test.mjs
```

### Independent QA: same-origin proxy · 19:46 UTC

После предыдущего gate отдельно проверены read-only исходники proxy и его
подключение перед static worker в `createAppServer`. Самостоятельный HTTP-тест
подтверждает точные байты приватного фото, обязательный no-store, сохранение
Origin/CSRF и только player-cookie, отсутствие Authorization/чужих feature-cookie
и влияния forwarded headers на фиксированный upstream. Другие API-префиксы и
health не уходят в player backend. Восемь авторских тестов исполнены отдельно:
callback 303/Set-Cookie без follow, multipart, лимиты входа/ответа, timeout/abort,
admission/client-cancel isolation. Новых дефектов в этой узкой области не найдено.

```text
node --test tests/player-profile-proxy.test.mjs tests/player-profile-verifier-proxy.test.mjs
tests 9 / pass 9 / fail 0 / skipped 0
```

`evidence_status=VERIFIED`, локальный proxy gate `PASS`; это не production-readback.
Прежние 15 независимых сценариев повторно не запускались, их scope не менялся.
Настоящий browser/runtime, внешние сервисы и production routing остаются BLOCKED.

Дополнительный SHA-256 manifest:

```text
ce149bd97b1b72f14b6567eea76ed66ccea91e4e58471582409fb436d60ddcf1 scripts/player-profile-proxy.mjs
2c246298f7d5fadf49568cd50b361a010326d454fac0cd67f00ba707c1a062e7 scripts/server.mjs
d4e13f143c2fafc25c2915b5a9a515e4bfee2ae48eb9777e36723abb3910aa4f tests/player-profile-proxy.test.mjs
54a677aaaf9562a90ac86e898732cd617ee777aab1217d170091c71b4c759415 tests/player-profile-verifier-proxy.test.mjs
```

### Independent QA: недоступный context и общий каталог · 19 октября, 11:49 UTC

После переноса публичных метаданных в `src/lib/player-profile-catalog.js`
старые hashes config `d1438d7…` и страницы `1647153f…` выше имеют статус `STALE`
для новой версии. Старые наблюдения сохранены; они не объявляются проверкой
обновлённой сборки. Backend config теперь импортирует/реэкспортирует общие
константы, fallback использует тот же каталог без персональных записей.

Независимый повтор `node --test tests/player-profile-verifier-ui.test.mjs`:
**7 tests / 7 PASS / 0 FAIL / 0 skipped**. Пять прежних lifecycle-сценариев
повторно прошли. Два новых различающих сценария подтвердили:

- Ошибка получения context для `Dis=cs` оставляет видимыми карточку CS2 и
  поля; ФИО необязательно. Вход Telegram/VK, сохранение, загрузка и текстовые
  поля заблокированы. Вызовов session/me/photo/save нет; сохранённые личность,
  данные и фотография не выдумываются.
- Ошибка context для неизвестного `Dis=unsupported` не подставляет CS2,
  карточку или форму; session/me/photo/save также не вызываются.

Локальный delta gate `PASS`, evidence `VERIFIED` только для названных React
сценариев. Это не проверка production API или реального браузера. Остальные
backend/packaging/build gates выполняет координатор отдельно; новые внешние
действия данным агентом не выполнялись.

Актуальный delta manifest SHA-256:

```text
5b33ac517c4653fb0ef450425cbd5450039417cf67f792dadf085a1e055fa42d src/lib/player-profile-catalog.js
98197ce923985d413b42e389ef4f9a543c874ee5160f8e063bd254c297abcf74 backend/player-profile-config.mjs
ddbbbcc4fbc72fcc86627920dbacd13b13921799b6f073d9498086d300cb7b7b src/components/PlayerProfilePage.jsx
03e74c55a89186fd26d7e932191932ea400bcc28eac36420d46bcab67c74614f tests/player-profile-verifier-ui.test.mjs
```
