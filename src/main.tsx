import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router'
import { SettingsProvider } from './context/SettingsContext'
import { WordLookupProvider } from './context/WordLookupContext'
import * as storage from './lib/storage'
import { getCourseLang } from './lib/lang'
import * as sync from './lib/sync'

// 初始化存儲命名空間(據 settings 的當前課程語言),必須在任何數據讀取前。
storage.setActiveLang(getCourseLang())
sync.start()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <WordLookupProvider>
        <RouterProvider router={router} />
      </WordLookupProvider>
    </SettingsProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
