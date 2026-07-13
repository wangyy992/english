import { createHashRouter } from 'react-router-dom';
import RootLayout from './RootLayout';
import Today from './pages/Today';
import ListenList from './pages/listen/ListenList';
import ListenLesson from './pages/listen/ListenLesson';
import ReadList from './pages/read/ReadList';
import ReadArticle from './pages/read/ReadArticle';
import WriteHome from './pages/write/WriteHome';
import VocabHome from './pages/vocab/VocabHome';
import Settings from './pages/Settings';

// GitHub Pages (and the future Capacitor shell) can't resolve arbitrary
// history-API paths, so this app is hash-routed end to end.
export const router = createHashRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Today /> },
      { path: 'listen', element: <ListenList /> },
      { path: 'listen/:id', element: <ListenLesson /> },
      { path: 'read', element: <ReadList /> },
      { path: 'read/:id', element: <ReadArticle /> },
      { path: 'write', element: <WriteHome /> },
      { path: 'vocab', element: <VocabHome /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]);
