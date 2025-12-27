# Changelog

## 1.0.0 (2025-12-27)


### Features

* add podman deployment script ([dfb6373](https://github.com/zuohuadong/supacloud/commit/dfb6373e35cb7fdb47f26bef105d713a6beb768f))
* add remote MCP server support with SSE and API Key auth ([cd0ff26](https://github.com/zuohuadong/supacloud/commit/cd0ff266c650e1c3ec11361be24115272e958f3b))
* add support for dual runtime (Bun/Deno) in cloud functions ([d1db9d5](https://github.com/zuohuadong/supacloud/commit/d1db9d5a7efa4be0cc50d82a2d61ffce307e742b))
* **cli:** add upgrade command for self-update ([1f0fb68](https://github.com/zuohuadong/supacloud/commit/1f0fb68e1bbcab4bf93bf10d1901dfdc8f350e82))
* enable secured MCP endpoint in Kong config ([ce85b8c](https://github.com/zuohuadong/supacloud/commit/ce85b8cc4b069300ca7a75a9610fde1c9e5ee229))
* enhance cross-platform build and upgrade logic ([d50e646](https://github.com/zuohuadong/supacloud/commit/d50e646d240340c3688a5eeaf4095628fea58518))
* enhance platform with cli, backups, and release workflow ([a01755b](https://github.com/zuohuadong/supacloud/commit/a01755b9d859f3add997b3a2a7cc17bafd5bd6a6))
* Implement WeChat Official Account (Web) Login and refactor bun-auth service ([96b42ae](https://github.com/zuohuadong/supacloud/commit/96b42ae6842fa56f5e3854deb67e0767f8a55d2a))
* Initial SupaCloud project structure with manager and auth services ([dba6a32](https://github.com/zuohuadong/supacloud/commit/dba6a32199ba0b4aa7524802e8ce1cae1e60171b))
* Initial SupaCloud project structure with manager and auth services && fix: UPDATE garage image to v0.9.4 to resolve CI manifest error ([8c7502d](https://github.com/zuohuadong/supacloud/commit/8c7502d65a142d84c2bd7c771f61541b62a9736c))
* **manager:** add i18n support and web-based function code editor ([c351a22](https://github.com/zuohuadong/supacloud/commit/c351a2201424300bf24e4370fbd24a748236fb3b))
* **manager:** add logs and config management ([14f7571](https://github.com/zuohuadong/supacloud/commit/14f757191cab81e8ca778f09f837f7edf8332d94))
* **manager:** add restart project functionality ([450ae21](https://github.com/zuohuadong/supacloud/commit/450ae21d66329e40c0def137e5fc1b51d5640424))
* **manager:** add system operations (monitoring, update, restore) ([2142c8e](https://github.com/zuohuadong/supacloud/commit/2142c8ed7d1e4d85144110fc29963e9f955e1c3a))
* **manager:** refactor to Hono+JSX UI and add build workflow ([b637ba9](https://github.com/zuohuadong/supacloud/commit/b637ba9df9c88326370dbf373aeb497bd90968b2))
* Replace dedicated MQTT port with generic EXT_PORT and add documentation for protocol architecture ([9e30167](https://github.com/zuohuadong/supacloud/commit/9e30167a92d1723bbe1a59508d51a233cab1f5b2))
* 实现 Supacloud 项目管理器，提供项目创建、删除及配置的 Web UI 和 API。 ([7f3919d](https://github.com/zuohuadong/supacloud/commit/7f3919decbb805b2ccac3797c98f4760c74ac8f7))


### Bug Fixes

* **api:** correctly handle json body parsing in handler ([0995958](https://github.com/zuohuadong/supacloud/commit/09959588a40898aa4f06de4712e0165cdb501e72))
* **api:** support json response in create endpoint and update tests ([3757abc](https://github.com/zuohuadong/supacloud/commit/3757abc27022a8d3b8490d57743c2332ed080d59))
* **manager:** export internal functions for testing ([f2e15f9](https://github.com/zuohuadong/supacloud/commit/f2e15f9b1fd74fdb8b920edad7f00a9376b1b4dc))
* **manager:** fix regex pattern and support dynamic root domain ([feaa2cd](https://github.com/zuohuadong/supacloud/commit/feaa2cd6efcd30e9ac4b4ca8549944a0d6541be9))
* Relax garage healthcheck settings (127.0.0.1, more retries) ([296eab6](https://github.com/zuohuadong/supacloud/commit/296eab6a8450085e4c43646a35bf00e58dbb3885))
* Remove Garage healthcheck and simplify init dependencies ([59520c8](https://github.com/zuohuadong/supacloud/commit/59520c8d0f0747d40bcb68c654781d1bb5fc7257))
* **ui:** use safe regex pattern for project name ([a59a873](https://github.com/zuohuadong/supacloud/commit/a59a8736c884cd679ab1d4d2cbb7ddda56a6782f))
* Update garage healthcheck to curl and fix init-garage.sh to use RPC ([8d18e9c](https://github.com/zuohuadong/supacloud/commit/8d18e9cba47f234fee2c69295acc6218497974b4))
* Use Alpine for garage-init and download CLI to solve missing shell error ([5a9eafe](https://github.com/zuohuadong/supacloud/commit/5a9eafef99fbe54511b93176ee6ef07e0574d760))
