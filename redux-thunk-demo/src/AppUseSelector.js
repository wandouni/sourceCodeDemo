/*
 * @Author: wandouni
 * @Date: 2022-01-18 20:07:03
 * @LastEditors: wandouni
 * @LastEditTime: 2022-02-24 09:49:11
 */
import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
// import PageA from './pages/PageA'

const initialValue = {
  value: 1,
}

export const RootReducer = (state = initialValue, action) => {
  if (action.type === 'App') {
    return {
      ...state,
      ...action.payload,
    }
  }
  return state
}

function App() {
  const { value } = useSelector((state) => state.RootPage)
  const dispatch = useDispatch()
  const onClick = () => {
    dispatch({
      type: 'App',
      payload: { value: value + 1 },
    })
  }
  return (
    <div>
      this is root page, and state is {value}
      <button
        style={{
          marginLeft: 10,
        }}
        onClick={onClick}
      >
        click to add Root value
      </button>
      <br></br>
      {/* <PageA></PageA> */}
    </div>
  )
}

export default App
