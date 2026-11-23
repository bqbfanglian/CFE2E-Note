# 密记

单人加密记事本。Cloudflare Workers 只提供门禁和密文同步，D1 保存单个带版本号的加密保险库。解密程序在设备的本地回环地址运行。

## Cloudflare 一键部署

**[在 Cloudflare 开始部署](https://dash.cloudflare.com/?to=/:account/workers-and-pages)**

源仓库是 [bqbfanglian/CFE2E-Note](https://github.com/bqbfanglian/CFE2E-Note)。推送源码后，在 **Create application → GitHub** 选择这个私有仓库。首次部署按[下方步骤](#cloudflare-控制台部署)绑定 D1，然后在 **Deploy command** 中填写 `npm run deploy`。点击部署后，Cloudflare 会先为 `DB` 执行迁移，成功后再发布 Worker。首次部署完成后，在 Worker 的 **Variables and Secrets** 中添加门禁密码 `APP_PASSWORD`。[Workers Builds 文档](https://developers.cloudflare.com/workers/ci-cd/builds/)

<details>
<summary>为公开的模板仓库添加官方部署按钮</summary>

Cloudflare 的模板按钮要求源码位于公开的 GitHub 或 GitLab 仓库。当前私有仓库使用上方的控制台入口。如果以后另建公开模板，把示例里的仓库地址换成模板地址。模板部署可以自动创建和绑定 D1，并通过 `.dev.vars.example` 提示填写门禁 Secret。部署命令使用 `npm run deploy` 初始化数据库。[官方部署按钮文档](https://developers.cloudflare.com/workers/platform/deploy-buttons/)

```md
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fbqbfanglian%2FCFE2E-Note)
```

</details>

## Cloudflare 控制台部署

在 Cloudflare 部署密文同步 API，在自己的设备运行解密客户端。以下服务端步骤使用 GitHub Desktop 和 Cloudflare 控制台。

### 1. 在控制台创建 D1

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)，打开 **D1 SQL Database**，点击 **Create database**。数据库名可用 `cfe2e-note`。已有密记数据时，打开原来的数据库。
2. 复制数据库详情中的 **Database ID**。部署命令会初始化 `vault` 表。若选择手动建表，进入 **Console**，粘贴下面的 SQL，点击 **Execute**。然后打开 **Tables**，确认有 `vault` 表。

   ```sql
   CREATE TABLE IF NOT EXISTS vault (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     revision INTEGER NOT NULL CHECK (revision >= 1),
     envelope TEXT NOT NULL
   );
   ```

   该命令可以重复执行，已有的 `vault` 表及其密文会保留。[D1 控制台指南](https://developers.cloudflare.com/d1/get-started/)

### 2. 配置仓库和 GitHub

1. 在文本编辑器打开项目根目录的 [wrangler.jsonc](wrangler.jsonc)。把 `database_id` 的全零值换成刚复制的 UUID，`database_name` 填实际的数据库名，绑定名用 `DB`。
2. 在 **GitHub Desktop → File → Add Local Repository** 打开项目目录并提交项目文件。若尚未关联远程仓库，在 **Repository → Repository settings → Remote** 将 **Primary remote repository** 设为上面的 GitHub 地址。推送到该仓库的生产分支。[GitHub Desktop 远程仓库指南](https://docs.github.com/en/desktop/working-with-your-remote-repository-on-github-or-github-enterprise/changing-the-remote-url-for-a-repository-in-github-desktop)

### 3. 在控制台部署 Worker

1. 打开 **Workers & Pages → Create application → GitHub**，选择上一步的仓库。已有 Worker 时，从该 Worker 的 **Settings → Builds → Connect** 连接仓库。已连接时确认生产分支正确。
2. Worker 名称与 `wrangler.jsonc` 的 `name` 一致。生产分支选上一步推送的分支。**Root directory** 保留仓库根目录，**Build command** 留空，**Deploy command** 填 `npm run deploy`，由 Cloudflare 执行。若构建令牌缺少 D1 权限，在 **Settings → Builds → API token** 选择对本账户有 **D1 Edit** 权限的令牌。
3. 点击 **Save and Deploy**。部署成功后，从 **Overview** 复制 Worker 的 HTTPS 根网址。直接访问根网址时返回 `404`，本地客户端会访问它的 API。[Workers Builds 指南](https://developers.cloudflare.com/workers/ci-cd/builds/)

### 4. 在控制台设置门禁密码

1. 在 Worker 的 **Settings → Variables and Secrets** 点 **Add**。
2. 类型选 **Secret**，名称写 `APP_PASSWORD`，值填独立随机密码，建议至少 32 个随机字符。点击 **Deploy**。加密主密码只在本地客户端输入。[Cloudflare Secret 设置指南](https://developers.cloudflare.com/workers/configuration/secrets/#via-the-dashboard)
3. 在 Worker 的 **Settings → Observability** 确认应用日志和追踪关闭。仓库部署配置也关闭了 Workers Logs、追踪和 Logpush。[Workers 日志设置](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
4. 若旧版已启用针对本 Worker 或域名的 Cloudflare Access，在新门禁配置完成后，到对应 Worker 或域名的 Access 设置移除旧策略。已有笔记继续使用同一个 D1 UUID 和原主密码。

### 5. 从本地客户端验证

启动 [本地客户端](#本地客户端)，在隐私浏览器地址栏打开 `http://127.0.0.1:8765/`。填入 Worker 的 HTTPS 根网址和门禁密码，再在本地页面输入独立的加密主密码。新建测试笔记并加密保存，在另一台运行本地客户端的可信设备上确认能解锁并读取。

更换 `APP_PASSWORD` 会使旧门禁会话失效。加密主密码由原有密文验证，门禁密码轮换与笔记解密相互独立。

## 本地客户端

从你已检查并保留的本地源码启动。需要 Node.js 22.13 或更新版本，客户端只用 Node.js 自带模块。

```sh
npm run client
```

在隐私浏览器地址栏输入 `http://127.0.0.1:8765/`。填写 Worker 的 HTTPS 根网址和门禁密码 `APP_PASSWORD`，连接后再输入独立的加密主密码。Worker 网址和门禁会话也仅保留在当前页面内存中。

首次创建时，使用专门生成的长随机主密码，或者至少八个独立随机抽取的 Diceware 单词。已有保险库用原主密码解锁。忘记主密码就无法解密。

锁定、切换标签页、离开窗口、离开页面或 60 秒无操作会清除页面内的密码输入、明文、密钥和会话，并中止本地在途操作。未保存的草稿一同清除，编辑时请及时加密保存。同步服务已收到的密文写入可能完成。

## 隐私与边界

- 主密码只用来在浏览器进程中派生不可导出的 Web Crypto 密钥。登录请求只使用门禁密码，同步请求使用短期会话和密文。客户端没有写入 Cookie、浏览器存储、离线缓存或本地文件的路径，页面与 API 响应均使用 `Cache-Control: no-store`。
- 笔记标题、正文、标签、修改时间和条数都在密文内。新版保存把明文长度填充到约 32 KiB 的区间，服务器仍可看出密文大小区间和更新次数。旧版密文可用原主密码打开，下一次保存才会使用填充。
- Cloudflare 为门禁和同步处理网络流量，仍可见门禁密码、连接出口 IP、请求时间和密文。禁用应用日志和追踪仅影响本项目的可观测性，Cloudflare 平台仍可处理流量及账号信息。Mullvad Browser 的隐私模式本身不会隐藏 IP。[Mullvad Browser 官方说明](https://mullvad.net/en/help/tag/mullvad-browser)
- 同步服务可以拒绝服务、删除密文或重放旧的有效密文。由于客户端退出后不保留版本检查点，重新连接时无法证明云端版本是最新的。
- 已解锁的设备、被篡改的本地客户端、浏览器或系统漏洞、恶意扩展、键盘记录、截图和系统内存取证都超出本应用的保护范围。清除输入和释放密钥引用无法保证抹除浏览器或系统的内存副本。若威胁包括高能力的设备扣押或针对性入侵，仅靠隐私浏览器和这个项目不足以保护高风险真实数据。[EFF 设备加密说明](https://www.eff.org/files/2017/03/09/digital-privacy-border-2017-guide.pdf)

## 开发验证

复制 `.dev.vars.example` 为 `.dev.vars`，填写仅用于测试的门禁密码。安装依赖并启动本地 Worker，再另开窗口运行本地客户端。

```sh
npm ci
npm run db:local
npm run dev
```

客户端的 Worker 网址填 `http://127.0.0.1:8787`。使用 `npm test` 检查加密、门禁和并发同步。

