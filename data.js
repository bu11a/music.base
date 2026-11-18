var MusicData = {
  credit: "Kevin MacLeod (incompetech.com), CC BY 4.0. SoundHelix examples by Thomas Schürger.",
  tracks: [
    {
      id: "carefree",
      title: "Carefree",
      artist: "Kevin MacLeod",
      src: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3",
      tone: 0
    },
    {
      id: "wallpaper",
      title: "Wallpaper",
      artist: "Kevin MacLeod",
      src: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wallpaper.mp3",
      tone: 1
    },
    {
      id: "inspired",
      title: "Inspired",
      artist: "Kevin MacLeod",
      src: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Inspired.mp3",
      tone: 2
    },
    {
      id: "wholesome",
      title: "Wholesome",
      artist: "Kevin MacLeod",
      src: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wholesome.mp3",
      tone: 3
    },
    {
      id: "pamgaea",
      title: "Pamgaea",
      artist: "Kevin MacLeod",
      src: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Pamgaea.mp3",
      tone: 4
    },
    {
      id: "fretless",
      title: "Fretless",
      artist: "Kevin MacLeod",
      src: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Fretless.mp3",
      tone: 5
    },
    {
      id: "klockworx",
      title: "Klockworx",
      artist: "Kevin MacLeod",
      src: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Klockworx.mp3",
      tone: 1
    },
    {
      id: "hyperfun",
      title: "Hyperfun",
      artist: "Kevin MacLeod",
      src: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hyperfun.mp3",
      tone: 0
    },
    {
      id: "undaunted",
      title: "Undaunted",
      artist: "Kevin MacLeod",
      src: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Undaunted.mp3",
      tone: 3
    },
    {
      id: "voltaic",
      title: "Voltaic",
      artist: "Kevin MacLeod",
      src: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Voltaic.mp3",
      tone: 2
    },
    {
      id: "cipher",
      title: "Cipher",
      artist: "Kevin MacLeod",
      src: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cipher2.mp3",
      tone: 4
    },
    {
      id: "investigations",
      title: "Investigations",
      artist: "Kevin MacLeod",
      src: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Investigations.mp3",
      tone: 5
    },
    {
      id: "song-1",
      title: "SoundHelix Song 1",
      artist: "SoundHelix",
      src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      tone: 0
    },
    {
      id: "song-2",
      title: "SoundHelix Song 2",
      artist: "SoundHelix",
      src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      tone: 1
    },
    {
      id: "song-3",
      title: "SoundHelix Song 3",
      artist: "SoundHelix",
      src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      tone: 2
    },
    {
      id: "song-4",
      title: "SoundHelix Song 4",
      artist: "SoundHelix",
      src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
      tone: 3
    }
  ],
  playlists: [
    {
      id: "daylight",
      title: "Daylight",
      description: "Bright pieces for an easy start.",
      trackIds: ["carefree", "inspired", "wholesome", "wallpaper"]
    },
    {
      id: "after-dark",
      title: "After Dark",
      description: "Low light, steady pulse.",
      trackIds: ["cipher", "investigations", "undaunted", "voltaic"]
    },
    {
      id: "studio",
      title: "Studio",
      description: "Rhythm, keys, and long lines.",
      trackIds: ["fretless", "klockworx", "hyperfun", "pamgaea"]
    }
  ]
};

function findTrack(id) {
  var i;
  for (i = 0; i < MusicData.tracks.length; i += 1) {
    if (MusicData.tracks[i].id === id) {
      return MusicData.tracks[i];
    }
  }
  return null;
}

function tracksByIds(ids) {
  var list = [];
  var i;
  var track;
  for (i = 0; i < ids.length; i += 1) {
    track = findTrack(ids[i]);
    if (track) {
      list.push(track);
    }
  }
  return list;
}

function findPlaylist(id) {
  var i;
  for (i = 0; i < MusicData.playlists.length; i += 1) {
    if (MusicData.playlists[i].id === id) {
      return MusicData.playlists[i];
    }
  }
  return null;
}
