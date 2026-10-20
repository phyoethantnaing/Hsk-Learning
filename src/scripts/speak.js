import { mandarinVoice } from "../lib/speech-voice.mjs";
// One pronunciation session at a time. A second tap stops the active session;
// stale audio promises and speech callbacks cannot take over a newer request.
const NO_VOICE =
  "ဒီဖုန်း (ဒါမှမဟုတ် ဘရောက်ဇာ) မှာ တရုတ်စကား အသံ မပါသေးပါဘူး။ ဖုန်းရဲ့ Settings → Language မှာ 中文 (Chinese) အသံကို ထည့်ပြီး ပြန်စမ်းကြည့်ပါ။";
const PLAYBACK_ERROR =
  "အသံ မဖွင့်နိုင်ပါ။ အသံခလုတ်ကို နှိပ်ပြီး ပြန်စမ်းကြည့်ပါ။";
let active = null;
let media = null;
let sequence = 0;
let lastButton = null;
function setState(button, playing) {
  button.classList.toggle("speaking", playing);
  button.setAttribute("aria-pressed", String(playing));
  if (!button.dataset.idleLabel)
    button.dataset.idleLabel =
      button.getAttribute("aria-label") || "အသံ နားထောင်ရန်";
  button.setAttribute(
    "aria-label",
    playing ? "အသံ ရပ်ရန်" : button.dataset.idleLabel,
  );
  button.title = playing ? "အသံ ရပ်ရန်" : button.dataset.idleLabel;
}
function stop() {
  sequence++;
  if (media) {
    media.pause();
    media = null;
  }
  window.speechSynthesis?.cancel();
  if (active) setState(active, false);
  active = null;
}
function message(text) {
  const box = document.querySelector("[data-audio-status]");
  if (!box) return;
  box.querySelector("[data-audio-message]").textContent = text;
  document.querySelector("[data-learning-announcement]").textContent = text;
  box.hidden = false;
}
function finish(button, id, error = false) {
  if (id !== sequence) return;
  setState(button, false);
  active = null;
  media = null;
  if (error) message(PLAYBACK_ERROR);
}
function speakWithVoice(button, id) {
  if (id !== sequence) return;
  if (!window.speechSynthesis || !("SpeechSynthesisUtterance" in window)) {
    finish(button, id);
    message(NO_VOICE);
    return;
  }
  const voices = speechSynthesis.getVoices();
  const voice = mandarinVoice(voices);
  if (voices.length && !voice) {
    finish(button, id);
    message(NO_VOICE);
    return;
  }
  try {
    const utterance = new SpeechSynthesisUtterance(button.dataset.text);
    utterance.lang = voice?.lang || "zh-CN";
    if (voice) utterance.voice = voice;
    utterance.rate = Number(button.dataset.rate || 0.8);
    utterance.onend = () => finish(button, id);
    utterance.onerror = (event) =>
      finish(button, id, !["canceled", "interrupted"].includes(event.error));
    speechSynthesis.speak(utterance);
  } catch {
    finish(button, id, true);
  }
}
function play(button) {
  if (button === active) {
    stop();
    return;
  }
  stop();
  const id = sequence;
  active = button;
  lastButton = button;
  setState(button, true);
  const box = document.querySelector("[data-audio-status]");
  if (box) box.hidden = true;
  const announcement = document.querySelector("[data-learning-announcement]");
  if (announcement) announcement.textContent = "";
  if (!button.dataset.audio) {
    speakWithVoice(button, id);
    return;
  }
  media = new Audio(button.dataset.audio);
  media.onended = () => finish(button, id);
  let fallingBack = false;
  const fallback = () => {
    if (id !== sequence || fallingBack) return;
    fallingBack = true;
    media?.pause();
    media = null;
    speakWithVoice(button, id);
  };
  media.onerror = fallback;
  media.play().catch(fallback);
}
document.addEventListener("click", (event) => {
  const button = event.target.closest?.("[data-speak]");
  if (button) play(button);
  if (event.target.closest?.("[data-audio-dismiss]")) {
    const box = document.querySelector("[data-audio-status]");
    box.hidden = true;
    if (lastButton?.getClientRects().length)
      lastButton.focus({ preventScroll: true });
  }
});
window.addEventListener("pagehide", stop);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop();
});
document.addEventListener("learning-card-change", stop);
