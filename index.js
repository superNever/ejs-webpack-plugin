#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

function makeTags(file, assets, type) {
    var tags = ''
    assets.map(function(i) {
        if (i.substr(-4) !== '.map' && i.indexOf(file) !== -1) {
            console.log(file, type, path.normalize(i), new RegExp(file).test(path.normalize(i)))
            if (type === 'js' && /\.js/.test(path.normalize(i))) {
                tags += '<script type="text/javascript" src = ' + path.normalize(i) + '></script>';

            } else if (type === 'css' && new RegExp(file).test(path.normalize(i))) {
                tags += '<link rel="stylesheet" href=' + path.normalize(i) + ' />'
            }
        }
    })
    return tags;
}

function EjsWebpackPlugin(options) {
    if (options && typeof(options) === 'object' && Object.keys(options.entry).length > 0) {
        this.options = Object.assign(options);
        this.context = options.context;
    } else {
        throw new TypeError('缺少必要的参数.')
    }
}

function regReplace(origin, replaceContent, ref, type) {
    if (type == 'js') {
        for (var i = 0, j = ref.length; i < j; i++) {
            var regExp = new RegExp('\<script src=.+' + ref[0] + '.+<\/script>', 'g');
            if (regExp.test(origin)) {
                origin = origin.replace(regExp, replaceContent)
            }
        }
    } else if (type == 'css') {
        for (var i = 0, j = ref.length; i < j; i++) {
            var regExp = new RegExp('\<link.+href=.+' + ref[0] + '.+\/>', 'g');
            if (regExp.test(origin)) {
                origin = origin.replace(regExp, replaceContent);
            }
        }
    }

    return origin;
}

EjsWebpackPlugin.prototype.ejsInject = function(assets) {

    var entry = this.options.entry;
    var ejsList = Object.keys(entry);

    ejsList.map(function(item) {
        var content = fs.readFileSync(path.join(this.context, item), 'utf-8');

        var jsLinks, cssLinks, output

        if (entry[item].js) {
            jsLinks = entry[item].js.map(function(file) {
                return makeTags(file, assets, 'js')
            })
            content = regReplace(content, jsLinks.join('\n'), entry[item].js, 'js');
        }
        if (entry[item].css) {
            cssLinks = entry[item].css.map(function(file) {
                return makeTags(file, assets, 'css')
            })
            content = regReplace(content, cssLinks.join('\n'), entry[item].css, 'css');
        }
        if (!entry[item].output) {
            output = item
        } else {
            output = entry[item].output + '/' + path.basename(item)
        }
        fs.writeFileSync(output, content, 'utf-8')
    }.bind(this))
}

EjsWebpackPlugin.prototype.apply = function(compiler) {
    var _this = this
    compiler.plugin('emit', function(compilation, callback) {
        _this.ejsInject(Object.keys(compilation.assets))
        callback()
    })
}

module.exports = EjsWebpackPlugin;