/**
 * 用于更新[[萌娘百科:疑似多余消歧义后缀]]
 */
"use strict";
import MWBot from "mwbot";
import config from "../config/config.js";

// 根据API_PATH创建实例，设置30s超时
const bot = new MWBot({
    apiUrl: config.API_PATH,
}, {
    timeout: 30000,
});

/**
 * 登录
 */
async function login() {
    try {
        await bot.loginGetEditToken({
            username: config.username,
            password: config.password,
        });
    } catch (err) {
        throw new Error(`登录失败：${err}`);
    }
}

/**
 * 获取所有页面标题
 * @returns {Promise<string[]>} 页面列表
 */
const getAllPages = async () => {
    const PageList = new Set();
    let apcontinue = "";
    while (apcontinue !== false) {
        try {
            const allPages = await bot.request({
                action: "query",
                list: "allpages",
                aplimit: "max",
                apcontinue,
            });
            apcontinue = allPages.continue?.apcontinue || false;
            for (const page of allPages.query.allpages) {
                PageList.add(page.title);
            }
        } catch (err) {
            console.error(`获取全站主名字空间页面列表出错：${err}`);
        }
    }
    return PageList;
};

/**
 * 根据页面列表分析出多余的消歧义后缀
 * @param {string[]} PageList 页面列表
 * @returns {Promise<string[]>} 疑似多余消歧义后缀列表
 */
const getAbsentList = async (PageList) => {
    const AbsentList = [];
    for (const title of PageList) {
        if (title.slice(-1) === ")" && title[0] !== "(" && (title.indexOf(":") === -1 || title.indexOf(":") > title.indexOf("("))) {
            const titleWithoutSuffix = title.replace(/\(.*\)/, "").trim();
            if (!PageList.has(titleWithoutSuffix)) {
                AbsentList.push(`* [[${title}]]→[[${titleWithoutSuffix}]]`);
            }
        }
    }
    return AbsentList;
};

/**
 * 获取全站重定向页面列表，分析得到后缀重定向至无后缀和无后缀重定向至后缀
 * @returns [ 后缀重定向至无后缀, 无后缀重定向至后缀 ]
 */
const getRedirects = async () => {
    const Suffix2Origin = [];
    const Origin2Suffix = [];
    let garcontinue = "|";
    while (garcontinue !== false) {
        try {
            const allRedirects = await bot.request({
                action: "query",
                generator: "allredirects",
                redirects: true,
                garlimit: "max",
                garcontinue,
            });
            garcontinue = allRedirects.continue?.garcontinue || false;
            for (const item of Object.values(allRedirects.query.redirects)) {
                // 后缀重定向至无后缀
                if(item.from.replace(/^(.*)\(.*\)$/, "$1") === item.to) {
                    Suffix2Origin.push(`* [[${item.from}]]→[[${item.to}]]`);
                }
                // 无后缀重定向至后缀
                if(item.from === item.to.replace(/^(.*)\(.*\)$/, "$1")) {
                    Origin2Suffix.push(`* [[${item.from}]]→[[${item.to}]]`);
                }
            }
        } catch (err) {
            console.log(`获取重定向页面时出错：${err}`);
        }
    }
    return [Suffix2Origin, Origin2Suffix];
};

/**
 * 编辑保存
 * @param {string[]} AbsentList 后缀存在、无后缀不存在的标题列表
 * @param {string[]} Suffix2Origin 有后缀重定向到无后缀列表
 * @param {string[]} Origin2Suffix 无后缀重定向到有后缀列表
 */
const updatePage = async (AbsentList, Suffix2Origin, Origin2Suffix) => {
    const PAGENAME = "萌娘百科:疑似多余消歧义后缀";
    const text =
        "本页面列举疑似多余的消歧义后缀，分为三类：\n" +
        "# “FOO(BAR)”存在，“FOO”不存在；\n" +
        "# “FOO(BAR)”重定向到“FOO”；\n" +
        "# “FOO”重定向到“FOO(BAR)”。\n" +
        "本页面由机器人于每周一凌晨3:40左右自动更新，其他时间如需更新请[[User_talk:BearBin|联系BearBin]]。\n" +
        "__TOC__" +
        "\n\n== 后缀存在、无后缀不存在 ==\n\n" +
        AbsentList.join("\n") +
        "\n\n== 有后缀重定向到无后缀 ==\n\n" +
        Suffix2Origin.join("\n") +
        "\n\n== 无后缀重定向到有后缀 ==\n\n" +
        Origin2Suffix.join("\n") +
        "\n\n[[Category:萌娘百科数据报告]][[Category:积压工作]]";

    try {
        await bot.request({
            action: "edit",
            title: PAGENAME,
            text,
            summary: "自动更新列表",
            bot: true,
            tags: "Bot",
            token: bot.editToken,
        });
        console.log(`成功保存到\x1B[4m[[${PAGENAME}]]\x1B[0m。`);
    } catch (err) {
        console.error(`保存到\x1B[4m[[${PAGENAME}]]\x1B[0m失败：${err}`);
    }
};

/**
 * 主函数
 * @param {number} retryCount 重试次数
 */
const main = async (retryCount = 5) => {
    let retries = 0;
    while (retries < retryCount) {
        try {
            await login();
            console.log("登录成功。正在获取所有页面……");

            const PageList = await getAllPages();
            const AbsentList = await getAbsentList(PageList);
            console.log(`获取到\x1B[4m${AbsentList.length}\x1B[0m个疑似多余的消歧义后缀页面。`);

            const [Suffix2Origin, Origin2Suffix] = await getRedirects();
            console.log(`获取到\x1B[4m${Suffix2Origin.length}\x1B[0m个后缀重定向至无后缀，\x1B[4m${Origin2Suffix.length}\x1B[0m个无后缀重定向至后缀。`);

            await updatePage(AbsentList, Suffix2Origin, Origin2Suffix);
            return;
        } catch (err) {
            console.error(`运行出错：${err}`);
            retries++;
        }
    }
    throw new Error(`运行失败：已连续尝试${retryCount}次。`);
};

// 最大尝试次数5
main(5).catch((err) => {
    console.log(err);
});