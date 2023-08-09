import axios from "axios";
import MWBot from "mwbot";
import config from "./config.js";

// 飞书表格相关信息
const TableInfo = {
    baseURL: "https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/",
    spreadsheetToken: "shtcnTQQ5n5HkdGwiiYEtE1FHZ9", // galgame条目统计表
    sheetId: "0rCQAp", // 日本作品
    range: "!A2:B", // 从第2行起，获取A、B列内容（原名、译名）
};

// MWBot实例
const bot = new MWBot({
    apiUrl: config.API_PATH,
}, {
    timeout: 30000,
});

let text;
try {
    // 获取表格内容
    const response = await axios({
        method: "GET",
        url: TableInfo.baseURL + TableInfo.spreadsheetToken + "/values/" + TableInfo.sheetId + TableInfo.range,
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + config.feishu.user_access_token,
        },
    }).catch((error) => {
        throw new Error(`读取飞书统计表失败：${error}`);
    });
    console.log("读取飞书统计表成功，准备保存至萌百。");

    // 处理获取到的内容，生成文本
    const pageList = [];
    for (let item of response.data.data.valueRange.values) {
        if (!item[0]) {
            break;
        }
        if (pageList.length % 100 === 0) {
            pageList.push(`\n== ${pageList.length + 1}～${pageList.length + 100} ==`);
        }
        const ja = item[0].replace("\n", "").trim();
        const pagename = item[1]?.replace("\n", "").trim() || ja;
        pageList.push(`#{{lj|${ja}}}→[[${pagename}]]`);
    }
    text = "本页面由机器人自动更新。\n" + pageList.join("\n");
} catch (err) {
    console.error(err);
}

// 机器人登录并提交编辑
bot.loginGetEditToken({
    username: config.username,
    password: config.password,
}).then(() => {
    try {
        const title = "User:BearBin/Sandbox";
        bot.request({
            action: "edit",
            title,
            text,
            summary: "自动同步自飞书",
            bot: true,
            tags: "Bot",
            token: bot.editToken,
        }).then(() => {
            console.log(`成功保存到[[${title}]]`);
        }).catch((error) => {
            throw new Error(`保存到[[${title}]]失败：${error}`);
        });
    } catch (error) {
        console.error(error);
    }
}).catch((error) => {
    console.error(`登录失败：${error}`);
});