import newbot from '../utils/newbot.js';
import { sleep } from '../utils/global.js';
import moment from 'moment';

const bot = await newbot();
console.log('登录成功');
const title = 'User:BearBin/Sandbox';
const template = 'Template:萌百视觉小说研究会';
const timeLength = 30;
const ucnamespace = '0|10|14|828';

const ucstart = moment().unix();
const ucend = moment().subtract(timeLength, 'days').unix();

/**
 * 源代码获取用户列表
 * @param {string} source 源代码
 */
const getUserList = (source) => {
  const list = source
    .replace(/.*<!-- *列表起点 *-->(.*)<!-- *列表终点 *-->.*/gs, '$1') // 识别列表起点终点
    .replace(/<!--[\s\S]*?-->/g, '') // 去除注释
    .replace(/\* */g, '') // 去除无序列表头
    .trim()
    .split('\n') // 分割为数组
    .map((str) => {
      const match = str.trim().match(/^([^<(]*)(\(([^)]*)\))?(<.*>)?$/); // 解析昵称和下标
      return match[1];
    });
  return list;
};

/**
 * 获取用户指定时间内的编辑量
 * @returns 
 */
const getEditCount = async (ucuser, maxRetry = 5) => {
  let retryCount = 0;
  while (retryCount < maxRetry) {
    try {
      const { query: { usercontribs } } = await bot.request({
        action: 'query',
        list: 'usercontribs',
        uclimit: 'max',
        ucprop: '',
        ucstart,
        ucend,
        ucnamespace,
        ucuser,
      });
      return usercontribs.length;
    } catch (error) {
      console.error(`获取用户编辑数出错：${error}，即将重试(${++retryCount}/${maxRetry})`);
      await sleep(3000);
    }
  }
};

const main = async () => {
  const source = Object.values((await bot.read(template)).query.pages)[0].revisions[0]['*'];
  const userList = getUserList(source);
  const editCountData = [];
  for (const user of userList) {
    const editCount = await getEditCount(user);
    console.log(`${user}: ${editCount}`);
    editCountData.push({
      user,
      editCount,
    });
    await sleep(4000);
  }
  const editToken = await bot.getEditToken();
  const text = '{| class="wikitable sortable"\n' +
    '! 用户名 !! 7日编辑数\n' +
    '|-\n' +
    '|\n' +
    editCountData.map(({ user, editCount }) => `| [[User:${user}|${user}]] || ${editCount}`).join('\n|-\n') +
    '\n|}';
  await bot.request({
    action: 'edit',
    title,
    summary: '自动更新列表',
    text,
    bot: true,
    tags: 'Bot',
    token: editToken.csrftoken,
  });
};

main();
