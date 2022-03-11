/*
 * @Author: wandouni
 * @Date: 2022-03-11 11:30:47
 * @LastEditors: wandouni
 * @LastEditTime: 2022-03-11 14:34:04
 */

const path = require("path");

// 当前文件所在目录 /Users/shenni/repository/sourceCodeDemo/webpack-demo/config
console.log("__dirname", __dirname);

// 执行命令所在目录
// 执行：node test.js  输出：/Users/shenni/repository/sourceCodeDemo/webpack-demo/config
// 执行：node ./config/test.js  输出：/Users/shenni/repository/sourceCodeDemo/webpack-demo
console.log("process.pwd()", process.cwd());

// /Users/shenni/repository/sourceCodeDemo/webpack-demo/dist
console.log(path.resolve(__dirname, "../dist"));

// /dist
console.log(path.resolve(__dirname, "/../dist"));
