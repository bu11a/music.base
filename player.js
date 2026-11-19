var Player = (function () {
  var audio = new Audio();
  var listeners = [];
  var seeking = false;
  var likeHandler = null;
  var state = {
    queue: [],
    index: -1,
    playing: false,
    volume: 0.8,
    liked: {},
    recent: [],
    fullOpen: false,
    error: "",
    currentTime: 0,
    duration: 0
  };

  function emit(reason) {
    var snapshot = getSnapshot();
    snapshot.reason = reason;
    var i;
    for (i = 0; i < listeners.length; i += 1) {
      listeners[i](snapshot);
    }
  }

  function getSnapshot() {
    return {
      queue: state.queue,
      index: state.index,
      track: currentTrack(),
      playing: state.playing,
      volume: state.volume,
      liked: state.liked,
      recent: state.recent.slice(),
      fullOpen: state.fullOpen,
      error: state.error,
      currentTime: state.currentTime,
      duration: state.duration,
      seeking: seeking
    };
  }

  function currentTrack() {
    if (state.index < 0) {
      return null;
    }
    return state.queue[state.index] || null;
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem("music.base");
      if (!raw) {
        return;
      }
      var saved = JSON.parse(raw);
      // Избранное теперь хранится в аккаунте (Supabase), а не в браузере — см. favorites.js.
      if (saved.recent && saved.recent.length) {
        state.recent = saved.recent;
      }
      if (typeof saved.volume === "number") {
        state.volume = saved.volume;
      }
    } catch (err) {
      return;
    }
  }

  function saveStore() {
    try {
      var saved = JSON.parse(localStorage.getItem("music.base") || "{}") || {};
      saved.recent = state.recent;
      saved.volume = state.volume;
      // Старые лайки (если остались) не трогаем: favorites.js перенесёт их в аккаунт при входе.
      localStorage.setItem("music.base", JSON.stringify(saved));
    } catch (err) {
      return;
    }
  }

  function remember(track) {
    if (!track) {
      return;
    }
    var next = [track.id];
    var i;
    for (i = 0; i < state.recent.length; i += 1) {
      if (state.recent[i] !== track.id) {
        next.push(state.recent[i]);
      }
    }
    state.recent = next.slice(0, 12);
    saveStore();
  }

  function tracksForArtist(name) {
    var list = [];
    var i;
    for (i = 0; i < MusicData.tracks.length; i += 1) {
      if (MusicData.tracks[i].artist === name) {
        list.push(MusicData.tracks[i]);
      }
    }
    return list;
  }

  function likedTracks() {
    var list = [];
    var i;
    var track;
    for (i = 0; i < MusicData.tracks.length; i += 1) {
      track = MusicData.tracks[i];
      if (state.liked[track.id]) {
        list.push(track);
      }
    }
    return list;
  }

  function buildQueue(context) {
    var playlist;
    if (!context || context === "all" || context === "library") {
      return MusicData.tracks.slice();
    }
    if (context === "liked") {
      return likedTracks();
    }
    if (context === "recent") {
      return tracksByIds(state.recent);
    }
    if (context.indexOf("playlist:") === 0) {
      playlist = findPlaylist(context.slice(9));
      return playlist ? tracksByIds(playlist.trackIds) : [];
    }
    if (context.indexOf("artist:") === 0) {
      return tracksForArtist(context.slice(7));
    }
    if (context.indexOf("ids:") === 0) {
      return tracksByIds(context.slice(4).split(","));
    }
    return MusicData.tracks.slice();
  }

  function loadCurrent(shouldPlay) {
    var track = currentTrack();
    if (!track) {
      return;
    }
    state.error = "";
    state.currentTime = 0;
    state.duration = 0;
    audio.src = track.src;
    audio.volume = state.volume;
    emit("track");
    if (!shouldPlay) {
      return;
    }
    var pending = audio.play();
    if (pending && pending.catch) {
      pending.catch(function () {
        state.playing = false;
        emit("pause");
      });
    }
  }

  function playFrom(id, context) {
    var queue = buildQueue(context);
    var index = 0;
    var i;
    if (!queue.length) {
      return;
    }
    for (i = 0; i < queue.length; i += 1) {
      if (queue[i].id === id) {
        index = i;
      }
    }
    state.queue = queue;
    state.index = index;
    loadCurrent(true);
  }

  function toggle() {
    var track = currentTrack();
    if (!track) {
      playFrom(MusicData.tracks[0].id, "all");
      return;
    }
    if (audio.paused) {
      var pending = audio.play();
      if (pending && pending.catch) {
        pending.catch(function () {
          state.playing = false;
          emit("pause");
        });
      }
      return;
    }
    audio.pause();
  }

  function next() {
    if (!state.queue.length) {
      playFrom(MusicData.tracks[0].id, "all");
      return;
    }
    state.index += 1;
    if (state.index >= state.queue.length) {
      state.index = 0;
    }
    loadCurrent(true);
  }

  function previous() {
    if (!state.queue.length) {
      playFrom(MusicData.tracks[0].id, "all");
      return;
    }
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    state.index -= 1;
    if (state.index < 0) {
      state.index = state.queue.length - 1;
    }
    loadCurrent(true);
  }

  function seek(ratio) {
    if (!isFinite(state.duration) || state.duration <= 0) {
      return;
    }
    var nextTime = Math.min(state.duration, Math.max(0, ratio * state.duration));
    audio.currentTime = nextTime;
    state.currentTime = nextTime;
  }

  function setSeeking(value) {
    seeking = value;
  }

  function setVolume(value) {
    var nextVolume = Math.min(1, Math.max(0, value));
    state.volume = nextVolume;
    audio.volume = nextVolume;
    saveStore();
    emit("volume");
  }

  function toggleLike(id) {
    var trackId = id;
    if (!trackId && currentTrack()) {
      trackId = currentTrack().id;
    }
    if (!trackId) {
      return;
    }
    if (likeHandler) {
      likeHandler(trackId);
      return;
    }
    setLike(trackId, !state.liked[trackId]);
  }

  // Кто решает, можно ли лайкать (например, нужен ли вход). Без обработчика — старое поведение.
  function setLikeHandler(handler) {
    likeHandler = typeof handler === "function" ? handler : null;
  }

  function setLike(id, on) {
    if (on) {
      state.liked[id] = true;
    } else {
      delete state.liked[id];
    }
    emit("like");
  }

  function setLiked(map) {
    var next = {};
    var id;
    for (id in map) {
      if (Object.prototype.hasOwnProperty.call(map, id) && map[id]) {
        next[id] = true;
      }
    }
    state.liked = next;
    emit("like");
  }

  function isLiked(id) {
    return !!state.liked[id];
  }

  function openFull() {
    state.fullOpen = true;
    emit("full");
  }

  function closeFull() {
    state.fullOpen = false;
    emit("full");
  }

  function subscribe(listener) {
    listeners.push(listener);
    listener(getSnapshot());
  }

  function bindAudio() {
    audio.preload = "metadata";
    audio.volume = state.volume;

    audio.addEventListener("play", function () {
      state.playing = true;
      state.error = "";
      remember(currentTrack());
      emit("play");
    });

    audio.addEventListener("pause", function () {
      state.playing = false;
      emit("pause");
    });

    audio.addEventListener("timeupdate", function () {
      state.currentTime = audio.currentTime || 0;
      emit("time");
    });

    audio.addEventListener("loadedmetadata", function () {
      state.duration = audio.duration || 0;
      emit("meta");
    });

    audio.addEventListener("ended", function () {
      next();
    });

    audio.addEventListener("error", function () {
      state.playing = false;
      var failed = currentTrack();
      state.error = failed && failed.local
        ? "Нет файла: " + failed.src
        : "This track did not load. Try the next one.";
      emit("error");
    });
  }

  function init() {
    loadStore();
    bindAudio();
  }

  return {
    init: init,
    subscribe: subscribe,
    playFrom: playFrom,
    toggle: toggle,
    next: next,
    previous: previous,
    seek: seek,
    setSeeking: setSeeking,
    setVolume: setVolume,
    toggleLike: toggleLike,
    setLikeHandler: setLikeHandler,
    setLike: setLike,
    setLiked: setLiked,
    isLiked: isLiked,
    openFull: openFull,
    closeFull: closeFull
  };
})();
