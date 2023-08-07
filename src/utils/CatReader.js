/**
 * 本模块内容用于提供获取分类相关函数
 * 
 * 使用本模块导入后，应当使用Object.assign(bot, catReader)并入现有mwbot实例
 */
import global from "./global.js";

const catReader = {
    formatter: (title) => title.replace(/^(?:Category:|Cat:|分[类類]:)?(.*)$/i, "Category:$1"),

    /**
     * 获取指定分类的成员
     * 
     * @param {string} title 分类名
     * @param {string} cmtype 要获取的成员类型，默认为page
     * @param {string|number} cmnamespace 指定的名字空间，默认获取全部
     * @returns {Array} 分类成员列表
     */
    getMembers: async function (title, cmtype = "page", cmnamespace = "*") {
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
                    cmnamespace,
                    cmtype,
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
     * 递归获取分类下所有页面
     * @param {string} title 分类名
     * @param {string|number} cmnamespace 要获取的名字空间，默认全部
     * @returns 
     */
    traverseCat: async function (title, cmnamespace = "*") {
        const pageList = [];
        const members = await this.getMembers(title, "page", cmnamespace);
        const subCats = await this.getMembers(title, "subcat");
        console.log(`获取到${title}内页面${members.length}个，子分类${subCats.length}个。`);
        pageList.push(...members);
        for (const item of subCats) {
            const subMembers = await this.traverseCat(item);
            pageList.push(...subMembers);
        }
        return [...new Set(pageList)]; // 去重
    },
};

export default catReader;