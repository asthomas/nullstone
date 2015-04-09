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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9WZXJzaW9uLnRzIiwiYW5ub3RhdGlvbnMudHMiLCJhc3luYy50cyIsImNvbnZlcnNpb24udHMiLCJEaXJSZXNvbHZlci50cyIsIkVudW0udHMiLCJlcXVhbHMudHMiLCJFdmVudC50cyIsIkludGVyZmFjZS50cyIsIklDb2xsZWN0aW9uLnRzIiwiSUVudW1lcmFibGUudHMiLCJJRW51bWVyYXRvci50cyIsIkluZGV4ZWRQcm9wZXJ0eUluZm8udHMiLCJMaWJyYXJ5LnRzIiwiTGlicmFyeVJlc29sdmVyLnRzIiwiTWVtb2l6ZXIudHMiLCJQcm9wZXJ0eS50cyIsIlByb3BlcnR5SW5mby50cyIsIlR5cGUudHMiLCJVcmkudHMiLCJUeXBlTWFuYWdlci50cyIsImVycm9ycy9BZ2dyZWdhdGVFcnJvci50cyIsImVycm9ycy9EaXJMb2FkRXJyb3IudHMiLCJlcnJvcnMvTGlicmFyeUxvYWRFcnJvci50cyIsIm1hcmt1cC9JTWFya3VwRXh0ZW5zaW9uLnRzIiwibWFya3VwL0lNYXJrdXBQYXJzZXIudHMiLCJtYXJrdXAvTWFya3VwLnRzIiwibWFya3VwL01hcmt1cERlcGVuZGVuY3lSZXNvbHZlci50cyIsIm1hcmt1cC94YW1sL1hhbWxFeHRlbnNpb25QYXJzZXIudHMiLCJtYXJrdXAveGFtbC9YYW1sTWFya3VwLnRzIiwibWFya3VwL3hhbWwvWGFtbFBhcnNlci50cyJdLCJuYW1lcyI6WyJudWxsc3RvbmUiLCJudWxsc3RvbmUuQW5ub3RhdGlvbiIsIm51bGxzdG9uZS5HZXRBbm5vdGF0aW9ucyIsIm51bGxzdG9uZS5DcmVhdGVUeXBlZEFubm90YXRpb24iLCJudWxsc3RvbmUuQ3JlYXRlVHlwZWRBbm5vdGF0aW9uLnRhIiwibnVsbHN0b25lLmFzeW5jIiwibnVsbHN0b25lLmFzeW5jLmNyZWF0ZSIsIm51bGxzdG9uZS5hc3luYy5jcmVhdGUucmVzb2x2ZSIsIm51bGxzdG9uZS5hc3luYy5jcmVhdGUucmVqZWN0IiwibnVsbHN0b25lLmFzeW5jLnJlc29sdmUiLCJudWxsc3RvbmUuYXN5bmMucmVqZWN0IiwibnVsbHN0b25lLmFzeW5jLm1hbnkiLCJudWxsc3RvbmUuYXN5bmMubWFueS5jb21wbGV0ZVNpbmdsZSIsIm51bGxzdG9uZS5jb252ZXJ0QW55VG9UeXBlIiwibnVsbHN0b25lLmNvbnZlcnRTdHJpbmdUb0VudW0iLCJudWxsc3RvbmUucmVnaXN0ZXJUeXBlQ29udmVydGVyIiwibnVsbHN0b25lLnJlZ2lzdGVyRW51bUNvbnZlcnRlciIsIm51bGxzdG9uZS5EaXJSZXNvbHZlciIsIm51bGxzdG9uZS5EaXJSZXNvbHZlci5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5EaXJSZXNvbHZlci5sb2FkQXN5bmMiLCJudWxsc3RvbmUuRGlyUmVzb2x2ZXIucmVzb2x2ZVR5cGUiLCJudWxsc3RvbmUuRW51bSIsIm51bGxzdG9uZS5FbnVtLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLkVudW0uZnJvbUFueSIsIm51bGxzdG9uZS5lcXVhbHMiLCJudWxsc3RvbmUuRXZlbnQiLCJudWxsc3RvbmUuRXZlbnQuY29uc3RydWN0b3IiLCJudWxsc3RvbmUuRXZlbnQuaGFzIiwibnVsbHN0b25lLkV2ZW50Lm9uIiwibnVsbHN0b25lLkV2ZW50Lm9mZiIsIm51bGxzdG9uZS5FdmVudC5yYWlzZSIsIm51bGxzdG9uZS5FdmVudC5yYWlzZUFzeW5jIiwibnVsbHN0b25lLkludGVyZmFjZSIsIm51bGxzdG9uZS5JbnRlcmZhY2UuY29uc3RydWN0b3IiLCJudWxsc3RvbmUuSW50ZXJmYWNlLmlzIiwibnVsbHN0b25lLkludGVyZmFjZS5hcyIsIm51bGxzdG9uZS5JbnRlcmZhY2UubWFyayIsImdldEVudW1lcmF0b3IiLCJudWxsc3RvbmUubW92ZU5leHQiLCJudWxsc3RvbmUuSW5kZXhlZFByb3BlcnR5SW5mbyIsIm51bGxzdG9uZS5JbmRleGVkUHJvcGVydHlJbmZvLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLkluZGV4ZWRQcm9wZXJ0eUluZm8ucHJvcGVydHlUeXBlIiwibnVsbHN0b25lLkluZGV4ZWRQcm9wZXJ0eUluZm8uZ2V0VmFsdWUiLCJudWxsc3RvbmUuSW5kZXhlZFByb3BlcnR5SW5mby5zZXRWYWx1ZSIsIm51bGxzdG9uZS5JbmRleGVkUHJvcGVydHlJbmZvLmZpbmQiLCJudWxsc3RvbmUuTGlicmFyeSIsIm51bGxzdG9uZS5MaWJyYXJ5LmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLkxpYnJhcnkuc291cmNlUGF0aCIsIm51bGxzdG9uZS5MaWJyYXJ5LnJvb3RNb2R1bGUiLCJudWxsc3RvbmUuTGlicmFyeS5sb2FkQXN5bmMiLCJudWxsc3RvbmUuTGlicmFyeS4kY29uZmlnTW9kdWxlIiwibnVsbHN0b25lLkxpYnJhcnkucmVzb2x2ZVR5cGUiLCJudWxsc3RvbmUuTGlicmFyeS5hZGQiLCJudWxsc3RvbmUuTGlicmFyeS5hZGRQcmltaXRpdmUiLCJudWxsc3RvbmUuTGlicmFyeS5hZGRFbnVtIiwibnVsbHN0b25lLnNldFR5cGVVcmkiLCJudWxsc3RvbmUuTGlicmFyeVJlc29sdmVyIiwibnVsbHN0b25lLkxpYnJhcnlSZXNvbHZlci5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5MaWJyYXJ5UmVzb2x2ZXIuY3JlYXRlTGlicmFyeSIsIm51bGxzdG9uZS5MaWJyYXJ5UmVzb2x2ZXIubG9hZFR5cGVBc3luYyIsIm51bGxzdG9uZS5MaWJyYXJ5UmVzb2x2ZXIucmVzb2x2ZSIsIm51bGxzdG9uZS5MaWJyYXJ5UmVzb2x2ZXIucmVzb2x2ZVR5cGUiLCJudWxsc3RvbmUuTGlicmFyeVJlc29sdmVyLiQkb25MaWJyYXJ5Q3JlYXRlZCIsIm51bGxzdG9uZS5NZW1vaXplciIsIm51bGxzdG9uZS5NZW1vaXplci5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5NZW1vaXplci5tZW1vaXplIiwibnVsbHN0b25lLmdldFByb3BlcnR5RGVzY3JpcHRvciIsIm51bGxzdG9uZS5oYXNQcm9wZXJ0eSIsIm51bGxzdG9uZS5Qcm9wZXJ0eUluZm8iLCJudWxsc3RvbmUuUHJvcGVydHlJbmZvLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLlByb3BlcnR5SW5mby5nZXRWYWx1ZSIsIm51bGxzdG9uZS5Qcm9wZXJ0eUluZm8uc2V0VmFsdWUiLCJudWxsc3RvbmUuUHJvcGVydHlJbmZvLmZpbmQiLCJudWxsc3RvbmUuZ2V0VHlwZU5hbWUiLCJudWxsc3RvbmUuZ2V0VHlwZVBhcmVudCIsIm51bGxzdG9uZS5hZGRUeXBlSW50ZXJmYWNlcyIsIm51bGxzdG9uZS5kb2VzSW5oZXJpdEZyb20iLCJudWxsc3RvbmUuVXJpS2luZCIsIm51bGxzdG9uZS5VcmkiLCJudWxsc3RvbmUuVXJpLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLlVyaS5raW5kIiwibnVsbHN0b25lLlVyaS5ob3N0IiwibnVsbHN0b25lLlVyaS5hYnNvbHV0ZVBhdGgiLCJudWxsc3RvbmUuVXJpLnNjaGVtZSIsIm51bGxzdG9uZS5VcmkuZnJhZ21lbnQiLCJudWxsc3RvbmUuVXJpLm9yaWdpbmFsU3RyaW5nIiwibnVsbHN0b25lLlVyaS50b1N0cmluZyIsIm51bGxzdG9uZS5VcmkuZXF1YWxzIiwibnVsbHN0b25lLlVyaS5pc051bGxPckVtcHR5IiwibnVsbHN0b25lLlR5cGVNYW5hZ2VyIiwibnVsbHN0b25lLlR5cGVNYW5hZ2VyLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLlR5cGVNYW5hZ2VyLnJlc29sdmVMaWJyYXJ5IiwibnVsbHN0b25lLlR5cGVNYW5hZ2VyLmxvYWRUeXBlQXN5bmMiLCJudWxsc3RvbmUuVHlwZU1hbmFnZXIucmVzb2x2ZVR5cGUiLCJudWxsc3RvbmUuVHlwZU1hbmFnZXIuYWRkIiwibnVsbHN0b25lLlR5cGVNYW5hZ2VyLmFkZFByaW1pdGl2ZSIsIm51bGxzdG9uZS5UeXBlTWFuYWdlci5hZGRFbnVtIiwibnVsbHN0b25lLkFnZ3JlZ2F0ZUVycm9yIiwibnVsbHN0b25lLkFnZ3JlZ2F0ZUVycm9yLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLkFnZ3JlZ2F0ZUVycm9yLmZsYXQiLCJudWxsc3RvbmUuRGlyTG9hZEVycm9yIiwibnVsbHN0b25lLkRpckxvYWRFcnJvci5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5MaWJyYXJ5TG9hZEVycm9yIiwibnVsbHN0b25lLkxpYnJhcnlMb2FkRXJyb3IuY29uc3RydWN0b3IiLCJudWxsc3RvbmUubWFya3VwIiwibnVsbHN0b25lLm1hcmt1cC5maW5pc2hNYXJrdXBFeHRlbnNpb24iLCJudWxsc3RvbmUubWFya3VwLnBhcnNlVHlwZSIsIm51bGxzdG9uZS5tYXJrdXAub24iLCJudWxsc3RvbmUubWFya3VwLnNldE5hbWVzcGFjZXMiLCJudWxsc3RvbmUubWFya3VwLnNldEV4dGVuc2lvblBhcnNlciIsIm51bGxzdG9uZS5tYXJrdXAucGFyc2UiLCJudWxsc3RvbmUubWFya3VwLnNraXBCcmFuY2giLCJudWxsc3RvbmUubWFya3VwLnJlc29sdmVQcmVmaXgiLCJudWxsc3RvbmUubWFya3VwLndhbGtVcE9iamVjdHMiLCJudWxsc3RvbmUubWFya3VwLmNyZWF0ZU1hcmt1cFNheCIsIm51bGxzdG9uZS5tYXJrdXAuTWFya3VwIiwibnVsbHN0b25lLm1hcmt1cC5NYXJrdXAuY29uc3RydWN0b3IiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cC5jcmVhdGVQYXJzZXIiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cC5yZXNvbHZlIiwibnVsbHN0b25lLm1hcmt1cC5NYXJrdXAubG9hZEFzeW5jIiwibnVsbHN0b25lLm1hcmt1cC5NYXJrdXAubG9hZFJvb3QiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cC5zZXRSb290IiwibnVsbHN0b25lLm1hcmt1cC5NYXJrdXBEZXBlbmRlbmN5UmVzb2x2ZXIiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cERlcGVuZGVuY3lSZXNvbHZlci5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5tYXJrdXAuTWFya3VwRGVwZW5kZW5jeVJlc29sdmVyLmNvbGxlY3QiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cERlcGVuZGVuY3lSZXNvbHZlci5hZGQiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cERlcGVuZGVuY3lSZXNvbHZlci5yZXNvbHZlIiwibnVsbHN0b25lLm1hcmt1cC54YW1sIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxFeHRlbnNpb25QYXJzZXIiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLnNldE5hbWVzcGFjZXMiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci5wYXJzZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkZG9QYXJzZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkcGFyc2VOYW1lIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxFeHRlbnNpb25QYXJzZXIuJCRzdGFydEV4dGVuc2lvbiIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkcGFyc2VYTnVsbCIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkcGFyc2VYVHlwZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkcGFyc2VYU3RhdGljIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxFeHRlbnNpb25QYXJzZXIuJCRwYXJzZUtleVZhbHVlIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxFeHRlbnNpb25QYXJzZXIuJCRmaW5pc2hLZXlWYWx1ZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkcGFyc2VTaW5nbGVRdW90ZWQiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci4kJGVuc3VyZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLm9uUmVzb2x2ZVR5cGUiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci5vblJlc29sdmVPYmplY3QiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci5vblJlc29sdmVQcmltaXRpdmUiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci5vbkVycm9yIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLmlzQWxwaGEiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbE1hcmt1cCIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sTWFya3VwLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxNYXJrdXAuY3JlYXRlIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxNYXJrdXAuY3JlYXRlUGFyc2VyIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxNYXJrdXAubG9hZFJvb3QiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlciIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIub24iLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci5zZXROYW1lc3BhY2VzIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuc2V0RXh0ZW5zaW9uUGFyc2VyIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIucGFyc2UiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci5za2lwQnJhbmNoIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIud2Fsa1VwT2JqZWN0cyIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLndhbGtVcE9iamVjdHMubW92ZU5leHQiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci5yZXNvbHZlUHJlZml4IiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuJCRoYW5kbGVFbGVtZW50IiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuJCRoYW5kbGVSZXNvdXJjZXMiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci4kJHRyeUhhbmRsZUVycm9yIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuJCR0cnlIYW5kbGVQcm9wZXJ0eVRhZyIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLiQkdHJ5SGFuZGxlUHJpbWl0aXZlIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuJCRwcm9jZXNzQXR0cmlidXRlcyIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLiQkcHJvY2Vzc0F0dHJpYnV0ZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLiQkc2hvdWxkU2tpcEF0dHIiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci4kJHRyeUhhbmRsZVhBdHRyaWJ1dGUiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci4kJGhhbmRsZUF0dHJpYnV0ZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLiQkZ2V0QXR0clZhbHVlIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuJCRkZXN0cm95IiwibnVsbHN0b25lLm1hcmt1cC54YW1sLmZpbmRSZXNvdXJjZXNFbGVtZW50Il0sIm1hcHBpbmdzIjoiQUFBQSxJQUFPLFNBQVMsQ0FFZjtBQUZELFdBQU8sU0FBUyxFQUFDLENBQUM7SUFDSEEsaUJBQU9BLEdBQUdBLFFBQVFBLENBQUNBO0FBQ2xDQSxDQUFDQSxFQUZNLFNBQVMsS0FBVCxTQUFTLFFBRWY7QUNGRCxJQUFPLFNBQVMsQ0EwQ2Y7QUExQ0QsV0FBTyxTQUFTLEVBQUMsQ0FBQztJQUtkQSxTQUFnQkEsVUFBVUEsQ0FBRUEsSUFBY0EsRUFBRUEsSUFBWUEsRUFBRUEsS0FBVUEsRUFBRUEsY0FBd0JBO1FBQzFGQyxJQUFJQSxFQUFFQSxHQUFrQkEsSUFBSUEsQ0FBQ0E7UUFDN0JBLElBQUlBLElBQUlBLEdBQVlBLEVBQUVBLENBQUNBLGFBQWFBLENBQUNBO1FBQ3JDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUNOQSxNQUFNQSxDQUFDQSxjQUFjQSxDQUFDQSxFQUFFQSxFQUFFQSxlQUFlQSxFQUFFQSxFQUFDQSxLQUFLQSxFQUFFQSxDQUFDQSxJQUFJQSxHQUFHQSxFQUFFQSxDQUFDQSxFQUFFQSxRQUFRQSxFQUFFQSxLQUFLQSxFQUFDQSxDQUFDQSxDQUFDQTtRQUN0RkEsSUFBSUEsR0FBR0EsR0FBVUEsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7UUFDNUJBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBO1lBQ0xBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBO1FBQzFCQSxFQUFFQSxDQUFDQSxDQUFDQSxjQUFjQSxJQUFJQSxHQUFHQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUNqQ0EsTUFBTUEsSUFBSUEsS0FBS0EsQ0FBQ0EsVUFBVUEsR0FBR0EsSUFBSUEsR0FBR0EsaUNBQWlDQSxHQUFHQSxxQkFBV0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7UUFDdEdBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO0lBQ3BCQSxDQUFDQTtJQVhlRCxvQkFBVUEsR0FBVkEsVUFXZkEsQ0FBQUE7SUFFREEsU0FBZ0JBLGNBQWNBLENBQUVBLElBQWNBLEVBQUVBLElBQVlBO1FBQ3hERSxJQUFJQSxFQUFFQSxHQUFrQkEsSUFBSUEsQ0FBQ0E7UUFDN0JBLElBQUlBLElBQUlBLEdBQVlBLEVBQUVBLENBQUNBLGFBQWFBLENBQUNBO1FBQ3JDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxJ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LENBQWdCQSxDQUFDQTtnQkFDakZBLGdCQUFnQkEsRUFBRUEsUUFBUUEsQ0FBQ0EsZ0JBQWdCQSxJQUFJQSxDQUFDQSxVQUFDQSxLQUFLQSxFQUFFQSxTQUFTQSxJQUFLQSxXQUFJQSxNQUFNQSxFQUFFQSxFQUFaQSxDQUFZQSxDQUFDQTtnQkFDbkZBLFVBQVVBLEVBQUVBLFFBQVFBLENBQUNBLFVBQVVBLElBQUlBLENBQUNBLFVBQUNBLElBQUlBLEVBQUVBLEdBQUdBO2dCQUM5Q0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0ZBLE1BQU1BLEVBQUVBLFFBQVFBLENBQUNBLE1BQU1BLElBQUlBLENBQUNBLFVBQUNBLEdBQUdBLEVBQUVBLFNBQVNBO2dCQUMzQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0ZBLFNBQVNBLEVBQUVBLFFBQVFBLENBQUNBLFNBQVNBLElBQUlBLENBQUNBLFVBQUNBLEdBQUdBLEVBQUVBLFNBQVNBLEVBQUVBLElBQUlBO2dCQUN2REEsQ0FBQ0EsQ0FBQ0E7Z0JBQ0ZBLFdBQVdBLEVBQUVBLFFBQVFBLENBQUNBLFdBQVdBLElBQUlBLENBQUNBLFVBQUNBLElBQUlBO2dCQUMzQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ0ZBLElBQUlBLEVBQUVBLFFBQVFBLENBQUNBLElBQUlBLElBQUlBLENBQUNBLFVBQUNBLElBQUlBO2dCQUM3QkEsQ0FBQ0EsQ0FBQ0E7Z0JBQ0ZBLGFBQWFBLEVBQUVBLFFBQVFBLENBQUNBLGFBQWFBLElBQUlBLENBQUNBLFVBQUNBLFNBQVNBLEVBQUVBLFFBQVFBO2dCQUM5REEsQ0FBQ0EsQ0FBQ0E7Z0JBQ0ZBLFdBQVdBLEVBQUVBLFFBQVFBLENBQUNBLFdBQVdBLElBQUlBLENBQUNBLFVBQUNBLFNBQVNBLEVBQUVBLFFBQVFBO2dCQUMxREEsQ0FBQ0EsQ0FBQ0E7Z0JBQ0ZBLGNBQWNBLEVBQUVBLFFBQVFBLENBQUNBLGNBQWNBLElBQUlBLENBQUNBLFVBQUNBLFNBQVNBLEVBQUVBLFFBQVFBO2dCQUNoRUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ0ZBLFlBQVlBLEVBQUVBLFFBQVFBLENBQUNBLFlB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QUFDQSxDQUFDQSxFQUFFQSxDQUFDQTs0QkFDUkEsR0FBR0EsQ0FBQ0EsR0FBR0EsSUFBSUEsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQzNCQSxDQUFDQTt3QkFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsS0FBS0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ3JCQSxFQUFFQSxDQUFDQSxDQUFDQSxRQUFRQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQ0FDeENBLEdBQUdBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLENBQUNBO2dDQUNmQSxRQUFRQSxHQUFHQSxJQUFJQSxDQUFDQTtnQ0FDaEJBLFFBQVFBLENBQUNBOzRCQUNiQSxDQUFDQTs0QkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ1BBLEdBQUdBLENBQUNBLEtBQUtBLEdBQUdBLHVDQUF1Q0EsQ0FBQ0E7Z0NBQ3BEQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTs0QkFDakJBLENBQUNBOzRCQUNEQSxHQUFHQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQTs0QkFDUkEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsR0FBR0EsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7NEJBQzlCQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxLQUFLQSxDQUFDQTtnQ0FDVkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7d0JBQ3JCQSxDQUFDQTt3QkFBQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsS0FBS0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ3JCQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTs0QkFDckJBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBO3dCQUNqQkEsQ0FBQ0E7d0JBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLEtBQUtBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBOzRCQUNyQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ1hBLFFBQVFBLEdBQUdBLEtBQUtBLENBQUNBO2dDQUNqQkEsR0FBR0EsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsQ0FBQ0E7NEJBQ25CQSxDQUFDQTs0QkFDREEsSUFBSUEsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxHQUFHQSxFQUFFQSxHQUFHQSxFQUFFQSxHQUFHQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQTs0QkFDekNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO3dCQUNoQkEsQ0FBQ0E7d0JBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLEtBQUtBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBOzRCQUNyQkEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0E7NEJBQ1JBLElBQUlBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsR0FBR0EsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7NEJBQ3pDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTt3QkFDaEJBLENBQUNBO3dCQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDeENBLEdBQUdBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBOzRCQUNSQSxJQUFJQSxDQUFDQSxtQkFBbUJBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBOzRCQUM5QkEsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0E7NEJBQ2RBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLEVBQUVBLENBQUNBO3dCQUNqQkEsQ0FBQ0E7d0JBQUNBLElBQUlBLENBQUNBLENBQUNBOzRCQUNKQSxHQUFHQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxDQUFDQTt3QkFDbkJBLENBQUNBO29CQUNMQSxDQUFDQTtvQkFDREEsTUFBTUEsSUFBSUEsS0FBS0EsQ0FBQ0EsK0JBQStCQSxDQUFDQSxDQUFDQTtnQkFDckRBLENBQUNBO2dCQUVPViw4Q0FBZ0JBLEdBQXhCQSxVQUEwQkEsR0FBa0JBLEVBQUVBLEdBQVdBLEVBQUVBLEdBQVFBLEVBQUVBLEVBQVNBO29CQUMxRVcsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsS0FBS0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ3BCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQSxDQUFDQTs0QkFDeEJBLE1BQU1BLENBQUNBO29CQUNmQSxDQUFDQTtvQkFFREEsR0FBR0EsR0FBR0EsNEJBQXFCQSxDQUFDQSxHQUFHQSxFQUFFQSxHQUFHQSxDQUFDQSxRQUFRQSxFQUFFQSxJQUFJQSxDQUFDQSxlQUFlQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQTtvQkFDekVBLElBQUlBLEVBQUVBLEdBQUdBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO29CQUMzQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ1BBLEVBQUVBLENBQUNBLElBQUlBLElBQUlBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO29CQUM1QkEsQ0FBQ0E7b0JBQUNBLElBQUlBLENBQUNBLENBQUNBO3dCQUNKQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQTtvQkFDbEJBLENBQUNBO2dCQUNMQSxDQUFDQTtnQkFFT1gsaURBQW1CQSxHQUEzQkEsVUFBNkJBLEdBQWtCQTtvQkFDM0NZLElBQUlBLElBQUlBLEdBQUdBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBO29CQUNwQkEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7b0JBQ3RCQSxHQUFHQSxDQUFDQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQTt3QkFDMUJBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUN0QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ2ZBLEdBQUdBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBOzRCQUNSQSxHQUFHQSxDQUFDQSxHQUFHQSxJQUFJQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDM0JBLENBQUNBO3dCQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDckJBLE1BQU1BLENBQUNBO3dCQUNYQSxDQUFDQTt3QkFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7NEJBQ0pBLEdBQUdBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLENBQUNBO3dCQUNuQkEsQ0FBQ0E7b0JBQ0xBLENBQUNBO2dCQUNMQSxDQUFDQTtnQkFFT1osc0NBQVFBLEdBQWhCQTtvQkFDSWEsSUFBSUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FDbkNBLGVBQWVBLENBQUNBLElBQUlBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsQ0FDdkNBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO2dCQUNqQ0EsQ0FBQ0E7Z0JBRURiLDJDQUFhQSxHQUFiQSxVQUFlQSxFQUF3QkE7b0JBQ25DYyxJQUFJQSxRQUFRQSxHQUFhQTt3QkFDckJBLFdBQVdBLEVBQUVBLEtBQUtBO3dCQUNsQkEsSUFBSUEsRUFBRUEsTUFBTUE7cUJBQ2ZBLENBQUNBO29CQUNGQSxJQUFJQSxDQUFDQSxlQUFlQSxHQUFHQSxFQUFFQSxJQUFJQSxDQUFDQSxVQUFDQSxLQUFLQSxFQUFFQSxJQUFJQSxJQUFLQSxlQUFRQSxFQUFSQSxDQUFRQSxDQUFDQSxDQUFDQTtvQkFDekRBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO2dCQUNoQkEsQ0FBQ0E7Z0JBRURkLDZDQUFlQSxHQUFmQSxVQUFpQkEsRUFBMEJBO29CQUN2Q2UsSUFBSUEsQ0FBQ0EsaUJBQWlCQSxHQUFHQSxFQUFFQSxJQUFJQSxDQUFDQSxVQUFDQSxJQUFJQSxJQUFLQSxXQUFJQSxJQUFJQSxFQUFFQSxFQUFWQSxDQUFVQSxDQUFDQSxDQUFDQTtvQkFDdERBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO2dCQUNoQkEsQ0FBQ0E7Z0JBRURmLGdEQUFrQkEsR0FBbEJBLFVBQW9CQSxFQUE2QkE7b0JBQzdDZ0IsSUFBSUEsQ0FBQ0Esb0JBQW9CQSxHQUFHQSxFQUFFQSxJQUFJQSxDQUFDQSxVQUFDQSxJQUFJQSxFQUFFQSxJQUFJQSxJQUFLQSxXQUFJQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFkQSxDQUFjQSxDQUFDQSxDQUFDQTtvQkFDbkVBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO2dCQUNoQkEsQ0FBQ0E7Z0JBRURoQixxQ0FBT0EsR0FBUEEsVUFBU0EsRUFBa0JBO29CQUN2QmlCLElBQUlBLENBQUNBLFNBQVNBLEdBQUdBLEVBQUVBLElBQUlBLENBQUNBLFVBQUNBLENBQUNBO29CQUMxQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ0hBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO2dCQUNoQkEsQ0FBQ0E7Z0JBQ0xqQiwwQkFBQ0E7WUFBREEsQ0FoUEFELEFBZ1BDQyxJQUFBRDtZQWhQWUEsd0JBQW1CQSxHQUFuQkEsbUJBZ1BaQSxDQUFBQTtZQUVEQSxTQUFTQSxPQUFPQSxDQUFFQSxDQUFTQTtnQkFDdkJtQixFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDSEEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7Z0JBQ2pCQSxJQUFJQSxJQUFJQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDNUNBLE1BQU1BLENBQUNBLElBQUlBLElBQUlBLEVBQUVBLElBQUlBLElBQUlBLElBQUlBLEVBQUVBLENBQUNBO1lBQ3BDQSxDQUFDQTtRQUNMbkIsQ0FBQ0EsRUExUXVCdkIsSUFBSUEsR0FBSkEsV0FBSUEsS0FBSkEsV0FBSUEsUUEwUTNCQTtJQUFEQSxDQUFDQSxFQTFRZ0J4RyxNQUFNQSxHQUFOQSxnQkFBTUEsS0FBTkEsZ0JBQU1BLFFBMFF0QkE7QUFBREEsQ0FBQ0EsRUExUU0sU0FBUyxLQUFULFNBQVMsUUEwUWY7Ozs7Ozs7QUMxUUQsSUFBTyxTQUFTLENBb0JmO0FBcEJELFdBQU8sU0FBUztJQUFDQSxJQUFBQSxNQUFNQSxDQW9CdEJBO0lBcEJnQkEsV0FBQUEsTUFBTUE7UUFBQ3dHLElBQUFBLElBQUlBLENBb0IzQkE7UUFwQnVCQSxXQUFBQSxJQUFJQSxFQUFDQSxDQUFDQTtZQUMxQnVCLElBQUlBLE1BQU1BLEdBQUdBLElBQUlBLFNBQVNBLEVBQUVBLENBQUNBO1lBQzdCQSxJQUFJQSxNQUFNQSxHQUFHQSxJQUFJQSxrQkFBUUEsQ0FBYUEsVUFBQ0EsR0FBR0EsSUFBS0EsV0FBSUEsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBbkJBLENBQW1CQSxDQUFDQSxDQUFDQTtZQUVwRUEsSUFBYUEsVUFBVUE7Z0JBQVNvQixVQUFuQkEsVUFBVUEsVUFBK0JBO2dCQUF0REEsU0FBYUEsVUFBVUE7b0JBQVNDLDhCQUFzQkE7Z0JBZXREQSxDQUFDQTtnQkFaVUQsaUJBQU1BLEdBQWJBLFVBQWVBLEdBQVFBO29CQUNuQkUsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzFDQSxDQUFDQTtnQkFFREYsaUNBQVlBLEdBQVpBO29CQUNJRyxNQUFNQSxDQUFDQSxJQUFJQSxlQUFVQSxFQUFFQSxDQUFDQTtnQkFDNUJBLENBQUNBO2dCQUVESCw2QkFBUUEsR0FBUkEsVUFBVUEsSUFBWUE7b0JBQ2xCSSxJQUFJQSxHQUFHQSxHQUFHQSxNQUFNQSxDQUFDQSxlQUFlQSxDQUFDQSxJQUFJQSxFQUFFQSxVQUFVQSxDQUFDQSxDQUFDQTtvQkFDbkRBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLGVBQWVBLENBQUNBO2dCQUMvQkEsQ0FBQ0E7Z0JBQ0xKLGlCQUFDQTtZQUFEQSxDQWZBcEIsQUFlQ29CLEVBZitCcEIsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFlNUNBO1lBZllBLGVBQVVBLEdBQVZBLFVBZVpBLENBQUFBO1FBQ0xBLENBQUNBLEVBcEJ1QnZCLElBQUlBLEdBQUpBLFdBQUlBLEtBQUpBLFdBQUlBLFFBb0IzQkE7SUFBREEsQ0FBQ0EsRUFwQmdCeEcsTUFBTUEsR0FBTkEsZ0JBQU1BLEtBQU5BLGdCQUFNQSxRQW9CdEJBO0FBQURBLENBQUNBLEVBcEJNLFNBQVMsS0FBVCxTQUFTLFFBb0JmO0FDcEJELElBQU8sU0FBUyxDQWlVZjtBQWpVRCxXQUFPLFNBQVM7SUFBQ0EsSUFBQUEsTUFBTUEsQ0FpVXRCQTtJQWpVZ0JBLFdBQUFBLE1BQU1BO1FBQUN3RyxJQUFBQSxJQUFJQSxDQWlVM0JBO1FBalV1QkEsV0FBQUEsSUFBSUEsRUFBQ0EsQ0FBQ0E7WUFDZnVCLGtCQUFhQSxHQUFHQSxnQ0FBZ0NBLENBQUNBO1lBQ2pEQSxvQkFBZUEsR0FBR0Esa0NBQWtDQSxDQUFDQTtZQUNoRUEsSUFBSUEsV0FBV0EsR0FBR0EsOEJBQThCQSxDQUFDQTtZQUNqREEsSUFBSUEsVUFBVUEsR0FBR0EsYUFBYUEsQ0FBQ0E7WUFFL0JBLElBQWFBLFVBQVVBO2dCQTJCbkJ5QixTQTNCU0EsVUFBVUE7b0JBZVhDLFlBQU9BLEdBQWNBLElBQUlBLENBQUNBO29CQU8xQkEsa0JBQWFBLEdBQVVBLEVBQUVBLENBQUNBO29CQUMxQkEsZUFBVUEsR0FBR0EsS0FBS0EsQ0FBQ0E7b0JBQ25CQSxZQUFPQSxHQUFZQSxJQUFJQSxDQUFDQTtvQkFDeEJBLGFBQVFBLEdBQVdBLFNBQVNBLENBQUNBO29CQUdqQ0EsSUFBSUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxJQUFJQSx3QkFBbUJBLEVBQUVBLENBQUNBLENBQzdDQSxhQUFhQSxDQUFDQSxrQkFBYUEsRUFBRUEsb0JBQWVBLENBQUNBLENBQzdDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQTtnQkFDaEJBLENBQUNBO2dCQUVERCx1QkFBRUEsR0FBRkEsVUFBSUEsUUFBNkJBO29CQUM3QkUsUUFBUUEsR0FBR0Esc0JBQWVBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBO29CQUVyQ0EsSUFBSUEsQ0FBQ0EsZUFBZUEsR0FBR0EsUUFBUUEsQ0FBQ0EsV0FBV0EsQ0FBQ0E7b0JBQzVDQSxJQUFJQSxDQUFDQSxpQkFBaUJBLEdBQUdBLFFBQVFBLENBQUNBLGFBQWFBLENBQUNBO29CQUNoREEsSUFBSUEsQ0FBQ0Esb0JBQW9CQSxHQUFHQSxRQUFRQSxDQUFDQSxnQkFBZ0JBLENBQUNBO29CQUN0REEsSUFBSUEsQ0FBQ0Esb0JBQW9CQSxHQUFHQSxRQUFRQSxDQUFDQSxnQkFBZ0JBLENBQUNBO29CQUN0REEsSUFBSUEsQ0FBQ0EsY0FBY0EsR0FBR0EsUUFBUUEsQ0FBQ0EsVUFBVUEsQ0FBQ0E7b0JBQzFDQSxJQUFJQSxDQUFDQSxVQUFVQSxHQUFHQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQTtvQkFDbENBLElBQUlBLENBQUNBLGFBQWFBLEdBQUdBLFFBQVFBLENBQUNBLFNBQVNBLENBQUNBO29CQUN4Q0EsSUFBSUEsQ0FBQ0EsZUFBZUEsR0FBR0EsUUFBUUEsQ0FBQ0EsV0FBV0EsQ0FBQ0E7b0JBQzVDQSxJQUFJQSxDQUFDQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQTtvQkFDOUJBLElBQUlBLENBQUNBLGlCQUFpQkEsR0FBR0EsUUFBUUEsQ0FBQ0EsYUFBYUEsQ0FBQ0E7b0JBQ2hEQSxJQUFJQSxDQUFDQSxlQUFlQSxHQUFHQSxRQUFRQSxDQUFDQSxXQUFXQSxDQUFDQTtvQkFDNUNBLElBQUlBLENBQUNBLGtCQUFrQkEsR0FBR0EsUUFBUUEsQ0FBQ0EsY0FBY0EsQ0FBQ0E7b0JBQ2xEQSxJQUFJQSxDQUFDQSxnQkFBZ0JBLEdBQUdBLFFBQVFBLENBQUNBLFlBQVlBLENBQUNBO29CQUM5Q0EsSUFBSUEsQ0FBQ0EsU0FBU0EsR0FBR0EsUUFBUUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7b0JBQ2hDQSxJQUFJQSxDQUFDQSxPQUFPQSxHQUFHQSxRQUFRQSxDQUFDQSxHQUFHQSxDQUFDQTtvQkFFNUJBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLENBQUNBLENBQUNBO3dCQUNuQkEsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FDWEEsYUFBYUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FDbkNBLGVBQWVBLENBQUNBLElBQUlBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsQ0FDdkNBLGtCQUFrQkEsQ0FBQ0EsSUFBSUEsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxDQUFDQTtvQkFDdkRBLENBQUNBO29CQUVEQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDaEJBLENBQUNBO2dCQUVERixrQ0FBYUEsR0FBYkEsVUFBZUEsWUFBb0JBLEVBQUVBLE1BQWNBO29CQUMvQ0csSUFBSUEsQ0FBQ0EsY0FBY0EsR0FBR0EsWUFBWUEsQ0FBQ0E7b0JBQ25DQSxJQUFJQSxDQUFDQSxRQUFRQSxHQUFHQSxNQUFNQSxDQUFDQTtvQkFDdkJBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBO3dCQUNqQkEsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsY0FBY0EsRUFBRUEsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3ZFQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDaEJBLENBQUNBO2dCQUVESCx1Q0FBa0JBLEdBQWxCQSxVQUFvQkEsTUFBOEJBO29CQUM5Q0ksSUFBSUEsQ0FBQ0EsV0FBV0EsR0FBR0EsTUFBTUEsQ0FBQ0E7b0JBQzFCQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDVEEsTUFBTUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsY0FBY0EsRUFBRUEsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FDbkRBLGFBQWFBLENBQUNBLElBQUlBLENBQUNBLGVBQWVBLENBQUNBLENBQ25DQSxlQUFlQSxDQUFDQSxJQUFJQSxDQUFDQSxpQkFBaUJBLENBQUNBLENBQ3ZDQSxrQkFBa0JBLENBQUNBLElBQUlBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsQ0FDN0NBLE9BQU9BLENBQUNBLFVBQUNBLENBQUNBOzRCQUNQQSxNQUFNQSxDQUFDQSxDQUFDQTt3QkFDWkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ1hBLENBQUNBO29CQUNEQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDaEJBLENBQUNBO2dCQUVESiwwQkFBS0EsR0FBTEEsVUFBT0EsRUFBV0E7b0JBQ2RLLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBO3dCQUNsQkEsTUFBTUEsSUFBSUEsS0FBS0EsQ0FBQ0EsdUNBQXVDQSxDQUFDQSxDQUFDQTtvQkFDN0RBLElBQUlBLENBQUNBLGVBQWVBLENBQUNBLEVBQUVBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO29CQUMvQkEsSUFBSUEsQ0FBQ0EsU0FBU0EsRUFBRUEsQ0FBQ0E7b0JBQ2pCQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDaEJBLENBQUNBO2dCQUVETCwrQkFBVUEsR0FBVkE7b0JBQ0lNLElBQUlBLENBQUNBLFVBQVVBLEdBQUdBLElBQUlBLENBQUNBO2dCQUMzQkEsQ0FBQ0E7Z0JBRUROLGtDQUFhQSxHQUFiQTtvQkFDSU8sSUFBSUEsRUFBRUEsR0FBR0EsSUFBSUEsQ0FBQ0EsYUFBYUEsQ0FBQ0E7b0JBQzVCQSxJQUFJQSxDQUFDQSxHQUFHQSxFQUFFQSxDQUFDQSxNQUFNQSxDQUFDQTtvQkFDbEJBLE1BQU1BLENBQUNBO3dCQUNIQSxPQUFPQSxFQUFFQSxTQUFTQTt3QkFDbEJBLFFBQVFBOzRCQUNKQyxDQUFDQSxFQUFFQSxDQUFDQTs0QkFDSkEsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsR0FBR0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsU0FBU0EsQ0FBQ0E7d0JBQ2hEQSxDQUFDQTtxQkFDSkQsQ0FBQ0E7Z0JBQ05BLENBQUNBO2dCQUVEUCxrQ0FBYUEsR0FBYkEsVUFBZUEsTUFBY0E7b0JBQ3pCUyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxrQkFBa0JBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO2dCQUNuREEsQ0FBQ0E7Z0JBRU9ULG9DQUFlQSxHQUF2QkEsVUFBeUJBLEVBQVdBLEVBQUVBLFNBQWtCQTtvQkFJcERVLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBO29CQUN2QkEsSUFBSUEsQ0FBQ0EsT0FBT0EsR0FBR0EsRUFBRUEsQ0FBQ0E7b0JBQ2xCQSxJQUFJQSxJQUFJQSxHQUFHQSxFQUFFQSxDQUFDQSxTQUFTQSxDQUFDQTtvQkFDeEJBLElBQUlBLEtBQUtBLEdBQUdBLEVBQUVBLENBQUNBLFlBQVlBLENBQUNBO29CQUM1QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxFQUFFQSxFQUFFQSxLQUFLQSxFQUFFQSxJQUFJQSxDQUFDQSxJQUFJQSxJQUFJQSxDQUFDQSxzQkFBc0JBLENBQUNBLEVBQUVBLEVBQUVBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUN6RkEsSUFBSUEsQ0FBQ0EsT0FBT0EsR0FBR0EsR0FBR0EsQ0FBQ0E7d0JBQ25CQSxNQUFNQSxDQUFDQTtvQkFDWEEsQ0FBQ0E7b0JBRURBLElBQUlBLEVBQUVBLEdBQUdBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBO29CQUM1QkEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsS0FBS0EsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQzVDQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxvQkFBb0JBLENBQUNBLEVBQUVBLEVBQUVBLEdBQUdBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNoREEsSUFBSUEsQ0FBQ0EsT0FBT0EsR0FBR0EsR0FBR0EsQ0FBQ0E7d0JBQ25CQSxNQUFNQSxDQUFDQTtvQkFDWEEsQ0FBQ0E7b0JBRURBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQzNDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxLQUFLQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDcEJBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO3dCQUNiQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtvQkFDcENBLENBQUNBO29CQUdEQSxJQUFJQSxLQUFLQSxHQUFHQSxvQkFBb0JBLENBQUNBLEVBQUVBLEVBQUVBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO29CQUNsREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0E7d0JBQ05BLElBQUlBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsR0FBR0EsRUFBRUEsR0FBR0EsQ0FBQ0EsSUFBSUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7b0JBRWpEQSxJQUFJQSxDQUFDQSxRQUFRQSxHQUFHQSxTQUFTQSxDQUFDQTtvQkFFMUJBLElBQUlBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7b0JBQzdCQSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQTtvQkFFeEJBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBLENBQUNBO3dCQUNsQkEsSUFBSUEsQ0FBQ0EsVUFBVUEsR0FBR0EsS0FBS0EsQ0FBQ0E7d0JBQ3hCQSxFQUFFQSxDQUFDQSxHQUFHQSxFQUFFQSxDQUFDQTt3QkFDVEEsSUFBSUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsR0FBR0EsRUFBRUEsR0FBR0EsRUFBRUEsU0FBU0EsRUFBRUEsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQzNEQSxJQUFJQSxDQUFDQSxjQUFjQSxDQUFDQSxFQUFFQSxDQUFDQSxpQkFBaUJBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBO3dCQUMvQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsR0FBR0EsR0FBR0EsQ0FBQ0E7d0JBQ25CQSxNQUFNQSxDQUFDQTtvQkFDWEEsQ0FBQ0E7b0JBR0RBLElBQUlBLEtBQUtBLEdBQUdBLEVBQUVBLENBQUNBLGlCQUFpQkEsQ0FBQ0E7b0JBQ2pDQSxJQUFJQSxXQUFXQSxHQUFHQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQTtvQkFDMUJBLE9BQU9BLEtBQUtBLEVBQUVBLENBQUNBO3dCQUNYQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxLQUFLQSxJQUFJQSxLQUFLQSxLQUFLQSxLQUFLQSxDQUFDQTs0QkFDMUJBLElBQUlBLENBQUNBLGVBQWVBLENBQUNBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO3dCQUN0Q0EsS0FBS0EsR0FBR0EsS0FBS0EsQ0FBQ0Esa0JBQWtCQSxDQUFDQTtvQkFDckNBLENBQUNBO29CQUdEQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDZkEsSUFBSUEsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0EsV0FBV0EsQ0FBQ0E7d0JBQzFCQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxJQUFJQSxDQUFDQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQSxDQUFDQTs0QkFDN0JBLElBQUlBLENBQUNBLGVBQWVBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO29CQUNuQ0EsQ0FBQ0E7b0JBS0RBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLEtBQUtBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNwQkEsRUFBRUEsQ0FBQ0EsR0FBR0EsRUFBRUEsQ0FBQ0E7d0JBQ1RBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLEdBQUdBLEVBQUVBLEdBQUdBLEVBQUVBLFNBQVNBLEVBQUVBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUMvREEsQ0FBQ0E7b0JBQ0RBLElBQUlBLENBQUNBLE9BQU9BLEdBQUdBLEdBQUdBLENBQUNBO2dCQUN2QkEsQ0FBQ0E7Z0JBRU9WLHNDQUFpQkEsR0FBekJBLFVBQTJCQSxLQUFVQSxFQUFFQSxTQUFjQSxFQUFFQSxLQUFjQTtvQkFDakVXLElBQUlBLEVBQUVBLEdBQUdBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBO29CQUM1QkEsSUFBSUEsRUFBRUEsR0FBR0EsSUFBSUEsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxLQUFLQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtvQkFDckRBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBO29CQUNaQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxFQUFFQSxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQTtvQkFDM0JBLElBQUlBLEtBQUtBLEdBQUdBLEtBQUtBLENBQUNBLGlCQUFpQkEsQ0FBQ0E7b0JBQ3BDQSxPQUFPQSxLQUFLQSxFQUFFQSxDQUFDQTt3QkFDWEEsSUFBSUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsS0FBS0EsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7d0JBQ2xDQSxLQUFLQSxHQUFHQSxLQUFLQSxDQUFDQSxrQkFBa0JBLENBQUNBO29CQUNyQ0EsQ0FBQ0E7b0JBQ0RBLEVBQUVBLENBQUNBLEdBQUdBLEVBQUVBLENBQUNBO29CQUNUQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQSxFQUFFQSxFQUFFQSxTQUFTQSxFQUFFQSxLQUFLQSxFQUFFQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxNQUFNQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDaEVBLENBQUNBO2dCQUVPWCxxQ0FBZ0JBLEdBQXhCQSxVQUEwQkEsRUFBV0EsRUFBRUEsS0FBYUEsRUFBRUEsSUFBWUE7b0JBQzlEWSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxLQUFLQSxXQUFXQSxJQUFJQSxJQUFJQSxLQUFLQSxVQUFVQSxDQUFDQTt3QkFDN0NBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBO29CQUNqQkEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsSUFBSUEsS0FBS0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQzFDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDaEJBLENBQUNBO2dCQUVPWiwyQ0FBc0JBLEdBQTlCQSxVQUFnQ0EsRUFBV0EsRUFBRUEsS0FBYUEsRUFBRUEsSUFBWUE7b0JBQ3BFYSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtvQkFDNUJBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBO3dCQUNSQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtvQkFFakJBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLGVBQWVBLENBQUNBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO29CQUMzREEsSUFBSUEsSUFBSUEsR0FBR0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0E7b0JBQ3BCQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFFNUJBLElBQUlBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsSUFBSUEsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBRW5DQSxJQUFJQSxLQUFLQSxHQUFHQSxFQUFFQSxDQUFDQSxpQkFBaUJBLENBQUNBO29CQUNqQ0EsT0FBT0EsS0FBS0EsRUFBRUEsQ0FBQ0E7d0JBQ1hBLElBQUlBLENBQUNBLGVBQWVBLENBQUNBLEtBQUtBLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBO3dCQUNuQ0EsS0FBS0EsR0FBR0EsS0FBS0EsQ0FBQ0Esa0JBQWtCQSxDQUFDQTtvQkFDckNBLENBQUNBO29CQUVEQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQSxJQUFJQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFFakNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO2dCQUNoQkEsQ0FBQ0E7Z0JBRU9iLHlDQUFvQkEsR0FBNUJBLFVBQThCQSxFQUFXQSxFQUFFQSxRQUFrQkEsRUFBRUEsU0FBa0JBO29CQUM3RWMsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsV0FBV0EsQ0FBQ0E7d0JBQ3RCQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtvQkFDakJBLElBQUlBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLFdBQVdBLENBQUNBO29CQUMxQkEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxFQUFFQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxJQUFJQSxFQUFFQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQTtvQkFDNUVBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO29CQUNoQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsR0FBR0EsU0FBU0EsQ0FBQ0E7b0JBQzFCQSxJQUFJQSxDQUFDQSxtQkFBbUJBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBO29CQUM3QkEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7b0JBQ3hCQSxJQUFJQSxFQUFFQSxHQUFHQSxJQUFJQSxDQUFDQSxhQUFhQSxDQUFDQTtvQkFDNUJBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLEdBQUdBLEVBQUVBLEdBQUdBLEVBQUVBLFNBQVNBLEVBQUVBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUMzREEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7Z0JBQ2hCQSxDQUFDQTtnQkFFT2Qsd0NBQW1CQSxHQUEzQkEsVUFBNkJBLEVBQVdBO29CQUNwQ2UsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBRUEsS0FBS0EsR0FBR0EsRUFBRUEsQ0FBQ0EsVUFBVUEsRUFBRUEsR0FBR0EsR0FBR0EsS0FBS0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsR0FBR0EsR0FBR0EsRUFBRUEsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0E7d0JBQ3RFQSxJQUFJQSxDQUFDQSxrQkFBa0JBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUN0Q0EsQ0FBQ0E7Z0JBQ0xBLENBQUNBO2dCQUVPZix1Q0FBa0JBLEdBQTFCQSxVQUE0QkEsSUFBVUE7b0JBQ2xDZ0IsSUFBSUEsTUFBTUEsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7b0JBQ3pCQSxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQTtvQkFDMUJBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsTUFBTUEsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0E7d0JBQ3BDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtvQkFDaEJBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBO29CQUM1QkEsSUFBSUEsS0FBS0EsR0FBR0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7b0JBQ3ZCQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxxQkFBcUJBLENBQUNBLEdBQUdBLEVBQUVBLElBQUlBLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBO3dCQUM3Q0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0E7b0JBQ2hCQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxpQkFBaUJBLENBQUNBLEdBQUdBLEVBQUVBLElBQUlBLEVBQUVBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO2dCQUMxREEsQ0FBQ0E7Z0JBRU9oQixxQ0FBZ0JBLEdBQXhCQSxVQUEwQkEsTUFBY0EsRUFBRUEsSUFBWUE7b0JBQ2xEaUIsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsS0FBS0EsT0FBT0EsQ0FBQ0E7d0JBQ25CQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtvQkFDaEJBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLElBQUlBLElBQUlBLEtBQUtBLE9BQU9BLENBQUNBLENBQUNBO2dCQUN6Q0EsQ0FBQ0E7Z0JBRU9qQiwwQ0FBcUJBLEdBQTdCQSxVQUErQkEsR0FBV0EsRUFBRUEsSUFBWUEsRUFBRUEsS0FBYUE7b0JBR25Fa0IsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsS0FBS0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7d0JBQ3RCQSxNQUFNQSxDQUFDQSxLQUFLQSxDQUFDQTtvQkFDakJBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLEtBQUtBLE1BQU1BLENBQUNBO3dCQUNoQkEsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3pCQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxLQUFLQSxLQUFLQSxDQUFDQTt3QkFDZkEsSUFBSUEsQ0FBQ0EsUUFBUUEsR0FBR0EsS0FBS0EsQ0FBQ0E7b0JBQzFCQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFDaEJBLENBQUNBO2dCQUVPbEIsc0NBQWlCQSxHQUF6QkEsVUFBMkJBLEdBQVdBLEVBQUVBLElBQVlBLEVBQUVBLEtBQWFBLEVBQUVBLElBQVVBO29CQUkzRW1CLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBO29CQUNoQkEsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7b0JBQ2hCQSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtvQkFDNUJBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNYQSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQSxHQUFHQSxFQUFFQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDekRBLElBQUlBLEdBQUdBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBO3dCQUNoQkEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ2hDQSxDQUFDQTtvQkFDREEsSUFBSUEsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxJQUFJQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDcENBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLGNBQWNBLENBQUNBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBO29CQUMzQ0EsSUFBSUEsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxJQUFJQSxFQUFFQSxJQUFJQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTtvQkFDdkNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO2dCQUNoQkEsQ0FBQ0E7Z0JBRU9uQixtQ0FBY0EsR0FBdEJBLFVBQXdCQSxHQUFXQSxFQUFFQSxJQUFVQTtvQkFDM0NvQixFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxLQUFLQSxHQUFHQSxDQUFDQTt3QkFDZkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0E7b0JBQ2ZBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLENBQUNBO2dCQUNqRUEsQ0FBQ0E7Z0JBRU9wQiw4QkFBU0EsR0FBakJBO29CQUNJcUIsSUFBSUEsQ0FBQ0EsT0FBT0EsSUFBSUEsSUFBSUEsQ0FBQ0EsT0FBT0EsRUFBRUEsQ0FBQ0E7Z0JBQ25DQSxDQUFDQTtnQkFDTHJCLGlCQUFDQTtZQUFEQSxDQS9TQXpCLEFBK1NDeUIsSUFBQXpCO1lBL1NZQSxlQUFVQSxHQUFWQSxVQStTWkEsQ0FBQUE7WUFFREEsU0FBU0Esb0JBQW9CQSxDQUFFQSxPQUFnQkEsRUFBRUEsR0FBV0EsRUFBRUEsSUFBWUE7Z0JBQ3RFK0MsSUFBSUEsUUFBUUEsR0FBR0EsSUFBSUEsR0FBR0EsWUFBWUEsQ0FBQ0E7Z0JBQ25DQSxJQUFJQSxLQUFLQSxHQUFHQSxPQUFPQSxDQUFDQSxpQkFBaUJBLENBQUNBO2dCQUN0Q0EsT0FBT0EsS0FBS0EsRUFBRUEsQ0FBQ0E7b0JBQ1hBLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBLFNBQVNBLEtBQUtBLFFBQVFBLElBQUlBLEtBQUtBLENBQUNBLFlBQVlBLEtBQUtBLEdBQUdBLENBQUNBO3dCQUMzREEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7b0JBQ2pCQSxLQUFLQSxHQUFHQSxLQUFLQSxDQUFDQSxrQkFBa0JBLENBQUNBO2dCQUNyQ0EsQ0FBQ0E7Z0JBQ0RBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBO1lBQ2hCQSxDQUFDQTtRQUNML0MsQ0FBQ0EsRUFqVXVCdkIsSUFBSUEsR0FBSkEsV0FBSUEsS0FBSkEsV0FBSUEsUUFpVTNCQTtJQUFEQSxDQUFDQSxFQWpVZ0J4RyxNQUFNQSxHQUFOQSxnQkFBTUEsS0FBTkEsZ0JBQU1BLFFBaVV0QkE7QUFBREEsQ0FBQ0EsRUFqVU0sU0FBUyxLQUFULFNBQVMsUUFpVWYiLCJmaWxlIjoibnVsbHN0b25lLmpzIiwic291cmNlUm9vdCI6Imc6L1NvdXJjZUNvbnRyb2wvbnVsbHN0b25lLyIsInNvdXJjZXNDb250ZW50IjpbIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IHZhciB2ZXJzaW9uID0gJzAuMy4xMCc7XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGludGVyZmFjZSBBbm5vdGF0ZWRUeXBlIGV4dGVuZHMgRnVuY3Rpb24ge1xyXG4gICAgICAgICQkYW5ub3RhdGlvbnM6IGFueVtdW107XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIEFubm90YXRpb24gKHR5cGU6IEZ1bmN0aW9uLCBuYW1lOiBzdHJpbmcsIHZhbHVlOiBhbnksIGZvcmJpZE11bHRpcGxlPzogYm9vbGVhbikge1xyXG4gICAgICAgIHZhciBhdCA9IDxBbm5vdGF0ZWRUeXBlPnR5cGU7XHJcbiAgICAgICAgdmFyIGFubnM6IGFueVtdW10gPSBhdC4kJGFubm90YXRpb25zO1xyXG4gICAgICAgIGlmICghYW5ucylcclxuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGF0LCBcIiQkYW5ub3RhdGlvbnNcIiwge3ZhbHVlOiAoYW5ucyA9IFtdKSwgd3JpdGFibGU6IGZhbHNlfSk7XHJcbiAgICAgICAgdmFyIGFubjogYW55W10gPSBhbm5zW25hbWVdO1xyXG4gICAgICAgIGlmICghYW5uKVxyXG4gICAgICAgICAgICBhbm5zW25hbWVdID0gYW5uID0gW107XHJcbiAgICAgICAgaWYgKGZvcmJpZE11bHRpcGxlICYmIGFubi5sZW5ndGggPiAwKVxyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IDEgJ1wiICsgbmFtZSArIFwiJyBhbm5vdGF0aW9uIGFsbG93ZWQgcGVyIHR5cGUgW1wiICsgZ2V0VHlwZU5hbWUodHlwZSkgKyBcIl0uXCIpO1xyXG4gICAgICAgIGFubi5wdXNoKHZhbHVlKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gR2V0QW5ub3RhdGlvbnMgKHR5cGU6IEZ1bmN0aW9uLCBuYW1lOiBzdHJpbmcpOiBhbnlbXSB7XHJcbiAgICAgICAgdmFyIGF0ID0gPEFubm90YXRlZFR5cGU+dHlwZTtcclxuICAgICAgICB2YXIgYW5uczogYW55W11bXSA9IGF0LiQkYW5ub3RhdGlvbnM7XHJcbiAgICAgICAgaWYgKCFhbm5zKVxyXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgIHJldHVybiAoYW5uc1tuYW1lXSB8fCBbXSkuc2xpY2UoMCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJVHlwZWRBbm5vdGF0aW9uPFQ+IHtcclxuICAgICAgICAodHlwZTogRnVuY3Rpb24sIC4uLnZhbHVlczogVFtdKTtcclxuICAgICAgICBHZXQodHlwZTogRnVuY3Rpb24pOiBUW107XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gQ3JlYXRlVHlwZWRBbm5vdGF0aW9uPFQ+KG5hbWU6IHN0cmluZyk6IElUeXBlZEFubm90YXRpb248VD4ge1xyXG4gICAgICAgIGZ1bmN0aW9uIHRhICh0eXBlOiBGdW5jdGlvbiwgLi4udmFsdWVzOiBUW10pIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHZhbHVlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgQW5ub3RhdGlvbih0eXBlLCBuYW1lLCB2YWx1ZXNbaV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAoPGFueT50YSkuR2V0ID0gZnVuY3Rpb24gKHR5cGU6IEZ1bmN0aW9uKTogVFtdIHtcclxuICAgICAgICAgICAgcmV0dXJuIEdldEFubm90YXRpb25zKHR5cGUsIG5hbWUpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIDxJVHlwZWRBbm5vdGF0aW9uPFQ+PnRhO1xyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZS5hc3luYyB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElBc3luY1JlcXVlc3Q8VD4ge1xyXG4gICAgICAgIHRoZW4oc3VjY2VzczogKHJlc3VsdDogVCkgPT4gYW55LCBlcnJvcmVkPzogKGVycm9yOiBhbnkpID0+IGFueSk6IElBc3luY1JlcXVlc3Q8VD47XHJcbiAgICB9XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElBc3luY1Jlc29sdXRpb248VD4ge1xyXG4gICAgICAgIChyZXNvbHZlOiAocmVzdWx0OiBUKSA9PiBhbnksIHJlamVjdDogKGVycm9yOiBhbnkpID0+IGFueSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZSA8VD4ocmVzb2x1dGlvbjogSUFzeW5jUmVzb2x1dGlvbjxUPik6IElBc3luY1JlcXVlc3Q8VD4ge1xyXG4gICAgICAgIHZhciBvblN1Y2Nlc3M6IChyZXN1bHQ6IFQpPT5hbnk7XHJcbiAgICAgICAgdmFyIG9uRXJyb3I6IChlcnJvcjogYW55KT0+YW55O1xyXG5cclxuICAgICAgICB2YXIgcmVzb2x2ZWRSZXN1bHQ6IGFueTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gcmVzb2x2ZSAocmVzdWx0OiBUKSB7XHJcbiAgICAgICAgICAgIHJlc29sdmVkUmVzdWx0ID0gcmVzdWx0O1xyXG4gICAgICAgICAgICBvblN1Y2Nlc3MgJiYgb25TdWNjZXNzKHJlc3VsdCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgcmVzb2x2ZWRFcnJvcjogYW55O1xyXG5cclxuICAgICAgICBmdW5jdGlvbiByZWplY3QgKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmVzb2x2ZWRFcnJvciA9IGVycm9yO1xyXG4gICAgICAgICAgICBvbkVycm9yICYmIG9uRXJyb3IoZXJyb3IpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVzb2x1dGlvbihyZXNvbHZlLCByZWplY3QpO1xyXG5cclxuICAgICAgICB2YXIgcmVxID0gPElBc3luY1JlcXVlc3Q8VD4+e1xyXG4gICAgICAgICAgICB0aGVuOiBmdW5jdGlvbiAoc3VjY2VzczogKHJlc3VsdDogVCkgPT4gYW55LCBlcnJvcmVkPzogKGVycm9yOiBhbnkpID0+IGFueSk6IElBc3luY1JlcXVlc3Q8VD4ge1xyXG4gICAgICAgICAgICAgICAgb25TdWNjZXNzID0gc3VjY2VzcztcclxuICAgICAgICAgICAgICAgIG9uRXJyb3IgPSBlcnJvcmVkO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlc29sdmVkUmVzdWx0ICE9PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgb25TdWNjZXNzICYmIG9uU3VjY2VzcyhyZXNvbHZlZFJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChyZXNvbHZlZEVycm9yICE9PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvciAmJiBvbkVycm9yKHJlc29sdmVkRXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIHJlcTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcmVzb2x2ZTxUPihvYmo6IFQpOiBJQXN5bmNSZXF1ZXN0PFQ+IHtcclxuICAgICAgICByZXR1cm4gYXN5bmMuY3JlYXRlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgcmVzb2x2ZShvYmopO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZWplY3Q8VD4oZXJyOiBhbnkpOiBJQXN5bmNSZXF1ZXN0PFQ+IHtcclxuICAgICAgICByZXR1cm4gYXN5bmMuY3JlYXRlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIG1hbnk8VD4oYXJyOiBJQXN5bmNSZXF1ZXN0PFQ+W10pOiBJQXN5bmNSZXF1ZXN0PFRbXT4ge1xyXG4gICAgICAgIGlmICghYXJyIHx8IGFyci5sZW5ndGggPCAxKVxyXG4gICAgICAgICAgICByZXR1cm4gcmVzb2x2ZTxUW10+KFtdKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGNyZWF0ZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIHZhciByZXNvbHZlczogVFtdID0gbmV3IEFycmF5KGFyci5sZW5ndGgpO1xyXG4gICAgICAgICAgICB2YXIgZXJyb3JzOiBhbnlbXSA9IG5ldyBBcnJheShhcnIubGVuZ3RoKTtcclxuICAgICAgICAgICAgdmFyIGZpbmlzaGVkID0gMDtcclxuICAgICAgICAgICAgdmFyIGNvdW50ID0gYXJyLmxlbmd0aDtcclxuICAgICAgICAgICAgdmFyIGFueWVycm9ycyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gY29tcGxldGVTaW5nbGUgKGk6IG51bWJlciwgcmVzOiBULCBlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZXNbaV0gPSByZXM7XHJcbiAgICAgICAgICAgICAgICBlcnJvcnNbaV0gPSBlcnI7XHJcbiAgICAgICAgICAgICAgICBhbnllcnJvcnMgPSBhbnllcnJvcnMgfHwgZXJyICE9PSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICBmaW5pc2hlZCsrO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZpbmlzaGVkID49IGNvdW50KVxyXG4gICAgICAgICAgICAgICAgICAgIGFueWVycm9ycyA/IHJlamVjdChuZXcgQWdncmVnYXRlRXJyb3IoZXJyb3JzKSkgOiByZXNvbHZlKHJlc29sdmVzKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBhcnJbaV0udGhlbihyZXNpID0+IGNvbXBsZXRlU2luZ2xlKGksIHJlc2ksIHVuZGVmaW5lZCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycmkgPT4gY29tcGxldGVTaW5nbGUoaSwgdW5kZWZpbmVkLCBlcnJpKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgdmFyIGNvbnZlcnRlcnM6IGFueSA9IFtdO1xyXG4gICAgY29udmVydGVyc1s8YW55PkJvb2xlYW5dID0gZnVuY3Rpb24gKHZhbDogYW55KTogYm9vbGVhbiB7XHJcbiAgICAgICAgaWYgKHZhbCA9PSBudWxsKVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICBpZiAodHlwZW9mIHZhbCA9PT0gXCJib29sZWFuXCIpXHJcbiAgICAgICAgICAgIHJldHVybiB2YWw7XHJcbiAgICAgICAgdmFyIGMgPSB2YWwudG9TdHJpbmcoKS50b1VwcGVyQ2FzZSgpO1xyXG4gICAgICAgIHJldHVybiBjID09PSBcIlRSVUVcIiA/IHRydWUgOiAoYyA9PT0gXCJGQUxTRVwiID8gZmFsc2UgOiBudWxsKTtcclxuICAgIH07XHJcbiAgICBjb252ZXJ0ZXJzWzxhbnk+U3RyaW5nXSA9IGZ1bmN0aW9uICh2YWw6IGFueSk6IFN0cmluZyB7XHJcbiAgICAgICAgaWYgKHZhbCA9PSBudWxsKSByZXR1cm4gXCJcIjtcclxuICAgICAgICByZXR1cm4gdmFsLnRvU3RyaW5nKCk7XHJcbiAgICB9O1xyXG4gICAgY29udmVydGVyc1s8YW55Pk51bWJlcl0gPSBmdW5jdGlvbiAodmFsOiBhbnkpOiBOdW1iZXIge1xyXG4gICAgICAgIGlmICghdmFsKSByZXR1cm4gMDtcclxuICAgICAgICBpZiAodHlwZW9mIHZhbCA9PT0gXCJudW1iZXJcIilcclxuICAgICAgICAgICAgcmV0dXJuIHZhbDtcclxuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCh2YWwudG9TdHJpbmcoKSk7XHJcbiAgICB9O1xyXG4gICAgY29udmVydGVyc1s8YW55PkRhdGVdID0gZnVuY3Rpb24gKHZhbDogYW55KTogRGF0ZSB7XHJcbiAgICAgICAgaWYgKHZhbCA9PSBudWxsKVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoMCk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBEYXRlKHZhbC50b1N0cmluZygpKTtcclxuICAgIH07XHJcbiAgICBjb252ZXJ0ZXJzWzxhbnk+UmVnRXhwXSA9IGZ1bmN0aW9uICh2YWw6IGFueSk6IFJlZ0V4cCB7XHJcbiAgICAgICAgaWYgKHZhbCBpbnN0YW5jZW9mIFJlZ0V4cClcclxuICAgICAgICAgICAgcmV0dXJuIHZhbDtcclxuICAgICAgICBpZiAodmFsID0gbnVsbClcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IHNwZWNpZnkgYW4gZW1wdHkgUmVnRXhwLlwiKTtcclxuICAgICAgICB2YWwgPSB2YWwudG9TdHJpbmcoKTtcclxuICAgICAgICByZXR1cm4gbmV3IFJlZ0V4cCh2YWwpO1xyXG4gICAgfTtcclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY29udmVydEFueVRvVHlwZSAodmFsOiBhbnksIHR5cGU6IEZ1bmN0aW9uKTogYW55IHtcclxuICAgICAgICB2YXIgY29udmVydGVyOiAodmFsOiBhbnkpID0+IGFueSA9ICg8YW55PmNvbnZlcnRlcnMpWzxhbnk+dHlwZV07XHJcbiAgICAgICAgaWYgKGNvbnZlcnRlcilcclxuICAgICAgICAgICAgcmV0dXJuIGNvbnZlcnRlcih2YWwpO1xyXG4gICAgICAgIGlmICh0eXBlIGluc3RhbmNlb2YgRW51bSkge1xyXG4gICAgICAgICAgICB2YXIgZW51bW8gPSAoPEVudW0+PGFueT50eXBlKS5PYmplY3Q7XHJcbiAgICAgICAgICAgIGlmIChlbnVtby5Db252ZXJ0ZXIpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZW51bW8uQ29udmVydGVyKHZhbCk7XHJcbiAgICAgICAgICAgIHZhbCA9IHZhbCB8fCAwO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbCA9PT0gXCJzdHJpbmdcIilcclxuICAgICAgICAgICAgICAgIHJldHVybiBlbnVtb1t2YWxdO1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdmFsO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0U3RyaW5nVG9FbnVtPFQ+ICh2YWw6IHN0cmluZywgZW46IGFueSk6IFQge1xyXG4gICAgICAgIGlmICghdmFsKVxyXG4gICAgICAgICAgICByZXR1cm4gPFQ+PGFueT4wO1xyXG4gICAgICAgIHJldHVybiA8VD5lblt2YWxdO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZWdpc3RlclR5cGVDb252ZXJ0ZXIgKHR5cGU6IEZ1bmN0aW9uLCBjb252ZXJ0ZXI6ICh2YWw6IGFueSkgPT4gYW55KSB7XHJcbiAgICAgICAgY29udmVydGVyc1s8YW55PnR5cGVdID0gY29udmVydGVyO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckVudW1Db252ZXJ0ZXIgKGU6IGFueSwgY29udmVydGVyOiAodmFsOiBhbnkpID0+IGFueSkge1xyXG4gICAgICAgIGUuQ29udmVydGVyID0gY29udmVydGVyO1xyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgY2xhc3MgRGlyUmVzb2x2ZXIgaW1wbGVtZW50cyBJVHlwZVJlc29sdmVyIHtcclxuICAgICAgICBsb2FkQXN5bmMgKG1vZHVsZU5hbWU6IHN0cmluZywgbmFtZTogc3RyaW5nKTogYXN5bmMuSUFzeW5jUmVxdWVzdDxhbnk+IHtcclxuICAgICAgICAgICAgdmFyIHJlcVVyaSA9IG1vZHVsZU5hbWUgKyAnLycgKyBuYW1lO1xyXG4gICAgICAgICAgICByZXR1cm4gYXN5bmMuY3JlYXRlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgICAgICg8RnVuY3Rpb24+cmVxdWlyZSkoW3JlcVVyaV0sIChyb290TW9kdWxlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyb290TW9kdWxlKTtcclxuICAgICAgICAgICAgICAgIH0sIChlcnIpID0+IHJlamVjdChuZXcgRGlyTG9hZEVycm9yKHJlcVVyaSwgZXJyKSkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlc29sdmVUeXBlIChtb2R1bGVOYW1lOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgLyogb3V0ICovb3Jlc29sdmU6IElPdXRUeXBlKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIG9yZXNvbHZlLmlzUHJpbWl0aXZlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIG9yZXNvbHZlLnR5cGUgPSByZXF1aXJlKG1vZHVsZU5hbWUgKyAnLycgKyBuYW1lKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9yZXNvbHZlLnR5cGUgIT09IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBjbGFzcyBFbnVtIHtcclxuICAgICAgICBjb25zdHJ1Y3RvciAocHVibGljIE9iamVjdDogYW55KSB7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzdGF0aWMgZnJvbUFueTxUPihlbnVUeXBlOiBhbnksIHZhbDogYW55LCBmYWxsYmFjaz86IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsID09PSBcIm51bWJlclwiKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbDtcclxuICAgICAgICAgICAgaWYgKCF2YWwpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gKGZhbGxiYWNrIHx8IDApO1xyXG4gICAgICAgICAgICB2YXIgb2JqID0gZW51VHlwZVt2YWwudG9TdHJpbmcoKV07XHJcbiAgICAgICAgICAgIHJldHVybiAob2JqID09IG51bGwpID8gKGZhbGxiYWNrIHx8IDApIDogb2JqO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgLy9UT0RPOiBDaGVjayBpbnN0YW5jZXMgaW4gRmF5ZGUgLkVxdWFsc1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGVxdWFscyAodmFsMTogYW55LCB2YWwyOiBhbnkpOiBib29sZWFuIHtcclxuICAgICAgICBpZiAodmFsMSA9PSBudWxsICYmIHZhbDIgPT0gbnVsbClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgaWYgKHZhbDEgPT0gbnVsbCB8fCB2YWwyID09IG51bGwpXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICBpZiAodmFsMSA9PT0gdmFsMilcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgcmV0dXJuICEhdmFsMS5lcXVhbHMgJiYgdmFsMS5lcXVhbHModmFsMik7XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUV2ZW50QXJncyB7XHJcbiAgICB9XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElFdmVudENhbGxiYWNrPFQgZXh0ZW5kcyBJRXZlbnRBcmdzPiB7XHJcbiAgICAgICAgKHNlbmRlcjogYW55LCBhcmdzOiBUKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRXZlbnQ8VCBleHRlbmRzIElFdmVudEFyZ3M+IHtcclxuICAgICAgICBwcml2YXRlICQkY2FsbGJhY2tzOiBJRXZlbnRDYWxsYmFjazxUPltdID0gW107XHJcbiAgICAgICAgcHJpdmF0ZSAkJHNjb3BlczogYW55W10gPSBbXTtcclxuXHJcbiAgICAgICAgZ2V0IGhhcyAoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLiQkY2FsbGJhY2tzLmxlbmd0aCA+IDA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBvbiAoY2FsbGJhY2s6IElFdmVudENhbGxiYWNrPFQ+LCBzY29wZTogYW55KSB7XHJcbiAgICAgICAgICAgIHRoaXMuJCRjYWxsYmFja3MucHVzaChjYWxsYmFjayk7XHJcbiAgICAgICAgICAgIHRoaXMuJCRzY29wZXMucHVzaChzY29wZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBvZmYgKGNhbGxiYWNrOiBJRXZlbnRDYWxsYmFjazxUPiwgc2NvcGU6IGFueSkge1xyXG4gICAgICAgICAgICB2YXIgY2JzID0gdGhpcy4kJGNhbGxiYWNrcztcclxuICAgICAgICAgICAgdmFyIHNjb3BlcyA9IHRoaXMuJCRzY29wZXM7XHJcbiAgICAgICAgICAgIHZhciBzZWFyY2ggPSBjYnMubGVuZ3RoIC0gMTtcclxuICAgICAgICAgICAgd2hpbGUgKHNlYXJjaCA+IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBzZWFyY2ggPSBjYnMubGFzdEluZGV4T2YoY2FsbGJhY2ssIHNlYXJjaCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2NvcGVzW3NlYXJjaF0gPT09IHNjb3BlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2JzLnNwbGljZShzZWFyY2gsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3Blcy5zcGxpY2Uoc2VhcmNoLCAxKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHNlYXJjaC0tO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByYWlzZSAoc2VuZGVyOiBhbnksIGFyZ3M6IFQpIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGNicyA9IHRoaXMuJCRjYWxsYmFja3Muc2xpY2UoMCksIHNjb3BlcyA9IHRoaXMuJCRzY29wZXMuc2xpY2UoMCksIGxlbiA9IGNicy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgY2JzW2ldLmNhbGwoc2NvcGVzW2ldLCBzZW5kZXIsIGFyZ3MpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByYWlzZUFzeW5jIChzZW5kZXI6IGFueSwgYXJnczogVCkge1xyXG4gICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB0aGlzLnJhaXNlKHNlbmRlciwgYXJncyksIDEpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJSW50ZXJmYWNlRGVjbGFyYXRpb248VD4ge1xyXG4gICAgICAgIG5hbWU6IHN0cmluZztcclxuICAgICAgICBpcyhvOiBhbnkpOiBib29sZWFuO1xyXG4gICAgICAgIGFzKG86IGFueSk6IFQ7XHJcbiAgICAgICAgbWFyayh0eXBlOiBhbnkpOiBJSW50ZXJmYWNlRGVjbGFyYXRpb248VD47XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgSW50ZXJmYWNlPFQ+IGltcGxlbWVudHMgSUludGVyZmFjZURlY2xhcmF0aW9uPFQ+IHtcclxuICAgICAgICBuYW1lOiBzdHJpbmc7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yIChuYW1lOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwibmFtZVwiLCB7dmFsdWU6IG5hbWUsIHdyaXRhYmxlOiBmYWxzZX0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaXMgKG86IGFueSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAoIW8pXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIHZhciB0eXBlID0gby5jb25zdHJ1Y3RvcjtcclxuICAgICAgICAgICAgd2hpbGUgKHR5cGUpIHtcclxuICAgICAgICAgICAgICAgIHZhciBpczogSUludGVyZmFjZURlY2xhcmF0aW9uPGFueT5bXSA9IHR5cGUuJCRpbnRlcmZhY2VzO1xyXG4gICAgICAgICAgICAgICAgaWYgKGlzICYmIGlzLmluZGV4T2YodGhpcykgPiAtMSlcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHR5cGUgPSBnZXRUeXBlUGFyZW50KHR5cGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzIChvOiBhbnkpOiBUIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmlzKG8pKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgcmV0dXJuIDxUPm87XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtYXJrICh0eXBlOiBhbnkpOiBJbnRlcmZhY2U8VD4ge1xyXG4gICAgICAgICAgICBhZGRUeXBlSW50ZXJmYWNlcyh0eXBlLCB0aGlzKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkludGVyZmFjZVwiIC8+XHJcblxyXG5tb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUNvbGxlY3Rpb248VD4gZXh0ZW5kcyBJRW51bWVyYWJsZTxUPiB7XHJcbiAgICAgICAgQ291bnQ6IG51bWJlcjtcclxuICAgICAgICBHZXRWYWx1ZUF0KGluZGV4OiBudW1iZXIpOiBUO1xyXG4gICAgICAgIFNldFZhbHVlQXQoaW5kZXg6IG51bWJlciwgdmFsdWU6IFQpO1xyXG4gICAgICAgIEluc2VydChpbmRleDogbnVtYmVyLCB2YWx1ZTogVCk7XHJcbiAgICAgICAgQWRkKHZhbHVlOiBUKTtcclxuICAgICAgICBSZW1vdmUodmFsdWU6IFQpOiBib29sZWFuO1xyXG4gICAgICAgIFJlbW92ZUF0KGluZGV4OiBudW1iZXIpO1xyXG4gICAgICAgIENsZWFyKCk7XHJcbiAgICB9XHJcbiAgICBleHBvcnQgdmFyIElDb2xsZWN0aW9uXyA9IG5ldyBJbnRlcmZhY2U8SUNvbGxlY3Rpb248YW55Pj4oXCJJQ29sbGVjdGlvblwiKTtcclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJRW51bWVyYWJsZTxUPiB7XHJcbiAgICAgICAgZ2V0RW51bWVyYXRvcihpc1JldmVyc2U/OiBib29sZWFuKTogSUVudW1lcmF0b3I8VD47XHJcbiAgICB9XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElFbnVtZXJhYmxlRGVjbGFyYXRpb248VD4gZXh0ZW5kcyBJSW50ZXJmYWNlRGVjbGFyYXRpb248VD4ge1xyXG4gICAgICAgIGVtcHR5OiBJRW51bWVyYWJsZTxUPjtcclxuICAgICAgICBmcm9tQXJyYXkoYXJyOiBUW10pOiBJRW51bWVyYWJsZTxUPjtcclxuICAgICAgICB0b0FycmF5KGVuOiBJRW51bWVyYWJsZTxUPik6IFRbXTtcclxuICAgIH1cclxuICAgIGV4cG9ydCB2YXIgSUVudW1lcmFibGVfID0gPElFbnVtZXJhYmxlRGVjbGFyYXRpb248YW55Pj5uZXcgSW50ZXJmYWNlKFwiSUVudW1lcmFibGVcIik7XHJcbiAgICBJRW51bWVyYWJsZV8uaXMgPSAobzogYW55KTogYm9vbGVhbiA9PiB7XHJcbiAgICAgICAgcmV0dXJuIG8gJiYgby5nZXRFbnVtZXJhdG9yICYmIHR5cGVvZiBvLmdldEVudW1lcmF0b3IgPT09IFwiZnVuY3Rpb25cIjtcclxuICAgIH07XHJcblxyXG4gICAgSUVudW1lcmFibGVfLmVtcHR5ID0ge1xyXG4gICAgICAgIGdldEVudW1lcmF0b3I6IGZ1bmN0aW9uPFQ+KGlzUmV2ZXJzZT86IGJvb2xlYW4pOiBJRW51bWVyYXRvcjxUPiB7XHJcbiAgICAgICAgICAgIHJldHVybiBJRW51bWVyYXRvcl8uZW1wdHk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBJRW51bWVyYWJsZV8uZnJvbUFycmF5ID0gZnVuY3Rpb248VD4oYXJyOiBUW10pOiBJRW51bWVyYWJsZTxUPiB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgJCRhcnI6IGFycixcclxuICAgICAgICAgICAgZ2V0RW51bWVyYXRvciAoaXNSZXZlcnNlPzogYm9vbGVhbik6IElFbnVtZXJhdG9yPFQ+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBJRW51bWVyYXRvcl8uZnJvbUFycmF5KHRoaXMuJCRhcnIsIGlzUmV2ZXJzZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfTtcclxuXHJcbiAgICBJRW51bWVyYWJsZV8udG9BcnJheSA9IGZ1bmN0aW9uPFQ+KGVuOiBJRW51bWVyYWJsZTxUPik6IFRbXSB7XHJcbiAgICAgICAgdmFyIGE6IFRbXSA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIGUgPSBlbi5nZXRFbnVtZXJhdG9yKCk7IGUubW92ZU5leHQoKTspIHtcclxuICAgICAgICAgICAgYS5wdXNoKGUuY3VycmVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBhO1xyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElFbnVtZXJhdG9yPFQ+IHtcclxuICAgICAgICBjdXJyZW50OiBUO1xyXG4gICAgICAgIG1vdmVOZXh0KCk6IGJvb2xlYW47XHJcbiAgICB9XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElFbnVtZXJhdG9yRGVjbGFyYXRpb248VD4gZXh0ZW5kcyBJSW50ZXJmYWNlRGVjbGFyYXRpb248VD4ge1xyXG4gICAgICAgIGVtcHR5OiBJRW51bWVyYXRvcjxUPjtcclxuICAgICAgICBmcm9tQXJyYXkoYXJyOiBUW10sIGlzUmV2ZXJzZT86IGJvb2xlYW4pOklFbnVtZXJhdG9yPFQ+O1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IHZhciBJRW51bWVyYXRvcl8gPSA8SUVudW1lcmF0b3JEZWNsYXJhdGlvbjxhbnk+Pm5ldyBJbnRlcmZhY2UoXCJJRW51bWVyYXRvclwiKTtcclxuXHJcbiAgICBJRW51bWVyYXRvcl8uZW1wdHkgPSB7XHJcbiAgICAgICAgY3VycmVudDogdW5kZWZpbmVkLFxyXG4gICAgICAgIG1vdmVOZXh0ICgpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgSUVudW1lcmF0b3JfLmZyb21BcnJheSA9IGZ1bmN0aW9uPFQ+IChhcnI6IFRbXSwgaXNSZXZlcnNlPzogYm9vbGVhbik6IElFbnVtZXJhdG9yPFQ+IHtcclxuICAgICAgICB2YXIgbGVuID0gYXJyLmxlbmd0aDtcclxuICAgICAgICB2YXIgZSA9IDxJRW51bWVyYXRvcjxUPj57bW92ZU5leHQ6IHVuZGVmaW5lZCwgY3VycmVudDogdW5kZWZpbmVkfTtcclxuICAgICAgICB2YXIgaW5kZXg7XHJcbiAgICAgICAgaWYgKGlzUmV2ZXJzZSkge1xyXG4gICAgICAgICAgICBpbmRleCA9IGxlbjtcclxuICAgICAgICAgICAgZS5tb3ZlTmV4dCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGluZGV4LS07XHJcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5jdXJyZW50ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGUuY3VycmVudCA9IGFycltpbmRleF07XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpbmRleCA9IC0xO1xyXG4gICAgICAgICAgICBlLm1vdmVOZXh0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaW5kZXgrKztcclxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW4pIHtcclxuICAgICAgICAgICAgICAgICAgICBlLmN1cnJlbnQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZS5jdXJyZW50ID0gYXJyW2luZGV4XTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZTtcclxuICAgIH07XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUluZGV4ZWRQcm9wZXJ0eUluZm8ge1xyXG4gICAgICAgIGdldFZhbHVlKG9iajogYW55LCBpbmRleDogbnVtYmVyKTogYW55O1xyXG4gICAgICAgIHNldFZhbHVlKG9iajogYW55LCBpbmRleDogbnVtYmVyLCB2YWx1ZTogYW55KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgSW5kZXhlZFByb3BlcnR5SW5mbyBpbXBsZW1lbnRzIElJbmRleGVkUHJvcGVydHlJbmZvIHtcclxuICAgICAgICBHZXRGdW5jOiAoaW5kZXg6IG51bWJlcikgPT4gYW55O1xyXG4gICAgICAgIFNldEZ1bmM6IChpbmRleDogbnVtYmVyLCB2YWx1ZTogYW55KSA9PiBhbnk7XHJcblxyXG4gICAgICAgIGdldCBwcm9wZXJ0eVR5cGUgKCk6IEZ1bmN0aW9uIHtcclxuICAgICAgICAgICAgLy9Ob3RJbXBsZW1lbnRlZFxyXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0VmFsdWUgKHJvOiBhbnksIGluZGV4OiBudW1iZXIpOiBhbnkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5HZXRGdW5jKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuR2V0RnVuYy5jYWxsKHJvLCBpbmRleCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRWYWx1ZSAocm86IGFueSwgaW5kZXg6IG51bWJlciwgdmFsdWU6IGFueSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5TZXRGdW5jKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5TZXRGdW5jLmNhbGwocm8sIGluZGV4LCB2YWx1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzdGF0aWMgZmluZCAodHlwZU9yT2JqKTogSW5kZXhlZFByb3BlcnR5SW5mbyB7XHJcbiAgICAgICAgICAgIHZhciBvID0gdHlwZU9yT2JqO1xyXG4gICAgICAgICAgICB2YXIgaXNUeXBlID0gdHlwZU9yT2JqIGluc3RhbmNlb2YgRnVuY3Rpb247XHJcbiAgICAgICAgICAgIGlmIChpc1R5cGUpXHJcbiAgICAgICAgICAgICAgICBvID0gbmV3IHR5cGVPck9iaigpO1xyXG5cclxuICAgICAgICAgICAgaWYgKG8gaW5zdGFuY2VvZiBBcnJheSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHBpID0gbmV3IEluZGV4ZWRQcm9wZXJ0eUluZm8oKTtcclxuICAgICAgICAgICAgICAgIHBpLkdldEZ1bmMgPSBmdW5jdGlvbiAoaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1tpbmRleF07XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgcGkuU2V0RnVuYyA9IGZ1bmN0aW9uIChpbmRleCwgdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzW2luZGV4XSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwaTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgY29sbCA9IElDb2xsZWN0aW9uXy5hcyhvKTtcclxuICAgICAgICAgICAgaWYgKGNvbGwpIHtcclxuICAgICAgICAgICAgICAgIHZhciBwaSA9IG5ldyBJbmRleGVkUHJvcGVydHlJbmZvKCk7XHJcbiAgICAgICAgICAgICAgICBwaS5HZXRGdW5jID0gZnVuY3Rpb24gKGluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuR2V0VmFsdWVBdChpbmRleCk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgcGkuU2V0RnVuYyA9IGZ1bmN0aW9uIChpbmRleCwgdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5TZXRWYWx1ZUF0KGluZGV4LCB2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElMaWJyYXJ5IHtcclxuICAgICAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICAgICAgdXJpOiBVcmk7XHJcbiAgICAgICAgc291cmNlUGF0aDogc3RyaW5nO1xyXG4gICAgICAgIHVzZU1pbjogYm9vbGVhbjtcclxuICAgICAgICBleHBvcnRzOiBzdHJpbmc7XHJcbiAgICAgICAgZGVwczogc3RyaW5nW107XHJcbiAgICAgICAgcm9vdE1vZHVsZTogYW55O1xyXG4gICAgICAgIGxvYWRBc3luYyAoKTogYXN5bmMuSUFzeW5jUmVxdWVzdDxMaWJyYXJ5PjtcclxuICAgICAgICByZXNvbHZlVHlwZSAobW9kdWxlTmFtZTogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIC8qIG91dCAqL29yZXNvbHZlOiBJT3V0VHlwZSk6IGJvb2xlYW47XHJcblxyXG4gICAgICAgIGFkZCAodHlwZTogYW55LCBuYW1lPzogc3RyaW5nKTogSUxpYnJhcnk7XHJcbiAgICAgICAgYWRkUHJpbWl0aXZlICh0eXBlOiBhbnksIG5hbWU/OiBzdHJpbmcpOiBJTGlicmFyeTtcclxuICAgICAgICBhZGRFbnVtIChlbnU6IGFueSwgbmFtZTogc3RyaW5nKTogSUxpYnJhcnk7XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgTGlicmFyeSBpbXBsZW1lbnRzIElMaWJyYXJ5IHtcclxuICAgICAgICBwcml2YXRlICQkbW9kdWxlOiBhbnkgPSBudWxsO1xyXG4gICAgICAgIHByaXZhdGUgJCRzb3VyY2VQYXRoOiBzdHJpbmcgPSBudWxsO1xyXG5cclxuICAgICAgICBwcml2YXRlICQkcHJpbXR5cGVzOiBhbnkgPSB7fTtcclxuICAgICAgICBwcml2YXRlICQkdHlwZXM6IGFueSA9IHt9O1xyXG5cclxuICAgICAgICBwcml2YXRlICQkbG9hZGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgIG5hbWU6IHN0cmluZztcclxuICAgICAgICB1cmk6IFVyaTtcclxuICAgICAgICBleHBvcnRzOiBzdHJpbmc7XHJcbiAgICAgICAgZGVwczogc3RyaW5nW107XHJcbiAgICAgICAgdXNlTWluOiBib29sZWFuO1xyXG5cclxuICAgICAgICBnZXQgc291cmNlUGF0aCAoKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgdmFyIGJhc2UgPSB0aGlzLiQkc291cmNlUGF0aCB8fCAnbGliLycgKyB0aGlzLm5hbWUgKyAnL2Rpc3QvJyArIHRoaXMubmFtZTtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLnVzZU1pbilcclxuICAgICAgICAgICAgICAgIHJldHVybiBiYXNlO1xyXG4gICAgICAgICAgICByZXR1cm4gYmFzZSArIFwiLm1pblwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0IHNvdXJjZVBhdGggKHZhbHVlOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgaWYgKHZhbHVlLnN1YnN0cih2YWx1ZS5sZW5ndGggLSAzKSA9PT0gJy5qcycpXHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnN1YnN0cigwLCB2YWx1ZS5sZW5ndGggLSAzKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMudXNlTWluICYmIHZhbHVlLnN1YnN0cih2YWx1ZS5sZW5ndGggLSA0KSA9PT0gXCIubWluXCIpXHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnN1YnN0cigwLCB2YWx1ZS5sZW5ndGggLSA0KTtcclxuICAgICAgICAgICAgdGhpcy4kJHNvdXJjZVBhdGggPSB2YWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yIChuYW1lOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwibmFtZVwiLCB7dmFsdWU6IG5hbWUsIHdyaXRhYmxlOiBmYWxzZX0pO1xyXG4gICAgICAgICAgICB2YXIgdXJpID0gbmFtZTtcclxuICAgICAgICAgICAgaWYgKG5hbWUuaW5kZXhPZihcImh0dHA6Ly9cIikgIT09IDApXHJcbiAgICAgICAgICAgICAgICB1cmkgPSBcImxpYjovL1wiICsgbmFtZTtcclxuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwidXJpXCIsIHt2YWx1ZTogbmV3IFVyaSh1cmkpLCB3cml0YWJsZTogZmFsc2V9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldCByb290TW9kdWxlICgpOiBhbnkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy4kJG1vZHVsZSA9IHRoaXMuJCRtb2R1bGUgfHwgcmVxdWlyZSh0aGlzLnNvdXJjZVBhdGgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZEFzeW5jICgpOiBhc3luYy5JQXN5bmNSZXF1ZXN0PExpYnJhcnk+IHtcclxuICAgICAgICAgICAgLy9OT1RFOiBJZiB1c2luZyBodHRwIGxpYnJhcnkgc2NoZW1lIGFuZCBhIGN1c3RvbSBzb3VyY2UgcGF0aCB3YXMgbm90IHNldCwgd2UgYXNzdW1lIHRoZSBsaWJyYXJ5IGlzIHByZWxvYWRlZFxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuJCRzb3VyY2VQYXRoICYmIHRoaXMudXJpLnNjaGVtZSA9PT0gXCJodHRwXCIpXHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkbG9hZGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJCRsb2FkZWQpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXN5bmMucmVzb2x2ZSh0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy4kY29uZmlnTW9kdWxlKCk7XHJcbiAgICAgICAgICAgIHJldHVybiBhc3luYy5jcmVhdGUoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgKDxGdW5jdGlvbj5yZXF1aXJlKShbdGhpcy5uYW1lXSwgKHJvb3RNb2R1bGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQkbW9kdWxlID0gcm9vdE1vZHVsZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQkbG9hZGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgfSwgKGVycikgPT4gcmVqZWN0KG5ldyBMaWJyYXJ5TG9hZEVycm9yKHRoaXMsIGVycikpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICRjb25maWdNb2R1bGUgKCkge1xyXG4gICAgICAgICAgICB2YXIgY28gPSA8UmVxdWlyZUNvbmZpZz57XHJcbiAgICAgICAgICAgICAgICBwYXRoczoge30sXHJcbiAgICAgICAgICAgICAgICBzaGltOiB7fSxcclxuICAgICAgICAgICAgICAgIG1hcDoge1xyXG4gICAgICAgICAgICAgICAgICAgIFwiKlwiOiB7fVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB2YXIgc3JjUGF0aCA9IHRoaXMuc291cmNlUGF0aDtcclxuICAgICAgICAgICAgY28ucGF0aHNbdGhpcy5uYW1lXSA9IHNyY1BhdGg7XHJcbiAgICAgICAgICAgIGNvLnNoaW1bdGhpcy5uYW1lXSA9IHtcclxuICAgICAgICAgICAgICAgIGV4cG9ydHM6IHRoaXMuZXhwb3J0cyxcclxuICAgICAgICAgICAgICAgIGRlcHM6IHRoaXMuZGVwc1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBjby5tYXBbJyonXVtzcmNQYXRoXSA9IHRoaXMubmFtZTtcclxuICAgICAgICAgICAgcmVxdWlyZS5jb25maWcoY28pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVzb2x2ZVR5cGUgKG1vZHVsZU5hbWU6IHN0cmluZywgbmFtZTogc3RyaW5nLCAvKiBvdXQgKi9vcmVzb2x2ZTogSU91dFR5cGUpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgaWYgKCFtb2R1bGVOYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAvL0xpYnJhcnkgVVJJOiBodHRwOi8vLi4uL1xyXG4gICAgICAgICAgICAgICAgb3Jlc29sdmUuaXNQcmltaXRpdmUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKChvcmVzb2x2ZS50eXBlID0gdGhpcy4kJHByaW10eXBlc1tuYW1lXSkgIT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIG9yZXNvbHZlLmlzUHJpbWl0aXZlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gKG9yZXNvbHZlLnR5cGUgPSB0aGlzLiQkdHlwZXNbbmFtZV0pICE9PSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vTGlicmFyeSBVUkk6IGxpYjovLy4uLi9cclxuICAgICAgICAgICAgdmFyIGN1ck1vZHVsZSA9IHRoaXMucm9vdE1vZHVsZTtcclxuICAgICAgICAgICAgb3Jlc29sdmUuaXNQcmltaXRpdmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgb3Jlc29sdmUudHlwZSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgaWYgKG1vZHVsZU5hbWUgIT09IFwiL1wiKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgdG9rZW5zID0gbW9kdWxlTmFtZS5zdWJzdHIoMSkuc3BsaXQoJy4nKTsgaSA8IHRva2Vucy5sZW5ndGggJiYgISFjdXJNb2R1bGU7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGN1ck1vZHVsZSA9IGN1ck1vZHVsZVt0b2tlbnNbaV1dO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghY3VyTW9kdWxlKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBvcmVzb2x2ZS50eXBlID0gY3VyTW9kdWxlW25hbWVdO1xyXG4gICAgICAgICAgICB2YXIgdHlwZSA9IG9yZXNvbHZlLnR5cGU7XHJcbiAgICAgICAgICAgIGlmICh0eXBlID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIHNldFR5cGVVcmkodHlwZSwgdGhpcy51cmkpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFkZCAodHlwZTogYW55LCBuYW1lPzogc3RyaW5nKTogSUxpYnJhcnkge1xyXG4gICAgICAgICAgICBpZiAoIXR5cGUpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBIHR5cGUgbXVzdCBiZSBzcGVjaWZpZWQgd2hlbiByZWdpc3RlcmluZyAnXCIgKyBuYW1lICsgXCInYC5cIik7XHJcbiAgICAgICAgICAgIG5hbWUgPSBuYW1lIHx8IGdldFR5cGVOYW1lKHR5cGUpO1xyXG4gICAgICAgICAgICBpZiAoIW5hbWUpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyB0eXBlIG5hbWUgZm91bmQuXCIpO1xyXG4gICAgICAgICAgICBzZXRUeXBlVXJpKHR5cGUsIHRoaXMudXJpKTtcclxuICAgICAgICAgICAgdGhpcy4kJHR5cGVzW25hbWVdID0gdHlwZTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhZGRQcmltaXRpdmUgKHR5cGU6IGFueSwgbmFtZT86IHN0cmluZyk6IElMaWJyYXJ5IHtcclxuICAgICAgICAgICAgaWYgKCF0eXBlKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQSB0eXBlIG11c3QgYmUgc3BlY2lmaWVkIHdoZW4gcmVnaXN0ZXJpbmcgJ1wiICsgbmFtZSArIFwiJ2AuXCIpO1xyXG4gICAgICAgICAgICBuYW1lID0gbmFtZSB8fCBnZXRUeXBlTmFtZSh0eXBlKTtcclxuICAgICAgICAgICAgaWYgKCFuYW1lKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gdHlwZSBuYW1lIGZvdW5kLlwiKTtcclxuICAgICAgICAgICAgc2V0VHlwZVVyaSh0eXBlLCB0aGlzLnVyaSk7XHJcbiAgICAgICAgICAgIHRoaXMuJCRwcmltdHlwZXNbbmFtZV0gPSB0eXBlO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFkZEVudW0gKGVudTogYW55LCBuYW1lOiBzdHJpbmcpOiBJTGlicmFyeSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkUHJpbWl0aXZlKGVudSwgbmFtZSk7XHJcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlbnUsIFwiJCRlbnVtXCIsIHt2YWx1ZTogdHJ1ZSwgd3JpdGFibGU6IGZhbHNlfSk7XHJcbiAgICAgICAgICAgIGVudS5uYW1lID0gbmFtZTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNldFR5cGVVcmkgKHR5cGU6IGFueSwgdXJpOiBVcmkpIHtcclxuICAgICAgICBpZiAodHlwZS4kJHVyaSlcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0eXBlLCBcIiQkdXJpXCIsIHt2YWx1ZTogdXJpLnRvU3RyaW5nKCksIGVudW1lcmFibGU6IGZhbHNlfSk7XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGludGVyZmFjZSBJTGlicmFyeUhhc2gge1xyXG4gICAgICAgIFtpZDpzdHJpbmddOiBJTGlicmFyeTtcclxuICAgIH1cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUxpYnJhcnlSZXNvbHZlciBleHRlbmRzIElUeXBlUmVzb2x2ZXIge1xyXG4gICAgICAgIGxpYnJhcnlDcmVhdGVkOiBFdmVudDxJRXZlbnRBcmdzPjtcclxuICAgICAgICBsb2FkVHlwZUFzeW5jKHVyaTogc3RyaW5nLCBuYW1lOiBzdHJpbmcpOiBhc3luYy5JQXN5bmNSZXF1ZXN0PGFueT47XHJcbiAgICAgICAgcmVzb2x2ZSh1cmk6IHN0cmluZyk6IElMaWJyYXJ5O1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUxpYnJhcnlDcmVhdGVkRXZlbnRBcmdzIGV4dGVuZHMgSUV2ZW50QXJncyB7XHJcbiAgICAgICAgbGlicmFyeTogSUxpYnJhcnk7XHJcbiAgICB9XHJcblxyXG4gICAgLy9OT1RFOlxyXG4gICAgLy8gIExpYnJhcnkgVXJpIHN5bnRheFxyXG4gICAgLy8gICAgICBodHRwOi8vLi4uXHJcbiAgICAvLyAgICAgIGxpYjovLzxsaWJyYXJ5PlsvPG5hbWVzcGFjZT5dXHJcbiAgICAvLyAgICAgIDxkaXI+XHJcbiAgICBleHBvcnQgY2xhc3MgTGlicmFyeVJlc29sdmVyIGltcGxlbWVudHMgSUxpYnJhcnlSZXNvbHZlciB7XHJcbiAgICAgICAgcHJpdmF0ZSAkJGxpYnM6IElMaWJyYXJ5SGFzaCA9IHt9O1xyXG5cclxuICAgICAgICBsaWJyYXJ5Q3JlYXRlZCA9IG5ldyBFdmVudCgpO1xyXG5cclxuICAgICAgICBkaXJSZXNvbHZlciA9IG5ldyBEaXJSZXNvbHZlcigpO1xyXG5cclxuICAgICAgICBjcmVhdGVMaWJyYXJ5ICh1cmk6IHN0cmluZyk6IElMaWJyYXJ5IHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBMaWJyYXJ5KHVyaSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsb2FkVHlwZUFzeW5jICh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nKTogYXN5bmMuSUFzeW5jUmVxdWVzdDxhbnk+IHtcclxuICAgICAgICAgICAgdmFyIGxpYiA9IHRoaXMucmVzb2x2ZSh1cmkpO1xyXG4gICAgICAgICAgICBpZiAoIWxpYilcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRpclJlc29sdmVyLmxvYWRBc3luYyh1cmksIG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gYXN5bmMuY3JlYXRlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgICAgIGxpYi5sb2FkQXN5bmMoKVxyXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKChsaWIpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9yZXNvbHZlID0ge2lzUHJpbWl0aXZlOiBmYWxzZSwgdHlwZTogdW5kZWZpbmVkfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxpYi5yZXNvbHZlVHlwZShudWxsLCBuYW1lLCBvcmVzb2x2ZSkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG9yZXNvbHZlLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIHJlamVjdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVzb2x2ZSAodXJpOiBzdHJpbmcpOiBJTGlicmFyeSB7XHJcbiAgICAgICAgICAgIHZhciBsaWJVcmkgPSBuZXcgVXJpKHVyaSk7XHJcbiAgICAgICAgICAgIHZhciBzY2hlbWUgPSBsaWJVcmkuc2NoZW1lO1xyXG4gICAgICAgICAgICBpZiAoIXNjaGVtZSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICAgICAgdmFyIGxpYk5hbWUgPSAoc2NoZW1lID09PSBcImxpYlwiKSA/IGxpYlVyaS5ob3N0IDogdXJpO1xyXG4gICAgICAgICAgICB2YXIgbGliID0gdGhpcy4kJGxpYnNbbGliTmFtZV07XHJcbiAgICAgICAgICAgIGlmICghbGliKSB7XHJcbiAgICAgICAgICAgICAgICBsaWIgPSB0aGlzLiQkbGlic1tsaWJOYW1lXSA9IHRoaXMuY3JlYXRlTGlicmFyeShsaWJOYW1lKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRvbkxpYnJhcnlDcmVhdGVkKGxpYik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGxpYjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlc29sdmVUeXBlICh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nLCAvKiBvdXQgKi9vcmVzb2x2ZTogSU91dFR5cGUpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgdmFyIGxpYlVyaSA9IG5ldyBVcmkodXJpKTtcclxuICAgICAgICAgICAgdmFyIHNjaGVtZSA9IGxpYlVyaS5zY2hlbWU7XHJcbiAgICAgICAgICAgIGlmICghc2NoZW1lKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGlyUmVzb2x2ZXIucmVzb2x2ZVR5cGUodXJpLCBuYW1lLCBvcmVzb2x2ZSk7XHJcblxyXG4gICAgICAgICAgICB2YXIgbGliTmFtZSA9IChzY2hlbWUgPT09IFwibGliXCIpID8gbGliVXJpLmhvc3QgOiB1cmk7XHJcbiAgICAgICAgICAgIHZhciBtb2ROYW1lID0gKHNjaGVtZSA9PT0gXCJsaWJcIikgPyBsaWJVcmkuYWJzb2x1dGVQYXRoIDogXCJcIjtcclxuICAgICAgICAgICAgdmFyIGxpYiA9IHRoaXMuJCRsaWJzW2xpYk5hbWVdO1xyXG4gICAgICAgICAgICBpZiAoIWxpYikge1xyXG4gICAgICAgICAgICAgICAgbGliID0gdGhpcy4kJGxpYnNbbGliTmFtZV0gPSB0aGlzLmNyZWF0ZUxpYnJhcnkobGliTmFtZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkb25MaWJyYXJ5Q3JlYXRlZChsaWIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBsaWIucmVzb2x2ZVR5cGUobW9kTmFtZSwgbmFtZSwgb3Jlc29sdmUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uTGlicmFyeUNyZWF0ZWQgKGxpYjogSUxpYnJhcnkpIHtcclxuICAgICAgICAgICAgdGhpcy5saWJyYXJ5Q3JlYXRlZC5yYWlzZSh0aGlzLCBPYmplY3QuZnJlZXplKHtsaWJyYXJ5OiBsaWJ9KSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgY2xhc3MgTWVtb2l6ZXI8VD4ge1xyXG4gICAgICAgIHByaXZhdGUgJCRjcmVhdG9yOiAoa2V5OiBzdHJpbmcpID0+IFQ7XHJcbiAgICAgICAgcHJpdmF0ZSAkJGNhY2hlOiBhbnkgPSB7fTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IgKGNyZWF0b3I6IChrZXk6IHN0cmluZykgPT4gVCkge1xyXG4gICAgICAgICAgICB0aGlzLiQkY3JlYXRvciA9IGNyZWF0b3I7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtZW1vaXplIChrZXk6IHN0cmluZyk6IFQge1xyXG4gICAgICAgICAgICB2YXIgb2JqID0gdGhpcy4kJGNhY2hlW2tleV07XHJcbiAgICAgICAgICAgIGlmICghb2JqKVxyXG4gICAgICAgICAgICAgICAgdGhpcy4kJGNhY2hlW2tleV0gPSBvYmogPSB0aGlzLiQkY3JlYXRvcihrZXkpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2JqO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldFByb3BlcnR5RGVzY3JpcHRvciAob2JqOiBhbnksIG5hbWU6IHN0cmluZyk6IFByb3BlcnR5RGVzY3JpcHRvciB7XHJcbiAgICAgICAgaWYgKCFvYmopXHJcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgdmFyIHR5cGU6IEZ1bmN0aW9uID0gKDxhbnk+b2JqKS5jb25zdHJ1Y3RvcjtcclxuICAgICAgICB2YXIgcHJvcERlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHR5cGUucHJvdG90eXBlLCBuYW1lKTtcclxuICAgICAgICBpZiAocHJvcERlc2MpXHJcbiAgICAgICAgICAgIHJldHVybiBwcm9wRGVzYztcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIG5hbWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBoYXNQcm9wZXJ0eSAob2JqOiBhbnksIG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGlmICghb2JqKVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShuYW1lKSlcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgdmFyIHR5cGUgPSBvYmouY29uc3RydWN0b3I7XHJcbiAgICAgICAgcmV0dXJuIHR5cGUucHJvdG90eXBlLmhhc093blByb3BlcnR5KG5hbWUpO1xyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElQcm9wZXJ0eUluZm8ge1xyXG4gICAgICAgIG5hbWU6IHN0cmluZztcclxuICAgICAgICBnZXRWYWx1ZShvYmo6IGFueSk6IGFueTtcclxuICAgICAgICBzZXRWYWx1ZShvYmo6IGFueSwgdmFsdWU6IGFueSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFByb3BlcnR5SW5mbyBpbXBsZW1lbnRzIElQcm9wZXJ0eUluZm8ge1xyXG4gICAgICAgIHByaXZhdGUgJCRnZXRGdW5jOiAoKSA9PiBhbnk7XHJcbiAgICAgICAgcHJpdmF0ZSAkJHNldEZ1bmM6ICh2YWx1ZTogYW55KSA9PiBhbnk7XHJcblxyXG4gICAgICAgIG5hbWU6IHN0cmluZztcclxuXHJcbiAgICAgICAgZ2V0VmFsdWUgKG9iajogYW55KTogYW55IHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJCRnZXRGdW5jKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJCRnZXRGdW5jLmNhbGwob2JqKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldFZhbHVlIChvYmo6IGFueSwgdmFsdWU6IGFueSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kJHNldEZ1bmMpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kJHNldEZ1bmMuY2FsbChvYmosIHZhbHVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN0YXRpYyBmaW5kICh0eXBlT3JPYmo6IGFueSwgbmFtZTogc3RyaW5nKTogSVByb3BlcnR5SW5mbyB7XHJcbiAgICAgICAgICAgIHZhciBvID0gdHlwZU9yT2JqO1xyXG4gICAgICAgICAgICB2YXIgaXNUeXBlID0gdHlwZU9yT2JqIGluc3RhbmNlb2YgRnVuY3Rpb247XHJcbiAgICAgICAgICAgIGlmIChpc1R5cGUpXHJcbiAgICAgICAgICAgICAgICBvID0gbmV3IHR5cGVPck9iaigpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCEobyBpbnN0YW5jZW9mIE9iamVjdCkpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIHZhciBuYW1lQ2xvc3VyZSA9IG5hbWU7XHJcbiAgICAgICAgICAgIHZhciBwcm9wRGVzYyA9IGdldFByb3BlcnR5RGVzY3JpcHRvcihvLCBuYW1lKTtcclxuICAgICAgICAgICAgaWYgKHByb3BEZXNjKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGkgPSBuZXcgUHJvcGVydHlJbmZvKCk7XHJcbiAgICAgICAgICAgICAgICBwaS5uYW1lID0gbmFtZTtcclxuICAgICAgICAgICAgICAgIHBpLiQkZ2V0RnVuYyA9IHByb3BEZXNjLmdldDtcclxuICAgICAgICAgICAgICAgIGlmICghcGkuJCRnZXRGdW5jKVxyXG4gICAgICAgICAgICAgICAgICAgIHBpLiQkZ2V0RnVuYyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXNbbmFtZUNsb3N1cmVdO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBwaS4kJHNldEZ1bmMgPSBwcm9wRGVzYy5zZXQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXBpLiQkc2V0RnVuYyAmJiBwcm9wRGVzYy53cml0YWJsZSlcclxuICAgICAgICAgICAgICAgICAgICBwaS4kJHNldEZ1bmMgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1tuYW1lQ2xvc3VyZV0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgdHlwZSA9IGlzVHlwZSA/IHR5cGVPck9iaiA6IHR5cGVPck9iai5jb25zdHJ1Y3RvcjtcclxuICAgICAgICAgICAgdmFyIHBpID0gbmV3IFByb3BlcnR5SW5mbygpO1xyXG4gICAgICAgICAgICBwaS5uYW1lID0gbmFtZTtcclxuICAgICAgICAgICAgcGkuJCRnZXRGdW5jID0gdHlwZS5wcm90b3R5cGVbXCJHZXRcIiArIG5hbWVdO1xyXG4gICAgICAgICAgICBwaS4kJHNldEZ1bmMgPSB0eXBlLnByb3RvdHlwZVtcIlNldFwiICsgbmFtZV07XHJcbiAgICAgICAgICAgIHJldHVybiBwaTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlTmFtZSAodHlwZTogRnVuY3Rpb24pOiBzdHJpbmcge1xyXG4gICAgICAgIHZhciB0ID0gPGFueT50eXBlO1xyXG4gICAgICAgIGlmICghdClcclxuICAgICAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgdmFyIG5hbWUgPSB0Lm5hbWU7XHJcbiAgICAgICAgaWYgKG5hbWUpXHJcbiAgICAgICAgICAgIHJldHVybiBuYW1lO1xyXG4gICAgICAgIHZhciBuYW1lID0gdC50b1N0cmluZygpLm1hdGNoKC9mdW5jdGlvbiAoW15cXChdKykvKVsxXTtcclxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodCwgXCJuYW1lXCIsIHtlbnVtZXJhYmxlOiBmYWxzZSwgdmFsdWU6IG5hbWUsIHdyaXRhYmxlOiBmYWxzZX0pO1xyXG4gICAgICAgIHJldHVybiBuYW1lO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlUGFyZW50ICh0eXBlOiBGdW5jdGlvbik6IEZ1bmN0aW9uIHtcclxuICAgICAgICBpZiAodHlwZSA9PT0gT2JqZWN0KVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB2YXIgcCA9ICg8YW55PnR5cGUpLiQkcGFyZW50O1xyXG4gICAgICAgIGlmICghcCkge1xyXG4gICAgICAgICAgICBpZiAoIXR5cGUucHJvdG90eXBlKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgcCA9IDxGdW5jdGlvbj5PYmplY3QuZ2V0UHJvdG90eXBlT2YodHlwZS5wcm90b3R5cGUpLmNvbnN0cnVjdG9yO1xyXG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodHlwZSwgXCIkJHBhcmVudFwiLCB7dmFsdWU6IHAsIHdyaXRhYmxlOiBmYWxzZX0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcDtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gYWRkVHlwZUludGVyZmFjZXMgKHR5cGU6IEZ1bmN0aW9uLCAuLi5pbnRlcmZhY2VzOiBJSW50ZXJmYWNlRGVjbGFyYXRpb248YW55PltdKSB7XHJcbiAgICAgICAgaWYgKCFpbnRlcmZhY2VzKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgZm9yICh2YXIgaiA9IDAsIGxlbiA9IGludGVyZmFjZXMubGVuZ3RoOyBqIDwgbGVuOyBqKyspIHtcclxuICAgICAgICAgICAgaWYgKCFpbnRlcmZhY2VzW2pdKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJSZWdpc3RlcmluZyB1bmRlZmluZWQgaW50ZXJmYWNlIG9uIHR5cGUuXCIsIHR5cGUpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHR5cGUsIFwiJCRpbnRlcmZhY2VzXCIsIHt2YWx1ZTogaW50ZXJmYWNlcywgd3JpdGFibGU6IGZhbHNlfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGRvZXNJbmhlcml0RnJvbSAodDogRnVuY3Rpb24sIHR5cGU6IGFueSk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHZhciB0ZW1wID0gPEZ1bmN0aW9uPjxhbnk+dDtcclxuICAgICAgICB3aGlsZSAodGVtcCAmJiB0ZW1wICE9PSB0eXBlKSB7XHJcbiAgICAgICAgICAgIHRlbXAgPSBnZXRUeXBlUGFyZW50KHRlbXApO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGVtcCAhPSBudWxsO1xyXG4gICAgfVxyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cImNvbnZlcnNpb25cIiAvPlxyXG5cclxubW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgZW51bSBVcmlLaW5kIHtcclxuICAgICAgICBSZWxhdGl2ZU9yQWJzb2x1dGUgPSAwLFxyXG4gICAgICAgIEFic29sdXRlID0gMSxcclxuICAgICAgICBSZWxhdGl2ZSA9IDJcclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBVcmkge1xyXG4gICAgICAgIHByaXZhdGUgJCRvcmlnaW5hbFN0cmluZzogc3RyaW5nO1xyXG4gICAgICAgIHByaXZhdGUgJCRraW5kOiBVcmlLaW5kO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvciAodXJpOiBVcmkpO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yICh1cmk6IHN0cmluZywga2luZD86IFVyaUtpbmQpO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yICh1cmk/OiBhbnksIGtpbmQ/OiBVcmlLaW5kKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdXJpID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkb3JpZ2luYWxTdHJpbmcgPSB1cmk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQka2luZCA9IGtpbmQgfHwgVXJpS2luZC5SZWxhdGl2ZU9yQWJzb2x1dGU7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodXJpIGluc3RhbmNlb2YgVXJpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkb3JpZ2luYWxTdHJpbmcgPSAoPFVyaT51cmkpLiQkb3JpZ2luYWxTdHJpbmc7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQka2luZCA9ICg8VXJpPnVyaSkuJCRraW5kO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXQga2luZCAoKTogVXJpS2luZCB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLiQka2luZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldCBob3N0ICgpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICB2YXIgcyA9IHRoaXMuJCRvcmlnaW5hbFN0cmluZztcclxuICAgICAgICAgICAgdmFyIGluZCA9IE1hdGgubWF4KDMsIHMuaW5kZXhPZihcIjovL1wiKSArIDMpO1xyXG4gICAgICAgICAgICB2YXIgZW5kID0gcy5pbmRleE9mKFwiL1wiLCBpbmQpO1xyXG4gICAgICAgICAgICAvL1RPRE86IFN0cmlwIHBvcnRcclxuICAgICAgICAgICAgcmV0dXJuIChlbmQgPCAwKSA/IHMuc3Vic3RyKGluZCkgOiBzLnN1YnN0cihpbmQsIGVuZCAtIGluZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXQgYWJzb2x1dGVQYXRoICgpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICB2YXIgcyA9IHRoaXMuJCRvcmlnaW5hbFN0cmluZztcclxuICAgICAgICAgICAgdmFyIGluZCA9IE1hdGgubWF4KDMsIHMuaW5kZXhPZihcIjovL1wiKSArIDMpO1xyXG4gICAgICAgICAgICB2YXIgc3RhcnQgPSBzLmluZGV4T2YoXCIvXCIsIGluZCk7XHJcbiAgICAgICAgICAgIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPCBpbmQpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCIvXCI7XHJcbiAgICAgICAgICAgIHZhciBxc3RhcnQgPSBzLmluZGV4T2YoXCI/XCIsIHN0YXJ0KTtcclxuICAgICAgICAgICAgaWYgKHFzdGFydCA8IDAgfHwgcXN0YXJ0IDwgc3RhcnQpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcy5zdWJzdHIoc3RhcnQpO1xyXG4gICAgICAgICAgICByZXR1cm4gcy5zdWJzdHIoc3RhcnQsIHFzdGFydCAtIHN0YXJ0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldCBzY2hlbWUgKCk6IHN0cmluZyB7XHJcbiAgICAgICAgICAgIHZhciBzID0gdGhpcy4kJG9yaWdpbmFsU3RyaW5nO1xyXG4gICAgICAgICAgICB2YXIgaW5kID0gcy5pbmRleE9mKFwiOi8vXCIpO1xyXG4gICAgICAgICAgICBpZiAoaW5kIDwgMClcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICByZXR1cm4gcy5zdWJzdHIoMCwgaW5kKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldCBmcmFnbWVudCAoKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgdmFyIHMgPSB0aGlzLiQkb3JpZ2luYWxTdHJpbmc7XHJcbiAgICAgICAgICAgIHZhciBpbmQgPSBzLmluZGV4T2YoXCIjXCIpO1xyXG4gICAgICAgICAgICBpZiAoaW5kIDwgMClcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICByZXR1cm4gcy5zdWJzdHIoaW5kKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldCBvcmlnaW5hbFN0cmluZyAoKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuJCRvcmlnaW5hbFN0cmluZy50b1N0cmluZygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdG9TdHJpbmcgKCk6IHN0cmluZyB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLiQkb3JpZ2luYWxTdHJpbmcudG9TdHJpbmcoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGVxdWFscyAob3RoZXI6IFVyaSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy4kJG9yaWdpbmFsU3RyaW5nID09PSBvdGhlci4kJG9yaWdpbmFsU3RyaW5nO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3RhdGljIGlzTnVsbE9yRW1wdHkgKHVyaTogVXJpKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIGlmICh1cmkgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICByZXR1cm4gIXVyaS4kJG9yaWdpbmFsU3RyaW5nO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJlZ2lzdGVyVHlwZUNvbnZlcnRlcihVcmksICh2YWw6IGFueSk6IGFueSA9PiB7XHJcbiAgICAgICAgaWYgKHZhbCA9PSBudWxsKVxyXG4gICAgICAgICAgICB2YWwgPSBcIlwiO1xyXG4gICAgICAgIHJldHVybiBuZXcgVXJpKHZhbC50b1N0cmluZygpKTtcclxuICAgIH0pO1xyXG59IiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIlVyaVwiIC8+XHJcblxyXG5tb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSU91dFR5cGUge1xyXG4gICAgICAgIHR5cGU6IGFueTtcclxuICAgICAgICBpc1ByaW1pdGl2ZTogYm9vbGVhbjtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElUeXBlTWFuYWdlciB7XHJcbiAgICAgICAgZGVmYXVsdFVyaTogc3RyaW5nO1xyXG4gICAgICAgIHhVcmk6IHN0cmluZztcclxuICAgICAgICByZXNvbHZlTGlicmFyeSAodXJpOiBzdHJpbmcpOiBJTGlicmFyeTtcclxuICAgICAgICBsb2FkVHlwZUFzeW5jICh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nKTogYXN5bmMuSUFzeW5jUmVxdWVzdDxhbnk+O1xyXG4gICAgICAgIHJlc29sdmVUeXBlKHVyaTogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIC8qIG91dCAqL29yZXNvbHZlOiBJT3V0VHlwZSk6IGJvb2xlYW47XHJcbiAgICAgICAgYWRkICh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nLCB0eXBlOiBhbnkpOiBJVHlwZU1hbmFnZXI7XHJcbiAgICAgICAgYWRkUHJpbWl0aXZlICh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nLCB0eXBlOiBhbnkpOiBJVHlwZU1hbmFnZXI7XHJcbiAgICAgICAgYWRkRW51bSAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgZW51OiBhbnkpOiBJVHlwZU1hbmFnZXI7XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgVHlwZU1hbmFnZXIgaW1wbGVtZW50cyBJVHlwZU1hbmFnZXIge1xyXG4gICAgICAgIGxpYlJlc29sdmVyOiBJTGlicmFyeVJlc29sdmVyID0gbmV3IExpYnJhcnlSZXNvbHZlcigpO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvciAocHVibGljIGRlZmF1bHRVcmk6IHN0cmluZywgcHVibGljIHhVcmk6IHN0cmluZykge1xyXG4gICAgICAgICAgICB0aGlzLmxpYlJlc29sdmVyLnJlc29sdmUoZGVmYXVsdFVyaSlcclxuICAgICAgICAgICAgICAgIC5hZGQoQXJyYXksIFwiQXJyYXlcIik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmxpYlJlc29sdmVyLnJlc29sdmUoeFVyaSlcclxuICAgICAgICAgICAgICAgIC5hZGRQcmltaXRpdmUoU3RyaW5nLCBcIlN0cmluZ1wiKVxyXG4gICAgICAgICAgICAgICAgLmFkZFByaW1pdGl2ZShOdW1iZXIsIFwiTnVtYmVyXCIpXHJcbiAgICAgICAgICAgICAgICAuYWRkUHJpbWl0aXZlKE51bWJlciwgXCJEb3VibGVcIilcclxuICAgICAgICAgICAgICAgIC5hZGRQcmltaXRpdmUoRGF0ZSwgXCJEYXRlXCIpXHJcbiAgICAgICAgICAgICAgICAuYWRkUHJpbWl0aXZlKFJlZ0V4cCwgXCJSZWdFeHBcIilcclxuICAgICAgICAgICAgICAgIC5hZGRQcmltaXRpdmUoQm9vbGVhbiwgXCJCb29sZWFuXCIpXHJcbiAgICAgICAgICAgICAgICAuYWRkUHJpbWl0aXZlKFVyaSwgXCJVcmlcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXNvbHZlTGlicmFyeSAodXJpOiBzdHJpbmcpOiBJTGlicmFyeSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxpYlJlc29sdmVyLnJlc29sdmUodXJpIHx8IHRoaXMuZGVmYXVsdFVyaSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsb2FkVHlwZUFzeW5jICh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nKTogYXN5bmMuSUFzeW5jUmVxdWVzdDxhbnk+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGliUmVzb2x2ZXIubG9hZFR5cGVBc3luYyh1cmkgfHwgdGhpcy5kZWZhdWx0VXJpLCBuYW1lKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlc29sdmVUeXBlICh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nLCAvKiBvdXQgKi9vcmVzb2x2ZTogSU91dFR5cGUpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgb3Jlc29sdmUuaXNQcmltaXRpdmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgb3Jlc29sdmUudHlwZSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGliUmVzb2x2ZXIucmVzb2x2ZVR5cGUodXJpIHx8IHRoaXMuZGVmYXVsdFVyaSwgbmFtZSwgb3Jlc29sdmUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWRkICh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nLCB0eXBlOiBhbnkpOiBJVHlwZU1hbmFnZXIge1xyXG4gICAgICAgICAgICB2YXIgbGliID0gdGhpcy5saWJSZXNvbHZlci5yZXNvbHZlKHVyaSB8fCB0aGlzLmRlZmF1bHRVcmkpO1xyXG4gICAgICAgICAgICBpZiAobGliKVxyXG4gICAgICAgICAgICAgICAgbGliLmFkZCh0eXBlLCBuYW1lKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhZGRQcmltaXRpdmUgKHVyaTogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIHR5cGU6IGFueSk6IElUeXBlTWFuYWdlciB7XHJcbiAgICAgICAgICAgIHZhciBsaWIgPSB0aGlzLmxpYlJlc29sdmVyLnJlc29sdmUodXJpIHx8IHRoaXMuZGVmYXVsdFVyaSk7XHJcbiAgICAgICAgICAgIGlmIChsaWIpXHJcbiAgICAgICAgICAgICAgICBsaWIuYWRkUHJpbWl0aXZlKHR5cGUsIG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFkZEVudW0gKHVyaTogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIGVudTogYW55KTogSVR5cGVNYW5hZ2VyIHtcclxuICAgICAgICAgICAgdmFyIGxpYiA9IHRoaXMubGliUmVzb2x2ZXIucmVzb2x2ZSh1cmkgfHwgdGhpcy5kZWZhdWx0VXJpKTtcclxuICAgICAgICAgICAgaWYgKGxpYilcclxuICAgICAgICAgICAgICAgIGxpYi5hZGRFbnVtKGVudSwgbmFtZSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGNsYXNzIEFnZ3JlZ2F0ZUVycm9yIHtcclxuICAgICAgICBlcnJvcnM6IGFueVtdO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvciAoZXJyb3JzOiBhbnlbXSkge1xyXG4gICAgICAgICAgICB0aGlzLmVycm9ycyA9IGVycm9ycy5maWx0ZXIoZSA9PiAhIWUpO1xyXG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0IGZsYXQgKCk6IGFueVtdIHtcclxuICAgICAgICAgICAgdmFyIGZsYXQ6IGFueVtdID0gW107XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBlcnJzID0gdGhpcy5lcnJvcnM7IGkgPCBlcnJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZXJyID0gZXJyc1tpXTtcclxuICAgICAgICAgICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBBZ2dyZWdhdGVFcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGZsYXQgPSBmbGF0LmNvbmNhdCgoPEFnZ3JlZ2F0ZUVycm9yPmVycikuZmxhdCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGZsYXQucHVzaChlcnIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmbGF0O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGNsYXNzIERpckxvYWRFcnJvciB7XHJcbiAgICAgICAgY29uc3RydWN0b3IgKHB1YmxpYyBwYXRoOiBzdHJpbmcsIHB1YmxpYyBlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIE9iamVjdC5mcmVlemUodGhpcyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgY2xhc3MgTGlicmFyeUxvYWRFcnJvciB7XHJcbiAgICAgICAgY29uc3RydWN0b3IgKHB1YmxpYyBsaWJyYXJ5OiBMaWJyYXJ5LCBwdWJsaWMgZXJyb3I6IEVycm9yKSB7XHJcbiAgICAgICAgICAgIE9iamVjdC5mcmVlemUodGhpcyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZS5tYXJrdXAge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJTWFya3VwRXh0ZW5zaW9uIHtcclxuICAgICAgICBpbml0KHZhbDogc3RyaW5nKTtcclxuICAgICAgICByZXNvbHZlVHlwZUZpZWxkcz8ocmVzb2x2ZXI6IChmdWxsOiBzdHJpbmcpID0+IGFueSk7XHJcbiAgICAgICAgdHJhbnNtdXRlPyhvczogYW55W10pOiBhbnk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGZpbmlzaE1hcmt1cEV4dGVuc2lvbiAobWU6IElNYXJrdXBFeHRlbnNpb24sIHByZWZpeFJlc29sdmVyOiBJTnNQcmVmaXhSZXNvbHZlciwgcmVzb2x2ZXI6IGV2ZW50cy5JUmVzb2x2ZVR5cGUsIG9zOiBhbnlbXSk6IGFueSB7XHJcbiAgICAgICAgaWYgKCFtZSlcclxuICAgICAgICAgICAgcmV0dXJuIG1lO1xyXG4gICAgICAgIGlmICh0eXBlb2YgbWUucmVzb2x2ZVR5cGVGaWVsZHMgPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgICAgICBtZS5yZXNvbHZlVHlwZUZpZWxkcygoZnVsbCkgPT4gcGFyc2VUeXBlKGZ1bGwsIHByZWZpeFJlc29sdmVyLCByZXNvbHZlcikpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodHlwZW9mIG1lLnRyYW5zbXV0ZSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBtZS50cmFuc211dGUob3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbWU7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGFyc2VUeXBlIChmdWxsOiBzdHJpbmcsIHByZWZpeFJlc29sdmVyOiBJTnNQcmVmaXhSZXNvbHZlciwgcmVzb2x2ZXI6IGV2ZW50cy5JUmVzb2x2ZVR5cGUpIHtcclxuICAgICAgICB2YXIgcHJlZml4OiBzdHJpbmcgPSBudWxsO1xyXG4gICAgICAgIHZhciBuYW1lID0gZnVsbDtcclxuICAgICAgICB2YXIgaW5kID0gbmFtZS5pbmRleE9mKFwiOlwiKTtcclxuICAgICAgICBpZiAoaW5kID4gLTEpIHtcclxuICAgICAgICAgICAgcHJlZml4ID0gbmFtZS5zdWJzdHIoMCwgaW5kKTtcclxuICAgICAgICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKGluZCArIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgdXJpID0gcHJlZml4UmVzb2x2ZXIubG9va3VwTmFtZXNwYWNlVVJJKHByZWZpeCk7XHJcbiAgICAgICAgdmFyIG9ydCA9IHJlc29sdmVyKHVyaSwgbmFtZSk7XHJcbiAgICAgICAgcmV0dXJuIG9ydC50eXBlO1xyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZS5tYXJrdXAge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJTWFya3VwUGFyc2VyPFQ+IHtcclxuICAgICAgICBvbihsaXN0ZW5lcjogSU1hcmt1cFNheDxUPik6IElNYXJrdXBQYXJzZXI8VD5cclxuICAgICAgICBzZXROYW1lc3BhY2VzIChkZWZhdWx0WG1sbnM6IHN0cmluZywgeFhtbG5zOiBzdHJpbmcpOiBJTWFya3VwUGFyc2VyPFQ+O1xyXG4gICAgICAgIHNldEV4dGVuc2lvblBhcnNlciAocGFyc2VyOiBJTWFya3VwRXh0ZW5zaW9uUGFyc2VyKTogSU1hcmt1cFBhcnNlcjxUPjtcclxuICAgICAgICBwYXJzZShyb290OiBUKTtcclxuICAgICAgICBza2lwQnJhbmNoKCk7XHJcbiAgICAgICAgcmVzb2x2ZVByZWZpeCAocHJlZml4OiBzdHJpbmcpOiBzdHJpbmc7XHJcbiAgICAgICAgd2Fsa1VwT2JqZWN0cyAoKTogSUVudW1lcmF0b3I8YW55PjtcclxuICAgIH1cclxuICAgIGV4cG9ydCB2YXIgTk9fUEFSU0VSOiBJTWFya3VwUGFyc2VyPGFueT4gPSB7XHJcbiAgICAgICAgb24gKGxpc3RlbmVyOiBJTWFya3VwU2F4PGFueT4pOiBJTWFya3VwUGFyc2VyPGFueT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gTk9fUEFSU0VSO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0TmFtZXNwYWNlcyAoZGVmYXVsdFhtbG5zOiBzdHJpbmcsIHhYbWxuczogc3RyaW5nKTogSU1hcmt1cFBhcnNlcjxhbnk+IHtcclxuICAgICAgICAgICAgcmV0dXJuIE5PX1BBUlNFUjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldEV4dGVuc2lvblBhcnNlciAocGFyc2VyOiBJTWFya3VwRXh0ZW5zaW9uUGFyc2VyKTogSU1hcmt1cFBhcnNlcjxhbnk+IHtcclxuICAgICAgICAgICAgcmV0dXJuIE5PX1BBUlNFUjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHBhcnNlIChyb290OiBhbnkpIHtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNraXBCcmFuY2ggKCk6IGFueSB7XHJcbiAgICAgICAgfSxcclxuICAgICAgICByZXNvbHZlUHJlZml4IChwcmVmaXg6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgd2Fsa1VwT2JqZWN0cyAoKTogSUVudW1lcmF0b3I8YW55PiB7XHJcbiAgICAgICAgICAgIHJldHVybiBJRW51bWVyYXRvcl8uZW1wdHk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJTWFya3VwU2F4PFQ+IHtcclxuICAgICAgICByZXNvbHZlVHlwZT86IGV2ZW50cy5JUmVzb2x2ZVR5cGU7XHJcbiAgICAgICAgcmVzb2x2ZU9iamVjdD86IGV2ZW50cy5JUmVzb2x2ZU9iamVjdDtcclxuICAgICAgICByZXNvbHZlUHJpbWl0aXZlPzogZXZlbnRzLklSZXNvbHZlUHJpbWl0aXZlO1xyXG4gICAgICAgIHJlc29sdmVSZXNvdXJjZXM/OiBldmVudHMuSVJlc29sdmVSZXNvdXJjZXM7XHJcbiAgICAgICAgYnJhbmNoU2tpcD86IGV2ZW50cy5JQnJhbmNoU2tpcDxUPjtcclxuICAgICAgICBvYmplY3Q/OiBldmVudHMuSU9iamVjdDtcclxuICAgICAgICBvYmplY3RFbmQ/OiBldmVudHMuSU9iamVjdEVuZDtcclxuICAgICAgICBjb250ZW50VGV4dD86IGV2ZW50cy5JVGV4dDtcclxuICAgICAgICBuYW1lPzogZXZlbnRzLklOYW1lO1xyXG4gICAgICAgIHByb3BlcnR5U3RhcnQ/OiBldmVudHMuSVByb3BlcnR5U3RhcnQ7XHJcbiAgICAgICAgcHJvcGVydHlFbmQ/OiBldmVudHMuSVByb3BlcnR5RW5kO1xyXG4gICAgICAgIGF0dHJpYnV0ZVN0YXJ0PzogZXZlbnRzLklBdHRyaWJ1dGVTdGFydDtcclxuICAgICAgICBhdHRyaWJ1dGVFbmQ/OiBldmVudHMuSUF0dHJpYnV0ZUVuZDtcclxuICAgICAgICBlcnJvcj86IGV2ZW50cy5JUmVzdW1hYmxlRXJyb3I7XHJcbiAgICAgICAgZW5kPzogKCkgPT4gYW55O1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBvcmVzb2x2ZTogSU91dFR5cGUgPSB7XHJcbiAgICAgICAgaXNQcmltaXRpdmU6IGZhbHNlLFxyXG4gICAgICAgIHR5cGU6IE9iamVjdFxyXG4gICAgfTtcclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlTWFya3VwU2F4PFQ+IChsaXN0ZW5lcjogSU1hcmt1cFNheDxUPik6IElNYXJrdXBTYXg8VD4ge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc29sdmVUeXBlOiBsaXN0ZW5lci5yZXNvbHZlVHlwZSB8fCAoKHVyaSwgbmFtZSkgPT4gb3Jlc29sdmUpLFxyXG4gICAgICAgICAgICByZXNvbHZlT2JqZWN0OiBsaXN0ZW5lci5yZXNvbHZlT2JqZWN0IHx8ICgodHlwZSkgPT4gbmV3ICh0eXBlKSgpKSxcclxuICAgICAgICAgICAgcmVzb2x2ZVByaW1pdGl2ZTogbGlzdGVuZXIucmVzb2x2ZVByaW1pdGl2ZSB8fCAoKHR5cGUsIHRleHQpID0+IG5ldyAodHlwZSkodGV4dCkpLFxyXG4gICAgICAgICAgICByZXNvbHZlUmVzb3VyY2VzOiBsaXN0ZW5lci5yZXNvbHZlUmVzb3VyY2VzIHx8ICgob3duZXIsIG93bmVyVHlwZSkgPT4gbmV3IE9iamVjdCgpKSxcclxuICAgICAgICAgICAgYnJhbmNoU2tpcDogbGlzdGVuZXIuYnJhbmNoU2tpcCB8fCAoKHJvb3QsIG9iaikgPT4ge1xyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgb2JqZWN0OiBsaXN0ZW5lci5vYmplY3QgfHwgKChvYmosIGlzQ29udGVudCkgPT4ge1xyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgb2JqZWN0RW5kOiBsaXN0ZW5lci5vYmplY3RFbmQgfHwgKChvYmosIGlzQ29udGVudCwgcHJldikgPT4ge1xyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgY29udGVudFRleHQ6IGxpc3RlbmVyLmNvbnRlbnRUZXh0IHx8ICgodGV4dCkgPT4ge1xyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgbmFtZTogbGlzdGVuZXIubmFtZSB8fCAoKG5hbWUpID0+IHtcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIHByb3BlcnR5U3RhcnQ6IGxpc3RlbmVyLnByb3BlcnR5U3RhcnQgfHwgKChvd25lclR5cGUsIHByb3BOYW1lKSA9PiB7XHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBwcm9wZXJ0eUVuZDogbGlzdGVuZXIucHJvcGVydHlFbmQgfHwgKChvd25lclR5cGUsIHByb3BOYW1lKSA9PiB7XHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBhdHRyaWJ1dGVTdGFydDogbGlzdGVuZXIuYXR0cmlidXRlU3RhcnQgfHwgKChvd25lclR5cGUsIGF0dHJOYW1lKSA9PiB7XHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBhdHRyaWJ1dGVFbmQ6IGxpc3RlbmVyLmF0dHJpYnV0ZUVuZCB8fCAoKG93bmVyVHlwZSwgYXR0ck5hbWUsIG9iaikgPT4ge1xyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgZXJyb3I6IGxpc3RlbmVyLmVycm9yIHx8ICgoZSkgPT4gdHJ1ZSksXHJcbiAgICAgICAgICAgIGVuZDogbGlzdGVuZXIuZW5kIHx8ICgoKSA9PiB7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUubWFya3VwIHtcclxuICAgIGV4cG9ydCBjbGFzcyBNYXJrdXA8VD4ge1xyXG4gICAgICAgIHVyaTogVXJpO1xyXG4gICAgICAgIHJvb3Q6IFQ7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yICh1cmk6IHN0cmluZykge1xyXG4gICAgICAgICAgICB0aGlzLnVyaSA9IG5ldyBVcmkodXJpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNyZWF0ZVBhcnNlciAoKTogSU1hcmt1cFBhcnNlcjxUPiB7XHJcbiAgICAgICAgICAgIHJldHVybiBOT19QQVJTRVI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXNvbHZlICh0eXBlbWdyOiBJVHlwZU1hbmFnZXIsIGN1c3RvbUNvbGxlY3Rvcj86IElDdXN0b21Db2xsZWN0b3IpOiBhc3luYy5JQXN5bmNSZXF1ZXN0PGFueT4ge1xyXG4gICAgICAgICAgICB2YXIgcmVzb2x2ZXIgPSBuZXcgTWFya3VwRGVwZW5kZW5jeVJlc29sdmVyPFQ+KHR5cGVtZ3IsIHRoaXMuY3JlYXRlUGFyc2VyKCkpO1xyXG4gICAgICAgICAgICByZXNvbHZlci5jb2xsZWN0KHRoaXMucm9vdCwgY3VzdG9tQ29sbGVjdG9yKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc29sdmVyLnJlc29sdmUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxvYWRBc3luYyAoKTogYXN5bmMuSUFzeW5jUmVxdWVzdDxNYXJrdXA8VD4+IHtcclxuICAgICAgICAgICAgdmFyIHJlcVVyaSA9IFwidGV4dCFcIiArIHRoaXMudXJpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgIHZhciBtZCA9IHRoaXM7XHJcbiAgICAgICAgICAgIHJldHVybiBhc3luYy5jcmVhdGUoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgKDxGdW5jdGlvbj5yZXF1aXJlKShbcmVxVXJpXSwgKGRhdGE6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIG1kLnNldFJvb3QobWQubG9hZFJvb3QoZGF0YSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUobWQpO1xyXG4gICAgICAgICAgICAgICAgfSwgcmVqZWN0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsb2FkUm9vdCAoZGF0YTogc3RyaW5nKTogVCB7XHJcbiAgICAgICAgICAgIHJldHVybiA8VD48YW55PmRhdGE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRSb290IChtYXJrdXA6IFQpOiBNYXJrdXA8VD4ge1xyXG4gICAgICAgICAgICB0aGlzLnJvb3QgPSBtYXJrdXA7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUubWFya3VwIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUN1c3RvbUNvbGxlY3RvciB7XHJcbiAgICAgICAgKG93bmVyVXJpOiBzdHJpbmcsIG93bmVyTmFtZTogc3RyaW5nLCBwcm9wTmFtZTogc3RyaW5nLCB2YWw6IGFueSk7XHJcbiAgICB9XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElNYXJrdXBEZXBlbmRlbmN5UmVzb2x2ZXI8VD4ge1xyXG4gICAgICAgIGFkZCh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nKTogYm9vbGVhbjtcclxuICAgICAgICBjb2xsZWN0KHJvb3Q6IFQsIGN1c3RvbUNvbGxlY3Rvcj86IElDdXN0b21Db2xsZWN0b3IpO1xyXG4gICAgICAgIHJlc29sdmUoKTogYXN5bmMuSUFzeW5jUmVxdWVzdDxhbnk+O1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIE1hcmt1cERlcGVuZGVuY3lSZXNvbHZlcjxUPiBpbXBsZW1lbnRzIElNYXJrdXBEZXBlbmRlbmN5UmVzb2x2ZXI8VD4ge1xyXG4gICAgICAgIHByaXZhdGUgJCR1cmlzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgIHByaXZhdGUgJCRuYW1lczogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBwcml2YXRlICQkcmVzb2x2aW5nOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvciAocHVibGljIHR5cGVNYW5hZ2VyOiBJVHlwZU1hbmFnZXIsIHB1YmxpYyBwYXJzZXI6IElNYXJrdXBQYXJzZXI8VD4pIHtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbGxlY3QgKHJvb3Q6IFQsIGN1c3RvbUNvbGxlY3Rvcj86IElDdXN0b21Db2xsZWN0b3IpIHtcclxuICAgICAgICAgICAgLy9UT0RPOiBXZSBuZWVkIHRvIGNvbGxlY3RcclxuICAgICAgICAgICAgLy8gIFJlc291cmNlRGljdGlvbmFyeS5Tb3VyY2VcclxuICAgICAgICAgICAgLy8gIEFwcGxpY2F0aW9uLlRoZW1lTmFtZVxyXG4gICAgICAgICAgICB2YXIgYmxhbmsgPSB7fTtcclxuICAgICAgICAgICAgdmFyIG9yZXNvbHZlOiBJT3V0VHlwZSA9IHtcclxuICAgICAgICAgICAgICAgIGlzUHJpbWl0aXZlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IE9iamVjdFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB2YXIgbGFzdCA9IHtcclxuICAgICAgICAgICAgICAgIHVyaTogXCJcIixcclxuICAgICAgICAgICAgICAgIG5hbWU6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICBvYmo6IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB2YXIgcGFyc2UgPSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlVHlwZTogKHVyaSwgbmFtZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkKHVyaSwgbmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGFzdC51cmkgPSB1cmk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGFzdC5uYW1lID0gbmFtZTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3Jlc29sdmU7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZU9iamVjdDogKHR5cGUpPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBibGFuaztcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBvYmplY3RFbmQ6IChvYmosIGlzQ29udGVudCwgcHJldikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGxhc3Qub2JqID0gb2JqO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHByb3BlcnR5RW5kOiAob3duZXJUeXBlLCBwcm9wTmFtZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZUVuZDogKG93bmVyVHlwZSwgYXR0ck5hbWUsIG9iaikgPT4ge1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZiAoY3VzdG9tQ29sbGVjdG9yKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJzZS5wcm9wZXJ0eUVuZCA9IChvd25lclR5cGUsIHByb3BOYW1lKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tQ29sbGVjdG9yKGxhc3QudXJpLCBsYXN0Lm5hbWUsIHByb3BOYW1lLCBsYXN0Lm9iaik7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgcGFyc2UuYXR0cmlidXRlRW5kID0gKG93bmVyVHlwZSwgYXR0ck5hbWUsIG9iaikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUNvbGxlY3RvcihsYXN0LnVyaSwgbGFzdC5uYW1lLCBhdHRyTmFtZSwgb2JqKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMucGFyc2VyXHJcbiAgICAgICAgICAgICAgICAub24ocGFyc2UpXHJcbiAgICAgICAgICAgICAgICAucGFyc2Uocm9vdCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhZGQgKHVyaTogc3RyaW5nLCBuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgdmFyIHVyaXMgPSB0aGlzLiQkdXJpcztcclxuICAgICAgICAgICAgdmFyIG5hbWVzID0gdGhpcy4kJG5hbWVzO1xyXG4gICAgICAgICAgICB2YXIgaW5kID0gdXJpcy5pbmRleE9mKHVyaSk7XHJcbiAgICAgICAgICAgIGlmIChpbmQgPiAtMSAmJiBuYW1lc1tpbmRdID09PSBuYW1lKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kJHJlc29sdmluZy5pbmRleE9mKHVyaSArIFwiL1wiICsgbmFtZSkgPiAtMSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgdXJpcy5wdXNoKHVyaSk7XHJcbiAgICAgICAgICAgIG5hbWVzLnB1c2gobmFtZSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVzb2x2ZSAoKTogYXN5bmMuSUFzeW5jUmVxdWVzdDxhbnk+IHtcclxuICAgICAgICAgICAgdmFyIGFzOiBhc3luYy5JQXN5bmNSZXF1ZXN0PGFueT5bXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgdXJpcyA9IHRoaXMuJCR1cmlzLCBuYW1lcyA9IHRoaXMuJCRuYW1lcywgdG0gPSB0aGlzLnR5cGVNYW5hZ2VyLCByZXNvbHZpbmcgPSB0aGlzLiQkcmVzb2x2aW5nOyBpIDwgdXJpcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIHVyaSA9IHVyaXNbaV07XHJcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IG5hbWVzW2ldO1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2aW5nLnB1c2godXJpICsgXCIvXCIgKyBuYW1lKTtcclxuICAgICAgICAgICAgICAgIGFzLnB1c2godG0ubG9hZFR5cGVBc3luYyh1cmksIG5hbWUpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gYXN5bmMubWFueShhcyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZS5tYXJrdXAueGFtbCB7XHJcbiAgICAvLyBTeW50YXg6XHJcbiAgICAvLyAgICAgIHs8QWxpYXN8TmFtZT4gWzxEZWZhdWx0S2V5Pj1dPERlZmF1bHRWYWx1ZT58PEtleT49PFZhbHVlPn1cclxuICAgIC8vIEV4YW1wbGVzOlxyXG4gICAgLy8gIHt4Ok51bGwgfVxyXG4gICAgLy8gIHt4OlR5cGUgfVxyXG4gICAgLy8gIHt4OlN0YXRpYyB9XHJcbiAgICAvLyAge1RlbXBsYXRlQmluZGluZyB9XHJcbiAgICAvLyAge0JpbmRpbmcgfVxyXG4gICAgLy8gIHtTdGF0aWNSZXNvdXJjZSB9XHJcblxyXG4gICAgaW50ZXJmYWNlIElQYXJzZUNvbnRleHQge1xyXG4gICAgICAgIHRleHQ6IHN0cmluZztcclxuICAgICAgICBpOiBudW1iZXI7XHJcbiAgICAgICAgYWNjOiBzdHJpbmc7XHJcbiAgICAgICAgZXJyb3I6IGFueTtcclxuICAgICAgICByZXNvbHZlcjogSU5zUHJlZml4UmVzb2x2ZXI7XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgWGFtbEV4dGVuc2lvblBhcnNlciBpbXBsZW1lbnRzIElNYXJrdXBFeHRlbnNpb25QYXJzZXIge1xyXG4gICAgICAgIHByaXZhdGUgJCRkZWZhdWx0WG1sbnMgPSBcImh0dHA6Ly9zY2hlbWFzLndzaWNrLmNvbS9mYXlkZVwiO1xyXG4gICAgICAgIHByaXZhdGUgJCR4WG1sbnMgPSBcImh0dHA6Ly9zY2hlbWFzLndzaWNrLmNvbS9mYXlkZS94XCI7XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRvblJlc29sdmVUeXBlOiBldmVudHMuSVJlc29sdmVUeXBlO1xyXG4gICAgICAgIHByaXZhdGUgJCRvblJlc29sdmVPYmplY3Q6IGV2ZW50cy5JUmVzb2x2ZU9iamVjdDtcclxuICAgICAgICBwcml2YXRlICQkb25SZXNvbHZlUHJpbWl0aXZlOiBldmVudHMuSVJlc29sdmVQcmltaXRpdmU7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uRXJyb3I6IGV2ZW50cy5JRXJyb3I7XHJcblxyXG4gICAgICAgIHNldE5hbWVzcGFjZXMgKGRlZmF1bHRYbWxuczogc3RyaW5nLCB4WG1sbnM6IHN0cmluZyk6IFhhbWxFeHRlbnNpb25QYXJzZXIge1xyXG4gICAgICAgICAgICB0aGlzLiQkZGVmYXVsdFhtbG5zID0gZGVmYXVsdFhtbG5zO1xyXG4gICAgICAgICAgICB0aGlzLiQkeFhtbG5zID0geFhtbG5zO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHBhcnNlICh2YWx1ZTogc3RyaW5nLCByZXNvbHZlcjogSU5zUHJlZml4UmVzb2x2ZXIsIG9zOiBhbnlbXSk6IGFueSB7XHJcbiAgICAgICAgICAgIGlmICghaXNBbHBoYSh2YWx1ZVsxXSkpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgICAgIHRoaXMuJCRlbnN1cmUoKTtcclxuICAgICAgICAgICAgdmFyIGN0eDogSVBhcnNlQ29udGV4dCA9IHtcclxuICAgICAgICAgICAgICAgIHRleHQ6IHZhbHVlLFxyXG4gICAgICAgICAgICAgICAgaTogMSxcclxuICAgICAgICAgICAgICAgIGFjYzogXCJcIixcclxuICAgICAgICAgICAgICAgIGVycm9yOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZXI6IHJlc29sdmVyXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHZhciBvYmogPSB0aGlzLiQkZG9QYXJzZShjdHgsIG9zKTtcclxuICAgICAgICAgICAgaWYgKGN0eC5lcnJvcilcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRvbkVycm9yKGN0eC5lcnJvcik7XHJcbiAgICAgICAgICAgIG9iaiA9IGZpbmlzaE1hcmt1cEV4dGVuc2lvbihvYmosIHJlc29sdmVyLCB0aGlzLiQkb25SZXNvbHZlVHlwZSwgb3MpO1xyXG4gICAgICAgICAgICByZXR1cm4gb2JqO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJGRvUGFyc2UgKGN0eDogSVBhcnNlQ29udGV4dCwgb3M6IGFueVtdKTogYW55IHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLiQkcGFyc2VOYW1lKGN0eCkpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB0aGlzLiQkc3RhcnRFeHRlbnNpb24oY3R4LCBvcyk7XHJcblxyXG4gICAgICAgICAgICB3aGlsZSAoY3R4LmkgPCBjdHgudGV4dC5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy4kJHBhcnNlS2V5VmFsdWUoY3R4LCBvcykpXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBpZiAoY3R4LnRleHRbY3R4LmldID09PSBcIn1cIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gb3MucG9wKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkcGFyc2VOYW1lIChjdHg6IElQYXJzZUNvbnRleHQpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgdmFyIGluZCA9IGN0eC50ZXh0LmluZGV4T2YoXCIgXCIsIGN0eC5pKTtcclxuICAgICAgICAgICAgaWYgKGluZCA+IGN0eC5pKSB7XHJcbiAgICAgICAgICAgICAgICBjdHguYWNjID0gY3R4LnRleHQuc3Vic3RyKGN0eC5pLCBpbmQgLSBjdHguaSk7XHJcbiAgICAgICAgICAgICAgICBjdHguaSA9IGluZCArIDE7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpbmQgPSBjdHgudGV4dC5pbmRleE9mKFwifVwiLCBjdHguaSk7XHJcbiAgICAgICAgICAgIGlmIChpbmQgPiBjdHguaSkge1xyXG4gICAgICAgICAgICAgICAgY3R4LmFjYyA9IGN0eC50ZXh0LnN1YnN0cihjdHguaSwgaW5kIC0gY3R4LmkpO1xyXG4gICAgICAgICAgICAgICAgY3R4LmkgPSBpbmQ7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjdHguZXJyb3IgPSBcIk1pc3NpbmcgY2xvc2luZyBicmFja2V0LlwiO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkc3RhcnRFeHRlbnNpb24gKGN0eDogSVBhcnNlQ29udGV4dCwgb3M6IGFueVtdKSB7XHJcbiAgICAgICAgICAgIHZhciBmdWxsID0gY3R4LmFjYztcclxuICAgICAgICAgICAgdmFyIGluZCA9IGZ1bGwuaW5kZXhPZihcIjpcIik7XHJcbiAgICAgICAgICAgIHZhciBwcmVmaXggPSAoaW5kIDwgMCkgPyBudWxsIDogZnVsbC5zdWJzdHIoMCwgaW5kKTtcclxuICAgICAgICAgICAgdmFyIG5hbWUgPSAoaW5kIDwgMCkgPyBmdWxsIDogZnVsbC5zdWJzdHIoaW5kICsgMSk7XHJcbiAgICAgICAgICAgIHZhciB1cmkgPSBwcmVmaXggPyBjdHgucmVzb2x2ZXIubG9va3VwTmFtZXNwYWNlVVJJKHByZWZpeCkgOiBERUZBVUxUX1hNTE5TO1xyXG5cclxuICAgICAgICAgICAgdmFyIG9iajtcclxuICAgICAgICAgICAgaWYgKHVyaSA9PT0gdGhpcy4kJHhYbWxucykge1xyXG4gICAgICAgICAgICAgICAgaWYgKG5hbWUgPT09IFwiTnVsbFwiKVxyXG4gICAgICAgICAgICAgICAgICAgIG9iaiA9IHRoaXMuJCRwYXJzZVhOdWxsKGN0eCk7XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChuYW1lID09PSBcIlR5cGVcIilcclxuICAgICAgICAgICAgICAgICAgICBvYmogPSB0aGlzLiQkcGFyc2VYVHlwZShjdHgpO1xyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobmFtZSA9PT0gXCJTdGF0aWNcIilcclxuICAgICAgICAgICAgICAgICAgICBvYmogPSB0aGlzLiQkcGFyc2VYU3RhdGljKGN0eCk7XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBtYXJrdXAgZXh0ZW5zaW9uLiBbXCIgKyBwcmVmaXggKyBcIjpcIiArIG5hbWUgKyBcIl1cIik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgb3J0ID0gdGhpcy4kJG9uUmVzb2x2ZVR5cGUodXJpLCBuYW1lKTtcclxuICAgICAgICAgICAgICAgIG9iaiA9IHRoaXMuJCRvblJlc29sdmVPYmplY3Qob3J0LnR5cGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9zLnB1c2gob2JqKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRwYXJzZVhOdWxsIChjdHg6IElQYXJzZUNvbnRleHQpOiBhbnkge1xyXG4gICAgICAgICAgICB2YXIgaW5kID0gY3R4LnRleHQuaW5kZXhPZihcIn1cIiwgY3R4LmkpO1xyXG4gICAgICAgICAgICBpZiAoaW5kIDwgY3R4LmkpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbnRlcm1pbmF0ZWQgc3RyaW5nIGNvbnN0YW50LlwiKTtcclxuICAgICAgICAgICAgY3R4LmkgPSBpbmQ7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJHBhcnNlWFR5cGUgKGN0eDogSVBhcnNlQ29udGV4dCk6IGFueSB7XHJcbiAgICAgICAgICAgIHZhciBlbmQgPSBjdHgudGV4dC5pbmRleE9mKFwifVwiLCBjdHguaSk7XHJcbiAgICAgICAgICAgIGlmIChlbmQgPCBjdHguaSlcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVudGVybWluYXRlZCBzdHJpbmcgY29uc3RhbnQuXCIpO1xyXG4gICAgICAgICAgICB2YXIgdmFsID0gY3R4LnRleHQuc3Vic3RyKGN0eC5pLCBlbmQgLSBjdHguaSk7XHJcbiAgICAgICAgICAgIGN0eC5pID0gZW5kO1xyXG5cclxuICAgICAgICAgICAgdmFyIGluZCA9IHZhbC5pbmRleE9mKFwiOlwiKTtcclxuICAgICAgICAgICAgdmFyIHByZWZpeCA9IChpbmQgPCAwKSA/IG51bGwgOiB2YWwuc3Vic3RyKDAsIGluZCk7XHJcbiAgICAgICAgICAgIHZhciBuYW1lID0gKGluZCA8IDApID8gdmFsIDogdmFsLnN1YnN0cihpbmQgKyAxKTtcclxuICAgICAgICAgICAgdmFyIHVyaSA9IGN0eC5yZXNvbHZlci5sb29rdXBOYW1lc3BhY2VVUkkocHJlZml4KTtcclxuICAgICAgICAgICAgdmFyIG9ydCA9IHRoaXMuJCRvblJlc29sdmVUeXBlKHVyaSwgbmFtZSk7XHJcbiAgICAgICAgICAgIHJldHVybiBvcnQudHlwZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRwYXJzZVhTdGF0aWMgKGN0eDogSVBhcnNlQ29udGV4dCk6IGFueSB7XHJcbiAgICAgICAgICAgIHZhciB0ZXh0ID0gY3R4LnRleHQ7XHJcbiAgICAgICAgICAgIHZhciBsZW4gPSB0ZXh0Lmxlbmd0aDtcclxuICAgICAgICAgICAgdmFyIHN0YXJ0ID0gY3R4Lmk7XHJcbiAgICAgICAgICAgIGZvciAoOyBjdHguaSA8IGxlbjsgY3R4LmkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRleHRbY3R4LmldID09PSBcIn1cIiAmJiB0ZXh0W2N0eC5pIC0gMV0gIT09IFwiXFxcXFwiKVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciB2YWwgPSB0ZXh0LnN1YnN0cihzdGFydCwgY3R4LmkgLSBzdGFydCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgZnVuYyA9IG5ldyBGdW5jdGlvbihcInJldHVybiAoXCIgKyB2YWwgKyBcIik7XCIpO1xyXG4gICAgICAgICAgICByZXR1cm4gZnVuYygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJHBhcnNlS2V5VmFsdWUgKGN0eDogSVBhcnNlQ29udGV4dCwgb3M6IGFueVtdKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIHZhciB0ZXh0ID0gY3R4LnRleHQ7XHJcbiAgICAgICAgICAgIGN0eC5hY2MgPSBcIlwiO1xyXG4gICAgICAgICAgICB2YXIga2V5ID0gXCJcIjtcclxuICAgICAgICAgICAgdmFyIHZhbDogYW55ID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB2YXIgbGVuID0gdGV4dC5sZW5ndGg7XHJcbiAgICAgICAgICAgIHZhciBub25hbHBoYSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBmb3IgKDsgY3R4LmkgPCBsZW47IGN0eC5pKyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBjdXIgPSB0ZXh0W2N0eC5pXTtcclxuICAgICAgICAgICAgICAgIGlmIChjdXIgPT09IFwiXFxcXFwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3R4LmkrKztcclxuICAgICAgICAgICAgICAgICAgICBjdHguYWNjICs9IHRleHRbY3R4LmldO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXIgPT09IFwie1wiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vbmFscGhhIHx8ICFpc0FscGhhKHRleHRbY3R4LmkgKyAxXSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmFjYyArPSBjdXI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vbmFscGhhID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICgha2V5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5lcnJvciA9IFwiQSBzdWIgZXh0ZW5zaW9uIG11c3QgYmUgc2V0IHRvIGEga2V5LlwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGN0eC5pKys7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsID0gdGhpcy4kJGRvUGFyc2UoY3R4LCBvcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN0eC5lcnJvcilcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXIgPT09IFwiPVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAga2V5ID0gY3R4LmFjYy50cmltKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY3R4LmFjYyA9IFwiXCI7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN1ciA9PT0gXCJ9XCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobm9uYWxwaGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9uYWxwaGEgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3R4LmFjYyArPSBjdXI7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCRmaW5pc2hLZXlWYWx1ZShjdHgsIGtleSwgdmFsLCBvcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN1ciA9PT0gXCIsXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBjdHguaSsrO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCRmaW5pc2hLZXlWYWx1ZShjdHgsIGtleSwgdmFsLCBvcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleSAmJiAhY3R4LmFjYyAmJiBjdXIgPT09IFwiJ1wiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3R4LmkrKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQkcGFyc2VTaW5nbGVRdW90ZWQoY3R4KTtcclxuICAgICAgICAgICAgICAgICAgICB2YWwgPSBjdHguYWNjO1xyXG4gICAgICAgICAgICAgICAgICAgIGN0eC5hY2MgPSBcIlwiO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBjdHguYWNjICs9IGN1cjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbnRlcm1pbmF0ZWQgc3RyaW5nIGNvbnN0YW50LlwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRmaW5pc2hLZXlWYWx1ZSAoY3R4OiBJUGFyc2VDb250ZXh0LCBrZXk6IHN0cmluZywgdmFsOiBhbnksIG9zOiBhbnlbXSkge1xyXG4gICAgICAgICAgICBpZiAodmFsID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmICghKHZhbCA9IGN0eC5hY2MudHJpbSgpKSlcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhbCA9IGZpbmlzaE1hcmt1cEV4dGVuc2lvbih2YWwsIGN0eC5yZXNvbHZlciwgdGhpcy4kJG9uUmVzb2x2ZVR5cGUsIG9zKTtcclxuICAgICAgICAgICAgdmFyIGNvID0gb3Nbb3MubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgIGlmICgha2V5KSB7XHJcbiAgICAgICAgICAgICAgICBjby5pbml0ICYmIGNvLmluaXQodmFsKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvW2tleV0gPSB2YWw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRwYXJzZVNpbmdsZVF1b3RlZCAoY3R4OiBJUGFyc2VDb250ZXh0KSB7XHJcbiAgICAgICAgICAgIHZhciB0ZXh0ID0gY3R4LnRleHQ7XHJcbiAgICAgICAgICAgIHZhciBsZW4gPSB0ZXh0Lmxlbmd0aDtcclxuICAgICAgICAgICAgZm9yICg7IGN0eC5pIDwgbGVuOyBjdHguaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgY3VyID0gdGV4dFtjdHguaV07XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VyID09PSBcIlxcXFxcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGN0eC5pKys7XHJcbiAgICAgICAgICAgICAgICAgICAgY3R4LmFjYyArPSB0ZXh0W2N0eC5pXTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VyID09PSBcIidcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3R4LmFjYyArPSBjdXI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRlbnN1cmUgKCkge1xyXG4gICAgICAgICAgICB0aGlzLm9uUmVzb2x2ZVR5cGUodGhpcy4kJG9uUmVzb2x2ZVR5cGUpXHJcbiAgICAgICAgICAgICAgICAub25SZXNvbHZlT2JqZWN0KHRoaXMuJCRvblJlc29sdmVPYmplY3QpXHJcbiAgICAgICAgICAgICAgICAub25FcnJvcih0aGlzLiQkb25FcnJvcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBvblJlc29sdmVUeXBlIChjYj86IGV2ZW50cy5JUmVzb2x2ZVR5cGUpOiBYYW1sRXh0ZW5zaW9uUGFyc2VyIHtcclxuICAgICAgICAgICAgdmFyIG9yZXNvbHZlOiBJT3V0VHlwZSA9IHtcclxuICAgICAgICAgICAgICAgIGlzUHJpbWl0aXZlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IE9iamVjdFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB0aGlzLiQkb25SZXNvbHZlVHlwZSA9IGNiIHx8ICgoeG1sbnMsIG5hbWUpID0+IG9yZXNvbHZlKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBvblJlc29sdmVPYmplY3QgKGNiPzogZXZlbnRzLklSZXNvbHZlT2JqZWN0KTogWGFtbEV4dGVuc2lvblBhcnNlciB7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvblJlc29sdmVPYmplY3QgPSBjYiB8fCAoKHR5cGUpID0+IG5ldyB0eXBlKCkpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG9uUmVzb2x2ZVByaW1pdGl2ZSAoY2I/OiBldmVudHMuSVJlc29sdmVQcmltaXRpdmUpOiBYYW1sRXh0ZW5zaW9uUGFyc2VyIHtcclxuICAgICAgICAgICAgdGhpcy4kJG9uUmVzb2x2ZVByaW1pdGl2ZSA9IGNiIHx8ICgodHlwZSwgdGV4dCkgPT4gbmV3IHR5cGUodGV4dCkpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG9uRXJyb3IgKGNiPzogZXZlbnRzLklFcnJvcik6IFhhbWxFeHRlbnNpb25QYXJzZXIge1xyXG4gICAgICAgICAgICB0aGlzLiQkb25FcnJvciA9IGNiIHx8ICgoZSkgPT4ge1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGlzQWxwaGEgKGM6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGlmICghYylcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIHZhciBjb2RlID0gY1swXS50b1VwcGVyQ2FzZSgpLmNoYXJDb2RlQXQoMCk7XHJcbiAgICAgICAgcmV0dXJuIGNvZGUgPj0gNjUgJiYgY29kZSA8PSA5MDtcclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUubWFya3VwLnhhbWwge1xyXG4gICAgdmFyIHBhcnNlciA9IG5ldyBET01QYXJzZXIoKTtcclxuICAgIHZhciB4Y2FjaGUgPSBuZXcgTWVtb2l6ZXI8WGFtbE1hcmt1cD4oKGtleSkgPT4gbmV3IFhhbWxNYXJrdXAoa2V5KSk7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFhhbWxNYXJrdXAgZXh0ZW5kcyBtYXJrdXAuTWFya3VwPEVsZW1lbnQ+IHtcclxuICAgICAgICBzdGF0aWMgY3JlYXRlICh1cmk6IHN0cmluZyk6IFhhbWxNYXJrdXA7XHJcbiAgICAgICAgc3RhdGljIGNyZWF0ZSAodXJpOiBVcmkpOiBYYW1sTWFya3VwO1xyXG4gICAgICAgIHN0YXRpYyBjcmVhdGUgKHVyaTogYW55KTogWGFtbE1hcmt1cCB7XHJcbiAgICAgICAgICAgIHJldHVybiB4Y2FjaGUubWVtb2l6ZSh1cmkudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjcmVhdGVQYXJzZXIgKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFhhbWxQYXJzZXIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxvYWRSb290IChkYXRhOiBzdHJpbmcpOiBFbGVtZW50IHtcclxuICAgICAgICAgICAgdmFyIGRvYyA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcoZGF0YSwgXCJ0ZXh0L3htbFwiKTtcclxuICAgICAgICAgICAgcmV0dXJuIGRvYy5kb2N1bWVudEVsZW1lbnQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZS5tYXJrdXAueGFtbCB7XHJcbiAgICBleHBvcnQgdmFyIERFRkFVTFRfWE1MTlMgPSBcImh0dHA6Ly9zY2hlbWFzLndzaWNrLmNvbS9mYXlkZVwiO1xyXG4gICAgZXhwb3J0IHZhciBERUZBVUxUX1hNTE5TX1ggPSBcImh0dHA6Ly9zY2hlbWFzLndzaWNrLmNvbS9mYXlkZS94XCI7XHJcbiAgICB2YXIgRVJST1JfWE1MTlMgPSBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWxcIjtcclxuICAgIHZhciBFUlJPUl9OQU1FID0gXCJwYXJzZXJlcnJvclwiO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBYYW1sUGFyc2VyIGltcGxlbWVudHMgSU1hcmt1cFBhcnNlcjxFbGVtZW50PiB7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uUmVzb2x2ZVR5cGU6IGV2ZW50cy5JUmVzb2x2ZVR5cGU7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uUmVzb2x2ZU9iamVjdDogZXZlbnRzLklSZXNvbHZlT2JqZWN0O1xyXG4gICAgICAgIHByaXZhdGUgJCRvblJlc29sdmVQcmltaXRpdmU6IGV2ZW50cy5JUmVzb2x2ZVByaW1pdGl2ZTtcclxuICAgICAgICBwcml2YXRlICQkb25SZXNvbHZlUmVzb3VyY2VzOiBldmVudHMuSVJlc29sdmVSZXNvdXJjZXM7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uQnJhbmNoU2tpcDogZXZlbnRzLklCcmFuY2hTa2lwPEVsZW1lbnQ+O1xyXG4gICAgICAgIHByaXZhdGUgJCRvbk9iamVjdDogZXZlbnRzLklPYmplY3Q7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uT2JqZWN0RW5kOiBldmVudHMuSU9iamVjdEVuZDtcclxuICAgICAgICBwcml2YXRlICQkb25Db250ZW50VGV4dDogZXZlbnRzLklUZXh0O1xyXG4gICAgICAgIHByaXZhdGUgJCRvbk5hbWU6IGV2ZW50cy5JTmFtZTtcclxuICAgICAgICBwcml2YXRlICQkb25Qcm9wZXJ0eVN0YXJ0OiBldmVudHMuSVByb3BlcnR5U3RhcnQ7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uUHJvcGVydHlFbmQ6IGV2ZW50cy5JUHJvcGVydHlFbmQ7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uQXR0cmlidXRlU3RhcnQ6IGV2ZW50cy5JQXR0cmlidXRlU3RhcnQ7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uQXR0cmlidXRlRW5kOiBldmVudHMuSUF0dHJpYnV0ZUVuZDtcclxuICAgICAgICBwcml2YXRlICQkb25FcnJvcjogZXZlbnRzLklFcnJvcjtcclxuICAgICAgICBwcml2YXRlICQkb25FbmQ6ICgpID0+IGFueSA9IG51bGw7XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRleHRlbnNpb246IElNYXJrdXBFeHRlbnNpb25QYXJzZXI7XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRkZWZhdWx0WG1sbnM6IHN0cmluZztcclxuICAgICAgICBwcml2YXRlICQkeFhtbG5zOiBzdHJpbmc7XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRvYmplY3RTdGFjazogYW55W10gPSBbXTtcclxuICAgICAgICBwcml2YXRlICQkc2tpcG5leHQgPSBmYWxzZTtcclxuICAgICAgICBwcml2YXRlICQkY3VyZWw6IEVsZW1lbnQgPSBudWxsO1xyXG4gICAgICAgIHByaXZhdGUgJCRjdXJrZXk6IHN0cmluZyA9IHVuZGVmaW5lZDtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IgKCkge1xyXG4gICAgICAgICAgICB0aGlzLnNldEV4dGVuc2lvblBhcnNlcihuZXcgWGFtbEV4dGVuc2lvblBhcnNlcigpKVxyXG4gICAgICAgICAgICAgICAgLnNldE5hbWVzcGFjZXMoREVGQVVMVF9YTUxOUywgREVGQVVMVF9YTUxOU19YKVxyXG4gICAgICAgICAgICAgICAgLm9uKHt9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG9uIChsaXN0ZW5lcjogSU1hcmt1cFNheDxFbGVtZW50Pik6IFhhbWxQYXJzZXIge1xyXG4gICAgICAgICAgICBsaXN0ZW5lciA9IGNyZWF0ZU1hcmt1cFNheChsaXN0ZW5lcik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLiQkb25SZXNvbHZlVHlwZSA9IGxpc3RlbmVyLnJlc29sdmVUeXBlO1xyXG4gICAgICAgICAgICB0aGlzLiQkb25SZXNvbHZlT2JqZWN0ID0gbGlzdGVuZXIucmVzb2x2ZU9iamVjdDtcclxuICAgICAgICAgICAgdGhpcy4kJG9uUmVzb2x2ZVByaW1pdGl2ZSA9IGxpc3RlbmVyLnJlc29sdmVQcmltaXRpdmU7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvblJlc29sdmVSZXNvdXJjZXMgPSBsaXN0ZW5lci5yZXNvbHZlUmVzb3VyY2VzO1xyXG4gICAgICAgICAgICB0aGlzLiQkb25CcmFuY2hTa2lwID0gbGlzdGVuZXIuYnJhbmNoU2tpcDtcclxuICAgICAgICAgICAgdGhpcy4kJG9uT2JqZWN0ID0gbGlzdGVuZXIub2JqZWN0O1xyXG4gICAgICAgICAgICB0aGlzLiQkb25PYmplY3RFbmQgPSBsaXN0ZW5lci5vYmplY3RFbmQ7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvbkNvbnRlbnRUZXh0ID0gbGlzdGVuZXIuY29udGVudFRleHQ7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvbk5hbWUgPSBsaXN0ZW5lci5uYW1lO1xyXG4gICAgICAgICAgICB0aGlzLiQkb25Qcm9wZXJ0eVN0YXJ0ID0gbGlzdGVuZXIucHJvcGVydHlTdGFydDtcclxuICAgICAgICAgICAgdGhpcy4kJG9uUHJvcGVydHlFbmQgPSBsaXN0ZW5lci5wcm9wZXJ0eUVuZDtcclxuICAgICAgICAgICAgdGhpcy4kJG9uQXR0cmlidXRlU3RhcnQgPSBsaXN0ZW5lci5hdHRyaWJ1dGVTdGFydDtcclxuICAgICAgICAgICAgdGhpcy4kJG9uQXR0cmlidXRlRW5kID0gbGlzdGVuZXIuYXR0cmlidXRlRW5kO1xyXG4gICAgICAgICAgICB0aGlzLiQkb25FcnJvciA9IGxpc3RlbmVyLmVycm9yO1xyXG4gICAgICAgICAgICB0aGlzLiQkb25FbmQgPSBsaXN0ZW5lci5lbmQ7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy4kJGV4dGVuc2lvbikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJGV4dGVuc2lvblxyXG4gICAgICAgICAgICAgICAgICAgIC5vblJlc29sdmVUeXBlKHRoaXMuJCRvblJlc29sdmVUeXBlKVxyXG4gICAgICAgICAgICAgICAgICAgIC5vblJlc29sdmVPYmplY3QodGhpcy4kJG9uUmVzb2x2ZU9iamVjdClcclxuICAgICAgICAgICAgICAgICAgICAub25SZXNvbHZlUHJpbWl0aXZlKHRoaXMuJCRvblJlc29sdmVQcmltaXRpdmUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldE5hbWVzcGFjZXMgKGRlZmF1bHRYbWxuczogc3RyaW5nLCB4WG1sbnM6IHN0cmluZyk6IFhhbWxQYXJzZXIge1xyXG4gICAgICAgICAgICB0aGlzLiQkZGVmYXVsdFhtbG5zID0gZGVmYXVsdFhtbG5zO1xyXG4gICAgICAgICAgICB0aGlzLiQkeFhtbG5zID0geFhtbG5zO1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kJGV4dGVuc2lvbilcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRleHRlbnNpb24uc2V0TmFtZXNwYWNlcyh0aGlzLiQkZGVmYXVsdFhtbG5zLCB0aGlzLiQkeFhtbG5zKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRFeHRlbnNpb25QYXJzZXIgKHBhcnNlcjogSU1hcmt1cEV4dGVuc2lvblBhcnNlcik6IFhhbWxQYXJzZXIge1xyXG4gICAgICAgICAgICB0aGlzLiQkZXh0ZW5zaW9uID0gcGFyc2VyO1xyXG4gICAgICAgICAgICBpZiAocGFyc2VyKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJzZXIuc2V0TmFtZXNwYWNlcyh0aGlzLiQkZGVmYXVsdFhtbG5zLCB0aGlzLiQkeFhtbG5zKVxyXG4gICAgICAgICAgICAgICAgICAgIC5vblJlc29sdmVUeXBlKHRoaXMuJCRvblJlc29sdmVUeXBlKVxyXG4gICAgICAgICAgICAgICAgICAgIC5vblJlc29sdmVPYmplY3QodGhpcy4kJG9uUmVzb2x2ZU9iamVjdClcclxuICAgICAgICAgICAgICAgICAgICAub25SZXNvbHZlUHJpbWl0aXZlKHRoaXMuJCRvblJlc29sdmVQcmltaXRpdmUpXHJcbiAgICAgICAgICAgICAgICAgICAgLm9uRXJyb3IoKGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgZTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHBhcnNlIChlbDogRWxlbWVudCk6IFhhbWxQYXJzZXIge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuJCRleHRlbnNpb24pXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBleHRlbnNpb24gcGFyc2VyIGV4aXN0cyBvbiBwYXJzZXIuXCIpO1xyXG4gICAgICAgICAgICB0aGlzLiQkaGFuZGxlRWxlbWVudChlbCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuJCRkZXN0cm95KCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2tpcEJyYW5jaCAoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJCRza2lwbmV4dCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB3YWxrVXBPYmplY3RzICgpOiBJRW51bWVyYXRvcjxhbnk+IHtcclxuICAgICAgICAgICAgdmFyIG9zID0gdGhpcy4kJG9iamVjdFN0YWNrO1xyXG4gICAgICAgICAgICB2YXIgaSA9IG9zLmxlbmd0aDtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnQ6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgIG1vdmVOZXh0ICgpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgICAgICAgICBpLS07XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICh0aGlzLmN1cnJlbnQgPSBvc1tpXSkgIT09IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlc29sdmVQcmVmaXggKHByZWZpeDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuJCRjdXJlbC5sb29rdXBOYW1lc3BhY2VVUkkocHJlZml4KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRoYW5kbGVFbGVtZW50IChlbDogRWxlbWVudCwgaXNDb250ZW50OiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIC8vIE5PVEU6IEhhbmRsZSB0YWcgb3BlblxyXG4gICAgICAgICAgICAvLyAgPFtuczpdVHlwZS5OYW1lPlxyXG4gICAgICAgICAgICAvLyAgPFtuczpdVHlwZT5cclxuICAgICAgICAgICAgdmFyIG9sZCA9IHRoaXMuJCRjdXJlbDtcclxuICAgICAgICAgICAgdGhpcy4kJGN1cmVsID0gZWw7XHJcbiAgICAgICAgICAgIHZhciBuYW1lID0gZWwubG9jYWxOYW1lO1xyXG4gICAgICAgICAgICB2YXIgeG1sbnMgPSBlbC5uYW1lc3BhY2VVUkk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLiQkdHJ5SGFuZGxlRXJyb3IoZWwsIHhtbG5zLCBuYW1lKSB8fCB0aGlzLiQkdHJ5SGFuZGxlUHJvcGVydHlUYWcoZWwsIHhtbG5zLCBuYW1lKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJGN1cmVsID0gb2xkO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgb3MgPSB0aGlzLiQkb2JqZWN0U3RhY2s7XHJcbiAgICAgICAgICAgIHZhciBvcnQgPSB0aGlzLiQkb25SZXNvbHZlVHlwZSh4bWxucywgbmFtZSk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLiQkdHJ5SGFuZGxlUHJpbWl0aXZlKGVsLCBvcnQsIGlzQ29udGVudCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRjdXJlbCA9IG9sZDtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIG9iaiA9IHRoaXMuJCRvblJlc29sdmVPYmplY3Qob3J0LnR5cGUpO1xyXG4gICAgICAgICAgICBpZiAob2JqICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIG9zLnB1c2gob2JqKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRvbk9iamVjdChvYmosIGlzQ29udGVudCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIE5PVEU6IEhhbmRsZSByZXNvdXJjZXMgYmVmb3JlIGF0dHJpYnV0ZXMgYW5kIGNoaWxkIGVsZW1lbnRzXHJcbiAgICAgICAgICAgIHZhciByZXNFbCA9IGZpbmRSZXNvdXJjZXNFbGVtZW50KGVsLCB4bWxucywgbmFtZSk7XHJcbiAgICAgICAgICAgIGlmIChyZXNFbClcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRoYW5kbGVSZXNvdXJjZXMob2JqLCBvcnQudHlwZSwgcmVzRWwpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kJGN1cmtleSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgLy8gTk9URTogV2FsayBhdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgIHRoaXMuJCRwcm9jZXNzQXR0cmlidXRlcyhlbCk7XHJcbiAgICAgICAgICAgIHZhciBrZXkgPSB0aGlzLiQkY3Vya2V5O1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuJCRza2lwbmV4dCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJHNraXBuZXh0ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBvcy5wb3AoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRvbk9iamVjdEVuZChvYmosIGtleSwgaXNDb250ZW50LCBvc1tvcy5sZW5ndGggLSAxXSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkb25CcmFuY2hTa2lwKGVsLmZpcnN0RWxlbWVudENoaWxkLCBvYmopO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJGN1cmVsID0gb2xkO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBOT1RFOiBXYWxrIENoaWxkcmVuXHJcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IGVsLmZpcnN0RWxlbWVudENoaWxkO1xyXG4gICAgICAgICAgICB2YXIgaGFzQ2hpbGRyZW4gPSAhIWNoaWxkO1xyXG4gICAgICAgICAgICB3aGlsZSAoY2hpbGQpIHtcclxuICAgICAgICAgICAgICAgIGlmICghcmVzRWwgfHwgY2hpbGQgIT09IHJlc0VsKSAvL1NraXAgUmVzb3VyY2VzICh3aWxsIGJlIGRvbmUgZmlyc3QpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kJGhhbmRsZUVsZW1lbnQoY2hpbGQsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgY2hpbGQgPSBjaGlsZC5uZXh0RWxlbWVudFNpYmxpbmc7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIE5PVEU6IElmIHdlIGRpZCBub3QgaGl0IGEgY2hpbGQgdGFnLCB1c2UgdGV4dCBjb250ZW50XHJcbiAgICAgICAgICAgIGlmICghaGFzQ2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgICAgIHZhciB0ZXh0ID0gZWwudGV4dENvbnRlbnQ7XHJcbiAgICAgICAgICAgICAgICBpZiAodGV4dCAmJiAodGV4dCA9IHRleHQudHJpbSgpKSlcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQkb25Db250ZW50VGV4dCh0ZXh0KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gTk9URTogSGFuZGxlIHRhZyBjbG9zZVxyXG4gICAgICAgICAgICAvLyAgPC9bbnM6XVR5cGUuTmFtZT5cclxuICAgICAgICAgICAgLy8gIDwvW25zOl1UeXBlPlxyXG4gICAgICAgICAgICBpZiAob2JqICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIG9zLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJG9uT2JqZWN0RW5kKG9iaiwga2V5LCBpc0NvbnRlbnQsIG9zW29zLmxlbmd0aCAtIDFdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLiQkY3VyZWwgPSBvbGQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkaGFuZGxlUmVzb3VyY2VzIChvd25lcjogYW55LCBvd25lclR5cGU6IGFueSwgcmVzRWw6IEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgdmFyIG9zID0gdGhpcy4kJG9iamVjdFN0YWNrO1xyXG4gICAgICAgICAgICB2YXIgcmQgPSB0aGlzLiQkb25SZXNvbHZlUmVzb3VyY2VzKG93bmVyLCBvd25lclR5cGUpO1xyXG4gICAgICAgICAgICBvcy5wdXNoKHJkKTtcclxuICAgICAgICAgICAgdGhpcy4kJG9uT2JqZWN0KHJkLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IHJlc0VsLmZpcnN0RWxlbWVudENoaWxkO1xyXG4gICAgICAgICAgICB3aGlsZSAoY2hpbGQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRoYW5kbGVFbGVtZW50KGNoaWxkLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgIGNoaWxkID0gY2hpbGQubmV4dEVsZW1lbnRTaWJsaW5nO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9zLnBvcCgpO1xyXG4gICAgICAgICAgICB0aGlzLiQkb25PYmplY3RFbmQocmQsIHVuZGVmaW5lZCwgZmFsc2UsIG9zW29zLmxlbmd0aCAtIDFdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCR0cnlIYW5kbGVFcnJvciAoZWw6IEVsZW1lbnQsIHhtbG5zOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAoeG1sbnMgIT09IEVSUk9SX1hNTE5TIHx8IG5hbWUgIT09IEVSUk9SX05BTUUpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvbkVycm9yKG5ldyBFcnJvcihlbC50ZXh0Q29udGVudCkpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCR0cnlIYW5kbGVQcm9wZXJ0eVRhZyAoZWw6IEVsZW1lbnQsIHhtbG5zOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICB2YXIgaW5kID0gbmFtZS5pbmRleE9mKCcuJyk7XHJcbiAgICAgICAgICAgIGlmIChpbmQgPCAwKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgdmFyIG9ydCA9IHRoaXMuJCRvblJlc29sdmVUeXBlKHhtbG5zLCBuYW1lLnN1YnN0cigwLCBpbmQpKTtcclxuICAgICAgICAgICAgdmFyIHR5cGUgPSBvcnQudHlwZTtcclxuICAgICAgICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKGluZCArIDEpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kJG9uUHJvcGVydHlTdGFydCh0eXBlLCBuYW1lKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IGVsLmZpcnN0RWxlbWVudENoaWxkO1xyXG4gICAgICAgICAgICB3aGlsZSAoY2hpbGQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRoYW5kbGVFbGVtZW50KGNoaWxkLCBmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICBjaGlsZCA9IGNoaWxkLm5leHRFbGVtZW50U2libGluZztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy4kJG9uUHJvcGVydHlFbmQodHlwZSwgbmFtZSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCR0cnlIYW5kbGVQcmltaXRpdmUgKGVsOiBFbGVtZW50LCBvcmVzb2x2ZTogSU91dFR5cGUsIGlzQ29udGVudDogYm9vbGVhbik6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAoIW9yZXNvbHZlLmlzUHJpbWl0aXZlKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB2YXIgdGV4dCA9IGVsLnRleHRDb250ZW50O1xyXG4gICAgICAgICAgICB2YXIgb2JqID0gdGhpcy4kJG9uUmVzb2x2ZVByaW1pdGl2ZShvcmVzb2x2ZS50eXBlLCB0ZXh0ID8gdGV4dC50cmltKCkgOiBcIlwiKTtcclxuICAgICAgICAgICAgdGhpcy4kJG9uT2JqZWN0KG9iaiwgaXNDb250ZW50KTtcclxuICAgICAgICAgICAgdGhpcy4kJGN1cmtleSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdGhpcy4kJHByb2Nlc3NBdHRyaWJ1dGVzKGVsKTtcclxuICAgICAgICAgICAgdmFyIGtleSA9IHRoaXMuJCRjdXJrZXk7XHJcbiAgICAgICAgICAgIHZhciBvcyA9IHRoaXMuJCRvYmplY3RTdGFjaztcclxuICAgICAgICAgICAgdGhpcy4kJG9uT2JqZWN0RW5kKG9iaiwga2V5LCBpc0NvbnRlbnQsIG9zW29zLmxlbmd0aCAtIDFdKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkcHJvY2Vzc0F0dHJpYnV0ZXMgKGVsOiBFbGVtZW50KSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBhdHRycyA9IGVsLmF0dHJpYnV0ZXMsIGxlbiA9IGF0dHJzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkcHJvY2Vzc0F0dHJpYnV0ZShhdHRyc1tpXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRwcm9jZXNzQXR0cmlidXRlIChhdHRyOiBBdHRyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIHZhciBwcmVmaXggPSBhdHRyLnByZWZpeDtcclxuICAgICAgICAgICAgdmFyIG5hbWUgPSBhdHRyLmxvY2FsTmFtZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJCRzaG91bGRTa2lwQXR0cihwcmVmaXgsIG5hbWUpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIHZhciB1cmkgPSBhdHRyLm5hbWVzcGFjZVVSSTtcclxuICAgICAgICAgICAgdmFyIHZhbHVlID0gYXR0ci52YWx1ZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJCR0cnlIYW5kbGVYQXR0cmlidXRlKHVyaSwgbmFtZSwgdmFsdWUpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLiQkaGFuZGxlQXR0cmlidXRlKHVyaSwgbmFtZSwgdmFsdWUsIGF0dHIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJHNob3VsZFNraXBBdHRyIChwcmVmaXg6IHN0cmluZywgbmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIGlmIChwcmVmaXggPT09IFwieG1sbnNcIilcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICByZXR1cm4gKCFwcmVmaXggJiYgbmFtZSA9PT0gXCJ4bWxuc1wiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCR0cnlIYW5kbGVYQXR0cmlidXRlICh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIC8vICAuLi4geDpOYW1lPVwiLi4uXCJcclxuICAgICAgICAgICAgLy8gIC4uLiB4OktleT1cIi4uLlwiXHJcbiAgICAgICAgICAgIGlmICh1cmkgIT09IHRoaXMuJCR4WG1sbnMpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmIChuYW1lID09PSBcIk5hbWVcIilcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRvbk5hbWUodmFsdWUpO1xyXG4gICAgICAgICAgICBpZiAobmFtZSA9PT0gXCJLZXlcIilcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRjdXJrZXkgPSB2YWx1ZTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkaGFuZGxlQXR0cmlidXRlICh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nLCBhdHRyOiBBdHRyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIC8vICAuLi4gW25zOl1UeXBlLk5hbWU9XCIuLi5cIlxyXG4gICAgICAgICAgICAvLyAgLi4uIE5hbWU9XCIuLi5cIlxyXG5cclxuICAgICAgICAgICAgdmFyIHR5cGUgPSBudWxsO1xyXG4gICAgICAgICAgICB2YXIgbmFtZSA9IG5hbWU7XHJcbiAgICAgICAgICAgIHZhciBpbmQgPSBuYW1lLmluZGV4T2YoJy4nKTtcclxuICAgICAgICAgICAgaWYgKGluZCA+IC0xKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgb3J0ID0gdGhpcy4kJG9uUmVzb2x2ZVR5cGUodXJpLCBuYW1lLnN1YnN0cigwLCBpbmQpKTtcclxuICAgICAgICAgICAgICAgIHR5cGUgPSBvcnQudHlwZTtcclxuICAgICAgICAgICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cihpbmQgKyAxKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLiQkb25BdHRyaWJ1dGVTdGFydCh0eXBlLCBuYW1lKTtcclxuICAgICAgICAgICAgdmFyIHZhbCA9IHRoaXMuJCRnZXRBdHRyVmFsdWUodmFsdWUsIGF0dHIpO1xyXG4gICAgICAgICAgICB0aGlzLiQkb25BdHRyaWJ1dGVFbmQodHlwZSwgbmFtZSwgdmFsKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkZ2V0QXR0clZhbHVlICh2YWw6IHN0cmluZywgYXR0cjogQXR0cik6IGFueSB7XHJcbiAgICAgICAgICAgIGlmICh2YWxbMF0gIT09IFwie1wiKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbDtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuJCRleHRlbnNpb24ucGFyc2UodmFsLCBhdHRyLCB0aGlzLiQkb2JqZWN0U3RhY2spO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJGRlc3Ryb3kgKCkge1xyXG4gICAgICAgICAgICB0aGlzLiQkb25FbmQgJiYgdGhpcy4kJG9uRW5kKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbmRSZXNvdXJjZXNFbGVtZW50IChvd25lckVsOiBFbGVtZW50LCB1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nKTogRWxlbWVudCB7XHJcbiAgICAgICAgdmFyIGV4cGVjdGVkID0gbmFtZSArIFwiLlJlc291cmNlc1wiO1xyXG4gICAgICAgIHZhciBjaGlsZCA9IG93bmVyRWwuZmlyc3RFbGVtZW50Q2hpbGQ7XHJcbiAgICAgICAgd2hpbGUgKGNoaWxkKSB7XHJcbiAgICAgICAgICAgIGlmIChjaGlsZC5sb2NhbE5hbWUgPT09IGV4cGVjdGVkICYmIGNoaWxkLm5hbWVzcGFjZVVSSSA9PT0gdXJpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkO1xyXG4gICAgICAgICAgICBjaGlsZCA9IGNoaWxkLm5leHRFbGVtZW50U2libGluZztcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbn0iXX0=