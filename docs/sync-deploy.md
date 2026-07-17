# 雲同步服務部署(Cloudflare Workers,免費檔即可)

一次性部署,之後多設備自動同步。前提:註冊 [Cloudflare](https://dash.cloudflare.com) 帳號(免費)。

```bash
cd server/sync-worker

# 1. 登錄(會開瀏覽器授權)
npx wrangler login

# 2. 建 KV 存儲,把輸出的 id 填進 wrangler.toml 的 kv_namespaces
npx wrangler kv namespace create DATA

# 3. 設密鑰
npx wrangler secret put AUTH_SECRET      # 貼一段隨機長字符串(openssl rand -hex 32)
npx wrangler secret put RESEND_API_KEY   # https://resend.com 免費註冊拿 API Key

# 4.(強烈建議)wrangler.toml 裡把 ALLOWED_EMAILS 設成你自己的郵箱

# 5. 部署,記下輸出的 https://robin-sync.<你的子域>.workers.dev
npx wrangler deploy
```

然後在 App 設定頁「云同步」填入服務地址和郵箱 → 收驗證碼 → 登錄。

## 說明

- **發信**:用 Resend 免費檔(每天 100 封,驗證碼綽綽有餘),寄件人是 `onboarding@resend.dev`。Resend 未驗證自有域名時只能發給你註冊 Resend 的那個郵箱——自用剛好夠。不想配 Resend 時可把 `DEV_MODE` 設 `"1"`,驗證碼會直接顯示在 App 裡(僅限自己調試)。
- **同步策略**:服務端為準、本地為緩存。改動後約 3 秒自動上傳;打開 App 自動拉取;版本衝突時以服務端覆蓋本地。
- **安全**:token 為 HMAC 簽名,90 天有效;`ALLOWED_EMAILS` 白名單防止陌生人往你的 KV 寫數據;登錄憑證不包含在導出備份裡,「清空全部數據」也不會登出。
- **費用**:Workers 免費檔每天 10 萬次請求、KV 免費檔讀 10 萬/寫 1 千次每天,單人使用遠用不完。
