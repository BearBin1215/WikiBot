/**
 * 本模块内容用于提供获取分类相关函数。
 */
import config from "../../config/config";

const CatReader = {
    getMembers: async function (title) {
        let cmcontinue = "";
        const pageList = [];
        if(title.length === 0) {
            return [];
        }
        const cmtitle = title.replace(/^(?:Category:|Cat:|分[类類]:)?(.*)$/i, "Category:$1"); // 格式化分类名
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
                console.error(`获取${cmtitle}内页面出错：${err}。`);
            }
        }
        return pageList;
    },
};

export default CatReader;