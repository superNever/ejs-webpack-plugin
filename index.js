#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var _ = require('lodash');

function makeTags(file, assets, type) {
    var tags = ''
    assets.map(function (i) {
        if (i.substr(-4) !== '.map' && i.indexOf(file) !== -1) {
            console.log(file, type, path.normalize(i), new RegExp(file).test(path.normalize(i)))
            if (type === 'js' && /\.js/.test(path.normalize(i))) {
                tags += '<script type="text/javascript" src="/' + path.posix.normalize(i) + '" defer></script>';

            } else if (type === 'css' && /\.css/.test(path.normalize(i))) {
                tags += '<link rel="stylesheet" href="/' + path.posix.normalize(i) + '" />'
            }
        }
    })
    return tags;
}

function EjsWebpackPlugin(options) {
    if (options && typeof (options) === 'object' && Object.keys(options.entry).length > 0) {
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

EjsWebpackPlugin.prototype.ejsInject = function (assets , assets2 , assetTag , self) {

    var entry = this.options.entry;
    var ejsList = Object.keys(entry);

    ejsList.map(function (item) {
        var content = fs.readFileSync(path.join(this.context, item), 'utf-8');

        var jsLinks, cssLinks, output

        if (entry[item].js) {
            jsLinks = entry[item].js.map(function (file) {
                return makeTags(file, assets, 'js')
            })
            content = regReplace(content, jsLinks.join('\n'), entry[item].js, 'js');
        }
        if (entry[item].css) {
            cssLinks = entry[item].css.map(function (file) {
                return makeTags(file, assets, 'css')
            })
            content = regReplace(content, cssLinks.join('\n'), entry[item].css, 'css');
        }

        if(entry[item].inject){
            content = self.injectAssetsIntoHtml(content,assets2 , assetTag);
        }
        

        if (!entry[item].output) {
            output = item
        } else {
            output = entry[item].output + '/' + path.basename(item);
            if (!fs.existsSync(entry[item].output)){
                fs.mkdirSync(entry[item].output);
            }
        }
        
        fs.writeFileSync(output, content, 'utf-8')
    }.bind(this))
}



//--come from html-webpack-plugin

EjsWebpackPlugin.prototype.filterChunks = function (chunks, includedChunks, excludedChunks) {
    return chunks.filter(function (chunk) {
        var chunkName = chunk.names[0];
        // This chunk doesn't have a name. This script can't handled it.
        if (chunkName === undefined) {
            return false;
        }
        // Skip if the chunk should be lazy loaded
        if (typeof chunk.isInitial === 'function') {
            if (!chunk.isInitial()) {
                return false;
            }
        } else if (!chunk.initial) {
            return false;
        }
        // Skip if the chunks should be filtered and the given chunk was not added explicity
        if (Array.isArray(includedChunks) && includedChunks.indexOf(chunkName) === -1) {
            return false;
        }
        // Skip if the chunks should be filtered and the given chunk was excluded explicity
        if (Array.isArray(excludedChunks) && excludedChunks.indexOf(chunkName) !== -1) {
            return false;
        }
        // Add otherwise
        return true;
    });
};

EjsWebpackPlugin.prototype.htmlWebpackPluginAssets = function (compilation, chunks) {
    var self = this;
    var compilationHash = compilation.hash;

    // Use the configured public path or build a relative path
    var publicPath = typeof compilation.options.output.publicPath !== 'undefined'
        // If a hard coded public path exists use it
        ? compilation.mainTemplate.getPublicPath({ hash: compilationHash })
        // If no public path was set get a relative url path
        : path.relative(path.resolve(compilation.options.output.path, path.dirname(self.childCompilationOutputName)), compilation.options.output.path)
            .split(path.sep).join('/');

    if (publicPath.length && publicPath.substr(-1, 1) !== '/') {
        publicPath += '/';
    }

    var assets = {
        // The public path
        publicPath: publicPath,
        // Will contain all js & css files by chunk
        chunks: {},
        // Will contain all js files
        js: [],
        // Will contain all css files
        css: [],
        // Will contain the html5 appcache manifest files if it exists
        manifest: Object.keys(compilation.assets).filter(function (assetFile) {
            return path.extname(assetFile) === '.appcache';
        })[0]
    };

    // Append a hash for cache busting
    if (this.options.hash) {
        assets.manifest = self.appendHash(assets.manifest, compilationHash);
        assets.favicon = self.appendHash(assets.favicon, compilationHash);
    }

    for (var i = 0; i < chunks.length; i++) {
        var chunk = chunks[i];
        var chunkName = chunk.names[0];

        assets.chunks[chunkName] = {};

        // Prepend the public path to all chunk files
        var chunkFiles = [].concat(chunk.files).map(function (chunkFile) {
            return publicPath + chunkFile;
        });

        // Append a hash for cache busting
        if (this.options.hash) {
            chunkFiles = chunkFiles.map(function (chunkFile) {
                return self.appendHash(chunkFile, compilationHash);
            });
        }

        // Webpack outputs an array for each chunk when using sourcemaps
        // But we need only the entry file
        var entry = chunkFiles[0];
        assets.chunks[chunkName].size = chunk.size;
        assets.chunks[chunkName].entry = entry;
        assets.chunks[chunkName].hash = chunk.hash;
        assets.js.push(entry);

        // Gather all css files
        var css = chunkFiles.filter(function (chunkFile) {
            // Some chunks may contain content hash in their names, for ex. 'main.css?1e7cac4e4d8b52fd5ccd2541146ef03f'.
            // We must proper handle such cases, so we use regexp testing here
            return /.css($|\?)/.test(chunkFile);
        });
        assets.chunks[chunkName].css = css;
        assets.css = assets.css.concat(css);
    }

    // Duplicate css assets can occur on occasion if more than one chunk
    // requires the same css.
    assets.css = _.uniq(assets.css);

    return assets;
};

EjsWebpackPlugin.prototype.generateAssetTags = function (assets) {
    // Turn script files into script tags
    var scripts = assets.js.map(function (scriptPath) {
        return {
            tagName: 'script',
            closeTag: true,
            attributes: {
                type: 'text/javascript',
                src: scriptPath
            }
        };
    });
    // Make tags self-closing in case of xhtml
    var selfClosingTag = !!this.options.xhtml;
    // Turn css files into link tags
    var styles = assets.css.map(function (stylePath) {
        return {
            tagName: 'link',
            selfClosingTag: selfClosingTag,
            attributes: {
                href: stylePath,
                rel: 'stylesheet'
            }
        };
    });
    // Injection targets
    var head = [];
    var body = [];

    // If there is a favicon present, add it to the head
    if (assets.favicon) {
        head.push({
            tagName: 'link',
            selfClosingTag: selfClosingTag,
            attributes: {
                rel: 'shortcut icon',
                href: assets.favicon
            }
        });
    }
    // Add styles to the head
    head = head.concat(styles);
    // Add scripts to body or head
    if (this.options.inject === 'head') {
        head = head.concat(scripts);
    } else {
        body = body.concat(scripts);
    }
    return { head: head, body: body };
};

EjsWebpackPlugin.prototype.injectAssetsIntoHtml = function (html, assets, assetTags) {

    var htmlRegExp = /(<html[^>]*>)/i;
    var headRegExp = /(<\/head\s*>)/i;
    var bodyRegExp = /(<\/body\s*>)/i;
    var body = assetTags.body.map(this.createHtmlTag);
    var head = assetTags.head.map(this.createHtmlTag);

    if (body.length) {
        if (bodyRegExp.test(html)) {
            // Append assets to body element
            html = html.replace(bodyRegExp, function (match) {
                return body.join('') + match;
            });
        } else {
            // Append scripts to the end of the file if no <body> element exists:
            html += body.join('');
        }
    }

    if (head.length) {
        // Create a head tag if none exists
        if (!headRegExp.test(html)) {
            if (!htmlRegExp.test(html)) {
                html = '<head></head>' + html;
            } else {
                html = html.replace(htmlRegExp, function (match) {
                    return match + '<head></head>';
                });
            }
        }

        // Append assets to head element
        html = html.replace(headRegExp, function (match) {
            return head.join('') + match;
        });
    }

    // Inject manifest into the opening html tag
    if (assets.manifest) {
        html = html.replace(/(<html[^>]*)(>)/i, function (match, start, end) {
            // Append the manifest only if no manifest was specified
            if (/\smanifest\s*=/.test(match)) {
                return match;
            }
            return start + ' manifest="' + assets.manifest + '"' + end;
        });
    }
    return html;
};

EjsWebpackPlugin.prototype.createHtmlTag = function (tagDefinition) {
    var attributes = Object.keys(tagDefinition.attributes || {})
      .filter(function (attributeName) {
        return tagDefinition.attributes[attributeName] !== false;
      })
      .map(function (attributeName) {
        if (tagDefinition.attributes[attributeName] === true) {
          return attributeName;
        }
        return attributeName + '="' + tagDefinition.attributes[attributeName] + '"';
      });
    // Backport of 3.x void tag definition
    var voidTag = tagDefinition.voidTag !== undefined ? tagDefinition.voidTag : !tagDefinition.closeTag;
    var selfClosingTag = tagDefinition.voidTag !== undefined ? tagDefinition.voidTag && this.options.xhtml : tagDefinition.selfClosingTag;
    return '<' + [tagDefinition.tagName].concat(attributes).join(' ') + (selfClosingTag ? '/' : '') + '>' +
      (tagDefinition.innerHTML || '') +
      (voidTag ? '' : '</' + tagDefinition.tagName + '>');
  };

EjsWebpackPlugin.prototype.apply = function (compiler) {
    var _this = this

    compiler.hooks.emit.tapAsync('EjsWebpackPlugin', function (compilation, callback) {
        var allChunks = compilation.getStats().toJson().chunks;
        var chunks = _this.filterChunks(allChunks, _this.options.chunks, _this.options.excludeChunks);
        var assets = _this.htmlWebpackPluginAssets(compilation, chunks);
        var assetTags = _this.generateAssetTags(assets);
        

        _this.ejsInject(Object.keys(compilation.assets) , assets , { body: assetTags.body, head: assetTags.head }, _this)
        callback()
    })
}

module.exports = EjsWebpackPlugin;