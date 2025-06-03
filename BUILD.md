# PRD Reader 跨平台构建指南

## 在Windows上为macOS打包的解决方案

### 方案一：GitHub Actions（推荐）

这是最简单、免费且可靠的方法：

#### 1. 设置GitHub仓库
```bash
# 初始化git仓库（如果还没有）
git init
git add .
git commit -m "Initial commit"

# 添加远程仓库
git remote add origin https://github.com/你的用户名/PRD_Reading.git
git push -u origin main
```

#### 2. 推送代码触发构建
每次推送代码到main分支，GitHub Actions会自动构建所有平台版本：
- Windows: `.exe` 安装包和便携版
- macOS: `.dmg` 安装包和 `.zip` 压缩包（支持Intel和Apple Silicon）
- Linux: `AppImage` 和 `.deb` 包

#### 3. 发布版本
创建标签来触发正式发布：
```bash
git tag v1.0.0
git push origin v1.0.0
```

这会自动创建GitHub Release并上传所有平台的安装包。

#### 4. 下载构建产物
- 开发版本：在Actions页面下载artifacts
- 正式版本：在Releases页面下载

### 方案二：本地强制构建（有限制）

虽然不推荐，但可以尝试强制构建：

```bash
# 安装额外依赖
npm install --save-dev electron-builder-notarize

# 尝试强制构建（可能失败）
npm run build:mac
```

**注意：** 这种方法通常会失败，因为需要macOS特定的工具链。

### 方案三：Docker方案（复杂）

使用Docker模拟macOS环境：

```dockerfile
# 需要特殊的macOS Docker镜像（法律风险）
# 不推荐用于生产环境
```

### 方案四：云服务

付费云服务选项：
- **MacStadium**: 专业的macOS云服务
- **AWS EC2 Mac**: Amazon的macOS实例
- **GitHub Codespaces**: 在线开发环境

## 本地构建命令

```bash
# 构建当前平台
npm run build

# 构建特定平台
npm run build:win    # Windows
npm run build:mac    # macOS（需要在macOS上运行）
npm run build:linux  # Linux

# 尝试构建所有平台（在对应系统上）
npm run build:all
```

## 构建产物

构建完成后，文件会保存在 `dist/` 目录：

```
dist/
├── PRD Reader Setup 1.0.0.exe          # Windows安装包
├── PRD Reader 1.0.0.exe                # Windows便携版
├── PRD Reader-1.0.0.dmg                # macOS安装包
├── PRD Reader-1.0.0-mac.zip            # macOS压缩包
├── PRD Reader-1.0.0.AppImage           # Linux AppImage
└── prd-reader_1.0.0_amd64.deb         # Linux deb包
```

## 图标要求

项目已包含所需的图标文件：
- `assets/icon.ico` - Windows图标
- `assets/icon.icns` - macOS图标  
- `assets/icon.png` - Linux图标

## 故障排除

### 常见错误

1. **"Build for macOS is supported only on macOS"**
   - 解决方案：使用GitHub Actions

2. **图标文件缺失**
   - 确保 `assets/` 目录包含所有图标文件

3. **依赖安装失败**
   - 清理缓存：`npm cache clean --force`
   - 重新安装：`rm -rf node_modules && npm install`

### 调试构建

```bash
# 启用详细日志
DEBUG=electron-builder npm run build

# 检查构建配置
npx electron-builder --help
```

## 最佳实践

1. **使用GitHub Actions** 进行跨平台构建
2. **版本标签** 用于正式发布
3. **测试所有平台** 的安装包
4. **代码签名** 用于生产发布（需要开发者证书）
5. **自动更新** 集成（可选）

## 相关链接

- [Electron Builder文档](https://www.electron.build/)
- [GitHub Actions文档](https://docs.github.com/en/actions)
- [跨平台构建指南](https://www.electron.build/multi-platform-build) 