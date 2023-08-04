/**
 * 本模块内容用于提供获取分类相关函数
 * 
 * 使用本模块导入后，应当使用Object.assign(bot, catReader)并入现有mwbot实例
 */
import global from "./global.js";

const catReader = {
    formatter: (title) => title.replace(/^(?:Category:|Cat:|分[类類]:)?(.*)$/i, "Category:$1"),

    /**
     * 获取指定分类下所有页面
     * 
     * @param {string} title 分类名
     * @returns {Array} 分类成员列表
     */
    getMembers: async function (title) {
        let cmcontinue = "";
        const pageList = [];
        if(title.length === 0) {
            return [];
        }
        const cmtitle = this.formatter(title); // 格式化分类名
        while (cmcontinue !== false) {
            try {
                const catMembers = await this.request({
                    action: "query",
                    list: "categorymembers",
                    cmlimit: "max",
                    cmtitle,
                    cmcontinue,
                }).catch((err) => {
                    throw err;
                });
                if (catMembers.query.categorymembers[0]) {
                    for (const item of catMembers.query.categorymembers) {
                        pageList.push(item.title);
                    }
                }
                cmcontinue = catMembers.continue ? catMembers.continue.cmcontinue : false;
            } catch (err) {
                console.error(`获取${cmtitle}内页面出错：${err}`);
            }
        }
        return pageList;
    },

    /**
     * 获取指定分类的子分类
     * 
     * @param {string} title 分类名
     * @returns {Array} 子分类列表
     */
    getSubs: async function (title) {

    },
};

export default catReader;