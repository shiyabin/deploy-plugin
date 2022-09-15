import { DeployConfig } from './interface'
import fs from 'fs'
import { NodeSSH } from 'node-ssh'
import archiver from 'archiver'

//默认配置
let config: DeployConfig = {
  distPath: 'dist',
  port: 22,
  host: '',
  username: '',
  password: '',
  dirPath: '',
  fileName: 'dist',
  localZipDir: 'archive',
  isUpload: true,
}
// 当前时间
let currentTime = Date.now()
const curPath = process.cwd()
// 当前时间格式化
const ssh = new NodeSSH()
// 本地文件上传至远程服务器
function uploadFile() {
  ssh
    .connect({
      host: config.host,
      username: config.username,
      password: config.password,
      port: 22,
    })
    .then(() => {
      let localPath = curPath + '/' + config.localZipDir + `/${currentTime}.zip`
      ssh
        .putFile(localPath, `${config.dirPath}/${currentTime}.zip`)
        .then(() => {
          remoteFileUpdate()
          console.log('put')
        })
        .catch((err: any) => {
          console.log('the file upload fail:', err)
          process.exit(0)
        })
    })
    .catch((err: any) => {
      console.log('SSH conneting fail:', err)
      process.exit(0)
    })
}

// 远端文件更新
const remoteFileUpdate = () => {
  const cmd = `rm -rf ${config.fileName}&& unzip -o ${currentTime}.zip&&rm -rf ${currentTime}.zip`
  ssh
    .execCommand(cmd, {
      cwd: config.dirPath,
    })
    .then((result: any) => {
      console.log(`The update message is: ${result.stdout}`)
      if (!result.stderr) {
        console.log('Gratefule! update success!')
        fs.rmdirSync(config.localZipDir!, { recursive: true })
        process.exit(0)
      } else {
        console.log('Something wrong:', result)
        process.exit(0)
      }
    })
}

// 本地文件压缩
const zipDirector = () => {
  if (!config.localZipDir) {
    console.error('localZipDir is required')
    process.exit(0)
  }
  if (!config.distPath) {
    console.error('distPath is required')
    process.exit(0)
  }
  if (!fs.existsSync(config.localZipDir)) {
    fs.mkdirSync(config.localZipDir)
  }
  const output = fs.createWriteStream(`${curPath}/${config.localZipDir}/${currentTime}.zip`)
  const archive = archiver('zip', {
    zlib: { level: 9 },
  }).on('error', (err: any) => {
    console.log(err)
    throw err
  })
  output.on('close', (err: any) => {
    if (err) {
      console.log('something error width the zip process:', err)
      return
    }
    console.log(`${archive.pointer()} total bytes`)
    config.isUpload && uploadFile()
  })
  output.on('end', () => {
    console.log('Data has been drained')
  })
  archive.pipe(output)
  archive.directory(config.distPath.replace(/\//, '') + '/', config.fileName!)
  archive.finalize()
}
export default function (cfg: DeployConfig) {
  config = Object.assign(config, cfg)
  // 回滚代码
  zipDirector()
}
