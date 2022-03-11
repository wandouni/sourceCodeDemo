/*
 * @Author: wandouni
 * @Date: 2022-03-11 10:53:56
 * @LastEditors: wandouni
 * @LastEditTime: 2022-03-11 14:25:31
 */

const path = require("path");

console.log(__dirname);
console.log(
  "path.resolve(__dirname, /../dist)",
  path.resolve(__dirname, "/../dist")
);

module.exports = {
  entry: path.resolve(__dirname, "../src/index.js"),
  output: {
    path: path.resolve(__dirname, "../dist"),
    filename: "bundle.js",
  },
  mode: "development",
  devServer: {
    port: 9000,
    compress: true,
    static: {
      directory: path.join(__dirname, "/../public"),
    },
  },
};
