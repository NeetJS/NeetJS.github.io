/*
 * NeetJS
 * http://neetjs.org
 *
 * Copyright neetjs.org
 * Released under the MIT license
 * https://github.com/prchen-open/NeetJS/blob/master/LICENSE
 *
 */

(function ($) {
    var _debug_mode = false;
    var _loaders_idx = [];
    var _loaders_name = {};
    var _classes = {};

    var setDebugMode = function (enable) {
        enable = enable ? true : false;
        _debug_mode = enable;
    };

    var log = new (function () {
        // ignore output for browsers which not support console
        var console = window.console;
        if (console === undefined) {
            console = {
                log: $.noop,
                error: $.noop,
                warn: $.noop,
                info: $.noop,
                debug: $.noop,
                trace: $.noop
            };
        }
        this.error = function (msg) {
            console.error('NeetJS ERROR - ' + msg);
            if (_debug_mode) {
                console.trace('Debug stack trace...');
            }
        };
        this.warn = function (msg) {
            console.warn('NeetJS WARN - ' + msg);
            if (_debug_mode) {
                console.trace('Debug stack trace...');
            }
        };
        this.info = function (msg) {
            console.info('NeetJS INFO - ' + msg);
            if (_debug_mode) {
                console.trace('Debug stack trace...');
            }
        };
        this.debug = function (msg) {
            console.debug('NeetJS DEBUG - ' + msg);
            if (_debug_mode) {
                console.trace('Debug stack trace...');
            }
        };
    })();

    var addClassLoader = function (obj) {
        var name = obj.name;
        var loader = obj.loader;
        if (name === undefined) {
            log.error('Class loader should match the pattern of {name: \'loaderName\', loader: function (class) {...} }.');
            return;
        }
        if (loader === undefined || !$.isFunction(loader)) {
            log.error('Class loader should match the pattern of {name: \'loaderName\', loader: function (class) {...} }.');
            return;
        }
        if (_loaders_name[name] !== undefined) {
            log.warn('redundant class loader added named ' + name + ', override.');
        }
        _loaders_idx.push(loader);
        _loaders_name[name] = loader;
    };

    var _getClass = function (classname) {
        if (_classes[classname] !== undefined) {
            return _classes[classname];
        }
        for (var idx in _loaders_idx) {
            var loader = _loaders_idx[idx];
            loader(classname);
            if (_classes[classname] !== undefined) {
                return _classes[classname];
            }
        }
        throw 'Cannot load class \'' + classname + '\'.';
    };

    var loadFromContent = function (content) {
        if (content === undefined) {
            return;
        }
        var spacejq = $(document.createElement('body'));
        spacejq.append(content);
        $(spacejq).find('[nt-class]').each(function () {
            var name = $(this).attr('nt-class');
            if (_classes[name] !== undefined) {
                log.warn('redundant loadclass called for class ' + name + ', ignore.');
                return;
            }
            $(this).removeAttr('nt-class');
            $(this).find('[nt-head]').each(function () {
                $(this).removeAttr('nt-head');
                var rid = $(this).attr('nt-resource-id');
                if (rid && $('head [nt-resource-id=' + rid + ']').length > 0) {
                    $(this).appendTo();
                    return;
                }
                $(this).appendTo('head');
            });
            _classes[name] = this;
        });
    };

    var loadFromRemote = function (opt) {
        var callback = opt.success;
        opt.success = function (content) {
            loadFromContent(content);
            if ($.isFunction(callback)) {
                callback(content);
            }
        };
        $.ajax(opt);
    };

    var loadFromBody = function () {
        $('body [nt-class]').each(function () {
            loadFromContent(this);
            $(this).replaceWith();
        });
    };

    var _RCtx = function () {
        var element, scope, parent, ifexists, ifresult;
        this.getElement = function () {
            return element;
        };
        this.setElement = function (arg) {
            element = arg;
        };
        this.getScope = function () {
            return scope;
        };
        this.setScope = function (arg) {
            scope = arg;
        };
        this.getParent = function () {
            return parent;
        };
        this.setParent = function (arg) {
            parent = arg;
        };
        this.getIfexists = function () {
            return ifexists ? true : false;
        }
        this.setIfexists = function (arg) {
            ifexists = arg;
        };
        this.getIfresult = function () {
            return ifresult;
        };
        this.setIfresult = function (arg) {
            ifresult = arg;
        };
        this.updateIf = function (result) {
            ifexists = true;
            ifresult = result;
        };
        this.endIf = function () {
            ifexists = false;
        };
        this.createBrother = function (brotherElement) {
            var bean = new _RCtx();
            bean.setElement(brotherElement);
            bean.setScope(scope);
            bean.setParent(parent);
            bean.setIfexists(ifexists);
            bean.setIfresult(ifresult);
            return bean;
        };
        this.createChild = function (childElement) {
            var bean = new _RCtx();
            bean.setElement(childElement);
            bean.setScope(scope);
            bean.setParent(this);
            return bean;
        };
    };
    _RCtx.getInitContext = function (element, data) {
        var parent = new _RCtx();
        var bean = new _RCtx();
        bean.setElement(element);
        bean.setScope(data);
        bean.setParent(parent);
        return bean;
    };

    // private recursive render function
    var _render = function ($context) {
        var $this = $context.getElement();
        var $scope = $context.getScope();
        // make a copy
        if (!$.isPlainObject($scope)) {
            log.error('scope data should be plain object');
        }
        // import scope variables
        for (var _key in $scope) {
            eval('var '+_key+' = $scope[_key]');
        }
        var _parent = $($this).parent();
        $($this).each(function () {
            //nt-if nt-elseif nt-else
            if ($(this).attr('nt-if') !== undefined) {
                if (eval($(this).attr('nt-if'))) {
                    $context.getParent().updateIf(true);
                    $(this).removeAttr('nt-if');
                } else {
                    $context.getParent().updateIf(false);
                    $(this).replaceWith();
                    return;
                }
            } else if ($(this).attr('nt-elseif') !== undefined) {
                if (!$context.getParent().getIfexists()) {
                    log.error('Cannot find \'if\' or \'elseif\' cases.');
                    return;
                }
                if ($context.getParent().getIfresult()) {
                    $(this).replaceWith();
                    return;
                } else if (eval($(this).attr('nt-elseif'))) {
                    $context.getParent().updateIf(true);
                    $(this).removeAttr('nt-elseif');
                } else {
                    $context.getParent().updateIf(false);
                    $(this).replaceWith();
                    return;
                }
            } else if ($(this).attr('nt-else') !== undefined) {
                if (!$context.getParent().getIfexists()) {
                    log.error('Cannot find \'if\' or \'elseif\' cases.');
                    return;
                }
                if ($context.getParent().getIfresult()) {
                    $(this).replaceWith();
                    return;
                } else {
                    $context.getParent().updateIf(true);
                    $(this).removeAttr('nt-else');
                }
            } else {
                $context.getParent().endIf();
            }
            //nt-repeat
            if ($(this).attr('nt-repeat') !== undefined) {
                var _declare = $(this).attr('nt-repeat'), _dname, _kname, _vname;
                if (/^[a-z]+.* as [a-zA-Z]+[0-9a-zA-Z]*$/.test(_declare)) {
                    var arr = _declare.split(' ', 3);
                    _dname = arr[0];
                    _vname = arr[2];
                } else if (/^[a-z]+.* as [a-zA-Z]+[0-9a-zA-Z]* : [a-zA-Z]+[0-9a-zA-Z]*$/.test(_declare)) {
                    var arr = _declare.split(' ', 5);
                    _dname = arr[0];
                    _kname = arr[2];
                    _vname = arr[4];
                } else {
                    throw 'nt-repeat declaration should match to \'dataset as value\' or \'dataset as key : value\'';
                }
                $(this).removeAttr('nt-repeat');
                var _data = eval(_dname);
                var _for = function ($this, _key) {
                    var clone = $($this).clone()[0];
                    if (_kname !== undefined) {
                        $scope[_kname] = _key;
                    }
                    $scope[_vname] = _data[_key];
                    // insert before render
                    $($this).before(clone);
                    _render($context.createBrother(clone));
                };
                if ($.isArray(_data)) {
                    for (var _key = 0 ; _key < _data.length ; _key++) {
                        _for(this, _key);
                    }
                } else {
                    for (var _key in _data) {
                        _for(this, _key);
                    }
                }
                $(this).replaceWith();
                return;
            }
            //nt-replace
            if ($(this).attr('nt-replace') !== undefined) {
                var ctx = eval('('+$(this).attr('nt-replace')+')');
                $(this).ntReplace(ctx);
                return;
            }
            //nt-inject
            if ($(this).attr('nt-inject') !== undefined) {
                var ctx = eval('('+$(this).attr('nt-inject')+')');
                $(this).ntInject(ctx);
            }
            //nt-prepend
            if ($(this).attr('nt-prepend') !== undefined) {
                var ctx = eval('('+$(this).attr('nt-prepend')+')');
                $(this).ntPrepend(ctx);
            }
            //nt-append
            if ($(this).attr('nt-append') !== undefined) {
                var ctx = eval('('+$(this).attr('nt-append')+')');
                $(this).ntAppend(ctx);
            }
            //nt-before
            if ($(this).attr('nt-before') !== undefined) {
                var ctx = eval('('+$(this).attr('nt-before')+')');
                $(this).ntBefore(ctx);
            }
            //nt-after
            if ($(this).attr('nt-after') !== undefined) {
                var ctx = eval('('+$(this).attr('nt-after')+')');
                $(this).ntAfter(ctx);
            }
            //nt-attr
            if ($(this).attr('nt-attr') !== undefined) {
                eval('$(this).attr('+$(this).attr('nt-attr')+');');
                $(this).removeAttr('nt-attr');
            }
            //nt-html
            if ($(this).attr('nt-html') !== undefined) {
                var html = eval($(this).attr('nt-html'));
                $(this).html(html);
                $(this).removeAttr('nt-html');
            }
            //nt-eval
            if ($(this).attr('nt-eval') !== undefined) {
                eval($(this).attr('nt-eval'));
                $(this).removeAttr('nt-eval');
            }
            //nt-remove
            if ($(this).attr('nt-remove') !== undefined) {
                $(this).replaceWith();
            }
        });
        if (!_parent.find($this).length) {
            return;
        }
        $($this).children().each(function () {
            _render($context.createChild(this));
        });
    };

    var _ntrender = function (jq, opt, method) {
        jq.each(function () {
            var newdom = $(_getClass(opt['class'])).clone()[0];
            var $scope = opt['data'];
            $(document.createElement('html')).append(newdom);
            $(newdom).each(function () {
                _render(_RCtx.getInitContext(this, $scope));
                switch (method){
                    case 'ntReplace':
                        jq.replaceWith(this);
                        break;
                    case 'ntInject':
                        jq.empty();
                    case 'ntPrepend':
                        jq.prepend(this);
                        break;
                    case 'ntAppend':
                        jq.append(this);
                        break;
                    case 'ntBefore':
                        jq.before(this);
                        break;
                    case 'ntAfter':
                        jq.after(this);
                        break;
                    default:
                        throw 'Unexpected case.';
                        break;
                }
            });
        });
    };

    // mount to jQuery
    $.neetjs = {
        setDebugMode:setDebugMode,
        addClassLoader:addClassLoader,
        loadFromContent:loadFromContent,
        loadFromRemote:loadFromRemote,
        loadFromBody:loadFromBody
    };

    $.fn.ntReplace = function (opt) {
        _ntrender(this, opt, 'ntReplace');
    };
    $.fn.ntInject = function (opt) {
        _ntrender(this, opt, 'ntInject');
    };
    $.fn.ntPrepend = function (opt) {
        _ntrender(this, opt, 'ntPrepend');
    };
    $.fn.ntAppend = function (opt) {
        _ntrender(this, opt, 'ntAppend');
    };
    $.fn.ntBefore = function (opt) {
        _ntrender(this, opt, 'ntBefore');
    };
    $.fn.ntAfter = function (opt) {
        _ntrender(this, opt, 'ntAfter');
    };

})(jQuery);
