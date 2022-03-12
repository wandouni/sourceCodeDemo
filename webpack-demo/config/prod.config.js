/*
 * @Author: wandouni
 * @Date: 2022-03-11 10:53:56
 * @LastEditors: wandouni
 * @LastEditTime: 2022-03-12 19:37:33
 */

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

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
  plugins: [new HtmlWebpackPlugin()],
};
