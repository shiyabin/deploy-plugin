import { Compiler } from 'webpack'
import { DeployConfig } from './interface'
import deploy from './deploy'
export default class TaosDataUploadFileWebpack {
  config: DeployConfig
  constructor(config: DeployConfig) {
    this.config = config
  }
  apply(complier: Compiler) {
    console.log('complier', complier)
    complier.hooks.done.tap(
      'TaosDataUploadFileWebpack',
      (stats /* 在 hook 被触及时，会将 stats 作为参数传入。 */) => {
        deploy(this.config)
      }
    )
  }
}
