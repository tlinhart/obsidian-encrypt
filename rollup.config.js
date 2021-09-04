import typescript from '@rollup/plugin-typescript';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from "rollup-plugin-copy";

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/main.js',
    sourcemap: 'inline',
    format: 'cjs',
    exports: 'default'
  },
  external: ['obsidian'],
  plugins: [
    typescript(),
    nodeResolve({browser: true}),
    commonjs(),
    copy({
      targets: [
        {
          src: [
            'manifest.json',
            'src/style.css',
          ],
          dest: 'dist'
        },
        {
          src: 'dist/*',
          dest: 'test-vault/.obsidian/plugins/meld-encrypt/'
        },
        // { src: 'assets/images/**/*', dest: 'dist/public/images' }
      ]
      // assets: [
      //   'dest/main.js',
      //   'manifest.json',
      //   'src/style.css',
      // ],
      // outputDir: 'test-vault/.obsidian/plugins/meld-encrypt'
    })
  ],

};