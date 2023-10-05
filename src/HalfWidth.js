"use strict";
import MWBot from "mwbot";
import config from "../config/config.js";

const bot = new MWBot({
    apiUrl: config.API_PATH,
}, {
    timeout: 30000,
});

async function login() {
    try {
        await bot.loginGetEditToken({
            username: config.username,
            password: config.password,
        });
    } catch (error) {
        throw new Error(`登录失败：${error}`);
    }
}

const getAllPages = async () => {
    const pageList = new Set();
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
                pageList.add(page.title);
            }
        } catch (error) {
            throw new Error(`获取全站主名字空间页面列表出错：${error}`);
        }
    }
    return pageList;
};

const submitResult = async (pageList) => {
    const PAGENAME = "User:BearBin/可能需要改为全角标点标题的页面";
    const badList = [];
    for(const page of pageList) {
        if(/[\u4e00-\u9fa5\u3040-\u30ff][!?,.]/.test(page)) {
            badList.push(page);
        }
    }

    const text = `-{\n* [[${badList.join("]]\n* [[")}]]\n}-`;

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
        console.log(`成功保存到\x1B[4m${PAGENAME}\x1B[0m。`);
    } catch (error) {
        throw new Error(`保存到\x1B[4m${PAGENAME}\x1B[0m失败：${error}`);
    }
};

const main = async (retryCount = 5) => {
    let retries = 0;
    while (retries < retryCount) {
        try {
            await login();
            console.log("登录成功。正在获取所有页面……");

            const pageList = await getAllPages();
            console.log(`获取到${pageList.length}个页面。`);

            await submitResult(pageList);
            return;
        } catch (error) {
            console.error(`获取数据出错，正在重试（${retries + 1}/${retryCount}）：${error}`);
            retries++;
        }
    }
    throw new Error(`运行失败：已连续尝试${retryCount}次。`);
};

main(5);