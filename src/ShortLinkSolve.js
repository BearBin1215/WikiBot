import https from 'https';
import MWBot from 'mwbot';
import config from '../config/config.js';

const list = [
  '叶采章(崩坏系列)',
  '筱银',
];

const bot = new MWBot({
  apiUrl: config.API_PATH,
}, {
  timeout: 30000,
});

const resolveRedirect = (url) => new Promise((resolve, reject) => {
  https.get(url, (response) => {
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      resolve(response.headers.location);
    } else {
      resolve(false);
    }
  }).on('error', (error) => {
    reject(error);
  });
});


await bot.loginGetEditToken({
  username: config.username,
  password: config.password,
});
for (const item of list) {
  const res = await bot.read(item);
  let source = Object.values(res.query.pages)[0].revisions[0]['*'];
  const links = source.match(/https:\/\/b23\.tv\/\w+/g);
  for (const link of links) {
    const resolved = (await resolveRedirect(link))?.replace(/\?.+/g, '');
    if (resolved) {
      source = source.replace(link, resolved);
      bot.request({
        action: 'edit',
        title: item,
        summary: '批量处理b23.tv短链',
        text: source,
        bot: true,
        tags: 'Bot',
        token: bot.editToken,
      }).then(() => {
        console.log(`${item}编辑成功`);
      });
    } else {
      console.log(`${item}中的${link}无效`);
    }
  }
}