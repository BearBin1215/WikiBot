/**
 * 提供一些常用函数
 */

const global = {
    /**
     * 等待一段时间，需要通过await使用
     * 
     * @param {number} time 等待的时间，单位ms，默认为3000（3s）
     */
    sleep: (time = 3000) => new Promise((resolve) => setTimeout(resolve, time)),

    /**
     * 按照名字空间格式化页面名（完善中）
     * 
     * 注：可以直接用api获取，但在大量处理时可能会发送过多请求，因此考虑将一些常见中英文别名本地保存
     * 
     * @param {string} title 页面名
     * @param {string | number} namespace 英文或数字名字空间
     * @returns 格式化后的页面名
     */
    formatter: (title, namespace) => {
        
    },
};

export default global;