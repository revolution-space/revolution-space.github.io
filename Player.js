const TOGGLE = Symbol('TOGGLE');
const IOS = /iP(hone|ad|od)/.test((navigator.userAgentData || navigator).platform);

const isMobile = window.matchMedia('(max-width: 480px)').matches;
window.addEventListener('load', () => {
  if (isMobile)
    document.body.classList.add('--mobile');
});

// const _gtag = window.gtag;
const GTAG_OFF = localStorage['GTAG_OFF'];
function _gtag (...args) {
  console.log('gtag :>> ', ...args);
  if (!GTAG_OFF) {
    if (typeof args[2] == 'string' )
      args[2] = { event_label: args[2] };
    gtag(...args);
  }
}

function gEv (evName, _payload) {
  const { cat, label, ...payload } = _payload;
  if (cat) payload.event_category = cat;
  if (label) payload.event_label = label;

  _gtag('event', evName, payload);
}

// function gEvWrap (evName, ) {
//   return function (fn) {
//     return function (...args) {
//       gEv(evName, {});
//       return fn(...args);
//     }
//   }
// }

class PlayerUI {
  ref = {};
  shortcuts = {
    'p' () { this.player.setPlaying(TOGGLE) },
    '.' () { this.player.rewindTime(1) },
  };

  constructor (opts) {
    this.player = opts.player;
    this.$parent = opts.$parent;

    this.init();

    const preventShortcutTags = ['INPUT', 'TEXTAREA'];
    window.addEventListener('keypress', e => {
      if (preventShortcutTags.includes(e.currentTarget.tagName))
        return;

      const shortcut = `${ e.shiftKey ? '!' : '' }${ e.key.toLowerCase() }`;
      const shortcutFn = this.shortcuts[shortcut];
      shortcutFn && shortcutFn.call(this, e);
    });
  }

  init () {
    function btn (name, onclick, props, children = []) {
      return El('button', { className: '__' + name, name, onclick, ...props },
        [
          El({ className: 'Icon --' + name }), ...children
        ]
      );
    }

    function btnHoldRepeatEvents (cb, cbHold) {
      let actionInterval = -1;
      let preventClick = false;
      function clear () {
        clearInterval(actionInterval);
        setTimeout(() => { preventClick = false }, .016);
      }
      return {
        onclick (e) {
          if (!preventClick)
            cb(e);
        },
        onpointerdown (e) {
          actionInterval = setInterval(() => {
            preventClick = true;
            cbHold(e);
          }, 500);
        },
        onpointerup: clear,
        onpointerleave: clear,
      };
    }

    const { ref } = this;

    this.$el = El({ className: 'PlayerUI' },
    [
      El({ className: '__inner' },
      [
        El('span', { style: { marginRight: '1em' } }, "Listen to all our Tuesdays jams!"),

        btn('playback', () => {
          this.player.setPlaying(TOGGLE);
          gEv(this.player.playing ? 'P_play' : 'P_pause', { cat: 'Player' });
        }),

        btn('rewind-forward', null, {
          // title: `Rewind backward\nShortcuts: [>], [shift + >] next chapter \n[LONG TAP] to repeat rewind`,
          accessKey: '.',
          ...btnHoldRepeatEvents(
            () => {
              gEv('P_random', { cat: 'Player' });
              this.player.playRandom();
            },
            () => {
              gEv('P_rewind', { cat: 'Player' });
              this.player.rewindTime(1);
            }
          ),
        }),
      ])
    ]);

    this.$el.on('click', bindPreventAll());

    this.$parent.appendChild(this.$el);
  }
}

class Player {
  ui = null;
  played = false;
  playing = false;
  audioInfos = {};
  allDur = -1;
  $parent = document.body;

  constructor (opts) {
    this.$parent = opts.$parent;
    this.ui = new PlayerUI({ player: this, $parent: this.$parent });

    this.handlePollAudio = this.handlePollAudio.bind(this);
    this.handleEnded = this.handleEnded.bind(this);

    let audio = null;
    fetch('./assets/audios/j/audios.json').then(res => res.json()).then(audioInfos => {
      console.log('audioInfos :>> ', audioInfos);
      this.audioInfos = audioInfos;
      this.allDur = getAllAudiosDuration(audioInfos);
      this.playRandom();
    });
  }

  newAudio (src, seek) {
    if (!this.$audio) {
      this.$audio = El('audio', {
        preload: 'auto',
        controls: 'controls',
        src,
        currentTime: seek,
      });

      this.listenToAudioEvent();
      document.body.appendChild(this.$audio);
    }

    this.$audio.src = src;
    this.$audio.currentTime = seek;
  }

  playRandom ({ fromStart = false } = {}) {
    const allSeek = this.allDur * Math.random();
    const [fname, seek] = getAudioFnameByAllSeek(this.audioInfos, this.allDur, allSeek);
    this.newAudio('./assets/audios/j/' + fname, fromStart ? 0 : seek);
    if (this.played)
      this.setPlaying(true);
  }

  handleEnded () {
    this.playRandom({ fromStart: true });
  }

  releaseAudio () {
    this.$audio.removeEventListener('ended', this.onEnded);
    this.$audio.removeEventListener('loadedmetadata', this.handleLoaded);
    this.$audio.remove();
    this.$audio = null;
  }

  listenToAudioEvent () {
    this.pollInterval = -1;
    this.$audio.addEventListener('play', e => {
      this.pollInterval = setInterval(this.handlePollAudio, 490);
      this.playing = true;
      this.played = true;
      this.handlePollAudio();
    });

    this.$audio.addEventListener('ended', this.handleEnded);

    if (this.$audio.readyState === 0)
      this.$audio.addEventListener('loadedmetadata', e => this.handleLoaded());
    else
      this.handleLoaded();

    this.$audio.addEventListener('pause', e => {
      clearInterval(this.pollInterval);
      this.playing = false;
      this.handlePollAudio();
    });
    this.$audio.addEventListener('seeked', e => this.handlePollAudio());
  }

  handleLoaded () {
    setTimeout(() => this.setSavedSeek(), 30);

    this.$audio.style.display = 'none';
    this.handlePollAudio();
  }

  setSavedSeek () {}

  handlePollAudio (_time) {
    this.ui.$el.classList.toggle('--playing', this.playing);

    // if (this.$audio.currentTime) {
    //   LocalStorage.set('seek-' + this.episodeId, this.$audio.currentTime);
    // }
  }

  _gtagListeningInterval = -1;
  setPlaying (state) {
    if (state === TOGGLE)
      this.playing = !this.playing;
    else this.playing = state;

    clearInterval(this._gtagListeningInterval);
    if (this.playing) {
      const _gtagListening = () => {
        if (this.playing)
          gEv('P_playing:1m', { cat: 'Player' });
      }
      this._gtagListeningInterval = setInterval(_gtagListening, 60e3);
    }

    if (this.playing) {
      if (IOS && !this.played) { // fix currentTime bug IOS
        // const prevVolume = this.$audio.volume;
        this.$audio.volume = 0;

        // return new Promise((resolve) => {
        //   setTimeout(() => {
            const play = this.$audio.play();
            return play.then(e => {
              this.setSavedSeek();
              this.$audio.pause();
              return new Promise((resolve) => {
                setTimeout(() => resolve(this.$audio.play()), 30)
              });
            });
        //   }, 30);
        // });
      }
      else
        return this.$audio.play();
    }
    else {
      this.$audio.pause();
      return Promise.resolve(false);
    }
  }

  rewindTime (dir) {
    this.$audio.currentTime += dir * 5;
  }
}

function getAllAudiosDuration (audioInfos) {
  let allDur = 0;
  Object.keys(audioInfos).forEach(audioFname => {
    const dur = audioInfos[audioFname];
    allDur += dur;
  });
  return allDur;
}

function getAudioFnameByAllSeek (audioInfos, allDur, allSeek) {
  let seek = 0;

  for (let audioFname of Object.keys(audioInfos)) {
    const dur = audioInfos[audioFname];
    const nextSeek = seek + dur;
    if (nextSeek > allSeek)
      return [audioFname, nextSeek - allSeek];

    seek = nextSeek;
  }
  return null;
}
