"use strict";
import MWBot from "mwbot";
import config from "../../config/config.js";

/**
 * 创建一个机器人实例并登录
 * @param {number} timeout 超时时间
 */
export default async (timeout = 30000) => {
    const bot = new MWBot({
        apiUrl: config.API_PATH,
    }, {
        timeout,
    });
    try {
        await bot.loginGetEditToken({
            username: config.username,
            password: config.password,
        });
    } catch (error) {
        throw new Error(`登录失败：${error}`);
    }
    return bot;
};