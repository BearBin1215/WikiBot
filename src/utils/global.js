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
     * @see api.php?action=query&meta=siteinfo&siprop=general|namespaces|namespacealiases
     * 
     * @param {string} title 页面名
     * @param {string | number} namespace 英文或数字名字空间
     * @returns {string} 格式化后的页面名
     */
    formatter: (title, namespace) => {
        let pattern;
        let target;
        switch (namespace.toLowerCase()) {
            case 1:
            case "talk":
                pattern = /^ *(?:Talk:|讨论:|討論:)?$/i;
                target = "Talk:$1";
                break;
            case 2:
            case "user":
                pattern = /^ *(?:User:|用[户戶]:|使用者:)?(.*)$/i;
                target = "User:$1";
                break;
            case 3:
            case "user_talk":
                pattern = /^ *(?:User[_ ]talk:|用[户戶][讨討][论論]:|使用者[讨討][论論]:)?(.*)$/i;
                target = "User_talk:$1";
                break;
            case 14:
            case  "category":
                pattern = /^ *(?:Category:|Cat:|分[类類]:)?(.*)$/i;
                target = "Category:$1";

        }
        return title.replace(pattern, target);
    },
};

export default global;