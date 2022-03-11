/*
 * @Author: wandouni
 * @Date: 2022-03-09 21:56:32
 * @LastEditors: wandouni
 * @LastEditTime: 2022-03-09 23:34:51
 */
import React from 'react'
import { HashRouter as Router, Route } from 'react-router-dom'

function C3(props) {
  return <div>this is c3 innerHTML</div>
}

function C2(props) {
  return <div>this is c2 innerHTML</div>
}

function C1(props) {
  return (
    <div>
      this is c1 innerHTML
      <Route path="/C2" render={() => <C2></C2>}></Route>
      <Route path="/C3" render={() => <C3></C3>}></Route>
    </div>
  )
}

export default function P1() {
  return (
    <div>
      P2
      <Router>
        <Route path="/" render={() => <C1></C1>}></Route>
      </Router>
    </div>
  )
}
