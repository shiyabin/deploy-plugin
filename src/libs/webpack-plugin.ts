import { Compiler } from 'webpack'
import { DeployConfig } from './type'
import deploy from './deploy'
export default class TaosDataUploadFileWebpack {
  config: DeployConfig
  constructor(config: DeployConfig) {
    this.config = config
  }
  apply(complier: Compiler) {
    complier.hooks.done.tap(
      'TaosDataUploadFileWebpack',
      (/* 在 hook 被触及时，会将 stats 作为参数传入。 */) => {
        deploy(this.config)
      }
    )
  }
}
