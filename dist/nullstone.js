var nullstone;
(function (nullstone) {
    nullstone.version = '0.3.10';
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    function Annotation(type, name, value, forbidMultiple) {
        var at = type;
        var anns = at.$$annotations;
        if (!anns)
            Object.defineProperty(at, "$$annotations", { value: (anns = []), writable: false });
        var ann = anns[name];
        if (!ann)
            anns[name] = ann = [];
        if (forbidMultiple && ann.length > 0)
            throw new Error("Only 1 '" + name + "' annotation allowed per type [" + nullstone.getTypeName(type) + "].");
        ann.push(value);
    }
    nullstone.Annotation = Annotation;
    function GetAnnotations(type, name) {
        var at = type;
        var anns = at.$$annotations;
        if (!anns)
            return undefined;
        return (anns[name] || []).slice(0);
    }
    nullstone.GetAnnotations = GetAnnotations;
    function CreateTypedAnnotation(name) {
        function ta(type) {
            var values = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                values[_i - 1] = arguments[_i];
            }
            for (var i = 0, len = values.length; i < len; i++) {
                Annotation(type, name, values[i]);
            }
        }
        ta.Get = function (type) {
            return GetAnnotations(type, name);
        };
        return ta;
    }
    nullstone.CreateTypedAnnotation = CreateTypedAnnotation;
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var async;
    (function (async) {
        function create(resolution) {
            var onSuccess;
            var onError;
            var resolvedResult;
            function resolve(result) {
                resolvedResult = result;
                onSuccess && onSuccess(result);
            }
            var resolvedError;
            function reject(error) {
                resolvedError = error;
                onError && onError(error);
            }
            resolution(resolve, reject);
            var req = {
                then: function (success, errored) {
                    onSuccess = success;
                    onError = errored;
                    if (resolvedResult !== undefined)
                        onSuccess && onSuccess(resolvedResult);
                    else if (resolvedError !== undefined)
                        onError && onError(resolvedError);
                    return req;
                }
            };
            return req;
        }
        async.create = create;
        function resolve(obj) {
            return async.create(function (resolve, reject) {
                resolve(obj);
            });
        }
        async.resolve = resolve;
        function reject(err) {
            return async.create(function (resolve, reject) {
                reject(err);
            });
        }
        async.reject = reject;
        function many(arr) {
            if (!arr || arr.length < 1)
                return resolve([]);
            return create(function (resolve, reject) {
                var resolves = new Array(arr.length);
                var errors = new Array(arr.length);
                var finished = 0;
                var count = arr.length;
                var anyerrors = false;
                function completeSingle(i, res, err) {
                    resolves[i] = res;
                    errors[i] = err;
                    anyerrors = anyerrors || err !== undefined;
                    finished++;
                    if (finished >= count)
                        anyerrors ? reject(new nullstone.AggregateError(errors)) : resolve(resolves);
                }
                for (var i = 0; i < count; i++) {
                    arr[i].then(function (resi) { return completeSingle(i, resi, undefined); }, function (erri) { return completeSingle(i, undefined, erri); });
                }
            });
        }
        async.many = many;
    })(async = nullstone.async || (nullstone.async = {}));
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var converters = [];
    converters[Boolean] = function (val) {
        if (val == null)
            return null;
        if (typeof val === "boolean")
            return val;
        var c = val.toString().toUpperCase();
        return c === "TRUE" ? true : (c === "FALSE" ? false : null);
    };
    converters[String] = function (val) {
        if (val == null)
            return "";
        return val.toString();
    };
    converters[Number] = function (val) {
        if (!val)
            return 0;
        if (typeof val === "number")
            return val;
        return parseFloat(val.toString());
    };
    converters[Date] = function (val) {
        if (val == null)
            return new Date(0);
        return new Date(val.toString());
    };
    converters[RegExp] = function (val) {
        if (val instanceof RegExp)
            return val;
        if (val = null)
            throw new Error("Cannot specify an empty RegExp.");
        val = val.toString();
        return new RegExp(val);
    };
    function convertAnyToType(val, type) {
        var converter = converters[type];
        if (converter)
            return converter(val);
        if (type instanceof nullstone.Enum) {
            var enumo = type.Object;
            if (enumo.Converter)
                return enumo.Converter(val);
            val = val || 0;
            if (typeof val === "string")
                return enumo[val];
            return val;
        }
        return val;
    }
    nullstone.convertAnyToType = convertAnyToType;
    function convertStringToEnum(val, en) {
        if (!val)
            return 0;
        return en[val];
    }
    nullstone.convertStringToEnum = convertStringToEnum;
    function registerTypeConverter(type, converter) {
        converters[type] = converter;
    }
    nullstone.registerTypeConverter = registerTypeConverter;
    function registerEnumConverter(e, converter) {
        e.Converter = converter;
    }
    nullstone.registerEnumConverter = registerEnumConverter;
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var DirResolver = (function () {
        function DirResolver() {
        }
        DirResolver.prototype.loadAsync = function (moduleName, name) {
            var reqUri = moduleName + '/' + name;
            return nullstone.async.create(function (resolve, reject) {
                require([reqUri], function (rootModule) {
                    resolve(rootModule);
                }, function (err) { return reject(new nullstone.DirLoadError(reqUri, err)); });
            });
        };
        DirResolver.prototype.resolveType = function (moduleName, name, oresolve) {
            oresolve.isPrimitive = false;
            oresolve.type = require(moduleName + '/' + name);
            return oresolve.type !== undefined;
        };
        return DirResolver;
    })();
    nullstone.DirResolver = DirResolver;
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var Enum = (function () {
        function Enum(Object) {
            this.Object = Object;
        }
        Enum.fromAny = function (enuType, val, fallback) {
            if (typeof val === "number")
                return val;
            if (!val)
                return (fallback || 0);
            var obj = enuType[val.toString()];
            return (obj == null) ? (fallback || 0) : obj;
        };
        return Enum;
    })();
    nullstone.Enum = Enum;
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    function equals(val1, val2) {
        if (val1 == null && val2 == null)
            return true;
        if (val1 == null || val2 == null)
            return false;
        if (val1 === val2)
            return true;
        return !!val1.equals && val1.equals(val2);
    }
    nullstone.equals = equals;
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var Event = (function () {
        function Event() {
            this.$$callbacks = [];
            this.$$scopes = [];
        }
        Object.defineProperty(Event.prototype, "has", {
            get: function () {
                return this.$$callbacks.length > 0;
            },
            enumerable: true,
            configurable: true
        });
        Event.prototype.on = function (callback, scope) {
            this.$$callbacks.push(callback);
            this.$$scopes.push(scope);
        };
        Event.prototype.off = function (callback, scope) {
            var cbs = this.$$callbacks;
            var scopes = this.$$scopes;
            var search = cbs.length - 1;
            while (search > -1) {
                search = cbs.lastIndexOf(callback, search);
                if (scopes[search] === scope) {
                    cbs.splice(search, 1);
                    scopes.splice(search, 1);
                }
                search--;
            }
        };
        Event.prototype.raise = function (sender, args) {
            for (var i = 0, cbs = this.$$callbacks.slice(0), scopes = this.$$scopes.slice(0), len = cbs.length; i < len; i++) {
                cbs[i].call(scopes[i], sender, args);
            }
        };
        Event.prototype.raiseAsync = function (sender, args) {
            var _this = this;
            window.setTimeout(function () { return _this.raise(sender, args); }, 1);
        };
        return Event;
    })();
    nullstone.Event = Event;
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var Interface = (function () {
        function Interface(name) {
            Object.defineProperty(this, "name", { value: name, writable: false });
        }
        Interface.prototype.is = function (o) {
            if (!o)
                return false;
            var type = o.constructor;
            while (type) {
                var is = type.$$interfaces;
                if (is && is.indexOf(this) > -1)
                    return true;
                type = nullstone.getTypeParent(type);
            }
            return false;
        };
        Interface.prototype.as = function (o) {
            if (!this.is(o))
                return undefined;
            return o;
        };
        Interface.prototype.mark = function (type) {
            nullstone.addTypeInterfaces(type, this);
            return this;
        };
        return Interface;
    })();
    nullstone.Interface = Interface;
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    nullstone.ICollection_ = new nullstone.Interface("ICollection");
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    nullstone.IEnumerable_ = new nullstone.Interface("IEnumerable");
    nullstone.IEnumerable_.is = function (o) {
        return o && o.getEnumerator && typeof o.getEnumerator === "function";
    };
    nullstone.IEnumerable_.empty = {
        getEnumerator: function (isReverse) {
            return nullstone.IEnumerator_.empty;
        }
    };
    nullstone.IEnumerable_.fromArray = function (arr) {
        return {
            $$arr: arr,
            getEnumerator: function (isReverse) {
                return nullstone.IEnumerator_.fromArray(this.$$arr, isReverse);
            }
        };
    };
    nullstone.IEnumerable_.toArray = function (en) {
        var a = [];
        for (var e = en.getEnumerator(); e.moveNext();) {
            a.push(e.current);
        }
        return a;
    };
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    nullstone.IEnumerator_ = new nullstone.Interface("IEnumerator");
    nullstone.IEnumerator_.empty = {
        current: undefined,
        moveNext: function () {
            return false;
        }
    };
    nullstone.IEnumerator_.fromArray = function (arr, isReverse) {
        var len = arr.length;
        var e = { moveNext: undefined, current: undefined };
        var index;
        if (isReverse) {
            index = len;
            e.moveNext = function () {
                index--;
                if (index < 0) {
                    e.current = undefined;
                    return false;
                }
                e.current = arr[index];
                return true;
            };
        }
        else {
            index = -1;
            e.moveNext = function () {
                index++;
                if (index >= len) {
                    e.current = undefined;
                    return false;
                }
                e.current = arr[index];
                return true;
            };
        }
        return e;
    };
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var IndexedPropertyInfo = (function () {
        function IndexedPropertyInfo() {
        }
        Object.defineProperty(IndexedPropertyInfo.prototype, "propertyType", {
            get: function () {
                return undefined;
            },
            enumerable: true,
            configurable: true
        });
        IndexedPropertyInfo.prototype.getValue = function (ro, index) {
            if (this.GetFunc)
                return this.GetFunc.call(ro, index);
        };
        IndexedPropertyInfo.prototype.setValue = function (ro, index, value) {
            if (this.SetFunc)
                this.SetFunc.call(ro, index, value);
        };
        IndexedPropertyInfo.find = function (typeOrObj) {
            var o = typeOrObj;
            var isType = typeOrObj instanceof Function;
            if (isType)
                o = new typeOrObj();
            if (o instanceof Array) {
                var pi = new IndexedPropertyInfo();
                pi.GetFunc = function (index) {
                    return this[index];
                };
                pi.SetFunc = function (index, value) {
                    this[index] = value;
                };
                return pi;
            }
            var coll = nullstone.ICollection_.as(o);
            if (coll) {
                var pi = new IndexedPropertyInfo();
                pi.GetFunc = function (index) {
                    return this.GetValueAt(index);
                };
                pi.SetFunc = function (index, value) {
                    return this.SetValueAt(index, value);
                };
                return pi;
            }
        };
        return IndexedPropertyInfo;
    })();
    nullstone.IndexedPropertyInfo = IndexedPropertyInfo;
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var Library = (function () {
        function Library(name) {
            this.$$module = null;
            this.$$sourcePath = null;
            this.$$primtypes = {};
            this.$$types = {};
            this.$$loaded = false;
            Object.defineProperty(this, "name", { value: name, writable: false });
            var uri = name;
            if (name.indexOf("http://") !== 0)
                uri = "lib://" + name;
            Object.defineProperty(this, "uri", { value: new nullstone.Uri(uri), writable: false });
        }
        Object.defineProperty(Library.prototype, "sourcePath", {
            get: function () {
                var base = this.$$sourcePath || 'lib/' + this.name + '/dist/' + this.name;
                if (!this.useMin)
                    return base;
                return base + ".min";
            },
            set: function (value) {
                if (value.substr(value.length - 3) === '.js')
                    value = value.substr(0, value.length - 3);
                if (this.useMin && value.substr(value.length - 4) === ".min")
                    value = value.substr(0, value.length - 4);
                this.$$sourcePath = value;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Library.prototype, "rootModule", {
            get: function () {
                return this.$$module = this.$$module || require(this.sourcePath);
            },
            enumerable: true,
            configurable: true
        });
        Library.prototype.loadAsync = function () {
            var _this = this;
            if (!this.$$sourcePath && this.uri.scheme === "http")
                this.$$loaded = true;
            if (this.$$loaded)
                return nullstone.async.resolve(this);
            this.$configModule();
            return nullstone.async.create(function (resolve, reject) {
                require([_this.name], function (rootModule) {
                    _this.$$module = rootModule;
                    _this.$$loaded = true;
                    resolve(_this);
                }, function (err) { return reject(new nullstone.LibraryLoadError(_this, err)); });
            });
        };
        Library.prototype.$configModule = function () {
            var co = {
                paths: {},
                shim: {},
                map: {
                    "*": {}
                }
            };
            var srcPath = this.sourcePath;
            co.paths[this.name] = srcPath;
            co.shim[this.name] = {
                exports: this.exports,
                deps: this.deps
            };
            co.map['*'][srcPath] = this.name;
            require.config(co);
        };
        Library.prototype.resolveType = function (moduleName, name, oresolve) {
            if (!moduleName) {
                oresolve.isPrimitive = true;
                if ((oresolve.type = this.$$primtypes[name]) !== undefined)
                    return true;
                oresolve.isPrimitive = false;
                return (oresolve.type = this.$$types[name]) !== undefined;
            }
            var curModule = this.rootModule;
            oresolve.isPrimitive = false;
            oresolve.type = undefined;
            if (moduleName !== "/") {
                for (var i = 0, tokens = moduleName.substr(1).split('.'); i < tokens.length && !!curModule; i++) {
                    curModule = curModule[tokens[i]];
                }
            }
            if (!curModule)
                return false;
            oresolve.type = curModule[name];
            var type = oresolve.type;
            if (type === undefined)
                return false;
            setTypeUri(type, this.uri);
            return true;
        };
        Library.prototype.add = function (type, name) {
            if (!type)
                throw new Error("A type must be specified when registering '" + name + "'`.");
            name = name || nullstone.getTypeName(type);
            if (!name)
                throw new Error("No type name found.");
            setTypeUri(type, this.uri);
            this.$$types[name] = type;
            return this;
        };
        Library.prototype.addPrimitive = function (type, name) {
            if (!type)
                throw new Error("A type must be specified when registering '" + name + "'`.");
            name = name || nullstone.getTypeName(type);
            if (!name)
                throw new Error("No type name found.");
            setTypeUri(type, this.uri);
            this.$$primtypes[name] = type;
            return this;
        };
        Library.prototype.addEnum = function (enu, name) {
            this.addPrimitive(enu, name);
            Object.defineProperty(enu, "$$enum", { value: true, writable: false });
            enu.name = name;
            return this;
        };
        return Library;
    })();
    nullstone.Library = Library;
    function setTypeUri(type, uri) {
        if (type.$$uri)
            return;
        Object.defineProperty(type, "$$uri", { value: uri.toString(), enumerable: false });
    }
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var LibraryResolver = (function () {
        function LibraryResolver() {
            this.$$libs = {};
            this.libraryCreated = new nullstone.Event();
            this.dirResolver = new nullstone.DirResolver();
        }
        LibraryResolver.prototype.createLibrary = function (uri) {
            return new nullstone.Library(uri);
        };
        LibraryResolver.prototype.loadTypeAsync = function (uri, name) {
            var lib = this.resolve(uri);
            if (!lib)
                return this.dirResolver.loadAsync(uri, name);
            return nullstone.async.create(function (resolve, reject) {
                lib.loadAsync().then(function (lib) {
                    var oresolve = { isPrimitive: false, type: undefined };
                    if (lib.resolveType(null, name, oresolve))
                        resolve(oresolve.type);
                    else
                        resolve(null);
                }, reject);
            });
        };
        LibraryResolver.prototype.resolve = function (uri) {
            var libUri = new nullstone.Uri(uri);
            var scheme = libUri.scheme;
            if (!scheme)
                return null;
            var libName = (scheme === "lib") ? libUri.host : uri;
            var lib = this.$$libs[libName];
            if (!lib) {
                lib = this.$$libs[libName] = this.createLibrary(libName);
                this.$$onLibraryCreated(lib);
            }
            return lib;
        };
        LibraryResolver.prototype.resolveType = function (uri, name, oresolve) {
            var libUri = new nullstone.Uri(uri);
            var scheme = libUri.scheme;
            if (!scheme)
                return this.dirResolver.resolveType(uri, name, oresolve);
            var libName = (scheme === "lib") ? libUri.host : uri;
            var modName = (scheme === "lib") ? libUri.absolutePath : "";
            var lib = this.$$libs[libName];
            if (!lib) {
                lib = this.$$libs[libName] = this.createLibrary(libName);
                this.$$onLibraryCreated(lib);
            }
            return lib.resolveType(modName, name, oresolve);
        };
        LibraryResolver.prototype.$$onLibraryCreated = function (lib) {
            this.libraryCreated.raise(this, Object.freeze({ library: lib }));
        };
        return LibraryResolver;
    })();
    nullstone.LibraryResolver = LibraryResolver;
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var Memoizer = (function () {
        function Memoizer(creator) {
            this.$$cache = {};
            this.$$creator = creator;
        }
        Memoizer.prototype.memoize = function (key) {
            var obj = this.$$cache[key];
            if (!obj)
                this.$$cache[key] = obj = this.$$creator(key);
            return obj;
        };
        return Memoizer;
    })();
    nullstone.Memoizer = Memoizer;
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    function getPropertyDescriptor(obj, name) {
        if (!obj)
            return undefined;
        var type = obj.constructor;
        var propDesc = Object.getOwnPropertyDescriptor(type.prototype, name);
        if (propDesc)
            return propDesc;
        return Object.getOwnPropertyDescriptor(obj, name);
    }
    nullstone.getPropertyDescriptor = getPropertyDescriptor;
    function hasProperty(obj, name) {
        if (!obj)
            return false;
        if (obj.hasOwnProperty(name))
            return true;
        var type = obj.constructor;
        return type.prototype.hasOwnProperty(name);
    }
    nullstone.hasProperty = hasProperty;
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var PropertyInfo = (function () {
        function PropertyInfo() {
        }
        PropertyInfo.prototype.getValue = function (obj) {
            if (this.$$getFunc)
                return this.$$getFunc.call(obj);
        };
        PropertyInfo.prototype.setValue = function (obj, value) {
            if (this.$$setFunc)
                return this.$$setFunc.call(obj, value);
        };
        PropertyInfo.find = function (typeOrObj, name) {
            var o = typeOrObj;
            var isType = typeOrObj instanceof Function;
            if (isType)
                o = new typeOrObj();
            if (!(o instanceof Object))
                return null;
            var nameClosure = name;
            var propDesc = nullstone.getPropertyDescriptor(o, name);
            if (propDesc) {
                var pi = new PropertyInfo();
                pi.name = name;
                pi.$$getFunc = propDesc.get;
                if (!pi.$$getFunc)
                    pi.$$getFunc = function () {
                        return this[nameClosure];
                    };
                pi.$$setFunc = propDesc.set;
                if (!pi.$$setFunc && propDesc.writable)
                    pi.$$setFunc = function (value) {
                        this[nameClosure] = value;
                    };
                return pi;
            }
            var type = isType ? typeOrObj : typeOrObj.constructor;
            var pi = new PropertyInfo();
            pi.name = name;
            pi.$$getFunc = type.prototype["Get" + name];
            pi.$$setFunc = type.prototype["Set" + name];
            return pi;
        };
        return PropertyInfo;
    })();
    nullstone.PropertyInfo = PropertyInfo;
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    function getTypeName(type) {
        var t = type;
        if (!t)
            return "";
        var name = t.name;
        if (name)
            return name;
        var name = t.toString().match(/function ([^\(]+)/)[1];
        Object.defineProperty(t, "name", { enumerable: false, value: name, writable: false });
        return name;
    }
    nullstone.getTypeName = getTypeName;
    function getTypeParent(type) {
        if (type === Object)
            return null;
        var p = type.$$parent;
        if (!p) {
            if (!type.prototype)
                return undefined;
            p = Object.getPrototypeOf(type.prototype).constructor;
            Object.defineProperty(type, "$$parent", { value: p, writable: false });
        }
        return p;
    }
    nullstone.getTypeParent = getTypeParent;
    function addTypeInterfaces(type) {
        var interfaces = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            interfaces[_i - 1] = arguments[_i];
        }
        if (!interfaces)
            return;
        for (var j = 0, len = interfaces.length; j < len; j++) {
            if (!interfaces[j]) {
                console.warn("Registering undefined interface on type.", type);
                break;
            }
        }
        Object.defineProperty(type, "$$interfaces", { value: interfaces, writable: false });
    }
    nullstone.addTypeInterfaces = addTypeInterfaces;
    function doesInheritFrom(t, type) {
        var temp = t;
        while (temp && temp !== type) {
            temp = getTypeParent(temp);
        }
        return temp != null;
    }
    nullstone.doesInheritFrom = doesInheritFrom;
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    (function (UriKind) {
        UriKind[UriKind["RelativeOrAbsolute"] = 0] = "RelativeOrAbsolute";
        UriKind[UriKind["Absolute"] = 1] = "Absolute";
        UriKind[UriKind["Relative"] = 2] = "Relative";
    })(nullstone.UriKind || (nullstone.UriKind = {}));
    var UriKind = nullstone.UriKind;
    var Uri = (function () {
        function Uri(uri, kind) {
            if (typeof uri === "string") {
                this.$$originalString = uri;
                this.$$kind = kind || 0 /* RelativeOrAbsolute */;
            }
            else if (uri instanceof Uri) {
                this.$$originalString = uri.$$originalString;
                this.$$kind = uri.$$kind;
            }
        }
        Object.defineProperty(Uri.prototype, "kind", {
            get: function () {
                return this.$$kind;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Uri.prototype, "host", {
            get: function () {
                var s = this.$$originalString;
                var ind = Math.max(3, s.indexOf("://") + 3);
                var end = s.indexOf("/", ind);
                return (end < 0) ? s.substr(ind) : s.substr(ind, end - ind);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Uri.prototype, "absolutePath", {
            get: function () {
                var s = this.$$originalString;
                var ind = Math.max(3, s.indexOf("://") + 3);
                var start = s.indexOf("/", ind);
                if (start < 0 || start < ind)
                    return "/";
                var qstart = s.indexOf("?", start);
                if (qstart < 0 || qstart < start)
                    return s.substr(start);
                return s.substr(start, qstart - start);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Uri.prototype, "scheme", {
            get: function () {
                var s = this.$$originalString;
                var ind = s.indexOf("://");
                if (ind < 0)
                    return null;
                return s.substr(0, ind);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Uri.prototype, "fragment", {
            get: function () {
                var s = this.$$originalString;
                var ind = s.indexOf("#");
                if (ind < 0)
                    return "";
                return s.substr(ind);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Uri.prototype, "originalString", {
            get: function () {
                return this.$$originalString.toString();
            },
            enumerable: true,
            configurable: true
        });
        Uri.prototype.toString = function () {
            return this.$$originalString.toString();
        };
        Uri.prototype.equals = function (other) {
            return this.$$originalString === other.$$originalString;
        };
        Uri.isNullOrEmpty = function (uri) {
            if (uri == null)
                return true;
            return !uri.$$originalString;
        };
        return Uri;
    })();
    nullstone.Uri = Uri;
    nullstone.registerTypeConverter(Uri, function (val) {
        if (val == null)
            val = "";
        return new Uri(val.toString());
    });
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var TypeManager = (function () {
        function TypeManager(defaultUri, xUri) {
            this.defaultUri = defaultUri;
            this.xUri = xUri;
            this.libResolver = new nullstone.LibraryResolver();
            this.libResolver.resolve(defaultUri).add(Array, "Array");
            this.libResolver.resolve(xUri).addPrimitive(String, "String").addPrimitive(Number, "Number").addPrimitive(Number, "Double").addPrimitive(Date, "Date").addPrimitive(RegExp, "RegExp").addPrimitive(Boolean, "Boolean").addPrimitive(nullstone.Uri, "Uri");
        }
        TypeManager.prototype.resolveLibrary = function (uri) {
            return this.libResolver.resolve(uri || this.defaultUri);
        };
        TypeManager.prototype.loadTypeAsync = function (uri, name) {
            return this.libResolver.loadTypeAsync(uri || this.defaultUri, name);
        };
        TypeManager.prototype.resolveType = function (uri, name, oresolve) {
            oresolve.isPrimitive = false;
            oresolve.type = undefined;
            return this.libResolver.resolveType(uri || this.defaultUri, name, oresolve);
        };
        TypeManager.prototype.add = function (uri, name, type) {
            var lib = this.libResolver.resolve(uri || this.defaultUri);
            if (lib)
                lib.add(type, name);
            return this;
        };
        TypeManager.prototype.addPrimitive = function (uri, name, type) {
            var lib = this.libResolver.resolve(uri || this.defaultUri);
            if (lib)
                lib.addPrimitive(type, name);
            return this;
        };
        TypeManager.prototype.addEnum = function (uri, name, enu) {
            var lib = this.libResolver.resolve(uri || this.defaultUri);
            if (lib)
                lib.addEnum(enu, name);
            return this;
        };
        return TypeManager;
    })();
    nullstone.TypeManager = TypeManager;
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var AggregateError = (function () {
        function AggregateError(errors) {
            this.errors = errors.filter(function (e) { return !!e; });
            Object.freeze(this);
        }
        Object.defineProperty(AggregateError.prototype, "flat", {
            get: function () {
                var flat = [];
                for (var i = 0, errs = this.errors; i < errs.length; i++) {
                    var err = errs[i];
                    if (err instanceof AggregateError) {
                        flat = flat.concat(err.flat);
                    }
                    else {
                        flat.push(err);
                    }
                }
                return flat;
            },
            enumerable: true,
            configurable: true
        });
        return AggregateError;
    })();
    nullstone.AggregateError = AggregateError;
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var DirLoadError = (function () {
        function DirLoadError(path, error) {
            this.path = path;
            this.error = error;
            Object.freeze(this);
        }
        return DirLoadError;
    })();
    nullstone.DirLoadError = DirLoadError;
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var LibraryLoadError = (function () {
        function LibraryLoadError(library, error) {
            this.library = library;
            this.error = error;
            Object.freeze(this);
        }
        return LibraryLoadError;
    })();
    nullstone.LibraryLoadError = LibraryLoadError;
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var markup;
    (function (markup) {
        function finishMarkupExtension(me, prefixResolver, resolver, os) {
            if (!me)
                return me;
            if (typeof me.resolveTypeFields === "function") {
                me.resolveTypeFields(function (full) { return parseType(full, prefixResolver, resolver); });
            }
            if (typeof me.transmute === "function") {
                return me.transmute(os);
            }
            return me;
        }
        markup.finishMarkupExtension = finishMarkupExtension;
        function parseType(full, prefixResolver, resolver) {
            var prefix = null;
            var name = full;
            var ind = name.indexOf(":");
            if (ind > -1) {
                prefix = name.substr(0, ind);
                name = name.substr(ind + 1);
            }
            var uri = prefixResolver.lookupNamespaceURI(prefix);
            var ort = resolver(uri, name);
            return ort.type;
        }
    })(markup = nullstone.markup || (nullstone.markup = {}));
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var markup;
    (function (markup) {
        markup.NO_PARSER = {
            on: function (listener) {
                return markup.NO_PARSER;
            },
            setNamespaces: function (defaultXmlns, xXmlns) {
                return markup.NO_PARSER;
            },
            setExtensionParser: function (parser) {
                return markup.NO_PARSER;
            },
            parse: function (root) {
            },
            skipBranch: function () {
            },
            resolvePrefix: function (prefix) {
                return "";
            },
            walkUpObjects: function () {
                return nullstone.IEnumerator_.empty;
            }
        };
        var oresolve = {
            isPrimitive: false,
            type: Object
        };
        function createMarkupSax(listener) {
            return {
                resolveType: listener.resolveType || (function (uri, name) { return oresolve; }),
                resolveObject: listener.resolveObject || (function (type) { return new (type)(); }),
                resolvePrimitive: listener.resolvePrimitive || (function (type, text) { return new (type)(text); }),
                resolveResources: listener.resolveResources || (function (owner, ownerType) { return new Object(); }),
                branchSkip: listener.branchSkip || (function (root, obj) {
                }),
                object: listener.object || (function (obj, isContent) {
                }),
                objectEnd: listener.objectEnd || (function (obj, isContent, prev) {
                }),
                contentText: listener.contentText || (function (text) {
                }),
                name: listener.name || (function (name) {
                }),
                propertyStart: listener.propertyStart || (function (ownerType, propName) {
                }),
                propertyEnd: listener.propertyEnd || (function (ownerType, propName) {
                }),
                attributeStart: listener.attributeStart || (function (ownerType, attrName) {
                }),
                attributeEnd: listener.attributeEnd || (function (ownerType, attrName, obj) {
                }),
                error: listener.error || (function (e) { return true; }),
                end: listener.end || (function () {
                })
            };
        }
        markup.createMarkupSax = createMarkupSax;
    })(markup = nullstone.markup || (nullstone.markup = {}));
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var markup;
    (function (_markup) {
        var Markup = (function () {
            function Markup(uri) {
                this.uri = new nullstone.Uri(uri);
            }
            Markup.prototype.createParser = function () {
                return _markup.NO_PARSER;
            };
            Markup.prototype.resolve = function (typemgr, customCollector) {
                var resolver = new _markup.MarkupDependencyResolver(typemgr, this.createParser());
                resolver.collect(this.root, customCollector);
                return resolver.resolve();
            };
            Markup.prototype.loadAsync = function () {
                var reqUri = "text!" + this.uri.toString();
                var md = this;
                return nullstone.async.create(function (resolve, reject) {
                    require([reqUri], function (data) {
                        md.setRoot(md.loadRoot(data));
                        resolve(md);
                    }, reject);
                });
            };
            Markup.prototype.loadRoot = function (data) {
                return data;
            };
            Markup.prototype.setRoot = function (markup) {
                this.root = markup;
                return this;
            };
            return Markup;
        })();
        _markup.Markup = Markup;
    })(markup = nullstone.markup || (nullstone.markup = {}));
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var markup;
    (function (markup) {
        var MarkupDependencyResolver = (function () {
            function MarkupDependencyResolver(typeManager, parser) {
                this.typeManager = typeManager;
                this.parser = parser;
                this.$$uris = [];
                this.$$names = [];
                this.$$resolving = [];
            }
            MarkupDependencyResolver.prototype.collect = function (root, customCollector) {
                var _this = this;
                var blank = {};
                var oresolve = {
                    isPrimitive: false,
                    type: Object
                };
                var last = {
                    uri: "",
                    name: "",
                    obj: undefined
                };
                var parse = {
                    resolveType: function (uri, name) {
                        _this.add(uri, name);
                        last.uri = uri;
                        last.name = name;
                        return oresolve;
                    },
                    resolveObject: function (type) {
                        return blank;
                    },
                    objectEnd: function (obj, isContent, prev) {
                        last.obj = obj;
                    },
                    propertyEnd: function (ownerType, propName) {
                    },
                    attributeEnd: function (ownerType, attrName, obj) {
                    }
                };
                if (customCollector) {
                    parse.propertyEnd = function (ownerType, propName) {
                        customCollector(last.uri, last.name, propName, last.obj);
                    };
                    parse.attributeEnd = function (ownerType, attrName, obj) {
                        customCollector(last.uri, last.name, attrName, obj);
                    };
                }
                this.parser.on(parse).parse(root);
            };
            MarkupDependencyResolver.prototype.add = function (uri, name) {
                var uris = this.$$uris;
                var names = this.$$names;
                var ind = uris.indexOf(uri);
                if (ind > -1 && names[ind] === name)
                    return false;
                if (this.$$resolving.indexOf(uri + "/" + name) > -1)
                    return false;
                uris.push(uri);
                names.push(name);
                return true;
            };
            MarkupDependencyResolver.prototype.resolve = function () {
                var as = [];
                for (var i = 0, uris = this.$$uris, names = this.$$names, tm = this.typeManager, resolving = this.$$resolving; i < uris.length; i++) {
                    var uri = uris[i];
                    var name = names[i];
                    resolving.push(uri + "/" + name);
                    as.push(tm.loadTypeAsync(uri, name));
                }
                return nullstone.async.many(as);
            };
            return MarkupDependencyResolver;
        })();
        markup.MarkupDependencyResolver = MarkupDependencyResolver;
    })(markup = nullstone.markup || (nullstone.markup = {}));
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var markup;
    (function (markup) {
        var xaml;
        (function (xaml) {
            var XamlExtensionParser = (function () {
                function XamlExtensionParser() {
                    this.$$defaultXmlns = "http://schemas.wsick.com/fayde";
                    this.$$xXmlns = "http://schemas.wsick.com/fayde/x";
                }
                XamlExtensionParser.prototype.setNamespaces = function (defaultXmlns, xXmlns) {
                    this.$$defaultXmlns = defaultXmlns;
                    this.$$xXmlns = xXmlns;
                    return this;
                };
                XamlExtensionParser.prototype.parse = function (value, resolver, os) {
                    if (!isAlpha(value[1]))
                        return value;
                    this.$$ensure();
                    var ctx = {
                        text: value,
                        i: 1,
                        acc: "",
                        error: "",
                        resolver: resolver
                    };
                    var obj = this.$$doParse(ctx, os);
                    if (ctx.error)
                        this.$$onError(ctx.error);
                    obj = markup.finishMarkupExtension(obj, resolver, this.$$onResolveType, os);
                    return obj;
                };
                XamlExtensionParser.prototype.$$doParse = function (ctx, os) {
                    if (!this.$$parseName(ctx))
                        return undefined;
                    this.$$startExtension(ctx, os);
                    while (ctx.i < ctx.text.length) {
                        if (!this.$$parseKeyValue(ctx, os))
                            break;
                        if (ctx.text[ctx.i] === "}") {
                            break;
                        }
                    }
                    return os.pop();
                };
                XamlExtensionParser.prototype.$$parseName = function (ctx) {
                    var ind = ctx.text.indexOf(" ", ctx.i);
                    if (ind > ctx.i) {
                        ctx.acc = ctx.text.substr(ctx.i, ind - ctx.i);
                        ctx.i = ind + 1;
                        return true;
                    }
                    ind = ctx.text.indexOf("}", ctx.i);
                    if (ind > ctx.i) {
                        ctx.acc = ctx.text.substr(ctx.i, ind - ctx.i);
                        ctx.i = ind;
                        return true;
                    }
                    ctx.error = "Missing closing bracket.";
                    return false;
                };
                XamlExtensionParser.prototype.$$startExtension = function (ctx, os) {
                    var full = ctx.acc;
                    var ind = full.indexOf(":");
                    var prefix = (ind < 0) ? null : full.substr(0, ind);
                    var name = (ind < 0) ? full : full.substr(ind + 1);
                    var uri = prefix ? ctx.resolver.lookupNamespaceURI(prefix) : xaml.DEFAULT_XMLNS;
                    var obj;
                    if (uri === this.$$xXmlns) {
                        if (name === "Null")
                            obj = this.$$parseXNull(ctx);
                        else if (name === "Type")
                            obj = this.$$parseXType(ctx);
                        else if (name === "Static")
                            obj = this.$$parseXStatic(ctx);
                        else
                            throw new Error("Unknown markup extension. [" + prefix + ":" + name + "]");
                    }
                    else {
                        var ort = this.$$onResolveType(uri, name);
                        obj = this.$$onResolveObject(ort.type);
                    }
                    os.push(obj);
                };
                XamlExtensionParser.prototype.$$parseXNull = function (ctx) {
                    var ind = ctx.text.indexOf("}", ctx.i);
                    if (ind < ctx.i)
                        throw new Error("Unterminated string constant.");
                    ctx.i = ind;
                    return null;
                };
                XamlExtensionParser.prototype.$$parseXType = function (ctx) {
                    var end = ctx.text.indexOf("}", ctx.i);
                    if (end < ctx.i)
                        throw new Error("Unterminated string constant.");
                    var val = ctx.text.substr(ctx.i, end - ctx.i);
                    ctx.i = end;
                    var ind = val.indexOf(":");
                    var prefix = (ind < 0) ? null : val.substr(0, ind);
                    var name = (ind < 0) ? val : val.substr(ind + 1);
                    var uri = ctx.resolver.lookupNamespaceURI(prefix);
                    var ort = this.$$onResolveType(uri, name);
                    return ort.type;
                };
                XamlExtensionParser.prototype.$$parseXStatic = function (ctx) {
                    var text = ctx.text;
                    var len = text.length;
                    var start = ctx.i;
                    for (; ctx.i < len; ctx.i++) {
                        if (text[ctx.i] === "}" && text[ctx.i - 1] !== "\\")
                            break;
                    }
                    var val = text.substr(start, ctx.i - start);
                    var func = new Function("return (" + val + ");");
                    return func();
                };
                XamlExtensionParser.prototype.$$parseKeyValue = function (ctx, os) {
                    var text = ctx.text;
                    ctx.acc = "";
                    var key = "";
                    var val = undefined;
                    var len = text.length;
                    var nonalpha = false;
                    for (; ctx.i < len; ctx.i++) {
                        var cur = text[ctx.i];
                        if (cur === "\\") {
                            ctx.i++;
                            ctx.acc += text[ctx.i];
                        }
                        else if (cur === "{") {
                            if (nonalpha || !isAlpha(text[ctx.i + 1])) {
                                ctx.acc += cur;
                                nonalpha = true;
                                continue;
                            }
                            if (!key) {
                                ctx.error = "A sub extension must be set to a key.";
                                return false;
                            }
                            ctx.i++;
                            val = this.$$doParse(ctx, os);
                            if (ctx.error)
                                return false;
                        }
                        else if (cur === "=") {
                            key = ctx.acc.trim();
                            ctx.acc = "";
                        }
                        else if (cur === "}") {
                            if (nonalpha) {
                                nonalpha = false;
                                ctx.acc += cur;
                            }
                            this.$$finishKeyValue(ctx, key, val, os);
                            return true;
                        }
                        else if (cur === ",") {
                            ctx.i++;
                            this.$$finishKeyValue(ctx, key, val, os);
                            return true;
                        }
                        else if (key && !ctx.acc && cur === "'") {
                            ctx.i++;
                            this.$$parseSingleQuoted(ctx);
                            val = ctx.acc;
                            ctx.acc = "";
                        }
                        else {
                            ctx.acc += cur;
                        }
                    }
                    throw new Error("Unterminated string constant.");
                };
                XamlExtensionParser.prototype.$$finishKeyValue = function (ctx, key, val, os) {
                    if (val === undefined) {
                        if (!(val = ctx.acc.trim()))
                            return;
                    }
                    val = markup.finishMarkupExtension(val, ctx.resolver, this.$$onResolveType, os);
                    var co = os[os.length - 1];
                    if (!key) {
                        co.init && co.init(val);
                    }
                    else {
                        co[key] = val;
                    }
                };
                XamlExtensionParser.prototype.$$parseSingleQuoted = function (ctx) {
                    var text = ctx.text;
                    var len = text.length;
                    for (; ctx.i < len; ctx.i++) {
                        var cur = text[ctx.i];
                        if (cur === "\\") {
                            ctx.i++;
                            ctx.acc += text[ctx.i];
                        }
                        else if (cur === "'") {
                            return;
                        }
                        else {
                            ctx.acc += cur;
                        }
                    }
                };
                XamlExtensionParser.prototype.$$ensure = function () {
                    this.onResolveType(this.$$onResolveType).onResolveObject(this.$$onResolveObject).onError(this.$$onError);
                };
                XamlExtensionParser.prototype.onResolveType = function (cb) {
                    var oresolve = {
                        isPrimitive: false,
                        type: Object
                    };
                    this.$$onResolveType = cb || (function (xmlns, name) { return oresolve; });
                    return this;
                };
                XamlExtensionParser.prototype.onResolveObject = function (cb) {
                    this.$$onResolveObject = cb || (function (type) { return new type(); });
                    return this;
                };
                XamlExtensionParser.prototype.onResolvePrimitive = function (cb) {
                    this.$$onResolvePrimitive = cb || (function (type, text) { return new type(text); });
                    return this;
                };
                XamlExtensionParser.prototype.onError = function (cb) {
                    this.$$onError = cb || (function (e) {
                    });
                    return this;
                };
                return XamlExtensionParser;
            })();
            xaml.XamlExtensionParser = XamlExtensionParser;
            function isAlpha(c) {
                if (!c)
                    return false;
                var code = c[0].toUpperCase().charCodeAt(0);
                return code >= 65 && code <= 90;
            }
        })(xaml = markup.xaml || (markup.xaml = {}));
    })(markup = nullstone.markup || (nullstone.markup = {}));
})(nullstone || (nullstone = {}));
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var nullstone;
(function (nullstone) {
    var markup;
    (function (markup) {
        var xaml;
        (function (xaml) {
            var parser = new DOMParser();
            var xcache = new nullstone.Memoizer(function (key) { return new XamlMarkup(key); });
            var XamlMarkup = (function (_super) {
                __extends(XamlMarkup, _super);
                function XamlMarkup() {
                    _super.apply(this, arguments);
                }
                XamlMarkup.create = function (uri) {
                    return xcache.memoize(uri.toString());
                };
                XamlMarkup.prototype.createParser = function () {
                    return new xaml.XamlParser();
                };
                XamlMarkup.prototype.loadRoot = function (data) {
                    var doc = parser.parseFromString(data, "text/xml");
                    return doc.documentElement;
                };
                return XamlMarkup;
            })(markup.Markup);
            xaml.XamlMarkup = XamlMarkup;
        })(xaml = markup.xaml || (markup.xaml = {}));
    })(markup = nullstone.markup || (nullstone.markup = {}));
})(nullstone || (nullstone = {}));
var nullstone;
(function (nullstone) {
    var markup;
    (function (markup) {
        var xaml;
        (function (xaml) {
            xaml.DEFAULT_XMLNS = "http://schemas.wsick.com/fayde";
            xaml.DEFAULT_XMLNS_X = "http://schemas.wsick.com/fayde/x";
            var ERROR_XMLNS = "http://www.w3.org/1999/xhtml";
            var ERROR_NAME = "parsererror";
            var XamlParser = (function () {
                function XamlParser() {
                    this.$$onEnd = null;
                    this.$$objectStack = [];
                    this.$$skipnext = false;
                    this.$$curel = null;
                    this.$$curkey = undefined;
                    this.setExtensionParser(new xaml.XamlExtensionParser()).setNamespaces(xaml.DEFAULT_XMLNS, xaml.DEFAULT_XMLNS_X).on({});
                }
                XamlParser.prototype.on = function (listener) {
                    listener = markup.createMarkupSax(listener);
                    this.$$onResolveType = listener.resolveType;
                    this.$$onResolveObject = listener.resolveObject;
                    this.$$onResolvePrimitive = listener.resolvePrimitive;
                    this.$$onResolveResources = listener.resolveResources;
                    this.$$onBranchSkip = listener.branchSkip;
                    this.$$onObject = listener.object;
                    this.$$onObjectEnd = listener.objectEnd;
                    this.$$onContentText = listener.contentText;
                    this.$$onName = listener.name;
                    this.$$onPropertyStart = listener.propertyStart;
                    this.$$onPropertyEnd = listener.propertyEnd;
                    this.$$onAttributeStart = listener.attributeStart;
                    this.$$onAttributeEnd = listener.attributeEnd;
                    this.$$onError = listener.error;
                    this.$$onEnd = listener.end;
                    if (this.$$extension) {
                        this.$$extension.onResolveType(this.$$onResolveType).onResolveObject(this.$$onResolveObject).onResolvePrimitive(this.$$onResolvePrimitive);
                    }
                    return this;
                };
                XamlParser.prototype.setNamespaces = function (defaultXmlns, xXmlns) {
                    this.$$defaultXmlns = defaultXmlns;
                    this.$$xXmlns = xXmlns;
                    if (this.$$extension)
                        this.$$extension.setNamespaces(this.$$defaultXmlns, this.$$xXmlns);
                    return this;
                };
                XamlParser.prototype.setExtensionParser = function (parser) {
                    this.$$extension = parser;
                    if (parser) {
                        parser.setNamespaces(this.$$defaultXmlns, this.$$xXmlns).onResolveType(this.$$onResolveType).onResolveObject(this.$$onResolveObject).onResolvePrimitive(this.$$onResolvePrimitive).onError(function (e) {
                            throw e;
                        });
                    }
                    return this;
                };
                XamlParser.prototype.parse = function (el) {
                    if (!this.$$extension)
                        throw new Error("No extension parser exists on parser.");
                    this.$$handleElement(el, true);
                    this.$$destroy();
                    return this;
                };
                XamlParser.prototype.skipBranch = function () {
                    this.$$skipnext = true;
                };
                XamlParser.prototype.walkUpObjects = function () {
                    var os = this.$$objectStack;
                    var i = os.length;
                    return {
                        current: undefined,
                        moveNext: function () {
                            i--;
                            return (this.current = os[i]) !== undefined;
                        }
                    };
                };
                XamlParser.prototype.resolvePrefix = function (prefix) {
                    return this.$$curel.lookupNamespaceURI(prefix);
                };
                XamlParser.prototype.$$handleElement = function (el, isContent) {
                    var old = this.$$curel;
                    this.$$curel = el;
                    var name = el.localName;
                    var xmlns = el.namespaceURI;
                    if (this.$$tryHandleError(el, xmlns, name) || this.$$tryHandlePropertyTag(el, xmlns, name)) {
                        this.$$curel = old;
                        return;
                    }
                    var os = this.$$objectStack;
                    var ort = this.$$onResolveType(xmlns, name);
                    if (this.$$tryHandlePrimitive(el, ort, isContent)) {
                        this.$$curel = old;
                        return;
                    }
                    var obj = this.$$onResolveObject(ort.type);
                    if (obj !== undefined) {
                        os.push(obj);
                        this.$$onObject(obj, isContent);
                    }
                    var resEl = findResourcesElement(el, xmlns, name);
                    if (resEl)
                        this.$$handleResources(obj, ort.type, resEl);
                    this.$$curkey = undefined;
                    this.$$processAttributes(el);
                    var key = this.$$curkey;
                    if (this.$$skipnext) {
                        this.$$skipnext = false;
                        os.pop();
                        this.$$onObjectEnd(obj, key, isContent, os[os.length - 1]);
                        this.$$onBranchSkip(el.firstElementChild, obj);
                        this.$$curel = old;
                        return;
                    }
                    var child = el.firstElementChild;
                    var hasChildren = !!child;
                    while (child) {
                        if (!resEl || child !== resEl)
                            this.$$handleElement(child, true);
                        child = child.nextElementSibling;
                    }
                    if (!hasChildren) {
                        var text = el.textContent;
                        if (text && (text = text.trim()))
                            this.$$onContentText(text);
                    }
                    if (obj !== undefined) {
                        os.pop();
                        this.$$onObjectEnd(obj, key, isContent, os[os.length - 1]);
                    }
                    this.$$curel = old;
                };
                XamlParser.prototype.$$handleResources = function (owner, ownerType, resEl) {
                    var os = this.$$objectStack;
                    var rd = this.$$onResolveResources(owner, ownerType);
                    os.push(rd);
                    this.$$onObject(rd, false);
                    var child = resEl.firstElementChild;
                    while (child) {
                        this.$$handleElement(child, true);
                        child = child.nextElementSibling;
                    }
                    os.pop();
                    this.$$onObjectEnd(rd, undefined, false, os[os.length - 1]);
                };
                XamlParser.prototype.$$tryHandleError = function (el, xmlns, name) {
                    if (xmlns !== ERROR_XMLNS || name !== ERROR_NAME)
                        return false;
                    this.$$onError(new Error(el.textContent));
                    return true;
                };
                XamlParser.prototype.$$tryHandlePropertyTag = function (el, xmlns, name) {
                    var ind = name.indexOf('.');
                    if (ind < 0)
                        return false;
                    var ort = this.$$onResolveType(xmlns, name.substr(0, ind));
                    var type = ort.type;
                    name = name.substr(ind + 1);
                    this.$$onPropertyStart(type, name);
                    var child = el.firstElementChild;
                    while (child) {
                        this.$$handleElement(child, false);
                        child = child.nextElementSibling;
                    }
                    this.$$onPropertyEnd(type, name);
                    return true;
                };
                XamlParser.prototype.$$tryHandlePrimitive = function (el, oresolve, isContent) {
                    if (!oresolve.isPrimitive)
                        return false;
                    var text = el.textContent;
                    var obj = this.$$onResolvePrimitive(oresolve.type, text ? text.trim() : "");
                    this.$$onObject(obj, isContent);
                    this.$$curkey = undefined;
                    this.$$processAttributes(el);
                    var key = this.$$curkey;
                    var os = this.$$objectStack;
                    this.$$onObjectEnd(obj, key, isContent, os[os.length - 1]);
                    return true;
                };
                XamlParser.prototype.$$processAttributes = function (el) {
                    for (var i = 0, attrs = el.attributes, len = attrs.length; i < len; i++) {
                        this.$$processAttribute(attrs[i]);
                    }
                };
                XamlParser.prototype.$$processAttribute = function (attr) {
                    var prefix = attr.prefix;
                    var name = attr.localName;
                    if (this.$$shouldSkipAttr(prefix, name))
                        return true;
                    var uri = attr.namespaceURI;
                    var value = attr.value;
                    if (this.$$tryHandleXAttribute(uri, name, value))
                        return true;
                    return this.$$handleAttribute(uri, name, value, attr);
                };
                XamlParser.prototype.$$shouldSkipAttr = function (prefix, name) {
                    if (prefix === "xmlns")
                        return true;
                    return (!prefix && name === "xmlns");
                };
                XamlParser.prototype.$$tryHandleXAttribute = function (uri, name, value) {
                    if (uri !== this.$$xXmlns)
                        return false;
                    if (name === "Name")
                        this.$$onName(value);
                    if (name === "Key")
                        this.$$curkey = value;
                    return true;
                };
                XamlParser.prototype.$$handleAttribute = function (uri, name, value, attr) {
                    var type = null;
                    var name = name;
                    var ind = name.indexOf('.');
                    if (ind > -1) {
                        var ort = this.$$onResolveType(uri, name.substr(0, ind));
                        type = ort.type;
                        name = name.substr(ind + 1);
                    }
                    this.$$onAttributeStart(type, name);
                    var val = this.$$getAttrValue(value, attr);
                    this.$$onAttributeEnd(type, name, val);
                    return true;
                };
                XamlParser.prototype.$$getAttrValue = function (val, attr) {
                    if (val[0] !== "{")
                        return val;
                    return this.$$extension.parse(val, attr, this.$$objectStack);
                };
                XamlParser.prototype.$$destroy = function () {
                    this.$$onEnd && this.$$onEnd();
                };
                return XamlParser;
            })();
            xaml.XamlParser = XamlParser;
            function findResourcesElement(ownerEl, uri, name) {
                var expected = name + ".Resources";
                var child = ownerEl.firstElementChild;
                while (child) {
                    if (child.localName === expected && child.namespaceURI === uri)
                        return child;
                    child = child.nextElementSibling;
                }
                return null;
            }
        })(xaml = markup.xaml || (markup.xaml = {}));
    })(markup = nullstone.markup || (nullstone.markup = {}));
})(nullstone || (nullstone = {}));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9WZXJzaW9uLnRzIiwiYW5ub3RhdGlvbnMudHMiLCJhc3luYy50cyIsImNvbnZlcnNpb24udHMiLCJEaXJSZXNvbHZlci50cyIsIkVudW0udHMiLCJlcXVhbHMudHMiLCJFdmVudC50cyIsIkludGVyZmFjZS50cyIsIklDb2xsZWN0aW9uLnRzIiwiSUVudW1lcmFibGUudHMiLCJJRW51bWVyYXRvci50cyIsIkluZGV4ZWRQcm9wZXJ0eUluZm8udHMiLCJMaWJyYXJ5LnRzIiwiTGlicmFyeVJlc29sdmVyLnRzIiwiTWVtb2l6ZXIudHMiLCJQcm9wZXJ0eS50cyIsIlByb3BlcnR5SW5mby50cyIsIlR5cGUudHMiLCJVcmkudHMiLCJUeXBlTWFuYWdlci50cyIsImVycm9ycy9BZ2dyZWdhdGVFcnJvci50cyIsImVycm9ycy9EaXJMb2FkRXJyb3IudHMiLCJlcnJvcnMvTGlicmFyeUxvYWRFcnJvci50cyIsIm1hcmt1cC9JTWFya3VwRXh0ZW5zaW9uLnRzIiwibWFya3VwL0lNYXJrdXBQYXJzZXIudHMiLCJtYXJrdXAvTWFya3VwLnRzIiwibWFya3VwL01hcmt1cERlcGVuZGVuY3lSZXNvbHZlci50cyIsIm1hcmt1cC94YW1sL1hhbWxFeHRlbnNpb25QYXJzZXIudHMiLCJtYXJrdXAveGFtbC9YYW1sTWFya3VwLnRzIiwibWFya3VwL3hhbWwvWGFtbFBhcnNlci50cyJdLCJuYW1lcyI6WyJudWxsc3RvbmUiLCJudWxsc3RvbmUuQW5ub3RhdGlvbiIsIm51bGxzdG9uZS5HZXRBbm5vdGF0aW9ucyIsIm51bGxzdG9uZS5DcmVhdGVUeXBlZEFubm90YXRpb24iLCJudWxsc3RvbmUuQ3JlYXRlVHlwZWRBbm5vdGF0aW9uLnRhIiwibnVsbHN0b25lLmFzeW5jIiwibnVsbHN0b25lLmFzeW5jLmNyZWF0ZSIsIm51bGxzdG9uZS5hc3luYy5jcmVhdGUucmVzb2x2ZSIsIm51bGxzdG9uZS5hc3luYy5jcmVhdGUucmVqZWN0IiwibnVsbHN0b25lLmFzeW5jLnJlc29sdmUiLCJudWxsc3RvbmUuYXN5bmMucmVqZWN0IiwibnVsbHN0b25lLmFzeW5jLm1hbnkiLCJudWxsc3RvbmUuYXN5bmMubWFueS5jb21wbGV0ZVNpbmdsZSIsIm51bGxzdG9uZS5jb252ZXJ0QW55VG9UeXBlIiwibnVsbHN0b25lLmNvbnZlcnRTdHJpbmdUb0VudW0iLCJudWxsc3RvbmUucmVnaXN0ZXJUeXBlQ29udmVydGVyIiwibnVsbHN0b25lLnJlZ2lzdGVyRW51bUNvbnZlcnRlciIsIm51bGxzdG9uZS5EaXJSZXNvbHZlciIsIm51bGxzdG9uZS5EaXJSZXNvbHZlci5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5EaXJSZXNvbHZlci5sb2FkQXN5bmMiLCJudWxsc3RvbmUuRGlyUmVzb2x2ZXIucmVzb2x2ZVR5cGUiLCJudWxsc3RvbmUuRW51bSIsIm51bGxzdG9uZS5FbnVtLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLkVudW0uZnJvbUFueSIsIm51bGxzdG9uZS5lcXVhbHMiLCJudWxsc3RvbmUuRXZlbnQiLCJudWxsc3RvbmUuRXZlbnQuY29uc3RydWN0b3IiLCJudWxsc3RvbmUuRXZlbnQuaGFzIiwibnVsbHN0b25lLkV2ZW50Lm9uIiwibnVsbHN0b25lLkV2ZW50Lm9mZiIsIm51bGxzdG9uZS5FdmVudC5yYWlzZSIsIm51bGxzdG9uZS5FdmVudC5yYWlzZUFzeW5jIiwibnVsbHN0b25lLkludGVyZmFjZSIsIm51bGxzdG9uZS5JbnRlcmZhY2UuY29uc3RydWN0b3IiLCJudWxsc3RvbmUuSW50ZXJmYWNlLmlzIiwibnVsbHN0b25lLkludGVyZmFjZS5hcyIsIm51bGxzdG9uZS5JbnRlcmZhY2UubWFyayIsImdldEVudW1lcmF0b3IiLCJudWxsc3RvbmUubW92ZU5leHQiLCJudWxsc3RvbmUuSW5kZXhlZFByb3BlcnR5SW5mbyIsIm51bGxzdG9uZS5JbmRleGVkUHJvcGVydHlJbmZvLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLkluZGV4ZWRQcm9wZXJ0eUluZm8ucHJvcGVydHlUeXBlIiwibnVsbHN0b25lLkluZGV4ZWRQcm9wZXJ0eUluZm8uZ2V0VmFsdWUiLCJudWxsc3RvbmUuSW5kZXhlZFByb3BlcnR5SW5mby5zZXRWYWx1ZSIsIm51bGxzdG9uZS5JbmRleGVkUHJvcGVydHlJbmZvLmZpbmQiLCJudWxsc3RvbmUuTGlicmFyeSIsIm51bGxzdG9uZS5MaWJyYXJ5LmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLkxpYnJhcnkuc291cmNlUGF0aCIsIm51bGxzdG9uZS5MaWJyYXJ5LnJvb3RNb2R1bGUiLCJudWxsc3RvbmUuTGlicmFyeS5sb2FkQXN5bmMiLCJudWxsc3RvbmUuTGlicmFyeS4kY29uZmlnTW9kdWxlIiwibnVsbHN0b25lLkxpYnJhcnkucmVzb2x2ZVR5cGUiLCJudWxsc3RvbmUuTGlicmFyeS5hZGQiLCJudWxsc3RvbmUuTGlicmFyeS5hZGRQcmltaXRpdmUiLCJudWxsc3RvbmUuTGlicmFyeS5hZGRFbnVtIiwibnVsbHN0b25lLnNldFR5cGVVcmkiLCJudWxsc3RvbmUuTGlicmFyeVJlc29sdmVyIiwibnVsbHN0b25lLkxpYnJhcnlSZXNvbHZlci5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5MaWJyYXJ5UmVzb2x2ZXIuY3JlYXRlTGlicmFyeSIsIm51bGxzdG9uZS5MaWJyYXJ5UmVzb2x2ZXIubG9hZFR5cGVBc3luYyIsIm51bGxzdG9uZS5MaWJyYXJ5UmVzb2x2ZXIucmVzb2x2ZSIsIm51bGxzdG9uZS5MaWJyYXJ5UmVzb2x2ZXIucmVzb2x2ZVR5cGUiLCJudWxsc3RvbmUuTGlicmFyeVJlc29sdmVyLiQkb25MaWJyYXJ5Q3JlYXRlZCIsIm51bGxzdG9uZS5NZW1vaXplciIsIm51bGxzdG9uZS5NZW1vaXplci5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5NZW1vaXplci5tZW1vaXplIiwibnVsbHN0b25lLmdldFByb3BlcnR5RGVzY3JpcHRvciIsIm51bGxzdG9uZS5oYXNQcm9wZXJ0eSIsIm51bGxzdG9uZS5Qcm9wZXJ0eUluZm8iLCJudWxsc3RvbmUuUHJvcGVydHlJbmZvLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLlByb3BlcnR5SW5mby5nZXRWYWx1ZSIsIm51bGxzdG9uZS5Qcm9wZXJ0eUluZm8uc2V0VmFsdWUiLCJudWxsc3RvbmUuUHJvcGVydHlJbmZvLmZpbmQiLCJudWxsc3RvbmUuZ2V0VHlwZU5hbWUiLCJudWxsc3RvbmUuZ2V0VHlwZVBhcmVudCIsIm51bGxzdG9uZS5hZGRUeXBlSW50ZXJmYWNlcyIsIm51bGxzdG9uZS5kb2VzSW5oZXJpdEZyb20iLCJudWxsc3RvbmUuVXJpS2luZCIsIm51bGxzdG9uZS5VcmkiLCJudWxsc3RvbmUuVXJpLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLlVyaS5raW5kIiwibnVsbHN0b25lLlVyaS5ob3N0IiwibnVsbHN0b25lLlVyaS5hYnNvbHV0ZVBhdGgiLCJudWxsc3RvbmUuVXJpLnNjaGVtZSIsIm51bGxzdG9uZS5VcmkuZnJhZ21lbnQiLCJudWxsc3RvbmUuVXJpLm9yaWdpbmFsU3RyaW5nIiwibnVsbHN0b25lLlVyaS50b1N0cmluZyIsIm51bGxzdG9uZS5VcmkuZXF1YWxzIiwibnVsbHN0b25lLlVyaS5pc051bGxPckVtcHR5IiwibnVsbHN0b25lLlR5cGVNYW5hZ2VyIiwibnVsbHN0b25lLlR5cGVNYW5hZ2VyLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLlR5cGVNYW5hZ2VyLnJlc29sdmVMaWJyYXJ5IiwibnVsbHN0b25lLlR5cGVNYW5hZ2VyLmxvYWRUeXBlQXN5bmMiLCJudWxsc3RvbmUuVHlwZU1hbmFnZXIucmVzb2x2ZVR5cGUiLCJudWxsc3RvbmUuVHlwZU1hbmFnZXIuYWRkIiwibnVsbHN0b25lLlR5cGVNYW5hZ2VyLmFkZFByaW1pdGl2ZSIsIm51bGxzdG9uZS5UeXBlTWFuYWdlci5hZGRFbnVtIiwibnVsbHN0b25lLkFnZ3JlZ2F0ZUVycm9yIiwibnVsbHN0b25lLkFnZ3JlZ2F0ZUVycm9yLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLkFnZ3JlZ2F0ZUVycm9yLmZsYXQiLCJudWxsc3RvbmUuRGlyTG9hZEVycm9yIiwibnVsbHN0b25lLkRpckxvYWRFcnJvci5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5MaWJyYXJ5TG9hZEVycm9yIiwibnVsbHN0b25lLkxpYnJhcnlMb2FkRXJyb3IuY29uc3RydWN0b3IiLCJudWxsc3RvbmUubWFya3VwIiwibnVsbHN0b25lLm1hcmt1cC5maW5pc2hNYXJrdXBFeHRlbnNpb24iLCJudWxsc3RvbmUubWFya3VwLnBhcnNlVHlwZSIsIm51bGxzdG9uZS5tYXJrdXAub24iLCJudWxsc3RvbmUubWFya3VwLnNldE5hbWVzcGFjZXMiLCJudWxsc3RvbmUubWFya3VwLnNldEV4dGVuc2lvblBhcnNlciIsIm51bGxzdG9uZS5tYXJrdXAucGFyc2UiLCJudWxsc3RvbmUubWFya3VwLnNraXBCcmFuY2giLCJudWxsc3RvbmUubWFya3VwLnJlc29sdmVQcmVmaXgiLCJudWxsc3RvbmUubWFya3VwLndhbGtVcE9iamVjdHMiLCJudWxsc3RvbmUubWFya3VwLmNyZWF0ZU1hcmt1cFNheCIsIm51bGxzdG9uZS5tYXJrdXAuTWFya3VwIiwibnVsbHN0b25lLm1hcmt1cC5NYXJrdXAuY29uc3RydWN0b3IiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cC5jcmVhdGVQYXJzZXIiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cC5yZXNvbHZlIiwibnVsbHN0b25lLm1hcmt1cC5NYXJrdXAubG9hZEFzeW5jIiwibnVsbHN0b25lLm1hcmt1cC5NYXJrdXAubG9hZFJvb3QiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cC5zZXRSb290IiwibnVsbHN0b25lLm1hcmt1cC5NYXJrdXBEZXBlbmRlbmN5UmVzb2x2ZXIiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cERlcGVuZGVuY3lSZXNvbHZlci5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5tYXJrdXAuTWFya3VwRGVwZW5kZW5jeVJlc29sdmVyLmNvbGxlY3QiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cERlcGVuZGVuY3lSZXNvbHZlci5hZGQiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cERlcGVuZGVuY3lSZXNvbHZlci5yZXNvbHZlIiwibnVsbHN0b25lLm1hcmt1cC54YW1sIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxFeHRlbnNpb25QYXJzZXIiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLnNldE5hbWVzcGFjZXMiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci5wYXJzZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkZG9QYXJzZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkcGFyc2VOYW1lIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxFeHRlbnNpb25QYXJzZXIuJCRzdGFydEV4dGVuc2lvbiIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkcGFyc2VYTnVsbCIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkcGFyc2VYVHlwZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkcGFyc2VYU3RhdGljIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxFeHRlbnNpb25QYXJzZXIuJCRwYXJzZUtleVZhbHVlIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxFeHRlbnNpb25QYXJzZXIuJCRmaW5pc2hLZXlWYWx1ZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkcGFyc2VTaW5nbGVRdW90ZWQiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci4kJGVuc3VyZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLm9uUmVzb2x2ZVR5cGUiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci5vblJlc29sdmVPYmplY3QiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci5vblJlc29sdmVQcmltaXRpdmUiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci5vbkVycm9yIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLmlzQWxwaGEiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbE1hcmt1cCIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sTWFya3VwLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxNYXJrdXAuY3JlYXRlIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxNYXJrdXAuY3JlYXRlUGFyc2VyIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxNYXJrdXAubG9hZFJvb3QiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlciIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIub24iLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci5zZXROYW1lc3BhY2VzIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuc2V0RXh0ZW5zaW9uUGFyc2VyIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIucGFyc2UiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci5za2lwQnJhbmNoIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIud2Fsa1VwT2JqZWN0cyIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLndhbGtVcE9iamVjdHMubW92ZU5leHQiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci5yZXNvbHZlUHJlZml4IiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuJCRoYW5kbGVFbGVtZW50IiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuJCRoYW5kbGVSZXNvdXJjZXMiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci4kJHRyeUhhbmRsZUVycm9yIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuJCR0cnlIYW5kbGVQcm9wZXJ0eVRhZyIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLiQkdHJ5SGFuZGxlUHJpbWl0aXZlIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuJCRwcm9jZXNzQXR0cmlidXRlcyIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLiQkcHJvY2Vzc0F0dHJpYnV0ZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLiQkc2hvdWxkU2tpcEF0dHIiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci4kJHRyeUhhbmRsZVhBdHRyaWJ1dGUiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci4kJGhhbmRsZUF0dHJpYnV0ZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLiQkZ2V0QXR0clZhbHVlIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuJCRkZXN0cm95IiwibnVsbHN0b25lLm1hcmt1cC54YW1sLmZpbmRSZXNvdXJjZXNFbGVtZW50Il0sIm1hcHBpbmdzIjoiQUFBQSxJQUFPLFNBQVMsQ0FFZjtBQUZELFdBQU8sU0FBUyxFQUFDLENBQUM7SUFDSEEsaUJBQU9BLEdBQUdBLFFBQVFBLENBQUNBO0FBQ2xDQSxDQUFDQSxFQUZNLFNBQVMsS0FBVCxTQUFTLFFBRWY7QUNGRCxJQUFPLFNBQVMsQ0EwQ2Y7QUExQ0QsV0FBTyxTQUFTLEVBQUMsQ0FBQztJQUtkQSxTQUFnQkEsVUFBVUEsQ0FBRUEsSUFBY0EsRUFBRUEsSUFBWUEsRUFBRUEsS0FBVUEsRUFBRUEsY0FBd0JBO1FBQzFGQyxJQUFJQSxFQUFFQSxHQUFrQkEsSUFBSUEsQ0FBQ0E7UUFDN0JBLElBQUlBLElBQUlBLEdBQVlBLEVBQUVBLENBQUNBLGFBQWFBLENBQUNBO1FBQ3JDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxjQUFjQSxDQUFDQSxFQUFFQSxFQUFFQSxlQUFlQSxFQUFFQSxFQUFDQSxLQUFLQSxFQUFFQSxDQUFDQSxJQUFJQSxHQUFHQSxFQUFFQSxDQUFDQSxFQUFFQSxRQUFRQSxFQUFFQSxLQUFLQSxFQUFDQSxDQUFDQSxDQUFDQTtRQUN0RkEsSUFBSUEsR0FBR0EsR0FBVUEsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7UUFDNUJBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBO1lBQ0xBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBO1FBQzFCQSxFQUFFQSxDQUFDQSxDQUFDQSxjQUFjQSxJQUFJQSxHQUFHQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUNqQ0EsTUFBTUEsSUFBSUEsS0FBS0EsQ0FBQ0EsVUFBVUEsR0FBR0EsSUFBSUEsR0FBR0EsaUNBQWlDQSxHQUFHQSxxQkFBV0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7UUFDdEdBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO0lBQ3BCQSxDQUFDQTtJQVhlRCxvQkFBVUEsR0FBVkEsVUFXZkEsQ0FBQUE7SUFFREEsU0FBZ0JBLGNBQWNBLENBQUVBLElBQWNBLEVBQUVBLElBQVlBO1FBQ3hERSxJQUFJQSxFQUFFQSxHQUFrQkEsSUFBSUEsQ0FBQ0E7UUFDN0JBLElBQUlBLElBQUlBLEdBQVlBLEVBQUVBLENBQUNBLGFBQWFBLENBQUNBO1FBQ3JDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJ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LENBQWdCQSxDQUFDQTtnQkFDakZBLGdCQUFnQkEsRUFBRUEsUUFBUUEsQ0FBQ0EsZ0JBQWdCQSxJQUFJQSxDQUFDQSxVQUFDQSxLQUFLQSxFQUFFQSxTQUFTQSxJQUFLQSxXQUFJQSxNQUFNQSxFQUFFQSxFQUFaQSxDQUFZQSxDQUFDQTtnQkFDbkZBLFVBQVVBLEVBQUVBLFFBQVFBLENBQUNBLFVBQVVBLElBQUlBLENBQUNBLFVBQUNBLElBQUlBLEVBQUVBLEdBQUdBO2dCQUM5Q0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0ZBLE1BQU1BLEVBQUVBLFFBQVFBLENBQUNBLE1BQU1BLElBQUlBLENBQUNBLFVBQUNBLEdBQUdBLEVBQUVBLFNBQVNBO2dCQUMzQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0ZBLFNBQVNBLEVBQUVBLFFBQVFBLENBQUNBLFNBQVNBLElBQUlBLENBQUNBLFVBQUNBLEdBQUdBLEVBQUVBLFNBQVNBLEVBQUVBLElBQUlBO2dCQUN2REEsQ0FBQ0EsQ0FBQ0E7Z0JBQ0ZBLFdBQVdBLEVBQUVBLFFBQVFBLENBQUNBLFdBQVdBLElBQUlBLENBQUNBLFVBQUNBLElBQUlBO2dCQUMzQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0ZBLElBQUlBLEVBQUVBLFFBQVFBLENBQUNBLElBQUlBLElBQUlBLENBQUNBLFVBQUNBLElBQUlBO2dCQUM3QkEsQ0FBQ0EsQ0FBQ0E7Z0JBQ0ZBLGFBQWFBLEVBQUVBLFFBQVFBLENBQUNBLGFBQWFBLElBQUlBLENBQUNBLFVBQUNBLFNBQVNBLEVBQUVBLFFBQVFBO2dCQUM5REEsQ0FBQ0EsQ0FBQ0E7Z0JBQ0ZBLFdBQVdBLEVBQUVBLFFBQVFBLENBQUNBLFdBQVdBLElBQUlBLENBQUNBLFVBQUNBLFNBQVNBLEVBQUVBLFFBQVFBO2dCQUMxREEsQ0FBQ0EsQ0FBQ0E7Z0JBQ0ZBLGNBQWNBLEVBQUVBLFFBQVFBLENBQUNBLGNBQWNBLElBQUlBLENBQUNBLFVBQUNBLFNBQVNBLEVBQUVBLFFBQVFBO2dCQUNoRUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ0ZBLFlBQVlBLEVBQUVBLFFBQVFBLENBQUNBLFlBQVlBLElBQUlBLENBQUNBLFVBQUNBLFNBQVNBLEVBQUVBLFFBQVFBLEVBQUVBLEdBQUdBO2dCQUNqRUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ0ZBLEtBQUtBLEVBQUVBLFFBQVFBLENBQUNBLEtBQUtBLElBQUlBLENBQUNBLFVBQUNBLENBQUNBLElBQUtBLFdBQUlBLEVBQUpBLENBQUlBLENBQUNBO2dCQUN0Q0EsR0FBR0EsRUFBRUEsUUFBUUEsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQ3RCQSxDQUFDQSxDQUFDQTthQUNMQSxDQUFDQTtRQUNOQSxDQUFDQTtRQTVCZVYsc0JBQWVBLEdBQWZBLGVBNEJmQSxDQUFBQTtJQUNMQSxDQUFDQSxFQXJGZ0J4RyxNQUFNQSxHQUFOQSxnQkFBTUEsS0FBTkEsZ0JBQU1BLFFBcUZ0QkE7QUFBREEsQ0FBQ0EsRUFyRk0sU0FBUyxLQUFULFNBQVMsUUFxRmY7QUNyRkQsSUFBTyxTQUFTLENBdUNmO0FBdkNELFdBQU8sU0FBUztJQUFDQSxJQUFBQSxNQUFNQSxDQXVDdEJBO0lBdkNnQkEsV0FBQUEsT0FBTUEsRUFBQ0EsQ0FBQ0E7UUFDckJ3RyxJQUFhQSxNQUFNQTtZQUlmVyxTQUpTQSxNQUFNQSxDQUlGQSxHQUFXQTtnQkFDcEJDLElBQUlBLENBQUNBLEdBQUdBLEdBQUdBLElBQUlBLGFBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQzVCQSxDQUFDQTtZQUVERCw2QkFBWUEsR0FBWkE7Z0JBQ0lFLE1BQU1BLENBQUNBLGlCQUFTQSxDQUFDQTtZQUNyQkEsQ0FBQ0E7WUFFREYsd0JBQU9BLEdBQVBBLFVBQVNBLE9BQXFCQSxFQUFFQSxlQUFrQ0E7Z0JBQzlERyxJQUFJQSxRQUFRQSxHQUFHQSxJQUFJQSxnQ0FBd0JBLENBQUlBLE9BQU9BLEVBQUVBLElBQUlBLENBQUNBLFlBQVlBLEVBQUVBLENBQUNBLENBQUNBO2dCQUM3RUEsUUFBUUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsRUFBRUEsZUFBZUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzdDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxPQUFPQSxFQUFFQSxDQUFDQTtZQUM5QkEsQ0FBQ0E7WUFFREgsMEJBQVNBLEdBQVRBO2dCQUNJSSxJQUFJQSxNQUFNQSxHQUFHQSxPQUFPQSxHQUFHQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQTtnQkFDM0NBLElBQUlBLEVBQUVBLEdBQUdBLElBQUlBLENBQUNBO2dCQUNkQSxNQUFNQSxDQUFDQSxlQUFLQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFDQSxPQUFPQSxFQUFFQSxNQUFNQTtvQkFDckJBLE9BQVFBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLEVBQUVBLFVBQUNBLElBQVlBO3dCQUN2Q0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQzlCQSxPQUFPQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQTtvQkFDaEJBLENBQUNBLEVBQUVBLE1BQU1BLENBQUNBLENBQUNBO2dCQUNmQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNQQSxDQUFDQTtZQUVESix5QkFBUUEsR0FBUkEsVUFBVUEsSUFBWUE7Z0JBQ2xCSyxNQUFNQSxDQUFTQSxJQUFJQSxDQUFDQTtZQUN4QkEsQ0FBQ0E7WUFFREwsd0JBQU9BLEdBQVBBLFVBQVNBLE1BQVNBO2dCQUNkTSxJQUFJQSxDQUFDQSxJQUFJQSxHQUFHQSxNQUFNQSxDQUFDQTtnQkFDbkJBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO1lBQ2hCQSxDQUFDQTtZQUNMTixhQUFDQTtRQUFEQSxDQXJDQVgsQUFxQ0NXLElBQUFYO1FBckNZQSxjQUFNQSxHQUFOQSxNQXFDWkEsQ0FBQUE7SUFDTEEsQ0FBQ0EsRUF2Q2dCeEcsTUFBTUEsR0FBTkEsZ0JBQU1BLEtBQU5BLGdCQUFNQSxRQXVDdEJBO0FBQURBLENBQUNBLEVBdkNNLFNBQVMsS0FBVCxTQUFTLFFBdUNmO0FDdkNELElBQU8sU0FBUyxDQXVGZjtBQXZGRCxXQUFPLFNBQVM7SUFBQ0EsSUFBQUEsTUFBTUEsQ0F1RnRCQTtJQXZGZ0JBLFdBQUFBLE1BQU1BLEVBQUNBLENBQUNBO1FBU3JCd0csSUFBYUEsd0JBQXdCQTtZQUtqQ2tCLFNBTFNBLHdCQUF3QkEsQ0FLYkEsV0FBeUJBLEVBQVNBLE1BQXdCQTtnQkFBMURDLGdCQUFXQSxHQUFYQSxXQUFXQSxDQUFjQTtnQkFBU0EsV0FBTUEsR0FBTkEsTUFBTUEsQ0FBa0JBO2dCQUp0RUEsV0FBTUEsR0FBYUEsRUFBRUEsQ0FBQ0E7Z0JBQ3RCQSxZQUFPQSxHQUFhQSxFQUFFQSxDQUFDQTtnQkFDdkJBLGdCQUFXQSxHQUFhQSxFQUFFQSxDQUFDQTtZQUduQ0EsQ0FBQ0E7WUFFREQsMENBQU9BLEdBQVBBLFVBQVNBLElBQU9BLEVBQUVBLGVBQWtDQTtnQkFBcERFLGlCQTRDQ0E7Z0JBeENHQSxJQUFJQSxLQUFLQSxHQUFHQSxFQUFFQSxDQUFDQTtnQkFDZkEsSUFBSUEsUUFBUUEsR0FBYUE7b0JBQ3JCQSxXQUFXQSxFQUFFQSxLQUFLQTtvQkFDbEJBLElBQUlBLEVBQUVBLE1BQU1BO2lCQUNmQSxDQUFDQTtnQkFDRkEsSUFBSUEsSUFBSUEsR0FBR0E7b0JBQ1BBLEdBQUdBLEVBQUVBLEVBQUVBO29CQUNQQSxJQUFJQSxFQUFFQSxFQUFFQTtvQkFDUkEsR0FBR0EsRUFBRUEsU0FBU0E7aUJBQ2pCQSxDQUFDQTtnQkFDRkEsSUFBSUEsS0FBS0EsR0FBR0E7b0JBQ1JBLFdBQVdBLEVBQUVBLFVBQUNBLEdBQUdBLEVBQUVBLElBQUlBO3dCQUNuQkEsS0FBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7d0JBQ3BCQSxJQUFJQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQTt3QkFDZkEsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7d0JBQ2pCQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQTtvQkFDcEJBLENBQUNBO29CQUNEQSxhQUFhQSxFQUFFQSxVQUFDQSxJQUFJQTt3QkFDaEJBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBO29CQUNqQkEsQ0FBQ0E7b0JBQ0RBLFNBQVNBLEVBQUVBLFVBQUNBLEdBQUdBLEVBQUVBLFNBQVNBLEVBQUVBLElBQUlBO3dCQUM1QkEsSUFBSUEsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0E7b0JBQ25CQSxDQUFDQTtvQkFDREEsV0FBV0EsRUFBRUEsVUFBQ0EsU0FBU0EsRUFBRUEsUUFBUUE7b0JBQ2pDQSxDQUFDQTtvQkFDREEsWUFBWUEsRUFBRUEsVUFBQ0EsU0FBU0EsRUFBRUEsUUFBUUEsRUFBRUEsR0FBR0E7b0JBQ3ZDQSxDQUFDQTtpQkFDSkEsQ0FBQ0E7Z0JBQ0ZBLEVBQUVBLENBQUNBLENBQUNBLGVBQWVBLENBQUNBLENBQUNBLENBQUNBO29CQUNsQkEsS0FBS0EsQ0FBQ0EsV0FBV0EsR0FBR0EsVUFBQ0EsU0FBU0EsRUFBRUEsUUFBUUE7d0JBQ3BDQSxlQUFlQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxFQUFFQSxJQUFJQSxDQUFDQSxJQUFJQSxFQUFFQSxRQUFRQSxFQUFFQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtvQkFDN0RBLENBQUNBLENBQUNBO29CQUNGQSxLQUFLQSxDQUFDQSxZQUFZQSxHQUFHQSxVQUFDQSxTQUFTQSxFQUFFQSxRQUFRQSxFQUFFQSxHQUFHQTt3QkFDMUNBLGVBQWVBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLEVBQUVBLElBQUlBLENBQUNBLElBQUlBLEVBQUVBLFFBQVFBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBO29CQUN4REEsQ0FBQ0EsQ0FBQ0E7Z0JBQ05BLENBQUNBO2dCQUVEQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUNOQSxFQUFFQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUNUQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNyQkEsQ0FBQ0E7WUFFREYsc0NBQUdBLEdBQUhBLFVBQUtBLEdBQVdBLEVBQUVBLElBQVlBO2dCQUMxQkcsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7Z0JBQ3ZCQSxJQUFJQSxLQUFLQSxHQUFHQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQTtnQkFDekJBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUM1QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsS0FBS0EsSUFBSUEsQ0FBQ0E7b0JBQ2hDQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtnQkFDakJBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLE9BQU9BLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO29CQUNoREEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7Z0JBQ2pCQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDZkEsS0FBS0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ2pCQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUNoQkEsQ0FBQ0E7WUFFREgsMENBQU9BLEdBQVBBO2dCQUNJSSxJQUFJQSxFQUFFQSxHQUErQkEsRUFBRUEsQ0FBQ0E7Z0JBQ3hDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxNQUFNQSxFQUFFQSxLQUFLQSxHQUFHQSxJQUFJQSxDQUFDQSxPQUFPQSxFQUFFQSxFQUFFQSxHQUFHQSxJQUFJQSxDQUFDQSxXQUFXQSxFQUFFQSxTQUFTQSxHQUFHQSxJQUFJQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQTtvQkFDbElBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUNsQkEsSUFBSUEsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3BCQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDakNBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLGFBQWFBLENBQUNBLEdBQUdBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO2dCQUN6Q0EsQ0FBQ0E7Z0JBQ0RBLE1BQU1BLENBQUNBLGVBQUtBLENBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBO1lBQzFCQSxDQUFDQTtZQUNMSiwrQkFBQ0E7UUFBREEsQ0E3RUFsQixBQTZFQ2tCLElBQUFsQjtRQTdFWUEsK0JBQXdCQSxHQUF4QkEsd0JBNkVaQSxDQUFBQTtJQUNMQSxDQUFDQSxFQXZGZ0J4RyxNQUFNQSxHQUFOQSxnQkFBTUEsS0FBTkEsZ0JBQU1BLFFBdUZ0QkE7QUFBREEsQ0FBQ0EsRUF2Rk0sU0FBUyxLQUFULFNBQVMsUUF1RmY7QUN2RkQsSUFBTyxTQUFTLENBMFFmO0FBMVFELFdBQU8sU0FBUztJQUFDQSxJQUFBQSxNQUFNQSxDQTBRdEJBO0lBMVFnQkEsV0FBQUEsTUFBTUE7UUFBQ3dHLElBQUFBLElBQUlBLENBMFEzQkE7UUExUXVCQSxXQUFBQSxJQUFJQSxFQUFDQSxDQUFDQTtZQWtCMUJ1QixJQUFhQSxtQkFBbUJBO2dCQUFoQ0MsU0FBYUEsbUJBQW1CQTtvQkFDcEJDLG1CQUFjQSxHQUFHQSxnQ0FBZ0NBLENBQUNBO29CQUNsREEsYUFBUUEsR0FBR0Esa0NBQWtDQSxDQUFDQTtnQkE4TzFEQSxDQUFDQTtnQkF2T0dELDJDQUFhQSxHQUFiQSxVQUFlQSxZQUFvQkEsRUFBRUEsTUFBY0E7b0JBQy9DRSxJQUFJQSxDQUFDQSxjQUFjQSxHQUFHQSxZQUFZQSxDQUFDQTtvQkFDbkNBLElBQUlBLENBQUNBLFFBQVFBLEdBQUdBLE1BQU1BLENBQUNBO29CQUN2QkEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7Z0JBQ2hCQSxDQUFDQTtnQkFFREYsbUNBQUtBLEdBQUxBLFVBQU9BLEtBQWFBLEVBQUVBLFFBQTJCQSxFQUFFQSxFQUFTQTtvQkFDeERHLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLE9BQU9BLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNuQkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7b0JBQ2pCQSxJQUFJQSxDQUFDQSxRQUFRQSxFQUFFQSxDQUFDQTtvQkFDaEJBLElBQUlBLEdBQUdBLEdBQWtCQTt3QkFDckJBLElBQUlBLEVBQUVBLEtBQUtBO3dCQUNYQSxDQUFDQSxFQUFFQSxDQUFDQTt3QkFDSkEsR0FBR0EsRUFBRUEsRUFBRUE7d0JBQ1BBLEtBQUtBLEVBQUVBLEVBQUVBO3dCQUNUQSxRQUFRQSxFQUFFQSxRQUFRQTtxQkFDckJBLENBQUNBO29CQUNGQSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQTtvQkFDbENBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEtBQUtBLENBQUNBO3dCQUNWQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQTtvQkFDOUJBLEdBQUdBLEdBQUdBLDRCQUFxQkEsQ0FBQ0EsR0FBR0EsRUFBRUEsUUFBUUEsRUFBRUEsSUFBSUEsQ0FBQ0EsZUFBZUEsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3JFQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQTtnQkFDZkEsQ0FBQ0E7Z0JBRU9ILHVDQUFTQSxHQUFqQkEsVUFBbUJBLEdBQWtCQSxFQUFFQSxFQUFTQTtvQkFDNUNJLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO3dCQUN2QkEsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0E7b0JBQ3JCQSxJQUFJQSxDQUFDQSxnQkFBZ0JBLENBQUNBLEdBQUdBLEVBQUVBLEVBQUVBLENBQUNBLENBQUNBO29CQUUvQkEsT0FBT0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0E7d0JBQzdCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQSxHQUFHQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQTs0QkFDL0JBLEtBQUtBLENBQUNBO3dCQUNWQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDMUJBLEtBQUtBLENBQUNBO3dCQUNWQSxDQUFDQTtvQkFDTEEsQ0FBQ0E7b0JBRURBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLEdBQUdBLEVBQUVBLENBQUNBO2dCQUNwQkEsQ0FBQ0E7Z0JBRU9KLHlDQUFXQSxHQUFuQkEsVUFBcUJBLEdBQWtCQTtvQkFDbkNLLElBQUlBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLEdBQUdBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUN2Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2RBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEVBQUVBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUM5Q0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2hCQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtvQkFDaEJBLENBQUNBO29CQUNEQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDbkNBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNkQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxFQUFFQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDOUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBO3dCQUNaQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtvQkFDaEJBLENBQUNBO29CQUNEQSxHQUFHQSxDQUFDQSxLQUFLQSxHQUFHQSwwQkFBMEJBLENBQUNBO29CQUN2Q0EsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7Z0JBQ2pCQSxDQUFDQTtnQkFFT0wsOENBQWdCQSxHQUF4QkEsVUFBMEJBLEdBQWtCQSxFQUFFQSxFQUFTQTtvQkFDbkRNLElBQUlBLElBQUlBLEdBQUdBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBO29CQUNuQkEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7b0JBQzVCQSxJQUFJQSxNQUFNQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtvQkFDcERBLElBQUlBLElBQUlBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO29CQUNuREEsSUFBSUEsR0FBR0EsR0FBR0EsTUFBTUEsR0FBR0EsR0FBR0EsQ0FBQ0EsUUFBUUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxrQkFBYUEsQ0FBQ0E7b0JBRTNFQSxJQUFJQSxHQUFHQSxDQUFDQTtvQkFDUkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsS0FBS0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ3hCQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxLQUFLQSxNQUFNQSxDQUFDQTs0QkFDaEJBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO3dCQUNqQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsTUFBTUEsQ0FBQ0E7NEJBQ3JCQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTt3QkFDakNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLEtBQUtBLFFBQVFBLENBQUNBOzRCQUN2QkEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7d0JBQ25DQSxJQUFJQTs0QkFDQUEsTUFBTUEsSUFBSUEsS0FBS0EsQ0FBQ0EsNkJBQTZCQSxHQUFHQSxNQUFNQSxHQUFHQSxHQUFHQSxHQUFHQSxJQUFJQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQTtvQkFDbkZBLENBQUNBO29CQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTt3QkFDSkEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsR0FBR0EsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7d0JBQzFDQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxpQkFBaUJBLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUMzQ0EsQ0FBQ0E7b0JBQ0RBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUNqQkEsQ0FBQ0E7Z0JBRU9OLDBDQUFZQSxHQUFwQkEsVUFBc0JBLEdBQWtCQTtvQkFDcENPLElBQUlBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLEdBQUdBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUN2Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ1pBLE1BQU1BLElBQUlBLEtBQUtBLENBQUNBLCtCQUErQkEsQ0FBQ0EsQ0FBQ0E7b0JBQ3JEQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQTtvQkFDWkEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7Z0JBQ2hCQSxDQUFDQTtnQkFFT1AsMENBQVlBLEdBQXBCQSxVQUFzQkEsR0FBa0JBO29CQUNwQ1EsSUFBSUEsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3ZDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDWkEsTUFBTUEsSUFBSUEsS0FBS0EsQ0FBQ0EsK0JBQStCQSxDQUFDQSxDQUFDQTtvQkFDckRBLElBQUlBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEVBQUVBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUM5Q0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0E7b0JBRVpBLElBQUlBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO29CQUMzQkEsSUFBSUEsTUFBTUEsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsR0FBR0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7b0JBQ25EQSxJQUFJQSxJQUFJQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDakRBLElBQUlBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLFFBQVFBLENBQUNBLGtCQUFrQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7b0JBQ2xEQSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQSxHQUFHQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDMUNBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBO2dCQUNwQkEsQ0FBQ0E7Z0JBRU9SLDRDQUFjQSxHQUF0QkEsVUFBd0JBLEdBQWtCQTtvQkFDdENTLElBQUlBLElBQUlBLEdBQUdBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBO29CQUNwQkEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7b0JBQ3RCQSxJQUFJQSxLQUFLQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDbEJBLEdBQUdBLENBQUNBLENBQUNBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBLEVBQUVBLEVBQUVBLENBQUNBO3dCQUMxQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsR0FBR0EsSUFBSUEsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsSUFBSUEsQ0FBQ0E7NEJBQ2hEQSxLQUFLQSxDQUFDQTtvQkFDZEEsQ0FBQ0E7b0JBQ0RBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLEtBQUtBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLEtBQUtBLENBQUNBLENBQUNBO29CQUU1Q0EsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsUUFBUUEsQ0FBQ0EsVUFBVUEsR0FBR0EsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQ2pEQSxNQUFNQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtnQkFDbEJBLENBQUNBO2dCQUVPVCw2Q0FBZUEsR0FBdkJBLFVBQXlCQSxHQUFrQkEsRUFBRUEsRUFBU0E7b0JBQ2xEVSxJQUFJQSxJQUFJQSxHQUFHQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQTtvQkFDcEJBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBO29CQUNiQSxJQUFJQSxHQUFHQSxHQUFHQSxFQUFFQSxDQUFDQTtvQkFDYkEsSUFBSUEsR0FBR0EsR0FBUUEsU0FBU0EsQ0FBQ0E7b0JBQ3pCQSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQTtvQkFDdEJBLElBQUlBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBO29CQUNyQkEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0E7d0JBQzFCQSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDdEJBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLEtBQUtBLElBQUlBLENBQUNBLENBQUNBLENBQUNBOzRCQUNmQSxHQUFHQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQTs0QkFDUkEsR0FBR0EsQ0FBQ0EsR0FBR0EsSUFBSUEsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQzNCQSxDQUFDQTt3QkFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsS0FBS0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ3JCQSxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDeENBLEdBQUdBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLENBQUNBO2dDQUNmQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQTtnQ0FDaEJBLFFBQVFBLENBQUNBOzRCQUNiQSxDQUFDQTs0QkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ1BBLEdBQUdBLENBQUNBLEtBQUtBLEdBQUdBLHVDQUF1Q0EsQ0FBQ0E7Z0NBQ3BEQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTs0QkFDakJBLENBQUNBOzRCQUNEQSxHQUFHQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQTs0QkFDUkEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsR0FBR0EsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7NEJBQzlCQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxLQUFLQSxDQUFDQTtnQ0FDVkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7d0JBQ3JCQSxDQUFDQTt3QkFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsS0FBS0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ3JCQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxFQUFFQSxD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LE1BQU1BLENBQUNBLElBQUlBLENBQUNBO1lBQ2hCQSxDQUFDQTtRQUNML0MsQ0FBQ0EsRUFqVXVCdkIsSUFBSUEsR0FBSkEsV0FBSUEsS0FBSkEsV0FBSUEsUUFpVTNCQTtJQUFEQSxDQUFDQSxFQWpVZ0J4RyxNQUFNQSxHQUFOQSxnQkFBTUEsS0FBTkEsZ0JBQU1BLFFBaVV0QkE7QUFBREEsQ0FBQ0EsRUFqVU0sU0FBUyxLQUFULFNBQVMsUUFpVWYiLCJmaWxlIjoibnVsbHN0b25lLmpzIiwic291cmNlUm9vdCI6IkM6L1NvdXJjZUNvbnRyb2wvbnVsbHN0b25lLyIsInNvdXJjZXNDb250ZW50IjpbIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IHZhciB2ZXJzaW9uID0gJzAuMy4xMCc7XHJcbn1cclxuIiwibW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBpbnRlcmZhY2UgQW5ub3RhdGVkVHlwZSBleHRlbmRzIEZ1bmN0aW9uIHtcclxuICAgICAgICAkJGFubm90YXRpb25zOiBhbnlbXVtdO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBBbm5vdGF0aW9uICh0eXBlOiBGdW5jdGlvbiwgbmFtZTogc3RyaW5nLCB2YWx1ZTogYW55LCBmb3JiaWRNdWx0aXBsZT86IGJvb2xlYW4pIHtcclxuICAgICAgICB2YXIgYXQgPSA8QW5ub3RhdGVkVHlwZT50eXBlO1xyXG4gICAgICAgIHZhciBhbm5zOiBhbnlbXVtdID0gYXQuJCRhbm5vdGF0aW9ucztcclxuICAgICAgICBpZiAoIWFubnMpXHJcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShhdCwgXCIkJGFubm90YXRpb25zXCIsIHt2YWx1ZTogKGFubnMgPSBbXSksIHdyaXRhYmxlOiBmYWxzZX0pO1xyXG4gICAgICAgIHZhciBhbm46IGFueVtdID0gYW5uc1tuYW1lXTtcclxuICAgICAgICBpZiAoIWFubilcclxuICAgICAgICAgICAgYW5uc1tuYW1lXSA9IGFubiA9IFtdO1xyXG4gICAgICAgIGlmIChmb3JiaWRNdWx0aXBsZSAmJiBhbm4ubGVuZ3RoID4gMClcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT25seSAxICdcIiArIG5hbWUgKyBcIicgYW5ub3RhdGlvbiBhbGxvd2VkIHBlciB0eXBlIFtcIiArIGdldFR5cGVOYW1lKHR5cGUpICsgXCJdLlwiKTtcclxuICAgICAgICBhbm4ucHVzaCh2YWx1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIEdldEFubm90YXRpb25zICh0eXBlOiBGdW5jdGlvbiwgbmFtZTogc3RyaW5nKTogYW55W10ge1xyXG4gICAgICAgIHZhciBhdCA9IDxBbm5vdGF0ZWRUeXBlPnR5cGU7XHJcbiAgICAgICAgdmFyIGFubnM6IGFueVtdW10gPSBhdC4kJGFubm90YXRpb25zO1xyXG4gICAgICAgIGlmICghYW5ucylcclxuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgICAgICByZXR1cm4gKGFubnNbbmFtZV0gfHwgW10pLnNsaWNlKDApO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSVR5cGVkQW5ub3RhdGlvbjxUPiB7XHJcbiAgICAgICAgKHR5cGU6IEZ1bmN0aW9uLCAuLi52YWx1ZXM6IFRbXSk7XHJcbiAgICAgICAgR2V0KHR5cGU6IEZ1bmN0aW9uKTogVFtdO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIENyZWF0ZVR5cGVkQW5ub3RhdGlvbjxUPihuYW1lOiBzdHJpbmcpOiBJVHlwZWRBbm5vdGF0aW9uPFQ+IHtcclxuICAgICAgICBmdW5jdGlvbiB0YSAodHlwZTogRnVuY3Rpb24sIC4uLnZhbHVlczogVFtdKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB2YWx1ZXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIEFubm90YXRpb24odHlwZSwgbmFtZSwgdmFsdWVzW2ldKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgKDxhbnk+dGEpLkdldCA9IGZ1bmN0aW9uICh0eXBlOiBGdW5jdGlvbik6IFRbXSB7XHJcbiAgICAgICAgICAgIHJldHVybiBHZXRBbm5vdGF0aW9ucyh0eXBlLCBuYW1lKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiA8SVR5cGVkQW5ub3RhdGlvbjxUPj50YTtcclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUuYXN5bmMge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJQXN5bmNSZXF1ZXN0PFQ+IHtcclxuICAgICAgICB0aGVuKHN1Y2Nlc3M6IChyZXN1bHQ6IFQpID0+IGFueSwgZXJyb3JlZD86IChlcnJvcjogYW55KSA9PiBhbnkpOiBJQXN5bmNSZXF1ZXN0PFQ+O1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJQXN5bmNSZXNvbHV0aW9uPFQ+IHtcclxuICAgICAgICAocmVzb2x2ZTogKHJlc3VsdDogVCkgPT4gYW55LCByZWplY3Q6IChlcnJvcjogYW55KSA9PiBhbnkpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGUgPFQ+KHJlc29sdXRpb246IElBc3luY1Jlc29sdXRpb248VD4pOiBJQXN5bmNSZXF1ZXN0PFQ+IHtcclxuICAgICAgICB2YXIgb25TdWNjZXNzOiAocmVzdWx0OiBUKT0+YW55O1xyXG4gICAgICAgIHZhciBvbkVycm9yOiAoZXJyb3I6IGFueSk9PmFueTtcclxuXHJcbiAgICAgICAgdmFyIHJlc29sdmVkUmVzdWx0OiBhbnk7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHJlc29sdmUgKHJlc3VsdDogVCkge1xyXG4gICAgICAgICAgICByZXNvbHZlZFJlc3VsdCA9IHJlc3VsdDtcclxuICAgICAgICAgICAgb25TdWNjZXNzICYmIG9uU3VjY2VzcyhyZXN1bHQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHJlc29sdmVkRXJyb3I6IGFueTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0IChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJlc29sdmVkRXJyb3IgPSBlcnJvcjtcclxuICAgICAgICAgICAgb25FcnJvciAmJiBvbkVycm9yKGVycm9yKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlc29sdXRpb24ocmVzb2x2ZSwgcmVqZWN0KTtcclxuXHJcbiAgICAgICAgdmFyIHJlcSA9IDxJQXN5bmNSZXF1ZXN0PFQ+PntcclxuICAgICAgICAgICAgdGhlbjogZnVuY3Rpb24gKHN1Y2Nlc3M6IChyZXN1bHQ6IFQpID0+IGFueSwgZXJyb3JlZD86IChlcnJvcjogYW55KSA9PiBhbnkpOiBJQXN5bmNSZXF1ZXN0PFQ+IHtcclxuICAgICAgICAgICAgICAgIG9uU3VjY2VzcyA9IHN1Y2Nlc3M7XHJcbiAgICAgICAgICAgICAgICBvbkVycm9yID0gZXJyb3JlZDtcclxuICAgICAgICAgICAgICAgIGlmIChyZXNvbHZlZFJlc3VsdCAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgICAgIG9uU3VjY2VzcyAmJiBvblN1Y2Nlc3MocmVzb2x2ZWRSZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAocmVzb2x2ZWRFcnJvciAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IgJiYgb25FcnJvcihyZXNvbHZlZEVycm9yKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiByZXE7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmU8VD4ob2JqOiBUKTogSUFzeW5jUmVxdWVzdDxUPiB7XHJcbiAgICAgICAgcmV0dXJuIGFzeW5jLmNyZWF0ZTxUPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIHJlc29sdmUob2JqKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcmVqZWN0PFQ+KGVycjogYW55KTogSUFzeW5jUmVxdWVzdDxUPiB7XHJcbiAgICAgICAgcmV0dXJuIGFzeW5jLmNyZWF0ZTxUPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBtYW55PFQ+KGFycjogSUFzeW5jUmVxdWVzdDxUPltdKTogSUFzeW5jUmVxdWVzdDxUW10+IHtcclxuICAgICAgICBpZiAoIWFyciB8fCBhcnIubGVuZ3RoIDwgMSlcclxuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmU8VFtdPihbXSk7XHJcblxyXG4gICAgICAgIHJldHVybiBjcmVhdGUoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICB2YXIgcmVzb2x2ZXM6IFRbXSA9IG5ldyBBcnJheShhcnIubGVuZ3RoKTtcclxuICAgICAgICAgICAgdmFyIGVycm9yczogYW55W10gPSBuZXcgQXJyYXkoYXJyLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIHZhciBmaW5pc2hlZCA9IDA7XHJcbiAgICAgICAgICAgIHZhciBjb3VudCA9IGFyci5sZW5ndGg7XHJcbiAgICAgICAgICAgIHZhciBhbnllcnJvcnMgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNvbXBsZXRlU2luZ2xlIChpOiBudW1iZXIsIHJlczogVCwgZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmVzW2ldID0gcmVzO1xyXG4gICAgICAgICAgICAgICAgZXJyb3JzW2ldID0gZXJyO1xyXG4gICAgICAgICAgICAgICAgYW55ZXJyb3JzID0gYW55ZXJyb3JzIHx8IGVyciAhPT0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgZmluaXNoZWQrKztcclxuICAgICAgICAgICAgICAgIGlmIChmaW5pc2hlZCA+PSBjb3VudClcclxuICAgICAgICAgICAgICAgICAgICBhbnllcnJvcnMgPyByZWplY3QobmV3IEFnZ3JlZ2F0ZUVycm9yKGVycm9ycykpIDogcmVzb2x2ZShyZXNvbHZlcyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgYXJyW2ldLnRoZW4ocmVzaSA9PiBjb21wbGV0ZVNpbmdsZShpLCByZXNpLCB1bmRlZmluZWQpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJpID0+IGNvbXBsZXRlU2luZ2xlKGksIHVuZGVmaW5lZCwgZXJyaSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIHZhciBjb252ZXJ0ZXJzOiBhbnkgPSBbXTtcclxuICAgIGNvbnZlcnRlcnNbPGFueT5Cb29sZWFuXSA9IGZ1bmN0aW9uICh2YWw6IGFueSk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGlmICh2YWwgPT0gbnVsbClcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWwgPT09IFwiYm9vbGVhblwiKVxyXG4gICAgICAgICAgICByZXR1cm4gdmFsO1xyXG4gICAgICAgIHZhciBjID0gdmFsLnRvU3RyaW5nKCkudG9VcHBlckNhc2UoKTtcclxuICAgICAgICByZXR1cm4gYyA9PT0gXCJUUlVFXCIgPyB0cnVlIDogKGMgPT09IFwiRkFMU0VcIiA/IGZhbHNlIDogbnVsbCk7XHJcbiAgICB9O1xyXG4gICAgY29udmVydGVyc1s8YW55PlN0cmluZ10gPSBmdW5jdGlvbiAodmFsOiBhbnkpOiBTdHJpbmcge1xyXG4gICAgICAgIGlmICh2YWwgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgcmV0dXJuIHZhbC50b1N0cmluZygpO1xyXG4gICAgfTtcclxuICAgIGNvbnZlcnRlcnNbPGFueT5OdW1iZXJdID0gZnVuY3Rpb24gKHZhbDogYW55KTogTnVtYmVyIHtcclxuICAgICAgICBpZiAoIXZhbCkgcmV0dXJuIDA7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWwgPT09IFwibnVtYmVyXCIpXHJcbiAgICAgICAgICAgIHJldHVybiB2YWw7XHJcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQodmFsLnRvU3RyaW5nKCkpO1xyXG4gICAgfTtcclxuICAgIGNvbnZlcnRlcnNbPGFueT5EYXRlXSA9IGZ1bmN0aW9uICh2YWw6IGFueSk6IERhdGUge1xyXG4gICAgICAgIGlmICh2YWwgPT0gbnVsbClcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKDApO1xyXG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSh2YWwudG9TdHJpbmcoKSk7XHJcbiAgICB9O1xyXG4gICAgY29udmVydGVyc1s8YW55PlJlZ0V4cF0gPSBmdW5jdGlvbiAodmFsOiBhbnkpOiBSZWdFeHAge1xyXG4gICAgICAgIGlmICh2YWwgaW5zdGFuY2VvZiBSZWdFeHApXHJcbiAgICAgICAgICAgIHJldHVybiB2YWw7XHJcbiAgICAgICAgaWYgKHZhbCA9IG51bGwpXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBzcGVjaWZ5IGFuIGVtcHR5IFJlZ0V4cC5cIik7XHJcbiAgICAgICAgdmFsID0gdmFsLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBSZWdFeHAodmFsKTtcclxuICAgIH07XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRBbnlUb1R5cGUgKHZhbDogYW55LCB0eXBlOiBGdW5jdGlvbik6IGFueSB7XHJcbiAgICAgICAgdmFyIGNvbnZlcnRlcjogKHZhbDogYW55KSA9PiBhbnkgPSAoPGFueT5jb252ZXJ0ZXJzKVs8YW55PnR5cGVdO1xyXG4gICAgICAgIGlmIChjb252ZXJ0ZXIpXHJcbiAgICAgICAgICAgIHJldHVybiBjb252ZXJ0ZXIodmFsKTtcclxuICAgICAgICBpZiAodHlwZSBpbnN0YW5jZW9mIEVudW0pIHtcclxuICAgICAgICAgICAgdmFyIGVudW1vID0gKDxFbnVtPjxhbnk+dHlwZSkuT2JqZWN0O1xyXG4gICAgICAgICAgICBpZiAoZW51bW8uQ29udmVydGVyKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVudW1vLkNvbnZlcnRlcih2YWwpO1xyXG4gICAgICAgICAgICB2YWwgPSB2YWwgfHwgMDtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWwgPT09IFwic3RyaW5nXCIpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZW51bW9bdmFsXTtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbDtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY29udmVydFN0cmluZ1RvRW51bTxUPiAodmFsOiBzdHJpbmcsIGVuOiBhbnkpOiBUIHtcclxuICAgICAgICBpZiAoIXZhbClcclxuICAgICAgICAgICAgcmV0dXJuIDxUPjxhbnk+MDtcclxuICAgICAgICByZXR1cm4gPFQ+ZW5bdmFsXTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJUeXBlQ29udmVydGVyICh0eXBlOiBGdW5jdGlvbiwgY29udmVydGVyOiAodmFsOiBhbnkpID0+IGFueSkge1xyXG4gICAgICAgIGNvbnZlcnRlcnNbPGFueT50eXBlXSA9IGNvbnZlcnRlcjtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJFbnVtQ29udmVydGVyIChlOiBhbnksIGNvbnZlcnRlcjogKHZhbDogYW55KSA9PiBhbnkpIHtcclxuICAgICAgICBlLkNvbnZlcnRlciA9IGNvbnZlcnRlcjtcclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGNsYXNzIERpclJlc29sdmVyIGltcGxlbWVudHMgSVR5cGVSZXNvbHZlciB7XHJcbiAgICAgICAgbG9hZEFzeW5jIChtb2R1bGVOYW1lOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IGFzeW5jLklBc3luY1JlcXVlc3Q8YW55PiB7XHJcbiAgICAgICAgICAgIHZhciByZXFVcmkgPSBtb2R1bGVOYW1lICsgJy8nICsgbmFtZTtcclxuICAgICAgICAgICAgcmV0dXJuIGFzeW5jLmNyZWF0ZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAoPEZ1bmN0aW9uPnJlcXVpcmUpKFtyZXFVcmldLCAocm9vdE1vZHVsZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocm9vdE1vZHVsZSk7XHJcbiAgICAgICAgICAgICAgICB9LCAoZXJyKSA9PiByZWplY3QobmV3IERpckxvYWRFcnJvcihyZXFVcmksIGVycikpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXNvbHZlVHlwZSAobW9kdWxlTmFtZTogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIC8qIG91dCAqL29yZXNvbHZlOiBJT3V0VHlwZSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBvcmVzb2x2ZS5pc1ByaW1pdGl2ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBvcmVzb2x2ZS50eXBlID0gcmVxdWlyZShtb2R1bGVOYW1lICsgJy8nICsgbmFtZSk7XHJcbiAgICAgICAgICAgIHJldHVybiBvcmVzb2x2ZS50eXBlICE9PSB1bmRlZmluZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgY2xhc3MgRW51bSB7XHJcbiAgICAgICAgY29uc3RydWN0b3IgKHB1YmxpYyBPYmplY3Q6IGFueSkge1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3RhdGljIGZyb21Bbnk8VD4oZW51VHlwZTogYW55LCB2YWw6IGFueSwgZmFsbGJhY2s/OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbCA9PT0gXCJudW1iZXJcIilcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWw7XHJcbiAgICAgICAgICAgIGlmICghdmFsKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIChmYWxsYmFjayB8fCAwKTtcclxuICAgICAgICAgICAgdmFyIG9iaiA9IGVudVR5cGVbdmFsLnRvU3RyaW5nKCldO1xyXG4gICAgICAgICAgICByZXR1cm4gKG9iaiA9PSBudWxsKSA/IChmYWxsYmFjayB8fCAwKSA6IG9iajtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIC8vVE9ETzogQ2hlY2sgaW5zdGFuY2VzIGluIEZheWRlIC5FcXVhbHNcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBlcXVhbHMgKHZhbDE6IGFueSwgdmFsMjogYW55KTogYm9vbGVhbiB7XHJcbiAgICAgICAgaWYgKHZhbDEgPT0gbnVsbCAmJiB2YWwyID09IG51bGwpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIGlmICh2YWwxID09IG51bGwgfHwgdmFsMiA9PSBudWxsKVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgaWYgKHZhbDEgPT09IHZhbDIpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIHJldHVybiAhIXZhbDEuZXF1YWxzICYmIHZhbDEuZXF1YWxzKHZhbDIpO1xyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElFdmVudEFyZ3Mge1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJRXZlbnRDYWxsYmFjazxUIGV4dGVuZHMgSUV2ZW50QXJncz4ge1xyXG4gICAgICAgIChzZW5kZXI6IGFueSwgYXJnczogVCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEV2ZW50PFQgZXh0ZW5kcyBJRXZlbnRBcmdzPiB7XHJcbiAgICAgICAgcHJpdmF0ZSAkJGNhbGxiYWNrczogSUV2ZW50Q2FsbGJhY2s8VD5bXSA9IFtdO1xyXG4gICAgICAgIHByaXZhdGUgJCRzY29wZXM6IGFueVtdID0gW107XHJcblxyXG4gICAgICAgIGdldCBoYXMgKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy4kJGNhbGxiYWNrcy5sZW5ndGggPiAwO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgb24gKGNhbGxiYWNrOiBJRXZlbnRDYWxsYmFjazxUPiwgc2NvcGU6IGFueSkge1xyXG4gICAgICAgICAgICB0aGlzLiQkY2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xyXG4gICAgICAgICAgICB0aGlzLiQkc2NvcGVzLnB1c2goc2NvcGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgb2ZmIChjYWxsYmFjazogSUV2ZW50Q2FsbGJhY2s8VD4sIHNjb3BlOiBhbnkpIHtcclxuICAgICAgICAgICAgdmFyIGNicyA9IHRoaXMuJCRjYWxsYmFja3M7XHJcbiAgICAgICAgICAgIHZhciBzY29wZXMgPSB0aGlzLiQkc2NvcGVzO1xyXG4gICAgICAgICAgICB2YXIgc2VhcmNoID0gY2JzLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgICAgIHdoaWxlIChzZWFyY2ggPiAtMSkge1xyXG4gICAgICAgICAgICAgICAgc2VhcmNoID0gY2JzLmxhc3RJbmRleE9mKGNhbGxiYWNrLCBzZWFyY2gpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNjb3Blc1tzZWFyY2hdID09PSBzY29wZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNicy5zcGxpY2Uoc2VhcmNoLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBzY29wZXMuc3BsaWNlKHNlYXJjaCwgMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBzZWFyY2gtLTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmFpc2UgKHNlbmRlcjogYW55LCBhcmdzOiBUKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBjYnMgPSB0aGlzLiQkY2FsbGJhY2tzLnNsaWNlKDApLCBzY29wZXMgPSB0aGlzLiQkc2NvcGVzLnNsaWNlKDApLCBsZW4gPSBjYnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGNic1tpXS5jYWxsKHNjb3Blc1tpXSwgc2VuZGVyLCBhcmdzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmFpc2VBc3luYyAoc2VuZGVyOiBhbnksIGFyZ3M6IFQpIHtcclxuICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoKCkgPT4gdGhpcy5yYWlzZShzZW5kZXIsIGFyZ3MpLCAxKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUludGVyZmFjZURlY2xhcmF0aW9uPFQ+IHtcclxuICAgICAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICAgICAgaXMobzogYW55KTogYm9vbGVhbjtcclxuICAgICAgICBhcyhvOiBhbnkpOiBUO1xyXG4gICAgICAgIG1hcmsodHlwZTogYW55KTogSUludGVyZmFjZURlY2xhcmF0aW9uPFQ+O1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIEludGVyZmFjZTxUPiBpbXBsZW1lbnRzIElJbnRlcmZhY2VEZWNsYXJhdGlvbjxUPiB7XHJcbiAgICAgICAgbmFtZTogc3RyaW5nO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvciAobmFtZTogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcIm5hbWVcIiwge3ZhbHVlOiBuYW1lLCB3cml0YWJsZTogZmFsc2V9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlzIChvOiBhbnkpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgaWYgKCFvKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB2YXIgdHlwZSA9IG8uY29uc3RydWN0b3I7XHJcbiAgICAgICAgICAgIHdoaWxlICh0eXBlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgaXM6IElJbnRlcmZhY2VEZWNsYXJhdGlvbjxhbnk+W10gPSB0eXBlLiQkaW50ZXJmYWNlcztcclxuICAgICAgICAgICAgICAgIGlmIChpcyAmJiBpcy5pbmRleE9mKHRoaXMpID4gLTEpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gZ2V0VHlwZVBhcmVudCh0eXBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcyAobzogYW55KTogVCB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5pcyhvKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHJldHVybiA8VD5vO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWFyayAodHlwZTogYW55KTogSW50ZXJmYWNlPFQ+IHtcclxuICAgICAgICAgICAgYWRkVHlwZUludGVyZmFjZXModHlwZSwgdGhpcyk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJJbnRlcmZhY2VcIiAvPlxyXG5cclxubW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElDb2xsZWN0aW9uPFQ+IGV4dGVuZHMgSUVudW1lcmFibGU8VD4ge1xyXG4gICAgICAgIENvdW50OiBudW1iZXI7XHJcbiAgICAgICAgR2V0VmFsdWVBdChpbmRleDogbnVtYmVyKTogVDtcclxuICAgICAgICBTZXRWYWx1ZUF0KGluZGV4OiBudW1iZXIsIHZhbHVlOiBUKTtcclxuICAgICAgICBJbnNlcnQoaW5kZXg6IG51bWJlciwgdmFsdWU6IFQpO1xyXG4gICAgICAgIEFkZCh2YWx1ZTogVCk7XHJcbiAgICAgICAgUmVtb3ZlKHZhbHVlOiBUKTogYm9vbGVhbjtcclxuICAgICAgICBSZW1vdmVBdChpbmRleDogbnVtYmVyKTtcclxuICAgICAgICBDbGVhcigpO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IHZhciBJQ29sbGVjdGlvbl8gPSBuZXcgSW50ZXJmYWNlPElDb2xsZWN0aW9uPGFueT4+KFwiSUNvbGxlY3Rpb25cIik7XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUVudW1lcmFibGU8VD4ge1xyXG4gICAgICAgIGdldEVudW1lcmF0b3IoaXNSZXZlcnNlPzogYm9vbGVhbik6IElFbnVtZXJhdG9yPFQ+O1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJRW51bWVyYWJsZURlY2xhcmF0aW9uPFQ+IGV4dGVuZHMgSUludGVyZmFjZURlY2xhcmF0aW9uPFQ+IHtcclxuICAgICAgICBlbXB0eTogSUVudW1lcmFibGU8VD47XHJcbiAgICAgICAgZnJvbUFycmF5KGFycjogVFtdKTogSUVudW1lcmFibGU8VD47XHJcbiAgICAgICAgdG9BcnJheShlbjogSUVudW1lcmFibGU8VD4pOiBUW107XHJcbiAgICB9XHJcbiAgICBleHBvcnQgdmFyIElFbnVtZXJhYmxlXyA9IDxJRW51bWVyYWJsZURlY2xhcmF0aW9uPGFueT4+bmV3IEludGVyZmFjZShcIklFbnVtZXJhYmxlXCIpO1xyXG4gICAgSUVudW1lcmFibGVfLmlzID0gKG86IGFueSk6IGJvb2xlYW4gPT4ge1xyXG4gICAgICAgIHJldHVybiBvICYmIG8uZ2V0RW51bWVyYXRvciAmJiB0eXBlb2Ygby5nZXRFbnVtZXJhdG9yID09PSBcImZ1bmN0aW9uXCI7XHJcbiAgICB9O1xyXG5cclxuICAgIElFbnVtZXJhYmxlXy5lbXB0eSA9IHtcclxuICAgICAgICBnZXRFbnVtZXJhdG9yOiBmdW5jdGlvbjxUPihpc1JldmVyc2U/OiBib29sZWFuKTogSUVudW1lcmF0b3I8VD4ge1xyXG4gICAgICAgICAgICByZXR1cm4gSUVudW1lcmF0b3JfLmVtcHR5O1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgSUVudW1lcmFibGVfLmZyb21BcnJheSA9IGZ1bmN0aW9uPFQ+KGFycjogVFtdKTogSUVudW1lcmFibGU8VD4ge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICQkYXJyOiBhcnIsXHJcbiAgICAgICAgICAgIGdldEVudW1lcmF0b3IgKGlzUmV2ZXJzZT86IGJvb2xlYW4pOiBJRW51bWVyYXRvcjxUPiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gSUVudW1lcmF0b3JfLmZyb21BcnJheSh0aGlzLiQkYXJyLCBpc1JldmVyc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH07XHJcblxyXG4gICAgSUVudW1lcmFibGVfLnRvQXJyYXkgPSBmdW5jdGlvbjxUPihlbjogSUVudW1lcmFibGU8VD4pOiBUW10ge1xyXG4gICAgICAgIHZhciBhOiBUW10gPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBlID0gZW4uZ2V0RW51bWVyYXRvcigpOyBlLm1vdmVOZXh0KCk7KSB7XHJcbiAgICAgICAgICAgIGEucHVzaChlLmN1cnJlbnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gYTtcclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJRW51bWVyYXRvcjxUPiB7XHJcbiAgICAgICAgY3VycmVudDogVDtcclxuICAgICAgICBtb3ZlTmV4dCgpOiBib29sZWFuO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJRW51bWVyYXRvckRlY2xhcmF0aW9uPFQ+IGV4dGVuZHMgSUludGVyZmFjZURlY2xhcmF0aW9uPFQ+IHtcclxuICAgICAgICBlbXB0eTogSUVudW1lcmF0b3I8VD47XHJcbiAgICAgICAgZnJvbUFycmF5KGFycjogVFtdLCBpc1JldmVyc2U/OiBib29sZWFuKTpJRW51bWVyYXRvcjxUPjtcclxuICAgIH1cclxuICAgIGV4cG9ydCB2YXIgSUVudW1lcmF0b3JfID0gPElFbnVtZXJhdG9yRGVjbGFyYXRpb248YW55Pj5uZXcgSW50ZXJmYWNlKFwiSUVudW1lcmF0b3JcIik7XHJcblxyXG4gICAgSUVudW1lcmF0b3JfLmVtcHR5ID0ge1xyXG4gICAgICAgIGN1cnJlbnQ6IHVuZGVmaW5lZCxcclxuICAgICAgICBtb3ZlTmV4dCAoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIElFbnVtZXJhdG9yXy5mcm9tQXJyYXkgPSBmdW5jdGlvbjxUPiAoYXJyOiBUW10sIGlzUmV2ZXJzZT86IGJvb2xlYW4pOiBJRW51bWVyYXRvcjxUPiB7XHJcbiAgICAgICAgdmFyIGxlbiA9IGFyci5sZW5ndGg7XHJcbiAgICAgICAgdmFyIGUgPSA8SUVudW1lcmF0b3I8VD4+e21vdmVOZXh0OiB1bmRlZmluZWQsIGN1cnJlbnQ6IHVuZGVmaW5lZH07XHJcbiAgICAgICAgdmFyIGluZGV4O1xyXG4gICAgICAgIGlmIChpc1JldmVyc2UpIHtcclxuICAgICAgICAgICAgaW5kZXggPSBsZW47XHJcbiAgICAgICAgICAgIGUubW92ZU5leHQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBpbmRleC0tO1xyXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4IDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGUuY3VycmVudCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlLmN1cnJlbnQgPSBhcnJbaW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaW5kZXggPSAtMTtcclxuICAgICAgICAgICAgZS5tb3ZlTmV4dCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGluZGV4Kys7XHJcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5jdXJyZW50ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGUuY3VycmVudCA9IGFycltpbmRleF07XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGU7XHJcbiAgICB9O1xyXG59IiwibW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElJbmRleGVkUHJvcGVydHlJbmZvIHtcclxuICAgICAgICBnZXRWYWx1ZShvYmo6IGFueSwgaW5kZXg6IG51bWJlcik6IGFueTtcclxuICAgICAgICBzZXRWYWx1ZShvYmo6IGFueSwgaW5kZXg6IG51bWJlciwgdmFsdWU6IGFueSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEluZGV4ZWRQcm9wZXJ0eUluZm8gaW1wbGVtZW50cyBJSW5kZXhlZFByb3BlcnR5SW5mbyB7XHJcbiAgICAgICAgR2V0RnVuYzogKGluZGV4OiBudW1iZXIpID0+IGFueTtcclxuICAgICAgICBTZXRGdW5jOiAoaW5kZXg6IG51bWJlciwgdmFsdWU6IGFueSkgPT4gYW55O1xyXG5cclxuICAgICAgICBnZXQgcHJvcGVydHlUeXBlICgpOiBGdW5jdGlvbiB7XHJcbiAgICAgICAgICAgIC8vTm90SW1wbGVtZW50ZWRcclxuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldFZhbHVlIChybzogYW55LCBpbmRleDogbnVtYmVyKTogYW55IHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuR2V0RnVuYylcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLkdldEZ1bmMuY2FsbChybywgaW5kZXgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0VmFsdWUgKHJvOiBhbnksIGluZGV4OiBudW1iZXIsIHZhbHVlOiBhbnkpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuU2V0RnVuYylcclxuICAgICAgICAgICAgICAgIHRoaXMuU2V0RnVuYy5jYWxsKHJvLCBpbmRleCwgdmFsdWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3RhdGljIGZpbmQgKHR5cGVPck9iaik6IEluZGV4ZWRQcm9wZXJ0eUluZm8ge1xyXG4gICAgICAgICAgICB2YXIgbyA9IHR5cGVPck9iajtcclxuICAgICAgICAgICAgdmFyIGlzVHlwZSA9IHR5cGVPck9iaiBpbnN0YW5jZW9mIEZ1bmN0aW9uO1xyXG4gICAgICAgICAgICBpZiAoaXNUeXBlKVxyXG4gICAgICAgICAgICAgICAgbyA9IG5ldyB0eXBlT3JPYmooKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChvIGluc3RhbmNlb2YgQXJyYXkpIHtcclxuICAgICAgICAgICAgICAgIHZhciBwaSA9IG5ldyBJbmRleGVkUHJvcGVydHlJbmZvKCk7XHJcbiAgICAgICAgICAgICAgICBwaS5HZXRGdW5jID0gZnVuY3Rpb24gKGluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXNbaW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHBpLlNldEZ1bmMgPSBmdW5jdGlvbiAoaW5kZXgsIHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpc1tpbmRleF0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcGk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIGNvbGwgPSBJQ29sbGVjdGlvbl8uYXMobyk7XHJcbiAgICAgICAgICAgIGlmIChjb2xsKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGkgPSBuZXcgSW5kZXhlZFByb3BlcnR5SW5mbygpO1xyXG4gICAgICAgICAgICAgICAgcGkuR2V0RnVuYyA9IGZ1bmN0aW9uIChpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLkdldFZhbHVlQXQoaW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHBpLlNldEZ1bmMgPSBmdW5jdGlvbiAoaW5kZXgsIHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuU2V0VmFsdWVBdChpbmRleCwgdmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwaTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJTGlicmFyeSB7XHJcbiAgICAgICAgbmFtZTogc3RyaW5nO1xyXG4gICAgICAgIHVyaTogVXJpO1xyXG4gICAgICAgIHNvdXJjZVBhdGg6IHN0cmluZztcclxuICAgICAgICB1c2VNaW46IGJvb2xlYW47XHJcbiAgICAgICAgZXhwb3J0czogc3RyaW5nO1xyXG4gICAgICAgIGRlcHM6IHN0cmluZ1tdO1xyXG4gICAgICAgIHJvb3RNb2R1bGU6IGFueTtcclxuICAgICAgICBsb2FkQXN5bmMgKCk6IGFzeW5jLklBc3luY1JlcXVlc3Q8TGlicmFyeT47XHJcbiAgICAgICAgcmVzb2x2ZVR5cGUgKG1vZHVsZU5hbWU6IHN0cmluZywgbmFtZTogc3RyaW5nLCAvKiBvdXQgKi9vcmVzb2x2ZTogSU91dFR5cGUpOiBib29sZWFuO1xyXG5cclxuICAgICAgICBhZGQgKHR5cGU6IGFueSwgbmFtZT86IHN0cmluZyk6IElMaWJyYXJ5O1xyXG4gICAgICAgIGFkZFByaW1pdGl2ZSAodHlwZTogYW55LCBuYW1lPzogc3RyaW5nKTogSUxpYnJhcnk7XHJcbiAgICAgICAgYWRkRW51bSAoZW51OiBhbnksIG5hbWU6IHN0cmluZyk6IElMaWJyYXJ5O1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIExpYnJhcnkgaW1wbGVtZW50cyBJTGlicmFyeSB7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG1vZHVsZTogYW55ID0gbnVsbDtcclxuICAgICAgICBwcml2YXRlICQkc291cmNlUGF0aDogc3RyaW5nID0gbnVsbDtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJHByaW10eXBlczogYW55ID0ge307XHJcbiAgICAgICAgcHJpdmF0ZSAkJHR5cGVzOiBhbnkgPSB7fTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJGxvYWRlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICAgICAgdXJpOiBVcmk7XHJcbiAgICAgICAgZXhwb3J0czogc3RyaW5nO1xyXG4gICAgICAgIGRlcHM6IHN0cmluZ1tdO1xyXG4gICAgICAgIHVzZU1pbjogYm9vbGVhbjtcclxuXHJcbiAgICAgICAgZ2V0IHNvdXJjZVBhdGggKCk6IHN0cmluZyB7XHJcbiAgICAgICAgICAgIHZhciBiYXNlID0gdGhpcy4kJHNvdXJjZVBhdGggfHwgJ2xpYi8nICsgdGhpcy5uYW1lICsgJy9kaXN0LycgKyB0aGlzLm5hbWU7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy51c2VNaW4pXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYmFzZTtcclxuICAgICAgICAgICAgcmV0dXJuIGJhc2UgKyBcIi5taW5cIjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldCBzb3VyY2VQYXRoICh2YWx1ZTogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgIGlmICh2YWx1ZS5zdWJzdHIodmFsdWUubGVuZ3RoIC0gMykgPT09ICcuanMnKVxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5zdWJzdHIoMCwgdmFsdWUubGVuZ3RoIC0gMyk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnVzZU1pbiAmJiB2YWx1ZS5zdWJzdHIodmFsdWUubGVuZ3RoIC0gNCkgPT09IFwiLm1pblwiKVxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS5zdWJzdHIoMCwgdmFsdWUubGVuZ3RoIC0gNCk7XHJcbiAgICAgICAgICAgIHRoaXMuJCRzb3VyY2VQYXRoID0gdmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvciAobmFtZTogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcIm5hbWVcIiwge3ZhbHVlOiBuYW1lLCB3cml0YWJsZTogZmFsc2V9KTtcclxuICAgICAgICAgICAgdmFyIHVyaSA9IG5hbWU7XHJcbiAgICAgICAgICAgIGlmIChuYW1lLmluZGV4T2YoXCJodHRwOi8vXCIpICE9PSAwKVxyXG4gICAgICAgICAgICAgICAgdXJpID0gXCJsaWI6Ly9cIiArIG5hbWU7XHJcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcInVyaVwiLCB7dmFsdWU6IG5ldyBVcmkodXJpKSwgd3JpdGFibGU6IGZhbHNlfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXQgcm9vdE1vZHVsZSAoKTogYW55IHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuJCRtb2R1bGUgPSB0aGlzLiQkbW9kdWxlIHx8IHJlcXVpcmUodGhpcy5zb3VyY2VQYXRoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxvYWRBc3luYyAoKTogYXN5bmMuSUFzeW5jUmVxdWVzdDxMaWJyYXJ5PiB7XHJcbiAgICAgICAgICAgIC8vTk9URTogSWYgdXNpbmcgaHR0cCBsaWJyYXJ5IHNjaGVtZSBhbmQgYSBjdXN0b20gc291cmNlIHBhdGggd2FzIG5vdCBzZXQsIHdlIGFzc3VtZSB0aGUgbGlicmFyeSBpcyBwcmVsb2FkZWRcclxuICAgICAgICAgICAgaWYgKCF0aGlzLiQkc291cmNlUGF0aCAmJiB0aGlzLnVyaS5zY2hlbWUgPT09IFwiaHR0cFwiKVxyXG4gICAgICAgICAgICAgICAgdGhpcy4kJGxvYWRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLiQkbG9hZGVkKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFzeW5jLnJlc29sdmUodGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMuJGNvbmZpZ01vZHVsZSgpO1xyXG4gICAgICAgICAgICByZXR1cm4gYXN5bmMuY3JlYXRlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgICAgICg8RnVuY3Rpb24+cmVxdWlyZSkoW3RoaXMubmFtZV0sIChyb290TW9kdWxlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kJG1vZHVsZSA9IHJvb3RNb2R1bGU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kJGxvYWRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH0sIChlcnIpID0+IHJlamVjdChuZXcgTGlicmFyeUxvYWRFcnJvcih0aGlzLCBlcnIpKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkY29uZmlnTW9kdWxlICgpIHtcclxuICAgICAgICAgICAgdmFyIGNvID0gPFJlcXVpcmVDb25maWc+e1xyXG4gICAgICAgICAgICAgICAgcGF0aHM6IHt9LFxyXG4gICAgICAgICAgICAgICAgc2hpbToge30sXHJcbiAgICAgICAgICAgICAgICBtYXA6IHtcclxuICAgICAgICAgICAgICAgICAgICBcIipcIjoge31cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdmFyIHNyY1BhdGggPSB0aGlzLnNvdXJjZVBhdGg7XHJcbiAgICAgICAgICAgIGNvLnBhdGhzW3RoaXMubmFtZV0gPSBzcmNQYXRoO1xyXG4gICAgICAgICAgICBjby5zaGltW3RoaXMubmFtZV0gPSB7XHJcbiAgICAgICAgICAgICAgICBleHBvcnRzOiB0aGlzLmV4cG9ydHMsXHJcbiAgICAgICAgICAgICAgICBkZXBzOiB0aGlzLmRlcHNcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgY28ubWFwWycqJ11bc3JjUGF0aF0gPSB0aGlzLm5hbWU7XHJcbiAgICAgICAgICAgIHJlcXVpcmUuY29uZmlnKGNvKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlc29sdmVUeXBlIChtb2R1bGVOYW1lOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgLyogb3V0ICovb3Jlc29sdmU6IElPdXRUeXBlKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIGlmICghbW9kdWxlTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgLy9MaWJyYXJ5IFVSSTogaHR0cDovLy4uLi9cclxuICAgICAgICAgICAgICAgIG9yZXNvbHZlLmlzUHJpbWl0aXZlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGlmICgob3Jlc29sdmUudHlwZSA9IHRoaXMuJCRwcmltdHlwZXNbbmFtZV0pICE9PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICBvcmVzb2x2ZS5pc1ByaW1pdGl2ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIChvcmVzb2x2ZS50eXBlID0gdGhpcy4kJHR5cGVzW25hbWVdKSAhPT0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvL0xpYnJhcnkgVVJJOiBsaWI6Ly8uLi4vXHJcbiAgICAgICAgICAgIHZhciBjdXJNb2R1bGUgPSB0aGlzLnJvb3RNb2R1bGU7XHJcbiAgICAgICAgICAgIG9yZXNvbHZlLmlzUHJpbWl0aXZlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIG9yZXNvbHZlLnR5cGUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIGlmIChtb2R1bGVOYW1lICE9PSBcIi9cIikge1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIHRva2VucyA9IG1vZHVsZU5hbWUuc3Vic3RyKDEpLnNwbGl0KCcuJyk7IGkgPCB0b2tlbnMubGVuZ3RoICYmICEhY3VyTW9kdWxlOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjdXJNb2R1bGUgPSBjdXJNb2R1bGVbdG9rZW5zW2ldXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIWN1ck1vZHVsZSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgb3Jlc29sdmUudHlwZSA9IGN1ck1vZHVsZVtuYW1lXTtcclxuICAgICAgICAgICAgdmFyIHR5cGUgPSBvcmVzb2x2ZS50eXBlO1xyXG4gICAgICAgICAgICBpZiAodHlwZSA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBzZXRUeXBlVXJpKHR5cGUsIHRoaXMudXJpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhZGQgKHR5cGU6IGFueSwgbmFtZT86IHN0cmluZyk6IElMaWJyYXJ5IHtcclxuICAgICAgICAgICAgaWYgKCF0eXBlKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQSB0eXBlIG11c3QgYmUgc3BlY2lmaWVkIHdoZW4gcmVnaXN0ZXJpbmcgJ1wiICsgbmFtZSArIFwiJ2AuXCIpO1xyXG4gICAgICAgICAgICBuYW1lID0gbmFtZSB8fCBnZXRUeXBlTmFtZSh0eXBlKTtcclxuICAgICAgICAgICAgaWYgKCFuYW1lKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gdHlwZSBuYW1lIGZvdW5kLlwiKTtcclxuICAgICAgICAgICAgc2V0VHlwZVVyaSh0eXBlLCB0aGlzLnVyaSk7XHJcbiAgICAgICAgICAgIHRoaXMuJCR0eXBlc1tuYW1lXSA9IHR5cGU7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWRkUHJpbWl0aXZlICh0eXBlOiBhbnksIG5hbWU/OiBzdHJpbmcpOiBJTGlicmFyeSB7XHJcbiAgICAgICAgICAgIGlmICghdHlwZSlcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkEgdHlwZSBtdXN0IGJlIHNwZWNpZmllZCB3aGVuIHJlZ2lzdGVyaW5nICdcIiArIG5hbWUgKyBcIidgLlwiKTtcclxuICAgICAgICAgICAgbmFtZSA9IG5hbWUgfHwgZ2V0VHlwZU5hbWUodHlwZSk7XHJcbiAgICAgICAgICAgIGlmICghbmFtZSlcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIHR5cGUgbmFtZSBmb3VuZC5cIik7XHJcbiAgICAgICAgICAgIHNldFR5cGVVcmkodHlwZSwgdGhpcy51cmkpO1xyXG4gICAgICAgICAgICB0aGlzLiQkcHJpbXR5cGVzW25hbWVdID0gdHlwZTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhZGRFbnVtIChlbnU6IGFueSwgbmFtZTogc3RyaW5nKTogSUxpYnJhcnkge1xyXG4gICAgICAgICAgICB0aGlzLmFkZFByaW1pdGl2ZShlbnUsIG5hbWUpO1xyXG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZW51LCBcIiQkZW51bVwiLCB7dmFsdWU6IHRydWUsIHdyaXRhYmxlOiBmYWxzZX0pO1xyXG4gICAgICAgICAgICBlbnUubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzZXRUeXBlVXJpICh0eXBlOiBhbnksIHVyaTogVXJpKSB7XHJcbiAgICAgICAgaWYgKHR5cGUuJCR1cmkpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodHlwZSwgXCIkJHVyaVwiLCB7dmFsdWU6IHVyaS50b1N0cmluZygpLCBlbnVtZXJhYmxlOiBmYWxzZX0pO1xyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBpbnRlcmZhY2UgSUxpYnJhcnlIYXNoIHtcclxuICAgICAgICBbaWQ6c3RyaW5nXTogSUxpYnJhcnk7XHJcbiAgICB9XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElMaWJyYXJ5UmVzb2x2ZXIgZXh0ZW5kcyBJVHlwZVJlc29sdmVyIHtcclxuICAgICAgICBsaWJyYXJ5Q3JlYXRlZDogRXZlbnQ8SUV2ZW50QXJncz47XHJcbiAgICAgICAgbG9hZFR5cGVBc3luYyh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nKTogYXN5bmMuSUFzeW5jUmVxdWVzdDxhbnk+O1xyXG4gICAgICAgIHJlc29sdmUodXJpOiBzdHJpbmcpOiBJTGlicmFyeTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElMaWJyYXJ5Q3JlYXRlZEV2ZW50QXJncyBleHRlbmRzIElFdmVudEFyZ3Mge1xyXG4gICAgICAgIGxpYnJhcnk6IElMaWJyYXJ5O1xyXG4gICAgfVxyXG5cclxuICAgIC8vTk9URTpcclxuICAgIC8vICBMaWJyYXJ5IFVyaSBzeW50YXhcclxuICAgIC8vICAgICAgaHR0cDovLy4uLlxyXG4gICAgLy8gICAgICBsaWI6Ly88bGlicmFyeT5bLzxuYW1lc3BhY2U+XVxyXG4gICAgLy8gICAgICA8ZGlyPlxyXG4gICAgZXhwb3J0IGNsYXNzIExpYnJhcnlSZXNvbHZlciBpbXBsZW1lbnRzIElMaWJyYXJ5UmVzb2x2ZXIge1xyXG4gICAgICAgIHByaXZhdGUgJCRsaWJzOiBJTGlicmFyeUhhc2ggPSB7fTtcclxuXHJcbiAgICAgICAgbGlicmFyeUNyZWF0ZWQgPSBuZXcgRXZlbnQoKTtcclxuXHJcbiAgICAgICAgZGlyUmVzb2x2ZXIgPSBuZXcgRGlyUmVzb2x2ZXIoKTtcclxuXHJcbiAgICAgICAgY3JlYXRlTGlicmFyeSAodXJpOiBzdHJpbmcpOiBJTGlicmFyeSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgTGlicmFyeSh1cmkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZFR5cGVBc3luYyAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IGFzeW5jLklBc3luY1JlcXVlc3Q8YW55PiB7XHJcbiAgICAgICAgICAgIHZhciBsaWIgPSB0aGlzLnJlc29sdmUodXJpKTtcclxuICAgICAgICAgICAgaWYgKCFsaWIpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kaXJSZXNvbHZlci5sb2FkQXN5bmModXJpLCBuYW1lKTtcclxuICAgICAgICAgICAgcmV0dXJuIGFzeW5jLmNyZWF0ZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsaWIubG9hZEFzeW5jKClcclxuICAgICAgICAgICAgICAgICAgICAudGhlbigobGliKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvcmVzb2x2ZSA9IHtpc1ByaW1pdGl2ZTogZmFsc2UsIHR5cGU6IHVuZGVmaW5lZH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsaWIucmVzb2x2ZVR5cGUobnVsbCwgbmFtZSwgb3Jlc29sdmUpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShvcmVzb2x2ZS50eXBlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICB9LCByZWplY3QpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlc29sdmUgKHVyaTogc3RyaW5nKTogSUxpYnJhcnkge1xyXG4gICAgICAgICAgICB2YXIgbGliVXJpID0gbmV3IFVyaSh1cmkpO1xyXG4gICAgICAgICAgICB2YXIgc2NoZW1lID0gbGliVXJpLnNjaGVtZTtcclxuICAgICAgICAgICAgaWYgKCFzY2hlbWUpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIHZhciBsaWJOYW1lID0gKHNjaGVtZSA9PT0gXCJsaWJcIikgPyBsaWJVcmkuaG9zdCA6IHVyaTtcclxuICAgICAgICAgICAgdmFyIGxpYiA9IHRoaXMuJCRsaWJzW2xpYk5hbWVdO1xyXG4gICAgICAgICAgICBpZiAoIWxpYikge1xyXG4gICAgICAgICAgICAgICAgbGliID0gdGhpcy4kJGxpYnNbbGliTmFtZV0gPSB0aGlzLmNyZWF0ZUxpYnJhcnkobGliTmFtZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkb25MaWJyYXJ5Q3JlYXRlZChsaWIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBsaWI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXNvbHZlVHlwZSAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgLyogb3V0ICovb3Jlc29sdmU6IElPdXRUeXBlKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIHZhciBsaWJVcmkgPSBuZXcgVXJpKHVyaSk7XHJcbiAgICAgICAgICAgIHZhciBzY2hlbWUgPSBsaWJVcmkuc2NoZW1lO1xyXG4gICAgICAgICAgICBpZiAoIXNjaGVtZSlcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRpclJlc29sdmVyLnJlc29sdmVUeXBlKHVyaSwgbmFtZSwgb3Jlc29sdmUpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGxpYk5hbWUgPSAoc2NoZW1lID09PSBcImxpYlwiKSA/IGxpYlVyaS5ob3N0IDogdXJpO1xyXG4gICAgICAgICAgICB2YXIgbW9kTmFtZSA9IChzY2hlbWUgPT09IFwibGliXCIpID8gbGliVXJpLmFic29sdXRlUGF0aCA6IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciBsaWIgPSB0aGlzLiQkbGlic1tsaWJOYW1lXTtcclxuICAgICAgICAgICAgaWYgKCFsaWIpIHtcclxuICAgICAgICAgICAgICAgIGxpYiA9IHRoaXMuJCRsaWJzW2xpYk5hbWVdID0gdGhpcy5jcmVhdGVMaWJyYXJ5KGxpYk5hbWUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJG9uTGlicmFyeUNyZWF0ZWQobGliKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gbGliLnJlc29sdmVUeXBlKG1vZE5hbWUsIG5hbWUsIG9yZXNvbHZlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRvbkxpYnJhcnlDcmVhdGVkIChsaWI6IElMaWJyYXJ5KSB7XHJcbiAgICAgICAgICAgIHRoaXMubGlicmFyeUNyZWF0ZWQucmFpc2UodGhpcywgT2JqZWN0LmZyZWV6ZSh7bGlicmFyeTogbGlifSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGNsYXNzIE1lbW9pemVyPFQ+IHtcclxuICAgICAgICBwcml2YXRlICQkY3JlYXRvcjogKGtleTogc3RyaW5nKSA9PiBUO1xyXG4gICAgICAgIHByaXZhdGUgJCRjYWNoZTogYW55ID0ge307XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yIChjcmVhdG9yOiAoa2V5OiBzdHJpbmcpID0+IFQpIHtcclxuICAgICAgICAgICAgdGhpcy4kJGNyZWF0b3IgPSBjcmVhdG9yO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWVtb2l6ZSAoa2V5OiBzdHJpbmcpOiBUIHtcclxuICAgICAgICAgICAgdmFyIG9iaiA9IHRoaXMuJCRjYWNoZVtrZXldO1xyXG4gICAgICAgICAgICBpZiAoIW9iailcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRjYWNoZVtrZXldID0gb2JqID0gdGhpcy4kJGNyZWF0b3Ioa2V5KTtcclxuICAgICAgICAgICAgcmV0dXJuIG9iajtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRQcm9wZXJ0eURlc2NyaXB0b3IgKG9iajogYW55LCBuYW1lOiBzdHJpbmcpOiBQcm9wZXJ0eURlc2NyaXB0b3Ige1xyXG4gICAgICAgIGlmICghb2JqKVxyXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgIHZhciB0eXBlOiBGdW5jdGlvbiA9ICg8YW55Pm9iaikuY29uc3RydWN0b3I7XHJcbiAgICAgICAgdmFyIHByb3BEZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0eXBlLnByb3RvdHlwZSwgbmFtZSk7XHJcbiAgICAgICAgaWYgKHByb3BEZXNjKVxyXG4gICAgICAgICAgICByZXR1cm4gcHJvcERlc2M7XHJcbiAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqLCBuYW1lKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gaGFzUHJvcGVydHkgKG9iajogYW55LCBuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICBpZiAoIW9iailcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkobmFtZSkpXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIHZhciB0eXBlID0gb2JqLmNvbnN0cnVjdG9yO1xyXG4gICAgICAgIHJldHVybiB0eXBlLnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eShuYW1lKTtcclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJUHJvcGVydHlJbmZvIHtcclxuICAgICAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICAgICAgZ2V0VmFsdWUob2JqOiBhbnkpOiBhbnk7XHJcbiAgICAgICAgc2V0VmFsdWUob2JqOiBhbnksIHZhbHVlOiBhbnkpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBQcm9wZXJ0eUluZm8gaW1wbGVtZW50cyBJUHJvcGVydHlJbmZvIHtcclxuICAgICAgICBwcml2YXRlICQkZ2V0RnVuYzogKCkgPT4gYW55O1xyXG4gICAgICAgIHByaXZhdGUgJCRzZXRGdW5jOiAodmFsdWU6IGFueSkgPT4gYW55O1xyXG5cclxuICAgICAgICBuYW1lOiBzdHJpbmc7XHJcblxyXG4gICAgICAgIGdldFZhbHVlIChvYmo6IGFueSk6IGFueSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLiQkZ2V0RnVuYylcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiQkZ2V0RnVuYy5jYWxsKG9iaik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRWYWx1ZSAob2JqOiBhbnksIHZhbHVlOiBhbnkpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJCRzZXRGdW5jKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJCRzZXRGdW5jLmNhbGwob2JqLCB2YWx1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzdGF0aWMgZmluZCAodHlwZU9yT2JqOiBhbnksIG5hbWU6IHN0cmluZyk6IElQcm9wZXJ0eUluZm8ge1xyXG4gICAgICAgICAgICB2YXIgbyA9IHR5cGVPck9iajtcclxuICAgICAgICAgICAgdmFyIGlzVHlwZSA9IHR5cGVPck9iaiBpbnN0YW5jZW9mIEZ1bmN0aW9uO1xyXG4gICAgICAgICAgICBpZiAoaXNUeXBlKVxyXG4gICAgICAgICAgICAgICAgbyA9IG5ldyB0eXBlT3JPYmooKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghKG8gaW5zdGFuY2VvZiBPYmplY3QpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgICAgICB2YXIgbmFtZUNsb3N1cmUgPSBuYW1lO1xyXG4gICAgICAgICAgICB2YXIgcHJvcERlc2MgPSBnZXRQcm9wZXJ0eURlc2NyaXB0b3IobywgbmFtZSk7XHJcbiAgICAgICAgICAgIGlmIChwcm9wRGVzYykge1xyXG4gICAgICAgICAgICAgICAgdmFyIHBpID0gbmV3IFByb3BlcnR5SW5mbygpO1xyXG4gICAgICAgICAgICAgICAgcGkubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgICAgICAgICBwaS4kJGdldEZ1bmMgPSBwcm9wRGVzYy5nZXQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXBpLiQkZ2V0RnVuYylcclxuICAgICAgICAgICAgICAgICAgICBwaS4kJGdldEZ1bmMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzW25hbWVDbG9zdXJlXTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgcGkuJCRzZXRGdW5jID0gcHJvcERlc2Muc2V0O1xyXG4gICAgICAgICAgICAgICAgaWYgKCFwaS4kJHNldEZ1bmMgJiYgcHJvcERlc2Mud3JpdGFibGUpXHJcbiAgICAgICAgICAgICAgICAgICAgcGkuJCRzZXRGdW5jID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbbmFtZUNsb3N1cmVdID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwaTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIHR5cGUgPSBpc1R5cGUgPyB0eXBlT3JPYmogOiB0eXBlT3JPYmouY29uc3RydWN0b3I7XHJcbiAgICAgICAgICAgIHZhciBwaSA9IG5ldyBQcm9wZXJ0eUluZm8oKTtcclxuICAgICAgICAgICAgcGkubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgICAgIHBpLiQkZ2V0RnVuYyA9IHR5cGUucHJvdG90eXBlW1wiR2V0XCIgKyBuYW1lXTtcclxuICAgICAgICAgICAgcGkuJCRzZXRGdW5jID0gdHlwZS5wcm90b3R5cGVbXCJTZXRcIiArIG5hbWVdO1xyXG4gICAgICAgICAgICByZXR1cm4gcGk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0VHlwZU5hbWUgKHR5cGU6IEZ1bmN0aW9uKTogc3RyaW5nIHtcclxuICAgICAgICB2YXIgdCA9IDxhbnk+dHlwZTtcclxuICAgICAgICBpZiAoIXQpXHJcbiAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgIHZhciBuYW1lID0gdC5uYW1lO1xyXG4gICAgICAgIGlmIChuYW1lKVxyXG4gICAgICAgICAgICByZXR1cm4gbmFtZTtcclxuICAgICAgICB2YXIgbmFtZSA9IHQudG9TdHJpbmcoKS5tYXRjaCgvZnVuY3Rpb24gKFteXFwoXSspLylbMV07XHJcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHQsIFwibmFtZVwiLCB7ZW51bWVyYWJsZTogZmFsc2UsIHZhbHVlOiBuYW1lLCB3cml0YWJsZTogZmFsc2V9KTtcclxuICAgICAgICByZXR1cm4gbmFtZTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0VHlwZVBhcmVudCAodHlwZTogRnVuY3Rpb24pOiBGdW5jdGlvbiB7XHJcbiAgICAgICAgaWYgKHR5cGUgPT09IE9iamVjdClcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgdmFyIHAgPSAoPGFueT50eXBlKS4kJHBhcmVudDtcclxuICAgICAgICBpZiAoIXApIHtcclxuICAgICAgICAgICAgaWYgKCF0eXBlLnByb3RvdHlwZSlcclxuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHAgPSA8RnVuY3Rpb24+T2JqZWN0LmdldFByb3RvdHlwZU9mKHR5cGUucHJvdG90eXBlKS5jb25zdHJ1Y3RvcjtcclxuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHR5cGUsIFwiJCRwYXJlbnRcIiwge3ZhbHVlOiBwLCB3cml0YWJsZTogZmFsc2V9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHA7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGFkZFR5cGVJbnRlcmZhY2VzICh0eXBlOiBGdW5jdGlvbiwgLi4uaW50ZXJmYWNlczogSUludGVyZmFjZURlY2xhcmF0aW9uPGFueT5bXSkge1xyXG4gICAgICAgIGlmICghaW50ZXJmYWNlcylcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIGZvciAodmFyIGogPSAwLCBsZW4gPSBpbnRlcmZhY2VzLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XHJcbiAgICAgICAgICAgIGlmICghaW50ZXJmYWNlc1tqXSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiUmVnaXN0ZXJpbmcgdW5kZWZpbmVkIGludGVyZmFjZSBvbiB0eXBlLlwiLCB0eXBlKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0eXBlLCBcIiQkaW50ZXJmYWNlc1wiLCB7dmFsdWU6IGludGVyZmFjZXMsIHdyaXRhYmxlOiBmYWxzZX0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBkb2VzSW5oZXJpdEZyb20gKHQ6IEZ1bmN0aW9uLCB0eXBlOiBhbnkpOiBib29sZWFuIHtcclxuICAgICAgICB2YXIgdGVtcCA9IDxGdW5jdGlvbj48YW55PnQ7XHJcbiAgICAgICAgd2hpbGUgKHRlbXAgJiYgdGVtcCAhPT0gdHlwZSkge1xyXG4gICAgICAgICAgICB0ZW1wID0gZ2V0VHlwZVBhcmVudCh0ZW1wKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRlbXAgIT0gbnVsbDtcclxuICAgIH1cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJjb252ZXJzaW9uXCIgLz5cclxuXHJcbm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGVudW0gVXJpS2luZCB7XHJcbiAgICAgICAgUmVsYXRpdmVPckFic29sdXRlID0gMCxcclxuICAgICAgICBBYnNvbHV0ZSA9IDEsXHJcbiAgICAgICAgUmVsYXRpdmUgPSAyXHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgVXJpIHtcclxuICAgICAgICBwcml2YXRlICQkb3JpZ2luYWxTdHJpbmc6IHN0cmluZztcclxuICAgICAgICBwcml2YXRlICQka2luZDogVXJpS2luZDtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IgKHVyaTogVXJpKTtcclxuICAgICAgICBjb25zdHJ1Y3RvciAodXJpOiBzdHJpbmcsIGtpbmQ/OiBVcmlLaW5kKTtcclxuICAgICAgICBjb25zdHJ1Y3RvciAodXJpPzogYW55LCBraW5kPzogVXJpS2luZCkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHVyaSA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJG9yaWdpbmFsU3RyaW5nID0gdXJpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJGtpbmQgPSBraW5kIHx8IFVyaUtpbmQuUmVsYXRpdmVPckFic29sdXRlO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHVyaSBpbnN0YW5jZW9mIFVyaSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJG9yaWdpbmFsU3RyaW5nID0gKDxVcmk+dXJpKS4kJG9yaWdpbmFsU3RyaW5nO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJGtpbmQgPSAoPFVyaT51cmkpLiQka2luZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0IGtpbmQgKCk6IFVyaUtpbmQge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy4kJGtpbmQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXQgaG9zdCAoKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgdmFyIHMgPSB0aGlzLiQkb3JpZ2luYWxTdHJpbmc7XHJcbiAgICAgICAgICAgIHZhciBpbmQgPSBNYXRoLm1heCgzLCBzLmluZGV4T2YoXCI6Ly9cIikgKyAzKTtcclxuICAgICAgICAgICAgdmFyIGVuZCA9IHMuaW5kZXhPZihcIi9cIiwgaW5kKTtcclxuICAgICAgICAgICAgLy9UT0RPOiBTdHJpcCBwb3J0XHJcbiAgICAgICAgICAgIHJldHVybiAoZW5kIDwgMCkgPyBzLnN1YnN0cihpbmQpIDogcy5zdWJzdHIoaW5kLCBlbmQgLSBpbmQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0IGFic29sdXRlUGF0aCAoKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgdmFyIHMgPSB0aGlzLiQkb3JpZ2luYWxTdHJpbmc7XHJcbiAgICAgICAgICAgIHZhciBpbmQgPSBNYXRoLm1heCgzLCBzLmluZGV4T2YoXCI6Ly9cIikgKyAzKTtcclxuICAgICAgICAgICAgdmFyIHN0YXJ0ID0gcy5pbmRleE9mKFwiL1wiLCBpbmQpO1xyXG4gICAgICAgICAgICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0IDwgaW5kKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiL1wiO1xyXG4gICAgICAgICAgICB2YXIgcXN0YXJ0ID0gcy5pbmRleE9mKFwiP1wiLCBzdGFydCk7XHJcbiAgICAgICAgICAgIGlmIChxc3RhcnQgPCAwIHx8IHFzdGFydCA8IHN0YXJ0KVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHMuc3Vic3RyKHN0YXJ0KTtcclxuICAgICAgICAgICAgcmV0dXJuIHMuc3Vic3RyKHN0YXJ0LCBxc3RhcnQgLSBzdGFydCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXQgc2NoZW1lICgpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICB2YXIgcyA9IHRoaXMuJCRvcmlnaW5hbFN0cmluZztcclxuICAgICAgICAgICAgdmFyIGluZCA9IHMuaW5kZXhPZihcIjovL1wiKTtcclxuICAgICAgICAgICAgaWYgKGluZCA8IDApXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgcmV0dXJuIHMuc3Vic3RyKDAsIGluZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXQgZnJhZ21lbnQgKCk6IHN0cmluZyB7XHJcbiAgICAgICAgICAgIHZhciBzID0gdGhpcy4kJG9yaWdpbmFsU3RyaW5nO1xyXG4gICAgICAgICAgICB2YXIgaW5kID0gcy5pbmRleE9mKFwiI1wiKTtcclxuICAgICAgICAgICAgaWYgKGluZCA8IDApXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgcmV0dXJuIHMuc3Vic3RyKGluZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXQgb3JpZ2luYWxTdHJpbmcgKCk6IHN0cmluZyB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLiQkb3JpZ2luYWxTdHJpbmcudG9TdHJpbmcoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRvU3RyaW5nICgpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy4kJG9yaWdpbmFsU3RyaW5nLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBlcXVhbHMgKG90aGVyOiBVcmkpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuJCRvcmlnaW5hbFN0cmluZyA9PT0gb3RoZXIuJCRvcmlnaW5hbFN0cmluZztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN0YXRpYyBpc051bGxPckVtcHR5ICh1cmk6IFVyaSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAodXJpID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgcmV0dXJuICF1cmkuJCRvcmlnaW5hbFN0cmluZztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZWdpc3RlclR5cGVDb252ZXJ0ZXIoVXJpLCAodmFsOiBhbnkpOiBhbnkgPT4ge1xyXG4gICAgICAgIGlmICh2YWwgPT0gbnVsbClcclxuICAgICAgICAgICAgdmFsID0gXCJcIjtcclxuICAgICAgICByZXR1cm4gbmV3IFVyaSh2YWwudG9TdHJpbmcoKSk7XHJcbiAgICB9KTtcclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJVcmlcIiAvPlxyXG5cclxubW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElPdXRUeXBlIHtcclxuICAgICAgICB0eXBlOiBhbnk7XHJcbiAgICAgICAgaXNQcmltaXRpdmU6IGJvb2xlYW47XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJVHlwZU1hbmFnZXIge1xyXG4gICAgICAgIGRlZmF1bHRVcmk6IHN0cmluZztcclxuICAgICAgICB4VXJpOiBzdHJpbmc7XHJcbiAgICAgICAgcmVzb2x2ZUxpYnJhcnkgKHVyaTogc3RyaW5nKTogSUxpYnJhcnk7XHJcbiAgICAgICAgbG9hZFR5cGVBc3luYyAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IGFzeW5jLklBc3luY1JlcXVlc3Q8YW55PjtcclxuICAgICAgICByZXNvbHZlVHlwZSh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nLCAvKiBvdXQgKi9vcmVzb2x2ZTogSU91dFR5cGUpOiBib29sZWFuO1xyXG4gICAgICAgIGFkZCAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgdHlwZTogYW55KTogSVR5cGVNYW5hZ2VyO1xyXG4gICAgICAgIGFkZFByaW1pdGl2ZSAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgdHlwZTogYW55KTogSVR5cGVNYW5hZ2VyO1xyXG4gICAgICAgIGFkZEVudW0gKHVyaTogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIGVudTogYW55KTogSVR5cGVNYW5hZ2VyO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIFR5cGVNYW5hZ2VyIGltcGxlbWVudHMgSVR5cGVNYW5hZ2VyIHtcclxuICAgICAgICBsaWJSZXNvbHZlcjogSUxpYnJhcnlSZXNvbHZlciA9IG5ldyBMaWJyYXJ5UmVzb2x2ZXIoKTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IgKHB1YmxpYyBkZWZhdWx0VXJpOiBzdHJpbmcsIHB1YmxpYyB4VXJpOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgdGhpcy5saWJSZXNvbHZlci5yZXNvbHZlKGRlZmF1bHRVcmkpXHJcbiAgICAgICAgICAgICAgICAuYWRkKEFycmF5LCBcIkFycmF5XCIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5saWJSZXNvbHZlci5yZXNvbHZlKHhVcmkpXHJcbiAgICAgICAgICAgICAgICAuYWRkUHJpbWl0aXZlKFN0cmluZywgXCJTdHJpbmdcIilcclxuICAgICAgICAgICAgICAgIC5hZGRQcmltaXRpdmUoTnVtYmVyLCBcIk51bWJlclwiKVxyXG4gICAgICAgICAgICAgICAgLmFkZFByaW1pdGl2ZShOdW1iZXIsIFwiRG91YmxlXCIpXHJcbiAgICAgICAgICAgICAgICAuYWRkUHJpbWl0aXZlKERhdGUsIFwiRGF0ZVwiKVxyXG4gICAgICAgICAgICAgICAgLmFkZFByaW1pdGl2ZShSZWdFeHAsIFwiUmVnRXhwXCIpXHJcbiAgICAgICAgICAgICAgICAuYWRkUHJpbWl0aXZlKEJvb2xlYW4sIFwiQm9vbGVhblwiKVxyXG4gICAgICAgICAgICAgICAgLmFkZFByaW1pdGl2ZShVcmksIFwiVXJpXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVzb2x2ZUxpYnJhcnkgKHVyaTogc3RyaW5nKTogSUxpYnJhcnkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5saWJSZXNvbHZlci5yZXNvbHZlKHVyaSB8fCB0aGlzLmRlZmF1bHRVcmkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZFR5cGVBc3luYyAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IGFzeW5jLklBc3luY1JlcXVlc3Q8YW55PiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxpYlJlc29sdmVyLmxvYWRUeXBlQXN5bmModXJpIHx8IHRoaXMuZGVmYXVsdFVyaSwgbmFtZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXNvbHZlVHlwZSAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgLyogb3V0ICovb3Jlc29sdmU6IElPdXRUeXBlKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIG9yZXNvbHZlLmlzUHJpbWl0aXZlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIG9yZXNvbHZlLnR5cGUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxpYlJlc29sdmVyLnJlc29sdmVUeXBlKHVyaSB8fCB0aGlzLmRlZmF1bHRVcmksIG5hbWUsIG9yZXNvbHZlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFkZCAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgdHlwZTogYW55KTogSVR5cGVNYW5hZ2VyIHtcclxuICAgICAgICAgICAgdmFyIGxpYiA9IHRoaXMubGliUmVzb2x2ZXIucmVzb2x2ZSh1cmkgfHwgdGhpcy5kZWZhdWx0VXJpKTtcclxuICAgICAgICAgICAgaWYgKGxpYilcclxuICAgICAgICAgICAgICAgIGxpYi5hZGQodHlwZSwgbmFtZSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWRkUHJpbWl0aXZlICh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nLCB0eXBlOiBhbnkpOiBJVHlwZU1hbmFnZXIge1xyXG4gICAgICAgICAgICB2YXIgbGliID0gdGhpcy5saWJSZXNvbHZlci5yZXNvbHZlKHVyaSB8fCB0aGlzLmRlZmF1bHRVcmkpO1xyXG4gICAgICAgICAgICBpZiAobGliKVxyXG4gICAgICAgICAgICAgICAgbGliLmFkZFByaW1pdGl2ZSh0eXBlLCBuYW1lKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhZGRFbnVtICh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nLCBlbnU6IGFueSk6IElUeXBlTWFuYWdlciB7XHJcbiAgICAgICAgICAgIHZhciBsaWIgPSB0aGlzLmxpYlJlc29sdmVyLnJlc29sdmUodXJpIHx8IHRoaXMuZGVmYXVsdFVyaSk7XHJcbiAgICAgICAgICAgIGlmIChsaWIpXHJcbiAgICAgICAgICAgICAgICBsaWIuYWRkRW51bShlbnUsIG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBjbGFzcyBBZ2dyZWdhdGVFcnJvciB7XHJcbiAgICAgICAgZXJyb3JzOiBhbnlbXTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IgKGVycm9yczogYW55W10pIHtcclxuICAgICAgICAgICAgdGhpcy5lcnJvcnMgPSBlcnJvcnMuZmlsdGVyKGUgPT4gISFlKTtcclxuICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZSh0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldCBmbGF0ICgpOiBhbnlbXSB7XHJcbiAgICAgICAgICAgIHZhciBmbGF0OiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgZXJycyA9IHRoaXMuZXJyb3JzOyBpIDwgZXJycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIGVyciA9IGVycnNbaV07XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgQWdncmVnYXRlRXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBmbGF0ID0gZmxhdC5jb25jYXQoKDxBZ2dyZWdhdGVFcnJvcj5lcnIpLmZsYXQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBmbGF0LnB1c2goZXJyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZmxhdDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBjbGFzcyBEaXJMb2FkRXJyb3Ige1xyXG4gICAgICAgIGNvbnN0cnVjdG9yIChwdWJsaWMgcGF0aDogc3RyaW5nLCBwdWJsaWMgZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKHRoaXMpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGNsYXNzIExpYnJhcnlMb2FkRXJyb3Ige1xyXG4gICAgICAgIGNvbnN0cnVjdG9yIChwdWJsaWMgbGlicmFyeTogTGlicmFyeSwgcHVibGljIGVycm9yOiBFcnJvcikge1xyXG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKHRoaXMpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUubWFya3VwIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSU1hcmt1cEV4dGVuc2lvbiB7XHJcbiAgICAgICAgaW5pdCh2YWw6IHN0cmluZyk7XHJcbiAgICAgICAgcmVzb2x2ZVR5cGVGaWVsZHM/KHJlc29sdmVyOiAoZnVsbDogc3RyaW5nKSA9PiBhbnkpO1xyXG4gICAgICAgIHRyYW5zbXV0ZT8ob3M6IGFueVtdKTogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBmaW5pc2hNYXJrdXBFeHRlbnNpb24gKG1lOiBJTWFya3VwRXh0ZW5zaW9uLCBwcmVmaXhSZXNvbHZlcjogSU5zUHJlZml4UmVzb2x2ZXIsIHJlc29sdmVyOiBldmVudHMuSVJlc29sdmVUeXBlLCBvczogYW55W10pOiBhbnkge1xyXG4gICAgICAgIGlmICghbWUpXHJcbiAgICAgICAgICAgIHJldHVybiBtZTtcclxuICAgICAgICBpZiAodHlwZW9mIG1lLnJlc29sdmVUeXBlRmllbGRzID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICAgICAgbWUucmVzb2x2ZVR5cGVGaWVsZHMoKGZ1bGwpID0+IHBhcnNlVHlwZShmdWxsLCBwcmVmaXhSZXNvbHZlciwgcmVzb2x2ZXIpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHR5cGVvZiBtZS50cmFuc211dGUgPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgICAgICByZXR1cm4gbWUudHJhbnNtdXRlKG9zKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG1lO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhcnNlVHlwZSAoZnVsbDogc3RyaW5nLCBwcmVmaXhSZXNvbHZlcjogSU5zUHJlZml4UmVzb2x2ZXIsIHJlc29sdmVyOiBldmVudHMuSVJlc29sdmVUeXBlKSB7XHJcbiAgICAgICAgdmFyIHByZWZpeDogc3RyaW5nID0gbnVsbDtcclxuICAgICAgICB2YXIgbmFtZSA9IGZ1bGw7XHJcbiAgICAgICAgdmFyIGluZCA9IG5hbWUuaW5kZXhPZihcIjpcIik7XHJcbiAgICAgICAgaWYgKGluZCA+IC0xKSB7XHJcbiAgICAgICAgICAgIHByZWZpeCA9IG5hbWUuc3Vic3RyKDAsIGluZCk7XHJcbiAgICAgICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cihpbmQgKyAxKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHVyaSA9IHByZWZpeFJlc29sdmVyLmxvb2t1cE5hbWVzcGFjZVVSSShwcmVmaXgpO1xyXG4gICAgICAgIHZhciBvcnQgPSByZXNvbHZlcih1cmksIG5hbWUpO1xyXG4gICAgICAgIHJldHVybiBvcnQudHlwZTtcclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUubWFya3VwIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSU1hcmt1cFBhcnNlcjxUPiB7XHJcbiAgICAgICAgb24obGlzdGVuZXI6IElNYXJrdXBTYXg8VD4pOiBJTWFya3VwUGFyc2VyPFQ+XHJcbiAgICAgICAgc2V0TmFtZXNwYWNlcyAoZGVmYXVsdFhtbG5zOiBzdHJpbmcsIHhYbWxuczogc3RyaW5nKTogSU1hcmt1cFBhcnNlcjxUPjtcclxuICAgICAgICBzZXRFeHRlbnNpb25QYXJzZXIgKHBhcnNlcjogSU1hcmt1cEV4dGVuc2lvblBhcnNlcik6IElNYXJrdXBQYXJzZXI8VD47XHJcbiAgICAgICAgcGFyc2Uocm9vdDogVCk7XHJcbiAgICAgICAgc2tpcEJyYW5jaCgpO1xyXG4gICAgICAgIHJlc29sdmVQcmVmaXggKHByZWZpeDogc3RyaW5nKTogc3RyaW5nO1xyXG4gICAgICAgIHdhbGtVcE9iamVjdHMgKCk6IElFbnVtZXJhdG9yPGFueT47XHJcbiAgICB9XHJcbiAgICBleHBvcnQgdmFyIE5PX1BBUlNFUjogSU1hcmt1cFBhcnNlcjxhbnk+ID0ge1xyXG4gICAgICAgIG9uIChsaXN0ZW5lcjogSU1hcmt1cFNheDxhbnk+KTogSU1hcmt1cFBhcnNlcjxhbnk+IHtcclxuICAgICAgICAgICAgcmV0dXJuIE5PX1BBUlNFUjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldE5hbWVzcGFjZXMgKGRlZmF1bHRYbWxuczogc3RyaW5nLCB4WG1sbnM6IHN0cmluZyk6IElNYXJrdXBQYXJzZXI8YW55PiB7XHJcbiAgICAgICAgICAgIHJldHVybiBOT19QQVJTRVI7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXRFeHRlbnNpb25QYXJzZXIgKHBhcnNlcjogSU1hcmt1cEV4dGVuc2lvblBhcnNlcik6IElNYXJrdXBQYXJzZXI8YW55PiB7XHJcbiAgICAgICAgICAgIHJldHVybiBOT19QQVJTRVI7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBwYXJzZSAocm9vdDogYW55KSB7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBza2lwQnJhbmNoICgpOiBhbnkge1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVzb2x2ZVByZWZpeCAocHJlZml4OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHdhbGtVcE9iamVjdHMgKCk6IElFbnVtZXJhdG9yPGFueT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gSUVudW1lcmF0b3JfLmVtcHR5O1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSU1hcmt1cFNheDxUPiB7XHJcbiAgICAgICAgcmVzb2x2ZVR5cGU/OiBldmVudHMuSVJlc29sdmVUeXBlO1xyXG4gICAgICAgIHJlc29sdmVPYmplY3Q/OiBldmVudHMuSVJlc29sdmVPYmplY3Q7XHJcbiAgICAgICAgcmVzb2x2ZVByaW1pdGl2ZT86IGV2ZW50cy5JUmVzb2x2ZVByaW1pdGl2ZTtcclxuICAgICAgICByZXNvbHZlUmVzb3VyY2VzPzogZXZlbnRzLklSZXNvbHZlUmVzb3VyY2VzO1xyXG4gICAgICAgIGJyYW5jaFNraXA/OiBldmVudHMuSUJyYW5jaFNraXA8VD47XHJcbiAgICAgICAgb2JqZWN0PzogZXZlbnRzLklPYmplY3Q7XHJcbiAgICAgICAgb2JqZWN0RW5kPzogZXZlbnRzLklPYmplY3RFbmQ7XHJcbiAgICAgICAgY29udGVudFRleHQ/OiBldmVudHMuSVRleHQ7XHJcbiAgICAgICAgbmFtZT86IGV2ZW50cy5JTmFtZTtcclxuICAgICAgICBwcm9wZXJ0eVN0YXJ0PzogZXZlbnRzLklQcm9wZXJ0eVN0YXJ0O1xyXG4gICAgICAgIHByb3BlcnR5RW5kPzogZXZlbnRzLklQcm9wZXJ0eUVuZDtcclxuICAgICAgICBhdHRyaWJ1dGVTdGFydD86IGV2ZW50cy5JQXR0cmlidXRlU3RhcnQ7XHJcbiAgICAgICAgYXR0cmlidXRlRW5kPzogZXZlbnRzLklBdHRyaWJ1dGVFbmQ7XHJcbiAgICAgICAgZXJyb3I/OiBldmVudHMuSVJlc3VtYWJsZUVycm9yO1xyXG4gICAgICAgIGVuZD86ICgpID0+IGFueTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgb3Jlc29sdmU6IElPdXRUeXBlID0ge1xyXG4gICAgICAgIGlzUHJpbWl0aXZlOiBmYWxzZSxcclxuICAgICAgICB0eXBlOiBPYmplY3RcclxuICAgIH07XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU1hcmt1cFNheDxUPiAobGlzdGVuZXI6IElNYXJrdXBTYXg8VD4pOiBJTWFya3VwU2F4PFQ+IHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXNvbHZlVHlwZTogbGlzdGVuZXIucmVzb2x2ZVR5cGUgfHwgKCh1cmksIG5hbWUpID0+IG9yZXNvbHZlKSxcclxuICAgICAgICAgICAgcmVzb2x2ZU9iamVjdDogbGlzdGVuZXIucmVzb2x2ZU9iamVjdCB8fCAoKHR5cGUpID0+IG5ldyAodHlwZSkoKSksXHJcbiAgICAgICAgICAgIHJlc29sdmVQcmltaXRpdmU6IGxpc3RlbmVyLnJlc29sdmVQcmltaXRpdmUgfHwgKCh0eXBlLCB0ZXh0KSA9PiBuZXcgKHR5cGUpKHRleHQpKSxcclxuICAgICAgICAgICAgcmVzb2x2ZVJlc291cmNlczogbGlzdGVuZXIucmVzb2x2ZVJlc291cmNlcyB8fCAoKG93bmVyLCBvd25lclR5cGUpID0+IG5ldyBPYmplY3QoKSksXHJcbiAgICAgICAgICAgIGJyYW5jaFNraXA6IGxpc3RlbmVyLmJyYW5jaFNraXAgfHwgKChyb290LCBvYmopID0+IHtcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIG9iamVjdDogbGlzdGVuZXIub2JqZWN0IHx8ICgob2JqLCBpc0NvbnRlbnQpID0+IHtcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIG9iamVjdEVuZDogbGlzdGVuZXIub2JqZWN0RW5kIHx8ICgob2JqLCBpc0NvbnRlbnQsIHByZXYpID0+IHtcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIGNvbnRlbnRUZXh0OiBsaXN0ZW5lci5jb250ZW50VGV4dCB8fCAoKHRleHQpID0+IHtcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIG5hbWU6IGxpc3RlbmVyLm5hbWUgfHwgKChuYW1lKSA9PiB7XHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBwcm9wZXJ0eVN0YXJ0OiBsaXN0ZW5lci5wcm9wZXJ0eVN0YXJ0IHx8ICgob3duZXJUeXBlLCBwcm9wTmFtZSkgPT4ge1xyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgcHJvcGVydHlFbmQ6IGxpc3RlbmVyLnByb3BlcnR5RW5kIHx8ICgob3duZXJUeXBlLCBwcm9wTmFtZSkgPT4ge1xyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgYXR0cmlidXRlU3RhcnQ6IGxpc3RlbmVyLmF0dHJpYnV0ZVN0YXJ0IHx8ICgob3duZXJUeXBlLCBhdHRyTmFtZSkgPT4ge1xyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgYXR0cmlidXRlRW5kOiBsaXN0ZW5lci5hdHRyaWJ1dGVFbmQgfHwgKChvd25lclR5cGUsIGF0dHJOYW1lLCBvYmopID0+IHtcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIGVycm9yOiBsaXN0ZW5lci5lcnJvciB8fCAoKGUpID0+IHRydWUpLFxyXG4gICAgICAgICAgICBlbmQ6IGxpc3RlbmVyLmVuZCB8fCAoKCkgPT4ge1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lLm1hcmt1cCB7XHJcbiAgICBleHBvcnQgY2xhc3MgTWFya3VwPFQ+IHtcclxuICAgICAgICB1cmk6IFVyaTtcclxuICAgICAgICByb290OiBUO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvciAodXJpOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgdGhpcy51cmkgPSBuZXcgVXJpKHVyaSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjcmVhdGVQYXJzZXIgKCk6IElNYXJrdXBQYXJzZXI8VD4ge1xyXG4gICAgICAgICAgICByZXR1cm4gTk9fUEFSU0VSO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVzb2x2ZSAodHlwZW1ncjogSVR5cGVNYW5hZ2VyLCBjdXN0b21Db2xsZWN0b3I/OiBJQ3VzdG9tQ29sbGVjdG9yKTogYXN5bmMuSUFzeW5jUmVxdWVzdDxhbnk+IHtcclxuICAgICAgICAgICAgdmFyIHJlc29sdmVyID0gbmV3IE1hcmt1cERlcGVuZGVuY3lSZXNvbHZlcjxUPih0eXBlbWdyLCB0aGlzLmNyZWF0ZVBhcnNlcigpKTtcclxuICAgICAgICAgICAgcmVzb2x2ZXIuY29sbGVjdCh0aGlzLnJvb3QsIGN1c3RvbUNvbGxlY3Rvcik7XHJcbiAgICAgICAgICAgIHJldHVybiByZXNvbHZlci5yZXNvbHZlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsb2FkQXN5bmMgKCk6IGFzeW5jLklBc3luY1JlcXVlc3Q8TWFya3VwPFQ+PiB7XHJcbiAgICAgICAgICAgIHZhciByZXFVcmkgPSBcInRleHQhXCIgKyB0aGlzLnVyaS50b1N0cmluZygpO1xyXG4gICAgICAgICAgICB2YXIgbWQgPSB0aGlzO1xyXG4gICAgICAgICAgICByZXR1cm4gYXN5bmMuY3JlYXRlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgICAgICg8RnVuY3Rpb24+cmVxdWlyZSkoW3JlcVVyaV0sIChkYXRhOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBtZC5zZXRSb290KG1kLmxvYWRSb290KGRhdGEpKTtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG1kKTtcclxuICAgICAgICAgICAgICAgIH0sIHJlamVjdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZFJvb3QgKGRhdGE6IHN0cmluZyk6IFQge1xyXG4gICAgICAgICAgICByZXR1cm4gPFQ+PGFueT5kYXRhO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0Um9vdCAobWFya3VwOiBUKTogTWFya3VwPFQ+IHtcclxuICAgICAgICAgICAgdGhpcy5yb290ID0gbWFya3VwO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lLm1hcmt1cCB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElDdXN0b21Db2xsZWN0b3Ige1xyXG4gICAgICAgIChvd25lclVyaTogc3RyaW5nLCBvd25lck5hbWU6IHN0cmluZywgcHJvcE5hbWU6IHN0cmluZywgdmFsOiBhbnkpO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJTWFya3VwRGVwZW5kZW5jeVJlc29sdmVyPFQ+IHtcclxuICAgICAgICBhZGQodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IGJvb2xlYW47XHJcbiAgICAgICAgY29sbGVjdChyb290OiBULCBjdXN0b21Db2xsZWN0b3I/OiBJQ3VzdG9tQ29sbGVjdG9yKTtcclxuICAgICAgICByZXNvbHZlKCk6IGFzeW5jLklBc3luY1JlcXVlc3Q8YW55PjtcclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBNYXJrdXBEZXBlbmRlbmN5UmVzb2x2ZXI8VD4gaW1wbGVtZW50cyBJTWFya3VwRGVwZW5kZW5jeVJlc29sdmVyPFQ+IHtcclxuICAgICAgICBwcml2YXRlICQkdXJpczogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBwcml2YXRlICQkbmFtZXM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgICAgcHJpdmF0ZSAkJHJlc29sdmluZzogc3RyaW5nW10gPSBbXTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IgKHB1YmxpYyB0eXBlTWFuYWdlcjogSVR5cGVNYW5hZ2VyLCBwdWJsaWMgcGFyc2VyOiBJTWFya3VwUGFyc2VyPFQ+KSB7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb2xsZWN0IChyb290OiBULCBjdXN0b21Db2xsZWN0b3I/OiBJQ3VzdG9tQ29sbGVjdG9yKSB7XHJcbiAgICAgICAgICAgIC8vVE9ETzogV2UgbmVlZCB0byBjb2xsZWN0XHJcbiAgICAgICAgICAgIC8vICBSZXNvdXJjZURpY3Rpb25hcnkuU291cmNlXHJcbiAgICAgICAgICAgIC8vICBBcHBsaWNhdGlvbi5UaGVtZU5hbWVcclxuICAgICAgICAgICAgdmFyIGJsYW5rID0ge307XHJcbiAgICAgICAgICAgIHZhciBvcmVzb2x2ZTogSU91dFR5cGUgPSB7XHJcbiAgICAgICAgICAgICAgICBpc1ByaW1pdGl2ZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBPYmplY3RcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdmFyIGxhc3QgPSB7XHJcbiAgICAgICAgICAgICAgICB1cmk6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgb2JqOiB1bmRlZmluZWRcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdmFyIHBhcnNlID0ge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZVR5cGU6ICh1cmksIG5hbWUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZCh1cmksIG5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxhc3QudXJpID0gdXJpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxhc3QubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9yZXNvbHZlO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHJlc29sdmVPYmplY3Q6ICh0eXBlKT0+IHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmxhbms7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgb2JqZWN0RW5kOiAob2JqLCBpc0NvbnRlbnQsIHByZXYpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsYXN0Lm9iaiA9IG9iajtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eUVuZDogKG93bmVyVHlwZSwgcHJvcE5hbWUpID0+IHtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVFbmQ6IChvd25lclR5cGUsIGF0dHJOYW1lLCBvYmopID0+IHtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgaWYgKGN1c3RvbUNvbGxlY3Rvcikge1xyXG4gICAgICAgICAgICAgICAgcGFyc2UucHJvcGVydHlFbmQgPSAob3duZXJUeXBlLCBwcm9wTmFtZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUNvbGxlY3RvcihsYXN0LnVyaSwgbGFzdC5uYW1lLCBwcm9wTmFtZSwgbGFzdC5vYmopO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHBhcnNlLmF0dHJpYnV0ZUVuZCA9IChvd25lclR5cGUsIGF0dHJOYW1lLCBvYmopID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjdXN0b21Db2xsZWN0b3IobGFzdC51cmksIGxhc3QubmFtZSwgYXR0ck5hbWUsIG9iaik7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnBhcnNlclxyXG4gICAgICAgICAgICAgICAgLm9uKHBhcnNlKVxyXG4gICAgICAgICAgICAgICAgLnBhcnNlKHJvb3QpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWRkICh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIHZhciB1cmlzID0gdGhpcy4kJHVyaXM7XHJcbiAgICAgICAgICAgIHZhciBuYW1lcyA9IHRoaXMuJCRuYW1lcztcclxuICAgICAgICAgICAgdmFyIGluZCA9IHVyaXMuaW5kZXhPZih1cmkpO1xyXG4gICAgICAgICAgICBpZiAoaW5kID4gLTEgJiYgbmFtZXNbaW5kXSA9PT0gbmFtZSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJCRyZXNvbHZpbmcuaW5kZXhPZih1cmkgKyBcIi9cIiArIG5hbWUpID4gLTEpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIHVyaXMucHVzaCh1cmkpO1xyXG4gICAgICAgICAgICBuYW1lcy5wdXNoKG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlc29sdmUgKCk6IGFzeW5jLklBc3luY1JlcXVlc3Q8YW55PiB7XHJcbiAgICAgICAgICAgIHZhciBhczogYXN5bmMuSUFzeW5jUmVxdWVzdDxhbnk+W10gPSBbXTtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIHVyaXMgPSB0aGlzLiQkdXJpcywgbmFtZXMgPSB0aGlzLiQkbmFtZXMsIHRtID0gdGhpcy50eXBlTWFuYWdlciwgcmVzb2x2aW5nID0gdGhpcy4kJHJlc29sdmluZzsgaSA8IHVyaXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHZhciB1cmkgPSB1cmlzW2ldO1xyXG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBuYW1lc1tpXTtcclxuICAgICAgICAgICAgICAgIHJlc29sdmluZy5wdXNoKHVyaSArIFwiL1wiICsgbmFtZSk7XHJcbiAgICAgICAgICAgICAgICBhcy5wdXNoKHRtLmxvYWRUeXBlQXN5bmModXJpLCBuYW1lKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGFzeW5jLm1hbnkoYXMpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUubWFya3VwLnhhbWwge1xyXG4gICAgLy8gU3ludGF4OlxyXG4gICAgLy8gICAgICB7PEFsaWFzfE5hbWU+IFs8RGVmYXVsdEtleT49XTxEZWZhdWx0VmFsdWU+fDxLZXk+PTxWYWx1ZT59XHJcbiAgICAvLyBFeGFtcGxlczpcclxuICAgIC8vICB7eDpOdWxsIH1cclxuICAgIC8vICB7eDpUeXBlIH1cclxuICAgIC8vICB7eDpTdGF0aWMgfVxyXG4gICAgLy8gIHtUZW1wbGF0ZUJpbmRpbmcgfVxyXG4gICAgLy8gIHtCaW5kaW5nIH1cclxuICAgIC8vICB7U3RhdGljUmVzb3VyY2UgfVxyXG5cclxuICAgIGludGVyZmFjZSBJUGFyc2VDb250ZXh0IHtcclxuICAgICAgICB0ZXh0OiBzdHJpbmc7XHJcbiAgICAgICAgaTogbnVtYmVyO1xyXG4gICAgICAgIGFjYzogc3RyaW5nO1xyXG4gICAgICAgIGVycm9yOiBhbnk7XHJcbiAgICAgICAgcmVzb2x2ZXI6IElOc1ByZWZpeFJlc29sdmVyO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIFhhbWxFeHRlbnNpb25QYXJzZXIgaW1wbGVtZW50cyBJTWFya3VwRXh0ZW5zaW9uUGFyc2VyIHtcclxuICAgICAgICBwcml2YXRlICQkZGVmYXVsdFhtbG5zID0gXCJodHRwOi8vc2NoZW1hcy53c2ljay5jb20vZmF5ZGVcIjtcclxuICAgICAgICBwcml2YXRlICQkeFhtbG5zID0gXCJodHRwOi8vc2NoZW1hcy53c2ljay5jb20vZmF5ZGUveFwiO1xyXG5cclxuICAgICAgICBwcml2YXRlICQkb25SZXNvbHZlVHlwZTogZXZlbnRzLklSZXNvbHZlVHlwZTtcclxuICAgICAgICBwcml2YXRlICQkb25SZXNvbHZlT2JqZWN0OiBldmVudHMuSVJlc29sdmVPYmplY3Q7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uUmVzb2x2ZVByaW1pdGl2ZTogZXZlbnRzLklSZXNvbHZlUHJpbWl0aXZlO1xyXG4gICAgICAgIHByaXZhdGUgJCRvbkVycm9yOiBldmVudHMuSUVycm9yO1xyXG5cclxuICAgICAgICBzZXROYW1lc3BhY2VzIChkZWZhdWx0WG1sbnM6IHN0cmluZywgeFhtbG5zOiBzdHJpbmcpOiBYYW1sRXh0ZW5zaW9uUGFyc2VyIHtcclxuICAgICAgICAgICAgdGhpcy4kJGRlZmF1bHRYbWxucyA9IGRlZmF1bHRYbWxucztcclxuICAgICAgICAgICAgdGhpcy4kJHhYbWxucyA9IHhYbWxucztcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwYXJzZSAodmFsdWU6IHN0cmluZywgcmVzb2x2ZXI6IElOc1ByZWZpeFJlc29sdmVyLCBvczogYW55W10pOiBhbnkge1xyXG4gICAgICAgICAgICBpZiAoIWlzQWxwaGEodmFsdWVbMV0pKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgICAgICB0aGlzLiQkZW5zdXJlKCk7XHJcbiAgICAgICAgICAgIHZhciBjdHg6IElQYXJzZUNvbnRleHQgPSB7XHJcbiAgICAgICAgICAgICAgICB0ZXh0OiB2YWx1ZSxcclxuICAgICAgICAgICAgICAgIGk6IDEsXHJcbiAgICAgICAgICAgICAgICBhY2M6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICBlcnJvcjogXCJcIixcclxuICAgICAgICAgICAgICAgIHJlc29sdmVyOiByZXNvbHZlclxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB2YXIgb2JqID0gdGhpcy4kJGRvUGFyc2UoY3R4LCBvcyk7XHJcbiAgICAgICAgICAgIGlmIChjdHguZXJyb3IpXHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkb25FcnJvcihjdHguZXJyb3IpO1xyXG4gICAgICAgICAgICBvYmogPSBmaW5pc2hNYXJrdXBFeHRlbnNpb24ob2JqLCByZXNvbHZlciwgdGhpcy4kJG9uUmVzb2x2ZVR5cGUsIG9zKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9iajtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRkb1BhcnNlIChjdHg6IElQYXJzZUNvbnRleHQsIG9zOiBhbnlbXSk6IGFueSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy4kJHBhcnNlTmFtZShjdHgpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdGhpcy4kJHN0YXJ0RXh0ZW5zaW9uKGN0eCwgb3MpO1xyXG5cclxuICAgICAgICAgICAgd2hpbGUgKGN0eC5pIDwgY3R4LnRleHQubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuJCRwYXJzZUtleVZhbHVlKGN0eCwgb3MpKVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgaWYgKGN0eC50ZXh0W2N0eC5pXSA9PT0gXCJ9XCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG9zLnBvcCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJHBhcnNlTmFtZSAoY3R4OiBJUGFyc2VDb250ZXh0KTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIHZhciBpbmQgPSBjdHgudGV4dC5pbmRleE9mKFwiIFwiLCBjdHguaSk7XHJcbiAgICAgICAgICAgIGlmIChpbmQgPiBjdHguaSkge1xyXG4gICAgICAgICAgICAgICAgY3R4LmFjYyA9IGN0eC50ZXh0LnN1YnN0cihjdHguaSwgaW5kIC0gY3R4LmkpO1xyXG4gICAgICAgICAgICAgICAgY3R4LmkgPSBpbmQgKyAxO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaW5kID0gY3R4LnRleHQuaW5kZXhPZihcIn1cIiwgY3R4LmkpO1xyXG4gICAgICAgICAgICBpZiAoaW5kID4gY3R4LmkpIHtcclxuICAgICAgICAgICAgICAgIGN0eC5hY2MgPSBjdHgudGV4dC5zdWJzdHIoY3R4LmksIGluZCAtIGN0eC5pKTtcclxuICAgICAgICAgICAgICAgIGN0eC5pID0gaW5kO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY3R4LmVycm9yID0gXCJNaXNzaW5nIGNsb3NpbmcgYnJhY2tldC5cIjtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJHN0YXJ0RXh0ZW5zaW9uIChjdHg6IElQYXJzZUNvbnRleHQsIG9zOiBhbnlbXSkge1xyXG4gICAgICAgICAgICB2YXIgZnVsbCA9IGN0eC5hY2M7XHJcbiAgICAgICAgICAgIHZhciBpbmQgPSBmdWxsLmluZGV4T2YoXCI6XCIpO1xyXG4gICAgICAgICAgICB2YXIgcHJlZml4ID0gKGluZCA8IDApID8gbnVsbCA6IGZ1bGwuc3Vic3RyKDAsIGluZCk7XHJcbiAgICAgICAgICAgIHZhciBuYW1lID0gKGluZCA8IDApID8gZnVsbCA6IGZ1bGwuc3Vic3RyKGluZCArIDEpO1xyXG4gICAgICAgICAgICB2YXIgdXJpID0gcHJlZml4ID8gY3R4LnJlc29sdmVyLmxvb2t1cE5hbWVzcGFjZVVSSShwcmVmaXgpIDogREVGQVVMVF9YTUxOUztcclxuXHJcbiAgICAgICAgICAgIHZhciBvYmo7XHJcbiAgICAgICAgICAgIGlmICh1cmkgPT09IHRoaXMuJCR4WG1sbnMpIHtcclxuICAgICAgICAgICAgICAgIGlmIChuYW1lID09PSBcIk51bGxcIilcclxuICAgICAgICAgICAgICAgICAgICBvYmogPSB0aGlzLiQkcGFyc2VYTnVsbChjdHgpO1xyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobmFtZSA9PT0gXCJUeXBlXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgb2JqID0gdGhpcy4kJHBhcnNlWFR5cGUoY3R4KTtcclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG5hbWUgPT09IFwiU3RhdGljXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgb2JqID0gdGhpcy4kJHBhcnNlWFN0YXRpYyhjdHgpO1xyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gbWFya3VwIGV4dGVuc2lvbi4gW1wiICsgcHJlZml4ICsgXCI6XCIgKyBuYW1lICsgXCJdXCIpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdmFyIG9ydCA9IHRoaXMuJCRvblJlc29sdmVUeXBlKHVyaSwgbmFtZSk7XHJcbiAgICAgICAgICAgICAgICBvYmogPSB0aGlzLiQkb25SZXNvbHZlT2JqZWN0KG9ydC50eXBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcy5wdXNoKG9iaik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkcGFyc2VYTnVsbCAoY3R4OiBJUGFyc2VDb250ZXh0KTogYW55IHtcclxuICAgICAgICAgICAgdmFyIGluZCA9IGN0eC50ZXh0LmluZGV4T2YoXCJ9XCIsIGN0eC5pKTtcclxuICAgICAgICAgICAgaWYgKGluZCA8IGN0eC5pKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW50ZXJtaW5hdGVkIHN0cmluZyBjb25zdGFudC5cIik7XHJcbiAgICAgICAgICAgIGN0eC5pID0gaW5kO1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRwYXJzZVhUeXBlIChjdHg6IElQYXJzZUNvbnRleHQpOiBhbnkge1xyXG4gICAgICAgICAgICB2YXIgZW5kID0gY3R4LnRleHQuaW5kZXhPZihcIn1cIiwgY3R4LmkpO1xyXG4gICAgICAgICAgICBpZiAoZW5kIDwgY3R4LmkpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbnRlcm1pbmF0ZWQgc3RyaW5nIGNvbnN0YW50LlwiKTtcclxuICAgICAgICAgICAgdmFyIHZhbCA9IGN0eC50ZXh0LnN1YnN0cihjdHguaSwgZW5kIC0gY3R4LmkpO1xyXG4gICAgICAgICAgICBjdHguaSA9IGVuZDtcclxuXHJcbiAgICAgICAgICAgIHZhciBpbmQgPSB2YWwuaW5kZXhPZihcIjpcIik7XHJcbiAgICAgICAgICAgIHZhciBwcmVmaXggPSAoaW5kIDwgMCkgPyBudWxsIDogdmFsLnN1YnN0cigwLCBpbmQpO1xyXG4gICAgICAgICAgICB2YXIgbmFtZSA9IChpbmQgPCAwKSA/IHZhbCA6IHZhbC5zdWJzdHIoaW5kICsgMSk7XHJcbiAgICAgICAgICAgIHZhciB1cmkgPSBjdHgucmVzb2x2ZXIubG9va3VwTmFtZXNwYWNlVVJJKHByZWZpeCk7XHJcbiAgICAgICAgICAgIHZhciBvcnQgPSB0aGlzLiQkb25SZXNvbHZlVHlwZSh1cmksIG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gb3J0LnR5cGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkcGFyc2VYU3RhdGljIChjdHg6IElQYXJzZUNvbnRleHQpOiBhbnkge1xyXG4gICAgICAgICAgICB2YXIgdGV4dCA9IGN0eC50ZXh0O1xyXG4gICAgICAgICAgICB2YXIgbGVuID0gdGV4dC5sZW5ndGg7XHJcbiAgICAgICAgICAgIHZhciBzdGFydCA9IGN0eC5pO1xyXG4gICAgICAgICAgICBmb3IgKDsgY3R4LmkgPCBsZW47IGN0eC5pKyspIHtcclxuICAgICAgICAgICAgICAgIGlmICh0ZXh0W2N0eC5pXSA9PT0gXCJ9XCIgJiYgdGV4dFtjdHguaSAtIDFdICE9PSBcIlxcXFxcIilcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgdmFsID0gdGV4dC5zdWJzdHIoc3RhcnQsIGN0eC5pIC0gc3RhcnQpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGZ1bmMgPSBuZXcgRnVuY3Rpb24oXCJyZXR1cm4gKFwiICsgdmFsICsgXCIpO1wiKTtcclxuICAgICAgICAgICAgcmV0dXJuIGZ1bmMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRwYXJzZUtleVZhbHVlIChjdHg6IElQYXJzZUNvbnRleHQsIG9zOiBhbnlbXSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICB2YXIgdGV4dCA9IGN0eC50ZXh0O1xyXG4gICAgICAgICAgICBjdHguYWNjID0gXCJcIjtcclxuICAgICAgICAgICAgdmFyIGtleSA9IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciB2YWw6IGFueSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdmFyIGxlbiA9IHRleHQubGVuZ3RoO1xyXG4gICAgICAgICAgICB2YXIgbm9uYWxwaGEgPSBmYWxzZTtcclxuICAgICAgICAgICAgZm9yICg7IGN0eC5pIDwgbGVuOyBjdHguaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgY3VyID0gdGV4dFtjdHguaV07XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VyID09PSBcIlxcXFxcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGN0eC5pKys7XHJcbiAgICAgICAgICAgICAgICAgICAgY3R4LmFjYyArPSB0ZXh0W2N0eC5pXTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VyID09PSBcIntcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChub25hbHBoYSB8fCAhaXNBbHBoYSh0ZXh0W2N0eC5pICsgMV0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5hY2MgKz0gY3VyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub25hbHBoYSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWtleSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjdHguZXJyb3IgPSBcIkEgc3ViIGV4dGVuc2lvbiBtdXN0IGJlIHNldCB0byBhIGtleS5cIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjdHguaSsrO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbCA9IHRoaXMuJCRkb1BhcnNlKGN0eCwgb3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjdHguZXJyb3IpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VyID09PSBcIj1cIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGtleSA9IGN0eC5hY2MudHJpbSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGN0eC5hY2MgPSBcIlwiO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXIgPT09IFwifVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vbmFscGhhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vbmFscGhhID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5hY2MgKz0gY3VyO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQkZmluaXNoS2V5VmFsdWUoY3R4LCBrZXksIHZhbCwgb3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXIgPT09IFwiLFwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3R4LmkrKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQkZmluaXNoS2V5VmFsdWUoY3R4LCBrZXksIHZhbCwgb3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXkgJiYgIWN0eC5hY2MgJiYgY3VyID09PSBcIidcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGN0eC5pKys7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kJHBhcnNlU2luZ2xlUXVvdGVkKGN0eCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsID0gY3R4LmFjYztcclxuICAgICAgICAgICAgICAgICAgICBjdHguYWNjID0gXCJcIjtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3R4LmFjYyArPSBjdXI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW50ZXJtaW5hdGVkIHN0cmluZyBjb25zdGFudC5cIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkZmluaXNoS2V5VmFsdWUgKGN0eDogSVBhcnNlQ29udGV4dCwga2V5OiBzdHJpbmcsIHZhbDogYW55LCBvczogYW55W10pIHtcclxuICAgICAgICAgICAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoISh2YWwgPSBjdHguYWNjLnRyaW0oKSkpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YWwgPSBmaW5pc2hNYXJrdXBFeHRlbnNpb24odmFsLCBjdHgucmVzb2x2ZXIsIHRoaXMuJCRvblJlc29sdmVUeXBlLCBvcyk7XHJcbiAgICAgICAgICAgIHZhciBjbyA9IG9zW29zLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICBpZiAoIWtleSkge1xyXG4gICAgICAgICAgICAgICAgY28uaW5pdCAmJiBjby5pbml0KHZhbCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb1trZXldID0gdmFsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkcGFyc2VTaW5nbGVRdW90ZWQgKGN0eDogSVBhcnNlQ29udGV4dCkge1xyXG4gICAgICAgICAgICB2YXIgdGV4dCA9IGN0eC50ZXh0O1xyXG4gICAgICAgICAgICB2YXIgbGVuID0gdGV4dC5sZW5ndGg7XHJcbiAgICAgICAgICAgIGZvciAoOyBjdHguaSA8IGxlbjsgY3R4LmkrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIGN1ciA9IHRleHRbY3R4LmldO1xyXG4gICAgICAgICAgICAgICAgaWYgKGN1ciA9PT0gXCJcXFxcXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBjdHguaSsrO1xyXG4gICAgICAgICAgICAgICAgICAgIGN0eC5hY2MgKz0gdGV4dFtjdHguaV07XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN1ciA9PT0gXCInXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGN0eC5hY2MgKz0gY3VyO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkZW5zdXJlICgpIHtcclxuICAgICAgICAgICAgdGhpcy5vblJlc29sdmVUeXBlKHRoaXMuJCRvblJlc29sdmVUeXBlKVxyXG4gICAgICAgICAgICAgICAgLm9uUmVzb2x2ZU9iamVjdCh0aGlzLiQkb25SZXNvbHZlT2JqZWN0KVxyXG4gICAgICAgICAgICAgICAgLm9uRXJyb3IodGhpcy4kJG9uRXJyb3IpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgb25SZXNvbHZlVHlwZSAoY2I/OiBldmVudHMuSVJlc29sdmVUeXBlKTogWGFtbEV4dGVuc2lvblBhcnNlciB7XHJcbiAgICAgICAgICAgIHZhciBvcmVzb2x2ZTogSU91dFR5cGUgPSB7XHJcbiAgICAgICAgICAgICAgICBpc1ByaW1pdGl2ZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBPYmplY3RcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdGhpcy4kJG9uUmVzb2x2ZVR5cGUgPSBjYiB8fCAoKHhtbG5zLCBuYW1lKSA9PiBvcmVzb2x2ZSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgb25SZXNvbHZlT2JqZWN0IChjYj86IGV2ZW50cy5JUmVzb2x2ZU9iamVjdCk6IFhhbWxFeHRlbnNpb25QYXJzZXIge1xyXG4gICAgICAgICAgICB0aGlzLiQkb25SZXNvbHZlT2JqZWN0ID0gY2IgfHwgKCh0eXBlKSA9PiBuZXcgdHlwZSgpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBvblJlc29sdmVQcmltaXRpdmUgKGNiPzogZXZlbnRzLklSZXNvbHZlUHJpbWl0aXZlKTogWGFtbEV4dGVuc2lvblBhcnNlciB7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvblJlc29sdmVQcmltaXRpdmUgPSBjYiB8fCAoKHR5cGUsIHRleHQpID0+IG5ldyB0eXBlKHRleHQpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBvbkVycm9yIChjYj86IGV2ZW50cy5JRXJyb3IpOiBYYW1sRXh0ZW5zaW9uUGFyc2VyIHtcclxuICAgICAgICAgICAgdGhpcy4kJG9uRXJyb3IgPSBjYiB8fCAoKGUpID0+IHtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpc0FscGhhIChjOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICBpZiAoIWMpXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB2YXIgY29kZSA9IGNbMF0udG9VcHBlckNhc2UoKS5jaGFyQ29kZUF0KDApO1xyXG4gICAgICAgIHJldHVybiBjb2RlID49IDY1ICYmIGNvZGUgPD0gOTA7XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lLm1hcmt1cC54YW1sIHtcclxuICAgIHZhciBwYXJzZXIgPSBuZXcgRE9NUGFyc2VyKCk7XHJcbiAgICB2YXIgeGNhY2hlID0gbmV3IE1lbW9pemVyPFhhbWxNYXJrdXA+KChrZXkpID0+IG5ldyBYYW1sTWFya3VwKGtleSkpO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBYYW1sTWFya3VwIGV4dGVuZHMgbWFya3VwLk1hcmt1cDxFbGVtZW50PiB7XHJcbiAgICAgICAgc3RhdGljIGNyZWF0ZSAodXJpOiBzdHJpbmcpOiBYYW1sTWFya3VwO1xyXG4gICAgICAgIHN0YXRpYyBjcmVhdGUgKHVyaTogVXJpKTogWGFtbE1hcmt1cDtcclxuICAgICAgICBzdGF0aWMgY3JlYXRlICh1cmk6IGFueSk6IFhhbWxNYXJrdXAge1xyXG4gICAgICAgICAgICByZXR1cm4geGNhY2hlLm1lbW9pemUodXJpLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY3JlYXRlUGFyc2VyICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBYYW1sUGFyc2VyKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsb2FkUm9vdCAoZGF0YTogc3RyaW5nKTogRWxlbWVudCB7XHJcbiAgICAgICAgICAgIHZhciBkb2MgPSBwYXJzZXIucGFyc2VGcm9tU3RyaW5nKGRhdGEsIFwidGV4dC94bWxcIik7XHJcbiAgICAgICAgICAgIHJldHVybiBkb2MuZG9jdW1lbnRFbGVtZW50O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUubWFya3VwLnhhbWwge1xyXG4gICAgZXhwb3J0IHZhciBERUZBVUxUX1hNTE5TID0gXCJodHRwOi8vc2NoZW1hcy53c2ljay5jb20vZmF5ZGVcIjtcclxuICAgIGV4cG9ydCB2YXIgREVGQVVMVF9YTUxOU19YID0gXCJodHRwOi8vc2NoZW1hcy53c2ljay5jb20vZmF5ZGUveFwiO1xyXG4gICAgdmFyIEVSUk9SX1hNTE5TID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCI7XHJcbiAgICB2YXIgRVJST1JfTkFNRSA9IFwicGFyc2VyZXJyb3JcIjtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgWGFtbFBhcnNlciBpbXBsZW1lbnRzIElNYXJrdXBQYXJzZXI8RWxlbWVudD4ge1xyXG4gICAgICAgIHByaXZhdGUgJCRvblJlc29sdmVUeXBlOiBldmVudHMuSVJlc29sdmVUeXBlO1xyXG4gICAgICAgIHByaXZhdGUgJCRvblJlc29sdmVPYmplY3Q6IGV2ZW50cy5JUmVzb2x2ZU9iamVjdDtcclxuICAgICAgICBwcml2YXRlICQkb25SZXNvbHZlUHJpbWl0aXZlOiBldmVudHMuSVJlc29sdmVQcmltaXRpdmU7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uUmVzb2x2ZVJlc291cmNlczogZXZlbnRzLklSZXNvbHZlUmVzb3VyY2VzO1xyXG4gICAgICAgIHByaXZhdGUgJCRvbkJyYW5jaFNraXA6IGV2ZW50cy5JQnJhbmNoU2tpcDxFbGVtZW50PjtcclxuICAgICAgICBwcml2YXRlICQkb25PYmplY3Q6IGV2ZW50cy5JT2JqZWN0O1xyXG4gICAgICAgIHByaXZhdGUgJCRvbk9iamVjdEVuZDogZXZlbnRzLklPYmplY3RFbmQ7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uQ29udGVudFRleHQ6IGV2ZW50cy5JVGV4dDtcclxuICAgICAgICBwcml2YXRlICQkb25OYW1lOiBldmVudHMuSU5hbWU7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uUHJvcGVydHlTdGFydDogZXZlbnRzLklQcm9wZXJ0eVN0YXJ0O1xyXG4gICAgICAgIHByaXZhdGUgJCRvblByb3BlcnR5RW5kOiBldmVudHMuSVByb3BlcnR5RW5kO1xyXG4gICAgICAgIHByaXZhdGUgJCRvbkF0dHJpYnV0ZVN0YXJ0OiBldmVudHMuSUF0dHJpYnV0ZVN0YXJ0O1xyXG4gICAgICAgIHByaXZhdGUgJCRvbkF0dHJpYnV0ZUVuZDogZXZlbnRzLklBdHRyaWJ1dGVFbmQ7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uRXJyb3I6IGV2ZW50cy5JRXJyb3I7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uRW5kOiAoKSA9PiBhbnkgPSBudWxsO1xyXG5cclxuICAgICAgICBwcml2YXRlICQkZXh0ZW5zaW9uOiBJTWFya3VwRXh0ZW5zaW9uUGFyc2VyO1xyXG5cclxuICAgICAgICBwcml2YXRlICQkZGVmYXVsdFhtbG5zOiBzdHJpbmc7XHJcbiAgICAgICAgcHJpdmF0ZSAkJHhYbWxuczogc3RyaW5nO1xyXG5cclxuICAgICAgICBwcml2YXRlICQkb2JqZWN0U3RhY2s6IGFueVtdID0gW107XHJcbiAgICAgICAgcHJpdmF0ZSAkJHNraXBuZXh0ID0gZmFsc2U7XHJcbiAgICAgICAgcHJpdmF0ZSAkJGN1cmVsOiBFbGVtZW50ID0gbnVsbDtcclxuICAgICAgICBwcml2YXRlICQkY3Vya2V5OiBzdHJpbmcgPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yICgpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRFeHRlbnNpb25QYXJzZXIobmV3IFhhbWxFeHRlbnNpb25QYXJzZXIoKSlcclxuICAgICAgICAgICAgICAgIC5zZXROYW1lc3BhY2VzKERFRkFVTFRfWE1MTlMsIERFRkFVTFRfWE1MTlNfWClcclxuICAgICAgICAgICAgICAgIC5vbih7fSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBvbiAobGlzdGVuZXI6IElNYXJrdXBTYXg8RWxlbWVudD4pOiBYYW1sUGFyc2VyIHtcclxuICAgICAgICAgICAgbGlzdGVuZXIgPSBjcmVhdGVNYXJrdXBTYXgobGlzdGVuZXIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kJG9uUmVzb2x2ZVR5cGUgPSBsaXN0ZW5lci5yZXNvbHZlVHlwZTtcclxuICAgICAgICAgICAgdGhpcy4kJG9uUmVzb2x2ZU9iamVjdCA9IGxpc3RlbmVyLnJlc29sdmVPYmplY3Q7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvblJlc29sdmVQcmltaXRpdmUgPSBsaXN0ZW5lci5yZXNvbHZlUHJpbWl0aXZlO1xyXG4gICAgICAgICAgICB0aGlzLiQkb25SZXNvbHZlUmVzb3VyY2VzID0gbGlzdGVuZXIucmVzb2x2ZVJlc291cmNlcztcclxuICAgICAgICAgICAgdGhpcy4kJG9uQnJhbmNoU2tpcCA9IGxpc3RlbmVyLmJyYW5jaFNraXA7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvbk9iamVjdCA9IGxpc3RlbmVyLm9iamVjdDtcclxuICAgICAgICAgICAgdGhpcy4kJG9uT2JqZWN0RW5kID0gbGlzdGVuZXIub2JqZWN0RW5kO1xyXG4gICAgICAgICAgICB0aGlzLiQkb25Db250ZW50VGV4dCA9IGxpc3RlbmVyLmNvbnRlbnRUZXh0O1xyXG4gICAgICAgICAgICB0aGlzLiQkb25OYW1lID0gbGlzdGVuZXIubmFtZTtcclxuICAgICAgICAgICAgdGhpcy4kJG9uUHJvcGVydHlTdGFydCA9IGxpc3RlbmVyLnByb3BlcnR5U3RhcnQ7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvblByb3BlcnR5RW5kID0gbGlzdGVuZXIucHJvcGVydHlFbmQ7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvbkF0dHJpYnV0ZVN0YXJ0ID0gbGlzdGVuZXIuYXR0cmlidXRlU3RhcnQ7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvbkF0dHJpYnV0ZUVuZCA9IGxpc3RlbmVyLmF0dHJpYnV0ZUVuZDtcclxuICAgICAgICAgICAgdGhpcy4kJG9uRXJyb3IgPSBsaXN0ZW5lci5lcnJvcjtcclxuICAgICAgICAgICAgdGhpcy4kJG9uRW5kID0gbGlzdGVuZXIuZW5kO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuJCRleHRlbnNpb24pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRleHRlbnNpb25cclxuICAgICAgICAgICAgICAgICAgICAub25SZXNvbHZlVHlwZSh0aGlzLiQkb25SZXNvbHZlVHlwZSlcclxuICAgICAgICAgICAgICAgICAgICAub25SZXNvbHZlT2JqZWN0KHRoaXMuJCRvblJlc29sdmVPYmplY3QpXHJcbiAgICAgICAgICAgICAgICAgICAgLm9uUmVzb2x2ZVByaW1pdGl2ZSh0aGlzLiQkb25SZXNvbHZlUHJpbWl0aXZlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXROYW1lc3BhY2VzIChkZWZhdWx0WG1sbnM6IHN0cmluZywgeFhtbG5zOiBzdHJpbmcpOiBYYW1sUGFyc2VyIHtcclxuICAgICAgICAgICAgdGhpcy4kJGRlZmF1bHRYbWxucyA9IGRlZmF1bHRYbWxucztcclxuICAgICAgICAgICAgdGhpcy4kJHhYbWxucyA9IHhYbWxucztcclxuICAgICAgICAgICAgaWYgKHRoaXMuJCRleHRlbnNpb24pXHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkZXh0ZW5zaW9uLnNldE5hbWVzcGFjZXModGhpcy4kJGRlZmF1bHRYbWxucywgdGhpcy4kJHhYbWxucyk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0RXh0ZW5zaW9uUGFyc2VyIChwYXJzZXI6IElNYXJrdXBFeHRlbnNpb25QYXJzZXIpOiBYYW1sUGFyc2VyIHtcclxuICAgICAgICAgICAgdGhpcy4kJGV4dGVuc2lvbiA9IHBhcnNlcjtcclxuICAgICAgICAgICAgaWYgKHBhcnNlcikge1xyXG4gICAgICAgICAgICAgICAgcGFyc2VyLnNldE5hbWVzcGFjZXModGhpcy4kJGRlZmF1bHRYbWxucywgdGhpcy4kJHhYbWxucylcclxuICAgICAgICAgICAgICAgICAgICAub25SZXNvbHZlVHlwZSh0aGlzLiQkb25SZXNvbHZlVHlwZSlcclxuICAgICAgICAgICAgICAgICAgICAub25SZXNvbHZlT2JqZWN0KHRoaXMuJCRvblJlc29sdmVPYmplY3QpXHJcbiAgICAgICAgICAgICAgICAgICAgLm9uUmVzb2x2ZVByaW1pdGl2ZSh0aGlzLiQkb25SZXNvbHZlUHJpbWl0aXZlKVxyXG4gICAgICAgICAgICAgICAgICAgIC5vbkVycm9yKChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwYXJzZSAoZWw6IEVsZW1lbnQpOiBYYW1sUGFyc2VyIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLiQkZXh0ZW5zaW9uKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gZXh0ZW5zaW9uIHBhcnNlciBleGlzdHMgb24gcGFyc2VyLlwiKTtcclxuICAgICAgICAgICAgdGhpcy4kJGhhbmRsZUVsZW1lbnQoZWwsIHRydWUpO1xyXG4gICAgICAgICAgICB0aGlzLiQkZGVzdHJveSgpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNraXBCcmFuY2ggKCkge1xyXG4gICAgICAgICAgICB0aGlzLiQkc2tpcG5leHQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd2Fsa1VwT2JqZWN0cyAoKTogSUVudW1lcmF0b3I8YW55PiB7XHJcbiAgICAgICAgICAgIHZhciBvcyA9IHRoaXMuJCRvYmplY3RTdGFjaztcclxuICAgICAgICAgICAgdmFyIGkgPSBvcy5sZW5ndGg7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICBtb3ZlTmV4dCAoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaS0tO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAodGhpcy5jdXJyZW50ID0gb3NbaV0pICE9PSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXNvbHZlUHJlZml4IChwcmVmaXg6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLiQkY3VyZWwubG9va3VwTmFtZXNwYWNlVVJJKHByZWZpeCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkaGFuZGxlRWxlbWVudCAoZWw6IEVsZW1lbnQsIGlzQ29udGVudDogYm9vbGVhbikge1xyXG4gICAgICAgICAgICAvLyBOT1RFOiBIYW5kbGUgdGFnIG9wZW5cclxuICAgICAgICAgICAgLy8gIDxbbnM6XVR5cGUuTmFtZT5cclxuICAgICAgICAgICAgLy8gIDxbbnM6XVR5cGU+XHJcbiAgICAgICAgICAgIHZhciBvbGQgPSB0aGlzLiQkY3VyZWw7XHJcbiAgICAgICAgICAgIHRoaXMuJCRjdXJlbCA9IGVsO1xyXG4gICAgICAgICAgICB2YXIgbmFtZSA9IGVsLmxvY2FsTmFtZTtcclxuICAgICAgICAgICAgdmFyIHhtbG5zID0gZWwubmFtZXNwYWNlVVJJO1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kJHRyeUhhbmRsZUVycm9yKGVsLCB4bWxucywgbmFtZSkgfHwgdGhpcy4kJHRyeUhhbmRsZVByb3BlcnR5VGFnKGVsLCB4bWxucywgbmFtZSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRjdXJlbCA9IG9sZDtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIG9zID0gdGhpcy4kJG9iamVjdFN0YWNrO1xyXG4gICAgICAgICAgICB2YXIgb3J0ID0gdGhpcy4kJG9uUmVzb2x2ZVR5cGUoeG1sbnMsIG5hbWUpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kJHRyeUhhbmRsZVByaW1pdGl2ZShlbCwgb3J0LCBpc0NvbnRlbnQpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkY3VyZWwgPSBvbGQ7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBvYmogPSB0aGlzLiQkb25SZXNvbHZlT2JqZWN0KG9ydC50eXBlKTtcclxuICAgICAgICAgICAgaWYgKG9iaiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBvcy5wdXNoKG9iaik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkb25PYmplY3Qob2JqLCBpc0NvbnRlbnQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBOT1RFOiBIYW5kbGUgcmVzb3VyY2VzIGJlZm9yZSBhdHRyaWJ1dGVzIGFuZCBjaGlsZCBlbGVtZW50c1xyXG4gICAgICAgICAgICB2YXIgcmVzRWwgPSBmaW5kUmVzb3VyY2VzRWxlbWVudChlbCwgeG1sbnMsIG5hbWUpO1xyXG4gICAgICAgICAgICBpZiAocmVzRWwpXHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkaGFuZGxlUmVzb3VyY2VzKG9iaiwgb3J0LnR5cGUsIHJlc0VsKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuJCRjdXJrZXkgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIC8vIE5PVEU6IFdhbGsgYXR0cmlidXRlc1xyXG4gICAgICAgICAgICB0aGlzLiQkcHJvY2Vzc0F0dHJpYnV0ZXMoZWwpO1xyXG4gICAgICAgICAgICB2YXIga2V5ID0gdGhpcy4kJGN1cmtleTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLiQkc2tpcG5leHQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRza2lwbmV4dCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgb3MucG9wKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkb25PYmplY3RFbmQob2JqLCBrZXksIGlzQ29udGVudCwgb3Nbb3MubGVuZ3RoIC0gMV0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJG9uQnJhbmNoU2tpcChlbC5maXJzdEVsZW1lbnRDaGlsZCwgb2JqKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRjdXJlbCA9IG9sZDtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gTk9URTogV2FsayBDaGlsZHJlblxyXG4gICAgICAgICAgICB2YXIgY2hpbGQgPSBlbC5maXJzdEVsZW1lbnRDaGlsZDtcclxuICAgICAgICAgICAgdmFyIGhhc0NoaWxkcmVuID0gISFjaGlsZDtcclxuICAgICAgICAgICAgd2hpbGUgKGNoaWxkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlc0VsIHx8IGNoaWxkICE9PSByZXNFbCkgLy9Ta2lwIFJlc291cmNlcyAod2lsbCBiZSBkb25lIGZpcnN0KVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCRoYW5kbGVFbGVtZW50KGNoaWxkLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgIGNoaWxkID0gY2hpbGQubmV4dEVsZW1lbnRTaWJsaW5nO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBOT1RFOiBJZiB3ZSBkaWQgbm90IGhpdCBhIGNoaWxkIHRhZywgdXNlIHRleHQgY29udGVudFxyXG4gICAgICAgICAgICBpZiAoIWhhc0NoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IGVsLnRleHRDb250ZW50O1xyXG4gICAgICAgICAgICAgICAgaWYgKHRleHQgJiYgKHRleHQgPSB0ZXh0LnRyaW0oKSkpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kJG9uQ29udGVudFRleHQodGV4dCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIE5PVEU6IEhhbmRsZSB0YWcgY2xvc2VcclxuICAgICAgICAgICAgLy8gIDwvW25zOl1UeXBlLk5hbWU+XHJcbiAgICAgICAgICAgIC8vICA8L1tuczpdVHlwZT5cclxuICAgICAgICAgICAgaWYgKG9iaiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBvcy5wb3AoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRvbk9iamVjdEVuZChvYmosIGtleSwgaXNDb250ZW50LCBvc1tvcy5sZW5ndGggLSAxXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy4kJGN1cmVsID0gb2xkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJGhhbmRsZVJlc291cmNlcyAob3duZXI6IGFueSwgb3duZXJUeXBlOiBhbnksIHJlc0VsOiBFbGVtZW50KSB7XHJcbiAgICAgICAgICAgIHZhciBvcyA9IHRoaXMuJCRvYmplY3RTdGFjaztcclxuICAgICAgICAgICAgdmFyIHJkID0gdGhpcy4kJG9uUmVzb2x2ZVJlc291cmNlcyhvd25lciwgb3duZXJUeXBlKTtcclxuICAgICAgICAgICAgb3MucHVzaChyZCk7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvbk9iamVjdChyZCwgZmFsc2UpO1xyXG4gICAgICAgICAgICB2YXIgY2hpbGQgPSByZXNFbC5maXJzdEVsZW1lbnRDaGlsZDtcclxuICAgICAgICAgICAgd2hpbGUgKGNoaWxkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkaGFuZGxlRWxlbWVudChjaGlsZCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICBjaGlsZCA9IGNoaWxkLm5leHRFbGVtZW50U2libGluZztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcy5wb3AoKTtcclxuICAgICAgICAgICAgdGhpcy4kJG9uT2JqZWN0RW5kKHJkLCB1bmRlZmluZWQsIGZhbHNlLCBvc1tvcy5sZW5ndGggLSAxXSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkdHJ5SGFuZGxlRXJyb3IgKGVsOiBFbGVtZW50LCB4bWxuczogc3RyaW5nLCBuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgaWYgKHhtbG5zICE9PSBFUlJPUl9YTUxOUyB8fCBuYW1lICE9PSBFUlJPUl9OQU1FKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLiQkb25FcnJvcihuZXcgRXJyb3IoZWwudGV4dENvbnRlbnQpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkdHJ5SGFuZGxlUHJvcGVydHlUYWcgKGVsOiBFbGVtZW50LCB4bWxuczogc3RyaW5nLCBuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgdmFyIGluZCA9IG5hbWUuaW5kZXhPZignLicpO1xyXG4gICAgICAgICAgICBpZiAoaW5kIDwgMClcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIHZhciBvcnQgPSB0aGlzLiQkb25SZXNvbHZlVHlwZSh4bWxucywgbmFtZS5zdWJzdHIoMCwgaW5kKSk7XHJcbiAgICAgICAgICAgIHZhciB0eXBlID0gb3J0LnR5cGU7XHJcbiAgICAgICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cihpbmQgKyAxKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuJCRvblByb3BlcnR5U3RhcnQodHlwZSwgbmFtZSk7XHJcblxyXG4gICAgICAgICAgICB2YXIgY2hpbGQgPSBlbC5maXJzdEVsZW1lbnRDaGlsZDtcclxuICAgICAgICAgICAgd2hpbGUgKGNoaWxkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkaGFuZGxlRWxlbWVudChjaGlsZCwgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgY2hpbGQgPSBjaGlsZC5uZXh0RWxlbWVudFNpYmxpbmc7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuJCRvblByb3BlcnR5RW5kKHR5cGUsIG5hbWUpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkdHJ5SGFuZGxlUHJpbWl0aXZlIChlbDogRWxlbWVudCwgb3Jlc29sdmU6IElPdXRUeXBlLCBpc0NvbnRlbnQ6IGJvb2xlYW4pOiBib29sZWFuIHtcclxuICAgICAgICAgICAgaWYgKCFvcmVzb2x2ZS5pc1ByaW1pdGl2ZSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgdmFyIHRleHQgPSBlbC50ZXh0Q29udGVudDtcclxuICAgICAgICAgICAgdmFyIG9iaiA9IHRoaXMuJCRvblJlc29sdmVQcmltaXRpdmUob3Jlc29sdmUudHlwZSwgdGV4dCA/IHRleHQudHJpbSgpIDogXCJcIik7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvbk9iamVjdChvYmosIGlzQ29udGVudCk7XHJcbiAgICAgICAgICAgIHRoaXMuJCRjdXJrZXkgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuJCRwcm9jZXNzQXR0cmlidXRlcyhlbCk7XHJcbiAgICAgICAgICAgIHZhciBrZXkgPSB0aGlzLiQkY3Vya2V5O1xyXG4gICAgICAgICAgICB2YXIgb3MgPSB0aGlzLiQkb2JqZWN0U3RhY2s7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvbk9iamVjdEVuZChvYmosIGtleSwgaXNDb250ZW50LCBvc1tvcy5sZW5ndGggLSAxXSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJHByb2Nlc3NBdHRyaWJ1dGVzIChlbDogRWxlbWVudCkge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgYXR0cnMgPSBlbC5hdHRyaWJ1dGVzLCBsZW4gPSBhdHRycy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJHByb2Nlc3NBdHRyaWJ1dGUoYXR0cnNbaV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkcHJvY2Vzc0F0dHJpYnV0ZSAoYXR0cjogQXR0cik6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICB2YXIgcHJlZml4ID0gYXR0ci5wcmVmaXg7XHJcbiAgICAgICAgICAgIHZhciBuYW1lID0gYXR0ci5sb2NhbE5hbWU7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLiQkc2hvdWxkU2tpcEF0dHIocHJlZml4LCBuYW1lKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB2YXIgdXJpID0gYXR0ci5uYW1lc3BhY2VVUkk7XHJcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGF0dHIudmFsdWU7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLiQkdHJ5SGFuZGxlWEF0dHJpYnV0ZSh1cmksIG5hbWUsIHZhbHVlKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy4kJGhhbmRsZUF0dHJpYnV0ZSh1cmksIG5hbWUsIHZhbHVlLCBhdHRyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRzaG91bGRTa2lwQXR0ciAocHJlZml4OiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAocHJlZml4ID09PSBcInhtbG5zXCIpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgcmV0dXJuICghcHJlZml4ICYmIG5hbWUgPT09IFwieG1sbnNcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkdHJ5SGFuZGxlWEF0dHJpYnV0ZSAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICAvLyAgLi4uIHg6TmFtZT1cIi4uLlwiXHJcbiAgICAgICAgICAgIC8vICAuLi4geDpLZXk9XCIuLi5cIlxyXG4gICAgICAgICAgICBpZiAodXJpICE9PSB0aGlzLiQkeFhtbG5zKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAobmFtZSA9PT0gXCJOYW1lXCIpXHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkb25OYW1lKHZhbHVlKTtcclxuICAgICAgICAgICAgaWYgKG5hbWUgPT09IFwiS2V5XCIpXHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkY3Vya2V5ID0gdmFsdWU7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJGhhbmRsZUF0dHJpYnV0ZSAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZywgYXR0cjogQXR0cik6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICAvLyAgLi4uIFtuczpdVHlwZS5OYW1lPVwiLi4uXCJcclxuICAgICAgICAgICAgLy8gIC4uLiBOYW1lPVwiLi4uXCJcclxuXHJcbiAgICAgICAgICAgIHZhciB0eXBlID0gbnVsbDtcclxuICAgICAgICAgICAgdmFyIG5hbWUgPSBuYW1lO1xyXG4gICAgICAgICAgICB2YXIgaW5kID0gbmFtZS5pbmRleE9mKCcuJyk7XHJcbiAgICAgICAgICAgIGlmIChpbmQgPiAtMSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIG9ydCA9IHRoaXMuJCRvblJlc29sdmVUeXBlKHVyaSwgbmFtZS5zdWJzdHIoMCwgaW5kKSk7XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gb3J0LnR5cGU7XHJcbiAgICAgICAgICAgICAgICBuYW1lID0gbmFtZS5zdWJzdHIoaW5kICsgMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy4kJG9uQXR0cmlidXRlU3RhcnQodHlwZSwgbmFtZSk7XHJcbiAgICAgICAgICAgIHZhciB2YWwgPSB0aGlzLiQkZ2V0QXR0clZhbHVlKHZhbHVlLCBhdHRyKTtcclxuICAgICAgICAgICAgdGhpcy4kJG9uQXR0cmlidXRlRW5kKHR5cGUsIG5hbWUsIHZhbCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJGdldEF0dHJWYWx1ZSAodmFsOiBzdHJpbmcsIGF0dHI6IEF0dHIpOiBhbnkge1xyXG4gICAgICAgICAgICBpZiAodmFsWzBdICE9PSBcIntcIilcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWw7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLiQkZXh0ZW5zaW9uLnBhcnNlKHZhbCwgYXR0ciwgdGhpcy4kJG9iamVjdFN0YWNrKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRkZXN0cm95ICgpIHtcclxuICAgICAgICAgICAgdGhpcy4kJG9uRW5kICYmIHRoaXMuJCRvbkVuZCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBmaW5kUmVzb3VyY2VzRWxlbWVudCAob3duZXJFbDogRWxlbWVudCwgdXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IEVsZW1lbnQge1xyXG4gICAgICAgIHZhciBleHBlY3RlZCA9IG5hbWUgKyBcIi5SZXNvdXJjZXNcIjtcclxuICAgICAgICB2YXIgY2hpbGQgPSBvd25lckVsLmZpcnN0RWxlbWVudENoaWxkO1xyXG4gICAgICAgIHdoaWxlIChjaGlsZCkge1xyXG4gICAgICAgICAgICBpZiAoY2hpbGQubG9jYWxOYW1lID09PSBleHBlY3RlZCAmJiBjaGlsZC5uYW1lc3BhY2VVUkkgPT09IHVyaSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZDtcclxuICAgICAgICAgICAgY2hpbGQgPSBjaGlsZC5uZXh0RWxlbWVudFNpYmxpbmc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG59Il19