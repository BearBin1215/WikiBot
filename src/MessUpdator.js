/**
 * @todo 改良判定规则以减少误判，比如获取大家族模板列表以判定相关内容
 */
import MWBot from "mwbot";
import config from "../config/config.js";
import glb from "./utils/global.js";
import catReader from "./utils/catReader.js";

class MessOutput {
    /**
     * 创建MessOutput对象
     * @param {object} data 初始化列表
     */
    constructor(data) {
        this.data = data; // 用将导入的data初始化
    }

    /**
     * 遍历data广度优先搜索标题，并在对应的列表插入新页面名
     * @param {string} headline 标题
     * @param {string|string[]} page 要插入的页面名，或页面名和附加信息组成的数组
     * @returns 
     */
    addPageToList(headline, page) {
        const queue = [{ obj: this.data, path: [] }];
        while (queue.length > 0) {
            const { obj, path } = queue.shift();
            for (const [key, val] of Object.entries(obj)) {
                if (key === headline) {
                    if (Array.isArray(val)) {
                        val.push(page);
                        return;
                    }
                    console.error(`${headline}不是数组。`);
                    return;
                }
                if (typeof val === "object" && val !== null) {
                    queue.push({ obj: val, path: [...path, key] });
                }
            }
        }
        this.data[headline] = [page];
    }

    // 输出wikitext
    get wikitext() {
        let listLevel = 1;
        const textList = [
            "本页面由机器人自动更新，因此通常不建议直接编辑本页面。",
            "",
            "最后更新时间：<u>~~~~~</u>，约15分钟误差。",
            "",
            "大多数内容建议手动排查，以免误判。",
            "",
            "一些常见误判诸如在非页顶使用{{tl|dablink}}等情况。若出现其他误判，请[[User_talk:BearBin|联系阿熊]]。",
            "{{目录右置}}",
        ];
        /**
         * 递归函数
         * @param {object|string[]} obj this.data
         */
        const addListToTextList = (obj) => {
            listLevel++;
            for (const [headline, pages] of Object.entries(obj)) {
                // 标题
                textList.push("", `${"=".repeat(listLevel)} ${headline} ${"=".repeat(listLevel)}`);
                // 列表
                if (Array.isArray(pages)) {
                    if (pages.length > 0) {
                        textList.push(
                            "{{hide|1=点击展开列表|2=", // 折叠模板
                            ...pages.map((page) => {
                                if (typeof page === "string") {
                                    return `*[[${page}]]`; // 无附加内容
                                }
                                return `*[[${page[0]}]]：${page[1]}`; // 有附加内容
                            }),
                            "}}",
                        );
                    } else {
                        textList.push("暂无");
                    }
                } else if (typeof pages === "object" && pages !== null) {
                    addListToTextList(pages);
                } else {
                    throw new Error(`${headline}对应值类型有误: ${typeof pages}`);
                }
            }
            listLevel--;
        };
        addListToTextList(this.data);
        return textList.join("\n");
    }
}


// 初始化MessOuput
const messOutput = new MessOutput({
    消歧义页使用管道符: {
        后缀: [],
        前缀: [],
    },
    不礼貌排版习惯: {
        连续换行: [],
        "big地狱（5个以上）": [],
        疑似大家族前单独用二级标题: [],
        疑似喊话: [],
    },
    能用内链非要外链: [],
    不符合模板规范: {
        重复TOP: [],
        页顶用图超过99px: {
            条目: [],
            模板: [],
        },
        顶部模板排序: [],
        注释和外部链接后的大家族模板: [],
    },
    模板多余换行: {
        两个或以上: [],
        一个: [],
    },
    "“•”左右少空格": {
        左侧缺少: [],
        右侧缺少: [],
    },
});


// 模板及其别名
const Templates = {
    prefix: "\\{\\{(?:template:|[模样樣]板:|T:)?",

    // 导航条
    navbar: [
        "小[导導]航[条條]",
        "小[导導]航[条條]\\/承前[启啟][后後]",
    ],

    // 消歧义导航模板
    disambigTop: [
        "about",
        "not",
        "distinguish",
        "dablink",
        "redirectHere",
        "otheruseslist",
    ],

    // 欢迎编辑及TOP
    top: [
        "[欢歡]迎[编編][辑輯]",
        "不完整",
        "急需改[进進]",
        "[^{|\\[\\]]+top",
    ],

    // T:消歧义
    disambig: [
        "消歧[义義]",
    ],

    // 提示模板
    note: [
        "敏感[内內]容",
        "[现現][实實]人物",
        "R-15",
    ],

    // 警告模板
    warn: [
        "法律声明",
        "刑法",
        "医学声明",
        "学术提示",
        "非官方猜测",
        "易引发谣言",
        "用梗适度",
    ],

    // 其他提示模板
    otherNote: [
        "已故现实人物",
        "已完结",
        "长期关注及更新",
        "含时长期关注及更新",
    ],

    // 娱乐页顶模板
    amuse: [
        "阿卡林",
        "被巡回",
        "黑幕可能无法划开",
        "暂时保留",
        "一本正经地胡说八道",
        "坑",
    ],

    // 喊话模板
    quote: [
        "cquote",
        "先一起喊",
    ],

    // 底部模板，用来检测大家族模板位置错误或单独二级标题时排除特定模板
    bottom: [
        // 注释模板
        "reflist",
        "notelist",
        "NoteFoot",
        "notes",
        "cite",

        // 外部链接模板
        "到萌娘文[库庫]",
        "到[维維]基百科",
        "ToWikipedia",
        "到FANDOM",
        "到VNDB",
        "To BWIKI",
        "To 52poke Wiki",
        "To Megami Tensei Wiki",
        "到灰[机機]wiki",
        "到泰拉瑞[亚亞]Wiki",
        "到MC百科",
        "到魔禁维基",

        // 魔术字
        "PAGENAME",
        "DEFAULTSORT",

        // 常用
        "lj\\|",
        "color\\|",
        "ruby\\|",
        "hide\\|",
        "[剧劇]透",
        "黑幕",
        "胡话",
        "jk\\|",
        "main\\|",
        "ja\\}",
        "en\\}",
        "zh\\}",
        "lang\\|",
        "cquote",
        "Ps\\|",

        // 其他
        "catn",
        "ColonSort",
        "bilibiliVideo",
        "BV",
        "YoukuVideo",
        "music163",
        "背景[图圖]片",
        "替[换換][侧側][边邊][栏欄]底[图圖]",
        "外部[图圖]片注[释釋]",
        "Outer[ _]image",
        "pic\\|",
        "disambig",
        "消歧义页",
        "NoSubpage",
        "noReferer",
        "用梗适度",
        "一本正经地胡说八道",
        "color[ _]block",
    ],
};


// 页顶提示模板
let topTipTemplate;


/**
 * ------------------------------
 * 辅助函数，用于后续具体检查函数
 * ------------------------------
 */

/**
 * 查找正则表达式的匹配在字符串中的位置集
 * @param {string} str 要查找的字符串
 * @param {RegExp} reg 正则表达式
 * @returns {number[]} 匹配位置组成的集合
 */
const regexPosition = (str, reg) => {
    let match;
    const indexes = [];
    while ((match = reg.exec(str)) !== null) {
        indexes.push(match.index);
    }
    return indexes;
};


/**
 * 查找模板在文本中的位置
 * @param {string} text 页面源代码
 * @param  {...string} templates 模板及其别名
 * @returns {number[]} 模板位置集合
 * @example templateIndex("{{欢迎编辑|补充内容}}{{消歧义}}{{电子游戏TOP}}", ...Templates.top) => [0, 20];
 */
const templateIndex = (text, ...templates) => regexPosition(text, new RegExp(`${Templates.prefix}(${templates.join("|")})[}\\|\\n]`, "gi"));


/**
 * 检查多个数组是否前一个均小于后一个，用于检查顶部模板顺序
 * @param {Array<Array<number>>} arrays 数组列表
 * @returns {number} 位置有误的模板排序
 */
const checkOrder = (arrays) => {
    for (let i = 0; i < arrays.length - 1; i++) {
        const maxA = Math.max(...arrays[i].filter(num => num <= 600));
        for (let j = i + 1; j < arrays.length; j++) {
            const minB = Math.min(...arrays[j].filter(num => num <= 600));
            if (maxA >= minB) {
                return j;
            }
        }
    }
    return 0;
};



/**
 * ------------------------------
 * 具体检查函数（主名字空间）
 * ------------------------------
 */

/**
 * 检查消歧义页内中的管道符
 */
const pipeInDisambig = (text, categories, title) => {
    if (categories.includes("Category:消歧义页")) {
        const prefix = text.match(/\[\[(.+)\(.+\)\|\1\]\].*—/);
        const suffix = text.match(/\[\[[^:\n].*:(.+)\|\1\]\].*—/);
        if (prefix) {
            messOutput.addPageToList("后缀", [title, `<code><nowiki>${prefix[0].replaceAll("—", "")}</nowiki></code>`]);
        } else if (suffix) {
            messOutput.addPageToList("前缀", [title, `<code><nowiki>${suffix[0].replaceAll("—", "")}</nowiki></code>`]);
        }
    }
};


/**
 * 在页面中查找重复出现的大量换行
 */
const wrapDetector = (text, categories, title) => {
    if (categories.some(category => category.includes("音乐作品"))) { return; } // 排除音乐条目
    if (/(<br *\/ *>\s*){4,}/i.test(text) || /(\n|<br *\/? *>){8}/i.test(text)) {
        messOutput.addPageToList("连续换行", title);
    }
};


/**
 * 检测连续出现的big
 */
const bigDetector = (text, _categories, title) => {
    if (/(<big>){5}/i.test(text)) {
        messOutput.addPageToList("big地狱（5个以上）", title);
    }
};


/**
 * 能用内链非要用外链
 */
const innerToOuter = (text, _categories, title) => {
    if ((new RegExp(`${Templates.prefix}(背景[图圖]片|替[换換][侧側][边邊][栏欄]底[图圖])[^}]+img\\.moegirl\\.org\\.cn`, "si")).test(text)) {
        messOutput.addPageToList("能用内链非要外链", title);
    }
};


/**
 * 检查大家族前疑似单独使用二级标题的页面
 * 
 * @todo 将判定方法改为发现疑似页面后判定模板是否为导航模板
 */
const headlineBeforeNav = (text, _categories, title) => {
    if (new RegExp(`== *(相关|更多|其他|其它)(条目|條目|内容)? *==\n*${Templates.prefix}((?!${Templates.bottom.join("|")}).)*\\}`, "gi").test(text)) {
        messOutput.addPageToList("疑似大家族前单独用二级标题", title);
    }
};


/**
 * 位于注释或外部链接之后的大家族模板
 */
const refBeforeNav = (text, _categories, title) => {
    if (new RegExp(`== *(脚注|[注註]解|注释|註釋|外部[链鏈]接|外部連結|外链|[参參]考).*==[\\s\\S]*\n${Templates.prefix}((?!${Templates.bottom.join("|")}).)*\\}`, "gi").test(text)) {
        messOutput.addPageToList("注释和外部链接后的大家族模板", title);
    }
};



/**
 * 检查疑似喊话内容
 */
const redBoldText = (text, _categories, title) => {
    if (
        /\{\{color\|red\|'''[^}|]{50,}'''\}\}/i.test(text) ||
        /'''\{\{color\|red\|[^}|]{50,}\}\}'''/i.test(text)
    ) {
        messOutput.addPageToList("疑似喊话", title);
    }
};


/**
 * 检查重复TOP
 */
const repetitiveTop = (text, _categories, title) => {
    const topPattern = new RegExp(`${Templates.prefix}(${Templates.top.join("|")})[}\\|\\n]`, "gi");
    const useTemplates = text.match(topPattern) || [];
    let usedTops = 0;
    for (const item of useTemplates) {
        // 部分名字以top结尾的模板可能并不是页顶，需要排除
        if (topTipTemplate.includes(item.replace(topPattern, "$1"))) {
            usedTops++;
        }
    }
    if (usedTops > 1) {
        messOutput.addPageToList("重复TOP", title);
    }
};


/**
 * 检查用图超过99px的页顶模板
 */
const imgLT99px = (text, _categories, title) => {
    if (
        /leftimage *=.*\d{3}px/.test(text) ||
        /\{\{(?:template:|[模样樣]板:|T:)?(欢迎编辑|歡迎編輯|不完整|customtop).*\d{3}px/i.test(text)
    ) {
        messOutput.addPageToList("条目", title);
    }
};


/**
 * 检查页顶模板排序
 */
const templateOrder = (text, _categories, title) => {
    const templateIndexes = {
        消歧义导航模板: templateIndex(text, ...Templates.disambigTop), // 消歧义导航模板
        专题导航导航: templateIndex(text, "导航"), // 专题导航
        导航条: templateIndex(text, ...Templates.navbar), // 导航条
        "{{tl|消歧义}}": templateIndex(text, ...Templates.disambig), // 消歧义
        欢迎编辑或专题TOP: templateIndex(text, ...Templates.top), // 欢迎编辑、各类TOP
        提示模板: templateIndex(text, ...Templates.note), // 提示模板
        娱乐模板: templateIndex(text, ...Templates.amuse), // 娱乐模板
        喊话模板: templateIndex(text, ...Templates.quote), // 喊话模板
    };
    const wrongTemplate = checkOrder(Object.values(templateIndexes));
    if (wrongTemplate > 0) {
        messOutput.addPageToList("顶部模板排序", [title, `<code>${Object.keys(templateIndexes)[wrongTemplate]}</code>`]);
    }
};


/**
 * ------------------------------
 * 具体检查函数（模板名字空间）
 * ------------------------------
 */

/**
 * 检查用图超过99px的页顶模板
 */
const imgLT99pxInTemplate = (text, categories, title) => {
    if (categories.includes("Category:页顶提示模板") && (
        /leftimage *=.*\d{3}px/.test(text) ||
        /(width|size) *= *\d{3}px/.test(text) ||
        /\[\[(File|Image):[^\]]+\| *\d{3}px/i.test(text)
    )) {
        messOutput.addPageToList("模板", title);
    }
};


/**
 * 检查模板中的多余换行
 */
const redundantWrapInTemplate = (text, categories, title) => {
    if (categories.some(category => ["Category:模板文档", "Category:条目格式模板", "Category:权限申请模板"].includes(category))) {
        return;
    }
    if (/(\n{2}<noinclude>|<\/noinclude>\n{2}|<includeonly>\n{2}|\n{2}<\/includeonly>)/.test(text)) {
        messOutput.addPageToList("两个或以上", title);
    } else if (/(\n<noinclude>|<\/noinclude>\n|<includeonly>\n|\n<\/includeonly>)/.test(text)) {
        messOutput.addPageToList("一个", title);
    }
};

/**
 * •左右缺少空格
 */
const needSpaceBesidesPoint = (text, _categories, title) => {
    const left = text.match(/([^\]\n]+\]\]|[^}\n]+\}\})•/);
    const right = text.match(/•(\[\[[^\]\n]+|\{\{[^}\n]+)/);
    if (left) {
        messOutput.addPageToList("左侧缺少", [title, `<code><nowiki>${left[0]}</nowiki></code>`]);
    }
    if (right) {
        messOutput.addPageToList("右侧缺少", [title, `<code><nowiki>${right[0]}</nowiki></code>`]);
    }
};


// MWBot实例
const bot = new MWBot({
    apiUrl: config.API_PATH,
}, {
    timeout: 60000,
});

Object.assign(bot, catReader);


/**
 * 遍历所有页面
 * @param {function[]} functions 执行检查的函数集，这些函数都接受text、categories、title三个参数
 * @param {number} [namespace=0] 要遍历的名字空间
 * @param {number} [maxRetry=10] 最大重试次数
 * @param {number} [limit = 500] 单词请求最大页面数
 */
const traverseAllPages = async (functions, namespace = 0, maxRetry = 10, limit = 500) => {
    let count = 0;
    let pages = {};
    let reported = false; // 标记是否已报错，用于控制台输出显示

    /**
     * 分析pages
     * @param {string[]} pageList 页面列表
     */
    const processPage = (pageList) => {
        for (const { title, revisions, categories } of pageList) {
            pages[title] ||= {}; // 初始化pages中每个页面的对象
            pages[title].categories ||= []; // 初始化其中的categories
            // 将此轮循环得到的页面源代码和分类存入pages
            pages[title].text = revisions?.[0]?.["*"]?.replace(/<!--[\s\S]*?-->/g, "") || ""; // 去除注释，以及如果获取到空的revisions就先赋值为空字符串
            if (revisions?.length > 0) {
                count++;
            }
            if (categories) {
                pages[title].categories.push(...categories.map((item) => item.title));
            }
        }
    };

    // 初始化请求参数
    const params = {
        action: "query",
        generator: "allpages",
        gaplimit: limit, // 本来设置为max，但总是aborted，还是控制一下吧
        cllimit: "max",
        gapnamespace: namespace,
        prop: "revisions|categories",
        rvprop: "content",
    };

    // 报错及参数调整以供下次请求
    const resolveError = async (error, retryCount) => {
        if (!reported) {
            console.log("");
            reported = true;
        }
        console.error(`请求出错：${error}，请求参数：${JSON.stringify(params)}，即将重试(${retryCount}/${maxRetry})`);
        params.gaplimit = Math.ceil(params.gaplimit / 2); // 减少页面数
        await glb.sleep(3000);
    };

    // 父循环
    do {
        pages = {}; // 每次父循环获取一次完整的max个页面信息，所以按照父循环为单位处理

        let res;
        let retryCount = 0; // 设置重试，以免出错一次就要从头再来
        while (retryCount < maxRetry) {
            try {
                res = await bot.request(params); // 发送请求
                break;
            } catch (error) {
                await resolveError(error, ++retryCount);
            }
        }
        reported = false;
        params.gaplimit = Math.min(params.gaplimit * 2, limit); // 请求成功后逐渐恢复原有数量

        processPage(Object.values(res.query.pages));

        // 处理continue
        let { gapcontinue, rvcontinue, clcontinue } = res.continue || {};

        // 有rvcontinue或clcontinue则将其放入params，开始子循环
        while (rvcontinue || clcontinue) {
            if (rvcontinue) {
                params.rvcontinue = rvcontinue;
            }
            if (clcontinue) {
                params.clcontinue = clcontinue;
            }

            let subRes;
            retryCount = 0;
            while (retryCount < maxRetry) {
                try {
                    subRes = await bot.request(params);
                    break;
                } catch (error) {
                    await resolveError(error, ++retryCount);
                }
            }
            reported = false;
            params.gaplimit = Math.min(params.gaplimit * 2, limit); // 请求成功后逐渐恢复原有数量
            processPage(Object.values(subRes.query.pages));

            // 有gapcontinue则更新并退出子循环
            if (subRes.continue?.gapcontinue) {
                gapcontinue = subRes.continue.gapcontinue;
                Reflect.deleteProperty(params, "rvcontinue");
                Reflect.deleteProperty(params, "clcontinue");
                break;
            }

            let ctn = false;
            if (subRes.continue?.rvcontinue) {
                rvcontinue = subRes.continue.rvcontinue;
                ctn = true;
            }
            if (subRes.continue?.clcontinue) {
                clcontinue = subRes.continue.clcontinue;
                ctn = true;
            }
            if (!ctn) {
                break;
            }
        }

        // 都没有，则更新gapcontinue，继续父循环
        params.gapcontinue = gapcontinue;

        // 根据从参数导入的函数检查源代码
        for (const [title, { text, categories }] of Object.entries(pages)) {
            for (const func of functions) {
                func(text, categories, title);
            }
        }
        process.stdout.write("\r\x1b[K");
        process.stdout.write(`已遍历\x1B[4m${count}\x1B[0m个页面`);
    } while (params.gapcontinue !== undefined);
};


/**
 * 将wikitext提交至萌百
 */
const updatePage = async (maxRetry = 5) => {
    const title = "User:BearBin/杂物";
    let retryCount = 0;
    while (retryCount < maxRetry) {
        try {
            const editToken = await bot.getEditToken();
            await bot.request({
                action: "edit",
                title,
                summary: "自动更新列表",
                text: messOutput.wikitext,
                bot: true,
                tags: "Bot",
                token: editToken.csrftoken,
            });
            console.log(`成功保存到\x1B[4m${title}\x1B[0m。`);
            return;
        } catch (error) {
            console.error(`保存出错：${error}，即将重试(${++retryCount}/${maxRetry})`);
            await glb.sleep(3000);
        }
    }
    throw new Error(`保存到\x1B[4m${title}\x1B[0m失败。`);
};


/**
 * 主函数
 * @param {number} [retryCount=5] 最大重试次数
 */
const main = async (retryCount = 5) => {
    let retries = 0;
    while (retries < retryCount) {
        try {
            await bot.loginGetEditToken({
                username: config.username,
                password: config.password,
            });
            console.log("登录成功，开始获取所有页面信息……");

            topTipTemplate = (await bot.getMembersInCat("Category:页顶提示模板", 10)).map((item) => item.replace("Template:", ""))
                .filter((item) => !["架空历史"].includes(item)); // 获取Category:页顶提示模板内的模板，排除架空历史TOP等
            console.log(`获取到${topTipTemplate.length}个页顶提示模板。`);

            // 检查主名字空间
            await traverseAllPages([
                pipeInDisambig, // 检查消歧义页模板
                wrapDetector, // 检查过量换行
                bigDetector, // 检查连续<big>
                repetitiveTop, // 检查重复TOP
                imgLT99px, // 检查图片超过99px的页顶模板
                redBoldText, // 检查疑似喊话内容
                headlineBeforeNav, // 检查大家族前的二级标题
                refBeforeNav, // 检查错误大家族模板位置
                templateOrder, // 检查页顶模板顺序
                innerToOuter, // 检查背景图片等模板中的图站外链
            ], 0, 30);
            console.log("\n主名字空间检查完毕。");

            // 检查模板
            await traverseAllPages([
                imgLT99pxInTemplate,
                redundantWrapInTemplate,
                needSpaceBesidesPoint,
            ], 10, 10);
            console.log("\n模板名字空间检查完毕。");

            await updatePage(); // 提交至萌百
            return;
        } catch (error) {
            console.error(`获取数据出错：${error}\n正在重试（${retries + 1}/${retryCount}）`);
            retries++;
        }
    }
    throw new Error(`运行失败：已连续尝试${retryCount}次。`);
};


// 执行
await main(5).catch((error) => {
    console.error(error);
});
