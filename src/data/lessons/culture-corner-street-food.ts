import type { AudioLesson } from '../../types';

// TODO: replace with a real recording + accurate transcript/timings.
// See docs/adding-lessons.md for how to add your own material.
const lesson: AudioLesson = {
  id: 'culture-corner-street-food',
  source: 'Culture Corner',
  title: 'Street Food Around the World',
  level: 3,
  audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  sentences: [
    { start: 0, end: 6, text: 'Street food has a way of telling you what a city really cares about.' }, // TODO: placeholder text
    { start: 6, end: 13, text: 'In Bangkok, a plastic stool by the roadside might sit next to a Michelin star review.' },
    { start: 13, end: 21, text: 'In Mexico City, a taco stand can build a following larger than most restaurants ever will.' },
    { start: 21, end: 29, text: 'What ties these traditions together is speed, honesty, and a refusal to overcomplicate flavor.' },
    { start: 29, end: 36, text: 'For travelers, street food is often the fastest way into a culture, no reservation required.' },
    { start: 36, end: 43, text: 'It rewards curiosity over caution, and a willingness to eat standing up.' },
  ],
};

export default lesson;
