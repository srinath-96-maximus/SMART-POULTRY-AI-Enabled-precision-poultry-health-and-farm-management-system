import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@'              : path.resolve(__dirname, './src'),
      '@components'   : path.resolve(__dirname, './src/components'),
      '@common'       : path.resolve(__dirname, './src/components/common'),
      '@features'     : path.resolve(__dirname, './src/components/features'),
      '@pages'        : path.resolve(__dirname, './src/pages'),
      '@hooks'        : path.resolve(__dirname, './src/hooks'),
      '@lib'          : path.resolve(__dirname, './src/lib'),
      '@services'     : path.resolve(__dirname, './src/services'),
      '@utils'        : path.resolve(__dirname, './src/utils'),
      '@locales'      : path.resolve(__dirname, './src/locales'),
      '@styles'       : path.resolve(__dirname, './src/styles'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
})
