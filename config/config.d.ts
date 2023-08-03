declare module 'config' {
    interface Config {
        API_PATH: string;
        API_PATH_CM: string;
        username: string;
        password: string;
    }

    const config: Config;

    export default config;
}
