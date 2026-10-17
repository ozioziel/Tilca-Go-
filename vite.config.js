import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// host: true permite abrir el prototipo desde el celular en la misma red Wi-Fi
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
})
