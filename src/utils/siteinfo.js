/**
 * 获取一些站点信息并保存在config/siteinfo内
 */
import MWBot from 'mwbot';
import fs from 'fs';
import config from '../../config/config.js';

export const NSinfo = {
    filePath: 'config/siteinfo/namespace.json',

    /**
     * 获取站点命名空间信息
     * 
     * @param {boolean} save 是否将信息保存到/config/siteinfo/namespace.json，默认为true
     */
    getFromServer: async function (save = true) {
        // 创建实例
        const bot = new MWBot({
            apiUrl: config.API_PATH,
        }, {
            timeout: 30000,
        });

        // 获取相关内容并输出
        return await bot.request({
            action: 'query',
            meta: 'siteinfo',
            siprop: 'namespaces|namespacealiases',
        }).then((res) => {
            const NSinfo = {};
            // 先遍历namespace初始化NSinfo，使其每个键为名字空间编号、值为数组
            for (const key in res.query.namespaces) {
                if (key !== '0') {
                    NSinfo[key] = [res.query.namespaces[key]['*']];
                }
            }

            // 遍历名字空间别名，将获取的别名一一放入NSinfo对应的键值对
            for (const item of res.query.namespacealiases) {
                NSinfo[item.id].push(item['*']);
            }

            // Project一般会被修改为站点名称，需要另外加入Project
            NSinfo[4].unshift('Project');
            NSinfo[5].unshift('Project talk');

            if (save) {
                fs.writeFile(this.filePath, JSON.stringify(NSinfo, '', '  '), 'utf8', (err) => {
                    if (err) {
                        console.error(`文件保存失败：${err}`);
                    } else {
                        console.log(`命名空间详情已保存到${this.filePath}。`);
                    }
                });
            }
            return NSinfo;
        }).catch((err) => {
            console.error(`获取命名空间详情失败：${err}`);
        });
    },

    /**
     * 从/config/siteinfo/namespace.json获取命名空间信息并解析返回
     * 
     * @returns 返回的名字空间信息
     */
    getFromLocal: async function () {
        try {
            return JSON.parse(await fs.promises.readFile(this.filePath, 'utf-8'));
        } catch (err) {
            console.error(`获取存储的命名空间信息失败：${err}`);
            return null;
        }
    },
};

export default NSinfo;