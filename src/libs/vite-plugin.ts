import { DeployConfig } from './type'
import Deploy from './deploy'
import { Plugin } from 'vite'
export default function (config: DeployConfig): Plugin {
  return {
    name: 'vite-plugin-deploy',
    apply: 'build',
    enforce: 'post',
    closeBundle: {
      order: 'post',
      sequential: true,
      async handler() {
        await Deploy(config)
      },
    },
  }
}
