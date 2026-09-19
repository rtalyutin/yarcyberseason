# Независимая проверка шага 6: Swiss и плей-офф

## Вердикт и границы

**Node/SSR gate — PASS: 8/8 независимых групп и 142/142 проектных тестов.** Нарушений в выполненной области не обнаружено. **Полная UI-приёмка — BLOCKED:** нет подтверждения браузерной геометрии на mobile/desktop, работы фокуса/прокрутки, раскрытия карточек и SVG-линий после гидрации. Это не PASS всего шага 6, шага 7 или выпуска.

Проверяющий: отдельный агент `/root/verify_swiss_playoffs`, не автор реализации. Фикстуры и исходные ожидания подготовлены до получения candidate; авторские тесты не использовались как единственный oracle. Браузерные действия, публикация, commit/push и изменение исходников/авторских тестов проверяющим не выполнялись. Независимые записи ограничены этим отчётом и `/tmp`.

## Объект и входы

| Объект | Закреплённая версия |
|---|---|
| Candidate | `d45bb7a4046187d5d09d3681a348dbd1bb7a11b3` |
| Remote code | `origin/codex/telegram-step6-sections`, `c62922a286497d75691338cd0bdc8fce309ea2c9`; tree побайтно совпадает с candidate (read-only локальная сверка) |
| Git tree candidate | `ebe8d03af37397ffcea234d0ba7ead7a7ffd2bf5` |
| База среза | `e12ed8d4786dee71df9eaae24f2aa8131a9de789` |
| Рабочая папка | `/workspace/scratch/4d5e017d884a/yarcyberseason` |
| ТЗ | `/tmp/ycs-miniapp-tz-current.md`, SHA-256 `6c2b5e949ac242820b3307baca79af421cb4b1d1a27d1df63a1ddd5b66a49039` |
| Область ТЗ | Stage/Table/Slot/edges; DATA-04/05; UI-02/03; QA-04/06/07/08/09/11/22/23/24 |
| Исполнение | Linux, Node `v24.19.0`, React SSR через esbuild из установленных зависимостей проекта |
| Время | 19.09.2026, UTC; регрессия и initial probe около 16:06:55; финальный probe 16:12:00.289 |
| SHA-256 фактически исполненного SSR bundle | `487587be7578aa7bc194f663c946337e91300c684b01944877480fb14791bb86` |

В начале прогона checkout был чистым. После финального прогона HEAD/tree те же; `git diff d45bb7a -- src tests scripts package.json package-lock.json vite.config.js` пуст. К завершению координатор изменил только документацию: `STATE.md` и новый `step6-brackets.md`; проверяющий добавил этот отчёт. Исполняемые файлы не менялись.

`git diff e12ed8d -- src/data` пуст: данные действующего турнира и реестр не менялись. SHA-256 Dota JSON — `7a190f528e58500ed4e84b407f36483a0123f23a92884e43a4702d4c9d86c6d7`, реестра — `ac48a0583d2e973d83dc42f4f6d4e9e16668f67e3b0eb68752668a4af39bacab`.

## Наблюдения

| Критерий | Различающий сценарий | Фактический результат |
|---|---|---|
| Действующий турнир без вымышленных результатов | `loadMiniAppModel` → интегрированный `TournamentScreen`, Swiss и playoffs | 16 участников, registration `closed`, 0 матчей, 7 пустых playoff slots; исходное пояснение сохранено; нет `0:0` или заглушки «раздел готовится»; соответствующий пункт имеет `aria-current=page` |
| Таблица Swiss передаёт публикацию | Две строки с обратным входным порядком position 2/1; отдельная группа без position; null, 0, необычная статистика 99; свои подписи колонок | Строки 1/2; строки без места сохраняют исходный порядок; null виден как `—`, нули сохранены, 99 не пересчитано; подписи карты/итога и исходное правило сохранены |
| Посев и фиксация | Seed 3/7, locked false/true | SSR: `QA Волна Посев 3`; `QA Маяк Посев 7 Место зафиксировано`; без самостоятельного посева |
| Очищенная сетка | 3 rounds, 2 опубликованных matches в первом, empty+confirmed во втором, третий пуст | В rounds 2/2/0 слотов; пустой слот остаётся `kind=empty`; опубликованные названия всех раундов сохранены; исходные данные после проекции не мутировали |
| Скрытые узлы/переходы | hidden source → visible target и visible source → hidden target | Hidden IDs, служебные marker-тексты и связанные переходы отсутствуют в модели и SSR |
| Только явные переходы | unconfirmed winner → empty target side 2; partial loser → тот же target без стороны | Ровно 2 transition buttons; обе `aria-controls` ссылаются на существующий DOM ID; winner/loser различены, targetSide 2/null сохранены |
| Пустая опубликованная схема | У source нет команд, но есть winnerTo к другому пустому объявленному слоту | 0 матчей, 1 явное ребро и 1 transition button; без `0:0` |
| Не синтезировать topology | Те же назначенные пары/раунды, но winnerTo/loserTo удалены | `edges=[]`, нет transition buttons/legend; следующий пустой слот не заполняется |
| Единый normalized result | В модели confirmed score заменён на sentinel 6:5; stages не содержат второй копии счёта | Matches и playoffs показывают один sentinel/6:5; прежний 2:0 и raw unconfirmed 9:4 отсутствуют |
| Частичная пара и неподтверждённость | Одна команда; completed без подтверждения; raw maps 87:43 | Неизвестный соперник обозначен; видна подпись ожидания подтверждения; raw score/maps не раскрыты |
| Технические/неизвестные результаты и ноль | walkover, bye, unknown без подтверждения, валидный BO3 0:2 | Оба раздела различают техническую победу/проход без игры/ожидание результата; ноль в подтверждённой серии сохранён |
| Валидация не ослаблена | Missing target, side 3, duplicate ID, подтверждённый победитель с конфликтующей заполненной стороной | Все 4 источника отвергнуты; отдельно проверено наличие Missing winnerTo / Invalid winnerTo slot / Duplicate declared match / Participant conflicts with winnerTo; пустая разрешённая сторона проходит |
| Регрессия | `node --test tests/*.test.mjs` | 142 tests, 142 pass, 0 fail/skipped/cancelled; включает community/tournament/matchday/sites и Telegram |

Swiss из SSR дал точные ячейки: `1 / QA Волна Посев 3 / — / — / 0 / — / Решение организатора`; `2 / QA Маяк Посев 7 Место зафиксировано / 0 / 0 / — / 0:0 / 0`. `0:0` здесь опубликованная ячейка карты таблицы, а не выдуманный результат матча.

## Воспроизведение и evidence

Из корня закреплённого checkout:

```sh
node /tmp/ycs-independent-brackets-probe.mjs
node --test tests/*.test.mjs
git diff --exit-code d45bb7a4046187d5d09d3681a348dbd1bb7a11b3 -- src tests scripts package.json package-lock.json vite.config.js
git diff --exit-code e12ed8d4786dee71df9eaae24f2aa8131a9de789 -- src/data
```

Первый probe дал 7/8: **ошибка тестового входа, не дефект приложения**. Фикстура объявляла `resultConfirmed=true`, `scoreKind=unknown`, без числового счёта — валидатор корректно вернул `Unresolved confirmed score`. Дополнительно до повторного прогона исправлен заведомо недопустимый confirmed BO3 0:0 на 0:2. Unknown проверен как completed/unconfirmed с raw 88:43: видна подпись ожидания, raw счёт скрыт. Критерий не смягчён: недопустимые подтверждённые данные должны отвергаться, неподтверждённые не должны показываться как результат. Приложение между прогонами не менялось. Initial output сохранён в `ycs-independent-brackets-result-initial.json` и `ycs-independent-brackets-probe-initial.log` в `/tmp`.

| Evidence в `/tmp` | SHA-256 |
|---|---|
| `ycs-independent-brackets-fixtures.mjs` | `f7f4c728f620ec8bc52141be1a0ec0513623978026719762030104e35f8d9c57` |
| `ycs-independent-brackets-probe.mjs` | `76cce562b98b3edb2c39748b97cfbcb04b6e12dd68ec14ec674daaa31bb58712` |
| `ycs-independent-brackets-result.json` | `3065cc0d712072825d7f226fd5566269ecb0f5d57f194323827ba234c05a8459` |
| `ycs-independent-brackets-regression.log` | `ef69e0d6c56e504de770f6792e5127076cdf879353a4dca10f39de9e54a1e92f` |

Сырые SSR-файлы в `/tmp`: `ycs-independent-real-swiss.html`, `ycs-independent-real-playoffs.html`, `ycs-independent-filled-swiss.html`, `ycs-independent-filled-playoffs.html`, `ycs-independent-no-edges.html`. Это SSR evidence, не снимки браузера. Программы и raw evidence находятся в `/tmp` текущей сессии; их содержимое не является частью приложения.

## Непроверенные критерии и передача

- Условие QA-16: viewport 360/390/430/768 и широкий desktop, увеличенный текст, отсутствие page-wide overflow — **NOT_VERIFIED**. Проверки CSS в регрессии не доказывают layout.
- Native disclosure, клавиатура, focus/scrollIntoView по переходу, ResizeObserver и SVG после гидрации/resize — **NOT_VERIFIED**. SVG в SSR пуст до эффекта измерения; отсутствие SSR paths не названо дефектом.
- Координатор сообщил, что browser preview `127.0.0.1:4175` возвращает `ERR_BLOCKED_BY_CLIENT`; это свидетельство координатора, не собственная браузерная проверка verifier. Обходов не было.
- Реальные Telegram Android/iOS/Desktop, reduced motion, touch и публичный хостинг — **NOT_VERIFIED** в этом задании. Установленная ранее приёмка шага 5 не подменяет эти сценарии нового среза.
- Build/production bundle проверяющим заново не создавался: разрешённые записи ограничены отчётом и `/tmp`. Приведён digest фактически исполненного SSR bundle; build автора не присвоен независимому прогону.

`handoff_schema=FEATURE_HANDOFF/1`; `handoff_digest=880ed9d2dc0004f39250f4a5c3739840cc1f9c4b37edf78b652dc787f5aa44e4` (QA reference-файл); `feature_id=telegram-miniapp-step6-brackets`; `artifact_revision=d45bb7a + неизменённые application/tests/config`; `evidence_status=VERIFIED` для Node/SSR; `gate_verdict=PASS` для этого gate, `BLOCKED` для полного UI gate; `action_decision=CONTINUE` только для получения недостающего UI evidence; `hypothesis_assessment=NOT_ASSESSED`; `operation_status=NOT_STARTED` для выпуска.

`next_action`: координатору выполнить разрешённую браузерную/Telegram приёмку того же application tree либо сохранить блокировку; изменение кода делает зависимые проверки STALE. `return_to=/root`. Этот отчёт не разрешает merge/push/publication.

