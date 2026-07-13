import type { AudioLesson } from '../../types';

// Original script, synthesized with offline TTS (SVOX Pico) so the audio and
// transcript are guaranteed to match exactly. Not a real broadcast — see
// docs/adding-lessons.md if you want to swap in real recorded material.
const lesson: AudioLesson = {
  id: 'bbc-6min-daily-habits',
  source: '四技原创 · AI 朗读',
  title: 'The Science of Daily Habits',
  level: 1,
  audioUrl: './audio/bbc-6min-daily-habits.mp3',
  sentences: [
    { start: 0.3, end: 3.22, text: 'Hello and welcome to Six Minute English.' },
    { start: 3.82, end: 7.4, text: "Today we're talking about the science of daily habits." },
    { start: 8.0, end: 12.06, text: 'Researchers say it takes about two months to form a new habit.' },
    { start: 12.66, end: 17.64, text: 'Small changes, repeated every day, tend to stick better than big ones.' },
    { start: 18.24, end: 22.6, text: 'One example is drinking a glass of water right after waking up.' },
    { start: 23.2, end: 27.47, text: "It sounds simple, but it's a habit many people struggle to keep." },
    { start: 28.07, end: 33.14, text: "That's all for today. Thanks for listening, and see you next time." },
  ],
};

export default lesson;
