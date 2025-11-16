/// <reference types="vite/client" />

// Vite 环境变量类型定义
interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string
  // 可以在这里添加其他以 VITE_ 开头的环境变量类型
}

// 扩展 ImportMeta 接口以包含 BASE_URL
interface ImportMeta {
  readonly env: ImportMetaEnv
  readonly BASE_URL: string
}

