import { DeployConfig, serverConfig } from './type'
import fs from 'fs'
import { NodeSSH } from 'node-ssh'
import archiver from 'archiver'
import path from 'path'

// 文件大小单位
const sizeUnit = ['B', 'KB', 'MB', 'GB']
//默认配置
let config: DeployConfig = {
  distPath: 'dist',
  compressedType: 'zip',
  localCompressedFloder: 'archive',
  compressedFileName: Date.now().toString(),
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
let compressFileName = ''
const archiverOption = {
  zip: {
    zlib: { level: 9 }, // Sets the compression level.
  },
  tar: {
    gzip: true,
    gzipOptions: {
      level: 1,
    },
  },
}
async function deployServer(server: serverConfig) {
  const ssh = new NodeSSH()
  const tempZipName = `${server.fileName}${Date.now()}`
  try {
    await uploadFile(server, tempZipName, ssh)
    await remoteFileUpdate(server, tempZipName, ssh)
  } catch (err) {
    console.error(err)
    process.exit(0)
  }
}

async function uploadFile(server: serverConfig, tempZipName: string, ssh: NodeSSH) {
  const serverName = `${server.host}:${server.port} ${server.dirPath}`
  try {
    await ssh.connect(server)
    const localPath = `${curPath}/${config.localCompressedFloder}/${compressFileName}`
    await ssh.putFile(localPath, `${server.dirPath}/${tempZipName}.${config.compressedType}`)
  } catch (err) {
    console.log(`${serverName} SSH connecting or file upload failed:`, err)
    throw err
  }
}

// 远端文件更新
const remoteFileUpdate = async (server: serverConfig, tempZipName: string, ssh: NodeSSH) => {
  const serverName = `${server.host}:${server.port} ${server.dirPath}`
  try {
    // 查看远程服务器是否存在该文件夹
    if (
      await execCommand(`sudo ls ${server.fileName}`, server, ssh)
        .then(() => true)
        .catch(() => false)
    ) {
      await execCommand(`sudo rm -rf ${server.fileName}/*`, server, ssh)
    } else {
      await execCommand(`sudo mkdir ${server.fileName}`, server, ssh)
    }
  } catch (err) {
    console.log(`${serverName} mkdir fail`)
    process.exit(0)
  }
  // 解压文件
  const unzipCommand = config.compressedType === 'zip' ? 'unzip -o' : 'tar -zxvf'
  try {
    await execCommand(`sudo ${unzipCommand} ${tempZipName}.${config.compressedType}`, server, ssh)
  } catch (err) {
    console.log(`${serverName} ${unzipCommand} fail`)
    process.exit(0)
  }
  if (server.fileName != config.compressedFileName) {
    try {
      await execCommand(
        `sudo cp -r ${config.compressedFileName}/* ${server.fileName}/`,
        server,
        ssh
      )
    } catch (err) {
      console.log(`${serverName} mv fail`)
      process.exit(0)
    }
  }
  // 删除压缩文件
  try {
    await execCommand(`sudo rm -rf ${tempZipName}.${config.compressedType}`, server, ssh)
    console.log(`${serverName} Gratefule! update success!`)
  } catch (err) {
    console.log(`${serverName} Something wrong:`, err)
  }
  const commands = server.commands || []
  if (commands && commands.length) {
    for (let i = 0; i < commands.length; i++) {
      try {
        await execCommand(commands[i], server, ssh)
        console.log(`${serverName} ${commands[i]} success!`)
      } catch (err) {
        console.log(`${serverName} ${commands[i]} fail!`, err)
        return Promise.reject()
      }
    }
  }
}

const execCommand = async (command: string, server: serverConfig, ssh: NodeSSH) => {
  return ssh
    .execCommand(command, {
      cwd: server.dirPath,
    })
    .then((result) => {
      if (result.stderr) {
        return Promise.reject(result.stderr)
      }
      return Promise.resolve(result)
    })
}
// 本地文件压缩
const zipDirector = () => {
  return new Promise<void>((resolve, reject) => {
    if (!config.localCompressedFloder) {
      console.error('localCompressedFloder is required')
      reject(new Error('localCompressedFloder is required'))
      process.exit(0)
    }
    if (!config.distPath) {
      console.error('distPath is required')
      reject(new Error('distPath is required'))
      process.exit(0)
    }
    if (!fs.existsSync(config.localCompressedFloder)) {
      fs.mkdirSync(config.localCompressedFloder)
    }
    compressFileName = config.compressedFileName + '.' + config.compressedType
    const output = fs.createWriteStream(
      `${curPath}/${config.localCompressedFloder}/${compressFileName}`
    )
    const archive = archiver(config.compressedType!, archiverOption[config.compressedType!]).on(
      'error',
      (err: any) => {
        console.log(err)
        reject(err)
      }
    )
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
    archive.directory(dirPath, config.compressedFileName!)
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
