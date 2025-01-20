import _, { isMatchWith } from 'lodash';

/**
 * 订阅的回调
 */
export type SubscribeCallBack<T> = (state: T, prevState: T) => void;
/**
 * 订阅回调和生成的id
 */
interface SubscribeHanlder<T> {
  callback: SubscribeCallBack<T>;
  id: string;
}
//  方便调试时区分对象
let _id = 0;
let _listenerId = 0;

/**
 * 调用后取消订阅
 */
export type Unsubscribe = () => void;


export class BaseObservable<T> {
  // 监听者的集合
  protected listeners: Array<SubscribeHanlder<T>> = [];
  _id = 0;
  protected _state: T;
  constructor(state: T) {
    this._state = state;
    this.listeners = [];
    this._id = _id++;
  }
  /**
   * state对象
   */
  get state(): T {
    return this._state;
  }

  /**
   * 用法等同于React的setState，为同步操作
   * @param payload 需要满足State类型的定义
   */
  setState(payload: Partial<T>, quiet = false): void {
    // 没变化就不再触发事件
    if (isMatchWith(this._state as any, payload)) {
      return;
    }
    const prevState = this._state;
    // 合并state
    const _state = Object.assign({}, prevState, payload);
    this._state = _state;
    if (!quiet) {
      this.publish(prevState, this._state);
    }
  }
  /**
   * 通知订阅者
   * @param prevState 修改前的state
   * @param state 修改后的state
   */
  publish(prevState: T, state: T): void {
    this.listeners.forEach(listener => {
      listener.callback(state, prevState);
    });
  }
  /**
   * 订阅state的变化
   * @param callback 回调
   * @returns 取消订阅的函数
   */
  subscribe(callback: SubscribeCallBack<T>): Unsubscribe {
    const id = (_listenerId++).toString();
    this.listeners.push({ callback, id });
    return (): void => {
      this.unsubscribe(id);
    };
  }
  /**
   * 取消订阅，不要直接调用
   * @param id listeners中包含的id
   */
  unsubscribe(id: string): void {
    _.remove(this.listeners, listener => {
      if (listener.id === id) {
        return true;
      }
      return false;
    });
  }

  /**
   * 订阅state中一个属性的变化
   * @param propertyName  属性名
   * @param callback 回调
   * @returns 取消订阅的函数
   */
  subscribeProperty(propertyName: keyof T, callback: SubscribeCallBack<T>) {
    return this.subscribe((state: T, prevState: T) => {
      if (state[propertyName] !== prevState[propertyName]) {
        callback(state, prevState);
      }
    });
  }

  /**
   * 清理，销毁监听者
   */
  destroy(): void {
    // this._state = {} as T;
    this.listeners = [];
  }
}
