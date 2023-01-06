import { Config } from 'node-ssh'
export interface DeployConfig {
  /**
   * 本地打包后文件所在目录
   * @default dist
   */
  distPath?: string

  /**
   * 本地压缩文件夹存储目录
   * @default archive
   */
  localZipDir?: string
  /**
   * 本地压缩文件名
   * @default timestamp
   */
  zipName?: string
  /**
   * 是否上传
   * @default true
   */
  isUpload?: boolean
  /**
   * 远程服务器配置
   */
  server?: serverConfig | serverConfig[]
}

export type serverConfig = Config & {
  /**
   * 远程服务器文件上传目录
   * @default /data
   */
  dirPath?: string
  /**
   * 远程服务器资源文件目录名称
   * @default frontend
   */
  fileName?: string
  /**
   * 部署完成后执行的命令
   * @default []
   */
  commands?: string[]
}
