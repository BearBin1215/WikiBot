/**
 * 本模块内容用于提供获取分类相关函数。
 */

import MWBot from "mwbot";
import config from "../../config/config.js";

const bot = new MWBot({
    apiUrl: config.API_PATH,
}, {
    timeout: 30000,
});

const CatReader = {
    /**
     * 获取指定分类下的所有页面
     * @param {string} cmtitle 分类名，可以不带名字空间前缀
     * @returns {Array} 页面列表
     */
    member: async (cmtitle) => {
        let cmcontinue = "";
        const pageList = [];
        while (cmcontinue !== false) {
            try {
                const catMembers = await bot.request({
                    action: "query",
                    list: "categorymembers",
                    cmlimit: "max",
                    cmtitle,
                    cmcontinue,
                });
                if (catMembers.query.categorymembers[0]) {
                    for (const item of catMembers.query.categorymembers) {
                        pageList.push(item.title);
                    }
                }
                cmcontinue = catMembers.continue ? catMembers.continue.cmcontinue : false;
            } catch (err) {
                console.log(`获取${cmtitle}内页面出错：${err}。`);
            }
        }
        return pageList;
    },
};

export default CatReader;