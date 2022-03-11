/*
 * @Author: wandouni
 * @Date: 2022-03-09 21:56:32
 * @LastEditors: wandouni
 * @LastEditTime: 2022-03-09 22:35:17
 */
import React from 'react'
import C1 from '../components/C1'
import C2 from '../components/C2'
import C3 from '../components/C3'
import { HashRouter as Router, Route, Link } from 'react-router-dom'

export default function P1() {
  return (
    <div>
      P2
      <Router>
        <ul>
          <li>
            <Link to={`/`}>/C1</Link>
          </li>
          <li>
            <Link to={`/C2`}>/C2</Link>
          </li>
          <li>
            <Link to={`/C3`}>/C3</Link>
          </li>
        </ul>
        <Route path="/" component={C1}>
          <Route path="/C2" component={C2}>
            <Route path="/C3" component={C3}></Route>
          </Route>
        </Route>
      </Router>
    </div>
  )
}
