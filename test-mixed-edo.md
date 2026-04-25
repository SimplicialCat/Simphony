# EDO 切换测试

测试页面同时包含12EDO和19EDO音乐时的键盘切换功能。

## 12EDO 音乐（默认）

```music
let key = C
let bpm = 120

1 2 3 4 | 5 - - - | 1 - - -
```

## 19EDO 音乐

```music
let edo = 19
let key = C
let bpm = 120

1 2 3 4 | 5 - - - | 1 - - -
```

## 12EDO 音乐（另一个调）

```music
let key = F
let bpm = 120

1 3 5 - | 5 3 1 - |
```

## 19EDO 音乐（Eb调）

```music
let edo = 19
let key = Eb
let bpm = 180

3 4 3
| ^1 - - 7 ^1 7 6 7
```

## 测试说明

1. 页面加载时，会根据第一个音乐块创建键盘（12EDO）
2. 点击19EDO音乐的播放按钮时，键盘应切换为19EDO布局（显示紫键和蓝键）
3. 再次点击12EDO音乐的播放按钮时，键盘应切换回12EDO布局（黑白键）
4. 键盘切换应该是即时的，不需要刷新页面
