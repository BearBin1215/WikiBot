import axios, {
  type CreateAxiosDefaults,
  type AxiosInstance,
  type AxiosRequestConfig,
} from 'axios';
import { Cookie, CookieJar } from 'tough-cookie';
import queryString from 'query-string';
import envConfig from '../../config/config';
import packageJson from '../../package.json';

type ApiParams = Record<string, string | number | boolean | string[] | number[] | undefined>;

interface LoginParams {
  username: string;
  password: string;
}

class Api {
  /** api地址 */
  url = 'https://zh.moegirl.org.cn/api.php';

  /** axios实例，用于请求 */
  axiosInstance: AxiosInstance;

  /** 记录登录状态 */
  loggedIn = false;

  /** 默认请求参数 */
  defaultParams = {
    action: 'query',
    format: 'json',
    utf8: true,
  };

  cookieJar = new CookieJar();

  constructor(config: CreateAxiosDefaults & { jar?: CookieJar }) {
    this.url = config.url ?? this.url;
    this.axiosInstance = axios.create({
      url: this.url,
      withCredentials: true,
      timeout: 60000,
      ...config,
      headers: {
        'User-Agent': `mwapi-node/${packageJson.version} axios/${axios.VERSION}`,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        ...config.headers,
      },
    });
    if (config.jar) {
      this.cookieJar = config.jar;
    } else {
      const parsedCookies = envConfig.defaultCookie.split(';').map((cookie) => Cookie.parse(cookie));
      parsedCookies.forEach((cookie) => {
        if (cookie) {
          this.cookieJar.setCookie(cookie, this.url);
        }
      });
    }
  }

  static get = axios.get;
  static post = axios.post;

  /** 将请求参数加上默认参数，并将数组参数转换为竖线分隔格式 */
  formatRequestJSON(data: Record<string, any> = {}) {
    const defaultParams = { ...this.defaultParams };
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        defaultParams[key] = value.join('|');
      } else {
        defaultParams[key] = value;
      }
    }
    return defaultParams;
  }

  async get(query?: ApiParams, config: AxiosRequestConfig = {}) {
    // 加入缺省参数
    const searchParams = this.formatRequestJSON(query);
    const search = queryString.stringify(searchParams);
    const response = await this.axiosInstance.get(search ? `${this.url}?${search}` : this.url, {
      ...config,
      headers: {
        Cookie: this.cookieJar.getCookieStringSync(this.url),
      }
    });
    console.log(response);
    return response.data;
  }

  async post(data: ApiParams, config?: AxiosRequestConfig) {
    // 加入缺省参数
    const form: ApiParams = this.formatRequestJSON(data);
    const response = await this.axiosInstance.post(this.url, form, {
      ...config,
      headers: {
        Cookie: this.cookieJar.getCookieStringSync(this.url),
      }
    });
    const setCookie = response.headers['set-cookie'];
    if (setCookie?.length) {
      setCookie.forEach((cookie) => {
        this.cookieJar.setCookie(cookie, this.url);
      });
    }
    return response.data;
  }

  async login(loginParams: LoginParams) {
    const res = await this.post({
      action: 'login',
      lgname: loginParams.username,
      lgpassword: loginParams.password,
    });
    if (res.login?.token && res.login.result === 'NeedToken') {
      const tokenLogin = await this.post({
        action: 'login',
        lgname: loginParams.username,
        lgpassword: loginParams.password,
        lgtoken: res.login.token,
      });
      if (tokenLogin.login?.result === 'Success') {
        this.loggedIn = true;
      } else {
        throw new Error(`${tokenLogin.login?.result}：${tokenLogin.login?.reason}`);
      }
    } else {
      console.error(res);
      throw new Error('登录失败：未返回登录token');
    }
  }

  /** 获取令牌，默认csrf */
  async getToken(types: string | string[] = 'csrf') {
    const type = typeof types === 'string' ? types : types.join('|');
    const res = await this.post({
      action: 'query',
      meta: 'tokens',
      type,
    });
    return res.query.tokens;
  }
}

const mw = { Api }

export default mw;
