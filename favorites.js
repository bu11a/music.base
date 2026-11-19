// Favorites — избранное пользователя в таблице public.favorites (PostgreSQL / Supabase).
// Какие строки можно читать и менять, решает не этот код, а RLS-политики в базе:
// даже подделанный запрос не доберётся до чужого избранного.
var Favorites = (function () {
  var LEGACY_KEY = "music.base";
  var hooks = { onAuthRequired: function () {}, onError: function () {} };
  var pending = {};
  var loadedFor = "";

  function init(options) {
    if (options && options.onAuthRequired) {
      hooks.onAuthRequired = options.onAuthRequired;
    }
    if (options && options.onError) {
      hooks.onError = options.onError;
    }
    // Все клики по сердечку (в карточках, строках и плеере) идут через Player.toggleLike,
    // а он передаёт их сюда. Так логика лайков живёт в одном месте.
    Player.setLikeHandler(toggle);
  }

  function toMap(rows) {
    var map = {};
    var i;
    for (i = 0; i < rows.length; i += 1) {
      map[rows[i].track_id] = true;
    }
    return map;
  }

  // Раньше лайки лежали в localStorage. Один раз переносим их в аккаунт и убираем из браузера.
  function takeLegacyLikes() {
    var ids = [];
    try {
      var raw = localStorage.getItem(LEGACY_KEY);
      var saved = raw ? JSON.parse(raw) : null;
      if (!saved || !saved.liked) {
        return ids;
      }
      Object.keys(saved.liked).forEach(function (id) {
        if (saved.liked[id] && findTrack(id)) {
          ids.push(id);
        }
      });
      delete saved.liked;
      localStorage.setItem(LEGACY_KEY, JSON.stringify(saved));
    } catch (err) {
      return [];
    }
    return ids;
  }

  function migrateLegacy(client) {
    var ids = takeLegacyLikes();
    if (!ids.length) {
      return Promise.resolve();
    }
    return client
      .from("favorites")
      .upsert(ids.map(function (id) { return { track_id: id }; }), { onConflict: "user_id,track_id", ignoreDuplicates: true })
      .then(function (res) {
        if (res.error) {
          console.warn("[favorites] legacy migration failed", res.error.message);
        }
      });
  }

  function load() {
    var client = Auth.client();
    var user = Auth.user();
    if (!client || !user) {
      clear();
      return Promise.resolve();
    }
    loadedFor = user.id;
    return migrateLegacy(client).then(function () {
      return client.from("favorites").select("track_id").order("created_at", { ascending: false });
    }).then(function (res) {
      // Пока шёл запрос, пользователь мог выйти или смениться — тогда ответ уже не нужен.
      if (!Auth.user() || Auth.user().id !== loadedFor) {
        return;
      }
      if (res.error) {
        if (!Auth.handleError(res.error)) {
          hooks.onError("Could not load your favorites.");
        }
        return;
      }
      Player.setLiked(toMap(res.data || []));
    });
  }

  function clear() {
    loadedFor = "";
    pending = {};
    Player.setLiked({});
  }

  function toggle(trackId) {
    var client = Auth.client();
    var user = Auth.user();
    var on;
    var request;

    if (!Auth.isEnabled()) {
      hooks.onError("Accounts are not configured yet, so favorites are off.");
      return;
    }
    if (!user) {
      hooks.onAuthRequired();
      return;
    }
    if (!findTrack(trackId) || pending[trackId]) {
      return;
    }

    on = !Player.isLiked(trackId);
    pending[trackId] = true;
    // Сразу красим сердечко, не дожидаясь ответа сервера; при ошибке вернём как было.
    Player.setLike(trackId, on);

    request = on
      ? client.from("favorites").insert({ track_id: trackId })
      : client.from("favorites").delete().eq("user_id", user.id).eq("track_id", trackId);

    request.then(function (res) {
      delete pending[trackId];
      // 23505 = такая запись уже есть (например, добавили в другой вкладке) — это не ошибка.
      if (!res.error || (on && res.error.code === "23505")) {
        return;
      }
      if (Auth.user() && Auth.user().id === user.id) {
        Player.setLike(trackId, !on);
      }
      if (!Auth.handleError(res.error)) {
        hooks.onError(on ? "Could not save this song. Try again." : "Could not remove this song. Try again.");
      }
    }, function () {
      delete pending[trackId];
      Player.setLike(trackId, !on);
      hooks.onError("No connection to the server. Try again.");
    });
  }

  return {
    init: init,
    load: load,
    clear: clear,
    toggle: toggle
  };
})();
