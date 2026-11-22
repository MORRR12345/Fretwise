# Guitar-Practice 🎸

在浏览器里练习吉他乐理的小工具。点指板、判对错，**零服务器、纯静态部署**。

当前练习模式：**在指板上找到指定音**。

## 特点

- 🐍 **核心逻辑用 Python 写**：题目生成、答案校验都在 `app.py` 里，扩展练习模式只需改 Python。
- 🌐 **无服务器**：Python 通过 [Pyodide](https://pyodide.org/) 在浏览器中运行，部署到 GitHub Pages 这类静态托管即可。
- 🎯 **本地计算**：所有判断都在访客浏览器内完成，不依赖任何后端接口。
- 🎸 **可点击指板**：用 [svguitar](https://github.com/omnibrain/svguitar) 渲染 6 弦 12 品的指板图。

## 技术栈

| 层 | 技术 | 职责 |
|---|---|---|
| 乐理逻辑 | Python（`app.py`） | 生成题目、记录正确答案、校验点击 |
| 运行时 | Pyodide (WebAssembly) | 在浏览器中执行 Python |
| 界面 | HTML / CSS / JavaScript | 页面骨架、事件绑定、指板渲染 |
| 指板图 | svguitar | 生成 SVG 指板 |

## 项目结构
