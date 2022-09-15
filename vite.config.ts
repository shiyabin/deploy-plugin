import Inspect from 'vite-plugin-inspect'
import { ViteDeploy, WebpackDeploy } from './src/index'
export default {
  plugins: [
    Inspect(), // only applies in dev mode
    ViteDeploy({
      distPath: '/dist',
      host: '192.168.1.163',
      username: 'root',
      password: 'tbase125!',
      dirPath: '/data/Sites',
      fileName: 'vite-test',
      localZipDir: 'vite',
    }),
  ],
}
