import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Support GitHub Pages base path when running in GitHub Actions or when VITE_BASE_PATH is set
const repoName = process.env.GITHUB_REPOSITORY
  ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
  : '/SMART-POULTRY-AI-Enabled-precision-poultry-health-and-farm-management-system/'

const base = process.env.VITE_BASE_PATH || (process.env.GITHUB_ACTIONS === 'true' ? repoName : '/')

// https://vitejs.dev/config/
export default defineConfig({
  base,
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
