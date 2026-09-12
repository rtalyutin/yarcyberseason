# L0-контракты Telegram Mini App

Статус: исполняемая граница слоёв для ТЗ 1.1. Этот пакет не реализует экран, адаптер данных, Telegram bridge, manifest-файл сборки или публикацию.

## Что теперь зафиксировано

```text
src/data/tournaments/dota2-autumn-2026.json
                         │
                         ▼
                 L2 buildMiniAppModel
                         │ MiniAppModel v1
                         ▼
/tg ───────────────► HOME SCREEN
  │
  └─ /tg/tournament?section=… ─► TOURNAMENT SCREEN
                                      │
                                      ├─ RuntimePort: browser
                                      └─ RuntimePort: telegram

общая сборка ─► VersionManifest v1 ─► проверка обновления
```

На схеме только два будущих экрана. `section` меняет раздел внутри экрана турнира, а не создаёт страницу.

## Авторитетные файлы

| Контракт | Файл | Что проверяется сейчас |
| --- | --- | --- |
| Выбор турнира и разделы | `src/telegram/config.js` | slug фиксирован; botUsername остаётся `null` до выпуска |
| Маршрут, DTO, действия, порт, manifest | `src/telegram/contracts.js` | чистые функции и структурные guards без DOM/Telegram/сети |
| Реальные и синтетические входы | `tests/fixtures/telegram/fixtures.mjs` | реальный JSON читается из source; вымышленные данные явно помечены `fixture: true` |
| Исполняемая приёмка L0 | `tests/telegram-contracts.test.mjs` | маршруты, startapp, безопасность действий, RuntimePort, manifest, DTO и fixtures |

## Маршруты

| Вход | Результат | Канонический URL |
| --- | --- | --- |
| `/tg` | главная | `/tg` |
| `/tg/` | главная | `/tg` |
| `/tg/tournament` | турнир / `overview` | `/tg/tournament` |
| `/tg/tournament?section=participants` | турнир / `participants` | тот же |
| Любой другой разрешённый `section` | тот же экран турнира | соответствующий query |
| Неизвестный или недоступный `section` | турнир / `overview` | `/tg/tournament` |
| Неизвестный путь внутри `/tg/…` | главная + сообщение о недоступном разделе | `/tg` |
| Путь вне точного `/tg`-пространства | L0 возвращает `null`; работает обычный сайт | без изменения |

Параметр `tournament` не участвует в выборе. Единственный турнир задаёт `MINI_APP_CONFIG.tournamentSlug`.

## Разрешённые launch targets

`home`, `tournament`, `participants`, `rules`, `schedule`, `matches`, `swiss`, `playoffs`, `results`.

Неизвестное значение возвращает `null`, URL в payload не исполняется. Если `results` отсутствует в доступных разделах модели, target нормализуется к `overview`.

## Модель и ссылки сетки

- `MiniAppModel.schemaVersion = 1`.
- `matches[]` владеет нормализованным результатом матча.
- Заполненный слот этапа содержит только `matchKey`, указывающий на существующий `matches[]`.
- Пустой слот не имеет `matchKey` и не дублирует raw-счёт, команды или результат.
- `validateMiniAppModel()` отклоняет другой slug, дубликаты match key, неправильные sections/actions и ссылку слота на отсутствующий match.
- Предметная проверка исходного JSON и построение модели остаются ответственностью L2 шага 3.

## RuntimePort

Frontend получает один порт вида `browser` или `telegram` с методами:

```text
init → ready → readLaunchTarget
setBackHandler
openExternal
onResume → unsubscribe
dispose
```

`assertRuntimePort()` отклоняет неполную реализацию до подключения к экрану. Ни один L0-модуль напрямую не читает `window.Telegram`.

## VersionManifest

```json
{
  "schemaVersion": 1,
  "buildId": "непустой идентификатор полного набора файлов",
  "sourceCommit": "commit выпуска",
  "tournamentSlug": "dota2-autumn-2026"
}
```

L0 проверяет форму manifest и выбранный slug. Генерация `buildId`, запись `tg-version.json`, fetch и кэширование относятся к L5/L3 и сейчас не выполняются.

## Матрица fixtures

| Fixture | Назначение | Публикуемый факт |
| --- | --- | --- |
| `real-dota2-autumn-2026` | текущий JSON + реестр проекта | да, читается напрямую из source |
| `empty` | отсутствие матчей/таблиц | нет, `fixture: true` |
| `scheduled-match` | назначенный матч | нет |
| `confirmed-result` | подтверждённая серия | нет |
| `unconfirmed-result` | счёт не создаёт победителя | нет |
| `technical-victory` | отдельная семантика technical | нет |
| `invalid-team-reference` | ошибка participant/team binding | нет |
| `hidden-bracket-match` | `published=false` | нет |
| `assigned-to-empty-slot` | m1 → объявленный ID-only m2 | нет |

Последний fixture пока воспроизводит известный разрыв общего валидатора и предназначен для узкого исправления DATA-05 на шаге 3. L0 не ослабляет текущую проверку.

## Gate следующего шага

L1/L2/L4 могут начинаться после выполнения `npm run test:telegram` и независимой проверки, что:

1. маршруты не создают третий экран и не выбирают другой турнир;
2. внешний URL не проходит без безопасного HTTPS;
3. слот сетки ссылается на единый match/result;
4. все девять fixtures присутствуют и синтетические результаты невозможно принять за реальные;
5. обычные тесты и сборка сайта не регрессировали.

