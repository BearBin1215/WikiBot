import MWBot from 'mwbot';
import config from './config/config.js';

/**
 * @typedef {{username: string, nickname: string, subscript: string}} userinfo 用户信息
 */

const bot = new MWBot({
  apiUrl: config.API_PATH,
}, {
  timeout: 60000,
});

const template = 'Template:萌百视觉小说研究会';

const login = async () => {
  try {
    await bot.loginGetEditToken({
      username: config.username,
      password: config.password,
    });
  } catch (error) {
    throw new Error(`登录失败：${error}`);
  }
};

/**
 * 分析源代码，输出用户信息
 * @param {string} source 源代码
 * @returns {userinfo[]}
 */
const parseTemplateSource = (source) => {
  const list = source
    .replace(/.*<!-- *列表起点 *-->(.*)<!-- *列表终点 *-->.*/gs, '$1') // 识别列表起点终点
    .replace(/<!--[\s\S]*?-->/g, '') // 去除注释
    .replace(/\* */g, '') // 去除无序列表头
    .trim()
    .split('\n') // 分割为数组
    .map((str) => {
      const match = str.trim().match(/^([^<(]*)(\(([^)]*)\))?(<.*>)?$/); // 解析昵称和下标
      return {
        username: match[1],
        nickname: match[3],
        subscript: match[4],
      };
    });
  return list;
};

/**
 * 获取用户组信息
 * @param {string[]} userList 用户列表
 * @returns {{[key: string]: string[]}}
 */
const getUserGroups = async (userList) => {
  const { query: { users } } = await bot.request({
    action: 'query',
    list: 'users',
    ususers: userList.join('|'),
    usprop: 'groups',
  });
  return users.reduce((pre, { name, groups }) => {
    pre[name] = groups;
    return pre;
  }, {});
};

/**
 * 将列表转为模板需要的字符串
 * @param {userinfo[]} list
 */
const userListToString = (list) => {
  return list
    .map(({ username, nickname, subscript }) => `{{User|${username}${nickname ? `|${nickname}` : ''}}}${subscript || ''}`)
    .join(' • <!--\n    -->');
};

/**
 * 提交编辑
 */
const submit = async (text) => {
  await bot.request({
    action: 'edit',
    title: template,
    summary: '自动更新用户组信息',
    text,
    bot: true,
    tags: 'Bot',
    token: bot.editToken,
  });
};

const main = async () => {
  await login();
  console.log('登陆成功');
  /**
   * @type {string}
   */
  const source = Object.values((await bot.read(template)).query.pages)[0].revisions[0]['*'];
  console.log('获取大家族源代码成功');
  const userInfo = parseTemplateSource(source);
  const userGroups = await getUserGroups(userInfo.map(({ username }) => username));
  console.log('获取用户组信息成功');
  /**
   * @type {{maintainer: userinfo[], autopatrolled: userinfo[], autoconfirmed: userinfo[]}}
   */
  const groups = {
    maintainer: [], // 维护组
    autopatrolled: [], // 巡查豁免
    autoconfirmed: [], // 自确
  };
  for (const user of userInfo) {
    const userGroup = userGroups[(user.username.charAt(0).toUpperCase() + user.username.slice(1)).replace('_', ' ')];
    if (userGroup.some((group) => ['sysop', 'patroller'].includes(group))) {
      groups.maintainer.push(user);
    } else if (userGroup.some((group) => ['goodeditor', 'honoredmaintainer'].includes(group))) {
      groups.autopatrolled.push(user);
    } else {
      groups.autoconfirmed.push(user);
    }
  }
  const output = source
    .replace(/(<!-- *维护人员 *-->).*(<!-- *维护人员 *-->)/gs, `$1${userListToString(groups.maintainer)}$2`)
    .replace(/(<!-- *优编荣维 *-->).*(<!-- *优编荣维 *-->)/gs, `$1${userListToString(groups.autopatrolled)}$2`)
    .replace(/(<!-- *自确 *-->).*(<!-- *自确 *-->)/gs, `$1${userListToString(groups.autoconfirmed)}$2`);
  if (output === source) {
    console.log('用户组信息无变化');
  } else {
    await submit(output);
    console.log('保存成功');
  }
};

main();