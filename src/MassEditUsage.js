import MWBot from "mwbot";
import config from "../config/config.js";

let data = {
    lastUpdate: "2023-05-01T00:00:00Z",
    usage: {},
    static: {},
};

const zhBot = new MWBot({
    apiUrl: config.API_PATH,
}, {
    timeout: 60000,
});

const cmBot = new MWBot({
    apiUrl: config.CM_API_PATH,
}, {
    timeout: 60000,
});

// 登录
const login = async (bot) => {
    await bot.loginGetEditToken({
        username: config.username,
        password: config.password,
    });
};

// 获取页面记录的上次信息
const getPreData = async (title) => {
    const pageData = await zhBot.read(title);
    data = JSON.parse(Object.values(pageData.query.pages)?.[0]?.revisions?.[0]?.["*"]) || data;
};

// 获取最近更改并更新数据
const getRecentChanges = async (site = "zh", lastUpdate) => {
    let bot;
    switch (site) {
        case "zh":
        default:
            bot = zhBot;
            break;
        case "cm":
            bot = cmBot;
            break;
    }
    data.usage[site] ||= {};
    let rccontinue = "|";
    try {
        while (rccontinue !== undefined) {
            const response = await bot.request({
                action: "query",
                list: "recentchanges",
                rctag: "Automation tool",
                rcprop: "timestamp|comment|user",
                rclimit: "max",
                rccontinue,
            });
            rccontinue = response.continue?.rccontinue;
            console.log(response.query.recentchanges[0].timestamp, response.query.recentchanges.length);
            for (const item of response.query.recentchanges) {
                const timestamp = new Date(item.timestamp);
                if (timestamp < lastUpdate) {
                    return data;
                }
                if (item.comment.includes("MassEdit")) {
                    data.usage[site][item.user] ||= 0;
                    data.usage[site][item.user] += 1;
                }
            }
        }
    } catch (error) {
        throw new Error(`获取${site}最近更改失败：${error}`);
    }
    return data;
};

// 更新
const updatePage = async (title, text) => {
    try {
        zhBot.editToken = (await zhBot.getEditToken()).csrftoken; // 获取完前面的数字时token已经过期了，需要重新获取
        await zhBot.request({
            action: "edit",
            title,
            summary: "自动更新列表",
            text,
            bot: true,
            tags: "Bot",
            token: zhBot.editToken,
        });
        console.log(`成功保存到\x1B[4m${title}\x1B[0m。`);
    } catch (error) {
        throw new Error(`保存到\x1B[4m${title}\x1B[0m失败：${error}`);
    }
};

// 主函数
const main = async (retryCount = 5) => {
    let retries = 0;
    const dataPage = "User:BearBin/MassEditUsage.json";
    while (retries < retryCount) {
        try {
            await login(zhBot);
            await login(cmBot);
            console.log("登录成功");
            await getPreData(dataPage);
            const lastUpdate = new Date(data.lastUpdate);
            data.lastUpdate = new Date().toISOString();
            await getRecentChanges("zh", lastUpdate);
            await getRecentChanges("cm", lastUpdate);
            data.static = {
                userCount: new Set([...Object.keys(data.usage.zh), ...Object.keys(data.usage.cm)]).size,
                editCount: [...Object.values(data.usage.zh), ...Object.values(data.usage.cm)].reduce((pre, cur) => pre + cur, 0),
            };
            console.log(data);
            await updatePage(dataPage, JSON.stringify(data, null, "    "));
            return;
        } catch (error) {
            console.error(`获取数据出错：${error}\n正在重试（${retries + 1}/${retryCount}）`);
            retries++;
        }
    }
    throw new Error(`运行失败：已连续尝试${retryCount}次。`);
};

main(5);