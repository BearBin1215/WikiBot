/* eslint-disable no-unused-vars */
import MWBot from "mwbot";
import config from "../config/config.js";

// 最后要用于生成wikitext的数据
let MessOutput = {};

// 定义模板及其别名
const Templates = {
    disambigTop: [
        "about",
        "not",
        "distinguish",
        "dablink",
        "redirectHere",
        "otheruseslist",
    ],

    top: [
        "欢迎编辑",
        "歡迎編輯",
        "不完整",
        "[^{]+top",
        "[^{]+曲题头",
    ],

    disambig: [
        "disambig",
        "消歧义页",
        "消歧義頁",
    ],
};


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
 * 查找模板在文本中的位置
 * @param {string} text 页面源代码
 * @param  {...string} templates 模板及其别名
 * @returns {number} 模板位置
 */
const templateDetector = (text, ...templates) => text.search(new RegExp(`\\{\\{(?:Template:|[模样樣]板:|T:)?(${templates.join("|")})[}\\|\\n]`, "gi"));


const categoryDetector = (text, ...categories) => {

};

/**
 * 在消歧义页中查找管道符
 * @param {string} text 页面源代码
 * @returns {boolean} 有无不合理管道符
 */
const pipeDetector = (text) => /\[\[(.+)\(.+\)\|\1\]\].*—/.test(text) || /\[\[.+:(.+)\|\1\]\].*—/.test(text);


/**
 * 检查消歧义页内中的管道符，并将其加入MessOutput
 * @param {string} text 文本
 * @param {string} categories 分类
 * @param {string} title 标题
 */
const pipeInDisambig = (text, categories, title) => {
    if (categories.includes("Category:消歧义页") && pipeDetector(text)) {
        addPageToList("消歧义页使用管道符", title);
    }
};


/**
 * 在页面中查找重复出现的大量换行，并将其加入MessOutput
 * @param {string} text 页面源代码
 * @param {string[]} categories 页面所属分列，用于排除歌曲条目
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
 * @param {string[]} _categories 页面所属分列，留空
 * @param {string} title 页面标题
 */
const bigDetector = (text, _categories, title) => {
    if(/(<big>){5}/i.test(text)) {
        addPageToList("big地狱（5个以上）", title);
    }
};


/**
 * 遍历所有页面
 * 
 * @todo 稍作封装以便能够分别运行主和模板，通过functions参数提供的函数检查
 */
const traverseAllPages = async (functions) => {
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
        gaplimit: "max",
        cllimit: "max",
        gapnamespace: 0,
        prop: "revisions|categories",
        rvprop: "content",
        clprop: "title",
    };

    // 父循环
    do {
        pages = {}; // 每次父循环获取一次完整的max个页面信息，所以按照父循环为单位处理

        let res;
        let retryCount = 0; // 设置重试，以免出错一次就要从头再来
        while (retryCount < 5) {
            try {
                res = await bot.request(params); // 发送请求
                break;
            } catch (error) {
                retryCount++;
                console.error(`请求出错：${error}，正在重试(${retryCount}/5)`);
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
            while (retryCount < 5) {
                try {
                    subRes = await bot.request(params);
                    break;
                } catch (error) {
                    retryCount++;
                    console.error(`遍历页面时出错：${error}，正在重试(${retryCount}/5)`);
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
        }

        console.log(`已遍历${count}个页面`);
    } while (params.gapcontinue !== undefined);
};


// const traverseAllPages = async () => {
//     let count = 0;
//     let gapcontinue = "";

//     // 遍历模板名字空间内的页面

//     // 父循环
//     while (gapcontinue !== undefined) {
//         const pages = {}; // 以父循环为单位存放和分析
//         const params = {
//             action: "query",
//             generator: "allpages",
//             gaplimit: "max",
//             cllimit: "max",
//             gapcontinue,
//             gapnamespace: 10,
//             prop: "revisions|categories",
//             rvprop: "content",
//             clprop: "title",
//         };
//         try {
//             const res = await bot.request(params);
//             console.log(res.continue);

//             for (const page of Object.values(res.query.pages)) {
//                 pages[page.title] ||= {}; // 初始化pages中每个页面的对象
//                 // 将此轮循环得到的页面源代码和分类存入pages
//                 if (page.revisions) {
//                     pages[page.title].text = page.revisions[0]["*"];
//                     count++;
//                 }
//                 if (page.categories) {
//                     pages[page.title].categories ||= [];
//                     pages[page.title].categories.push(...page.categories.map((item) => item.title));
//                 }
//             }

//             gapcontinue = res.continue?.gapcontinue;
//             const clcontinue = res.continue?.clcontinue;
//             const rvcontinue = res.continue?.rvcontinue;

//             // continue中出现gapcontinue，代表这一批的rivisions和categories都已获取完毕，继续下一个父循环
//             if (gapcontinue !== undefined) {
//                 continue;
//             }

//             // continue中有rvcontinue或clcontinue，代表这一批未获取完毕，执行子循环
//             if (rvcontinue) {
//                 params.rvcontinue = rvcontinue;
//             }
//             if (clcontinue) {
//                 params.clcontinue = clcontinue;
//             }
//             while (params.clcontinue || params.rvcontinue) {
//                 const subRes = await bot.request(params);
//                 console.log(subRes.continue);
//                 for (const page of Object.values(subRes.query.pages)) {
//                     pages[page.title] ||= {};
//                     pages[page.title].categories ||= [];
//                     if (page.revisions) {
//                         pages[page.title].text = page.revisions[0]["*"];
//                         count++;
//                     }
//                     if (page.categories) {
//                         pages[page.title].categories ||= [];
//                         pages[page.title].categories.push(...page.categories.map((item) => item.title));
//                     }
//                 }

//                 // 返回的continue中有gapcontinue，代表子循环结束，退出进行下一个父循环
//                 if (subRes.continue?.gapcontinue) {
//                     gapcontinue = subRes.continue?.gapcontinue;
//                     break;
//                 }

//                 // continue中有rvcontinue或clcontinue，继续进行子循环
//                 if (subRes.continue?.rvcontinue) {
//                     params.rvcontinue = subRes.continue.rvcontinue;
//                 }
//                 if (subRes.continue?.clcontinue) {
//                     params.clcontinue = subRes.continue.clcontinue;
//                 }

//                 // continue中gapcontinue、rvcontinue、clcontinue都没有，代表整个循环都已结束，给gapcontinue赋值undefined后退出循环
//                 if (subRes.continue?.gapcontinue === undefined && subRes.continue?.clcontinue === undefined && subRes.continue?.rvcontinue === undefined) {
//                     gapcontinue = undefined;
//                     break;
//                 }
//             }

//             // 一轮父循环结束，对这轮父循环获得的页面进行分析
//             for (const [title, { text, categories }] of Object.entries(pages)) {
//                 if (text.indexOf("123456") > -1) {
//                     addPageToList("123456", title);
//                 }
//             }
//             console.log(count); // 进度

//         } catch (error) {
//             console.error(`遍历所有页面出错：${error}`);
//         }
//     }
// };


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