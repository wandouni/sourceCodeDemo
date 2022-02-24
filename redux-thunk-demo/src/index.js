/*
 * @Author: wandouni
 * @Date: 2022-01-18 20:07:03
 * @LastEditors: wandouni
 * @LastEditTime: 2022-02-24 19:19:24
 */
import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import AppConnect from './AppConnect'

import './api/server'

import store from './store'
import { fetchTodos } from './features/todos/todosSlice'

store.dispatch(fetchTodos())

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <AppConnect />
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
)
