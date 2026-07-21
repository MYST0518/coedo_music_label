'use strict';

// ─── Track Data (With Audio Path Pointer) ──────────────────────────────────────
const TRACKS = [
  {
    num: '01', artist: "men's brief factory", song: 'エンドロールシンドローム',
    x: 'https://x.com/mens_brief', xHandle: '@mens_brief',
    thumb: 'https://coedo-music.jp/pr/thumbnails/エンドロールシンドローム - mensbrief.png',
    audio: 'audio/エンドロールシンドローム - mensbrief(1).mp3',
    desc: 'それは、終わらない終わりが終わる時にはじまる終わり。静かで、深くて、どこか甘い "終幕の至福" をあなたへ――'
  },
  {
    num: '02', artist: 'しらたま', song: 'Generate The Universe',
    x: 'https://x.com/SiratamaInSoup', xHandle: '@SiratamaInSoup',
    thumb: 'https://coedo-music.jp/pr/thumbnails/Generate The Universe_しらたま - しらたまSuzaku.png',
    audio: 'audio/Generate The Universe_しらたま - しらたまSuzaku.mp3',
    desc: '"宇宙ヲ生成セヨ！" スマホ一つであらゆるものが生成されつつある今、宇宙を生成するとしたらプロンプトは？を曲にしました。'
  },
  {
    num: '03', artist: '茶トラ-Brown tiger cat music-', song: "gravity's",
    x: 'https://x.com/b_tigercatmusic', xHandle: '@b_tigercatmusic',
    thumb: "https://coedo-music.jp/pr/thumbnails/gravity_s_茶トラ - 茶トラ-Brown tiger cat music-.png",
    audio: 'audio/gravity_s_茶トラ - 茶トラ-Brown tiger cat music-.mp3',
    desc: '真夜中の海辺で出会った相手に強く惹かれ、潮が足跡を消す前に一緒にいたいと願う恋 of 歌。Tropical houseで奏でました。'
  },
  {
    num: '04', artist: 'HMatsui', song: 'Spring Static',
    x: 'https://x.com/matsuixmatsui', xHandle: '@matsuixmatsui',
    thumb: 'https://coedo-music.jp/pr/thumbnails/Spring Static_HMatsui - Hirohito Matsui.png',
    audio: 'audio/Spring Static_HMatsui - Hirohito Matsui.mp3',
    desc: '上書きしたテープの奥で、消し損ねた春がまだ鳴っている。交差する音の流れをメロディの輪郭が駆け抜ける英語詞プログレポップ。'
  },
  {
    num: '05', artist: 'AinN3gRaM', song: 'Bu11e5 f10ra1e5.',
    x: 'https://x.com/AinN3gRaM', xHandle: '@AinN3gRaM',
    thumb: 'https://coedo-music.jp/pr/thumbnails/Bu11e5 f10ra1e5._AinN3gRaM.png',
    audio: 'audio/Bu11e5 f10ra1e5._AinN3gRaM - toku Hi.mp3',
    desc: 'Une fragilité qui volerait aisément en éclats au moindre contact. 儚さを舐めて花弁回りだし、余韻残さず記憶に在らず'
  },
  {
    num: '06', artist: 'でんでろ３', song: 'YONAOSHI',
    x: 'https://x.com/dendero3', xHandle: '@dendero3',
    thumb: 'https://coedo-music.jp/pr/thumbnails/YONAOSHI_denDero3.jpg',
    audio: 'audio/YONAOSHI_denDero3.mp3',
    desc: '私が書いた時代劇のセリフが元になっている曲。明日が怒いと泣く子らを救って見せよう！ 世直し太郎！'
  },
  {
    num: '07', artist: 'MakotoAI', song: 'Jump',
    x: 'https://x.com/trillion_music', xHandle: '@trillion_music',
    thumb: 'https://coedo-music.jp/pr/thumbnails/JUMP - Makoto.png',
    audio: 'audio/Jump_MakotoAI - Makoto.mp3',
    desc: '日常のつまずきや悔しさに寄り添い、「明日の自分を好きになる」ためのメッセージを軸にした等身大の応援歌。'
  },
  {
    num: '08', artist: 'demons（でもん）', song: 'No Return, No Problem (feat. MakotoAI)',
    x: 'https://x.com/daemon_aimusic', xHandle: '@daemon_aimusic',
    thumb: 'https://coedo-music.jp/pr/thumbnails/No Return, No Problem (feat. MakotoAI) - でもん.png',
    audio: 'audio/mastered_No Return, No Problem feat. MakotoAI_01 - でもん.mp3',
    desc: 'TOMAE、YUKINA、MakotoAIが放つ歌姫トリプルボーカル。夢を選んだから、もう戻らない。一人じゃないから。'
  },
  {
    num: '09', artist: 'Sway', song: 'よく似てる',
    x: 'https://x.com/sway202511992', xHandle: '@sway202511992',
    thumb: 'https://coedo-music.jp/pr/thumbnails/よく似てる_Sway.jpg',
    audio: 'audio/よく似てる - 龍一川村.mp3',
    desc: '僕ら二人はよく似てる。夜の温度や愛の形のように。目には見えないけど、互いの体温は近くに感じてる。'
  },
  {
    num: '10', artist: 'ammr', song: 'わたしの白夜',
    x: 'https://x.com/ammr_suno', xHandle: '@ammr_suno',
    thumb: 'https://coedo-music.jp/pr/thumbnails/わたしの白夜_ammr .png',
    audio: 'audio/わたしの白夜_ammr - Ogi Taro.mp3',
    desc: '幼い日の記憶に宿る甘い優しさと、やがて訪れる離別を、初夏の繊細な色彩で描きました。'
  },
  {
    num: '11', artist: '鈴木憂一 (Highdrama)', song: 'ノイズキャンセル',
    x: 'https://x.com/yu_ichi_suzuki', xHandle: '@yu_ichi_suzuki',
    thumb: 'https://coedo-music.jp/pr/thumbnails/ノイズキャンセル_鈴木憂一(Highdrama).png',
    audio: 'audio/ノイズキャンセル_鈴木憂一(Highdrama) - 鈴木憂一.mp3',
    desc: '既にあるものの組み合わせから新しい音が生まれたらいいなと思って作りました。かつてのサンプリングのように。'
  },
  {
    num: '12', artist: '旧雅之', song: '春のノスタルジック・カフェ',
    x: 'https://x.com/ichijoji_m', xHandle: '@ichijoji_m',
    thumb: 'https://coedo-music.jp/pr/thumbnails/春のノスタルジック・カフェサムネイル_旧雅之 - Masa Q.png',
    audio: 'audio/春のノスタルジック・カフェ_旧雅之 - Masa Q.mp3',
    desc: 'カフェのBGMコンペに提出した曲。比較的ウケを狙った歌詞と曲調ですが、自分らしさも感じられる内容。コーヒーと回想のお供に！'
  },
  {
    num: '13', artist: '真夜中のラジオ', song: '空へ',
    x: 'https://x.com/mayo_raji', xHandle: '@mayo_raji',
    thumb: 'https://coedo-music.jp/pr/thumbnails/空へ_真夜中のラジオ - shinji takano.png',
    audio: 'audio/空へ_真夜中のラジオ - shinji takano.mp3',
    desc: '蝉の一生とAI音楽をテーマに。多くの人に届かない創作の孤独、それでも誰かの記憶に残ってくれたら、という願いを込めました。'
  },
  {
    num: '14', artist: 'ELEMAYU', song: '星読みの祝祭',
    x: 'https://x.com/SDAI1807097011', xHandle: '@SDAI1807097011',
    thumb: 'https://coedo-music.jp/pr/thumbnails/星読みの祝祭_ELEMAYU.png',
    audio: 'audio/星読みの祝祭_ELEMAYU - nmt kj.mp3',
    desc: 'それは、夢を追うすべての人の背中を押してくれる光。星空の下でひとりじゃないって思える温かさと、どこまでも続く希望。'
  }
];

// ─── State ───────────────────────────────────────────────────────────────────
const PRICE = 2500;
const SHIPPING = 300;
let quantity = 1;
let currentStock = 100;  // リアルタイム在庫（APIから更新）
let totalStock = 100;    // 限定枚数（APIから更新）

// ─── Player State ─────────────────────────────────────────────────────────────
const AUDIO_BASE_URL = 'https://player.coedo-music.jp/';
let activeAudio = null;
let activeIndex = -1;
let isPlaying = false;

// ─── Render Tracks ───────────────────────────────────────────────────────────
function renderTracks() {
  const grid = document.getElementById('tracks-grid');
  if (!grid) return;

  grid.innerHTML = TRACKS.map((t, i) => `
    <article class="track-card animate-fade-up" style="animation-delay:${i * 0.04}s" id="track-card-${i}">
      <div class="track-thumb-wrap" style="position: relative;">
        <img
          class="track-thumb"
          src="${escapeHtml(t.thumb)}"
          alt="${escapeHtml(t.song)} サムネイル"
          onerror="this.src='/album_cover.png'"
          loading="lazy"
        >
        <button class="track-play-btn" aria-label="${escapeHtml(t.song)}の試聴を開始" onclick="togglePlayTrack(${i})">
          <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg class="pause-icon" viewBox="0 0 24 24" fill="currentColor" style="display:none;">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        </button>
      </div>
      <div class="track-body">
        <div class="track-num-artist">
          <span class="track-num">${escapeHtml(t.num)}</span>
          <span class="track-artist">${escapeHtml(t.artist)}</span>
        </div>
        <div class="track-title">「${escapeHtml(t.song)}」</div>
        <p class="track-desc">${escapeHtml(t.desc)}</p>
        <a href="${escapeHtml(t.x)}" class="track-x-link" target="_blank" rel="noopener noreferrer">𝕏 ${escapeHtml(t.xHandle)}</a>
      </div>
    </article>
  `).join('');
}

// ─── Player Logic (30s Limit) ────────────────────────────────────────────────
function initGlobalAudio() {
  if (!activeAudio) {
    activeAudio = new Audio();
    activeAudio.preload = 'metadata';

    activeAudio.addEventListener('timeupdate', () => {
      // 30秒試聴制限
      if (activeAudio.currentTime >= 30) {
        stopAllPlayback();
        showDemoEndNotice();
        return;
      }
      updateMiniPlayerProgress();
    });

    activeAudio.addEventListener('ended', () => {
      stopAllPlayback();
    });
  }
}

function togglePlayTrack(index) {
  initGlobalAudio();

  // 別の曲を再生する場合
  if (activeIndex !== index) {
    stopAllPlayback();
    activeIndex = index;
    const track = TRACKS[index];
    activeAudio.src = AUDIO_BASE_URL + track.audio;
    
    // UIのステータスを再生中に
    setCardPlayUI(index, true);
    showMiniPlayer(track);

    activeAudio.play().then(() => {
      isPlaying = true;
    }).catch(err => {
      console.warn('Playback blocked:', err);
      stopAllPlayback();
    });
    return;
  }

  // 同じ曲の一時停止 / 再開
  if (isPlaying) {
    activeAudio.pause();
    isPlaying = false;
    setCardPlayUI(index, false);
    updateMiniPlayerBtn(false);
  } else {
    activeAudio.play().then(() => {
      isPlaying = true;
      setCardPlayUI(index, true);
      updateMiniPlayerBtn(true);
    }).catch(console.warn);
  }
}

function stopAllPlayback() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  }
  isPlaying = false;
  if (activeIndex !== -1) {
    setCardPlayUI(activeIndex, false);
  }
  activeIndex = -1;
  hideMiniPlayer();
}

function setCardPlayUI(index, playing) {
  const card = document.getElementById(`track-card-${index}`);
  if (!card) return;

  const playBtn = card.querySelector('.track-play-btn');
  if (!playBtn) return;

  const playIcon = playBtn.querySelector('.play-icon');
  const pauseIcon = playBtn.querySelector('.pause-icon');

  if (playing) {
    playBtn.classList.add('playing');
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
  } else {
    playBtn.classList.remove('playing');
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
  }
}

// ─── Mini Player UI ───────────────────────────────────────────────────────────
function showMiniPlayer(track) {
  let player = document.getElementById('mini-player');
  if (!player) {
    player = document.createElement('div');
    player.id = 'mini-player';
    player.className = 'mini-player';
    player.innerHTML = `
      <div class="mp-inner">
        <img class="mp-thumb" id="mp-thumb" src="" alt="Jacket">
        <div class="mp-info">
          <div class="mp-song" id="mp-song">Song</div>
          <div class="mp-artist" id="mp-artist">Artist</div>
        </div>
        <div class="mp-controls">
          <button class="mp-play-btn" id="mp-play-btn" onclick="handleMiniPlayToggle()">
            <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <svg class="pause-icon" viewBox="0 0 24 24" fill="currentColor" style="display:none;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          </button>
          <div class="mp-progress-wrap" onclick="handleMiniSeek(event)">
            <div class="mp-progress-bar">
              <div class="mp-progress-fill" id="mp-progress-fill"></div>
            </div>
            <div class="mp-time-row">
              <span id="mp-time-current">0:00</span>
              <span>/ 0:30 (試聴)</span>
            </div>
          </div>
          <button class="mp-close-btn" onclick="stopAllPlayback()">✕</button>
        </div>
      </div>
    `;
    document.body.appendChild(player);
  }

  document.getElementById('mp-thumb').src = track.thumb;
  document.getElementById('mp-song').textContent = track.song;
  document.getElementById('mp-artist').textContent = track.artist;
  updateMiniPlayerBtn(true);
  
  // ふわっと表示
  setTimeout(() => player.classList.add('visible'), 50);
}

function hideMiniPlayer() {
  const player = document.getElementById('mini-player');
  if (player) {
    player.classList.remove('visible');
  }
}

window.handleMiniPlayToggle = function() {
  if (activeIndex !== -1) {
    togglePlayTrack(activeIndex);
  }
};

window.handleMiniSeek = function(event) {
  if (!activeAudio) return;
  const bar = event.currentTarget.querySelector('.mp-progress-bar');
  const rect = bar.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const pct = clickX / rect.width;
  activeAudio.currentTime = Math.max(0, Math.min(29.9, pct * 30));
};

window.togglePlayTrack = togglePlayTrack;
window.stopAllPlayback = stopAllPlayback;

function updateMiniPlayerBtn(playing) {
  const btn = document.getElementById('mp-play-btn');
  if (!btn) return;
  const play = btn.querySelector('.play-icon');
  const pause = btn.querySelector('.pause-icon');
  if (playing) {
    play.style.display = 'none';
    pause.style.display = 'block';
  } else {
    play.style.display = 'block';
    pause.style.display = 'none';
  }
}

function updateMiniPlayerProgress() {
  const fill = document.getElementById('mp-progress-fill');
  const current = document.getElementById('mp-time-current');
  if (!activeAudio || !fill || !current) return;

  const currentTime = activeAudio.currentTime;
  const pct = Math.min(100, (currentTime / 30) * 100);
  fill.style.width = `${pct}%`;

  const m = Math.floor(currentTime / 60);
  const s = Math.floor(currentTime % 60).toString().padStart(2, '0');
  current.textContent = `${m}:${s}`;
}

function showDemoEndNotice() {
  alert('試聴時間は最初の30秒間までです。\nすべての曲のフルバージョンは、ぜひ限定CDパッケージでお楽しみください！');
}

// ─── XSS Prevention ──────────────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ─── Inventory Display ───────────────────────────────────────────────────────
async function fetchInventory() {
  try {
    const res = await fetch('/api/inventory');
    if (!res.ok) return;
    const data = await res.json();
    currentStock = data.count;
    totalStock   = data.total || 30;

    const countEl = document.getElementById('stock-count');
    if (countEl) {
      countEl.innerHTML = `${totalStock}枚中 <strong>${currentStock}</strong> 枚残り`;
    }

    const badgeEl = document.querySelector('.limited-badge');
    if (badgeEl) {
      badgeEl.textContent = `限定 ${totalStock}枚`;
    }

    const barEl = document.getElementById('stock-bar');
    if (barEl) {
      const pct = totalStock > 0 ? (currentStock / totalStock) * 100 : 0;
      barEl.style.width = `${pct}%`;
    }

    updateQty(quantity);
  } catch (e) {
    console.warn('Inventory fetch failed:', e);
  }
}

// ─── Quantity Controls ────────────────────────────────────────────────────────
function updateQty(newQty) {
  const maxQty = Math.min(20, currentStock);
  quantity = Math.max(1, Math.min(maxQty, newQty));
  const display = document.getElementById('qty-display');
  const minus   = document.getElementById('qty-minus');
  const plus    = document.getElementById('qty-plus');
  const subtotal = document.getElementById('qty-subtotal');
  const buyBtn   = document.getElementById('btn-buy');

  if (display) display.textContent = quantity;
  if (minus)   minus.disabled = quantity <= 1;
  if (plus)    plus.disabled  = quantity >= maxQty;
  if (subtotal) {
    const shipping = quantity >= 5 ? 0 : SHIPPING;
    const total = PRICE * quantity + shipping;
    if (quantity >= 5) {
      subtotal.innerHTML = `小計 ¥${total.toLocaleString('ja-JP')} <span style="color:#2ecc71; font-weight:bold; font-size:0.8rem; margin-left:4px;">(5枚以上送料無料特典適用)</span>`;
    } else {
      subtotal.textContent = `小計 ¥${total.toLocaleString('ja-JP')}（送料込）`;
    }
  }

  if (buyBtn) {
    if (currentStock <= 0) {
      buyBtn.disabled = true;
      buyBtn.textContent = '売り切れ';
    } else {
      buyBtn.disabled = false;
      buyBtn.innerHTML = '🛒 購入手続きへ進む';
    }
  }
}

// ─── Cart → Checkout ─────────────────────────────────────────────────────────
function goToCheckout() {
  const shipping = quantity >= 5 ? 0 : SHIPPING;
  const cart = {
    productId: 'this-is-ai-sound',
    quantity,
    total: PRICE * quantity + shipping
  };
  try {
    sessionStorage.setItem('coedo_cart', JSON.stringify(cart));
  } catch (e) {
    console.warn('sessionStorage unavailable');
  }
  window.location.href = '/checkout';
}

// ─── Intersection Observer for animation ─────────────────────────────────────
function setupAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.animate-fade-up').forEach(el => {
    el.style.animationPlayState = 'paused';
    observer.observe(el);
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderTracks();
  updateQty(1);
  setupAnimations();
  fetchInventory();

  document.getElementById('qty-minus')?.addEventListener('click', () => updateQty(quantity - 1));
  document.getElementById('qty-plus')?.addEventListener('click',  () => updateQty(quantity + 1));
  document.getElementById('btn-buy')?.addEventListener('click',   goToCheckout);
});
