# 上架前置軌道(獨立,不阻塞 Phase 1-3,啟動需用戶明確指示)

1. **薄後端**:單一 API 代理(建議 Cloudflare Workers),持有 DeepSeek/Azure key,按用戶限流 + 用量統計;前端 `deepseek.ts` 與 `speech/` 只改 baseURL,介面不變。
2. **帳號與同步**:storage.ts 之上加同步層,服務端為準、本地為緩存。
3. **Capacitor 打包**:Android 先行;錄音、通知、後台音頻逐項驗證。
4. **素材版權複核**:上架前逐源確認再分發權(延續「音頻不落庫、註明出處」)。
