11:43:24.795 Running build in Washington, D.C., USA (East) – iad1
11:43:24.796 Build machine configuration: 2 cores, 8 GB
11:43:25.609 Cloning github.com/kdbates31-arch/avalanche (Branch: main, Commit: 7d0bb53)
11:43:25.947 Cloning completed: 338.000ms
11:43:26.301 Restored build cache from previous deployment (3MQVtvJCLgi61gr3vbYHgCAUNEbU)
11:43:26.525 Running "vercel build"
11:43:26.544 Vercel CLI 54.4.1
11:43:27.081 Installing dependencies...
11:43:29.514 
11:43:29.514 up to date in 2s
11:43:29.515 
11:43:29.515 8 packages are looking for funding
11:43:29.516   run `npm fund` for details
11:43:29.555 Running "npm run build"
11:43:29.660 
11:43:29.661 > build
11:43:29.661 > vite build
11:43:29.661 
11:43:29.911 vite v8.0.14 building client environment for production...
11:43:30.035 
transforming...✓ 14 modules transformed.
11:43:30.039 ✗ Build failed in 125ms
11:43:30.040 error during build:
11:43:30.040 Build failed with 3 errors:
11:43:30.040 
11:43:30.040 [builtin:vite-transform] A 'return' statement can only be used within a function body.
11:43:30.041      ╭─[ src/App.jsx:126:35 ]
11:43:30.041      │
11:43:30.041  126 │     if (!form.agency_name.trim()) return setMessage("Agency name is required.");
11:43:30.042      │                                   ───┬──  
11:43:30.042      │                                      ╰──── 
11:43:30.042 ─────╯
11:43:30.042 
11:43:30.042 [builtin:vite-transform] A 'return' statement can only be used within a function body.
11:43:30.042      ╭─[ src/App.jsx:127:72 ]
11:43:30.043      │
11:43:30.044  127 │     if (!form.agent_first_name.trim() && !form.agent_last_name.trim()) return setMessage("Agent first or last name is required.");
11:43:30.049      │                                                                        ───┬──  
11:43:30.049      │                                                                           ╰──── 
11:43:30.050 ─────╯
11:43:30.050 
11:43:30.050 [builtin:vite-transform] Unexpected token
11:43:30.051      ╭─[ src/App.jsx:142:3 ]
11:43:30.051      │
11:43:30.051  142 │   }
11:43:30.051      │   ┬  
11:43:30.052      │   ╰── 
11:43:30.052 ─────╯
11:43:30.052 
11:43:30.052     at aggregateBindingErrorsIntoJsError (file:///vercel/path0/node_modules/rolldown/dist/shared/error-B8po7KiL.mjs:48:18)
11:43:30.053     at unwrapBindingResult (file:///vercel/path0/node_modules/rolldown/dist/shared/error-B8po7KiL.mjs:18:128)
11:43:30.053     at #build (file:///vercel/path0/node_modules/rolldown/dist/shared/rolldown-build-9MccaWPU.mjs:3236:34)
11:43:30.053     at async buildEnvironment (file:///vercel/path0/node_modules/vite/dist/node/chunks/node.js:33137:64)
11:43:30.054     at async Object.build (file:///vercel/path0/node_modules/vite/dist/node/chunks/node.js:33559:19)
11:43:30.054     at async Object.buildApp (file:///vercel/path0/node_modules/vite/dist/node/chunks/node.js:33556:153)
11:43:30.054     at async CAC.<anonymous> (file:///vercel/path0/node_modules/vite/dist/node/cli.js:777:3) {
11:43:30.054   errors: [Getter/Setter]
11:43:30.055 }
11:43:30.065 Error: Command "npm run build" exited with 1
