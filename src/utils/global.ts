/**
 * 提供一些常用函数
 */

/** 同步延时 */
export const sleep = (time = 3000) => new Promise((resolve) => setTimeout(resolve, time));
