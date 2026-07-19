import { createHashRouter } from 'react-router-dom';
import RootLayout from './RootLayout';
import Today from './pages/Today';
import { ListenListRoute, ListenLessonRoute } from './pages/listen/ListenRoute';
import { CantoCustom } from './pages/listen/CantoListen';
import ReadList from './pages/read/ReadList';
import ReadArticle from './pages/read/ReadArticle';
import WriteHome from './pages/write/WriteHome';
import Translate from './pages/write/Translate';
import FreeWrite from './pages/write/FreeWrite';
import MyWrite from './pages/write/MyWrite';
import VocabHome from './pages/vocab/VocabHome';
import Settings from './pages/Settings';
import Placement from './pages/Placement';
import SpeakRoute from './pages/speak/SpeakRoute';
import SpeakDialogue from './pages/speak/SpeakDialogue';
import SpeakIelts from './pages/speak/SpeakIelts';
import Pronounce from './pages/Pronounce';

// GitHub Pages (and the future Capacitor shell) can't resolve arbitrary
// history-API paths, so this app is hash-routed end to end.
export const router = createHashRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Today /> },
      { path: 'listen', element: <ListenListRoute /> },
      { path: 'listen/:id', element: <ListenLessonRoute /> },
      { path: 'custom-listen', element: <CantoCustom /> },
      { path: 'read', element: <ReadList /> },
      { path: 'read/:id', element: <ReadArticle /> },
      { path: 'write', element: <WriteHome /> },
      { path: 'write/translate', element: <Translate /> },
      { path: 'write/free', element: <FreeWrite /> },
      { path: 'write/custom', element: <MyWrite /> },
      { path: 'vocab', element: <VocabHome /> },
      { path: 'settings', element: <Settings /> },
      { path: 'placement', element: <Placement /> },
      { path: 'speak', element: <SpeakRoute /> },
      { path: 'speak/dialogue', element: <SpeakDialogue /> },
      { path: 'speak/ielts', element: <SpeakIelts /> },
      { path: 'pronounce', element: <Pronounce /> },
    ],
  },
]);
