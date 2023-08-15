import MWBot from "mwbot";
import fs from "fs";
import config from "../../config/config.js";

const bot = new MWBot({
    apiUrl: config.API_PATH,
}, {
    timeout: 60000,
});

/**
 * 登录
 */
const login = async () => {
    try {
        await bot.loginGetEditToken({
            username: config.username,
            password: config.password,
        });
    } catch (error) {
        throw new Error(`登录失败：${error}`);
    }
};

/**
 * 获取所有Category名字空间页面
 * @returns {Object} 所有分类及其对应的id信息
 */
const getAllCategories = async () => {
    const AllCategories = {};
    let apcontinue = "";
    while (apcontinue !== undefined) {
        try {
            const allPages = await bot.request({
                action: "query",
                list: "allpages",
                aplimit: "max",
                apnamespace: 14,
                apcontinue,
            });
            apcontinue = allPages.continue?.apcontinue;
            for (const {pageid, title} of allPages.query.allpages) {
                AllCategories[title] = {
                    id: pageid,
                };
            }
            console.log(`已获取${Object.keys(AllCategories).length}个分类`);
        } catch (error) {
            throw new Error(`获取全站分类列表出错：${error}`);
        }
    }
    return AllCategories;
};

const saveFile = async(filepath, obj) => {
    try {
        await fs.promises.writeFile(filepath, JSON.stringify(obj, "", "  "), "utf-8");
    }catch(error) {
        throw new Error(`文件保存失败：${error}`);
    }
};

const main = async (retryCount = 5) => {
    let retries = 0;
    while (retries < retryCount) {
        try {
            await login();
            console.log("登录成功。正在获取所有分类信息……");
        } catch (error) {
            console.error(`获取数据出错，正在重试（${retries + 1}/${retryCount}）：${error}`);
            retries++;
        }
    }
    throw new Error(`运行失败：已连续尝试${retryCount}次。`);
};

await login();
saveFile("saves/CategoryData.json", await getAllCategories());
// fs.writeFile("/saves/CategoryData.json", JSON.stringify(await getAllCategories()), "utf-8", (err) => {
//     console.log(`保存失败：${err}` || "OK");
// });