/*
 * @Author: wandouni
 * @Date: 2022-02-22 20:18:45
 * @LastEditors: wandouni
 * @LastEditTime: 2022-02-22 20:44:44
 */
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'

const initialValue = {
  value: 1,
}

export const PageAReducer = (state = initialValue, action) => {
  if (action.type === 'PageA') {
    return {
      ...state,
      ...action.payload,
    }
  }
  return state
}

export default function PageA() {
  const { value } = useSelector((state) => state.pageA)
  const dispatch = useDispatch()
  const onClick = () => {
    dispatch({
      type: 'PageA',
      payload: { value: value + 1 },
    })
  }
  return (
    <div>
      this is innner page, and state is {value}
      <button
        style={{
          backgroundColor: '#80989b',
          padding: '6px 16px',
          marginLeft: 10,
        }}
        onClick={onClick}
      >
        click to add Root value
      </button>
    </div>
  )
}
