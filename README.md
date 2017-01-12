# ejs-webpack-plugin

将`ejs`等非语法糖的模板自动关联已编译完的前端脚本

## Install

```npm install ejs-webpack-plugin --save-dev```

## Configuration

Define in your webpack configuration file the plugins with an array of file you want to compile

```
// webpack.config.js
const ejsPlugin = require('ejs-webpack-plugin');

module.exports = {
  plugins: [
    new ejsPlugin(options)
  ]
};
```

## Options

You can configure your compilation with additional parameters:

```
let objects = {
	context:__dirname,						//当前context
	entry:{
       '../views/entry/index.ejs': 			//ejs入口文件
       {
         'js':['index','commons'],			//js名称，包括公共
         'css':['index'],				    //css 名称
         'output':'./views' //默认同Key      //产出目录
       },
       '../views/entry/user.ejs':
       {
         'js':['user','commons'],
         'css':['user'],
         'output':'./views'
       }
     }
};

```

## examples

```bash
// origin 原始模样
<!DOCTYPE html>
<html>
  <head>
    <title><%= title %></title>
    <link rel='stylesheet' href='/stylesheets/index.css' />
    <script src="/javascripts/index.js" type="text/javascript"></script>
  </head>
  <body>
    <h1><%= title %></h1>
    <p>EJS Welcome to <%= title %></p>
  </body>
</html>
```
编译之后

```bash
<!DOCTYPE html>
<html>
  <head>
    <title><%= title %></title>
    <link rel="stylesheet" href=/javascripts/index_44e4c.js />
    <script type="text/javascript" src = /javascripts/index_44e4c.js></script>
<script type="text/javascript" src = javascripts/commons.bundle.js></script>
  </head>
  <body>
    <h1><%= title %></h1>
    <p>EJS Welcome to <%= title %></p>
  </body>
</html>

```

详细的目录对比请参照这里的[website项目](https://github.com/superNever/website)

## EJS support

Go to the [Latest Release](https://github.com/mde/ejs/)

## License

MIT