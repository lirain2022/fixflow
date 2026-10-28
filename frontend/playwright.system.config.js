import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests-system',testMatch:['member-navigation.spec.js','member-portal.spec.js','login-portals.spec.js','landing.spec.js','cost-correction.spec.js','costs-overview.spec.js','ui-layout.spec.js','next-steps.spec.js','system.spec.js','workspace.spec.js','export.spec.js','rework.spec.js','assets.spec.js','edit-password.spec.js','draft.spec.js','notifications.spec.js','repair-costs.spec.js'],workers:1,timeout:60000,reporter:'list',
  use:{baseURL:process.env.FIXFLOW_UI_URL||'http://127.0.0.1:5175',headless:true,
    ...(process.env.CHROME_PATH?{launchOptions:{executablePath:process.env.CHROME_PATH}}:{channel:'chrome'}),screenshot:'only-on-failure',trace:'retain-on-failure'},
});
