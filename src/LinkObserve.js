import MWBot from 'mwbot';
import config from '../config/config.js';
import arraySlice from './utils/arraySlice.js';

const bot = new MWBot({
  apiUrl: config.API_PATH,
}, {
  timeout: 60000,
});

await bot.loginGetEditToken({
  username: config.username,
  password: config.password,
});
console.log('登录成功，开始获取页面信息……');

const getAllPages = async () => {
  const pageList = [];
  let apcontinue = '';
  while (apcontinue !== undefined) {
    try {
      const allPages = await bot.request({
        action: 'query',
        list: 'allpages',
        aplimit: 'max',
        apcontinue,
      });
      apcontinue = allPages.continue?.apcontinue;
      for (const { title } of allPages.query.allpages) {
        if (title.includes('明日方舟:')) {
          pageList.push(title);
        }
      }
    } catch (error) {
      throw new Error(`获取全站主名字空间页面列表出错：${error}`);
    }
  }
  return pageList;
};

const getLinks = async (pageList) => {
  const data = {};
  for (const arr of arraySlice(pageList, 500)) {
    try {
      let lhcontinue = '';
      while (lhcontinue !== undefined) {
        const cfg = lhcontinue ? {
          action: 'query',
          prop: 'linkshere',
          titles: arr.join('|'),
          lhnamespace: '0|10',
          lhlimit: 'max',
          lhcontinue,
        } : {
          action: 'query',
          prop: 'linkshere',
          titles: arr.join('|'),
          lhnamespace: '0|10',
          lhlimit: 'max',
        };
        const res = await bot.request(cfg);
        lhcontinue = res.continue?.lhcontinue;
        for (const pageId in res.query.pages) {
          const { title, linkshere } = res.query.pages[pageId];
          if (linkshere) {
            data[title] ||= [];
            data[title].push(...linkshere.map((item) => item.title));
          }
        }
      }
    } catch { /* */ }
  }
  return data;
};

const pageList = await getAllPages();
const data = await getLinks(pageList);
bot.request({
  action: 'edit',
  title: 'User:BearBin/Sandbox',
  text: Object.entries(data).map(([key, value]) => `;[[${key}]]\n:[[${value.join(']]\n:[[')}]]`).join('\n'),
  bot: true,
  tags: 'Bot',
  token: bot.editToken,
});