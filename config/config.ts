/**
 * 此文件存放api地址、用户名、密码等数据
 */

const config = {
  API_PATH: 'https://zh.moegirl.org.cn/api.php', // api.php地址
  CM_API_PATH: 'https://commons.moegirl.org.cn/api.php',
  username: '', // wiki上的用户名
  password: '', // wiki上的密码
  defaultCookie: '', // 默认cookie
};

// 自动更新用
import dotenv from 'dotenv';
dotenv.config();
export default {
  ...config,
  username: process.env.MW_USERNAME_BOT || config.username,
  password: process.env.MW_PASSWORD_BOT || config.password,
  defaultCookie: process.env.DEFAULT_COOKIE ?? '',
};
