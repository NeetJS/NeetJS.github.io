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
            log.warn('Redundant class loader added named ' + name + ', override.');
        }
        _loaders_idx.push(loader);
        _loaders_name[name] = loader;
    };

    var _CDesc = function () {
        var classname, content, parent_cname, members = [];
        this.getClassName = function () {
            return classname;
        };
        this.setClassName = function (_classname) {
            classname = _classname;
        };
        this.getContent = function () {
            return content;
        };
        this.setContent = function (_content) {
            content = _content;
        };
        this.getParentClassName = function () {
            return parent_cname;
        };
        this.setParentClassName = function (_parent_classname) {
            parent_cname = _parent_classname;
        };
        this.getMember = function (_member_name) {
            return members[_member_name];
        };
        this.setMember = function (_member_name, _member_content) {
            members[_member_name] = _member_content;
        };
        this.getMembers = function () {
            return members;
        };
        this.setMembers = function (_members) {
            members = _members;
        };
        this.getClone = function () {
            var clone = new _CDesc();
            clone.setClassName(this.getClassName());
            clone.setContent(this.getContent());
            clone.setParentClassName(this.getParentClassName());
            clone.setMembers(this.getMembers());
            return clone;
        };
    }

    var _getClass = function (classname) {
        if (_classes[classname] !== undefined) {
            return _classes[classname].getClone();
        }
        for (var idx in _loaders_idx) {
            var loader = _loaders_idx[idx];
            loader(classname);
            if (_classes[classname] !== undefined) {
                return _classes[classname].getClone();
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
            var classdef = this;
            var name = $(this).attr('nt-class');
            if (_classes[name] !== undefined) {
                log.warn('Redundant loadclass called for class ' + name + ', ignore.');
                return;
            }
            try {
                var eprefix = 'Failed to load class \'' + name + '\', ';
                if ($(this).find('[nt-head]').length > 1 || $(this).find('[nt-body]').length > 1) {
                    throw eprefix + 'a class should have 0 or 1 nt-head and 0 or 1 nt-body.';
                }
                $(this).find('[nt-head]').each(function () {
                    if (this.parentNode != classdef) {
                        throw eprefix + 'nt-head should be the direct child of nt-class.';
                    }
                });
                $(this).find('[nt-override]').each(function () {
                    if (this.parentNode != classdef) {
                        throw eprefix + 'nt-override should be the direct child of nt-class.';
                    }
                });
                $(this).find('[nt-body]').each(function () {
                    if (this.parentNode != classdef) {
                        throw eprefix + 'nt-body should be the direct child of nt-class.';
                    }
                });
            } catch (e) {
                log.error(e);
                return;
            }
            var cDesc = new _CDesc();
            cDesc.setClassName(name);
            if ($(this).attr('nt-extends') !== undefined) {
                cDesc.setParentClassName($(this).attr('nt-extends'));
            }
            $(this).find('[nt-head]').children().each(function () {
                var rid = $(this).attr('nt-resource-id');
                if (rid && $('head [nt-resource-id=' + rid + ']').length > 0) {
                    $(this).appendTo();
                    log.info('Redundant resource (rid:' + rid + ') detected, ignore.');
                    return;
                }
                $(this).appendTo('head');
            });
            $(this).find('[nt-override]').each(function () {
                cDesc.setMember($(this).attr('nt-override'), $(this).html());
            });
            cDesc.setContent($(this).find('[nt-body]').html());
            _classes[name] = cDesc;
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
            $(this).remove();
        });
    };

    var _RCtx = function () {
        var element, scope, parent, ifexists, ifresult, cdescarr;
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
        this.getClassDescArray = function () {
            return cdescarr;
        };
        this.setClassDescArray = function (_cdescarr) {
            cdescarr = _cdescarr;
        }
        this.createBrother = function (brotherElement) {
            var bean = new _RCtx();
            bean.setElement(brotherElement);
            bean.setScope(scope);
            bean.setParent(parent);
            bean.setIfexists(ifexists);
            bean.setIfresult(ifresult);
            bean.setClassDescArray(cdescarr);
            return bean;
        };
        this.createChild = function (childElement) {
            var bean = new _RCtx();
            bean.setElement(childElement);
            bean.setScope(scope);
            bean.setParent(this);
            bean.setClassDescArray(cdescarr);
            return bean;
        };
    };
    _RCtx.getInitContext = function (element, classDescArray, data) {
        var parent = new _RCtx();
        var bean = new _RCtx();
        bean.setElement(element);
        bean.setScope(data);
        bean.setParent(parent);
        bean.setClassDescArray(classDescArray);
        return bean;
    };

    // private recursive render function
    var _render = function ($context) {
        var $this = $context.getElement();
        var $scope = $context.getScope();
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
                    $(this).remove();
                    return;
                }
            } else if ($(this).attr('nt-elseif') !== undefined) {
                if (!$context.getParent().getIfexists()) {
                    log.error('Cannot find \'if\' or \'elseif\' cases.');
                    return;
                }
                if ($context.getParent().getIfresult()) {
                    $(this).remove();
                    return;
                } else if (eval($(this).attr('nt-elseif'))) {
                    $context.getParent().updateIf(true);
                    $(this).removeAttr('nt-elseif');
                } else {
                    $context.getParent().updateIf(false);
                    $(this).remove();
                    return;
                }
            } else if ($(this).attr('nt-else') !== undefined) {
                if (!$context.getParent().getIfexists()) {
                    log.error('Cannot find \'if\' or \'elseif\' cases.');
                    return;
                }
                if ($context.getParent().getIfresult()) {
                    $(this).remove();
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
                $(this).remove();
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
                $(this).remove();
            }
        });
        if (!_parent.find($this).length) {
            return;
        }
        // before rendering children, replace class members
        var _modified = false;
        do {
            _modified = false;
            $($this).children().each(function () {
                if ($(this).attr('nt-member') !== undefined) {
                    _modified = true;
                    var _descArr = $context.getClassDescArray();
                    var _memberName = $(this).attr('nt-member');
                    $(this).removeAttr('nt-member');
                    for (var i in _descArr) {
                        var member = _descArr[i].getMember(_memberName);
                        if (member !== undefined) {
                            $(this).replaceWith(member);
                            break;
                        }
                    }
                }
            });
        } while (_modified);
        // render children
        $($this).children().each(function () {
            _render($context.createChild(this));
        });
    };

    var _ntrender = function (jq, opt, method) {
        jq.each(function () {
            var $scope = opt['data'] === undefined ? {} : opt['data'];
            var html = document.createElement('html');
            var body = document.createElement('body');
            $(html).append(body);
            var descq = [];
            var desc = _getClass(opt['class']);
            do {
                descq.push(desc);
                if (desc.getParentClassName() !== undefined) {
                    desc = _getClass(desc.getParentClassName());
                } else {
                    break;
                }
            } while (true);
            $(body).html(desc.getContent());
            $(body).each(function () {
                _render(_RCtx.getInitContext(this, descq, $scope));
                switch (method){
                    case 'ntReplace':
                        jq.replaceWith($(this).children());
                        break;
                    case 'ntInject':
                        jq.html($(this).children());
                        break;
                    case 'ntPrepend':
                        jq.prepend($(this).children());
                        break;
                    case 'ntAppend':
                        jq.append($(this).children());
                        break;
                    case 'ntBefore':
                        jq.before($(this).children());
                        break;
                    case 'ntAfter':
                        jq.after($(this).children());
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
