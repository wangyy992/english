import type { AudioLesson } from '../../types';

// TODO: replace with a real recording + accurate transcript/timings.
// See docs/adding-lessons.md for how to add your own material.
const lesson: AudioLesson = {
  id: 'bbc-6min-daily-habits',
  source: 'BBC 6 Minute English',
  title: 'The Science of Daily Habits',
  level: 1,
  audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  sentences: [
    { start: 0, end: 4, text: 'Hello and welcome to 6 Minute English.' }, // TODO: placeholder text
    { start: 4, end: 9, text: "Today we're talking about the science of daily habits." },
    { start: 9, end: 15, text: 'Researchers say it takes about two months to form a new habit.' },
    { start: 15, end: 21, text: 'Small changes, repeated every day, tend to stick better than big ones.' },
    { start: 21, end: 27, text: 'One example is drinking a glass of water right after waking up.' },
    { start: 27, end: 33, text: "It sounds simple, but it's a habit many people struggle to keep." },
    { start: 33, end: 39, text: "That's all for today. Thanks for listening, and see you next time." },
  ],
};

export default lesson;
