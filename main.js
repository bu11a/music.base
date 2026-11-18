var recommendedIds = ["carefree", "inspired", "wallpaper", "wholesome", "pamgaea", "fretless"];
var popularIds = ["hyperfun", "undaunted", "cipher", "song-1", "voltaic", "klockworx"];

var route = "home";
var searchQuery = "";
var openPlaylistId = "";
var lastSnapshot = null;
var pageDrawn = false;
var shownTrackId = "";

function icon(id, filled) {
  var cls = filled ? "icon icon-fill" : "icon";
  return '<svg class="' + cls + '" aria-hidden="true"><use href="#' + id + '"></use></svg>';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initials(title) {
  var parts = String(title).split(" ");
  var letters = "";
  var i;
  for (i = 0; i < parts.length && letters.length < 2; i += 1) {
    if (parts[i]) {
      letters += parts[i].charAt(0);
    }
  }
  return letters.toUpperCase();
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  var total = Math.floor(seconds);
  var minutes = Math.floor(total / 60);
  var remain = total % 60;
  return minutes + ":" + (remain < 10 ? "0" : "") + remain;
}

function greeting() {
  var hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}

function artistNames() {
  var names = [];
  var i;
  for (i = 0; i < MusicData.tracks.length; i += 1) {
    if (names.indexOf(MusicData.tracks[i].artist) === -1) {
      names.push(MusicData.tracks[i].artist);
    }
  }
  return names;
}

function firstByArtist(name) {
  var i;
  for (i = 0; i < MusicData.tracks.length; i += 1) {
    if (MusicData.tracks[i].artist === name) {
      return MusicData.tracks[i];
    }
  }
  return null;
}

function card(track, context) {
  var liked = Player.isLiked(track.id);
  return '' +
    '<article class="card">' +
      '<div class="art tone-' + track.tone + '">' +
        '<span>' + escapeHtml(initials(track.title)) + '</span>' +
        '<button class="fab" type="button" data-play="' + track.id + '" data-context="' + context + '" aria-label="Play ' + escapeHtml(track.title) + '">' +
          icon("i-play", true) +
        '</button>' +
      '</div>' +
      '<h3>' + escapeHtml(track.title) + '</h3>' +
      '<p>' + escapeHtml(track.artist) + '</p>' +
      '<button class="ghost-like' + (liked ? " is-on" : "") + '" type="button" data-like="' + track.id + '" aria-pressed="' + (liked ? "true" : "false") + '" aria-label="' + (liked ? "Remove from liked songs" : "Save to liked songs") + '">' +
        icon("i-heart") +
      '</button>' +
    '</article>';
}

function cards(ids, context) {
  var html = "";
  var tracks = tracksByIds(ids);
  var i;
  for (i = 0; i < tracks.length; i += 1) {
    html += card(tracks[i], context);
  }
  return html;
}

function row(track, context) {
  var liked = Player.isLiked(track.id);
  return '' +
    '<div class="row">' +
      '<button class="row-main" type="button" data-play="' + track.id + '" data-context="' + context + '">' +
        '<span class="art art-sm tone-' + track.tone + '">' + escapeHtml(initials(track.title)) + '</span>' +
        '<span class="row-copy"><strong>' + escapeHtml(track.title) + '</strong><span>' + escapeHtml(track.artist) + '</span></span>' +
      '</button>' +
      '<button class="like-btn' + (liked ? " is-on" : "") + '" type="button" data-like="' + track.id + '" aria-pressed="' + (liked ? "true" : "false") + '" aria-label="' + (liked ? "Remove from liked songs" : "Save to liked songs") + '">' +
        icon("i-heart") +
      '</button>' +
    '</div>';
}

function rows(tracks, context) {
  var html = "";
  var i;
  if (!tracks.length) {
    return "";
  }
  for (i = 0; i < tracks.length; i += 1) {
    html += row(tracks[i], context);
  }
  return '<div class="rows">' + html + '</div>';
}

function artistCard(name) {
  var track = firstByArtist(name);
  if (!track) {
    return "";
  }
  return '' +
    '<article class="card artist-card">' +
      '<div class="art art-round tone-' + track.tone + '">' +
        '<span>' + escapeHtml(initials(name)) + '</span>' +
        '<button class="fab" type="button" data-play="' + track.id + '" data-context="artist:' + escapeHtml(name) + '" aria-label="Play ' + escapeHtml(name) + '">' +
          icon("i-play", true) +
        '</button>' +
      '</div>' +
      '<h3>' + escapeHtml(name) + '</h3>' +
      '<p>Artist</p>' +
    '</article>';
}

function renderHome(recentIds) {
  var recent = tracksByIds(recentIds);
  var recentHtml = recent.length
    ? '<div class="cards">' + cards(recentIds.slice(0, 6), "recent") + '</div>'
    : '<p class="empty">Songs you play will show up here.</p>';
  var artists = artistNames();
  var artistHtml = "";
  var i;
  for (i = 0; i < artists.length; i += 1) {
    artistHtml += artistCard(artists[i]);
  }
  return '' +
    '<header class="page-head"><h2>' + greeting() + '</h2><p>Pick up a song on music.base.</p></header>' +
    '<section class="block"><h3>Recently Played</h3><div id="recent-slot">' + recentHtml + '</div></section>' +
    '<section class="block"><h3>Recommended for You</h3><div class="cards">' + cards(recommendedIds, "ids:" + recommendedIds.join(",")) + '</div></section>' +
    '<section class="block"><h3>Popular Tracks</h3><div class="cards">' + cards(popularIds, "ids:" + popularIds.join(",")) + '</div></section>' +
    '<section class="block"><h3>Artists</h3><div class="cards">' + artistHtml + '</div></section>';
}

function renderSearch() {
  return '' +
    '<header class="page-head"><h2>Search</h2><p>Find a song or an artist.</p></header>' +
    '<label class="search-field"><span class="sr-only">Search</span>' +
      '<input id="search-input" type="search" value="' + escapeHtml(searchQuery) + '" placeholder="Song or artist" autocomplete="off">' +
    '</label>' +
    '<div id="search-results">' + searchMarkup(searchQuery) + '</div>';
}

function searchMarkup(query) {
  var needle = query.trim().toLowerCase();
  var matches = [];
  var i;
  var track;
  var hay;
  if (!needle) {
    return '<p class="empty">Type a song or an artist.</p>';
  }
  for (i = 0; i < MusicData.tracks.length; i += 1) {
    track = MusicData.tracks[i];
    hay = (track.title + " " + track.artist).toLowerCase();
    if (hay.indexOf(needle) !== -1) {
      matches.push(track);
    }
  }
  if (!matches.length) {
    return '<p class="empty">No tracks match that search.</p>';
  }
  return rows(matches, "all");
}

function renderLibrary() {
  return '' +
    '<header class="page-head"><h2>Your Library</h2><p>' + MusicData.tracks.length + ' tracks ready to play.</p></header>' +
    rows(MusicData.tracks, "library") +
    '<p class="credit-inline">' + escapeHtml(MusicData.credit) + '</p>';
}

function renderPlaylists() {
  var html = "";
  var i;
  var playlist;
  var tracks;
  var open;
  for (i = 0; i < MusicData.playlists.length; i += 1) {
    playlist = MusicData.playlists[i];
    tracks = tracksByIds(playlist.trackIds);
    open = openPlaylistId === playlist.id;
    html += '' +
      '<article class="playlist' + (open ? " is-open" : "") + '">' +
        '<div class="playlist-top">' +
          '<button class="playlist-open" type="button" data-playlist="' + playlist.id + '">' +
            '<span class="art tone-' + (tracks[0] ? tracks[0].tone : 0) + '">' + escapeHtml(initials(playlist.title)) + '</span>' +
            '<span class="row-copy"><strong>' + escapeHtml(playlist.title) + '</strong><span>' + escapeHtml(playlist.description) + '</span></span>' +
          '</button>' +
          '<button class="play-btn" type="button" data-play="' + playlist.trackIds[0] + '" data-context="playlist:' + playlist.id + '" aria-label="Play ' + escapeHtml(playlist.title) + '">' +
            icon("i-play", true) +
          '</button>' +
        '</div>' +
        (open ? rows(tracks, "playlist:" + playlist.id) : "") +
      '</article>';
  }
  return '<header class="page-head"><h2>Playlists</h2><p>Three sets from the catalog.</p></header><div class="playlists">' + html + '</div>';
}

function renderLiked(likedMap) {
  var ids = [];
  var i;
  for (i = 0; i < MusicData.tracks.length; i += 1) {
    if (likedMap[MusicData.tracks[i].id]) {
      ids.push(MusicData.tracks[i].id);
    }
  }
  var body = ids.length ? rows(tracksByIds(ids), "liked") : '<p class="empty">Save a song with the heart and it stays here.</p>';
  return '<header class="page-head"><h2>Liked Songs</h2><p>Tracks you kept.</p></header>' + body;
}

function renderRecent(recentIds) {
  var body = recentIds.length ? rows(tracksByIds(recentIds), "recent") : '<p class="empty">Play something and it will be listed here.</p>';
  return '<header class="page-head"><h2>Recently Played</h2><p>Your latest listens on this device.</p></header>' + body;
}

function renderPage(snapshot) {
  var main = document.getElementById("main");
  var html = "";
  if (route === "search") {
    html = renderSearch();
  } else if (route === "library") {
    html = renderLibrary();
  } else if (route === "playlists") {
    html = renderPlaylists();
  } else if (route === "liked") {
    html = renderLiked(snapshot.liked);
  } else if (route === "recent") {
    html = renderRecent(snapshot.recent);
  } else {
    html = renderHome(snapshot.recent);
  }
  main.innerHTML = html;
  var buttons = document.querySelectorAll(".nav-btn");
  var i;
  for (i = 0; i < buttons.length; i += 1) {
    buttons[i].classList.toggle("is-active", buttons[i].getAttribute("data-route") === route);
  }
  if (route === "search") {
    var field = document.getElementById("search-input");
    if (field && document.activeElement !== field) {
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
    }
  }
}

function setPlayIcon(buttonId, iconId, playing) {
  var button = document.getElementById(buttonId);
  var glyph = document.getElementById(iconId);
  if (!button || !glyph) {
    return;
  }
  button.setAttribute("aria-pressed", playing ? "true" : "false");
  button.setAttribute("aria-label", playing ? "Pause" : "Play");
  glyph.innerHTML = playing
    ? '<use href="#i-pause"></use>'
    : '<use href="#i-play"></use>';
}

function paintArt(element, track) {
  var tone;
  if (!element) {
    return;
  }
  tone = track ? track.tone : 0;
  element.className = element.className.replace(/tone-\d/g, "").replace(/\s+/g, " ").trim();
  element.classList.add("tone-" + tone);
}

function updateSeek(input, timeId, totalId, snapshot) {
  var ratio = 0;
  if (!input) {
    return;
  }
  if (snapshot.duration > 0) {
    ratio = snapshot.currentTime / snapshot.duration;
  }
  if (!snapshot.seeking) {
    input.value = String(Math.round(ratio * 1000));
  }
  input.setAttribute("aria-valuetext", formatTime(snapshot.currentTime));
  document.getElementById(timeId).textContent = formatTime(snapshot.currentTime);
  document.getElementById(totalId).textContent = formatTime(snapshot.duration);
}

function updatePlayer(snapshot) {
  var track = snapshot.track;
  var title = track ? track.title : "music.base";
  var artist = snapshot.error || (track ? track.artist : "Choose a track");
  var art = document.getElementById("player-art");
  var like = document.getElementById("player-like");
  document.getElementById("player-title").textContent = title;
  document.getElementById("player-artist").textContent = artist;
  document.getElementById("player-initials").textContent = track ? initials(track.title) : "mb";
  paintArt(art, track);
  document.getElementById("open-full").setAttribute("aria-label", track ? "Open " + title + " by " + track.artist : "Open player");
  like.disabled = !track;
  like.setAttribute("aria-pressed", track && Player.isLiked(track.id) ? "true" : "false");
  like.classList.toggle("is-on", !!(track && Player.isLiked(track.id)));
  like.setAttribute("aria-label", track && Player.isLiked(track.id) ? "Remove from liked songs" : "Save to liked songs");
  setPlayIcon("play-btn", "play-icon", snapshot.playing);
  updateSeek(document.getElementById("seek"), "time-current", "time-total", snapshot);
  document.getElementById("volume").value = String(Math.round(snapshot.volume * 100));
  document.title = track && snapshot.playing ? title + " · music.base" : "music.base";
}

function updateFull(snapshot) {
  var panel = document.getElementById("full-player");
  var track = snapshot.track;
  var art = document.getElementById("full-art");
  var wave = document.getElementById("wave");
  panel.hidden = !snapshot.fullOpen;
  panel.setAttribute("data-tone", track ? String(track.tone) : "0");
  document.getElementById("full-title").textContent = track ? track.title : "music.base";
  document.getElementById("full-artist").textContent = snapshot.error || (track ? track.artist : "Choose a track");
  document.getElementById("full-initials").textContent = track ? initials(track.title) : "mb";
  art.className = "art art-xl tone-" + (track ? track.tone : 0);
  wave.classList.toggle("is-live", snapshot.playing);
  setPlayIcon("full-play", "full-play-icon", snapshot.playing);
  updateSeek(document.getElementById("full-seek"), "full-current", "full-total", snapshot);
  document.getElementById("full-volume").value = String(Math.round(snapshot.volume * 100));
  document.body.classList.toggle("player-open", snapshot.fullOpen);
}

function refreshLikes(snapshot) {
  var buttons = document.querySelectorAll("[data-like]");
  var i;
  var button;
  var id;
  var on;
  for (i = 0; i < buttons.length; i += 1) {
    button = buttons[i];
    id = button.getAttribute("data-like");
    on = !!snapshot.liked[id];
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", on ? "true" : "false");
    button.setAttribute("aria-label", on ? "Remove from liked songs" : "Save to liked songs");
  }
}

function refreshRecent(snapshot) {
  var slot = document.getElementById("recent-slot");
  var recent = snapshot.recent;
  if (route === "home" && slot) {
    slot.innerHTML = recent.length
      ? '<div class="cards">' + cards(recent.slice(0, 6), "recent") + "</div>"
      : '<p class="empty">Songs you play will show up here.</p>';
    return;
  }
  if (route === "recent") {
    renderPage(snapshot);
  }
}

function onPlayer(snapshot) {
  var trackId = snapshot.track ? snapshot.track.id : "";
  lastSnapshot = snapshot;
  if (trackId !== shownTrackId && snapshot.fullOpen) {
    document.getElementById("full-player").classList.add("is-changing");
    window.setTimeout(function () {
      document.getElementById("full-player").classList.remove("is-changing");
    }, 280);
  }
  shownTrackId = trackId;
  updatePlayer(snapshot);
  updateFull(snapshot);
  if (!pageDrawn) {
    renderPage(snapshot);
    pageDrawn = true;
    return;
  }
  if (snapshot.reason === "like") {
    if (route === "liked") {
      renderPage(snapshot);
    } else {
      refreshLikes(snapshot);
    }
    return;
  }
  if (snapshot.reason === "play" || snapshot.reason === "track") {
    refreshRecent(snapshot);
  }
}

function navigate(nextRoute) {
  location.hash = nextRoute;
}

function readHash() {
  var value = location.hash.replace("#", "");
  var known = ["home", "search", "library", "playlists", "liked", "recent"];
  if (known.indexOf(value) === -1) {
    return "home";
  }
  return value;
}

function bindSeek(input) {
  input.addEventListener("pointerdown", function () {
    Player.setSeeking(true);
  });
  input.addEventListener("pointerup", function () {
    Player.setSeeking(false);
  });
  input.addEventListener("input", function () {
    Player.seek(Number(input.value) / 1000);
    input.setAttribute("aria-valuetext", input.value);
  });
  input.addEventListener("change", function () {
    Player.setSeeking(false);
    Player.seek(Number(input.value) / 1000);
  });
}

function bindVolume(input) {
  input.addEventListener("input", function () {
    Player.setVolume(Number(input.value) / 100);
    input.setAttribute("aria-valuetext", input.value + " percent");
  });
}

function bindChrome() {
  document.body.addEventListener("click", function (event) {
    var routeBtn = event.target.closest("[data-route]");
    var playBtn = event.target.closest("[data-play]");
    var likeBtn = event.target.closest("[data-like]");
    var playlistBtn = event.target.closest("[data-playlist]");
    if (routeBtn) {
      navigate(routeBtn.getAttribute("data-route"));
      return;
    }
    if (playBtn) {
      Player.playFrom(playBtn.getAttribute("data-play"), playBtn.getAttribute("data-context"));
      return;
    }
    if (likeBtn) {
      Player.toggleLike(likeBtn.getAttribute("data-like"));
      return;
    }
    if (playlistBtn) {
      var id = playlistBtn.getAttribute("data-playlist");
      openPlaylistId = openPlaylistId === id ? "" : id;
      if (lastSnapshot) {
        renderPage(lastSnapshot);
      }
    }
  });

  document.getElementById("main").addEventListener("input", function (event) {
    if (event.target.id !== "search-input") {
      return;
    }
    searchQuery = event.target.value;
    document.getElementById("search-results").innerHTML = searchMarkup(searchQuery);
  });

  document.getElementById("play-btn").addEventListener("click", function () {
    Player.toggle();
  });
  document.getElementById("full-play").addEventListener("click", function () {
    Player.toggle();
  });
  document.getElementById("prev-btn").addEventListener("click", function () {
    Player.previous();
  });
  document.getElementById("next-btn").addEventListener("click", function () {
    Player.next();
  });
  document.getElementById("full-prev").addEventListener("click", function () {
    Player.previous();
  });
  document.getElementById("full-next").addEventListener("click", function () {
    Player.next();
  });
  document.getElementById("player-like").addEventListener("click", function () {
    Player.toggleLike();
  });
  document.getElementById("open-full").addEventListener("click", function () {
    Player.openFull();
  });
  document.getElementById("close-full").addEventListener("click", function () {
    Player.closeFull();
  });

  bindSeek(document.getElementById("seek"));
  bindSeek(document.getElementById("full-seek"));
  bindVolume(document.getElementById("volume"));
  bindVolume(document.getElementById("full-volume"));

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      Player.closeFull();
    }
  });

  window.addEventListener("hashchange", function () {
    route = readHash();
    if (lastSnapshot) {
      renderPage(lastSnapshot);
    }
  });
}

function initApp() {
  Player.init();
  bindChrome();
  route = readHash();
  Player.subscribe(onPlayer);
  if (location.hash !== "#" + route) {
    location.hash = route;
  }
}

initApp();
