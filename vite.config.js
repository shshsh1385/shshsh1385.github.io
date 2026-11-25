import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' so the build works both as a user site (username.github.io)
// and later inside a project repo or any other host without path changes
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
