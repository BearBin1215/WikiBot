import MWBot from "mwbot";
import config from "../config/config.js";

const bot = new MWBot({
    apiUrl: config.API_PATH,
}, {
    timeout: 30000,
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
                DisambigList.add(item.title.replace("(消歧义页)", "")); // 去掉(消歧义页)后缀再加入列表，以免误判
                for (const rd of item.redirects || []) { // 加入同时获取到的重定向页面
                    DisambigList.add(rd.title);
                }
            }
        }
        return DisambigList;
    } catch(error) {
        throw new Error(`获取消歧义页列表出错：${error}`);
    }
};

/**
 * 获取所有条目标题（排除重定向）
 * @returns {Promise<string[]>} 所有条目标题列表
 */
const getPageList = async () => {
    const PageList = [];
    let apcontinue = "";
    while (apcontinue !== false) {
        const allPages = await bot.request({
            action: "query",
            list: "allpages",
            aplimit: "max",
            apcontinue,
            apfilterredir: "nonredirects",
        });
        apcontinue = allPages.continue?.apcontinue || false;
        for (const page of allPages.query.allpages) {
            PageList.push(page.title);
        }
    }
    return PageList;
};

/**
 * 获取需要建立的消歧义页面
 * @param {Set<string>} DisambigList 消歧义页标题及其重定向列表
 * @param {string[]} PageList 所有条目标题列表
 * @returns {string[]} 需要建立的消歧义页面列表
 */
const getRequiredDisambig = (DisambigList, PageList) => {
    const RequiredDisambig = {};
    // 遍历所有页面标题
    for (const item of PageList) {
        // const SuffixPattern = /^([^:]+)\((.+)\)$/; // 后缀页面规则：以半角括号对结尾，括号前无半角冒号
        // const titleWithoutSuffix = item.replace(SuffixPattern, "$1");
        // const titleWithoutPrefix = item.replace(/^(.+):(.+)$/, "$2");
        const titleWithouFix = item
            .replace(/\d:\d{2}([^\d])/, "$1") // 排除时间
            .replace(/^([^(]+:)?([^:)]+)(\(.+\))?$/, "$2");
        if (
            // SuffixPattern.test(item) && // 标题带有后缀
            // !["单曲", "专辑"].includes(item.replace(SuffixPattern, "$2")) && // 排除特定后缀
            !DisambigList.has(titleWithouFix) && // 去掉前缀的页面不是消歧义页
            item.indexOf("闪耀幻想曲:") === -1
        ) {
            RequiredDisambig[titleWithouFix] ||= [];
            RequiredDisambig[titleWithouFix].push(item);
        }
    }
    // eslint-disable-next-line no-unused-vars
    return Object.entries(RequiredDisambig).filter(([_key, value]) => {
        return (
            value.length > 1 &&
            !(
                value.length === 2 &&
                value[0].replace(/\((单曲|专辑)\)/, "") === value[1].replace(/\((单曲|专辑)\)/, "") // 仅两个条目且互为单曲专辑
            ) &&
            !value.every((item) => item.indexOf("假面骑士") > -1) && // 假面骑士专题内的互相消歧义
            !value.every((item) => item.indexOf("决战平安京") > -1 || item.indexOf("百闻牌") > -1 || item.indexOf("阴阳师手游") > -1 || item.indexOf("妖怪屋") > -1) // 网易阴阳师系列内的互相消歧义
        );
    }).map(([key, value]) => `;[[${key}]]\n: [[` + value.join("]]\n: [[") + "]]");
};

/**
 * 保存到指定页面
 */
const updatePage = async (TextList) => {
    const PAGENAME = "User:BearBin/可能需要创建的消歧义页面";
    const text =
        "{{info\n" +
        "|leftimage=[[File:Nuvola_apps_important_blue.svg|50px|link=萌娘百科:消歧义方针]]\n" +
        "|仅供参考、慎重处理，别真一个个无脑建过去了。\n" +
        "}}\n" +
        TextList.join("\n");

    try {
        await bot.request({
            action: "edit",
            title: PAGENAME,
            summary: "自动更新列表",
            text,
            bot: true,
            tags: "Bot",
            token: bot.editToken,
        });
        console.log(`成功保存到\x1B[4m${PAGENAME}\x1B[0m`);
    } catch (error) {
        throw new Error(`保存到\x1B[4m${PAGENAME}\x1B[0m失败：${error}`);
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
            const [DisambigList, PageList] = await Promise.all([getDisambigList(), getPageList()]);
            console.log(`获取到\x1B[4m${DisambigList.size}\x1B[0m个消歧义页面及其重定向，\x1B[4m${PageList.length}\x1B[0m个条目标题。`);
            const TextList = getRequiredDisambig(DisambigList, PageList);
            console.log("获取完成，即将保存。");

            await updatePage(TextList);
            return;
        } catch (err) {
            console.error(`获取数据出错，正在重试（${retries + 1}/${retryCount}）：${err}`);
            retries++;
        }
    }
    throw new Error(`运行失败：已连续尝试${retryCount}次。`);
};

main(5).catch((error) => {
    console.error(error);
});
