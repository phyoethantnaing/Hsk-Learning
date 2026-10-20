// Pronunciation for every 🔊 button (components/SpeakButton.astro).
// Phase 3: when a word or example has a recorded file (data-audio), play it.
// Until then, use the browser's built-in Chinese voice (Web Speech API).

const NO_VOICE =
  'ဒီဖုန်း (ဒါမှမဟုတ် ဘရောက်ဇာ) မှာ တရုတ်စကား အသံ မပါသေးပါဘူး။ ' +
  'ဖုန်းရဲ့ Settings → Language မှာ 中文 (Chinese) အသံကို ထည့်ပြီး ပြန်စမ်းကြည့်ပါ။ ' +
  'Android မှာ Chrome ဘရောက်ဇာ သုံးရင် အလုပ်လုပ်လေ့ ရှိပါတယ်။';

let chineseVoice = null;
let voicesChecked = false;

function findVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  if (voices.length) voicesChecked = true;
  chineseVoice =
    voices.find((v) => /^zh[-_]CN/i.test(v.lang)) ??
    voices.find((v) => /^zh/i.test(v.lang) && !/HK|TW/i.test(v.lang)) ??
    voices.find((v) => /^zh/i.test(v.lang)) ??
    null;
  return chineseVoice;
}

if ('speechSynthesis' in window) {
  findVoice();
  speechSynthesis.addEventListener?.('voiceschanged', findVoice);
}

function showMessage(button, text) {
  let box = document.getElementById('speak-message');
  if (!box) {
    box = document.createElement('div');
    box.id = 'speak-message';
    box.className = 'speak-message';
    box.setAttribute('role', 'status');
    document.body.append(box);
  }
  box.textContent = text;
  box.hidden = false;
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => (box.hidden = true), 9000);
}

function speak(button) {
  const audio = button.dataset.audio;
  if (audio) {
    new Audio(audio).play().catch(() => speakWithVoice(button));
    return;
  }
  speakWithVoice(button);
}

function speakWithVoice(button) {
  if (!('speechSynthesis' in window)) {
    showMessage(button, NO_VOICE);
    return;
  }
  findVoice();
  // Some browsers report no voices until the first utterance; only give up
  // once we have seen a voice list without any Chinese voice in it.
  if (!chineseVoice && voicesChecked) {
    showMessage(button, NO_VOICE);
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(button.dataset.text);
  u.lang = 'zh-CN';
  if (chineseVoice) u.voice = chineseVoice;
  u.rate = Number(button.dataset.rate || 0.8);
  button.classList.add('speaking');
  u.onend = u.onerror = () => button.classList.remove('speaking');
  speechSynthesis.speak(u);
}

document.addEventListener('click', (e) => {
  const button = e.target.closest?.('[data-speak]');
  if (button) speak(button);
});
