import CatReader from "../src/utils/CatReader.js";
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

bot.catMembers = CatReader.getMembers;
const a = await bot.catMembers("分类:");
console.log(a);