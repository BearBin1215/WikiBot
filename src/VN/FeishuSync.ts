import axios from 'axios';
import mw from '../mw';
import config from './config/config';
import getTenantAccessToken from './config/GetFeishuToken.js';

// 飞书表格相关信息
const TableInfo = {
  baseURL: 'https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/',
  spreadsheetToken: 'shtcnTQQ5n5HkdGwiiYEtE1FHZ9', // galgame条目统计表
  sheetId: '0rCQAp', // 日本作品
  range: '!A2:B', // 从第2行起，获取A、B列内容（原名、译名）
};

/**
 * 获取飞书表格内容
 * @returns 返回的飞书表格内容
 */
const getTableContent = async () => {
  // 获取TenantAccessToken
  const AccessToken = await getTenantAccessToken().catch((error) => {
    throw new Error(`获取TenantAccessToken失败：${error}`);
  });
  console.log('获取TenantAccessToken成功，开始获取表格内容。');

  // 获取表格内容
  const { data: { data: { valueRange: { values } } } } = await axios({
    method: 'GET',
    url: `${TableInfo.baseURL}${TableInfo.spreadsheetToken}/values/${TableInfo.sheetId}${TableInfo.range}`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AccessToken}`,
    },
  }).catch((error) => {
    throw new Error(`读取飞书统计表失败：${error}`);
  });
  console.log('读取飞书统计表成功。');

  return values;
};

/**
 * 用表格内容生成wikitext
 * @param values 读取的飞书表格内容
 * @returns wikitext
 */
const generateText = (values: string[][]): string => {
  // 处理获取到的内容，生成文本
  const pageList: string[] = [];
  for (let i = 0; i < values.length; i++) {
    if (!values[i][0]) {
      break;
    }
    if (i % 100 === 0) {
      pageList.push(`\n== ${i + 1}～${i + 100} ==`);
    }
    const ja = values[i][0].replaceAll('\n', '').trim();
    const pagename = values[i][1]?.replaceAll('\n', '').trim() || ja;
    pageList.push(`#{{lj|${ja}}}→[[${pagename}]]`);
  }
  return `{{info|本页面由机器人自动同步自飞书表格，因此不建议直接更改此表。<br/>源代码可见[https://github.com/BearBin1215/WikiBot/blob/main/src/VN/FeishuSync.js GitHub]。}}\n${pageList.join('\n')}`;
};

/**
 * 提交编辑
 * @param text wikitext
 */
const updatePage = async (text: string) => {
  const api = new mw.Api({
    url: config.API_PATH,
    username: config.username,
    password: config.password,
  });
  // 机器人登录并提交编辑
  try {
    await api.login();
    console.log('登录成功。准备保存至萌百。');
    const title = 'User:柏喙意志/Gal条目表';
    const { csrftoken } = await api.getToken();
    await api.post({
      action: 'edit',
      title,
      text,
      summary: '自动同步自飞书',
      bot: true,
      tags: 'Bot',
      token: csrftoken,
    }).then((res) => {
      console.log(`成功保存到\x1B[4m${title}\x1B[0m${res.edit.nochange === '' ? '，未发生变化' : ''}。`);
    });
  } catch (err) {
    throw new Error(`登录或保存失败：${err}`);
  }
};

/** 主函数 */
const mainWithRetry = async (retryCount = 5) => {
  let retries = 0;
  while (retries < retryCount) {
    try {
      const values = await getTableContent();
      const text = generateText(values);
      console.log(text);
      await updatePage(text);
      return;
    } catch (err) {
      console.log(`运行出错：${err}`);
      retries++;
    }
  }
  throw new Error(`运行失败：连续尝试 ${retryCount} 次仍然失败`);
};

mainWithRetry(1);
