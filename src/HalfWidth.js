'use strict';
import MWBot from 'mwbot';
import config from '../config/config.js';

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
  const pageList = [];
  let apcontinue = '';
  while (apcontinue !== false) {
    console.log(pageList.length, pageList[pageList.length - 1]);
    try {
      const allPages = await bot.request({
        action: 'query',
        list: 'allpages',
        aplimit: 'max',
        apcontinue,
      });
      apcontinue = allPages.continue?.apcontinue || false;
      pageList.concat(allPages.query.allpages.map(({ title }) => title));
    } catch (error) {
      throw new Error(`获取全站主名字空间页面列表出错：${error}`);
    }
  }
  return pageList;
};

const getWhiteList = async () => {
  try {
    const pageSource = await bot.read('User:BearBin/可能需要改为全角标点标题的页面/排除页面');
    const list = Object.values(pageSource.query.pages)[0].revisions[0]['*']
      .replaceAll('{{用户 允许他人编辑}}', '')
      .replaceAll(/\* *\[\[(.+)\]\]/g, '$1')
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item);
    return list;
  } catch (error) {
    throw new Error(`获取白名单失败：${error}`);
  }
};

const submitResult = async (pageList, whiteList) => {
  const PAGENAME = 'User:BearBin/可能需要改为全角标点标题的页面';
  const badList = [];
  for (const page of pageList) {
    if (
      /[\u4e00-\u9fa5\u3040-\u30ff][!?,]/.test(page) &&
      !page.includes('BanG Dream!') &&
      !whiteList.includes(page)
    ) {
      badList.push(page);
    }
  }

  const text = `{{info|列表中部分属于“原文如此”，请注意判别。如有此类页面，欢迎前往[[/排除页面]]添加。}}-{\n* [[${badList.join(']]\n* [[')}]]\n}-`;

  try {
    await bot.request({
      action: 'edit',
      title: PAGENAME,
      text,
      summary: '自动更新列表',
      bot: true,
      tags: 'Bot',
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
      console.log('登录成功。正在获取所有页面……');

      const pageList = await getAllPages();
      console.log(`获取到${pageList.length}个页面。`);

      const whiteList = await getWhiteList();
      console.log(`从白名单中获取到${whiteList.length}个页面。`);

      await submitResult(pageList, whiteList);
      return;
    } catch (error) {
      console.error(`获取数据出错，正在重试（${retries + 1}/${retryCount}）：${error}`);
      retries++;
    }
  }
  throw new Error(`运行失败：已连续尝试${retryCount}次。`);
};

main(5);