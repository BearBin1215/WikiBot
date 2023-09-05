"use strict";
import MWBot from "mwbot";
import config from "../config/config.js";
import catReader from "./utils/catReader.js";

const bot = new MWBot({
    apiUrl: config.API_PATH,
}, {
    timeout: 60000,
});
Object.assign(bot, catReader);

/**
 * 获取所有消歧义页标题及其重定向
 * @returns {Promise<string[]>} 消歧义页标题及其重定向列表
 */
const getDisambigList = async () => {
    try {
        const DisambigList = [];
        let gcmcontinue = "||";
        while (gcmcontinue !== undefined) {
            const catMembers = await bot.request({
                action: "query",
                generator: "categorymembers",
                prop: "redirects",
                gcmlimit: "max",
                rdlimit: "max",
                gcmtitle: "Category:消歧义页",
                gcmcontinue,
            });
            gcmcontinue = catMembers.continue?.gcmcontinue;
            for (const item of Object.values(catMembers.query.pages)) {
                DisambigList.push(item.title);
                for (const rd of item.redirects || []) { // 加入同时获取到的重定向页面
                    DisambigList.push(rd.title);
                }
            }
        }
        return DisambigList;
    } catch (error) {
        throw new Error(`获取消歧义页列表出错：${error}`);
    }
};


/**
 * 获取模板内所有链接
 * 
 * @param {string[]} templates 模板列表
 * @param {number} size 单次要获取连接的模板数，填50还是500取决于有没有apihighlimits
 * @returns {Promise<Object>} links 各个模板的所有链接组成的对象
 */
const getLinksInTemplates = async (templates, size = 50) => {
    const linksInTemplates = {};
    for (let i = 0; i < templates.length; i += size) {
        let plcontinue = "||";
        while (plcontinue !== undefined) {
            const response = await bot.request({
                action: "query",
                prop: "links",
                titles: templates.slice(i, i + size).join("|"),
                pllimit: "max",
                plcontinue,
            });
            plcontinue = response.continue?.plcontinue;
            // 检查模板的所有链接是否在消歧义页列表中
            for (const {title, links} of Object.values(response.query.pages)) {
                linksInTemplates[title] ||= [];
                for (const link of links || []) {
                    linksInTemplates[title].push(link.title);
                }
            }
        }
        console.log(`正在读取模板内的链接（${Math.min(i + size, templates.length)}/${templates.length}）`);
    }
    return linksInTemplates;
};

/**
 * 保存到指定页面
 * @param {string} text 要保存的文本
 */
const updatePage = async (text, title) => {
    try {
        bot.editToken = (await bot.getEditToken()).csrftoken; // 获取完前面的数字时token已经过期了，需要重新获取
        await bot.request({
            action: "edit",
            title,
            summary: "自动更新列表",
            text,
            bot: true,
            tags: "Bot",
            token: bot.editToken,
        });
        console.log(`成功保存到\x1B[4m${title}\x1B[0m。`);
    } catch (error) {
        throw new Error(`保存到\x1B[4m${title}\x1B[0m失败：${error}`);
    }
};

const main = async (retryCount = 5) => {
    let retries = 0;

    while (retries < retryCount) {
        try {
            await bot.loginGetEditToken({
                username: config.username,
                password: config.password,
            });
            console.log("登录成功，开始获取消歧义页列表……");

            const DisambigList = await getDisambigList();
            console.log(`获取到\x1B[4m${DisambigList.length}\x1B[0m个消歧义页及其重定向，正在获取所有导航模板……`);

            const templates = await bot.getMembersInCat("Category:导航模板", 10);
            console.log(`获取到\x1B[4m${templates.length}\x1B[0m个模板。正在获取模板中包含的链接……`);

            const linksInTemplates = await getLinksInTemplates(templates, 500);

            // 用于存储模板内的消歧义链接
            const disambigInTemplates = {};
            // 遍历links
            Object.entries(linksInTemplates).forEach(([key, pages]) => {
                const filteredPages = pages.filter(page => DisambigList.includes(page)); // 对于linksInTemplates的每个页面，筛选出其中含有消歧义链接的页面
                if (filteredPages.length > 0) {
                    disambigInTemplates[key] = (disambigInTemplates[key] || []).concat(filteredPages);
                }
            });
            // 生成wikitext
            const text = 
            "本页面列出[[:Category:导航模板|导航模板]]中的消歧义链接。\n\n" +
            "部分链接可能本意就是链接到消歧义页面，请注意甄别。\n\n" +
            "由机器人于<u>每周四凌晨4:40左右</u>自动更新，其他时间如需更新请[[User_talk:BearBin|联系BearBin]]。\n" +
            "----" +
            Object.entries(disambigInTemplates)
                .map(([key, values]) => `;[[${key}]]<span class="plainlinks" style="font-weight:normal">【[{{fullurl:${key}|action=edit}} 编辑]】</span>\n:[[${values.join("]]\n:[[")}]]\n`)
                .join("") +
            "\n[[Category:萌娘百科数据报告]]";

            await updatePage(text, "萌娘百科:链接到消歧义页面的导航模板");
            return;
        } catch (error) {
            console.error(`获取数据出错：${error}\n正在重试（${retries + 1}/${retryCount}）`);
            retries++;
        }
    }
    throw new Error(`运行失败：已连续尝试${retryCount}次。`);
};

main(5);