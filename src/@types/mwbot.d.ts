import request from "request";
import semver from "semver";
import Promise from "bluebird";

declare module "mwbot" {
  interface Options {
    /** api地址 */
    apiUrl?: string;
    /** 用户名 */
    username?: string;
    /** 密码 */
    password?: string;

    [key: string]: any;
  }

  type RequestParams = Record<string, string | number | boolean | undefined>;

  declare class MWBot {
    // #region properties
    /** 实例状态 */
    state: Record<string, any>;

    /** 计数器 */
    counter: {
      total: number;
      resolved: number;
      fulfilled: number;
      rejected: number;
    }

    /** 默认请求参数 */
    defaultOptions: {
      verbose: false;
      silent: false;
      defaultSummary: "MWBot";
      concurrency: 1;
      apiUrl: false;
      sparqlEndpoint: "https://query.wikidata.org/bigdata/namespace/wdq/sparql";
    };

    /** 自定义请求参数 */
    customOptions: Options;

    /** 请求参数 */
    options: Options;

    /** 默认请求参数 */
    defaultRequestOptions: {
      method: "POST";
      headers: {
        "User-Agent": string;
      };
      qs: {
        format: "json";
      };
      form: {};
      timeout: 120000;
      jar: request.CookieJar;
      time: true;
      json: true;
    }

    /** 自定义请求参数 */
    customRequestOptions: request.CoreOptions;

    /** 全局请求参数 */
    globalRequestOptions: request.CoreOptions;

    /** 是否登录 */
    loggedIn: boolean;

    /** 创建账号令牌 */
    createaccountToken: string | false;

    /** 编辑令牌 */
    editToken: string | false;

    /** MediaWiki版本 */
    mwversion: semver.SemVer | null;

    // #endregion properties

    // #region methods
    /**
     * 创建mwbot实例
     * @param customOptions 自定义对象参数
     * @param customRequestOptions 请求参数
     */
    constructor(customOptions: Options, customRequestOptions: request.CoreOptions);

    /** 获取库版本 */
    get version(): string;

    /**
     * 创建页面
     * @param title 页面标题
     * @param content 页面内容
     * @param summary 编辑摘要
     * @param customRequestOptions
     */
    create(title: string, content: string, summary?: string, customRequestOptions?: Options): Promise<any>;

    /** 创建并保护页面 */
    createProtect: typeof this.create;

    /**
     * 删除页面
     * @param title 页面标题
     * @param reason 删除摘要
     * @param customRequestOptions
     */
    delete(
      title: string,
      reason?: string,
      customRequestOptions?: Option,
    ): Promise<any>;

    /** 编辑页面 */
    edit: typeof this.create;

    /** 编辑并保护页面 */
    editProtect: typeof this.create;

    /** 获取创建账号令牌 */
    getCreateaccountToken(): Promise<any>;

    /** 获取编辑令牌 */
    getEditToken(): Promise<any>;

    /** 读取站点基本信息 */
    getSiteinfo(): Promise<any>;

    /** 登录 */
    login(loginOptions: Options): Promise<any>;

    loginGetCreateaccountToken: typeof this.login;

    /** 登录并获取编辑令牌 */
    loginGetEditToken: typeof this.login;

    /**
     * 移动页面
     * @param oldTitle 原标题
     * @param newTitle 新标题
     * @param reason 移动摘要
     * @param customRequestOptions
     */
    move(
      oldTitle: string,
      newTitle: string,
      reason?: string,
      customRequestOptions: Options,
    ): Promise<any>;

    /**
     * 保护页面
     * @param title 页面标题
     * @param protections 保护参数，如`edit=sysop`
     * @param reason 保护摘要
     * @param customRequestOptions
     */
    protect(
      title: string,
      protections?: string,
      reason?: string,
      customRequestOptions: Options,
    ): Promise<any>;


    /**
     * 通过标题读取页面内容
     * @param title 页面标题
     * @param redirect 是否读取重定向
     * @param customRequestOptions
     */
    read(
      title: string,
      redirect?: boolean,
      customRequestOptions?: Option,
    ): Promise<any>;

    /**
     * 通过页面id读取页面内容
     * @param pageid 页面id
     * @param redirect 是否读取重定向
     * @param customRequestOptions
     */
    readFromID(
      pageid: number,
      redirect?: boolean,
      customRequestOptions?: Option,
    ): Promise<any>;

    /**
     * 通过标题读取页面信息
     * @param title 页面标题，PageA|PageB|PageC
     * @param props rvprop参数，user|userid|content
     * @param redirect 是否读取重定向
     * @param customRequestOptions
     */
    readWithProps(
      title: string,
      props: string,
      redirect?: boolean,
      customRequestOptions?: Option,
    ): Promise<any>;

    /**
     *
     * @param pageid 页面id
     * @param props rvprop参数，user|userid|content
     * @param redirect 是否读取重定向
     * @param customRequestOptions
     */
    readWithPropsFromID(
      pageid: number,
      props: string,
      redirect?: boolean,
      customRequestOptions?: Option,
    ): Promise<any>;

    /** 设置实例的api请求地址 */
    setApiUrl(apiUrl: string): void;

    setGlobalRequestOptions(customRequestOptions: request.CoreOptions): void;

    setOptions(customOptions: Options): void;

    rawRequest(requestOptions: request.CoreOptions): Promise<any>;

    request(params: RequestParams, customRequestOptions: request.CoreOptions): Promise<any>;

    /** 更新已存在的页面（nocreate） */
    update: typeof this.edit;

    /**
     * 通过id更新已存在的页面（nocreate）
     * @param pageid 页面id
     * @param content 页面内容
     * @param summary 编辑摘要
     * @param customRequestOptions
     */
    updateFromID(
      pageid: number,
      content: string,
      summary?: string,
      customRequestOptions?: Options,
    ): Promise<any>;

    /**
     * 上传文件
     * @param title 文件名
     * @param pathToFile 文件路径
     * @param comment 上传摘要
     * @param customParams
     * @param customRequestOptions
     */
    upload(
      title: string,
      pathToFile: string,
      comment?: string,
      customParams?: Options,
      customRequestOptions?: Options,
    ): Promise<any>;

    /** 上传并覆盖文件 */
    uploadOverwrite: typeof this.upload;

    batch(jobs, summary, concurrency, customRequestOptions): Promise<any>;

    askQuery(query, apiUrl, customRequestOptions): Promise<any>;

    sparqlQuery(query, endpointUrl, customRequestOptions): Promise<any>;

    static merge: typeof Object.assign;

    static logStatus(status, currentCounter, totalCounter, operation, pageName, reason): void;

    static Promise: typeof Promise;

    static map: typeof Promise.map;

    static mapSeries: typeof Promise.mapSeries;
    // #endregion methods
  }

  export default MWBot;
}