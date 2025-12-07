# 自动刷课脚本集合 (AutoPlay Video Scripts)

本项目包含两个用于 `http://jjfz.muc.edu.cn` 在线培训平台的油猴脚本，旨在提升视频观看体验，实现全自动播放。

## 📂 脚本介绍

本项目提供了两个版本的脚本，请根据你的需求选择**其中一个**安装（**请勿同时开启**）：

### 1. 🟢 基础版 (`autoplay.user.js`)
*   **适用场景**：正常观看，辅助自动操作。
*   **功能**：
    *   自动播放视频。
    *   视频结束后自动跳转下一集。
    *   自动关闭简单的确认弹窗。
*   **特点**：逻辑简单稳定，不干扰浏览器正常行为。

### 2. 🚀 增强版 (`keep-playing.user.js`) **(推荐)**
*   **适用场景**：挂机刷课，后台播放。
*   **功能**：
    *   **强制持续播放**：即使窗口最小化、切换标签页或失去焦点，视频也会强制继续播放，不会暂停。
    *   **智能防暂停**：劫持浏览器 API，从根源上阻止系统自动暂停。
    *   **智能弹窗处理**：自动识别并关闭“中途暂停”弹窗，视频结束后自动跳转下一集。
    *   **自动点击播放**：进入页面后自动尝试播放。
*   **特点**：功能强大，适合无人值守挂机。

---

## 🛠️ 如何安装

### 第一步：安装浏览器扩展
你需要先在浏览器中安装脚本管理器插件。推荐以下任意一个：
*   **Tampermonkey (油猴)**: [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) | [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) | [Firefox](https://addons.mozilla.org/zh-CN/firefox/addon/tampermonkey/)
*   **ScriptCat (脚本猫)**: [官方网站](https://docs.scriptcat.org/)

### 第二步：添加脚本
1.  打开浏览器扩展栏，点击 **Tampermonkey** 或 **脚本猫** 图标。
2.  选择 **“添加新脚本”** (Create a new script)。
3.  用文本编辑器打开本项目中的 `keep-playing.user.js` (推荐) 或 `autoplay.user.js` 文件。
4.  **全选**并**复制**文件中的所有代码。
5.  回到浏览器的脚本编辑器，**清空**原有内容，然后**粘贴**刚才复制的代码。
6.  按 `Ctrl + S` 保存，或点击编辑器上方的“保存”按钮。

---

## 📖 如何使用

1.  确保脚本已在扩展管理面板中启用。
2.  打开目标视频播放页面 (例如: `http://jjfz.muc.edu.cn/jjfz/play...`)。
3.  脚本会自动运行：
    *   **增强版**会在页面加载约 2 秒后自动开始播放。
    *   你可以按 `F12` 打开开发者工具，在 **Console (控制台)** 中查看脚本运行日志（日志前缀为 `[KeepPlaying]` 或 `[AutoPlay]`）。
4.  **挂机提示**：使用增强版脚本时，你可以放心地切换到其他网页工作，或者将浏览器最小化，视频将会在后台持续播放并自动切换。

## ⚠️ 注意事项

*   **冲突警告**：请**不要**同时开启两个脚本，否则会导致逻辑冲突（一个尝试暂停，一个强制播放），可能导致浏览器卡顿或崩溃。
*   **首次使用**：如果视频没有自动开始，请手动点击一次播放按钮，脚本随后会接管控制。
*   **VPN 直连配置**：将仓库中的 `config.yaml` 文件内容增加到你的 VPN 客户端或路由器的分流/直连配置（例如 Clash、V2Ray、Shadowrocket 或企业 VPN 的白名单）后，可以使学习网站（如 `jjfz.muc.edu.cn`）直连，从而提高访问稳定性。请根据所用客户端选择合适的导入方法，并仅添加本文件中的规则。
