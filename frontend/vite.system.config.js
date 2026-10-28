import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins:[react()],
  server:{host:'127.0.0.1',port:5175,strictPort:true,proxy:{'/api':{target:process.env.FIXFLOW_API_URL || 'http://127.0.0.1:8080',changeOrigin:true}}},
  build:{outDir:'dist-system',rolldownOptions:{input:{member:'member.html',home:'index.html',process:'process.html',repair:'repair.html',system:'system.html',demo:'demo.html'}}},
  test:{environment:'jsdom',setupFiles:'./src/test/setup.js',include:['src/**/*.test.{js,jsx}']},
});
