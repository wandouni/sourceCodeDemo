/*
 * @Author: wandouni
 * @Date: 2022-02-24 17:07:20
 * @LastEditors: wandouni
 * @LastEditTime: 2022-02-24 19:31:14
 */
import React, { Component } from 'react'
import { connect } from 'react-redux'

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

class AppConnect extends Component {
  render() {
    return (
      <div>
        this is root page, and state is {this.props.RootPage.value}
        <button
          style={{
            marginLeft: 10,
          }}
          onClick={() => this.props.add(this.props.RootPage.value + 1)}
        >
          click to add Root value
        </button>
        <br></br>
        {/* <PageA></PageA> */}
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    RootPage: state.RootPage,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    add: (value) =>
      dispatch({
        payload: { value },
        type: 'App',
      }),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(AppConnect)
