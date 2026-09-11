# Независимая проверка шага 1

Проверяющий: `/root/verify_step1`, 11.09.2026; read-only, Node v24.19.0.
Проверенная база: `90126c18dbbf47af9ed00bebc030cc425e273cef`.
Вердикт: **PASS подготовки основы**, не приёмка приложения или выпуска.

## Проверка исходников

Выполнено:

```sh
git branch --show-current
git rev-parse HEAD
git for-each-ref --format='%(refname) %(objectname)' refs/remotes
git diff --exit-code 90126c18dbbf47af9ed00bebc030cc425e273cef -- src public package.json package-lock.json vite.config.mjs worker scripts tests .openai/hosting.json AGENTS.md
git status --short
```

Наблюдение: ветка `codex/telegram-miniapp`; HEAD и локальный origin/main равны указанной базе; diff исходников exit 0, пустой. На старте чисто, к окончанию проверки только новые документы `docs/telegram-miniapp/`. Прежняя локальная ветка сохранена на `da2ddcf4085eb247feb66aae56dfaaf661f29cd6`. Удалённый GitHub verifier не запрашивал; main проверял основной исполнитель через ls-remote/fetch.

Прочитаны ТЗ, AGENTS.md и релевантные исходники. SHA-256 ТЗ: `8c89b5ea1a07a8131b420b12a9f5eb9f66264bfb405252fe7e74733380a774cb`.

## Независимо вычисленные данные

Node прочитал пять JSON и реестр; исполнены participantCount, flattenMatches, getTournamentModel, validateCommunity, buildCommunityModel.

- Dota slug/id `dota2-autumn-2026`; даты 2026-10-10–2026-10-25.
- 16 записей/16 уникальных участников; closed/capacity_reached/capacity16.
- Отсутствующие команды и bindings: пустые списки.
- Swiss: 0 groups/0 строк. Playoffs: 7 ID-only слотов (upper 4, lower 2, final 1).
- flattenMatches и getTournamentModel для выбранного турнира: 0 матчей; итогов нет.
- Общий validateCommunity: `[]`. Реестр: 50 команд/28 aliases; общая модель: 120 матчей.
- PIVNAYA KEGA, psb_bank, РГАТУ имеют cs2-prefixed ID и корректные Dota bindings; РГАТУ имеет каноническое имя bobr1ki. Использование названия участия обязательно.
- Стек, два будущих экрана, явный выбор турнира и ограничения переиспользования компонентов соответствуют ТЗ. Существенных расхождений ТЗ с базой не найдено.

## Исполненная репродукция DATA-05

```sh
node --input-type=module <<'NODE'
import {flattenMatches,validateCommunity} from './src/lib/community.js';
const registry={
  teams:[
    {id:'alpha',name:'Alpha',disciplines:['Dota 2']},
    {id:'beta',name:'Beta',disciplines:['Dota 2']}
  ],
  bindings:[
    {tournamentId:'fixture',sourceName:'Alpha',teamId:'alpha'},
    {tournamentId:'fixture',sourceName:'Beta',teamId:'beta'}
  ],
  aliases:[]
};
for(const target of ['m2','missing']){
  const t={
    id:'fixture',slug:'fixture',discipline:'Dota 2',
    stages:[{
      id:'playoffs',type:'double_elimination',
      matches:[
        {id:'m1',team1:'Alpha',team2:'Beta',status:'scheduled',
         winnerTo:{matchId:target,slot:1}},
        {id:'m2'}
      ]
    }]
  };
  console.log(JSON.stringify({
    target,
    declaredIds:t.stages[0].matches.map(m=>m.id),
    flattenedIds:flattenMatches([t]).map(m=>m.id),
    errors:validateCommunity([t],registry)
  }));
}
NODE
```

Фактический stdout, exit 0:

```json
{"target":"m2","declaredIds":["m1","m2"],"flattenedIds":["m1"],"errors":["Missing winnerTo: m1"]}
{"target":"missing","declaredIds":["m1","m2"],"flattenedIds":["m1"],"errors":["Missing winnerTo: m1"]}
```

Существующий пустой слот ошибочно отклоняется; отсутствующий ID отклоняется правильно. Дефект не исправлен в шаге 1; относится к будущему DATA-05/QA-22–23.

## Граница проверки

Проверяющий не запускал полный набор тестов/сборку и не выдаёт их результаты за своё evidence. Браузер, визуальная регрессия, Telegram, production, настройки бота и публикация не проверялись. Проверены ключевые утверждения создаваемого STATE.md о базе, scope и данных. Следующий результат — контракты L0; PASS не разрешает выпуск.
