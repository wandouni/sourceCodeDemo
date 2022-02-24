/*
 * @Author: wandouni
 * @Date: 2022-02-19 17:01:32
 * @LastEditors: wandouni
 * @LastEditTime: 2022-02-24 19:19:30
 */
import { combineReducers } from 'redux'
import { RootReducer } from './AppUseSelector'
import { PageAReducer } from './pages/PageA'

const rootReducer = combineReducers({
  pageA: PageAReducer,
  RootPage: RootReducer,
})

export default rootReducer
