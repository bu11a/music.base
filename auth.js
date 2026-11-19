// Auth — всё, что связано с аккаунтом: регистрация, вход, выход, сессия.
// Пароли сюда не попадают надолго: они сразу уходят в Supabase Auth и нигде не сохраняются.
// Сессию (токены) хранит и обновляет сама библиотека supabase-js.
var Auth = (function () {
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var USERNAME_RE = /^[A-Za-z0-9_.-]{3,24}$/;
  var MIN_PASSWORD = 8;

  var client = null;
  var listeners = [];
  var manualSignOut = false;
  var state = {
    enabled: false,
    ready: false,
    user: null,
    profile: null
  };

  function configured() {
    var cfg = window.AppConfig;
    return !!(
      cfg &&
      cfg.SUPABASE_URL &&
      cfg.SUPABASE_ANON_KEY &&
      cfg.SUPABASE_URL.indexOf("YOUR-") === -1 &&
      cfg.SUPABASE_ANON_KEY.indexOf("YOUR-") === -1 &&
      window.supabase &&
      typeof window.supabase.createClient === "function"
    );
  }

  function info(event, extra) {
    var data = {
      event: event,
      enabled: state.enabled,
      ready: state.ready,
      user: state.user,
      profile: state.profile,
      expired: false
    };
    if (extra && extra.expired) {
      data.expired = true;
    }
    return data;
  }

  function emit(event, extra) {
    var data = info(event, extra);
    var i;
    for (i = 0; i < listeners.length; i += 1) {
      listeners[i](data);
    }
  }

  function fallbackProfile(user) {
    var meta = user.user_metadata || {};
    return {
      id: user.id,
      username: meta.username || String(user.email || "").split("@")[0],
      created_at: user.created_at
    };
  }

  function loadProfile(user) {
    return client
      .from("profiles")
      .select("id, username, created_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(function (res) {
        if (res.error || !res.data) {
          return fallbackProfile(user);
        }
        return res.data;
      }, function () {
        return fallbackProfile(user);
      });
  }

  function applySession(event, session) {
    var user = session ? session.user : null;
    var hadUser = !!state.user;
    var sameUser = !!(user && state.user && state.user.id === user.id);
    var extra = {};

    state.ready = true;

    if (!user) {
      // Выход без нажатия Logout = сессия закончилась (истёк токен, вход с другого места и т.п.).
      extra.expired = hadUser && !manualSignOut;
      manualSignOut = false;
      state.user = null;
      state.profile = null;
      emit(event, extra);
      return;
    }

    state.user = user;
    if (sameUser && state.profile) {
      emit(event);
      return;
    }
    state.profile = fallbackProfile(user);
    loadProfile(user).then(function (profile) {
      if (state.user && state.user.id === user.id) {
        state.profile = profile;
        emit(event);
      }
    });
  }

  function init() {
    if (!configured()) {
      state.enabled = false;
      state.ready = true;
      emit("DISABLED");
      return;
    }
    try {
      client = window.supabase.createClient(window.AppConfig.SUPABASE_URL, window.AppConfig.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,     // восстановление сессии после перезагрузки страницы
          autoRefreshToken: true,   // токен продлевается сам, пока вкладка открыта
          detectSessionInUrl: true  // ссылка подтверждения из письма сразу авторизует
        }
      });
    } catch (err) {
      console.warn("[auth] Supabase init failed", err);
      state.enabled = false;
      state.ready = true;
      emit("DISABLED");
      return;
    }
    state.enabled = true;

    // Supabase сам вызывает этот обработчик: при загрузке (INITIAL_SESSION),
    // входе, выходе и продлении токена. Запросы внутри делаем через setTimeout —
    // так рекомендует документация supabase-js, чтобы не получить взаимную блокировку.
    client.auth.onAuthStateChange(function (event, session) {
      window.setTimeout(function () {
        applySession(event, session);
      }, 0);
    });

    // Когда пользователь возвращается во вкладку, перепроверяем сессию.
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible" || !state.user) {
        return;
      }
      client.auth.getSession().then(function (res) {
        if (!res.data || !res.data.session) {
          applySession("SIGNED_OUT", null);
        }
      });
    });
  }

  // ---------- Проверки форм (выполняются до отправки в Supabase) ----------

  function validateRegister(values) {
    var errors = {};
    var username = String(values.username || "").trim();
    var email = String(values.email || "").trim();
    if (!USERNAME_RE.test(username)) {
      errors.username = "3–24 characters: letters, numbers, dot, dash or underscore.";
    }
    if (!EMAIL_RE.test(email)) {
      errors.email = "Enter a valid email address.";
    }
    if (String(values.password || "").length < MIN_PASSWORD) {
      errors.password = "Password must be at least " + MIN_PASSWORD + " characters.";
    }
    if (values.password !== values.confirm) {
      errors.confirm = "Passwords do not match.";
    }
    return errors;
  }

  function validateLogin(values) {
    var errors = {};
    if (!EMAIL_RE.test(String(values.email || "").trim())) {
      errors.email = "Enter a valid email address.";
    }
    if (!values.password) {
      errors.password = "Enter your password.";
    }
    return errors;
  }

  // ---------- Ошибки: показываем понятный текст, технические детали — только в консоль ----------

  function friendlyError(err) {
    var code = err && err.code ? String(err.code) : "";
    var message = err && err.message ? String(err.message) : "";
    if (err) {
      console.warn("[auth]", code || err.status, message);
    }
    if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
      return "Wrong email or password.";
    }
    if (code === "user_already_exists" || code === "email_exists" || /already registered/i.test(message)) {
      return "An account with this email already exists. Log in instead.";
    }
    if (code === "email_not_confirmed") {
      return "Confirm your email first — check your inbox.";
    }
    if (code === "weak_password") {
      return "This password is too weak. Try a longer one.";
    }
    if (err && (err.status === 429 || /rate limit/i.test(message))) {
      return "Too many attempts. Wait a minute and try again.";
    }
    if (/database error saving new user/i.test(message) || code === "unexpected_failure") {
      return "This username is already taken.";
    }
    if (code === "signup_disabled") {
      return "Registration is turned off right now.";
    }
    if (/fetch|network/i.test(message)) {
      return "No connection to the server. Check the internet and try again.";
    }
    return "Something went wrong. Please try again.";
  }

  // Если база ответила «токен недействителен» — значит сессия закончилась: выходим.
  function handleError(err) {
    if (!err || !client) {
      return false;
    }
    var message = String(err.message || "");
    if (err.status === 401 || err.code === "PGRST301" || err.code === "PGRST303" || /jwt expired/i.test(message)) {
      client.auth.signOut({ scope: "local" }).then(function () {
        applySession("SIGNED_OUT", null);
      });
      return true;
    }
    return false;
  }

  // ---------- Действия ----------

  function disabledResult() {
    return Promise.resolve({ ok: false, error: "Accounts are not configured yet." });
  }

  function usernameAvailable(name) {
    return client.rpc("username_available", { name: name }).then(function (res) {
      if (res.error) {
        // Не смогли проверить заранее — не страшно: уникальный индекс в базе всё равно не пропустит дубль.
        return true;
      }
      return res.data !== false;
    }, function () {
      return true;
    });
  }

  function signUp(values) {
    if (!client) {
      return disabledResult();
    }
    var username = String(values.username).trim();
    var email = String(values.email).trim().toLowerCase();
    return usernameAvailable(username).then(function (free) {
      if (!free) {
        return { ok: false, field: "username", error: "This username is already taken." };
      }
      return client.auth.signUp({
        email: email,
        password: values.password,
        options: {
          data: { username: username },
          emailRedirectTo: location.origin + location.pathname + "#home"
        }
      }).then(function (res) {
        if (res.error) {
          var text = friendlyError(res.error);
          return { ok: false, field: /username/.test(text) ? "username" : /email/i.test(text) ? "email" : "", error: text };
        }
        // При включённом подтверждении email Supabase не раскрывает, что адрес занят:
        // возвращает пользователя без identities. Так мы понимаем, что аккаунт уже есть.
        if (res.data.user && res.data.user.identities && res.data.user.identities.length === 0) {
          return { ok: false, field: "email", error: "An account with this email already exists. Log in instead." };
        }
        if (!res.data.session) {
          return { ok: true, needsConfirmation: true };
        }
        return { ok: true };
      });
    }).catch(function (err) {
      return { ok: false, error: friendlyError(err) };
    });
  }

  function signIn(values) {
    if (!client) {
      return disabledResult();
    }
    return client.auth.signInWithPassword({
      email: String(values.email).trim().toLowerCase(),
      password: values.password
    }).then(function (res) {
      if (res.error) {
        return { ok: false, error: friendlyError(res.error) };
      }
      return { ok: true };
    }).catch(function (err) {
      return { ok: false, error: friendlyError(err) };
    });
  }

  function signOut() {
    if (!client) {
      return Promise.resolve();
    }
    manualSignOut = true;
    return client.auth.signOut().then(function (res) {
      if (res && res.error) {
        // Сервер недоступен — всё равно забываем сессию в этом браузере.
        return client.auth.signOut({ scope: "local" });
      }
      return res;
    }).catch(function () {
      return client.auth.signOut({ scope: "local" });
    });
  }

  function subscribe(listener) {
    listeners.push(listener);
    if (state.ready) {
      listener(info("SUBSCRIBED"));
    }
  }

  function displayName() {
    if (!state.user) {
      return "";
    }
    return (state.profile && state.profile.username) || fallbackProfile(state.user).username;
  }

  return {
    init: init,
    subscribe: subscribe,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    validateRegister: validateRegister,
    validateLogin: validateLogin,
    handleError: handleError,
    displayName: displayName,
    client: function () { return client; },
    user: function () { return state.user; },
    profile: function () { return state.profile; },
    isEnabled: function () { return state.enabled; },
    isReady: function () { return state.ready; }
  };
})();
