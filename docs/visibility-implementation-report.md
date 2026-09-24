# Реализация доработок видимости ЯрКиберСезона

**Сборка:** 24 сентября 2026 г.
**Статус:** реализовано в проекте; production-публикация не выполнялась.

## Что сделано

- Настроен prerender главной страницы, архива, турниров, команд, опубликованных матчей, раздела WebMCP и остальных публичных маршрутов. HTML содержит основной заголовок и содержание до запуска JavaScript.
- Для маршрутов добавлены собственные `title`, `description`, canonical и Open Graph метаданные. У `/tournaments/next` canonical ведёт на страницу турнира; alias исключён из sitemap.
- Генерируются `sitemap.xml` и `robots.txt` с одним каноническим origin в punycode. Sitemap содержит только уникальные URL, без искусственных `lastmod`.
- Worker отдаёт файл соответствующего prerender-маршрута, сохраняет специальные SPA-маршруты `/tg` и `/forMari`, возвращает 404 для неизвестных страниц, отсутствующих API/assets и запросов на запись. Поддержаны GET и HEAD.
- Основные переходы между публичными страницами сделаны обычными ссылками, включая карточки архива и ссылку «Данные для ИИ».
- WebMCP оставлен read-only и читает тот же публичный набор данных, что сайт. Ответы содержат `dataVersion`, время сборки и абсолютные URL. Для каждого участия команды статус состава указывается отдельно (`published` или `unknown`); состав раскрывает только публичные имена и роли.
- `dataVersion` вычисляется из публичных данных, включая составы, и меняется при изменении одного только состава.

## Проверка prerender-маршрутов

Снимки ниже считаны из собранных HTML-файлов до JavaScript. Worker-тесты проверяют HTTP-статусы на локальной сборке с тестовой статической привязкой.

| Маршрут | Статус в Worker-тесте | H1 до JS | Canonical | Sitemap |
|---|---:|---|---|---|
| `/` | 200 | Твоя команда. Твой сезон. | `/` | да |
| `/results` | 200 | Каждый турнир остаётся в сезоне | `/results` | да |
| `/tournaments/dota2-autumn-2026` | 200 | Dota 2 / YCS | `/tournaments/dota2-autumn-2026` | да |
| `/tournaments/next` | 200 | Dota 2 / YCS | `/tournaments/dota2-autumn-2026` | нет |
| `/teams/cs2-august-2026-pivnaya-kega` | 200 | PIVNAYA KEGA | собственный URL | да |
| `/tournaments/cs2-august-2026/matches/cs2-aug-grand-final` | 200 | bobr1ki — PIVNAYA KEGA | собственный URL | да |
| `/webmcp` | 200 | Турниры. Матчи. Команды. | `/webmcp` | да |
| Неизвестная команда или матч | 404 | Страница не найдена | — | нет |

Sitemap содержит **182 уникальных канонических URL**. Страница осеннего турнира включает даты 10–25 октября 2026, лимит 16 команд и статус закрытой регистрации. Страница финала CS2 включает подтверждённый счёт 2:3. Эти данные проверяются автоматическими тестами против исходных JSON.

## Проверка WebMCP

Пример ответа `ycs_get_team` для PIVNAYA KEGA (состав сокращён до одной записи):

```json
{
  "dataVersion": "sha256:62b4a62e48f6e5372d70668bde70b4733482e79e3d4d63df03f25651a5533014",
  "buildGeneratedAt": "2026-09-24T09:17:30.262Z",
  "team": {
    "name": "PIVNAYA KEGA",
    "absoluteUrl": "https://xn--90aiaibl0ahlel5n.xn--p1ai/teams/cs2-august-2026-pivnaya-kega",
    "entries": [
      { "tournamentId": "cs2-august-2026", "rosterStatus": "unknown" },
      {
        "tournamentId": "dota2-autumn-2026",
        "rosterStatus": "published",
        "roster": {
          "memberCount": 5,
          "example": { "name": "Pryzrock", "role": "Игрок" },
          "pageUrl": "https://xn--90aiaibl0ahlel5n.xn--p1ai/teams/cs2-august-2026-pivnaya-kega"
        }
      }
    ]
  }
}
```

Тесты также проверяют отсутствие контактов, дат рождения и идентификаторов Steam/Telegram в ответе, а также недоступность неопубликованных матчей.

## Сборка и тесты

- `npm run build` — успешно; собраны клиент, prerender-маршруты, Worker и hosting metadata.
- `npm run test:sites` — 6/6.
- `npm run test:webmcp` — 11/11.
- `npm run test:data-version` — 1/1.
- `npm run test:tournament` — 6/6.
- `npm run test:matchday` — 8/8.
- `npm run test:community` — 25/25.
- `npm run test:telegram` — 82/82.

Итого **139 тестов пройдено** в семи наборах.

Отдельный `npm run test:data` даёт 4/6. Его два падения не связаны с изменёнными файлами: тест запрашивает отсутствующий в текущем Git-клоне commit `2800ce2e4aa48642ffe0f86343b2ffb0b160bc40` и ожидает отсутствие состава Mi Ne Pushim, который уже опубликован в текущих данных. Остальные четыре проверки проходят. Данные не менялись ради обхода этих устаревших ожиданий.

Сборка сохраняет существующие предупреждения Vite о шрифтах `NimbusSansNarrow-Regular.otf` и `NimbusSansNarrow-Bold.otf`: пути к файлам оставлены для разрешения при runtime.

## Границы проверки

- Удалось проверить prerender HTML и Worker на локальной сборке. Проверка после гидратации в браузере не завершена: локальный preview-сервер не смог открыть сетевой интерфейс (`uv_interface_addresses returned Unknown system error 1`), а браузерное подключение к `terminal.local:4173` завершилось `ERR_CONNECTION_REFUSED`.
- Тестовая статическая привязка подтверждает логику Worker, но не заменяет проверку на реальном хостинге.
- Не выполнялись production-публикация, настройка Google Search Console/Яндекс Вебмастера, проверка индексации и внешних цитирований ИИ-поиском.
