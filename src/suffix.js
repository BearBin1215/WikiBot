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

// 登录
bot.loginGetEditToken({
    username: config.username,
    password: config.password,
}).then(async () => {
    console.log("登录成功。正在获取所有页面……");
    const PageList = [];
    const AbsentList = [];
    const Suffix2Origin = [];
    const Origin2Suffix = [];

    // 获取所有页面名称，筛选出其中FOO(BAR)存在、FOO不存在的页面
    let apcontinue = "";
    let checkedPage = 0;
    while (apcontinue !== false) {
        try {
            const allPages = await bot.request({
                action: "query",
                list: "allpages",
                aplimit: "max",
                apcontinue,
            });
            apcontinue = allPages.continue ? allPages.continue.apcontinue : false;
            for (const page of allPages.query.allpages) {
                PageList.push(page.title);
                checkedPage++;
            }
        } catch (err) {
            console.error(`获取全站主名字空间页面列表出错：${err}`);
        }
    }
    console.log(`获取到${checkedPage}个页面标题，开始获取重定向页面列表。`);

    for (const title of PageList) {
        if (title.slice(-1) === ")" && title[0] !== "(" && (title.indexOf(":") === -1 || title.indexOf(":") > title.indexOf("("))) {
            const titleWithoutSuffix = title.replace(/\(.*\)/, "").trim();
            if (!PageList.includes(titleWithoutSuffix)) {
                AbsentList.push(`* [[${title}]]→[[${titleWithoutSuffix}]]`);
            }
        }
    }

    // 获取所有重定向页面内容，根据其重定向目标筛选剩下两种情况
    let garcontinue = "|";
    checkedPage = 0;
    while (garcontinue !== false) {
        try {
            const allRedirects = await bot.request({
                action: "query",
                generator: "allredirects",
                redirects: true,
                garlimit: "max",
                garcontinue,
            });
            garcontinue = allRedirects.continue ? allRedirects.continue.garcontinue : false;
            for (const item of Object.values(allRedirects.query.redirects)) {
                checkedPage++;
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
    console.log(`获取到${checkedPage}个重定向页面。`);

    console.log(
        `共${AbsentList.length}个多余消歧义后缀页面、` +
        `${Suffix2Origin.length}个后缀重定向至无后缀、` +
        `${Origin2Suffix.length}个无后缀重定向至后缀。`,
    );

    const PAGENAME = "萌娘百科:疑似多余消歧义后缀";
    const text =
        "本页面列举疑似多余的消歧义后缀，分为三类：\n" +
        "# “FOO(BAR)”存在，“FOO”不存在；\n" +
        "# “FOO(BAR)”重定向到“FOO”；\n" +
        "# “FOO”重定向到“FOO(BAR)”。\n" +
        "__TOC__" +
        "\n\n== 后缀存在、无后缀不存在 ==\n\n" +
        AbsentList.join("\n") +
        "\n\n== 有后缀重定向到无后缀 ==\n\n" +
        Suffix2Origin.join("\n") +
        "\n\n== 无后缀重定向到有后缀 ==\n\n" +
        Origin2Suffix.join("\n") +
        "\n\n[[Category:萌娘百科数据报告]][[Category:积压工作]]";

    bot.request({
        action: "edit",
        title: PAGENAME,
        text,
        summary: "自动更新列表",
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