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

    var log = new (function () {
        var _debug_mode = false;
        // ignore output for browsers which not support console
        var console = window.console;
        if (console === undefined) {
            console = {
                log:   $.noop,
                error: $.noop,
                warn:  $.noop,
                info:  $.noop,
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

    var _NtPropertyHelper = new (function () {
        var map = undefined;
        this.init = function () {
            if (map !== undefined) {
                return;
            }
            map = {};
            $('head meta[nt-props]').each(function () {
                var key = $(this).attr('nt-props');
                var value = $(this).attr('content');
                if (map[key] !== undefined) {
                    log.warn('Redundant property \'' + key + '\' defined, using \'' + value + '\' overrides \'' + map[key] + '\'');
                }
                map[key] = value;
            });
        };
        this.getProperty = function (name, default_value) {
            return map[name] !== undefined ? map[name] : default_value;
        };
    })();

    var _NtClassDescriptor = function () {
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
            var clone = new _NtClassDescriptor();
            clone.setClassName(this.getClassName());
            clone.setContent(this.getContent());
            clone.setParentClassName(this.getParentClassName());
            clone.setMembers(this.getMembers());
            return clone;
        };
    };

    (function () {
        var _loaders_idx = [];
        var _loaders_name = {};
        var _classes = {};

        _NtClassDescriptor.getClassDescriptor = function (classname, callback) {
            if (_classes[classname] !== undefined) {
                callback(_classes[classname].getClone());
                return;
            }
            var chainedsearch = function (i) {
                _loaders_idx[i](classname, function () {
                    if (_classes[classname] !== undefined) {
                        callback(_classes[classname].getClone());
                    } else if (i + 1 >= _loaders_idx.length) {
                        // no more loader avaliable
                        throw 'Cannot load class \'' + classname + '\'.';
                    } else {
                        chainedsearch(i + 1);
                    }
                });
            };
            chainedsearch(0);
        };

        _NtClassDescriptor.addClassLoader = function (obj) {
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

        _NtClassDescriptor.loadFromContent = function (content) {
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
                var cDesc = new _NtClassDescriptor();
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

        _NtClassDescriptor.loadFromRemote = function (opt) {
            var callback = opt.success;
            opt.success = function (content) {
                _NtClassDescriptor.loadFromContent(content);
                if ($.isFunction(callback)) {
                    callback(content);
                }
            };
            $.ajax(opt);
        };

        _NtClassDescriptor.loadFromBody = function () {
            $('body [nt-class]').each(function () {
                _NtClassDescriptor.loadFromContent(this);
                $(this).remove();
            });
        };
    })()
    
    var _NtRenderContext = function () {
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
            var bean = new _NtRenderContext();
            bean.setElement(brotherElement);
            bean.setScope(scope);
            bean.setParent(parent);
            bean.setIfexists(ifexists);
            bean.setIfresult(ifresult);
            bean.setClassDescArray(cdescarr);
            return bean;
        };
        this.createChild = function (childElement) {
            var bean = new _NtRenderContext();
            bean.setElement(childElement);
            bean.setScope(scope);
            bean.setParent(this);
            bean.setClassDescArray(cdescarr);
            return bean;
        };
    };

    (function () {
        var _getInitContext = function (element, classDescArray, data) {
            var parent = new _NtRenderContext();
            var bean = new _NtRenderContext();
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
                log.error(JSON.stringify($scope, null, 2))
                return;
            }
            // import scope variables
            for (var _key in $scope) {
                eval('var '+_key+' = $scope[_key]');
            }
            var _parent = $($this).parent();
            $($this).each(function () {
                //nt-if nt-elseif nt-else
                if ($(this).is('[nt-if]')) {
                    if (eval($(this).attr('nt-if'))) {
                        $context.getParent().updateIf(true);
                        $(this).removeAttr('nt-if');
                    } else {
                        $context.getParent().updateIf(false);
                        $(this).remove();
                        return;
                    }
                } else if ($(this).is('[nt-elseif]')) {
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
                } else if ($(this).is('[nt-else]')) {
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
                if ($(this).is('[nt-repeat]')) {
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
                if ($(this).is('[nt-replace]')) {
                    var ctx = eval('('+$(this).attr('nt-replace')+')');
                    $(this).ntReplace(ctx);
                    return;
                }
                //nt-inject
                if ($(this).is('[nt-inject]')) {
                    var ctx = eval('('+$(this).attr('nt-inject')+')');
                    $(this).ntInject(ctx);
                }
                //nt-prepend
                if ($(this).is('[nt-prepend]')) {
                    var ctx = eval('('+$(this).attr('nt-prepend')+')');
                    $(this).ntPrepend(ctx);
                }
                //nt-append
                if ($(this).is('[nt-append]')) {
                    var ctx = eval('('+$(this).attr('nt-append')+')');
                    $(this).ntAppend(ctx);
                }
                //nt-before
                if ($(this).is('[nt-before]')) {
                    var ctx = eval('('+$(this).attr('nt-before')+')');
                    $(this).ntBefore(ctx);
                }
                //nt-after
                if ($(this).is('[nt-after]')) {
                    var ctx = eval('('+$(this).attr('nt-after')+')');
                    $(this).ntAfter(ctx);
                }
                //nt-attr
                if ($(this).is('[nt-attr]')) {
                    eval('$(this).attr('+$(this).attr('nt-attr')+');');
                    $(this).removeAttr('nt-attr');
                }
                //nt-html
                if ($(this).is('[nt-html]')) {
                    var html = eval($(this).attr('nt-html'));
                    $(this).html(html);
                    $(this).removeAttr('nt-html');
                }
                //nt-eval
                if ($(this).is('[nt-eval]')) {
                    eval($(this).attr('nt-eval'));
                    $(this).removeAttr('nt-eval');
                }
                //nt-remove
                if ($(this).is('[nt-remove]')) {
                    $(this).remove();
                }
            });
            if (!_parent.find($this).length) {
                return;
            }
            // before rendering children, replace class members
            do {
                var _modified = false;
                $($this).children().each(function () {
                    if ($(this).is('[nt-member]')) {
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
                if (!_modified) {
                    break;
                }
            } while (true);
            // render children
            $($this).children().each(function () {
                _render($context.createChild(this));
            });
        };

        _NtRenderContext._ntrender = function (jq, opt, method) {
            opt = $.extend({data: {}}, opt);
            jq.each(function () {
                var $scope = opt['data'];
                var html = document.createElement('html');
                var body = document.createElement('body');
                $(html).append(body);
                var descq = [];
                var onclassload = function (desc) {
                    var first = descq[0];
                    var last = descq[descq.length - 1];
                    var classname = first.getClassName();
                    $(body).html(desc.getContent());
                    var mark0 = '<!-- nt-class \'' + classname + '\' begin -->';
                    var mark1 = '<!-- nt-class \'' + classname + '\' end -->';
                    $(body).each(function () {
                        _render(_getInitContext(this, descq, $scope));
                        switch (method){
                            case 'ntReplace':
                                jq.before(mark0);
                                jq.after(mark1);
                                jq.replaceWith($(this).children());
                                break;
                            case 'ntInject':
                                jq.html($(this).children());
                                jq.prepend(mark0);
                                jq.append(mark1);
                                break;
                            case 'ntPrepend':
                                jq.prepend(mark1);
                                jq.prepend($(this).children());
                                jq.prepend(mark0);
                                break;
                            case 'ntAppend':
                                jq.append(mark0);
                                jq.append($(this).children());
                                jq.append(mark1);
                                break;
                            case 'ntBefore':
                                jq.before(mark0);
                                jq.before($(this).children());
                                jq.before(mark1);
                                break;
                            case 'ntAfter':
                                jq.after(mark1);
                                jq.after($(this).children());
                                jq.after(mark0);
                                break;
                        }
                    });
                };
                var chainedparentload = function (classname) {
                    _NtClassDescriptor.getClassDescriptor(classname, function (desc) {
                        descq.push(desc);
                        if (desc.getParentClassName() !== undefined) {
                            chainedparentload(desc.getParentClassName());
                        } else {
                            onclassload(desc);
                        }
                    });
                };
                chainedparentload(opt['class']);
            });
        };
    })();

    // init processes
    $(function () {

        // init properties
        (function () {
            _NtPropertyHelper.init();
        })();

        // add default classloader
        (function () {
            var rxp = /^((?:[a-z](?:[a-z0-9\-]*[a-z])?)(?:\.(?:[a-z](?:[a-z0-9\-]*[a-z])?))*)\/([a-z](?:[a-z0-9\-]*[a-z])?)\/([a-z](?:[a-z0-9\-]*[a-z])?)$/;
            _NtClassDescriptor.addClassLoader({
                name: 'neetjs-default-classloader',
                loader: function (classname, callback) {
                    var gac = classname.match(rxp);
                    if (!gac) {
                        callback();
                        return;
                    }
                    var group_id = gac[1];
                    var artifact_id = gac[2];
                    var class_id = gac[3];
                    var path = '.';
                    path = _NtPropertyHelper.getProperty('/repo', path);
                    path = _NtPropertyHelper.getProperty('/repo/' + group_id, path);
                    path = _NtPropertyHelper.getProperty('/repo/' + group_id + '/' + artifact_id, path);
                    path += '/' + group_id + '/' + artifact_id + '.nt.html'
                    $.ajax({
                        method: 'get',
                        url: path,
                        success: function (data) {
                            _NtClassDescriptor.loadFromContent(data);
                            callback();
                        },
                        error: function() {
                            callback();
                        }
                    });
                }
            });
        })();

        // load from body
        (function () {
            var autoload = _NtPropertyHelper.getProperty('/boot/load-from-body', 'false');
            log.info('/boot/load-from-body setted to false');
            if (autoload === 'true') {
                _NtClassDescriptor.loadFromBody();
            }
        })();

        // inject on load
        (function () {
            var autoinject = _NtPropertyHelper.getProperty('/boot/inject-on-load', 'false');
            var injectclass = _NtPropertyHelper.getProperty('/boot/inject-on-load/class');
            var injectdata = _NtPropertyHelper.getProperty('/boot/inject-on-load/data', "{}");
            injectdata = eval('('+injectdata+')');
            if (autoinject === 'false') {
                log.info('/boot/inject-on-load setted to false');
                return;
            } else if (injectclass == undefined) {
                log.warn('/boot/inject-on-load setted to true but no nt-class given, ignored');
                return;
            } else {
                $('body').ntInject({
                    'class': injectclass,
                    'data': injectdata
                });
            }
        })();

    });

    // NeetJS API Functions

    // 1.0
    $.neetjs = {
        loadFromBody: function () {
            log.warn('$.neetjs.loadFromBody() was deprecated, use <meta nt-props="/boot/load-from-body" content="true" /> instead.');
            _NtClassDescriptor.loadFromBody();
        }
    };

    $.fn.ntReplace = function (option) {
        _NtRenderContext._ntrender(this, option, 'ntReplace');
    };
    $.fn.ntInject = function (option) {
        _NtRenderContext._ntrender(this, option, 'ntInject');
    };
    $.fn.ntPrepend = function (option) {
        _NtRenderContext._ntrender(this, option, 'ntPrepend');
    };
    $.fn.ntAppend = function (option) {
        _NtRenderContext._ntrender(this, option, 'ntAppend');
    };
    $.fn.ntBefore = function (option) {
        _NtRenderContext._ntrender(this, option, 'ntBefore');
    };
    $.fn.ntAfter = function (option) {
        _NtRenderContext._ntrender(this, option, 'ntAfter');
    };

})(jQuery);
