# 阿熊的wiki机器人

本库保存[BearBin](https://zh.moegirl.org.cn/User:BearBin)的wiki脚本，基于[mwbot](https://github.com/gesinn-it-pub/mwbot)库搭建。

- [使用方式](#使用方式)
- [自动任务](#自动任务)

## 使用方式

1. 安装[node.js](https://nodejs.org)
2. 将本代码库克隆或下载到本地
3. 在本地文件目录下打开命令行，安装依赖
    ```bash
    npm i
    ```
4. 修改[config.js](./config/config.js)中的api地址、用户名和密码
5. 按需执行

## 自动任务

相关任务均通过[GitHub Actions](https://github.com/BearBin1215/WikiBot/actions)执行。

如无特殊说明，均为北京时间（UTC+8）。

1. 更新[疑似多余消歧义后缀列表](https://zh.moegirl.org.cn/_?curid=571484)
    - 每周一凌晨4:40执行，用时约2min
2. 更新[可能需要创建的消歧义页面](https://zh.moegirl.org.cn/_?curid=571693)
    - 每周二凌晨4:40执行，用时约2min
3. 从飞书在线文档同步至站内[日本Galgame条目表](https://zh.moegirl.org.cn/_?curid=544226)
    - 每周三、六凌晨4:40执行，用时约30s
4. 更新[链接到消歧义页面的导航模板](https://zh.moegirl.org.cn/_?curid=573554)
    - 每周四凌晨4:40执行，用时约5min
5. 更新[杂物间](https://zh.moegirl.org.cn/_?curid=555305)
    - 每周五凌晨4:40执行，用时约25min
6. 更新[视研会大家族](https://zh.moegirl.org.cn/_?curid=506405)用户组信息
    - 每天凌晨0:00左右执行，用时约20s
7. 统计[MassEdit小工具使用情况](https://zh.moegirl.org.cn/_?curid=574660)
    - 每天凌晨0:00左右执行，用时约30s