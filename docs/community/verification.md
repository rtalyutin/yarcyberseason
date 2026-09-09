# Проверка реализации пунктов 2–5

База: `06bc55ec74490abeea96f4c5aea5bcaabd2f8c34` (main, последнее размытие фона Dota). Проверена локальная реализация; отправка в репозиторий и обновление сайта не выполнялись.

| Проверка | Результат |
| --- | --- |
| Production-сборка | Успешна; сформированы клиент, Worker и hosting manifest |
| `test:sites` | 4/4 |
| `test:matchday` | 5/5 |
| `test:tournament` | 6/6 |
| `test:community` | 14/14, включая рендер 70 страниц команд и 120 страниц матчей на реальных JSON без браузера |
| Сохранение исходных значений | Все старые поля совпадают с миграционной ведомостью; дополнительные метаданные не изменяют числа, форматы, названия и даты |
| iCalendar, независимый Python-парсер `icalendar` | 70 сгенерированных лент разобраны; отдельные синтетические назначение и отмена проверены по DTSTART, UID, SEQUENCE и STATUS |
| Независимый анализ кода | Найденные сценарии внесены в исправления и регрессионные тесты |
| `git diff --check` | Без ошибок |

Исправлены обнаруженные сценарии: отсутствие раундов карты в PNG, потеря известного года в подписи даты, пропуск противоречия карт серии, противоречие участника связи сетки, ошибочный счётчик подтверждённых результатов, показ сырого неподтверждённого счёта в сетке, противоречивый BO1, исчезновение частично назначенной встречи из блока ближайшей игры и ID, несовместимый с маршрутом.

В исходнике `dota-main-group-16` опубликован BO3 1:1. Формат и числа сохранены; добавлена явная пометка неизвестного итога. Эта встреча исключена из новых итоговых расчётов и скачивания карточки до уточнения.

Не выполнены: проверка интерфейса и фактического скачивания PNG в браузере, подписка в настольном/мобильном календарном клиенте, аудит инфраструктурных access-логов и проверка рабочего сайта после выпуска. Рендер HTML и разбор ICS эти проверки не заменяют.

Ссылка на Telegram-чат по договорённости остаётся `null`. Для исторических дат без подтверждённого времени/пояса события не создаются. Сейчас все ленты пусты; работа назначений, переносов и отмен проверялась на отдельных синтетических данных, не добавленных в турнирные JSON.

## Dota registration and cross-discipline teams — 2026-09-09

Implemented against `97c5084922390773a79d24d6efd88e97c56c56e7`:
- 16 organizer-provided names, 8 reused IDs + 8 new IDs, 50 canonical teams, 86 bindings and the same 28 aliases.
- Shared closed-registration state and participants section; Dota/CS2 history, statistics and empty roster states separated.
- 20 community tests, 6 tournament tests and 4 Sites packaging tests passed; production build passed.
- Independent read-only verifier deep-compared all 120 raw and normalized matches, historical tournament JSON, existing aliases/bindings, logos and historical discipline statistics with HEAD. No changes to those historical facts.
- Browser checked the home CTA, participants, same-page navigation from info back to participants, and KEGA's separate Dota/CS2 histories at the available 1363px viewport. No horizontal overflow on that team page. The full 390/1440/2560 viewport matrix has not been executed.
- No supported roster input exists: do not claim the hypothetical published-CS2-only-roster case was tested.
- The external Yandex team form remains available for submission; the browser is not signed in as its owner. Form settings were not changed. Solo registration is unchanged pending the organizer's decision.
- Changes are prepared for review; production deployment is not part of this verification.
