"use strict";
import MWBot from "mwbot";
import config from "../config/config.js";

const bot = new MWBot({
    apiUrl: config.API_PATH,
}, {
    timeout: 60000,
});

/**
 * 获取所有消歧义页标题及其重定向
 * @returns {Promise<Set<string>>} 消歧义页标题及其重定向列表
 */
const getDisambigList = async () => {
    try {
        const DisambigList = new Set();
        let gcmcontinue = "||";
        while (gcmcontinue !== false) {
            const catMembers = await bot.request({
                action: "query",
                generator: "categorymembers",
                prop: "redirects",
                gcmlimit: "max",
                rdlimit: "max",
                gcmtitle: "Category:消歧义页",
                gcmcontinue,
            });
            gcmcontinue = catMembers.continue?.gcmcontinue || false;
            for (const item of Object.values(catMembers.query.pages)) {
                DisambigList.add(item.title);
                for (const rd of item.redirects || []) { // 加入同时获取到的重定向页面
                    DisambigList.add(rd.title);
                }
            }
        }
        return [...DisambigList];
    } catch (error) {
        throw new Error(`获取消歧义页列表出错：${error}`);
    }
};

/**
 * 递归获取分类内所有模板
 * 
 * @param {string} category 
 * @returns {string[]} 分类内模板列表
 */
const getTemplatesInCategory = async (category) => {
    const templates = [];
    let gcmcontinue = "";
    while (gcmcontinue !== undefined) {
        const response = await bot.request({
            action: "query",
            generator: "categorymembers",
            gcmtitle: category,
            gcmtype: "page|subcat",
            gcmlimit: "max",
            gcmcontinue,
        });
        gcmcontinue = response.continue?.gcmcontinue;
        for (const page of Object.values(response.query.pages)) {
            if (page.ns === 10) {
                templates.push(page.title);
            } else if (page.ns === 14) {
                templates.push(...await getTemplatesInCategory(page.title));
            }
        }
        console.log(`\x1B[4m${category}\x1B[0m下查找到\x1B[4m${templates.length}\x1B[0m个模板`);
    }
    return [...new Set(templates)];
};

/**
 * 获取模板内所有链接
 * 
 * @param {string[]} templates 模板列表
 * @returns 
 */
const getLinksInTemplates = async (templates, size = 50) => {
    const links = {};
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
            for (const page of Object.values(response.query.pages)) {
                links[page.title] ||= [];
                for (const link of page.links || []) {
                    links[page.title].push(link.title);
                }
            }
        }
        console.log(`正在读取模板内的链接（${Math.min(i + size, templates.length)}/${templates.length}）`);
    }
    return links;
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
            console.log(`获取到${DisambigList.length}个消歧义页及其重定向，正在获取所有导航模板……`);

            const templates = await getTemplatesInCategory("Category:导航模板");
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
            const text = Object.entries(disambigInTemplates)
                .map(([key, values]) => `;[[${key}]]\n:[[${values.join("]]\n:[[")}]]\n`)
                .join("");

            await updatePage(text, "User:BearBin/链接到消歧义页面的导航模板");
            return;
        } catch (error) {
            console.error(`获取数据出错：${error}\n正在重试（${retries + 1}/${retryCount}）`);
            retries++;
        }
    }
    throw new Error(`运行失败：已连续尝试${retryCount}次。`);
};

main(5).catch((error) => {
    console.error(error);
});