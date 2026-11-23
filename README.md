# 密记

单人加密记事本。Cloudflare Workers 只提供门禁和密文同步，D1 保存单个带版本号的加密保险库。解密程序在设备的本地回环地址运行。

## Cloudflare 官方一键部署

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fbqbfanglian%2FCFE2E-Note)

1. 点击按钮进入 Cloudflare 的模板部署页。登录 Cloudflare，选择账户和 GitHub 账户。Cloudflare 会从这个模板创建一个新仓库，并在所选账户创建 Worker 和 D1，绑定名为 `DB`。[官方部署按钮文档](https://developers.cloudflare.com/workers/platform/deploy-buttons/)
2. 在部署页填写门禁 Secret `APP_PASSWORD`，使用至少 32 个随机字符。若部署页未显示此项，部署后打开 **Workers & Pages → 你的 Worker → Settings → Variables and Secrets → Add**，类型选 **Secret**。加密主密码只在本地客户端输入。[Secret 设置指南](https://developers.cloudflare.com/workers/configuration/secrets/#via-the-dashboard)
3. 点击 **Deploy**。如果展开高级设置，构建命令可留空，部署命令使用 `npm run deploy`。部署成功后，从 Worker 的 **Overview** 复制 HTTPS 根网址。访问这个地址应看到 `"status":"online"`。
4. 运行[本地客户端](#本地客户端)，填入 Worker 网址和门禁密码。第一次通过门禁时，Worker 会在已绑定的 D1 中创建 `vault` 表。然后用独立的加密主密码创建或解锁笔记。

### 重试失败的部署或使用旧数据库

- 如果之前通过 **Create application → GitHub** 导入时失败，回到本页点击 **Deploy to Cloudflare**。若上次尝试已经占用了同名仓库或 Worker，选择新名称，或更新旧构建连接的仓库再重试。
- 如果已经有笔记，保留原 Worker 和 D1。通过其 **Settings → Builds** 更新源码前，在该部署仓库的 `wrangler.jsonc` 中确认 `DB` 的 `database_id` 指向原数据库。首次登录自动建表只处理缺失的表，已有密文和主密码可以继续使用。
- 如果 Worker 根网址已显示在线，但客户端提示尚未配置门禁密码，在 **Settings → Variables and Secrets** 确认 `APP_PASSWORD` 已作为 Secret 保存并部署。

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

