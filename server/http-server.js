const express = require('express')
const serveStatic = require('serve-static')
const path = require('node:path')
const fs = require('node:fs')

class HttpServer {
  constructor(rootPath, port = 8000) {
    this.rootPath = rootPath
    this.port = port
    this.app = null
    this.server = null
    this.running = false
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        // 检查根路径是否存在
        if (!fs.existsSync(this.rootPath)) {
          throw new Error(`指定的文件夹不存在: ${this.rootPath}`)
        }

        // 创建Express应用
        this.app = express()

        // 设置静态文件服务
        this.app.use(serveStatic(this.rootPath, {
          index: ['index.html', 'index.htm'],
          dotfiles: 'ignore',
          etag: false,
          extensions: ['html', 'htm'],
          fallthrough: true,
          immutable: false,
          lastModified: true,
          maxAge: 0,
          redirect: true,
          setHeaders: (res, path) => {
            // 设置CORS头，允许跨域访问
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            
            // 设置缓存策略
            if (path.endsWith('.html') || path.endsWith('.htm')) {
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
              res.setHeader('Pragma', 'no-cache')
              res.setHeader('Expires', '0')
            }
          }
        }))

        // 处理404错误
        this.app.use((req, res, next) => {
          res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>页面未找到 - PRD Reader</title>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  margin: 0; 
                  padding: 40px; 
                  background: #f5f5f5; 
                  color: #333;
                }
                .container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  background: white; 
                  padding: 40px; 
                  border-radius: 8px; 
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                h1 { color: #e74c3c; margin-bottom: 20px; }
                .path { 
                  background: #f8f9fa; 
                  padding: 10px; 
                  border-radius: 4px; 
                  font-family: monospace; 
                  margin: 20px 0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>404 - 页面未找到</h1>
                <p>请求的文件不存在:</p>
                <div class="path">${req.url}</div>
                <p>请检查文件路径是否正确，或者返回到主页面选择其他文件。</p>
              </div>
            </body>
            </html>
          `)
        })

        // 错误处理
        this.app.use((err, req, res, next) => {
          console.error('服务器错误:', err)
          res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>服务器错误 - PRD Reader</title>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  margin: 0; 
                  padding: 40px; 
                  background: #f5f5f5; 
                  color: #333;
                }
                .container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  background: white; 
                  padding: 40px; 
                  border-radius: 8px; 
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                h1 { color: #e74c3c; margin-bottom: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>500 - 服务器内部错误</h1>
                <p>服务器在处理请求时发生错误，请稍后重试。</p>
              </div>
            </body>
            </html>
          `)
        })

        // 启动服务器
        this.server = this.app.listen(this.port, 'localhost', () => {
          this.running = true
          console.log(`HTTP服务器已启动: http://localhost:${this.port}`)
          console.log(`服务根目录: ${this.rootPath}`)
          resolve()
        })

        // 处理服务器错误
        this.server.on('error', (err) => {
          this.running = false
          if (err.code === 'EADDRINUSE') {
            reject(new Error(`端口 ${this.port} 已被占用，请选择其他端口`))
          } else {
            reject(new Error(`服务器启动失败: ${err.message}`))
          }
        })

      } catch (error) {
        reject(error)
      }
    })
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server && this.running) {
        this.server.close(() => {
          this.running = false
          this.server = null
          this.app = null
          console.log('HTTP服务器已停止')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  isRunning() {
    return this.running
  }

  getPort() {
    return this.port
  }

  getUrl() {
    return `http://localhost:${this.port}`
  }

  getRootPath() {
    return this.rootPath
  }
}

module.exports = HttpServer 