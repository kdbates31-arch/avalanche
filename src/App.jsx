10:38:43.202 Running build in Washington, D.C., USA (East) – iad1
10:38:43.203 Build machine configuration: 2 cores, 8 GB
10:38:43.455 Cloning github.com/kdbates31-arch/avalanche (Branch: main, Commit: 61bdd04)
10:38:44.185 Cloning completed: 730.000ms
10:38:44.632 Restored build cache from previous deployment (3ikmpABqQcmAk9QSs9MVfEzjNssY)
10:38:46.216 Running "vercel build"
10:38:46.247 Vercel CLI 54.4.1
10:38:46.958 Installing dependencies...
10:38:49.533 
10:38:49.533 up to date in 2s
10:38:49.534 
10:38:49.534 8 packages are looking for funding
10:38:49.534   run `npm fund` for details
10:38:49.577 Running "npm run build"
10:38:49.681 
10:38:49.681 > build
10:38:49.682 > vite build
10:38:49.682 
10:38:49.922 vite v8.0.14 building client environment for production...
10:38:50.054 
transforming...✓ 14 modules transformed.
10:38:50.059 ✗ Build failed in 136ms
10:38:50.060 error during build:
10:38:50.061 Build failed with 2 errors:
10:38:50.061 
10:38:50.061 [builtin:vite-transform] A 'return' statement can only be used within a function body.
10:38:50.062      ╭─[ src/App.jsx:457:5 ]
10:38:50.062      │
10:38:50.062  457 │     return d.toISOString().split("T")[0];
10:38:50.063      │     ───┬──  
10:38:50.063      │        ╰──── 
10:38:50.063 ─────╯
10:38:50.063 
10:38:50.064 [builtin:vite-transform] Unexpected token
10:38:50.064      ╭─[ src/App.jsx:458:3 ]
10:38:50.064      │
10:38:50.064  458 │   }
10:38:50.065      │   ┬  
10:38:50.065      │   ╰── 
10:38:50.065 ─────╯
10:38:50.065 
10:38:50.066     at aggregateBindingErrorsIntoJsError (file:///vercel/path0/node_modules/rolldown/dist/shared/error-B8po7KiL.mjs:48:18)
10:38:50.066     at unwrapBindingResult (file:///vercel/path0/node_modules/rolldown/dist/shared/error-B8po7KiL.mjs:18:128)
10:38:50.066     at #build (file:///vercel/path0/node_modules/rolldown/dist/shared/rolldown-build-9MccaWPU.mjs:3236:34)
10:38:50.067     at async buildEnvironment (file:///vercel/path0/node_modules/vite/dist/node/chunks/node.js:33137:64)
10:38:50.067     at async Object.build (file:///vercel/path0/node_modules/vite/dist/node/chunks/node.js:33559:19)
10:38:50.067     at async Object.buildApp (file:///vercel/path0/node_modules/vite/dist/node/chunks/node.js:33556:153)
10:38:50.067     at async CAC.<anonymous> (file:///vercel/path0/node_modules/vite/dist/node/cli.js:777:3) {
10:38:50.068   errors: [Getter/Setter]
10:38:50.068 }
10:38:50.083 Error: Command "npm run build" exited with 1
