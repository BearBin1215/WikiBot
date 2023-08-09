/**
 * 此文件存放api地址、用户名、密码等数据
 */

const config = {
    API_PATH: "https://mzh.moegirl.org.cn/api.php", // api.php地址
    CM_API_PATH: "https://commons.moegirl.org.cn/api.php",
    username: "", // wiki上的用户名
    password: "", // wiki上的密码

    // 飞书相关token
    feishu: {
        App_ID: "",
        App_Secret: "",
        user_access_token: "",
    },
};

// 自动更新用
import dotenv from "dotenv";
dotenv.config();
config.username = process.env.MW_USERNAME_SUB || config.username;
config.password = process.env.MW_PASSWORD_SUB || config.password;

config.feishu.App_ID = process.env.FEISHU_APP_ID || config.feishu.App_ID;
config.feishu.App_Secret = process.env.FEISHU_APP_SECRET || config.feishu.App_Secret;
config.feishu.user_access_token = process.env.FEISHU_USER_ACCESS_TOKEN || config.feishu.user_access_token;
export default config;