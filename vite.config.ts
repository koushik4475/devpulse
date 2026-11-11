import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({plugins:[react(),VitePWA({registerType:'autoUpdate',includeAssets:['favicon.svg'],manifest:{name:'DevPulse',short_name:'DevPulse',description:'GitHub repository control center',theme_color:'#0b1020',background_color:'#0b1020',display:'standalone',start_url:'/',icons:[{src:'/favicon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]}})],test:{environment:'jsdom',setupFiles:'./src/test-setup.ts'}});