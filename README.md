# music.base

Музыкальный веб-плеер на чистом HTML/CSS/JS + аккаунты и избранное на Supabase.

## Как устроен проект

| Файл | Что делает |
|---|---|
| `index.html` | Разметка: сайдбар, плеер, модалка «войдите», подключение скриптов |
| `config.js` | URL проекта Supabase и **публичный** anon-ключ |
| `data.js` | Каталог треков и плейлистов |
| `player.js` | Модуль `Player`: очередь, аудио, громкость, «недавние», состояние лайков |
| `auth.js` | Модуль `Auth`: регистрация, вход, выход, восстановление и окончание сессии |
| `favorites.js` | Модуль `Favorites`: избранное в таблице `favorites` |
| `main.js` | Роутинг по `#hash` и отрисовка страниц (Home, Search, Login, Register, Profile…) |
| `supabase/schema.sql` | Таблицы `profiles` и `favorites`, триггер, RLS-политики |

Порядок данных при лайке: клик по ♥ → `Player.toggleLike` → `Favorites.toggle` →
если гость — модалка «Log in / Sign up»; если вошёл — запрос в Supabase, а база по RLS
проверяет, что запись принадлежит именно этому пользователю.

## Настройка Supabase (один раз)

1. Создайте проект на [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → вставьте `supabase/schema.sql` → **Run**.
3. **Authentication → Sign In / Providers → Email**:
   - чтобы после регистрации пользователь входил **сразу**, выключите **Confirm email**;
   - если оставить подтверждение включённым, после регистрации появится сообщение «проверьте почту».
4. **Authentication → URL Configuration → Site URL** — адрес, где открыт сайт
   (например `https://bu11a.github.io/music.base/`).
5. **Project Settings → API** → скопируйте *Project URL* и *anon / publishable key* в `config.js`.

> `anon`-ключ публичный по замыслу Supabase — его безопасно держать во фронтенде, потому что
> все права ограничены RLS. **Ключ `service_role` (secret) во фронтенд не добавлять никогда.**

Если `config.js` не заполнен или CDN Supabase недоступен, плеер работает как раньше,
просто без аккаунтов и избранного.

## Запуск локально

Нужен любой статический сервер (из-за `fetch` и сессий открывать через `file://` не стоит):

```bash
python3 -m http.server 8000
# открыть http://localhost:8000
```
