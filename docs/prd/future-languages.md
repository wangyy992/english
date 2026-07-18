# 未來語言擴展調研:粵語 / 韓語 / 法語

> 狀態:**僅調研,暫不接入**。用戶計劃日後加入粵語、韓語、法語三種語言,並各帶一個「學發音」欄目(粵拼 / 韓文字母 / 法語音標)。
> 本文檔記錄可用的辭書、閱讀/聽力素材源、發音體系,以及對現有架構的影響評估,供日後開工時直接參考,不用臨時再查。
> 調研日期:2026-07。所有授權以正式接入前逐源複核為準(延續現有「音頻不落庫、註明出處」策略)。

---

## 0. 先說架構影響(重要)

現有 App 是**英語單語**設計,PRD「非目標」明確寫過「僅英語」。加入多語言是一次**真實的架構分叉**,不是加幾個素材那麼簡單。開工前需要先處理:

1. **語言維度**:引入「當前學習語言」概念。`storage.ts` 的 key 需按語言命名空間隔離(英語生詞本不能和法語混在一起);`vocab` / `day_plan` / `ability` / `wordbook` 都要分語言存。建議加 schema 遷移:把現有無前綴數據歸入 `en`。
2. **語音層 locale**:`src/lib/speech/recognition.ts` 和 `speak()` 目前硬編碼 `en-US`。需把 locale 作參數往下傳。**好消息:Azure 發音評分支持全部三種目標語言**(見 §1),Phase 2 的評分管線可直接複用,只換 locale。
3. **發音欄是新模組類型**:現有五模組(聽/說/讀/寫/詞彙)之外的新東西。粵拼/韓文字母/法語音標本質是「字母表 + 發音跟讀」,可做成一個通用的「發音基礎」模組,按語言載入不同的音位表數據。
4. **能力模型**:五維是按英語技能設計的。發音欄可映射到 speaking 維度,或給非英語語言單獨一套維度。
5. **DeepSeek prompts**:批改/對話/點評的 prompt 都假設「學英語的中文使用者」,需按目標語言參數化。

**建議路線**:先把「當前語言」+ 存儲命名空間 + 語音 locale 這三件地基做好(一個獨立 Phase),再逐語言接素材。發音欄因為與 Azure 現成管線契合度高,可作為每種語言的第一個可用功能。

---

## 1. 跨語言通用基礎設施

| 能力 | 資源 | 授權 | 備註 |
|---|---|---|---|
| **發音評分** | Azure 發音評分 | 商用(現有 Key) | 官方確認支持 `zh-HK`(粵語)、`ko-KR`(韓語)、`fr-FR`(法語)、`zh-CN`。**發音欄核心可直接複用 Phase 2 的 `assessScripted`,只換 locale**。法語 GA,其餘為近期擴展批次 |
| **辭書(機讀)** | [kaikki.org](https://kaikki.org/)(Wiktextract) | CC BY-SA 3.0/4.0 + GFDL | 從 Wiktionary 抽取的 JSON 詞典,覆蓋法/韓/粵及數百語言,含釋義/音標/詞形。每週更新。**可像現有內置詞書那樣切片打包成靜態 JSON**,契合純前端架構。需註明出處 |
| **例句(帶音頻)** | [Tatoeba](https://tatoeba.org/en/downloads) | 文本 CC BY 2.0 FR;音頻逐條授權不一 | 三種語言都有句子,部分帶真人音頻。音頻授權**逐條**不同,接入前要按條過濾許可 |
| **釋義/翻譯/對話** | DeepSeek(現有) | 商用 | 中文釋義、情境對話、批改點評可直接沿用,prompt 換語言參數 |

> ⚠️ 現有的 `dictionary.ts` 用的 dictionaryapi.dev **只支持英語**,不能直接用於三種新語言。查詞要麼換 kaikki 離線切片,要麼各語言接專用 API(見下)。

---

## 2. 粵語(Cantonese)

### 辭書
| 資源 | 授權 | 說明 |
|---|---|---|
| [rime-cantonese](https://github.com/rime/rime-cantonese) | **CC BY 4.0**(需署名,可商用) | CanCLID 維護的粵語詞庫,帶粵拼。PyCantonese 已整合,**首選** |
| [words.hk 粵典](https://words.hk/faiman/analysis/) | 數據頁聲明釋出至公有領域(鼓勵署名) | 最全的粵語詞典之一,釋義豐富。**接入前務必複核當前授權條款** |
| [CC-Canto](http://www.cantonese.sheik.co.uk/) | CC BY-SA | 約 25000 條粵英詞典,可配 CC-CEDICT |

### 發音欄(用戶要求:粵拼)
- **粵拼(Jyutping)體系**:19 聲母 + 53 韻母 + **6 個聲調**。聲調是粵語發音最難的點,發音欄應重點做**聲調辨識與跟讀**。
- 欄目設計草案:聲母表 / 韻母表 / 聲調對照(用最小對立詞如 si1/si2/si3… 六聲示範)→ 每項可 TTS 示範 + Azure `zh-HK` 跟讀評分。
- 音位表數據可從 rime-cantonese 或 opencantonese.org 的粵拼表整理成靜態 JSON。

### 閱讀 / 聽力素材
- **閱讀**:[粵語維基百科](https://zh-yue.wikipedia.org)(CC BY-SA)——可合法取正文,需署名。
- **聽力**:RTHK(香港電台,公共廣播,母語者語速,非學習者導向)有 podcast RSS,但**內容受版權保護、非 CC**,只能串流/外鏈+註明出處,不可落庫;部分開放數據見 data.gov.hk。Chatty Cantonese 等學習播客帶粵拼/漢字/英譯三行對照,但為第三方版權,同樣只能外鏈。
- **策略**:延續現有聽力管線思路——RSS 抓取 + 只存時間戳與出處、音頻不落庫。

---

## 3. 韓語(Korean)

> 用戶說的「五十音」是日語概念;韓語對應的是**諺文(한글)字母**——19 輔音(14 基本 + 5 雙)+ 21 元音(10 基本 + 11 複合),再拼成音節塊。發音欄應做諺文字母 + 音節拼讀。

### 辭書
| 資源 | 授權 | 說明 |
|---|---|---|
| [KRDict / 한국어기초사전 Open API](https://github.com/omarkmu/krdict.py) | 免費(需申請 API Key) | 國立國語院官方,5 萬+ 詞條,**釋義帶多語翻譯(含中文、法語等)**、例句、發音、變位。是韓語首選,但為**在線 API**——契合日後「薄後端代理」軌道 |
| [우리말샘 Urimalsaem](https://en.wikipedia.org/wiki/Urimalsaem) | CC BY-SA 2.0 KR | 國立國語院眾包開放詞典,百萬詞條,可下載 |
| kaikki.org 韓語切片 | CC BY-SA | 離線方案,契合純前端 |

### 發音欄(諺文)
- 諺文字母表(자음/모음)→ 音節塊組合規則(初聲+中聲+終聲)→ 拼讀跟讀。
- 每字母/音節 TTS 示範 + Azure `ko-KR` 跟讀評分。
- 諺文設計規整,適合做「30 分鐘學會認字」式的快速入門欄目。

### 閱讀 / 聽力素材
- **閱讀**:[韓語維基百科](https://ko.wikipedia.org)(CC BY-SA);KRDict 例句可作分級短句。
- **聽力**:學習類播客(IYAGI、Sparkling Korean 等)多為第三方版權,只能外鏈;Podbbang 平台有大量韓語播客。**CC 授權的成品聽力材料稀缺**,實務上靠外鏈 + TTS 自造短材料(現有管線已有 AI 朗讀先例)。

---

## 4. 法語(French)

### 辭書
| 資源 | 授權 | 說明 |
|---|---|---|
| [GLAWI](https://aclanthology.org/L16-1218.pdf) / [GLAFF](https://huggingface.co/datasets/datasets-CNRS/GLAFF) | CC BY-SA 3.0 | 從法語維基詞典 Wiktionnaire 抽取,GLAWI 含定義/詞源/例句/音標;GLAFF 是帶音標的詞形表。**當代法語唯一免費含定義的資源** |
| kaikki.org 法語切片 | CC BY-SA | 離線 JSON,首選的統一方案 |
| [Lexique.org](http://www.lexique.org) | 開放 | 心理語言學詞頻表,適合做分級詞書 |

### 發音欄(音標)
- **法語 ~36 音位**:17 輔音 + 約 16 元音(含 3 鼻元音)+ 3 半元音。難點是**鼻元音、聯誦(liaison)、啞音字母**。
- 欄目設計:IPA 音位表(每音配示範詞)→ 鼻元音專項 → 聯誦規則練習 → Azure `fr-FR` 跟讀評分。
- 音位→例詞數據可從 GLAFF/Wiktionnaire 音標欄整理。

### 閱讀 / 聽力素材
- **閱讀**:[Project Gutenberg 法語書庫](https://www.gutenberg.org)(公有領域,注意剝離 Gutenberg 頭尾聲明再分發);[法語維基百科](https://fr.wikipedia.org)(CC BY-SA)。
- **聽力**:[RFI「Le français facile」](https://francaisfacile.rfi.fr)——分級新聞播客**帶逐字轉寫**,質量最高,但**版權所有、非 CC**,只能串流/外鏈 + 註明出處。Journal en français facile 有每日 RSS。
- **策略**:閱讀可落庫(Gutenberg 公有領域);聽力走外鏈 + 時間戳,同粵/韓。

---

## 5. 授權速查與紅線

**可安全落庫/再分發**(註明出處):
- rime-cantonese(CC BY 4.0)、CC-Canto(CC BY-SA)、Urimalsaem(CC BY-SA)、GLAWI/GLAFF(CC BY-SA)、kaikki 各語言切片(CC BY-SA)、Tatoeba 文本(CC BY)、Project Gutenberg 法語書(公有領域)、各語維基百科(CC BY-SA)。
- ⚠️ **CC BY-SA 有傳染性**:衍生數據需同樣以 BY-SA 釋出。若日後走商用閉源,優先選 CC BY / 公有領域源(rime-cantonese、words.hk、Gutenberg)。

**只能串流/外鏈、不可落庫**:
- RTHK、RFI、各學習類播客(IYAGI 等)——第三方版權。延續「音頻不落庫、註明出處」。

**需 API Key / 在線**:
- KRDict(韓語官方,免費申請)——適合放進日後的薄後端代理(和 DeepSeek/Azure key 一起託管)。

---

## 6. 待用戶決定的問題(開工前)

1. **範圍**:三種語言全上,還是先做一種試點?(建議粵語先行:rime-cantonese 授權最乾淨、Azure 支持、發音欄需求最明確)
2. **辭書統一方案**:全部走 kaikki 離線切片(純前端、一致、但 BY-SA 傳染),還是韓語走 KRDict 在線 API(需 Key/後端)?
3. **發音欄形態**:獨立的「發音基礎」入門模組(一次性學完字母/音標),還是融入每日任務?
4. **能力模型**:非英語語言復用五維,還是各語言獨立記分?

---

## 附:來源鏈接

- Azure 發音評分語言支持:https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=pronunciation-assessment
- kaikki.org / Wiktextract:https://kaikki.org/
- Tatoeba 下載:https://tatoeba.org/en/downloads
- rime-cantonese:https://github.com/rime/rime-cantonese
- words.hk 數據:https://words.hk/faiman/analysis/
- KRDict.py:https://github.com/omarkmu/krdict.py
- Urimalsaem:https://en.wikipedia.org/wiki/Urimalsaem
- GLAFF 數據集:https://huggingface.co/datasets/datasets-CNRS/GLAFF
- RFI 法語學習:https://francaisfacile.rfi.fr
- Jyutping 表:https://opencantonese.org/

---

## 粵語聽力素材源(留待真音頻管線)

當前粵語聽力用「自編短對話 + TTS(zh-HK)」實現(音頻不落庫)。日後接真實素材可考慮:

- **RTHK Podcast One / Naked Cantonese**(podcast.rthk.hk):香港公營廣播,粵語節目豐富;Naked Cantonese 是語言學習向。授權需逐節目確認,無現成逐句轉寫 → 需 whisper(支持 yue)生成句級時間戳,沿用英語 `fetch_lessons.py` 管線思路。
- **CantoTalk Music**:附文本、英譯、粵拼、詞彙表;授權待確認。
- 通用做法延續:音頻不落庫、註明出處;轉寫用 faster-whisper 粵語模型。
