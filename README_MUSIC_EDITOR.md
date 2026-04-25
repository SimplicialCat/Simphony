# 音乐编辑器 (Music Editor)

一个极简风格的独立音乐编辑器，支持12-EDO和19-EDO音乐记谱法。

## ⚠️ 重要说明

**这是一个 standalone (独立) 项目，不需要 Kodama 构建！**

只需要在浏览器中打开 `music.html` 即可使用，无需任何构建步骤。

## 文件说明

- **music.html** - 主编辑器页面（独立文件，包含所有UI）
- **music-parser.js** - 音乐解析引擎（独立文件，从music-player.js提取）
- **test-piano.html** - 钢琴键盘测试页面

### ⛔ 不需要 Kodama

这三个文件都是独立的：
- 不需要 `kodama build`
- 不需要 `python insert-script.py`
- 直接双击 `music.html` 或拖入浏览器即可使用

## 与 music-player.js 的区别

| 特性 | music-player.js | music.html (standalone) |
|------|-----------------|------------------------|
| 用途 | 页面集成 | 独立编辑器 |
| 依赖 | Kodama构建系统 | 无依赖 |
| 部署 | 需要构建 | 即开即用 |
| 修改来源 | ❌ 不推荐修改 | ✅ 可自由修改 |
| 键盘修复 | ✅ 已修复 | ✅ 使用相同逻辑 |

**注意：** music-player.js 是用于网站集成的，由 Kodama 管理。standalone 项目不要使用 Kodama。

## 功能特点

### 🎹 极简界面
- **大面积输入框** - 占据屏幕主要空间，方便编辑音乐代码
- **顶部控制栏** - 播放/停止按钮和状态显示
- **底部键盘** - 动态切换12-EDO（黑白键）和19-EDO（白紫蓝键）
- **进度条** - 可拖动进度，快速定位

### 🎼 支持功能
- **12-EDO音乐** - 标准十二平均律
- **19-EDO音乐** - 十九平均律，带紫键和蓝键
- **实时解析** - 输入代码后立即可以播放
- **自动切换键盘** - 根据音乐EDO自动切换键盘布局
- **钢琴演奏** - 点击键盘即可试听音高

## 使用方法

### 基本步骤

1. **打开编辑器**
   ```
   在浏览器中打开 music.html
   ```

2. **输入音乐代码**
   在大文本框中输入音乐记谱代码，例如：

   ```music
   let edo = 12
   let key = C
   let bpm = 120

   1 2 3 4 | 5 - - - | 1 - - -
   ```

3. **点击播放**
   - 点击 **▶ 播放** 按钮开始播放
   - 点击 **⏹ 停止** 按钮停止播放
   - 播放时可点击进度条跳转

4. **试听键盘**
   - 点击底部键盘的任意键可试听音高
   - 键盘会根据当前音乐的EDO自动切换

### 记谱法语法

#### 基本设置
```music
let edo = 12    # 设置平均律（12 或 19）
let key = C     # 设置调式
let bpm = 120   # 设置速度
```

#### 音符表示
- `1 2 3 4 5 6 7` - do re mi fa sol la si
- `#1` - 升do
- `b2` - 降re
- `^1` - 高八度do
- `_1` - 低八度do
- `0` - 休止符

#### 节奏
- `-` - 延长一拍
- `--` - 延长两拍
- `|` - 小节线（分隔）

#### 高级语法
- `(1 3 5)` - 和弦（同时演奏）
- `^{ ... }` - 高八度区域
- `_{ ... }` - 低八度区域
- `={ ... }` - 缩短一半时值
- `@{ ... }` - 延音踏板区域

### 示例代码

#### 12-EDO C大调音阶
```music
let edo = 12
let key = C
let bpm = 120

1 2 3 4 | 5 - - - | 1 - - -
3 4 5 - | 5 4 3 2 | 1 - - -
```

#### 19-EDO 音乐
```music
let edo = 19
let key = C
let bpm = 120

1 #1 b2 2 | #2 b3 3 - |
```

#### 19-EDO Eb调（修复后）
```music
let edo = 19
let key = Eb
let bpm = 180

^1 - - 7 ^1 7 6 7
```

## 技术实现

### 架构
```
music.html (UI界面)
    ↓
music-parser.js (解析引擎)
    ↓
Web Audio API (音频播放)
```

### 核心模块

**MusicParser** - 全局对象，提供：
- `parseMusic(code)` - 解析音乐代码
- `processSustainPedals(score)` - 处理延音踏板
- `AudioPlayer` - 音频播放器类
- `EDO_19_KEY_SEQUENCE` - 19-EDO键盘布局
- `KEY_19EDO_POSITIONS` - 19-EDO调式位置

### 键盘切换逻辑

```javascript
function switchPiano(edo) {
    if (currentEdo === edo) return;  // 已经是目标EDO
    currentEdo = edo;
    if (edo === 19) {
        create19EdoPiano();  // 创建19-EDO键盘（白紫蓝）
    } else {
        create12EdoPiano();  // 创建12-EDO键盘（黑白）
    }
}
```

## 优势

相比music-player.js的集成方案：

### ✅ 独立性
- 单文件即可运行，不需要Kodama构建系统
- 不依赖页面中的`<code class="language-music">`块
- 可以在任何HTML页面中使用

### ✅ 专注性
- 界面简洁，专注于编辑和播放
- 大输入框，代码编辑体验好
- 键盘始终可见，随时试听

### ✅ 可扩展性
- music-parser.js可被其他项目引用
- 清晰的API接口
- 易于添加新功能

## 浏览器兼容性

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

需要支持：
- Web Audio API
- ES6 JavaScript
- CSS Flexbox

## 未来改进

- [ ] 添加撤销/重做功能
- [ ] 代码高亮显示
- [ ] 导出MIDI文件
- [ ] 导出音频文件
- [ ] 更多键盘布局
- [ ] 可视化频谱显示
- [ ] 多音轨编辑

## 相关文件

- `music-player.js` - 完整的音乐播放器（用于页面集成）
- `test-19edo.html` - 19-EDO测试页面
- `test-mixed-edo.md` - 混合EDO测试页面
