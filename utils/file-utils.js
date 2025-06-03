const fs = require('node:fs')
const path = require('node:path')

class FileUtils {
  /**
   * 获取文件树结构
   * @param {string} rootPath - 根目录路径
   * @param {number} maxDepth - 最大深度，默认为10
   * @returns {Promise<Object>} 文件树对象
   */
  static async getFileTree(rootPath, maxDepth = 10) {
    if (!fs.existsSync(rootPath)) {
      throw new Error(`路径不存在: ${rootPath}`)
    }

    const stats = fs.statSync(rootPath)
    if (!stats.isDirectory()) {
      throw new Error(`指定路径不是文件夹: ${rootPath}`)
    }

    return this._buildFileTree(rootPath, path.basename(rootPath), 0, maxDepth)
  }

  /**
   * 递归构建文件树
   * @param {string} currentPath - 当前路径
   * @param {string} name - 文件/文件夹名称
   * @param {number} depth - 当前深度
   * @param {number} maxDepth - 最大深度
   * @returns {Object} 文件树节点
   */
  static _buildFileTree(currentPath, name, depth, maxDepth) {
    const stats = fs.statSync(currentPath)
    const isDirectory = stats.isDirectory()
    
    const node = {
      name: name,
      path: currentPath,
      type: isDirectory ? 'directory' : 'file',
      size: stats.size,
      modified: stats.mtime,
      children: []
    }

    // 如果是文件，检查是否为HTML文件
    if (!isDirectory) {
      const ext = path.extname(name).toLowerCase()
      node.isHtml = ext === '.html' || ext === '.htm'
      node.extension = ext
      return node
    }

    // 如果是目录且未达到最大深度，递归处理子项
    if (depth < maxDepth) {
      try {
        const items = fs.readdirSync(currentPath)
        
        // 过滤隐藏文件和系统文件
        const filteredItems = items.filter(item => {
          return !item.startsWith('.') && 
                 !item.startsWith('~') && 
                 item !== 'node_modules' &&
                 item !== '__pycache__' &&
                 item !== '.git'
        })

        // 分别处理文件夹和文件，文件夹排在前面
        const directories = []
        const files = []

        for (const item of filteredItems) {
          const itemPath = path.join(currentPath, item)
          try {
            const itemStats = fs.statSync(itemPath)
            const childNode = this._buildFileTree(itemPath, item, depth + 1, maxDepth)
            
            if (itemStats.isDirectory()) {
              directories.push(childNode)
            } else {
              files.push(childNode)
            }
          } catch (error) {
            // 忽略无法访问的文件/文件夹
            console.warn(`无法访问: ${itemPath}`, error.message)
          }
        }

        // 按名称排序
        directories.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
        files.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

        node.children = [...directories, ...files]
      } catch (error) {
        console.warn(`无法读取目录: ${currentPath}`, error.message)
      }
    }

    return node
  }

  /**
   * 获取HTML文件列表
   * @param {string} rootPath - 根目录路径
   * @returns {Promise<Array>} HTML文件列表
   */
  static async getHtmlFiles(rootPath) {
    const htmlFiles = []
    
    const traverse = (dirPath) => {
      try {
        const items = fs.readdirSync(dirPath)
        
        for (const item of items) {
          const itemPath = path.join(dirPath, item)
          const stats = fs.statSync(itemPath)
          
          if (stats.isDirectory()) {
            // 跳过隐藏文件夹和系统文件夹
            if (!item.startsWith('.') && item !== 'node_modules') {
              traverse(itemPath)
            }
          } else if (stats.isFile()) {
            const ext = path.extname(item).toLowerCase()
            if (ext === '.html' || ext === '.htm') {
              htmlFiles.push({
                name: item,
                path: itemPath,
                relativePath: path.relative(rootPath, itemPath),
                size: stats.size,
                modified: stats.mtime
              })
            }
          }
        }
      } catch (error) {
        console.warn(`无法读取目录: ${dirPath}`, error.message)
      }
    }

    traverse(rootPath)
    return htmlFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'zh-CN'))
  }

  /**
   * 检查文件是否存在
   * @param {string} filePath - 文件路径
   * @returns {boolean} 文件是否存在
   */
  static fileExists(filePath) {
    try {
      return fs.existsSync(filePath)
    } catch (error) {
      return false
    }
  }

  /**
   * 获取文件信息
   * @param {string} filePath - 文件路径
   * @returns {Object|null} 文件信息对象
   */
  static getFileInfo(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return null
      }

      const stats = fs.statSync(filePath)
      return {
        name: path.basename(filePath),
        path: filePath,
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        modified: stats.mtime,
        created: stats.birthtime,
        extension: path.extname(filePath).toLowerCase()
      }
    } catch (error) {
      console.error(`获取文件信息失败: ${filePath}`, error.message)
      return null
    }
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的文件大小
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 获取相对路径
   * @param {string} from - 起始路径
   * @param {string} to - 目标路径
   * @returns {string} 相对路径
   */
  static getRelativePath(from, to) {
    return path.relative(from, to)
  }

  /**
   * 规范化路径
   * @param {string} filePath - 文件路径
   * @returns {string} 规范化后的路径
   */
  static normalizePath(filePath) {
    return path.normalize(filePath)
  }

  /**
   * 检查路径是否在指定目录内（防止路径遍历攻击）
   * @param {string} rootPath - 根目录
   * @param {string} targetPath - 目标路径
   * @returns {boolean} 是否安全
   */
  static isPathSafe(rootPath, targetPath) {
    const normalizedRoot = path.resolve(rootPath)
    const normalizedTarget = path.resolve(targetPath)
    return normalizedTarget.startsWith(normalizedRoot)
  }
}

module.exports = FileUtils 