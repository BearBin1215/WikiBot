import catReader from "../src/utils/catReader.js";
import MWBot from "mwbot";
import config from "../config/config.js";

const bot = new MWBot({
    apiUrl: config.API_PATH,
}, {
    timeout: 30000,
});

await bot.loginGetEditToken({
    username: config.username,
    password: config.password,
});

Object.assign(bot, catReader);
const a = await bot.getMembers("分类:声优");
console.log(a);