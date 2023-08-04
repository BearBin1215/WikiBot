/**
 * 获取需要建立的消歧义页面
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

// 登录
bot.loginGetEditToken({
    username: config.username,
    password: config.password,
}).then(async () => {
    const DisambigList = [];
    const RequiredDisambig = {};
    try {
        // 获取所有消歧义页标题及其重定向
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
                DisambigList.push(item.title.replace("(消歧义页)", ""));
                for (const rd of item.redirects || []) {
                    DisambigList.push(rd.title);
                }
            }
        }
        console.log(`获取到${DisambigList.length}个消歧义页面及其重定向，开始获取所有条目标题。`);
    } catch (err) {
        console.error(err);
    }

    // 检查标题可能需要消歧义的所有条目（排除重定向）
    const PageList = [];
    let apcontinue = "";
    while (apcontinue !== false) {
        try {
            const allPages = await bot.request({
                action: "query",
                list: "allpages",
                aplimit: "max",
                apcontinue,
                apfilterredir: "nonredirects",
            });
            apcontinue = allPages.continue ? allPages.continue.apcontinue : false;
            for (const page of allPages.query.allpages) {
                PageList.push(page.title);
            }
        } catch (err) {
            console.error(`获取全站主名字空间页面列表出错：${err}`);
        }
    }
    // 遍历所有页面标题
    for (const item of PageList) {
        const SuffixPattern = /^([^:]+)\((.+)\)$/;
        const titleWithoutSuffix = item.replace(SuffixPattern, "$1");
        if (
            // SuffixPattern.test(item) && // 标题带有后缀
            // !["单曲", "专辑"].includes(item.replace(SuffixPattern, "$2")) && // 排除特定后缀
            !DisambigList.includes(titleWithoutSuffix) // 去掉后缀后的页面不是消歧义页
        ) {
            if (RequiredDisambig[titleWithoutSuffix]) {
                RequiredDisambig[titleWithoutSuffix].push(item);
            } else {
                RequiredDisambig[titleWithoutSuffix] = [item];
            }
        }
    }
    const TextList = [];
    for (const key in RequiredDisambig) {
        const value = RequiredDisambig[key];
        if (
            value.length > 1 &&
            !(
                value.length === 2 &&
                value[0].replace(/\((单曲|专辑)\)/, "") === value[1].replace(/\((单曲|专辑)\)/, "")
            )
        ) {
            TextList.push(`;[[${key}]]\n: [[` + value.join("]]\n: [[") + "]]");
        }
    }

    const PAGENAME = "User:BearBin/可能需要创建的消歧义页面";
    const text =
        "{{info\n" +
        "|leftimage=[[File:Nuvola_apps_important_blue.svg|50px|link=萌娘百科:消歧义方针]]\n" +
        "|仅供参考、慎重处理，别真一个个无脑建过去了。\n" +
        "}}\n" +
        TextList.join("\n");
    console.log("获取完成，即将保存。");
    bot.request({
        action: "edit",
        title: PAGENAME,
        summary: "自动更新列表",
        text,
        bot: true,
        tags: "Bot",
        token: bot.editToken,
    }).then(() => {
        console.log(`成功保存到[[${PAGENAME}]]`);
    }).catch((err) => {
        console.error(`保存到[[${PAGENAME}]]失败：${err}`);
    });
}).catch((err) => {
    console.log(`登录失败：${err}`);
});