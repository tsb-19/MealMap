import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import sourceIdentifierPlugin from 'vite-plugin-source-identifier'

const isProd = process.env.BUILD_MODE === 'prod'
// GitHub Pages 部署时的 base 路径
// 如果是 username.github.io 仓库，使用 '/'；否则使用 '/repository-name/'
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [
    react(), 
    sourceIdentifierPlugin({
      enabled: !isProd,
      attributePrefix: 'data-matrix',
      includeProps: true,
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 将 node_modules 中的依赖分离到不同的 chunk
          if (id.includes('node_modules')) {
            // React 核心库
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            // html2canvas (地图导出功能，按需加载)
            if (id.includes('html2canvas')) {
              return 'vendor-html2canvas'
            }
            // Radix UI 组件库
            if (id.includes('@radix-ui')) {
              return 'vendor-radix'
            }
            // Lucide React 图标库
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            // 其他大型依赖
            if (id.includes('recharts') || id.includes('date-fns') || id.includes('zod')) {
              return 'vendor-utils'
            }
            // 其他第三方库
            return 'vendor'
          }
        },
      },
    },
    // 调整 chunk 大小警告限制（可选，如果分割后仍然较大）
    chunkSizeWarningLimit: 600,
  },
})

