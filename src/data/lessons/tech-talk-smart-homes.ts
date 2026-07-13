import type { AudioLesson } from '../../types';

// TODO: replace with a real recording + accurate transcript/timings.
// See docs/adding-lessons.md for how to add your own material.
const lesson: AudioLesson = {
  id: 'tech-talk-smart-homes',
  source: 'Tech Talk Weekly',
  title: 'How Smart Homes Are Changing Daily Life',
  level: 2,
  audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  sentences: [
    { start: 0, end: 5, text: 'Smart home devices used to feel like a luxury.' }, // TODO: placeholder text
    { start: 5, end: 11, text: 'Now, more and more households have at least one connected device.' },
    { start: 11, end: 18, text: 'Voice assistants can control lights, music, and even the thermostat.' },
    { start: 18, end: 25, text: 'Some people worry about privacy when so many devices are always listening.' },
    { start: 25, end: 32, text: 'Manufacturers argue that data is encrypted and rarely shared with third parties.' },
    { start: 32, end: 39, text: 'Either way, the smart home market keeps growing every single year.' },
    { start: 39, end: 45, text: 'The real question is how much convenience we are willing to trade for privacy.' },
  ],
};

export default lesson;
