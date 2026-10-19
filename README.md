# 小猫游戏多 · Unity

[进入游戏](https://nornttyy.github.io/catgames/)

竖屏猫咪小游戏合集：桌子捣蛋、偷吃鱼干、小猫跳一跳、猫猫跑酷赛、猫咪大乱斗。
现在首页运行 Unity 6 的 C# / IL2CPP / WebAssembly 构建，不使用旧 JavaScript 游戏逻辑或网页套壳。

## 游玩

手机使用画面按钮或滑动。大乱斗支持 A/D 移动、空格/W/K 跳跃、S 跳下、J 冲撞；Esc 暂停。
跑酷是 3 只猫，大乱斗是 6 只猫；对手均为电脑控制。两种模式都可选地图和休闲、普通、困难难度。
成绩保存在当前浏览器。第一次进入 Unity 版会尝试继承同一网址下旧版的猫咪颜色、纪录和设置，旧存档不删除。
浏览器可能要求首次点击才能播放声音，主菜单和暂停页可静音。

## 修改与构建

1. Unity Hub 打开 `unity/`，使用 **Unity 6000.3.20f1**，安装 Web Build Support。
2. 打开 `Assets/Scenes/CatGames.unity`，点击 Play 即可试玩。
3. 菜单「小猫游戏多 → 构建网页试玩」会先执行 345 项规则与迁移检查，再输出 `unity/Builds/Web`。
4. 在仓库根目录运行 `node tools/package-unity.mjs`，同步网页构建；运行 `node --test test/*.test.mjs` 检查发布文件与存档迁移。
5. 提交并推送 main，GitHub Pages 从根目录发布。Web 压缩启用解压回退，不依赖特殊 HTTP 压缩头。

「构建 Mac 试玩」可生成本地 Mac 应用。`Library`、构建缓存、编辑器安装文件和测试截图不进入仓库。
`build-info.json` 记录当前引擎、版本和导出文件校验值；每次打包给 Unity 文件添加内容哈希版本，避免旧缓存混用。

## 目录

- `unity/`：后续开发使用的完整 Unity 工程、原有美术和音频。
- `Build/`、`index.html`：当前公开试玩版。
- `legacy-web/`：迁移前的网页源码备份，不是当前首页；保留方便追溯，不再作为功能开发入口。
- `tools/package-unity.mjs`：同步源码与导出的打包脚本。

音乐和音效见 [声音署名](audio-credits.html)。中文字体 Noto Sans CJK SC 使用 [SIL OFL 1.1](Noto-SIL-OFL.txt)。
第三方素材保留原许可证；仓库公开不代表其他素材另行授权。
