# 蹭饭地图 (Meal Map)

一个基于 React + TypeScript 的交互式地图应用，用于在地图上标记和管理同学信息，方便记录和查看各地同学分布情况。

> 🎯 **项目特点**：纯前端应用，无需后端服务，所有数据存储在浏览器本地，支持离线使用。

## 📋 项目简介

蹭饭地图是一个轻量级的 Web 应用，支持在中国地图和美国地图上添加、编辑和管理同学信息。通过可视化的方式展示同学的地理分布，并支持导出为图片格式，方便分享和保存。

## ✨ 主要功能

### 🗺️ 地图功能
- **双地图支持**：支持中国地图和美国地图切换
- **交互式地图**：点击地图上的省份/州可以添加同学信息
- **SVG 矢量地图**：使用高质量的 SVG 地图，支持缩放和交互
- **地图缩放**：支持放大、缩小和重置视图

### 👥 同学管理
- **添加同学**：点击地图上的区域，填写同学姓名和具体城市
- **编辑信息**：随时编辑已添加的同学信息
- **删除同学**：支持删除不需要的同学记录
- **批量查看**：同一区域的多位同学会聚合显示

### 🎨 个性化定制
- **区域颜色管理**：为每个省份/州自定义颜色
- **预设颜色方案**：提供多种预设颜色
- **自定义颜色**：支持使用自定义十六进制颜色值
- **样式设置**：可调整空区域颜色和画布背景色

### 📤 导出功能
- **图片导出**：支持导出为 PNG 或 JPEG 格式
- **高质量导出**：支持高分辨率导出，适合打印和分享
- **自动命名**：导出文件自动包含日期和国家信息

### 💾 数据存储
- **本地存储**：所有数据保存在浏览器 localStorage 中
- **数据持久化**：刷新页面后数据不会丢失
- **位置记忆**：学生卡片的位置会被保存，下次打开时自动恢复

### 🎯 交互体验
- **拖拽卡片**：学生卡片可以自由拖拽到合适位置
- **连接线**：自动显示从地图区域到学生卡片的连接线
- **响应式设计**：支持桌面端和移动端访问
- **流畅动画**：丰富的过渡动画和交互反馈

## 🛠️ 技术栈

- **前端框架**：React 18.3
- **开发语言**：TypeScript
- **构建工具**：Vite 6.0
- **UI 组件库**：Radix UI
- **样式方案**：Tailwind CSS
- **图标库**：Lucide React
- **地图导出**：html2canvas
- **数据存储**：localStorage（浏览器本地存储）
- **代码分割**：Vite Rollup 手动分块优化
- **CI/CD**：GitHub Actions 自动部署

## 📦 安装与运行

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

### 预览生产构建

```bash
npm run preview
```

## 📁 项目结构

```
meal-map/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 自动部署配置
├── public/                     # 静态资源
│   ├── data/                  # 地图配置文件
│   │   └── maps-config.json   # 中国和美国地图元数据
│   ├── maps/                   # SVG 地图文件
│   │   ├── china/             # 中国各省 SVG 地图（34个文件）
│   │   ├── usa/               # 美国各州 SVG 地图
│   │   ├── china-combined.svg # 中国合并地图
│   │   └── usa-combined.svg  # 美国合并地图
│   └── regions/               # 区域数据（可选）
├── src/
│   ├── components/            # React 组件
│   │   ├── InteractiveMap.tsx      # 交互式地图组件（核心）
│   │   ├── Navigation.tsx           # 导航栏组件
│   │   ├── StudentCard.tsx          # 学生卡片组件
│   │   ├── StudentModal.tsx         # 学生信息编辑弹窗
│   │   ├── StudentListModal.tsx     # 学生列表弹窗
│   │   ├── ExportModal.tsx          # 导出弹窗
│   │   ├── RegionColorManager.tsx   # 区域颜色管理组件
│   │   ├── ColorPicker.tsx         # 颜色选择器组件
│   │   └── ErrorBoundary.tsx       # 错误边界组件
│   ├── lib/                   # 工具库
│   │   ├── storage.ts         # 本地存储管理
│   │   └── types.ts           # 类型定义（Region, MapsConfig）
│   ├── App.tsx                # 主应用组件
│   ├── main.tsx               # 应用入口
│   └── index.css              # 全局样式
├── index.html                 # HTML 模板
├── package.json               # 项目配置和依赖
├── package-lock.json          # 依赖锁定文件
├── tsconfig.json              # TypeScript 主配置
├── tsconfig.app.json          # TypeScript 应用配置
├── tsconfig.node.json         # TypeScript Node 配置
├── vite.config.ts             # Vite 配置（含代码分割优化）
├── tailwind.config.js         # Tailwind CSS 配置
├── postcss.config.js          # PostCSS 配置
├── eslint.config.js           # ESLint 配置
└── README.md                  # 项目文档
```

## 🎮 使用指南

### 添加同学信息

1. 点击地图上的任意省份/州
2. 在弹出的对话框中填写：
   - **姓名**：同学的姓名（必填）
   - **具体城市**：同学所在的具体城市（必填）
3. 点击"保存"按钮

### 编辑同学信息

- 点击地图上的学生卡片
- 在弹出的编辑对话框中修改信息
- 点击"保存"保存更改

### 删除同学

- 点击学生卡片上的删除按钮
- 确认删除操作

### 管理区域颜色

1. 点击导航栏的"颜色管理"按钮
2. 选择要修改颜色的区域
3. 从预设颜色中选择或输入自定义颜色值
4. 点击确认应用颜色

### 导出地图

1. 点击导航栏的"导出当前"按钮
2. 选择导出格式（PNG 或 JPEG）
3. 点击"导出地图"按钮
4. 图片将自动下载到本地

### 拖拽卡片

- 按住学生卡片并拖动可以调整位置
- 卡片位置会自动保存，下次打开时恢复

### 地图缩放

- 使用右下角的控制按钮：
  - **放大**：点击放大按钮或使用鼠标滚轮
  - **缩小**：点击缩小按钮
  - **重置**：恢复到初始视图

## 🔧 配置说明

### 地图配置

地图配置文件位于 `public/data/maps-config.json`，包含：
- 中国各省的元数据（名称、坐标、类型等）
- 美国各州的元数据
- 地图版本和描述信息

地图文件：
- 中国：34 个省级行政区的 SVG 文件（`public/maps/china/`）
- 美国：50 个州的 SVG 文件（`public/maps/usa/`）
- 合并地图：`china-combined.svg` 和 `usa-combined.svg`

### 样式配置

样式设置保存在浏览器 localStorage 中，包括：
- 空区域颜色：没有同学的区域显示的颜色
- 画布背景色：地图背景颜色

可在"颜色管理"中调整这些设置。

### 数据存储

所有数据使用以下 localStorage 键名：
- `meal_map_students`：学生数据
- `meal_map_region_colors`：区域颜色设置
- `meal_map_style_settings`：样式设置
- `meal_map_card_positions_{country}`：卡片位置（按国家分别存储）
- `meal_map_version`：数据版本号（用于数据迁移）

### 构建优化

项目已配置代码分割优化（`vite.config.ts`）：
- React 核心库独立打包
- html2canvas 独立打包（按需加载）
- Radix UI 组件库独立打包
- Lucide React 图标库独立打包
- 其他工具库独立打包

这样可以：
- 减小初始加载体积
- 提高缓存效率
- 优化加载性能

## 🎨 颜色方案

项目提供以下预设颜色：
- 天空蓝 (#0EA5E9)
- 翠绿 (#10B981)
- 紫罗兰 (#A855F7)
- 橙色 (#F97316)
- 玫红 (#F43F5E)
- 青色 (#06B6D4)

也支持使用自定义十六进制颜色值。

## 📱 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

建议使用最新版本的现代浏览器以获得最佳体验。

## ⚙️ 开发说明

### 代码规范

项目使用 ESLint 进行代码检查：

```bash
npm run lint
```

### 构建优化

项目已配置代码分割（`vite.config.ts`），构建后的文件会被分割为多个 chunk：
- `vendor-react.js` (~146 KB) - React 核心库
- `index.js` (~152 KB) - 应用主代码
- `vendor-html2canvas.js` (~202 KB) - 地图导出功能（按需加载）
- `vendor.js` (~4 KB) - 其他依赖

所有 chunk 都小于 500KB，优化了加载性能和缓存效率。

### 环境变量

项目支持通过环境变量配置（如果需要）：
- `VITE_*` 前缀的环境变量可以在代码中通过 `import.meta.env.VITE_*` 访问

### 数据迁移

项目内置数据迁移机制，当数据结构发生变化时，会自动迁移旧数据到新格式。当前版本：**v3.0**

### 项目命名说明

项目在 `package.json` 中的名称是 `react_repo`，这是历史遗留，实际项目名称为"蹭饭地图"。

## 🚀 部署

### GitHub Pages 自动部署（推荐）

项目已配置 GitHub Actions 自动部署：

1. 将项目推送到 GitHub 仓库
2. 在仓库设置中启用 GitHub Pages（选择 `gh-pages` 分支）
3. 每次推送到 `main` 分支时，GitHub Actions 会自动：
   - 安装依赖（使用 npm 缓存加速）
   - 构建项目
   - 部署到 `gh-pages` 分支

配置文件：`.github/workflows/deploy.yml`

### 其他平台

项目使用标准的 Vite 构建，可以部署到任何支持静态网站托管的平台：

#### Vercel 部署
1. 将项目推送到 GitHub
2. 在 Vercel 中导入项目
3. 构建命令：`npm run build`
4. 输出目录：`dist`

#### 其他选项
- Netlify
- Cloudflare Pages
- 自建服务器（Nginx、Apache 等）

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目采用 MIT 许可证。

## 🙏 致谢

- 感谢所有提供地图数据的开源项目
- 感谢 Radix UI 提供的优秀组件库
- 感谢 Tailwind CSS 提供的样式框架

## 📞 联系方式

如有问题或建议，欢迎通过 Issue 反馈。

---

**享受使用蹭饭地图，记录你的同学分布！** 🎉

