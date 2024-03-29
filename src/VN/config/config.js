/**
 * 此文件存放api地址、用户名、密码等数据
 */

const config = {
  API_PATH: 'https://mzh.moegirl.org.cn/api.php', // api.php地址
  CM_API_PATH: 'https://commons.moegirl.org.cn/api.php',
  username: '', // wiki上的用户名
  password: '', // wiki上的密码

  // 飞书相关token
  feishu: {
    App_ID: '',
    App_Secret: '',
  },
};

// 自动更新用
import dotenv from 'dotenv';
dotenv.config();
config.API_PATH = process.env.API_PATH || config.API_PATH;

config.username = process.env.MW_USERNAME || config.username;
config.password = process.env.MW_PASSWORD || config.password;

config.feishu.App_ID = process.env.FEISHU_APP_ID || config.feishu.App_ID;
config.feishu.App_Secret = process.env.FEISHU_APP_SECRET || config.feishu.App_Secret;
export default config;