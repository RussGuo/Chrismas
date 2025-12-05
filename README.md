# 🎄 Grand Luxury Interactive Christmas Tree · CINCIN Edition

一个为 CINCIN 定制的 3D 圣诞树体验：  
使用 React + Vite + React Three Fiber + Three.js 渲染豪华祖母绿金色圣诞树，  
结合摄像头手势（拇指 + 食指）控制视角，照片、文字、语音卡片像粒子一样在树周围自由漂浮。

---

## ✨ 功能概览

- **双状态圣诞树**
  - `FORMED`：树完整聚合，枝叶、礼物盒、彩球、灯光围绕树身排布。
  - `CHAOS`：树散开为粒子，所有元素（包括照片/文字/语音卡片）在树周围自由漂浮。

- **手势 & 视角控制**
  - 只跟踪 **拇指 + 食指**：
    - 拇指与食指 **张开**：进入 CHAOS（混沌）状态。
    - 拇指与食指 **合拢（捏合）**：回到 FORMED（聚合）状态。
  - 拇指 + 食指中点控制视角：
    - 左右移动：水平绕树旋转。
    - 上下移动：俯仰视角。

- **照片 / 文字 / 语音卡片**
  - **照片卡片**：拍立得样式，相框 + 照片纹理，在树身周围像粒子一样漂浮。
  - **文字卡片**：默认展示一张 `FOR CINCIN` 的卡片，可从 UI 添加更多文本记忆。
  - **语音卡片**：可以通过 UI 录制语音，生成带“播放”图标的卡片，同样在树中漂浮。
  - 在 CHAOS 状态下，这些卡片 **不再吸附 / 放大**，只做轻微、不规则的漂浮运动。

- **预设照片自动加载**
  - 只要把任意数量的照片放到仓库根目录的 `photos` 文件夹下（扩展名 `.jpg / .jpeg / .png / .gif / .webp`，大小写不限），
    在启动 / 构建时会自动被复制到 `public/photos` 并生成 `manifest`，加载为圣诞树上的拍立得卡片。

---

## 📁 目录说明（与本项目相关部分）

- `App.tsx`：应用入口，管理模式（FORMED/CHAOS）、手势坐标、照片/文字/语音列表。
- `components/Experience.tsx`：3D 场景核心：
  - 粒子树 (`Foliage`)、
  - 装饰物 (`Ornaments`)、
  - 照片卡片 (`Polaroids`)、
  - 文字卡片 (`TextCards`)、
  - 语音卡片 (`AudioCards`)、
  - 树顶星星 (`TreeStar`)。
- `components/GestureController.tsx`：
  - 基于 `@mediapipe/tasks-vision` 进行手势识别；
  - 只使用拇指+食指判断张开/捏合和位置；
  - 视角控制 + 模式切换。
- `scripts/generate-photos-manifest.js`：
  - 扫描根目录 `photos/` 下所有图片；
  - 拷贝到 `public/photos/`；
  - 生成 `public/photos/manifest.json` 供前端读取。
- `public/models/hand_landmarker.task`：
  - MediaPipe 手势模型文件（通过 `npm run download-model` / `postinstall` 自动下载）。
- `vercel.json`：
  - Vercel 部署配置（build 命令、输出目录、框架类型及 rewrites）。

---

## 🛠 本地开发 & 运行

### 环境要求

- Node.js 18+（推荐使用 LTS）
- npm 8+（项目已使用 npm lock）

### 安装依赖

```bash
npm install
```

### 预设照片（可选，推荐）

1. 在仓库根目录创建或使用已有文件夹 `photos/`：
   ```bash
   mkdir -p photos
   ```
2. 将任意数量的图片放进 `photos/`，支持的格式：
   - `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
   - 不区分大小写（`.JPG` 也会被识别）
3. 启动或构建时脚本会自动：
   - 将这些图片复制到 `public/photos/`
   - 在 `public/photos/manifest.json` 中写入路径列表

> 每次替换 `photos/` 中的内容后，重新跑 `npm run dev` 即可生效。

### 启动本地开发服务器

```bash
npm run dev
```

访问：

- `http://localhost:3010`
- 首次进入时浏览器会请求摄像头权限（用于手势识别），需要点击允许；
- 默认会看到：
  - 一棵豪华 3D 圣诞树，
  - 树周围漂浮的拍立得照片（来自 `photos/`），
  - 一张 `FOR CINCIN` 的文字卡片。

### 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录下。

---

## 🙌 手势 & 交互说明

### 拇指 + 食指（手势）

- **进入混沌（CHAOS）**
  - 拇指与食指张开，距离明显大于它们的基节距离。
- **恢复圣诞树（FORMED）**
  - 拇指与食指捏合在一起（距离明显变小）。

### 控制视角

- 使用拇指+食指的中点作为控制点：
  - 向左 / 向右移动：水平绕树旋转；
  - 向上 / 向下移动：抬高 / 俯视视角。
- 手不动时，会有轻微平滑去抖动逻辑，保证画面稳定。

### 鼠标控制（备份方案）

当没有检测到手势时，可以用鼠标：

- 左键拖动：绕树旋转视角；
- 滚轮：缩放远近；
- （如需要，可在 `Experience.tsx` 中开启/调整其他控制参数）。

---

## 🖼 照片 / 文字 / 语音

### 照片

- 预设照片：来自仓库根目录 `photos/` 的所有图片；
- 运行时照片会：
  - 在 FORMED 状态挂在树外侧；
  - 在 CHAOS 状态像粒子一样在树周围自由漂浮（不吸附、不放大）。
- 也可以通过页面中的“上传照片”入口追加更多照片。

### 文字（默认 `FOR CINCIN`）

- 默认有一张 `FOR CINCIN` 文本卡片；
- 可通过右下角隐蔽入口添加新的文字卡片，文字会显示在卡片上；
- 在 FORMED/CHAOS 状态下与其它卡片同样参与漂浮。

### 语音

- 通过右下角隐蔽入口录制语音；
- 每段语音生成一张带播放图标的 3D 卡片；
- 目前语音播放由隐藏的 `<audio>` 元素控制，卡片只是视觉呈现，不再绑定吸附逻辑。

---

## ▲ 部署到 Vercel

项目已经包含 `vercel.json`，适配 Vite：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 部署步骤（推荐）

1. **推送到 GitHub（见下一节）。**
2. 打开 [Vercel](https://vercel.com/) 控制台，点击 **New Project**。
3. 选择仓库 `RussGuo/Chrismas`。
4. 确认以下配置（通常会自动识别）：  
   - Framework Preset: `Vite`  
   - Build Command: `npm run build`  
   - Output Directory: `dist`  
5. 点击 **Deploy**，等待构建完成。
6. 部署成功后，Vercel 会给出一个 HTTPS 链接，访问即可看到圣诞树。

如果你在 Vercel 上也希望使用根目录 `photos/` 中的图片，可以：

- 把 `photos/` 目录也一起提交到 GitHub；  
- 构建时 `scripts/generate-photos-manifest.js` 会照常运行，自动复制并生成 manifest。

---

## 🔁 推送到 GitHub（`https://github.com/RussGuo/Chrismas.git`）

在本地项目根目录（`christmas-tree`）中执行：

```bash
# 初始化 Git（如果还没初始化）
git init

# 添加远程仓库（如果尚未添加）
git remote add origin https://github.com/RussGuo/Chrismas.git

# 添加所有文件
git add .

# 提交一次
git commit -m "feat: CINCIN interactive Christmas tree"

# 推送到 main 分支（如远程默认分支是 main）
git branch -M main
git push -u origin main
```

之后你就可以在 GitHub 上看到完整项目代码，并在 Vercel 里直接从这个仓库拉取部署。

---

## 🎅 最后

这个版本的圣诞树重点是：

- 保留 3D 粒子的空间感和奢华视觉；
- 让照片/文字/语音卡片自然地挂在圣诞树周围；
- 用简单、稳定的手势控制视角，而不是复杂、容易出问题的吸附交互。

希望它能成为一个属于 CINCIN 的专属圣诞礼物。 🎄✨
