/**
 * 常用函数模块
 */

const global = {
    /**
     * 等待一段时间，需要通过await使用
     * @param {number} time 等待的时间，单位ms，默认为3000（3s）
     */
    sleep: (time = 3000) => new Promise((resolve) => setTimeout(resolve, time)),
};

export default global;