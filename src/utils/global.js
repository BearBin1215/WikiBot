/**
 * 提供一些常用函数
 */

const sleep = (time = 3000) => new Promise((resolve) => setTimeout(resolve, time));

export { sleep };