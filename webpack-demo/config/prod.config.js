/*
 * @Author: wandouni
 * @Date: 2022-03-11 10:53:56
 * @LastEditors: wandouni
 * @LastEditTime: 2022-03-11 14:36:54
 */

const path = require("path");
require("html-webpack-plugin");

module.exports = {
  entry: path.resolve(__dirname, "../src/index.js"),
  output: {
    path: path.resolve(__dirname, "../dist"),
    filename: "bundle.js",
  },
  mode: "production",
  devServer: {
    port: 9000,
    compress: true,
    static: {
      directory: path.join(__dirname, "/../public"),
    },
  },
  plugins: [
    new 
  ],
};
