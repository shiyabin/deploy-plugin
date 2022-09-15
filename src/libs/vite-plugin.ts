import { DeployConfig } from './interface'
import Deploy from './deploy'
export default function (config: DeployConfig) {
  return {
    name: 'vite-plugin-deploy',
    apply: 'build',
    enforce: 'post',
    buildEnd() {
      Deploy(config)
    },
  }
}
