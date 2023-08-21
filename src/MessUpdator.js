/* eslint-disable no-unused-vars */
import MWBot from "mwbot";
import config from "../config/config.js";
import glb from "./utils/global.js";

// 最后要用于生成wikitext的数据
let MessOutput = {};

// 模板及其别名
const Templates = {
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
        "[^{|]+top",
        "[^{|]+曲[题題][头頭]",
    ],

    disambig: [
        "disambig",
        "消歧[义義][页頁]",
    ],

    // 提示模板
    note: [
        "敏感[内內]容",
        "[现現][实實]人物",
        "R-15",
    ],

    // 底部模板，用来检测大家族模板位置错误时排除特定模板
    bottom: [
        // 注释模板
        "reflist",
        "notelist",
        "NoteFoot",
        "notes",

        // 外部链接模板
        "到萌娘文库",
        "到[维維]基百科",
        "ToWikipedia",
        "到FANDOM",
        "到VNDB",
        "To BWIKI",
        "To 52poke Wiki",
        "到灰[机機]wiki",
        "ColonSort",

        // 魔术字
        "PAGENAME",
        "DEFAULTSORT",

        // 其他
        "catn",
        "bilibiliVideo",
        "BV",
        "背景[图圖]片",
        "替[换換][侧側][边邊][栏欄]底[图圖]",
    ],
};

// MWBot实例
const bot = new MWBot({
    apiUrl: config.API_PATH,
}, {
    timeout: 60000,
});


/**
 * 向MessOutput的指定项目的列表添加页面
 * @param {string} list 项目名
 * @param {string} page 页面名
 */
const addPageToList = (list, page) => {
    (MessOutput[list] ||= { list: [] }).list.push(page);
};


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
 * @example templateDetector("{{欢迎编辑|补充内容}}{{消歧义}}{{电子游戏TOP}}", ...Templates.top) => [0, 20];
 */
const templateDetector = (text, ...templates) => regexPosition(text, new RegExp(`\\{\\{(?:Template:|[模样樣]板:|T:)?(${templates.join("|")})[}\\|\\n]`, "gi"));


/**
 * 检查重复TOP
 * @param {string} text 页面源代码
 * @param {string[]} _categories 页面所属分类，留空
 * @param {*} title 标题
 */
const repetitiveTop = (text, _categories, title) => {
    const indexes = templateDetector(text, ...Templates.top);
    if (indexes.length > 1) {
        addPageToList("重复TOP", title);
    }
};


/**
 * 检查消歧义页内中的管道符，并将其加入MessOutput
 * @param {string} text 文本
 * @param {string} categories 分类
 * @param {string} title 标题
 */
const pipeInDisambig = (text, categories, title) => {
    if (
        categories.includes("Category:消歧义页") &&
        (
            /\[\[(.+)\(.+\)\|\1\]\].*—/.test(text) ||
            /\[\[.+:(.+)\|\1\]\].*—/.test(text)
        )
    ) {
        addPageToList("消歧义页使用管道符", title);
    }
};


/**
 * 在页面中查找重复出现的大量换行，并将其加入MessOutput
 * @param {string} text 页面源代码
 * @param {string[]} categories 页面所属分类，用于排除歌曲条目
 * @param {string} title 页面标题
 */
const wrapDetector = (text, categories, title) => {
    for (const category of categories) {
        if (category.indexOf("音乐作品") > -1) { return; } // 排除音乐条目
    }
    if (/(<br *\/ *>\s*){4,}/i.test(text) || /(\n|<br *\/? *>){8}/i.test(text)) {
        addPageToList("连续换行", title);
    }
};


/**
 * 检测连续出现的big
 * @param {string} text 页面源代码
 * @param {string[]} _categories 页面所属分类，留空
 * @param {string} title 页面标题
 */
const bigDetector = (text, _categories, title) => {
    if (/(<big>){5}/i.test(text)) {
        addPageToList("big地狱（5个以上）", title);
    }
};


/**
 * 遍历所有页面
 * 
 * @todo 稍作封装以便能够分别运行主和模板，通过functions参数提供的函数检查
 */
const traverseAllPages = async (functions, maxRetry = 10) => {
    let count = 0;
    let pages = {};

    /**
     * 分析pages
     * @param {string[]} pageList 页面列表
     */
    const processPage = (pageList) => {
        for (const { title, revisions, categories } of pageList) {
            pages[title] ||= {}; // 初始化pages中每个页面的对象
            pages[title].categories ||= []; // 初始化其中的categories
            // 将此轮循环得到的页面源代码和分类存入pages
            if (revisions?.length > 0) {
                pages[title].text = revisions[0]["*"];
                count++;
            } else if (revisions) {
                pages[title].text = (revisions[0] || { "*": "" })["*"];
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
        gaplimit: 300, // 本来设置为max，但总是aborted，还是控制一下吧
        cllimit: "max",
        gapnamespace: 0,
        prop: "revisions|categories",
        rvprop: "content",
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
                retryCount++;
                console.error(`请求出错：${error}，请求参数：${JSON.stringify(params)}，即将重试(${retryCount}/${maxRetry})`);
                await glb.sleep(3000);
            }
        }

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
                    retryCount++;
                    console.error(`请求出错：${error}，请求参数：${JSON.stringify(params)}，即将重试(${retryCount}/${maxRetry})`);
                    await glb.sleep(3000);
                }
            }
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

        for (const [title, { text, categories }] of Object.entries(pages)) {
            pipeInDisambig(text, categories, title); // 检查消歧义页模板
            wrapDetector(text, categories, title); // 检查过量换行
            bigDetector(text, categories, title); // 检查连续<big>
            repetitiveTop(text, categories, title); // 检查重复TOP
        }

        console.log(`已遍历${count}个页面`);
    } while (params.gapcontinue !== undefined);
};


/**
 * 根据MessOutput，生成wikitext并提交至萌百
 */
const updatePage = async () => {
    const title = "User:BearBin/Sandbox/自动化";

    // 生成文本
    const text = [
        "最后更新时间：~~~~~，约15分钟误差。",
        "",
        "大多数内容建议手动排查，以免误判。",
        "{{目录右置}}",
        ...Object.entries(MessOutput).flatMap(([headline, { list }]) => [
            "",
            `== ${headline} ==`,
            ...list.map((page) => `*[[${page}]]`),
        ]),
    ].join("\n");

    try {
        const editToken = await bot.getEditToken();
        await bot.request({
            action: "edit",
            title,
            summary: "test",
            text,
            bot: true,
            tags: "Bot",
            token: editToken.csrftoken,
        });
        console.log(`成功保存到\x1B[4m${title}\x1B[0m。`);
    } catch (error) {
        throw new Error(`保存到\x1B[4m${title}\x1B[0m失败：${error}`);
    }
};


/**
 * 主函数
 * @param {number} retryCount 最大重试次数
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
            MessOutput = {
                消歧义页使用管道符: {
                    list: [],
                },
                连续换行: {
                    list: [],
                },
                "big地狱（5个以上）": {
                    list: [],
                },
                重复TOP: {
                    list: [],
                },

            };
            await traverseAllPages();
            await updatePage();

            return;
        } catch (error) {
            console.error(`获取数据出错：${error}\n正在重试（${retries + 1}/${retryCount}）`);
            retries++;
        }
    }
    throw new Error(`运行失败：已连续尝试${retryCount}次。`);
};


// 执行
main(1).catch((error) => {
    console.error(error);
});