import { DeployConfig } from './interface'
import Deploy from './deploy'
import { Plugin } from 'vite'
export default function (config: DeployConfig): Plugin {
  return {
    name: 'vite-plugin-deploy',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      Deploy(config)
    },
  }
}
