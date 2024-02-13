/**
 * 本模块内容用于提供获取分类相关函数
 * 
 * 使用本模块导入后，并入现有mwbot实例：
 * 
 * ```javascript
 * import MWBot from "mwbot";
 * const bot = new MWBot();
 * Object.assign(bot, catReader);
 * ```
 */
import { sleep } from './global.js';

const catReader = {
  /**
     * 递归获取分类成员
     * @param {string} category 分类名
     * @param {number} [nsnumber=0] 要获取的名字空间
     * @returns 
     */
  getMembersInCat: async function (category, nsnumber = 0) {
    this.traversedCategoryList = [];
    const pageList = await this.traverseCategory(category, nsnumber);
    return pageList;
  },


  /**
     * 递归获取分类下所有页面
     * @param {string} title 分类名
     * @param {string|number} cmnamespace 要获取的名字空间，默认全部
     * @returns 
     */
  traverseCategory: async function (category, nsnumber) {
    const pageList = [];
    let gcmcontinue = '';
    while (gcmcontinue !== undefined) {
      const response = await this.request({
        action: 'query',
        generator: 'categorymembers',
        gcmtitle: category,
        gcmtype: 'page|subcat',
        gcmlimit: 'max',
        gcmcontinue,
      });
      gcmcontinue = response.continue?.gcmcontinue;
      for (const { ns, title } of Object.values(response.query.pages)) {
        if (ns === nsnumber) {
          pageList.push(title);
        } else if (ns === 14 && !this.traversedCategoryList.includes(title)) {
          this.traversedCategoryList.push(title); // 避免套娃
          pageList.push(...await this.traverseCategory(title, nsnumber));
        }
      }
      await sleep(5000);
      console.log(`\x1B[4m${category}\x1B[0m下查找到\x1B[4m${pageList.length}\x1B[0m个页面`);
    }
    return [...new Set(pageList)];
  },
};

export default catReader;
