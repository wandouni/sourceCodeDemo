本文解读 redux 版本`^4.0.5`，react-redux 版本`^7.2.1`，代码仓库为[从 redux 官方 demo fork](https://github.com/wandouni/sourceCodeDemo/tree/main/redux-thunk-demo)

# 初始化 store

首先通过如下语句引入 store 对象

```js
import store from './store'
```

那么 store 对象又是通过 createStore 方法创建的，参数为 rootReducer 和 composedEnhancer，接下来分别具体讲一下这两个参数和具体 createStore 做的事情

```js
const composedEnhancer = composeWithDevTools(
  applyMiddleware(thunkMiddleware)
  // other store enhancers if any
)

const store = createStore(rootReducer, composedEnhancer)
```

## rootReducer

rootReducer 是这样的

```js
const rootReducer = combineReducers({
  // Define a top-level state field named `todos`, handled by `todosReducer`
  todos: todosReducer,
  filters: filtersReducer,
})
```

todosReducer 和 filtersReducer 就是两个 reducer 函数定义，接受 state 和 action，返回新的 state，如下所示：

```js
export default function todosReducer(state = initialState, action) {
  switch (action.type) {
    case 'todos/todoAdded': {
      const todo = action.payload
      return {
        ...state,
        entities: {
          ...state.entities,
          [todo.id]: todo,
        },
      }
    }
    ...
    default:
      return state
  }
}
```

combineReducers 接受一个对象，对象的属性值为 reducer，返回一个 rootReducer，其作用就是将各个小的 reducer 汇聚成一个大的 reducer，其中返回的这个 reducer 重点需要关注下面这循环逻辑（后续需要仔细说明这段逻辑为何可以将多个 recuder 汇聚成一个大的 reducer）。

```js
function combineReducers(reducers) {
  ...
  return function combination(state, action) {
    ...
    for (var _i = 0; _i < finalReducerKeys.length; _i++) {
      var _key = finalReducerKeys[_i];
      var reducer = finalReducers[_key];
      var previousStateForKey = state[_key];
      var nextStateForKey = reducer(previousStateForKey, action);
      ...
      nextState[_key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }
    hasChanged = hasChanged || finalReducerKeys.length !== Object.keys(state).length;
    return hasChanged ? nextState : state;
  };
}
```

至此我们的 rootReducer 方法被创建出来，梳理一下，rootReducer 方法通过 combineReducers 将各个小的 reducer 汇聚成一个根部 reducer，rootReducer 也是一个 reducer 方法。

## composedEnhancer

回到 createStore 方法，第二个参数是 composedEnhancer，这个例子这里应用了 thunk 中间件`thunkMiddleware`。

```js
const composedEnhancer = composeWithDevTools(
  applyMiddleware(thunkMiddleware)
  // other store enhancers if any
)

const store = createStore(rootReducer, composedEnhancer)
```

我可以下从 createStore 方法中找到使用 composedEnhancer 的下方代码，我们可以看出，enhancer 一个函数，是接受 createStore 方法，返回一个函数，且该函数依然可以和 createStore 一样接受 reducer 和 preloadedState。

```js
if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
  enhancer = preloadedState
  preloadedState = undefined
}

if (typeof enhancer !== 'undefined') {
  if (typeof enhancer !== 'function') {
    throw new Error(
      process.env.NODE_ENV === 'production'
        ? formatProdErrorMessage(1)
        : "Expected the enhancer to be a function. Instead, received: '" +
          kindOf(enhancer) +
          "'"
    )
  }

  return enhancer(createStore)(reducer, preloadedState)
}
```

这里的 enhancer，就是这里的 composedEnhancer。

```js
const composedEnhancer = composeWithDevTools(
  applyMiddleware(thunkMiddleware)
  // other store enhancers if any
)
```

这里就需要研究下 composeWithDevTools、applyMiddleware 和 thunkMiddleware。

### composeWithDevTools

主要调用`compose.apply(null, arguments)`，arguments 是这里的`applyMiddleware(thunkMiddleware)`，这里通过看 composeWithDevTools 函数，我们知道 composedEnhancer(applyMiddleware(thunkMiddleware))，首先依然返回 applyMiddleware(thunkMiddleware)本身，如果存在多个，则依次嵌套调用(...args) => f(g(h(...args)))，我们再看 applyMiddleware 函数。

```js
exports.composeWithDevTools =
  typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    : function () {
        if (arguments.length === 0) return undefined
        if (typeof arguments[0] === 'object') return compose
        return compose.apply(null, arguments)
      }
```

redux 的 compose，这里我们只使用了一个中间件，就返回这个中间件本身，否则返回一个类似`(...args) => f(g(h(...args)))`的函数，执行此函数，会依次嵌套调用中间件函数

```js
/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */

export default function compose(...funcs) {
  if (funcs.length === 0) {
    return (arg) => arg
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce(
    (a, b) =>
      (...args) =>
        a(b(...args))
  )
}
```

### applyMiddleware

```js
function applyMiddleware() {
  for (var _len = arguments.length, middlewares = new Array(_len), _key = 0; _key < _len; _key++) {
    middlewares[_key] = arguments[_key];
  }

  return function (createStore) {
    return function () {
      ...
  };
}
```

这里，`applyMiddleware(thunkMiddleware)`，其实是以下这个函数，柯里化函数内部逻辑为依次调用中间件函数，并向中间件函数传入 dispatch 参数

```js
;(createStore) =>
  (...args) => {
    const store = createStore(...args)
    let dispatch = () => {
      throw new Error(
        'Dispatching while constructing your middleware is not allowed. ' +
          'Other middleware would not be applied to this dispatch.'
      )
    }

    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args),
    }
    const chain = middlewares.map((middleware) => middleware(middlewareAPI))
    dispatch = compose(...chain)(store.dispatch)

    return {
      ...store,
      dispatch,
    }
  }
```

### thunkMiddleware

thunkMiddleware 就是我们下面这里的 middleware 函数，接受一个参数\_ref，拥有 dispatch 和 getState 方法，其实就是上面 applyMiddleware(thunkMiddleware)的 middlewareAPI，它判断 action 是一个函数，那么就执行这个 aciton 函数，可以猜测，后面肯定在 dispatch action 的时候，在本身 redux 的某段逻辑中嵌入了这段代码，才能使得 redux 的 dispatch 除了可以接受对象，也可以接受函数。
上面的 chain 数组中的 item 就是(next)=>(action)=>{...},这里的 next 就是上面的 store.dispatch

```js
function createThunkMiddleware<
  State = any,
  BasicAction extends Action = AnyAction,
  ExtraThunkArg = undefined
>(extraArgument?: ExtraThunkArg) {
  // Standard Redux middleware definition pattern:
  // See: https://redux.js.org/tutorials/fundamentals/part-4-store#writing-custom-middleware
  const middleware: ThunkMiddleware<State, BasicAction, ExtraThunkArg> =
    ({ dispatch, getState }) =>
    next =>
    action => {
      // The thunk middleware looks for any functions that were passed to `store.dispatch`.
      // If this "action" is really a function, call it and return the result.
      if (typeof action === 'function') {
        // Inject the store's `dispatch` and `getState` methods, as well as any "extra arg"
        return action(dispatch, getState, extraArgument)
      }

      // Otherwise, pass the action down the middleware chain as usual
      return next(action)
    }
  return middleware
}

var thunk = createThunkMiddleware();
```

## createStore

这里我们分析完 createStore 的两个参数，reducer 和 enhancer，接着看下
createStore 具体代码

### enhancer 增强 dispatch 方法

首先第一步，如果存在 enhancer，那么这样调用

```js
enhancer(createStore)(reducer, preloadedState)
```

我们前面看到 enhancer 其实就是以下函数，执行 enhancer(createStore)(reducer, preloadedState)，会依然先调用 createStore 函数，计算出 store，然后调用中间件，返回增强后的 store，主要是对 dispatch 进行了增强。

dispatch 增加的具体逻辑为：这里的 middlewares 就是`({ dispatch, getState }) => next => action => {return typeof action === 'function' ? action(dispatch, getState, extraArgument ): next(action)}`
此时，dispatch 函数为`action => {return typeof action === 'function' ? action(dispatch, getState, extraArgument ): next(action)}`，相比 createStore 内置的 dispatch 方法，增加了一个判断，aciton 如果是一个函数，就返回调用 action 函数的结果，普通的 action 对象还是走原来的 dispatch 逻辑

```js
;(createStore) =>
  (...args) => {
    const store = createStore(...args)
    let dispatch = () => {
      throw new Error(
        'Dispatching while constructing your middleware is not allowed. ' +
          'Other middleware would not be applied to this dispatch.'
      )
    }

    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args),
    }
    const chain = middlewares.map((middleware) => middleware(middlewareAPI))
    dispatch = compose(...chain)(store.dispatch)

    return {
      ...store,
      dispatch,
    }
  }
```

### 内部维护的变量和函数

回到 createStore 本身逻辑，首先函数内部维护了这几个变量和几个关键函数

```js
  var currentReducer = reducer;
  var currentState = preloadedState;
  var currentListeners = [];
  var nextListeners = currentListeners;
  var isDispatching = false;
  function ensureCanMutateNextListeners(){...}
  function getState(){...}
  function subscribe(listener){...}
  function dispatch(action){...}
  function replaceReducer(nextReducer){...}
```

### 初始化 store 的值

然后 dispatch 一个 init 的 action，初始化 store 的值

```js
dispatch({
  type: ActionTypes.INIT,
})
```

#### dispatch 实现

dispatch 具体实现关键代码逻辑，调用我们定义的 reducer，也就是我们 combineReducers 出来的 rootReducer，计算出我们我们的 store 的初始值，然后`赋值给currentState`，然后调用循环执行 listeners，返回 action 本身。

```js
  function dispatch(action) {
    ...
    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }

    var listeners = currentListeners = nextListeners;

    for (var i = 0; i < listeners.length; i++) {
      var listener = listeners[i];
      listener();
    }

    return action;
  }
```

combineReducers 中具体具体依次调用每一个 reducer，如下：

```js
    let hasChanged = false
    const nextState = {}
    for (let i = 0; i < finalReducerKeys.length; i++) {
      const key = finalReducerKeys[i]
      const reducer = finalReducers[key]
      const previousStateForKey = state[key]
      const nextStateForKey = reducer(previousStateForKey, action)
      ...
      nextState[key] = nextStateForKey
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    hasChanged =
      hasChanged || finalReducerKeys.length !== Object.keys(state).length
    return hasChanged ? nextState : state
```

最后将初始化的值即我们定义的 initialState 返回，此时返回值(即 store)为这个对象:

```js
{
    todos:{
      status: 'idle',
      entities: {},
    },
    filters:{
      status: StatusFilters.All,
      colors: [],
    }
}
```

### 返回 store 对象

最后，返回 store 对象，如下：

```js
{
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable,
  }
```

# dispatch(fetchTodos())

初始化 store 之后，调用 dispatch(fetchTodos())

```js
import { fetchTodos } from './features/todos/todosSlice'

store.dispatch(fetchTodos())
```

正常来说，dispatch 的参数需要是一个 aciton，一个纯对象，但是这里我们使用 thunkMiddle 对 dispatch 函数进行了增强，可以接受函数，并且返回函数执行结果

```js
export const fetchTodos = () => async (dispatch) => {
  // 修改todos的status值为loading
  dispatch(todosLoading())
  const response = await client.get('/fakeApi/todos')
  dispatch(todosLoaded(response.todos))
}
```

```js
;(action) => {
  // The thunk middleware looks for any functions that were passed to `store.dispatch`.
  // If this "action" is really a function, call it and return the result.
  if (typeof action === 'function') {
    // Inject the store's `dispatch` and `getState` methods, as well as any "extra arg"
    return action(dispatch, getState, extraArgument)
  }

  // Otherwise, pass the action down the middleware chain as usual
  return next(action)
}
```

# Provider 组件

## 源码

```js
function Provider({ store, context, children }) {
  const contextValue = useMemo(() => {
    const subscription = createSubscription(store)
    subscription.onStateChange = subscription.notifyNestedSubs
    return {
      store,
      subscription,
    }
  }, [store])

  const previousState = useMemo(() => store.getState(), [store])

  useIsomorphicLayoutEffect(() => {
    const { subscription } = contextValue
    subscription.trySubscribe()

    if (previousState !== store.getState()) {
      subscription.notifyNestedSubs()
    }
    return () => {
      subscription.tryUnsubscribe()
      subscription.onStateChange = null
    }
  }, [contextValue, previousState])

  const Context = context || ReactReduxContext

  return <Context.Provider value={contextValue}>{children}</Context.Provider>
}
```

## 使用

```js
ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
)
```

使用 Provider 组件时，我们只传入了 store 对象，这时候，Context 对象会直接使用 react-redux 中的唯一变量 ReactReduxContext

```js
export const ReactReduxContext = /*#__PURE__*/ React.createContext(null)
```

传入 Context.Provider 组件的 value 值为`contextValue`

```js
const contextValue = useMemo(() => {
  const subscription = createSubscription(store)
  subscription.onStateChange = subscription.notifyNestedSubs
  return {
    store,
    subscription,
  }
}, [store])
```

并且在 Provider 组件中，使用 useIsomorphicLayoutEffect（类似 useEffect）监听了 store state 的数据变化，当数据发生变化时，通知嵌套组件。

```js
useIsomorphicLayoutEffect(() => {
  const { subscription } = contextValue
  subscription.trySubscribe()

  if (previousState !== store.getState()) {
    subscription.notifyNestedSubs()
  }
  return () => {
    subscription.tryUnsubscribe()
    subscription.onStateChange = null
  }
}, [contextValue, previousState])
```

### subscription

有三个阶段，创建阶段，和使用阶段和销毁阶段。

#### 创建

通过 createSubscription 创建，并且修改 onStateChange 方法指向 notifyNestedSubs 方法。

```js
const contextValue = useMemo(() => {
  const subscription = createSubscription(store)
  subscription.onStateChange = subscription.notifyNestedSubs
  return {
    store,
    subscription,
  }
}, [store])
```

##### createSubscription

一个纯返回 subscription 对象的方法，但是这里需要关注他的参数，函数是接受两个参数的，但是在 Provider 组件中`createSubscription(store)`，只传入了 store

```js
export function createSubscription(store, parentSub) {
  ...
  const subscription = {
    addNestedSub,
    notifyNestedSubs,
    handleChangeWrapper,
    isSubscribed,
    trySubscribe,
    tryUnsubscribe,
    getListeners: () => listeners,
  }

  return subscription
}
```

#### 使用

首先是调用了`trySubscribe`方法
然后就是在 store 中的数据发送变化的时候，执行`notifyNestedSubs`

```js
subscription.trySubscribe()

if (previousState !== store.getState()) {
  subscription.notifyNestedSubs()
}
```

##### trySubscribe

可以看到因为在这里创建的 subscription 时是没有 parentSub 参数的，所以 unsubscribe 被赋值`store.subscribe(handleChangeWrapper)`也就是 redux 中 store 对象的 subscribe 方法，并且向 store 订阅，store 中数据发生改变时，要调用 handleChangeWrapper，也就是 onStateChange 方法，也就是 notifyNestedSubs 方法，执行`listeners.notify()`。

```js
function trySubscribe() {
  if (!unsubscribe) {
    unsubscribe = parentSub
      ? parentSub.addNestedSub(handleChangeWrapper)
      : store.subscribe(handleChangeWrapper)

    listeners = createListenerCollection()
  }
}
```

而 listener 通过`createListenerCollection()`创建，createListenerCollection 方法源码如下，也是返回一个对象，包含 clear，notify，get，subscribe 方法的对象。

```js
function createListenerCollection() {
  const batch = getBatch()
  let first = null
  let last = null

  return {
    clear() {
      first = null
      last = null
    },

    notify() {
    ...
    },

    get() {
    ...
    },

    subscribe(callback) {
     ...
    },
  }
}
```

总而言之，就是 store 中数据发生改变时，调用 listeners 的 notify 方法，也就是执行如下代码，不断执行 listener 和其下一个节点对象的 callback 回调。

```js
let listener = first
while (listener) {
  listener.callback()
  listener = listener.next
}
```

##### notifyNestedSubs

```js
function tryUnsubscribe() {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = undefined
    listeners.clear()
    listeners = nullListeners
  }
}
```

#### 销毁

```js
subscription.tryUnsubscribe()
subscription.onStateChange = null
```

# useSelector

这里是使用 useSelector 的一个例子

```js
import { useSelector } from 'react-redux'

const loadingStatus = useSelector((state) => state.todos.status)
```

## 使用 createSelectorHook 创建 useSelector

useSelector 创建阶段，通过执行高阶函数 createSelectorHook 获取 useSelector 函数，在执行 createSelectorHook 的阶段，劫持了 context 对象，如果有传入 context 就使用传进来的 context，否则使用 react-redux 使用的 context。

```js
const useReduxContext =
  context === ReactReduxContext
    ? useDefaultReduxContext
    : () => useContext(context)
```

## useSelector 执行阶段

useSelector 执行阶段，从 context 对象中取出 store 对象和 subscription 对象，context 对象，是我们在使用 Provider 组件时，在 Provider 组件传递给 Context.Provider 的 value（contextValue），store 对象是我们通过 redux 的 createStore 创建的 store 对象，subscription 是我们通过 react-redux 内部的 createSubscription 方法创建的对象。
useSelector 返回的 store 中对应 state 数据对象，通过 useSelectorWithStoreAndSubscription 方法。

```js
function useSelector() {
  const { store, subscription: contextSub } = useReduxContext()

  const selectedState = useSelectorWithStoreAndSubscription(
    selector,
    equalityFn,
    store,
    contextSub
  )

  return selectedState
}
```

### useSelectorWithStoreAndSubscription

#### 参数介绍

useSelectorWithStoreAndSubscription 传入了四个参数，selector，equalityFn，store，contextSubselector 也就是我们使用时的写的(state)=>state.x.x，equalityFn 一个比较相等的方法即`const refEquality = (a, b) => a === b`，store，通过 redux 的 createStore 创建的 store 对象，contextSubselector 也就是在 Provider 组件中通过 createSubscription 方法创建的对象。

#### 逻辑

核心逻辑就是要取出目标 state 数据 selectedState，核心代码如下：

```js
const storeState = store.getState()
const newSelectedState = selector(storeState)
```

此外，关于 selectedState 的值还有部分缓存逻辑，如果 selector 和 state 并没有发生过变化，或者 select 出来的值相等，那么就取缓存值 latestSelectedState.current，详见这段代码：

```js
try {
  if (
    selector !== latestSelector.current ||
    storeState !== latestStoreState.current ||
    latestSubscriptionCallbackError.current
  ) {
    const newSelectedState = selector(storeState)
    // ensure latest selected state is reused so that a custom equality function can result in identical references
    if (
      latestSelectedState.current === undefined ||
      !equalityFn(newSelectedState, latestSelectedState.current)
    ) {
      selectedState = newSelectedState
    } else {
      selectedState = latestSelectedState.current
    }
  } else {
    selectedState = latestSelectedState.current
  }
} catch (err) {
  if (latestSubscriptionCallbackError.current) {
    err.message += `\nThe error may be correlated with this previous error:\n${latestSubscriptionCallbackError.current.stack}\n\n`
  }
  throw err
}
```

#### 创建新的 subscription

在使用 useSelector 的组件中创建了一个新的 subscription，并且将 Provider 组件中创建出来的 subscription 作为第二个参数 contextSub 传递进去，并且 trySubscribe

```js
  const subscription = useMemo(
    () => createSubscription(store, contextSub),
    [store, contextSub]
  )
  ...
  subscription.onStateChange = checkForUpdates
  subscription.trySubscribe()
```

因为此时 parentSub 为 Provider 组件中创建出来的 subscription，于是调用`parentSub.addNestedSub(handleChangeWrapper)`，重新 trySubscribe，因为 Provider 组件中 unsubscribe 已经有值，所以只执行 listeners.subscribe(listener)

```js
function addNestedSub(listener) {
  trySubscribe()
  return listeners.subscribe(listener)
}

function trySubscribe() {
  if (!unsubscribe) {
    unsubscribe = parentSub
      ? parentSub.addNestedSub(handleChangeWrapper)
      : store.subscribe(handleChangeWrapper)

    listeners = createListenerCollection()
  }
}
```

此时，会执行 Provider 组件创建的 subscription 持有的 createSubscription 方法的内部变量 listeners 的 subscribe 方法，此时 callback 就是 checkForUpdates 方法（自增变量强制刷新 UI）。
subscribe 中的关键逻辑就是完成了对象的链接调用。
第一个 useSelector 过来时,last、first 都被{callback,next: null,prev: null},命名为 A 对象
第二个 useSelector 过来时，listener 和 last 都被赋值{callback,next: null,prev: A}，命名为 B 对象，并且 B.prev=A,则通过该引用，修改 A 对象的 next 为 B，则完成了 A 到 B 的链式链接。

```js
    subscribe(callback) {
      let isSubscribed = true

      let listener = (last = {
        callback,
        next: null,
        prev: last,
      })

      if (listener.prev) {
        listener.prev.next = listener
      } else {
        first = listener
      }

      return function unsubscribe() {
        if (!isSubscribed || first === null) return
        isSubscribed = false

        if (listener.next) {
          listener.next.prev = listener.prev
        } else {
          last = listener.prev
        }
        if (listener.prev) {
          listener.prev.next = listener.next
        } else {
          first = listener.next
        }
      }
    },
```

我们前面看到在 Provider 组件中，state 发生更新时会调用 notify 方法，就是执行 callback 方法，也就是我们上面的那个 useselector 里面的 checkForUpdates 方法，并且是链式调用，通过该对象的 next 对象，可以找到下一个注册对象。

```js
    notify() {
      batch(() => {
        let listener = first
        while (listener) {
          listener.callback()
          listener = listener.next
        }
      })
    },
```

#### checkForUpdates

`forceRender`是`更新UI`的关键，只要调用 forceRender，就会重新渲染 UI，但是这里为了避免其他组件的 state 中值发生变化，影响到自己这个组件的渲染，这里判断了如果 store state 不发生变化，或者 SelectedState 和缓存的一样，则不 forceRender，避免了没必要的渲染。

```js
const [, forceRender] = useReducer((s) => s + 1, 0)

function checkForUpdates() {
  try {
    const newStoreState = store.getState()
    // Avoid calling selector multiple times if the store's state has not changed
    if (newStoreState === latestStoreState.current) {
      return
    }

    const newSelectedState = latestSelector.current(newStoreState)

    if (equalityFn(newSelectedState, latestSelectedState.current)) {
      return
    }

    latestSelectedState.current = newSelectedState
    latestStoreState.current = newStoreState
  } catch (err) {
    // we ignore all errors here, since when the component
    // is re-rendered, the selectors are called again, and
    // will throw again, if neither props nor store state
    // changed
    latestSubscriptionCallbackError.current = err
  }

  forceRender()
}
```

# Connect 组件

## 使用

```js
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
```

## 大概流程

connect 通过 createConnect 创建，大概返回这样一个函数,这个函数接受我们使用者定义的 mapStateToProps、mapDispatchToProps

```js
function connect(mapStateToProps, mapDispatchToProps, mergeProps, _ref2) {
    return connectHOC(selectorFactory....)
}
```

connectHOC 即 connectAdvanced，即执行 connectAdvanced 返回的高阶组件，接受参数为我们使用这定义的 UI 组件，也就是组件`wrapWithConnect`，wrapWithConnect 组件接收我们的 UI 组件，。

```js
function wrapWithConnect(WrappedComponent) {
    ...
}
```

## 详细分析

### createConnect

whenMapStateToPropsIsMissing，判断 mapStateToProps 不为空，且是函数的话，就返回 wrapMapToPropsFunc(mapStateToProps, 'mapStateToProps')的执行结果，这个函数有三个作用，1，2，3

> Detects whether the mapToProps function being called depends on props, which is used by selectorFactory to decide if it should reinvoke on props changes.
> On first call, handles mapToProps if returns another function, and treats that
> new function as the true mapToProps for subsequent calls.
> On first call, verifies the first result is a plain object, in order to warn
> the developer that their mapToProps function is not returning a valid result.

#### initMapStateToProps

也就是说 initMapStateToProps 其实就是 wrapMapToPropsFunc 的执行结果，也就是函数`initProxySelector`，wrapMapToPropsFunc 函数第一个参数为 mapStateToProps 或者 mapDispatcgToProps，第二个参数为`'mapStateToProps'`和`'mapDispatchToProps'`

```js
function initProxySelector(dispatch, { displayName }) {
  const proxy = function mapToPropsProxy(stateOrDispatch, ownProps) {
    return proxy.dependsOnOwnProps
      ? proxy.mapToProps(stateOrDispatch, ownProps)
      : proxy.mapToProps(stateOrDispatch)
  }

  // allow detectFactoryAndVerify to get ownProps
  proxy.dependsOnOwnProps = true

  proxy.mapToProps = function detectFactoryAndVerify(
    stateOrDispatch,
    ownProps
  ) {
    proxy.mapToProps = mapToProps
    proxy.dependsOnOwnProps = getDependsOnOwnProps(mapToProps)
    let props = proxy(stateOrDispatch, ownProps)

    if (typeof props === 'function') {
      proxy.mapToProps = props
      proxy.dependsOnOwnProps = getDependsOnOwnProps(props)
      props = proxy(stateOrDispatch, ownProps)
    }

    if (process.env.NODE_ENV !== 'production')
      verifyPlainObject(props, displayName, methodName)

    return props
  }

  return proxy
}
```

#### initMergeProps

initMergeProps 就是以下函数`initMergePropsProxy`

```js
function initMergePropsProxy(
  dispatch,
  { displayName, pure, areMergedPropsEqual }
) {
  let hasRunOnce = false
  let mergedProps

  return function mergePropsProxy(stateProps, dispatchProps, ownProps) {
    const nextMergedProps = mergeProps(stateProps, dispatchProps, ownProps)

    if (hasRunOnce) {
      if (!pure || !areMergedPropsEqual(nextMergedProps, mergedProps))
        mergedProps = nextMergedProps
    } else {
      hasRunOnce = true
      mergedProps = nextMergedProps

      if (process.env.NODE_ENV !== 'production')
        verifyPlainObject(mergedProps, displayName, 'mergeProps')
    }

    return mergedProps
  }
}
```

#### selectorFactory

selectorFactory，即`finalPropsSelectorFactory`

```js
export default function finalPropsSelectorFactory(
  dispatch,
  { initMapStateToProps, initMapDispatchToProps, initMergeProps, ...options }
) {
  const mapStateToProps = initMapStateToProps(dispatch, options)
  const mapDispatchToProps = initMapDispatchToProps(dispatch, options)
  const mergeProps = initMergeProps(dispatch, options)

  if (process.env.NODE_ENV !== 'production') {
    verifySubselectors(
      mapStateToProps,
      mapDispatchToProps,
      mergeProps,
      options.displayName
    )
  }

  const selectorFactory = options.pure
    ? pureFinalPropsSelectorFactory
    : impureFinalPropsSelectorFactory

  return selectorFactory(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    dispatch,
    options
  )
}
```

### connectAdvanced

connectAdvanced 函数入参，connectOptions 包含如下属性：

```
  initMapStateToProps,
  initMapDispatchToProps,
  initMergeProps,
  pure,
  areStatesEqual,
  areOwnPropsEqual,
  areStatePropsEqual,
  areMergedPropsEqual,
```

并接受了 context，默认 context 为`ReactReduxContext`，也就是`React.createContext(null)`，也就是在 Provider 组件有使用到的 context

### wrapWithConnect

高阶组件 wrapWithConnect，接受我们定义的 UI 组件，即代码中的`WrappedComponent`，返回一个新的组件，这里主要有如下几个处理：

- 首先，如果默认的 pure 模式下，会给返回的 ConnectFunction 的组件包一层 React.memo，防止其他组件依赖 store 中的部分其他 state 数据发生变化。
- 另外就是，通过 hoistStatics(Connect, WrappedComponent)将 WrappedComponent 组件的静态属性复制给 Connect，并返回新组件。
- 如果明确 forwardRef，回将 forwarded 接受的 ref 函数赋值给 reactReduxForwardedRef，而在 ConnectFunction 组件内部，reactReduxForwardedRef 又赋值给了 WrappedComponent 的 ref，以方便我们直接获取到 UI 组件的 ref 引用。

```js
      ...
      const renderedWrappedComponent = useMemo(
        () => (
          <WrappedComponent
            {...actualChildProps}
            ref={reactReduxForwardedRef}
          />
        ),
        [reactReduxForwardedRef, WrappedComponent, actualChildProps]
      )
    ...

    const Connect = pure ? React.memo(ConnectFunction) : ConnectFunction

    Connect.WrappedComponent = WrappedComponent
    Connect.displayName = ConnectFunction.displayName = displayName

    if (forwardRef) {
      const forwarded = React.forwardRef(function forwardConnectRef(
        props,
        ref
      ) {
        return <Connect {...props} reactReduxForwardedRef={ref} />
      })

      forwarded.displayName = displayName
      forwarded.WrappedComponent = WrappedComponent
      return hoistStatics(forwarded, WrappedComponent)
    }

    return hoistStatics(Connect, WrappedComponent)
```

#### ConnectFunction

有点长，这里分段解读该段函数
首先，这里确定了要使用的 context，并取出从 context.Provider 中传入的对象，也就是包含 store 和 subscribtion 属性的对象

```js
const [propsContext, reactReduxForwardedRef, wrapperProps] = useMemo(() => {
  // Distinguish between actual "data" props that were passed to the wrapper component,
  // and values needed to control behavior (forwarded refs, alternate context instances).
  // To maintain the wrapperProps object reference, memoize this destructuring.
  const { reactReduxForwardedRef, ...wrapperProps } = props
  return [props.context, reactReduxForwardedRef, wrapperProps]
}, [props])

const ContextToUse = useMemo(() => {
  // Users may optionally pass in a custom context instance to use instead of our ReactReduxContext.
  // Memoize the check that determines which context instance we should use.
  return propsContext &&
    propsContext.Consumer &&
    isContextConsumer(<propsContext.Consumer />)
    ? propsContext
    : Context
}, [propsContext, Context])

// Retrieve the store and ancestor subscription via context, if available
const contextValue = useContext(ContextToUse)
```

这里，判断 store 是从 props 传入（我们手动传入），还是从最近的`context.Provider`传入,取出 redux 的 store 对象

```js
const store = didStoreComeFromProps ? props.store : contextValue.store
const childPropsSelector = useMemo(() => {
  // The child props selector needs the store reference as an input.
  // Re-create this selector whenever the store changes.
  return createChildSelector(store)
}, [store])
```

childPropsSelector,即这里的`selectorFactory(...)`,即函数 pureFinalPropsSelector,handleFirstCall 和 handleSubsequentCalls 主要处理 props 的合并结果并返回，这里我们就明白了 childPropsSelector 主要是计算 props，将我们传入的 mapState 和 mapDispatch 的属性都合并到 props 中，并且在后面我们可以看到通过 childPropsSelector 计算出 actualChildProps，并放入了 WrappedComponent 组件属性中，这样我们的 UI 组件的 props 就能拿到 mapStateToProps 和 mapDispatchToProps 的属性和方法

```js
  function handleFirstCall(firstState, firstOwnProps) {
    state = firstState
    ownProps = firstOwnProps
    stateProps = mapStateToProps(state, ownProps)
    dispatchProps = mapDispatchToProps(dispatch, ownProps)
    mergedProps = mergeProps(stateProps, dispatchProps, ownProps)
    hasRunAtLeastOnce = true
    return mergedProps
  }
  ...
  function handleSubsequentCalls(nextState, nextOwnProps) {
    const propsChanged = !areOwnPropsEqual(nextOwnProps, ownProps)
    const stateChanged = !areStatesEqual(nextState, state)
    state = nextState
    ownProps = nextOwnProps

    if (propsChanged && stateChanged) return handleNewPropsAndNewState()
    if (propsChanged) return handleNewProps()
    if (stateChanged) return handleNewState()
    return mergedProps
  }
  ...
  function pureFinalPropsSelector(nextState, nextOwnProps) {
    return hasRunAtLeastOnce
      ? handleSubsequentCalls(nextState, nextOwnProps)
      : handleFirstCall(nextState, nextOwnProps)
  }
```

```js
export default function finalPropsSelectorFactory(
  dispatch,
  { initMapStateToProps, initMapDispatchToProps, initMergeProps, ...options }
) {
  const mapStateToProps = initMapStateToProps(dispatch, options)
  const mapDispatchToProps = initMapDispatchToProps(dispatch, options)
  const mergeProps = initMergeProps(dispatch, options)

  if (process.env.NODE_ENV !== 'production') {
    verifySubselectors(
      mapStateToProps,
      mapDispatchToProps,
      mergeProps,
      options.displayName
    )
  }

  const selectorFactory = options.pure
    ? pureFinalPropsSelectorFactory
    : impureFinalPropsSelectorFactory

  return selectorFactory(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    dispatch,
    options
  )
}
...
...
function createChildSelector(store) {
  return selectorFactory(store.dispatch, selectorFactoryOptions)
}
...
const childPropsSelector = useMemo(() => {
    // The child props selector needs the store reference as an input.
    // Re-create this selector whenever the store changes.
    return createChildSelector(store)
}, [store])
```

通过 childPropsSelector(store.getState(), wrapperProps)计算出 actualChildProps

```js
const actualChildProps = usePureOnlyMemo(() => {
  if (
    childPropsFromStoreUpdate.current &&
    wrapperProps === lastWrapperProps.current
  ) {
    return childPropsFromStoreUpdate.current
  }
  return childPropsSelector(store.getState(), wrapperProps)
}, [store, previousStateUpdateResult, wrapperProps])
```

监听`actualChildProps`触发`notifyNestedSubs`

```js
function captureWrapperProps(
  lastWrapperProps,
  lastChildProps,
  renderIsScheduled,
  wrapperProps,
  actualChildProps,
  childPropsFromStoreUpdate,
  notifyNestedSubs
) {
  // We want to capture the wrapper props and child props we used for later comparisons
  lastWrapperProps.current = wrapperProps
  lastChildProps.current = actualChildProps
  renderIsScheduled.current = false

  // If the render was from a store update, clear out that reference and cascade the subscriber update
  if (childPropsFromStoreUpdate.current) {
    childPropsFromStoreUpdate.current = null
    notifyNestedSubs()
  }
}
...
      useIsomorphicLayoutEffectWithArgs(captureWrapperProps, [
        lastWrapperProps,
        lastChildProps,
        renderIsScheduled,
        wrapperProps,
        actualChildProps,
        childPropsFromStoreUpdate,
        notifyNestedSubs,
      ])
```

监听 props 变化，触发 shouldHandleStateChanges 作用为，这里跟 useSelector 里面的逻辑一致，主要配合 useReducer 生成的`forceComponentUpdateDispatch`实现 UI 的更新。

```js
function subscribeUpdates(
  shouldHandleStateChanges,
  store,
  subscription,
  childPropsSelector,
  lastWrapperProps,
  lastChildProps,
  renderIsScheduled,
  childPropsFromStoreUpdate,
  notifyNestedSubs,
  forceComponentUpdateDispatch
) {
  // If we're not subscribed to the store, nothing to do here
  if (!shouldHandleStateChanges) return

  // Capture values for checking if and when this component unmounts
  let didUnsubscribe = false
  let lastThrownError = null

  // We'll run this callback every time a store subscription update propagates to this component
  const checkForUpdates = () => {
    if (didUnsubscribe) {
      // Don't run stale listeners.
      // Redux doesn't guarantee unsubscriptions happen until next dispatch.
      return
    }

    const latestStoreState = store.getState()

    let newChildProps, error
    try {
      // Actually run the selector with the most recent store state and wrapper props
      // to determine what the child props should be
      newChildProps = childPropsSelector(
        latestStoreState,
        lastWrapperProps.current
      )
    } catch (e) {
      error = e
      lastThrownError = e
    }

    if (!error) {
      lastThrownError = null
    }

    // If the child props haven't changed, nothing to do here - cascade the subscription update
    if (newChildProps === lastChildProps.current) {
      if (!renderIsScheduled.current) {
        notifyNestedSubs()
      }
    } else {
      // Save references to the new child props.  Note that we track the "child props from store update"
      // as a ref instead of a useState/useReducer because we need a way to determine if that value has
      // been processed.  If this went into useState/useReducer, we couldn't clear out the value without
      // forcing another re-render, which we don't want.
      lastChildProps.current = newChildProps
      childPropsFromStoreUpdate.current = newChildProps
      renderIsScheduled.current = true

      // If the child props _did_ change (or we caught an error), this wrapper component needs to re-render
      forceComponentUpdateDispatch({
        type: 'STORE_UPDATED',
        payload: {
          error,
        },
      })
    }
  }

  // Actually subscribe to the nearest connected ancestor (or store)
  subscription.onStateChange = checkForUpdates
  subscription.trySubscribe()

  // Pull data from the store after first render in case the store has
  // changed since we began.
  checkForUpdates()

  const unsubscribeWrapper = () => {
    didUnsubscribe = true
    subscription.tryUnsubscribe()
    subscription.onStateChange = null

    if (lastThrownError) {
      // It's possible that we caught an error due to a bad mapState function, but the
      // parent re-rendered without this component and we're about to unmount.
      // This shouldn't happen as long as we do top-down subscriptions correctly, but
      // if we ever do those wrong, this throw will surface the error in our tests.
      // In that case, throw the error from here so it doesn't get lost.
      throw lastThrownError
    }
  }

  return unsubscribeWrapper
}
...
      useIsomorphicLayoutEffectWithArgs(
        subscribeUpdates,
        [
          shouldHandleStateChanges,
          store,
          subscription,
          childPropsSelector,
          lastWrapperProps,
          lastChildProps,
          renderIsScheduled,
          childPropsFromStoreUpdate,
          notifyNestedSubs,
          forceComponentUpdateDispatch,
        ],
        [store, subscription, childPropsSelector]
      )
```

返回组件 renderedChild，如果 shouldHandleStateChanges 为 true，就在我们定义的 UI 组件外层包一个 ContextToUse.Provide，然后里面放`renderedWrappedComponent`，renderedWrappedComponent 组件就是我们的 UI 组件，将计算完的 props 和 ref 放进去组件

```js
const renderedWrappedComponent = useMemo(
  () => <WrappedComponent {...actualChildProps} ref={reactReduxForwardedRef} />,
  [reactReduxForwardedRef, WrappedComponent, actualChildProps]
)

// If React sees the exact same element reference as last time, it bails out of re-rendering
// that child, same as if it was wrapped in React.memo() or returned false from shouldComponentUpdate.
const renderedChild = useMemo(() => {
  if (shouldHandleStateChanges) {
    // If this component is subscribed to store updates, we need to pass its own
    // subscription instance down to our descendants. That means rendering the same
    // Context instance, and putting a different value into the context.
    return (
      <ContextToUse.Provider value={overriddenContextValue}>
        {renderedWrappedComponent}
      </ContextToUse.Provider>
    )
  }

  return renderedWrappedComponent
}, [ContextToUse, renderedWrappedComponent, overriddenContextValue])

return renderedChild
```

# 思考

为什么要由 Provider 提供的 subscription 去链式的触发订阅，而不是在 useSelector 内部直接向 redux 的 store 订阅（可能和 UI 的更新机制有关）

# 技术总结

## 函数柯里化

函数柯里化，比如这里的 compose 函数，applyMiddleWares，MiddleWare 本身都有应用，作用如下：

- 参数复用
- 提前返回
- 延迟执行
  可以降低适用范围，提高适用性

## 闭包

store 中的 state，useSelector 中常见的 listener，以及函数柯里化都是闭包的经典应用

## 双向链表实现

listener 之{callback,next: null,prev: A}
