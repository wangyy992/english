import type { AudioLesson } from '../../types';

// Original script, synthesized with offline TTS (SVOX Pico) so the audio and
// transcript are guaranteed to match exactly. Not a real broadcast — see
// docs/adding-lessons.md if you want to swap in real recorded material.
const lesson: AudioLesson = {
  id: 'culture-corner-street-food',
  source: '四技原创 · AI 朗读',
  title: 'Street Food Around the World',
  level: 3,
  audioUrl: './audio/culture-corner-street-food.mp3',
  sentences: [
    { start: 0.3, end: 4.56, text: 'Street food has a way of telling you what a city really cares about.' },
    { start: 5.16, end: 10.96, text: 'In Bangkok, a plastic stool by the roadside might sit next to a world class review.' },
    { start: 11.56, end: 17.62, text: 'In Mexico City, a taco stand can build a following larger than most restaurants ever will.' },
    { start: 18.22, end: 24.34, text: 'What ties these traditions together is speed, honesty, and simple, bold flavor.' },
    { start: 24.94, end: 31.79, text: 'For travelers, street food is often the fastest way into a culture, no reservation required.' },
    { start: 32.39, end: 37.42, text: 'It rewards curiosity over caution, and a willingness to eat standing up.' },
  ],
};

export default lesson;
