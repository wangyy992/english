export function speak(text: string, lang = 'en-US'): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.speak(utterance);
}

export function canRecognizeSpeech(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}
