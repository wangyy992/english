import type { AudioLesson } from '../../types';

// Original script, synthesized with offline TTS (SVOX Pico) so the audio and
// transcript are guaranteed to match exactly. Not a real broadcast — see
// docs/adding-lessons.md if you want to swap in real recorded material.
const lesson: AudioLesson = {
  id: 'tech-talk-smart-homes',
  source: '四技原创 · AI 朗读',
  title: 'How Smart Homes Are Changing Daily Life',
  level: 2,
  audioUrl: './audio/tech-talk-smart-homes.mp3',
  sentences: [
    { start: 0.3, end: 3.81, text: 'Smart home devices used to feel like a luxury.' },
    { start: 4.41, end: 8.94, text: 'Now, more and more households have at least one connected device.' },
    { start: 9.54, end: 14.64, text: 'Voice assistants can control lights, music, and even the thermostat.' },
    { start: 15.24, end: 20.21, text: 'Some people worry about privacy when so many devices are always listening.' },
    { start: 20.81, end: 25.88, text: 'Manufacturers argue that data is encrypted and rarely shared with other companies.' },
    { start: 26.48, end: 31.05, text: 'Either way, the smart home market keeps growing every single year.' },
    { start: 31.65, end: 36.7, text: 'The real question is how much convenience we are willing to trade for privacy.' },
  ],
};

export default lesson;
