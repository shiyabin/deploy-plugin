import { DeployConfig, serverConfig } from './interface'
import fs from 'fs'
import { NodeSSH } from 'node-ssh'
import archiver from 'archiver'
import path from 'path'

// 文件大小单位
const sizeUnit = ['B', 'KB', 'MB', 'GB']
//默认配置
let config: DeployConfig = {
  distPath: 'dist',
  localZipDir: 'archive',
  zipName: Date.now().toString(),
  isUpload: true,
}
//默认server配置
const defaultServerConfig: serverConfig = {
  host: '',
  port: 22,
  username: '',
  password: '',
  dirPath: '/data',
  fileName: 'frontend',
}
const curPath = process.cwd()
// 当前时间格式化
const ssh = new NodeSSH()

async function deployServer(server: serverConfig) {
  const tempZipName = server.fileName! + Date.now()
  await uploadFile(server, tempZipName)
  await remoteFileUpdate(server, tempZipName)
}
// 本地文件上传至远程服务器
function uploadFile(server: serverConfig, tempZipName: string) {
  const serverName = `${server.host}:${server.port} ${server.dirPath}`
  return new Promise<void>((resolve, reject) => {
    ssh
      .connect({
        host: server.host,
        username: server.username,
        password: server.password,
        port: 22,
      })
      .then(() => {
        let localPath = curPath + '/' + config.localZipDir + `/${config.zipName}.zip`
        ssh
          .putFile(localPath, `${server.dirPath}/${tempZipName}.zip`)
          .then(() => {
            resolve()
          })
          .catch((err: any) => {
            console.log(`${serverName} the file upload fail:`, err)
            reject(err)
            process.exit(0)
          })
      })
      .catch((err: any) => {
        console.log(`${serverName} SSH conneting fail:`, err)
        reject(err)
        process.exit(0)
      })
  })
}

// 远端文件更新
const remoteFileUpdate = async (server: serverConfig, tempZipName: string) => {
  const serverName = `${server.host}:${server.port} ${server.dirPath}`
  await ssh.execCommand(`rm -rf ${server.fileName}`, { cwd: server.dirPath }).catch(() => {})
  const cmd = `unzip -o ${tempZipName}.zip && mv ${config.zipName} ${server.fileName} && rm -rf ${tempZipName}.zip`
  return ssh
    .execCommand(cmd, {
      cwd: server.dirPath,
    })
    .then((result: any) => {
      if (!result.stderr) {
        console.log(`${serverName} Gratefule! update success!`)
      } else {
        console.log(`${serverName} Something wrong:`, result)
        return Promise.reject()
      }
    })
}

// 本地文件压缩
const zipDirector = () => {
  return new Promise<void>((resolve, reject) => {
    if (!config.localZipDir) {
      console.error('localZipDir is required')
      reject(new Error('localZipDir is required'))
      process.exit(0)
    }
    if (!config.distPath) {
      console.error('distPath is required')
      reject(new Error('distPath is required'))
      process.exit(0)
    }
    if (!fs.existsSync(config.localZipDir)) {
      fs.mkdirSync(config.localZipDir)
    }
    const output = fs.createWriteStream(`${curPath}/${config.localZipDir}/${config.zipName}.zip`)
    const archive = archiver('zip', {
      zlib: { level: 9 },
    }).on('error', (err: any) => {
      console.log(err)
      reject(err)
    })
    output.on('close', (err: any) => {
      if (err) {
        console.log('something error width the zip process:', err)
        return reject(new Error('something error width the zip process' + err))
      }
      console.log(`total ${fileSize(archive.pointer())}`)
      resolve()
    })
    output.on('end', () => {
      console.log('Data has been drained')
    })
    let dirPath = path.resolve(curPath, './', config.distPath)
    archive.pipe(output)
    archive.directory(dirPath, config.zipName!)
    archive.finalize()
  })
}
export default async function (cfg: DeployConfig) {
  config = Object.assign(config, cfg)
  // 压缩文件
  await zipDirector()
  if (!config.isUpload) return
  if (!config.server && config.isUpload) {
    console.log('server is required')
    process.exit(0)
  }
  let server: serverConfig[] = []
  if (Array.isArray(config.server)) {
    server = config.server.map((config) => Object.assign({ ...defaultServerConfig }, config))
  } else {
    server = [Object.assign({ ...defaultServerConfig }, config.server)]
  }
  // 上传文件
  await Promise.allSettled(server.map((config) => deployServer(config)))
  process.exit(0)
}

function fileSize(value: number) {
  if (!value) return '0B'
  let unitIndex = 0
  while (value > 1024 && unitIndex < sizeUnit.length) {
    value /= 1024
    unitIndex++
  }
  return value.toFixed(2) + sizeUnit[unitIndex]
}
