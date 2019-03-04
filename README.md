#### 前端项目通用脚手架
> 支持vue项目/react项目/普通js项目 创建 调试 和 打包

#### 更新说明

- 1.0.38版本
1. 去除无用代码

- 1.0.37版本

1. 修复build 后文件加载bug
2. 优化 build.js 文件

- 1.0.36版本
1. 优化了项目创建方式
2. 支持了vue项目
3. 关闭了react项目创建，将在下一个大版本完善

***

#### 使用文档
- 全局安装依赖

`npm install -g dhcli`

- mac全局安装依赖

`sudo npm install -g dhcli`

- 初始化项目
> 建议先自行创建项目目录，如找不到项目目录会自动根据项目名创建目录

`cli init`

- 启动开发调试

`npm run dev`

- 编译打包

1. 编译测试包

`npm run build-qa`

2. 编译生产包

`npm run build`

***

#### 详细说明

- 关于项目初始化

项目初始化需要开发者输入package.json中的一些字段，如需要自动在gitlab创建项目请输入你的**gitlab地址**和一个**有效的Private token**,这将会自动在你的gitlab上创建此项目并关联到本地git

- 关于打包编译

> 如不输入tab名，将自动以当前tag名+时间戳的方式命名！

编译成功后会自动打git tag，需要开发者自行输入tag名，编译测试包tag名以**d开头**，生产包tag名以**p开头**。

#### github地址

[github][https://github.com/frontlove/dhcli]
