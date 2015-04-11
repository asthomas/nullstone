var nullstone;
(function (nullstone) {
    nullstone.version = '0.3.10';
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl92ZXJzaW9uLnRzIiwiRGlyUmVzb2x2ZXIudHMiLCJFbnVtLnRzIiwiRXZlbnQudHMiLCJJbnRlcmZhY2UudHMiLCJJQ29sbGVjdGlvbi50cyIsIklFbnVtZXJhYmxlLnRzIiwiSUVudW1lcmF0b3IudHMiLCJJbmRleGVkUHJvcGVydHlJbmZvLnRzIiwiTGlicmFyeS50cyIsIkxpYnJhcnlSZXNvbHZlci50cyIsIk1lbW9pemVyLnRzIiwiUHJvcGVydHkudHMiLCJQcm9wZXJ0eUluZm8udHMiLCJUeXBlLnRzIiwiY29udmVyc2lvbi50cyIsIlVyaS50cyIsIlR5cGVNYW5hZ2VyLnRzIiwiYW5ub3RhdGlvbnMudHMiLCJhc3luYy50cyIsImVxdWFscy50cyIsImVycm9ycy9BZ2dyZWdhdGVFcnJvci50cyIsImVycm9ycy9EaXJMb2FkRXJyb3IudHMiLCJlcnJvcnMvTGlicmFyeUxvYWRFcnJvci50cyIsIm1hcmt1cC9JTWFya3VwRXh0ZW5zaW9uLnRzIiwibWFya3VwL0lNYXJrdXBQYXJzZXIudHMiLCJtYXJrdXAvTWFya3VwLnRzIiwibWFya3VwL01hcmt1cERlcGVuZGVuY3lSZXNvbHZlci50cyIsIm1hcmt1cC94YW1sL1hhbWxFeHRlbnNpb25QYXJzZXIudHMiLCJtYXJrdXAveGFtbC9YYW1sTWFya3VwLnRzIiwibWFya3VwL3hhbWwvWGFtbFBhcnNlci50cyJdLCJuYW1lcyI6WyJudWxsc3RvbmUiLCJudWxsc3RvbmUuRGlyUmVzb2x2ZXIiLCJudWxsc3RvbmUuRGlyUmVzb2x2ZXIuY29uc3RydWN0b3IiLCJudWxsc3RvbmUuRGlyUmVzb2x2ZXIubG9hZEFzeW5jIiwibnVsbHN0b25lLkRpclJlc29sdmVyLnJlc29sdmVUeXBlIiwibnVsbHN0b25lLkVudW0iLCJudWxsc3RvbmUuRW51bS5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5FbnVtLmZyb21BbnkiLCJudWxsc3RvbmUuRXZlbnQiLCJudWxsc3RvbmUuRXZlbnQuY29uc3RydWN0b3IiLCJudWxsc3RvbmUuRXZlbnQuaGFzIiwibnVsbHN0b25lLkV2ZW50Lm9uIiwibnVsbHN0b25lLkV2ZW50Lm9mZiIsIm51bGxzdG9uZS5FdmVudC5yYWlzZSIsIm51bGxzdG9uZS5FdmVudC5yYWlzZUFzeW5jIiwibnVsbHN0b25lLkludGVyZmFjZSIsIm51bGxzdG9uZS5JbnRlcmZhY2UuY29uc3RydWN0b3IiLCJudWxsc3RvbmUuSW50ZXJmYWNlLmlzIiwibnVsbHN0b25lLkludGVyZmFjZS5hcyIsIm51bGxzdG9uZS5JbnRlcmZhY2UubWFyayIsImdldEVudW1lcmF0b3IiLCJudWxsc3RvbmUubW92ZU5leHQiLCJudWxsc3RvbmUuSW5kZXhlZFByb3BlcnR5SW5mbyIsIm51bGxzdG9uZS5JbmRleGVkUHJvcGVydHlJbmZvLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLkluZGV4ZWRQcm9wZXJ0eUluZm8ucHJvcGVydHlUeXBlIiwibnVsbHN0b25lLkluZGV4ZWRQcm9wZXJ0eUluZm8uZ2V0VmFsdWUiLCJudWxsc3RvbmUuSW5kZXhlZFByb3BlcnR5SW5mby5zZXRWYWx1ZSIsIm51bGxzdG9uZS5JbmRleGVkUHJvcGVydHlJbmZvLmZpbmQiLCJudWxsc3RvbmUuTGlicmFyeSIsIm51bGxzdG9uZS5MaWJyYXJ5LmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLkxpYnJhcnkuc291cmNlUGF0aCIsIm51bGxzdG9uZS5MaWJyYXJ5LnJvb3RNb2R1bGUiLCJudWxsc3RvbmUuTGlicmFyeS5sb2FkQXN5bmMiLCJudWxsc3RvbmUuTGlicmFyeS4kY29uZmlnTW9kdWxlIiwibnVsbHN0b25lLkxpYnJhcnkucmVzb2x2ZVR5cGUiLCJudWxsc3RvbmUuTGlicmFyeS5hZGQiLCJudWxsc3RvbmUuTGlicmFyeS5hZGRQcmltaXRpdmUiLCJudWxsc3RvbmUuTGlicmFyeS5hZGRFbnVtIiwibnVsbHN0b25lLnNldFR5cGVVcmkiLCJudWxsc3RvbmUuTGlicmFyeVJlc29sdmVyIiwibnVsbHN0b25lLkxpYnJhcnlSZXNvbHZlci5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5MaWJyYXJ5UmVzb2x2ZXIuY3JlYXRlTGlicmFyeSIsIm51bGxzdG9uZS5MaWJyYXJ5UmVzb2x2ZXIubG9hZFR5cGVBc3luYyIsIm51bGxzdG9uZS5MaWJyYXJ5UmVzb2x2ZXIucmVzb2x2ZSIsIm51bGxzdG9uZS5MaWJyYXJ5UmVzb2x2ZXIucmVzb2x2ZVR5cGUiLCJudWxsc3RvbmUuTGlicmFyeVJlc29sdmVyLiQkb25MaWJyYXJ5Q3JlYXRlZCIsIm51bGxzdG9uZS5NZW1vaXplciIsIm51bGxzdG9uZS5NZW1vaXplci5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5NZW1vaXplci5tZW1vaXplIiwibnVsbHN0b25lLmdldFByb3BlcnR5RGVzY3JpcHRvciIsIm51bGxzdG9uZS5oYXNQcm9wZXJ0eSIsIm51bGxzdG9uZS5Qcm9wZXJ0eUluZm8iLCJudWxsc3RvbmUuUHJvcGVydHlJbmZvLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLlByb3BlcnR5SW5mby5nZXRWYWx1ZSIsIm51bGxzdG9uZS5Qcm9wZXJ0eUluZm8uc2V0VmFsdWUiLCJudWxsc3RvbmUuUHJvcGVydHlJbmZvLmZpbmQiLCJudWxsc3RvbmUuZ2V0VHlwZU5hbWUiLCJudWxsc3RvbmUuZ2V0VHlwZVBhcmVudCIsIm51bGxzdG9uZS5hZGRUeXBlSW50ZXJmYWNlcyIsIm51bGxzdG9uZS5kb2VzSW5oZXJpdEZyb20iLCJudWxsc3RvbmUuY29udmVydEFueVRvVHlwZSIsIm51bGxzdG9uZS5jb252ZXJ0U3RyaW5nVG9FbnVtIiwibnVsbHN0b25lLnJlZ2lzdGVyVHlwZUNvbnZlcnRlciIsIm51bGxzdG9uZS5yZWdpc3RlckVudW1Db252ZXJ0ZXIiLCJudWxsc3RvbmUuVXJpS2luZCIsIm51bGxzdG9uZS5VcmkiLCJudWxsc3RvbmUuVXJpLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLlVyaS5raW5kIiwibnVsbHN0b25lLlVyaS5ob3N0IiwibnVsbHN0b25lLlVyaS5hYnNvbHV0ZVBhdGgiLCJudWxsc3RvbmUuVXJpLnNjaGVtZSIsIm51bGxzdG9uZS5VcmkuZnJhZ21lbnQiLCJudWxsc3RvbmUuVXJpLm9yaWdpbmFsU3RyaW5nIiwibnVsbHN0b25lLlVyaS50b1N0cmluZyIsIm51bGxzdG9uZS5VcmkuZXF1YWxzIiwibnVsbHN0b25lLlVyaS5pc051bGxPckVtcHR5IiwibnVsbHN0b25lLlR5cGVNYW5hZ2VyIiwibnVsbHN0b25lLlR5cGVNYW5hZ2VyLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLlR5cGVNYW5hZ2VyLnJlc29sdmVMaWJyYXJ5IiwibnVsbHN0b25lLlR5cGVNYW5hZ2VyLmxvYWRUeXBlQXN5bmMiLCJudWxsc3RvbmUuVHlwZU1hbmFnZXIucmVzb2x2ZVR5cGUiLCJudWxsc3RvbmUuVHlwZU1hbmFnZXIuYWRkIiwibnVsbHN0b25lLlR5cGVNYW5hZ2VyLmFkZFByaW1pdGl2ZSIsIm51bGxzdG9uZS5UeXBlTWFuYWdlci5hZGRFbnVtIiwibnVsbHN0b25lLkFubm90YXRpb24iLCJudWxsc3RvbmUuR2V0QW5ub3RhdGlvbnMiLCJudWxsc3RvbmUuQ3JlYXRlVHlwZWRBbm5vdGF0aW9uIiwibnVsbHN0b25lLkNyZWF0ZVR5cGVkQW5ub3RhdGlvbi50YSIsIm51bGxzdG9uZS5hc3luYyIsIm51bGxzdG9uZS5hc3luYy5jcmVhdGUiLCJudWxsc3RvbmUuYXN5bmMuY3JlYXRlLnJlc29sdmUiLCJudWxsc3RvbmUuYXN5bmMuY3JlYXRlLnJlamVjdCIsIm51bGxzdG9uZS5hc3luYy5yZXNvbHZlIiwibnVsbHN0b25lLmFzeW5jLnJlamVjdCIsIm51bGxzdG9uZS5hc3luYy5tYW55IiwibnVsbHN0b25lLmFzeW5jLm1hbnkuY29tcGxldGVTaW5nbGUiLCJudWxsc3RvbmUuZXF1YWxzIiwibnVsbHN0b25lLkFnZ3JlZ2F0ZUVycm9yIiwibnVsbHN0b25lLkFnZ3JlZ2F0ZUVycm9yLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLkFnZ3JlZ2F0ZUVycm9yLmZsYXQiLCJudWxsc3RvbmUuRGlyTG9hZEVycm9yIiwibnVsbHN0b25lLkRpckxvYWRFcnJvci5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5MaWJyYXJ5TG9hZEVycm9yIiwibnVsbHN0b25lLkxpYnJhcnlMb2FkRXJyb3IuY29uc3RydWN0b3IiLCJudWxsc3RvbmUubWFya3VwIiwibnVsbHN0b25lLm1hcmt1cC5maW5pc2hNYXJrdXBFeHRlbnNpb24iLCJudWxsc3RvbmUubWFya3VwLnBhcnNlVHlwZSIsIm51bGxzdG9uZS5tYXJrdXAub24iLCJudWxsc3RvbmUubWFya3VwLnNldE5hbWVzcGFjZXMiLCJudWxsc3RvbmUubWFya3VwLnNldEV4dGVuc2lvblBhcnNlciIsIm51bGxzdG9uZS5tYXJrdXAucGFyc2UiLCJudWxsc3RvbmUubWFya3VwLnNraXBCcmFuY2giLCJudWxsc3RvbmUubWFya3VwLnJlc29sdmVQcmVmaXgiLCJudWxsc3RvbmUubWFya3VwLndhbGtVcE9iamVjdHMiLCJudWxsc3RvbmUubWFya3VwLmNyZWF0ZU1hcmt1cFNheCIsIm51bGxzdG9uZS5tYXJrdXAuTWFya3VwIiwibnVsbHN0b25lLm1hcmt1cC5NYXJrdXAuY29uc3RydWN0b3IiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cC5jcmVhdGVQYXJzZXIiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cC5yZXNvbHZlIiwibnVsbHN0b25lLm1hcmt1cC5NYXJrdXAubG9hZEFzeW5jIiwibnVsbHN0b25lLm1hcmt1cC5NYXJrdXAubG9hZFJvb3QiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cC5zZXRSb290IiwibnVsbHN0b25lLm1hcmt1cC5NYXJrdXBEZXBlbmRlbmN5UmVzb2x2ZXIiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cERlcGVuZGVuY3lSZXNvbHZlci5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5tYXJrdXAuTWFya3VwRGVwZW5kZW5jeVJlc29sdmVyLmNvbGxlY3QiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cERlcGVuZGVuY3lSZXNvbHZlci5hZGQiLCJudWxsc3RvbmUubWFya3VwLk1hcmt1cERlcGVuZGVuY3lSZXNvbHZlci5yZXNvbHZlIiwibnVsbHN0b25lLm1hcmt1cC54YW1sIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxFeHRlbnNpb25QYXJzZXIiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci5jb25zdHJ1Y3RvciIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLnNldE5hbWVzcGFjZXMiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci5wYXJzZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkZG9QYXJzZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkcGFyc2VOYW1lIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxFeHRlbnNpb25QYXJzZXIuJCRzdGFydEV4dGVuc2lvbiIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkcGFyc2VYTnVsbCIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkcGFyc2VYVHlwZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkcGFyc2VYU3RhdGljIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxFeHRlbnNpb25QYXJzZXIuJCRwYXJzZUtleVZhbHVlIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxFeHRlbnNpb25QYXJzZXIuJCRmaW5pc2hLZXlWYWx1ZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLiQkcGFyc2VTaW5nbGVRdW90ZWQiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci4kJGVuc3VyZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sRXh0ZW5zaW9uUGFyc2VyLm9uUmVzb2x2ZVR5cGUiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci5vblJlc29sdmVPYmplY3QiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci5vblJlc29sdmVQcmltaXRpdmUiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbEV4dGVuc2lvblBhcnNlci5vbkVycm9yIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLmlzQWxwaGEiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbE1hcmt1cCIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sTWFya3VwLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxNYXJrdXAuY3JlYXRlIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxNYXJrdXAuY3JlYXRlUGFyc2VyIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxNYXJrdXAubG9hZFJvb3QiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlciIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLmNvbnN0cnVjdG9yIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIub24iLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci5zZXROYW1lc3BhY2VzIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuc2V0RXh0ZW5zaW9uUGFyc2VyIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIucGFyc2UiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci5za2lwQnJhbmNoIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIud2Fsa1VwT2JqZWN0cyIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLndhbGtVcE9iamVjdHMubW92ZU5leHQiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci5yZXNvbHZlUHJlZml4IiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuJCRoYW5kbGVFbGVtZW50IiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuJCRoYW5kbGVSZXNvdXJjZXMiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci4kJHRyeUhhbmRsZUVycm9yIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuJCR0cnlIYW5kbGVQcm9wZXJ0eVRhZyIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLiQkdHJ5SGFuZGxlUHJpbWl0aXZlIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuJCRwcm9jZXNzQXR0cmlidXRlcyIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLiQkcHJvY2Vzc0F0dHJpYnV0ZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLiQkc2hvdWxkU2tpcEF0dHIiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci4kJHRyeUhhbmRsZVhBdHRyaWJ1dGUiLCJudWxsc3RvbmUubWFya3VwLnhhbWwuWGFtbFBhcnNlci4kJGhhbmRsZUF0dHJpYnV0ZSIsIm51bGxzdG9uZS5tYXJrdXAueGFtbC5YYW1sUGFyc2VyLiQkZ2V0QXR0clZhbHVlIiwibnVsbHN0b25lLm1hcmt1cC54YW1sLlhhbWxQYXJzZXIuJCRkZXN0cm95IiwibnVsbHN0b25lLm1hcmt1cC54YW1sLmZpbmRSZXNvdXJjZXNFbGVtZW50Il0sIm1hcHBpbmdzIjoiQUFBQSxJQUFPLFNBQVMsQ0FFZjtBQUZELFdBQU8sU0FBUyxFQUFDLENBQUM7SUFDSEEsaUJBQU9BLEdBQUdBLFFBQVFBLENBQUNBO0FBQ2xDQSxDQUFDQSxFQUZNLFNBQVMsS0FBVCxTQUFTLFFBRWY7QUNGRCxJQUFPLFNBQVMsQ0FpQmY7QUFqQkQsV0FBTyxTQUFTLEVBQUMsQ0FBQztJQUNkQSxJQUFhQSxXQUFXQTtRQUF4QkMsU0FBYUEsV0FBV0E7UUFleEJDLENB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QUFnQkEsQ0FBQ0E7Z0JBQ2pGQSxnQkFBZ0JBLEVBQUVBLFFBQVFBLENBQUNBLGdCQUFnQkEsSUFBSUEsQ0FBQ0EsVUFBQ0EsS0FBS0EsRUFBRUEsU0FBU0EsSUFBS0EsV0FBSUEsTUFBTUEsRUFBRUEsRUFBWkEsQ0FBWUEsQ0FBQ0E7Z0JBQ25GQSxVQUFVQSxFQUFFQSxRQUFRQSxDQUFDQSxVQUFVQSxJQUFJQSxDQUFDQSxVQUFDQSxJQUFJQSxFQUFFQSxHQUFHQTtnQkFDOUNBLENBQUNBLENBQUNBO2dCQUNGQSxNQUFNQSxFQUFFQSxRQUFRQSxDQUFDQSxNQUFNQSxJQUFJQSxDQUFDQSxVQUFDQSxHQUFHQSxFQUFFQSxTQUFTQTtnQkFDM0NBLENBQUNBLENBQUNBO2dCQUNGQSxTQUFTQSxFQUFFQSxRQUFRQSxDQUFDQSxTQUFTQSxJQUFJQSxDQUFDQSxVQUFDQSxHQUFHQSxFQUFFQSxTQUFTQSxFQUFFQSxJQUFJQTtnQkFDdkRBLENBQUNBLENBQUNBO2dCQUNGQSxXQUFXQSxFQUFFQSxRQUFRQSxDQUFDQSxXQUFXQSxJQUFJQSxDQUFDQSxVQUFDQSxJQUFJQTtnQkFDM0NBLENBQUNBLENBQUNBO2dCQUNGQSxJQUFJQSxFQUFFQSxRQUFRQSxDQUFDQSxJQUFJQSxJQUFJQSxDQUFDQSxVQUFDQSxJQUFJQTtnQkFDN0JBLENBQUNBLENBQUNBO2dCQUNGQSxhQUFhQSxFQUFFQSxRQUFRQSxDQUFDQSxhQUFhQSxJQUFJQSxDQUFDQSxVQUFDQSxTQUFTQSxFQUFFQSxRQUFRQTtnQkFDOURBLENBQUNBLENBQUNBO2dCQUNGQSxXQUFXQSxFQUFFQSxRQUFRQSxDQUFDQSxXQUFXQSxJQUFJQSxDQUFDQSxVQUFDQSxTQUFTQSxFQUFFQSxRQUFRQTtnQkFDMURBLENBQUNBLENBQUNBO2dCQUNGQSxjQUFjQSxFQUFFQSxRQUFRQSxDQUFDQSxjQUFjQSxJQUFJQSxDQUFDQSxVQUFDQSxTQUFTQSxFQUFFQSxRQUFRQTtnQkFDaEVBLENBQUNBLENBQUNBO2dCQUNGQSxZQUFZQSxFQUFFQSxRQUFRQSxDQUFDQSxZQUFZ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Q0EsQ0FBQ0EsRUFBRUEsQ0FBQ0E7NEJBQ1JBLEdBQUdBLENBQUNBLEdBQUdBLElBQUlBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUMzQkEsQ0FBQ0E7d0JBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLEtBQUtBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBOzRCQUNyQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0NBQ3hDQSxHQUFHQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxDQUFDQTtnQ0FDZkEsUUFBUUEsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0NBQ2hCQSxRQUFRQSxDQUFDQTs0QkFDYkEsQ0FBQ0E7NEJBQ0RBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO2dDQUNQQSxHQUFHQSxDQUFDQSxLQUFLQSxHQUFHQSx1Q0FBdUNBLENBQUNBO2dDQUNwREEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7NEJBQ2pCQSxDQUFDQTs0QkFDREEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0E7NEJBQ1JBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLEdBQUdBLEVBQUVBLEVBQUVBLENBQUNBLENBQUNBOzRCQUM5QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0E7Z0NBQ1ZBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBO3dCQUNyQkEsQ0FBQ0E7d0JBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLEtBQUtBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBOzRCQUNyQkEsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FB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QUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtZQUNoQkEsQ0FBQ0E7UUFDTC9DLENBQUNBLEVBalV1QnZCLElBQUlBLEdBQUpBLFdBQUlBLEtBQUpBLFdBQUlBLFFBaVUzQkE7SUFBREEsQ0FBQ0EsRUFqVWdCeEcsTUFBTUEsR0FBTkEsZ0JBQU1BLEtBQU5BLGdCQUFNQSxRQWlVdEJBO0FBQURBLENBQUNBLEVBalVNLFNBQVMsS0FBVCxTQUFTLFFBaVVmIiwiZmlsZSI6Im51bGxzdG9uZS5qcyIsInNvdXJjZVJvb3QiOiJnOi9Tb3VyY2VDb250cm9sL251bGxzdG9uZS8iLCJzb3VyY2VzQ29udGVudCI6WyJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCB2YXIgdmVyc2lvbiA9ICcwLjMuMTAnO1xyXG59IiwibW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgY2xhc3MgRGlyUmVzb2x2ZXIgaW1wbGVtZW50cyBJVHlwZVJlc29sdmVyIHtcclxuICAgICAgICBsb2FkQXN5bmMgKG1vZHVsZU5hbWU6IHN0cmluZywgbmFtZTogc3RyaW5nKTogYXN5bmMuSUFzeW5jUmVxdWVzdDxhbnk+IHtcclxuICAgICAgICAgICAgdmFyIHJlcVVyaSA9IG1vZHVsZU5hbWUgKyAnLycgKyBuYW1lO1xyXG4gICAgICAgICAgICByZXR1cm4gYXN5bmMuY3JlYXRlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgICAgICg8RnVuY3Rpb24+cmVxdWlyZSkoW3JlcVVyaV0sIChyb290TW9kdWxlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyb290TW9kdWxlKTtcclxuICAgICAgICAgICAgICAgIH0sIChlcnIpID0+IHJlamVjdChuZXcgRGlyTG9hZEVycm9yKHJlcVVyaSwgZXJyKSkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlc29sdmVUeXBlIChtb2R1bGVOYW1lOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgLyogb3V0ICovb3Jlc29sdmU6IElPdXRUeXBlKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIG9yZXNvbHZlLmlzUHJpbWl0aXZlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIG9yZXNvbHZlLnR5cGUgPSByZXF1aXJlKG1vZHVsZU5hbWUgKyAnLycgKyBuYW1lKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9yZXNvbHZlLnR5cGUgIT09IHVuZGVmaW5lZDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBjbGFzcyBFbnVtIHtcclxuICAgICAgICBjb25zdHJ1Y3RvciAocHVibGljIE9iamVjdDogYW55KSB7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzdGF0aWMgZnJvbUFueTxUPihlbnVUeXBlOiBhbnksIHZhbDogYW55LCBmYWxsYmFjaz86IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsID09PSBcIm51bWJlclwiKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbDtcclxuICAgICAgICAgICAgaWYgKCF2YWwpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gKGZhbGxiYWNrIHx8IDApO1xyXG4gICAgICAgICAgICB2YXIgb2JqID0gZW51VHlwZVt2YWwudG9TdHJpbmcoKV07XHJcbiAgICAgICAgICAgIHJldHVybiAob2JqID09IG51bGwpID8gKGZhbGxiYWNrIHx8IDApIDogb2JqO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJRXZlbnRBcmdzIHtcclxuICAgIH1cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUV2ZW50Q2FsbGJhY2s8VCBleHRlbmRzIElFdmVudEFyZ3M+IHtcclxuICAgICAgICAoc2VuZGVyOiBhbnksIGFyZ3M6IFQpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFdmVudDxUIGV4dGVuZHMgSUV2ZW50QXJncz4ge1xyXG4gICAgICAgIHByaXZhdGUgJCRjYWxsYmFja3M6IElFdmVudENhbGxiYWNrPFQ+W10gPSBbXTtcclxuICAgICAgICBwcml2YXRlICQkc2NvcGVzOiBhbnlbXSA9IFtdO1xyXG5cclxuICAgICAgICBnZXQgaGFzICgpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuJCRjYWxsYmFja3MubGVuZ3RoID4gMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG9uIChjYWxsYmFjazogSUV2ZW50Q2FsbGJhY2s8VD4sIHNjb3BlOiBhbnkpIHtcclxuICAgICAgICAgICAgdGhpcy4kJGNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcclxuICAgICAgICAgICAgdGhpcy4kJHNjb3Blcy5wdXNoKHNjb3BlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG9mZiAoY2FsbGJhY2s6IElFdmVudENhbGxiYWNrPFQ+LCBzY29wZTogYW55KSB7XHJcbiAgICAgICAgICAgIHZhciBjYnMgPSB0aGlzLiQkY2FsbGJhY2tzO1xyXG4gICAgICAgICAgICB2YXIgc2NvcGVzID0gdGhpcy4kJHNjb3BlcztcclxuICAgICAgICAgICAgdmFyIHNlYXJjaCA9IGNicy5sZW5ndGggLSAxO1xyXG4gICAgICAgICAgICB3aGlsZSAoc2VhcmNoID4gLTEpIHtcclxuICAgICAgICAgICAgICAgIHNlYXJjaCA9IGNicy5sYXN0SW5kZXhPZihjYWxsYmFjaywgc2VhcmNoKTtcclxuICAgICAgICAgICAgICAgIGlmIChzY29wZXNbc2VhcmNoXSA9PT0gc2NvcGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYnMuc3BsaWNlKHNlYXJjaCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGVzLnNwbGljZShzZWFyY2gsIDEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc2VhcmNoLS07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJhaXNlIChzZW5kZXI6IGFueSwgYXJnczogVCkge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgY2JzID0gdGhpcy4kJGNhbGxiYWNrcy5zbGljZSgwKSwgc2NvcGVzID0gdGhpcy4kJHNjb3Blcy5zbGljZSgwKSwgbGVuID0gY2JzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBjYnNbaV0uY2FsbChzY29wZXNbaV0sIHNlbmRlciwgYXJncyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJhaXNlQXN5bmMgKHNlbmRlcjogYW55LCBhcmdzOiBUKSB7XHJcbiAgICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHRoaXMucmFpc2Uoc2VuZGVyLCBhcmdzKSwgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElJbnRlcmZhY2VEZWNsYXJhdGlvbjxUPiB7XHJcbiAgICAgICAgbmFtZTogc3RyaW5nO1xyXG4gICAgICAgIGlzKG86IGFueSk6IGJvb2xlYW47XHJcbiAgICAgICAgYXMobzogYW55KTogVDtcclxuICAgICAgICBtYXJrKHR5cGU6IGFueSk6IElJbnRlcmZhY2VEZWNsYXJhdGlvbjxUPjtcclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBJbnRlcmZhY2U8VD4gaW1wbGVtZW50cyBJSW50ZXJmYWNlRGVjbGFyYXRpb248VD4ge1xyXG4gICAgICAgIG5hbWU6IHN0cmluZztcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IgKG5hbWU6IHN0cmluZykge1xyXG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJuYW1lXCIsIHt2YWx1ZTogbmFtZSwgd3JpdGFibGU6IGZhbHNlfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpcyAobzogYW55KTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIGlmICghbylcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgdmFyIHR5cGUgPSBvLmNvbnN0cnVjdG9yO1xyXG4gICAgICAgICAgICB3aGlsZSAodHlwZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGlzOiBJSW50ZXJmYWNlRGVjbGFyYXRpb248YW55PltdID0gdHlwZS4kJGludGVyZmFjZXM7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXMgJiYgaXMuaW5kZXhPZih0aGlzKSA+IC0xKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdHlwZSA9IGdldFR5cGVQYXJlbnQodHlwZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXMgKG86IGFueSk6IFQge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuaXMobykpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICByZXR1cm4gPFQ+bztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1hcmsgKHR5cGU6IGFueSk6IEludGVyZmFjZTxUPiB7XHJcbiAgICAgICAgICAgIGFkZFR5cGVJbnRlcmZhY2VzKHR5cGUsIHRoaXMpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiSW50ZXJmYWNlXCIgLz5cclxuXHJcbm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJQ29sbGVjdGlvbjxUPiBleHRlbmRzIElFbnVtZXJhYmxlPFQ+IHtcclxuICAgICAgICBDb3VudDogbnVtYmVyO1xyXG4gICAgICAgIEdldFZhbHVlQXQoaW5kZXg6IG51bWJlcik6IFQ7XHJcbiAgICAgICAgU2V0VmFsdWVBdChpbmRleDogbnVtYmVyLCB2YWx1ZTogVCk7XHJcbiAgICAgICAgSW5zZXJ0KGluZGV4OiBudW1iZXIsIHZhbHVlOiBUKTtcclxuICAgICAgICBBZGQodmFsdWU6IFQpO1xyXG4gICAgICAgIFJlbW92ZSh2YWx1ZTogVCk6IGJvb2xlYW47XHJcbiAgICAgICAgUmVtb3ZlQXQoaW5kZXg6IG51bWJlcik7XHJcbiAgICAgICAgQ2xlYXIoKTtcclxuICAgIH1cclxuICAgIGV4cG9ydCB2YXIgSUNvbGxlY3Rpb25fID0gbmV3IEludGVyZmFjZTxJQ29sbGVjdGlvbjxhbnk+PihcIklDb2xsZWN0aW9uXCIpO1xyXG59IiwibW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElFbnVtZXJhYmxlPFQ+IHtcclxuICAgICAgICBnZXRFbnVtZXJhdG9yKGlzUmV2ZXJzZT86IGJvb2xlYW4pOiBJRW51bWVyYXRvcjxUPjtcclxuICAgIH1cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUVudW1lcmFibGVEZWNsYXJhdGlvbjxUPiBleHRlbmRzIElJbnRlcmZhY2VEZWNsYXJhdGlvbjxUPiB7XHJcbiAgICAgICAgZW1wdHk6IElFbnVtZXJhYmxlPFQ+O1xyXG4gICAgICAgIGZyb21BcnJheShhcnI6IFRbXSk6IElFbnVtZXJhYmxlPFQ+O1xyXG4gICAgICAgIHRvQXJyYXkoZW46IElFbnVtZXJhYmxlPFQ+KTogVFtdO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IHZhciBJRW51bWVyYWJsZV8gPSA8SUVudW1lcmFibGVEZWNsYXJhdGlvbjxhbnk+Pm5ldyBJbnRlcmZhY2UoXCJJRW51bWVyYWJsZVwiKTtcclxuICAgIElFbnVtZXJhYmxlXy5pcyA9IChvOiBhbnkpOiBib29sZWFuID0+IHtcclxuICAgICAgICByZXR1cm4gbyAmJiBvLmdldEVudW1lcmF0b3IgJiYgdHlwZW9mIG8uZ2V0RW51bWVyYXRvciA9PT0gXCJmdW5jdGlvblwiO1xyXG4gICAgfTtcclxuXHJcbiAgICBJRW51bWVyYWJsZV8uZW1wdHkgPSB7XHJcbiAgICAgICAgZ2V0RW51bWVyYXRvcjogZnVuY3Rpb248VD4oaXNSZXZlcnNlPzogYm9vbGVhbik6IElFbnVtZXJhdG9yPFQ+IHtcclxuICAgICAgICAgICAgcmV0dXJuIElFbnVtZXJhdG9yXy5lbXB0eTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIElFbnVtZXJhYmxlXy5mcm9tQXJyYXkgPSBmdW5jdGlvbjxUPihhcnI6IFRbXSk6IElFbnVtZXJhYmxlPFQ+IHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAkJGFycjogYXJyLFxyXG4gICAgICAgICAgICBnZXRFbnVtZXJhdG9yIChpc1JldmVyc2U/OiBib29sZWFuKTogSUVudW1lcmF0b3I8VD4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIElFbnVtZXJhdG9yXy5mcm9tQXJyYXkodGhpcy4kJGFyciwgaXNSZXZlcnNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9O1xyXG5cclxuICAgIElFbnVtZXJhYmxlXy50b0FycmF5ID0gZnVuY3Rpb248VD4oZW46IElFbnVtZXJhYmxlPFQ+KTogVFtdIHtcclxuICAgICAgICB2YXIgYTogVFtdID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgZSA9IGVuLmdldEVudW1lcmF0b3IoKTsgZS5tb3ZlTmV4dCgpOykge1xyXG4gICAgICAgICAgICBhLnB1c2goZS5jdXJyZW50KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGE7XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUVudW1lcmF0b3I8VD4ge1xyXG4gICAgICAgIGN1cnJlbnQ6IFQ7XHJcbiAgICAgICAgbW92ZU5leHQoKTogYm9vbGVhbjtcclxuICAgIH1cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUVudW1lcmF0b3JEZWNsYXJhdGlvbjxUPiBleHRlbmRzIElJbnRlcmZhY2VEZWNsYXJhdGlvbjxUPiB7XHJcbiAgICAgICAgZW1wdHk6IElFbnVtZXJhdG9yPFQ+O1xyXG4gICAgICAgIGZyb21BcnJheShhcnI6IFRbXSwgaXNSZXZlcnNlPzogYm9vbGVhbik6SUVudW1lcmF0b3I8VD47XHJcbiAgICB9XHJcbiAgICBleHBvcnQgdmFyIElFbnVtZXJhdG9yXyA9IDxJRW51bWVyYXRvckRlY2xhcmF0aW9uPGFueT4+bmV3IEludGVyZmFjZShcIklFbnVtZXJhdG9yXCIpO1xyXG5cclxuICAgIElFbnVtZXJhdG9yXy5lbXB0eSA9IHtcclxuICAgICAgICBjdXJyZW50OiB1bmRlZmluZWQsXHJcbiAgICAgICAgbW92ZU5leHQgKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBJRW51bWVyYXRvcl8uZnJvbUFycmF5ID0gZnVuY3Rpb248VD4gKGFycjogVFtdLCBpc1JldmVyc2U/OiBib29sZWFuKTogSUVudW1lcmF0b3I8VD4ge1xyXG4gICAgICAgIHZhciBsZW4gPSBhcnIubGVuZ3RoO1xyXG4gICAgICAgIHZhciBlID0gPElFbnVtZXJhdG9yPFQ+Pnttb3ZlTmV4dDogdW5kZWZpbmVkLCBjdXJyZW50OiB1bmRlZmluZWR9O1xyXG4gICAgICAgIHZhciBpbmRleDtcclxuICAgICAgICBpZiAoaXNSZXZlcnNlKSB7XHJcbiAgICAgICAgICAgIGluZGV4ID0gbGVuO1xyXG4gICAgICAgICAgICBlLm1vdmVOZXh0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaW5kZXgtLTtcclxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBlLmN1cnJlbnQgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZS5jdXJyZW50ID0gYXJyW2luZGV4XTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGluZGV4ID0gLTE7XHJcbiAgICAgICAgICAgIGUubW92ZU5leHQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBpbmRleCsrO1xyXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGUuY3VycmVudCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlLmN1cnJlbnQgPSBhcnJbaW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBlO1xyXG4gICAgfTtcclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJSW5kZXhlZFByb3BlcnR5SW5mbyB7XHJcbiAgICAgICAgZ2V0VmFsdWUob2JqOiBhbnksIGluZGV4OiBudW1iZXIpOiBhbnk7XHJcbiAgICAgICAgc2V0VmFsdWUob2JqOiBhbnksIGluZGV4OiBudW1iZXIsIHZhbHVlOiBhbnkpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBJbmRleGVkUHJvcGVydHlJbmZvIGltcGxlbWVudHMgSUluZGV4ZWRQcm9wZXJ0eUluZm8ge1xyXG4gICAgICAgIEdldEZ1bmM6IChpbmRleDogbnVtYmVyKSA9PiBhbnk7XHJcbiAgICAgICAgU2V0RnVuYzogKGluZGV4OiBudW1iZXIsIHZhbHVlOiBhbnkpID0+IGFueTtcclxuXHJcbiAgICAgICAgZ2V0IHByb3BlcnR5VHlwZSAoKTogRnVuY3Rpb24ge1xyXG4gICAgICAgICAgICAvL05vdEltcGxlbWVudGVkXHJcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRWYWx1ZSAocm86IGFueSwgaW5kZXg6IG51bWJlcik6IGFueSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLkdldEZ1bmMpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5HZXRGdW5jLmNhbGwocm8sIGluZGV4KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldFZhbHVlIChybzogYW55LCBpbmRleDogbnVtYmVyLCB2YWx1ZTogYW55KSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLlNldEZ1bmMpXHJcbiAgICAgICAgICAgICAgICB0aGlzLlNldEZ1bmMuY2FsbChybywgaW5kZXgsIHZhbHVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN0YXRpYyBmaW5kICh0eXBlT3JPYmopOiBJbmRleGVkUHJvcGVydHlJbmZvIHtcclxuICAgICAgICAgICAgdmFyIG8gPSB0eXBlT3JPYmo7XHJcbiAgICAgICAgICAgIHZhciBpc1R5cGUgPSB0eXBlT3JPYmogaW5zdGFuY2VvZiBGdW5jdGlvbjtcclxuICAgICAgICAgICAgaWYgKGlzVHlwZSlcclxuICAgICAgICAgICAgICAgIG8gPSBuZXcgdHlwZU9yT2JqKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAobyBpbnN0YW5jZW9mIEFycmF5KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGkgPSBuZXcgSW5kZXhlZFByb3BlcnR5SW5mbygpO1xyXG4gICAgICAgICAgICAgICAgcGkuR2V0RnVuYyA9IGZ1bmN0aW9uIChpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzW2luZGV4XTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBwaS5TZXRGdW5jID0gZnVuY3Rpb24gKGluZGV4LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXNbaW5kZXhdID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciBjb2xsID0gSUNvbGxlY3Rpb25fLmFzKG8pO1xyXG4gICAgICAgICAgICBpZiAoY29sbCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHBpID0gbmV3IEluZGV4ZWRQcm9wZXJ0eUluZm8oKTtcclxuICAgICAgICAgICAgICAgIHBpLkdldEZ1bmMgPSBmdW5jdGlvbiAoaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5HZXRWYWx1ZUF0KGluZGV4KTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBwaS5TZXRGdW5jID0gZnVuY3Rpb24gKGluZGV4LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLlNldFZhbHVlQXQoaW5kZXgsIHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcGk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUxpYnJhcnkge1xyXG4gICAgICAgIG5hbWU6IHN0cmluZztcclxuICAgICAgICB1cmk6IFVyaTtcclxuICAgICAgICBzb3VyY2VQYXRoOiBzdHJpbmc7XHJcbiAgICAgICAgdXNlTWluOiBib29sZWFuO1xyXG4gICAgICAgIGV4cG9ydHM6IHN0cmluZztcclxuICAgICAgICBkZXBzOiBzdHJpbmdbXTtcclxuICAgICAgICByb290TW9kdWxlOiBhbnk7XHJcbiAgICAgICAgbG9hZEFzeW5jICgpOiBhc3luYy5JQXN5bmNSZXF1ZXN0PExpYnJhcnk+O1xyXG4gICAgICAgIHJlc29sdmVUeXBlIChtb2R1bGVOYW1lOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgLyogb3V0ICovb3Jlc29sdmU6IElPdXRUeXBlKTogYm9vbGVhbjtcclxuXHJcbiAgICAgICAgYWRkICh0eXBlOiBhbnksIG5hbWU/OiBzdHJpbmcpOiBJTGlicmFyeTtcclxuICAgICAgICBhZGRQcmltaXRpdmUgKHR5cGU6IGFueSwgbmFtZT86IHN0cmluZyk6IElMaWJyYXJ5O1xyXG4gICAgICAgIGFkZEVudW0gKGVudTogYW55LCBuYW1lOiBzdHJpbmcpOiBJTGlicmFyeTtcclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBMaWJyYXJ5IGltcGxlbWVudHMgSUxpYnJhcnkge1xyXG4gICAgICAgIHByaXZhdGUgJCRtb2R1bGU6IGFueSA9IG51bGw7XHJcbiAgICAgICAgcHJpdmF0ZSAkJHNvdXJjZVBhdGg6IHN0cmluZyA9IG51bGw7XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRwcmltdHlwZXM6IGFueSA9IHt9O1xyXG4gICAgICAgIHByaXZhdGUgJCR0eXBlczogYW55ID0ge307XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRsb2FkZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgbmFtZTogc3RyaW5nO1xyXG4gICAgICAgIHVyaTogVXJpO1xyXG4gICAgICAgIGV4cG9ydHM6IHN0cmluZztcclxuICAgICAgICBkZXBzOiBzdHJpbmdbXTtcclxuICAgICAgICB1c2VNaW46IGJvb2xlYW47XHJcblxyXG4gICAgICAgIGdldCBzb3VyY2VQYXRoICgpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICB2YXIgYmFzZSA9IHRoaXMuJCRzb3VyY2VQYXRoIHx8ICdsaWIvJyArIHRoaXMubmFtZSArICcvZGlzdC8nICsgdGhpcy5uYW1lO1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMudXNlTWluKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJhc2U7XHJcbiAgICAgICAgICAgIHJldHVybiBiYXNlICsgXCIubWluXCI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXQgc291cmNlUGF0aCAodmFsdWU6IHN0cmluZykge1xyXG4gICAgICAgICAgICBpZiAodmFsdWUuc3Vic3RyKHZhbHVlLmxlbmd0aCAtIDMpID09PSAnLmpzJylcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuc3Vic3RyKDAsIHZhbHVlLmxlbmd0aCAtIDMpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy51c2VNaW4gJiYgdmFsdWUuc3Vic3RyKHZhbHVlLmxlbmd0aCAtIDQpID09PSBcIi5taW5cIilcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuc3Vic3RyKDAsIHZhbHVlLmxlbmd0aCAtIDQpO1xyXG4gICAgICAgICAgICB0aGlzLiQkc291cmNlUGF0aCA9IHZhbHVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IgKG5hbWU6IHN0cmluZykge1xyXG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJuYW1lXCIsIHt2YWx1ZTogbmFtZSwgd3JpdGFibGU6IGZhbHNlfSk7XHJcbiAgICAgICAgICAgIHZhciB1cmkgPSBuYW1lO1xyXG4gICAgICAgICAgICBpZiAobmFtZS5pbmRleE9mKFwiaHR0cDovL1wiKSAhPT0gMClcclxuICAgICAgICAgICAgICAgIHVyaSA9IFwibGliOi8vXCIgKyBuYW1lO1xyXG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJ1cmlcIiwge3ZhbHVlOiBuZXcgVXJpKHVyaSksIHdyaXRhYmxlOiBmYWxzZX0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0IHJvb3RNb2R1bGUgKCk6IGFueSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLiQkbW9kdWxlID0gdGhpcy4kJG1vZHVsZSB8fCByZXF1aXJlKHRoaXMuc291cmNlUGF0aCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsb2FkQXN5bmMgKCk6IGFzeW5jLklBc3luY1JlcXVlc3Q8TGlicmFyeT4ge1xyXG4gICAgICAgICAgICAvL05PVEU6IElmIHVzaW5nIGh0dHAgbGlicmFyeSBzY2hlbWUgYW5kIGEgY3VzdG9tIHNvdXJjZSBwYXRoIHdhcyBub3Qgc2V0LCB3ZSBhc3N1bWUgdGhlIGxpYnJhcnkgaXMgcHJlbG9hZGVkXHJcbiAgICAgICAgICAgIGlmICghdGhpcy4kJHNvdXJjZVBhdGggJiYgdGhpcy51cmkuc2NoZW1lID09PSBcImh0dHBcIilcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRsb2FkZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kJGxvYWRlZClcclxuICAgICAgICAgICAgICAgIHJldHVybiBhc3luYy5yZXNvbHZlKHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLiRjb25maWdNb2R1bGUoKTtcclxuICAgICAgICAgICAgcmV0dXJuIGFzeW5jLmNyZWF0ZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAoPEZ1bmN0aW9uPnJlcXVpcmUpKFt0aGlzLm5hbWVdLCAocm9vdE1vZHVsZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCRtb2R1bGUgPSByb290TW9kdWxlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCRsb2FkZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9LCAoZXJyKSA9PiByZWplY3QobmV3IExpYnJhcnlMb2FkRXJyb3IodGhpcywgZXJyKSkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJGNvbmZpZ01vZHVsZSAoKSB7XHJcbiAgICAgICAgICAgIHZhciBjbyA9IDxSZXF1aXJlQ29uZmlnPntcclxuICAgICAgICAgICAgICAgIHBhdGhzOiB7fSxcclxuICAgICAgICAgICAgICAgIHNoaW06IHt9LFxyXG4gICAgICAgICAgICAgICAgbWFwOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgXCIqXCI6IHt9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHZhciBzcmNQYXRoID0gdGhpcy5zb3VyY2VQYXRoO1xyXG4gICAgICAgICAgICBjby5wYXRoc1t0aGlzLm5hbWVdID0gc3JjUGF0aDtcclxuICAgICAgICAgICAgY28uc2hpbVt0aGlzLm5hbWVdID0ge1xyXG4gICAgICAgICAgICAgICAgZXhwb3J0czogdGhpcy5leHBvcnRzLFxyXG4gICAgICAgICAgICAgICAgZGVwczogdGhpcy5kZXBzXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGNvLm1hcFsnKiddW3NyY1BhdGhdID0gdGhpcy5uYW1lO1xyXG4gICAgICAgICAgICByZXF1aXJlLmNvbmZpZyhjbyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXNvbHZlVHlwZSAobW9kdWxlTmFtZTogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIC8qIG91dCAqL29yZXNvbHZlOiBJT3V0VHlwZSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAoIW1vZHVsZU5hbWUpIHtcclxuICAgICAgICAgICAgICAgIC8vTGlicmFyeSBVUkk6IGh0dHA6Ly8uLi4vXHJcbiAgICAgICAgICAgICAgICBvcmVzb2x2ZS5pc1ByaW1pdGl2ZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBpZiAoKG9yZXNvbHZlLnR5cGUgPSB0aGlzLiQkcHJpbXR5cGVzW25hbWVdKSAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgb3Jlc29sdmUuaXNQcmltaXRpdmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAob3Jlc29sdmUudHlwZSA9IHRoaXMuJCR0eXBlc1tuYW1lXSkgIT09IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy9MaWJyYXJ5IFVSSTogbGliOi8vLi4uL1xyXG4gICAgICAgICAgICB2YXIgY3VyTW9kdWxlID0gdGhpcy5yb290TW9kdWxlO1xyXG4gICAgICAgICAgICBvcmVzb2x2ZS5pc1ByaW1pdGl2ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBvcmVzb2x2ZS50eXBlID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICBpZiAobW9kdWxlTmFtZSAhPT0gXCIvXCIpIHtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCB0b2tlbnMgPSBtb2R1bGVOYW1lLnN1YnN0cigxKS5zcGxpdCgnLicpOyBpIDwgdG9rZW5zLmxlbmd0aCAmJiAhIWN1ck1vZHVsZTsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3VyTW9kdWxlID0gY3VyTW9kdWxlW3Rva2Vuc1tpXV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCFjdXJNb2R1bGUpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIG9yZXNvbHZlLnR5cGUgPSBjdXJNb2R1bGVbbmFtZV07XHJcbiAgICAgICAgICAgIHZhciB0eXBlID0gb3Jlc29sdmUudHlwZTtcclxuICAgICAgICAgICAgaWYgKHR5cGUgPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgc2V0VHlwZVVyaSh0eXBlLCB0aGlzLnVyaSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWRkICh0eXBlOiBhbnksIG5hbWU/OiBzdHJpbmcpOiBJTGlicmFyeSB7XHJcbiAgICAgICAgICAgIGlmICghdHlwZSlcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkEgdHlwZSBtdXN0IGJlIHNwZWNpZmllZCB3aGVuIHJlZ2lzdGVyaW5nICdcIiArIG5hbWUgKyBcIidgLlwiKTtcclxuICAgICAgICAgICAgbmFtZSA9IG5hbWUgfHwgZ2V0VHlwZU5hbWUodHlwZSk7XHJcbiAgICAgICAgICAgIGlmICghbmFtZSlcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIHR5cGUgbmFtZSBmb3VuZC5cIik7XHJcbiAgICAgICAgICAgIHNldFR5cGVVcmkodHlwZSwgdGhpcy51cmkpO1xyXG4gICAgICAgICAgICB0aGlzLiQkdHlwZXNbbmFtZV0gPSB0eXBlO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFkZFByaW1pdGl2ZSAodHlwZTogYW55LCBuYW1lPzogc3RyaW5nKTogSUxpYnJhcnkge1xyXG4gICAgICAgICAgICBpZiAoIXR5cGUpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBIHR5cGUgbXVzdCBiZSBzcGVjaWZpZWQgd2hlbiByZWdpc3RlcmluZyAnXCIgKyBuYW1lICsgXCInYC5cIik7XHJcbiAgICAgICAgICAgIG5hbWUgPSBuYW1lIHx8IGdldFR5cGVOYW1lKHR5cGUpO1xyXG4gICAgICAgICAgICBpZiAoIW5hbWUpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyB0eXBlIG5hbWUgZm91bmQuXCIpO1xyXG4gICAgICAgICAgICBzZXRUeXBlVXJpKHR5cGUsIHRoaXMudXJpKTtcclxuICAgICAgICAgICAgdGhpcy4kJHByaW10eXBlc1tuYW1lXSA9IHR5cGU7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWRkRW51bSAoZW51OiBhbnksIG5hbWU6IHN0cmluZyk6IElMaWJyYXJ5IHtcclxuICAgICAgICAgICAgdGhpcy5hZGRQcmltaXRpdmUoZW51LCBuYW1lKTtcclxuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGVudSwgXCIkJGVudW1cIiwge3ZhbHVlOiB0cnVlLCB3cml0YWJsZTogZmFsc2V9KTtcclxuICAgICAgICAgICAgZW51Lm5hbWUgPSBuYW1lO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2V0VHlwZVVyaSAodHlwZTogYW55LCB1cmk6IFVyaSkge1xyXG4gICAgICAgIGlmICh0eXBlLiQkdXJpKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHR5cGUsIFwiJCR1cmlcIiwge3ZhbHVlOiB1cmkudG9TdHJpbmcoKSwgZW51bWVyYWJsZTogZmFsc2V9KTtcclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgaW50ZXJmYWNlIElMaWJyYXJ5SGFzaCB7XHJcbiAgICAgICAgW2lkOnN0cmluZ106IElMaWJyYXJ5O1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJTGlicmFyeVJlc29sdmVyIGV4dGVuZHMgSVR5cGVSZXNvbHZlciB7XHJcbiAgICAgICAgbGlicmFyeUNyZWF0ZWQ6IEV2ZW50PElFdmVudEFyZ3M+O1xyXG4gICAgICAgIGxvYWRUeXBlQXN5bmModXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IGFzeW5jLklBc3luY1JlcXVlc3Q8YW55PjtcclxuICAgICAgICByZXNvbHZlKHVyaTogc3RyaW5nKTogSUxpYnJhcnk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJTGlicmFyeUNyZWF0ZWRFdmVudEFyZ3MgZXh0ZW5kcyBJRXZlbnRBcmdzIHtcclxuICAgICAgICBsaWJyYXJ5OiBJTGlicmFyeTtcclxuICAgIH1cclxuXHJcbiAgICAvL05PVEU6XHJcbiAgICAvLyAgTGlicmFyeSBVcmkgc3ludGF4XHJcbiAgICAvLyAgICAgIGh0dHA6Ly8uLi5cclxuICAgIC8vICAgICAgbGliOi8vPGxpYnJhcnk+Wy88bmFtZXNwYWNlPl1cclxuICAgIC8vICAgICAgPGRpcj5cclxuICAgIGV4cG9ydCBjbGFzcyBMaWJyYXJ5UmVzb2x2ZXIgaW1wbGVtZW50cyBJTGlicmFyeVJlc29sdmVyIHtcclxuICAgICAgICBwcml2YXRlICQkbGliczogSUxpYnJhcnlIYXNoID0ge307XHJcblxyXG4gICAgICAgIGxpYnJhcnlDcmVhdGVkID0gbmV3IEV2ZW50KCk7XHJcblxyXG4gICAgICAgIGRpclJlc29sdmVyID0gbmV3IERpclJlc29sdmVyKCk7XHJcblxyXG4gICAgICAgIGNyZWF0ZUxpYnJhcnkgKHVyaTogc3RyaW5nKTogSUxpYnJhcnkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IExpYnJhcnkodXJpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxvYWRUeXBlQXN5bmMgKHVyaTogc3RyaW5nLCBuYW1lOiBzdHJpbmcpOiBhc3luYy5JQXN5bmNSZXF1ZXN0PGFueT4ge1xyXG4gICAgICAgICAgICB2YXIgbGliID0gdGhpcy5yZXNvbHZlKHVyaSk7XHJcbiAgICAgICAgICAgIGlmICghbGliKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGlyUmVzb2x2ZXIubG9hZEFzeW5jKHVyaSwgbmFtZSk7XHJcbiAgICAgICAgICAgIHJldHVybiBhc3luYy5jcmVhdGUoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGliLmxvYWRBc3luYygpXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oKGxpYikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgb3Jlc29sdmUgPSB7aXNQcmltaXRpdmU6IGZhbHNlLCB0eXBlOiB1bmRlZmluZWR9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGliLnJlc29sdmVUeXBlKG51bGwsIG5hbWUsIG9yZXNvbHZlKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUob3Jlc29sdmUudHlwZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUobnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgcmVqZWN0KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXNvbHZlICh1cmk6IHN0cmluZyk6IElMaWJyYXJ5IHtcclxuICAgICAgICAgICAgdmFyIGxpYlVyaSA9IG5ldyBVcmkodXJpKTtcclxuICAgICAgICAgICAgdmFyIHNjaGVtZSA9IGxpYlVyaS5zY2hlbWU7XHJcbiAgICAgICAgICAgIGlmICghc2NoZW1lKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgICAgICB2YXIgbGliTmFtZSA9IChzY2hlbWUgPT09IFwibGliXCIpID8gbGliVXJpLmhvc3QgOiB1cmk7XHJcbiAgICAgICAgICAgIHZhciBsaWIgPSB0aGlzLiQkbGlic1tsaWJOYW1lXTtcclxuICAgICAgICAgICAgaWYgKCFsaWIpIHtcclxuICAgICAgICAgICAgICAgIGxpYiA9IHRoaXMuJCRsaWJzW2xpYk5hbWVdID0gdGhpcy5jcmVhdGVMaWJyYXJ5KGxpYk5hbWUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJG9uTGlicmFyeUNyZWF0ZWQobGliKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gbGliO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVzb2x2ZVR5cGUgKHVyaTogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIC8qIG91dCAqL29yZXNvbHZlOiBJT3V0VHlwZSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICB2YXIgbGliVXJpID0gbmV3IFVyaSh1cmkpO1xyXG4gICAgICAgICAgICB2YXIgc2NoZW1lID0gbGliVXJpLnNjaGVtZTtcclxuICAgICAgICAgICAgaWYgKCFzY2hlbWUpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kaXJSZXNvbHZlci5yZXNvbHZlVHlwZSh1cmksIG5hbWUsIG9yZXNvbHZlKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBsaWJOYW1lID0gKHNjaGVtZSA9PT0gXCJsaWJcIikgPyBsaWJVcmkuaG9zdCA6IHVyaTtcclxuICAgICAgICAgICAgdmFyIG1vZE5hbWUgPSAoc2NoZW1lID09PSBcImxpYlwiKSA/IGxpYlVyaS5hYnNvbHV0ZVBhdGggOiBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgbGliID0gdGhpcy4kJGxpYnNbbGliTmFtZV07XHJcbiAgICAgICAgICAgIGlmICghbGliKSB7XHJcbiAgICAgICAgICAgICAgICBsaWIgPSB0aGlzLiQkbGlic1tsaWJOYW1lXSA9IHRoaXMuY3JlYXRlTGlicmFyeShsaWJOYW1lKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRvbkxpYnJhcnlDcmVhdGVkKGxpYik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGxpYi5yZXNvbHZlVHlwZShtb2ROYW1lLCBuYW1lLCBvcmVzb2x2ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkb25MaWJyYXJ5Q3JlYXRlZCAobGliOiBJTGlicmFyeSkge1xyXG4gICAgICAgICAgICB0aGlzLmxpYnJhcnlDcmVhdGVkLnJhaXNlKHRoaXMsIE9iamVjdC5mcmVlemUoe2xpYnJhcnk6IGxpYn0pKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBjbGFzcyBNZW1vaXplcjxUPiB7XHJcbiAgICAgICAgcHJpdmF0ZSAkJGNyZWF0b3I6IChrZXk6IHN0cmluZykgPT4gVDtcclxuICAgICAgICBwcml2YXRlICQkY2FjaGU6IGFueSA9IHt9O1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvciAoY3JlYXRvcjogKGtleTogc3RyaW5nKSA9PiBUKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJCRjcmVhdG9yID0gY3JlYXRvcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1lbW9pemUgKGtleTogc3RyaW5nKTogVCB7XHJcbiAgICAgICAgICAgIHZhciBvYmogPSB0aGlzLiQkY2FjaGVba2V5XTtcclxuICAgICAgICAgICAgaWYgKCFvYmopXHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkY2FjaGVba2V5XSA9IG9iaiA9IHRoaXMuJCRjcmVhdG9yKGtleSk7XHJcbiAgICAgICAgICAgIHJldHVybiBvYmo7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0UHJvcGVydHlEZXNjcmlwdG9yIChvYmo6IGFueSwgbmFtZTogc3RyaW5nKTogUHJvcGVydHlEZXNjcmlwdG9yIHtcclxuICAgICAgICBpZiAoIW9iailcclxuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgICAgICB2YXIgdHlwZTogRnVuY3Rpb24gPSAoPGFueT5vYmopLmNvbnN0cnVjdG9yO1xyXG4gICAgICAgIHZhciBwcm9wRGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodHlwZS5wcm90b3R5cGUsIG5hbWUpO1xyXG4gICAgICAgIGlmIChwcm9wRGVzYylcclxuICAgICAgICAgICAgcmV0dXJuIHByb3BEZXNjO1xyXG4gICAgICAgIHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwgbmFtZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGhhc1Byb3BlcnR5IChvYmo6IGFueSwgbmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgICAgaWYgKCFvYmopXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KG5hbWUpKVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB2YXIgdHlwZSA9IG9iai5jb25zdHJ1Y3RvcjtcclxuICAgICAgICByZXR1cm4gdHlwZS5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkobmFtZSk7XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSVByb3BlcnR5SW5mbyB7XHJcbiAgICAgICAgbmFtZTogc3RyaW5nO1xyXG4gICAgICAgIGdldFZhbHVlKG9iajogYW55KTogYW55O1xyXG4gICAgICAgIHNldFZhbHVlKG9iajogYW55LCB2YWx1ZTogYW55KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgUHJvcGVydHlJbmZvIGltcGxlbWVudHMgSVByb3BlcnR5SW5mbyB7XHJcbiAgICAgICAgcHJpdmF0ZSAkJGdldEZ1bmM6ICgpID0+IGFueTtcclxuICAgICAgICBwcml2YXRlICQkc2V0RnVuYzogKHZhbHVlOiBhbnkpID0+IGFueTtcclxuXHJcbiAgICAgICAgbmFtZTogc3RyaW5nO1xyXG5cclxuICAgICAgICBnZXRWYWx1ZSAob2JqOiBhbnkpOiBhbnkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kJGdldEZ1bmMpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kJGdldEZ1bmMuY2FsbChvYmopO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0VmFsdWUgKG9iajogYW55LCB2YWx1ZTogYW55KSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLiQkc2V0RnVuYylcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiQkc2V0RnVuYy5jYWxsKG9iaiwgdmFsdWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3RhdGljIGZpbmQgKHR5cGVPck9iajogYW55LCBuYW1lOiBzdHJpbmcpOiBJUHJvcGVydHlJbmZvIHtcclxuICAgICAgICAgICAgdmFyIG8gPSB0eXBlT3JPYmo7XHJcbiAgICAgICAgICAgIHZhciBpc1R5cGUgPSB0eXBlT3JPYmogaW5zdGFuY2VvZiBGdW5jdGlvbjtcclxuICAgICAgICAgICAgaWYgKGlzVHlwZSlcclxuICAgICAgICAgICAgICAgIG8gPSBuZXcgdHlwZU9yT2JqKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIShvIGluc3RhbmNlb2YgT2JqZWN0KSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICAgICAgdmFyIG5hbWVDbG9zdXJlID0gbmFtZTtcclxuICAgICAgICAgICAgdmFyIHByb3BEZXNjID0gZ2V0UHJvcGVydHlEZXNjcmlwdG9yKG8sIG5hbWUpO1xyXG4gICAgICAgICAgICBpZiAocHJvcERlc2MpIHtcclxuICAgICAgICAgICAgICAgIHZhciBwaSA9IG5ldyBQcm9wZXJ0eUluZm8oKTtcclxuICAgICAgICAgICAgICAgIHBpLm5hbWUgPSBuYW1lO1xyXG4gICAgICAgICAgICAgICAgcGkuJCRnZXRGdW5jID0gcHJvcERlc2MuZ2V0O1xyXG4gICAgICAgICAgICAgICAgaWYgKCFwaS4kJGdldEZ1bmMpXHJcbiAgICAgICAgICAgICAgICAgICAgcGkuJCRnZXRGdW5jID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1tuYW1lQ2xvc3VyZV07XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHBpLiQkc2V0RnVuYyA9IHByb3BEZXNjLnNldDtcclxuICAgICAgICAgICAgICAgIGlmICghcGkuJCRzZXRGdW5jICYmIHByb3BEZXNjLndyaXRhYmxlKVxyXG4gICAgICAgICAgICAgICAgICAgIHBpLiQkc2V0RnVuYyA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzW25hbWVDbG9zdXJlXSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcGk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciB0eXBlID0gaXNUeXBlID8gdHlwZU9yT2JqIDogdHlwZU9yT2JqLmNvbnN0cnVjdG9yO1xyXG4gICAgICAgICAgICB2YXIgcGkgPSBuZXcgUHJvcGVydHlJbmZvKCk7XHJcbiAgICAgICAgICAgIHBpLm5hbWUgPSBuYW1lO1xyXG4gICAgICAgICAgICBwaS4kJGdldEZ1bmMgPSB0eXBlLnByb3RvdHlwZVtcIkdldFwiICsgbmFtZV07XHJcbiAgICAgICAgICAgIHBpLiQkc2V0RnVuYyA9IHR5cGUucHJvdG90eXBlW1wiU2V0XCIgKyBuYW1lXTtcclxuICAgICAgICAgICAgcmV0dXJuIHBpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVOYW1lICh0eXBlOiBGdW5jdGlvbik6IHN0cmluZyB7XHJcbiAgICAgICAgdmFyIHQgPSA8YW55PnR5cGU7XHJcbiAgICAgICAgaWYgKCF0KVxyXG4gICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICB2YXIgbmFtZSA9IHQubmFtZTtcclxuICAgICAgICBpZiAobmFtZSlcclxuICAgICAgICAgICAgcmV0dXJuIG5hbWU7XHJcbiAgICAgICAgdmFyIG5hbWUgPSB0LnRvU3RyaW5nKCkubWF0Y2goL2Z1bmN0aW9uIChbXlxcKF0rKS8pWzFdO1xyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0LCBcIm5hbWVcIiwge2VudW1lcmFibGU6IGZhbHNlLCB2YWx1ZTogbmFtZSwgd3JpdGFibGU6IGZhbHNlfSk7XHJcbiAgICAgICAgcmV0dXJuIG5hbWU7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVQYXJlbnQgKHR5cGU6IEZ1bmN0aW9uKTogRnVuY3Rpb24ge1xyXG4gICAgICAgIGlmICh0eXBlID09PSBPYmplY3QpXHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIHZhciBwID0gKDxhbnk+dHlwZSkuJCRwYXJlbnQ7XHJcbiAgICAgICAgaWYgKCFwKSB7XHJcbiAgICAgICAgICAgIGlmICghdHlwZS5wcm90b3R5cGUpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICBwID0gPEZ1bmN0aW9uPk9iamVjdC5nZXRQcm90b3R5cGVPZih0eXBlLnByb3RvdHlwZSkuY29uc3RydWN0b3I7XHJcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0eXBlLCBcIiQkcGFyZW50XCIsIHt2YWx1ZTogcCwgd3JpdGFibGU6IGZhbHNlfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBwO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBhZGRUeXBlSW50ZXJmYWNlcyAodHlwZTogRnVuY3Rpb24sIC4uLmludGVyZmFjZXM6IElJbnRlcmZhY2VEZWNsYXJhdGlvbjxhbnk+W10pIHtcclxuICAgICAgICBpZiAoIWludGVyZmFjZXMpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICBmb3IgKHZhciBqID0gMCwgbGVuID0gaW50ZXJmYWNlcy5sZW5ndGg7IGogPCBsZW47IGorKykge1xyXG4gICAgICAgICAgICBpZiAoIWludGVyZmFjZXNbal0pIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIlJlZ2lzdGVyaW5nIHVuZGVmaW5lZCBpbnRlcmZhY2Ugb24gdHlwZS5cIiwgdHlwZSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodHlwZSwgXCIkJGludGVyZmFjZXNcIiwge3ZhbHVlOiBpbnRlcmZhY2VzLCB3cml0YWJsZTogZmFsc2V9KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZG9lc0luaGVyaXRGcm9tICh0OiBGdW5jdGlvbiwgdHlwZTogYW55KTogYm9vbGVhbiB7XHJcbiAgICAgICAgdmFyIHRlbXAgPSA8RnVuY3Rpb24+PGFueT50O1xyXG4gICAgICAgIHdoaWxlICh0ZW1wICYmIHRlbXAgIT09IHR5cGUpIHtcclxuICAgICAgICAgICAgdGVtcCA9IGdldFR5cGVQYXJlbnQodGVtcCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0ZW1wICE9IG51bGw7XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIHZhciBjb252ZXJ0ZXJzOiBhbnkgPSBbXTtcclxuICAgIGNvbnZlcnRlcnNbPGFueT5Cb29sZWFuXSA9IGZ1bmN0aW9uICh2YWw6IGFueSk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGlmICh2YWwgPT0gbnVsbClcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWwgPT09IFwiYm9vbGVhblwiKVxyXG4gICAgICAgICAgICByZXR1cm4gdmFsO1xyXG4gICAgICAgIHZhciBjID0gdmFsLnRvU3RyaW5nKCkudG9VcHBlckNhc2UoKTtcclxuICAgICAgICByZXR1cm4gYyA9PT0gXCJUUlVFXCIgPyB0cnVlIDogKGMgPT09IFwiRkFMU0VcIiA/IGZhbHNlIDogbnVsbCk7XHJcbiAgICB9O1xyXG4gICAgY29udmVydGVyc1s8YW55PlN0cmluZ10gPSBmdW5jdGlvbiAodmFsOiBhbnkpOiBTdHJpbmcge1xyXG4gICAgICAgIGlmICh2YWwgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgcmV0dXJuIHZhbC50b1N0cmluZygpO1xyXG4gICAgfTtcclxuICAgIGNvbnZlcnRlcnNbPGFueT5OdW1iZXJdID0gZnVuY3Rpb24gKHZhbDogYW55KTogTnVtYmVyIHtcclxuICAgICAgICBpZiAoIXZhbCkgcmV0dXJuIDA7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWwgPT09IFwibnVtYmVyXCIpXHJcbiAgICAgICAgICAgIHJldHVybiB2YWw7XHJcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQodmFsLnRvU3RyaW5nKCkpO1xyXG4gICAgfTtcclxuICAgIGNvbnZlcnRlcnNbPGFueT5EYXRlXSA9IGZ1bmN0aW9uICh2YWw6IGFueSk6IERhdGUge1xyXG4gICAgICAgIGlmICh2YWwgPT0gbnVsbClcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKDApO1xyXG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSh2YWwudG9TdHJpbmcoKSk7XHJcbiAgICB9O1xyXG4gICAgY29udmVydGVyc1s8YW55PlJlZ0V4cF0gPSBmdW5jdGlvbiAodmFsOiBhbnkpOiBSZWdFeHAge1xyXG4gICAgICAgIGlmICh2YWwgaW5zdGFuY2VvZiBSZWdFeHApXHJcbiAgICAgICAgICAgIHJldHVybiB2YWw7XHJcbiAgICAgICAgaWYgKHZhbCA9IG51bGwpXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBzcGVjaWZ5IGFuIGVtcHR5IFJlZ0V4cC5cIik7XHJcbiAgICAgICAgdmFsID0gdmFsLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBSZWdFeHAodmFsKTtcclxuICAgIH07XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRBbnlUb1R5cGUgKHZhbDogYW55LCB0eXBlOiBGdW5jdGlvbik6IGFueSB7XHJcbiAgICAgICAgdmFyIGNvbnZlcnRlcjogKHZhbDogYW55KSA9PiBhbnkgPSAoPGFueT5jb252ZXJ0ZXJzKVs8YW55PnR5cGVdO1xyXG4gICAgICAgIGlmIChjb252ZXJ0ZXIpXHJcbiAgICAgICAgICAgIHJldHVybiBjb252ZXJ0ZXIodmFsKTtcclxuICAgICAgICBpZiAodHlwZSBpbnN0YW5jZW9mIEVudW0pIHtcclxuICAgICAgICAgICAgdmFyIGVudW1vID0gKDxFbnVtPjxhbnk+dHlwZSkuT2JqZWN0O1xyXG4gICAgICAgICAgICBpZiAoZW51bW8uQ29udmVydGVyKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVudW1vLkNvbnZlcnRlcih2YWwpO1xyXG4gICAgICAgICAgICB2YWwgPSB2YWwgfHwgMDtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWwgPT09IFwic3RyaW5nXCIpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZW51bW9bdmFsXTtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbDtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY29udmVydFN0cmluZ1RvRW51bTxUPiAodmFsOiBzdHJpbmcsIGVuOiBhbnkpOiBUIHtcclxuICAgICAgICBpZiAoIXZhbClcclxuICAgICAgICAgICAgcmV0dXJuIDxUPjxhbnk+MDtcclxuICAgICAgICByZXR1cm4gPFQ+ZW5bdmFsXTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJUeXBlQ29udmVydGVyICh0eXBlOiBGdW5jdGlvbiwgY29udmVydGVyOiAodmFsOiBhbnkpID0+IGFueSkge1xyXG4gICAgICAgIGNvbnZlcnRlcnNbPGFueT50eXBlXSA9IGNvbnZlcnRlcjtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJFbnVtQ29udmVydGVyIChlOiBhbnksIGNvbnZlcnRlcjogKHZhbDogYW55KSA9PiBhbnkpIHtcclxuICAgICAgICBlLkNvbnZlcnRlciA9IGNvbnZlcnRlcjtcclxuICAgIH1cclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJjb252ZXJzaW9uXCIgLz5cclxuXHJcbm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGVudW0gVXJpS2luZCB7XHJcbiAgICAgICAgUmVsYXRpdmVPckFic29sdXRlID0gMCxcclxuICAgICAgICBBYnNvbHV0ZSA9IDEsXHJcbiAgICAgICAgUmVsYXRpdmUgPSAyXHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgVXJpIHtcclxuICAgICAgICBwcml2YXRlICQkb3JpZ2luYWxTdHJpbmc6IHN0cmluZztcclxuICAgICAgICBwcml2YXRlICQka2luZDogVXJpS2luZDtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IgKHVyaTogVXJpKTtcclxuICAgICAgICBjb25zdHJ1Y3RvciAodXJpOiBzdHJpbmcsIGtpbmQ/OiBVcmlLaW5kKTtcclxuICAgICAgICBjb25zdHJ1Y3RvciAodXJpPzogYW55LCBraW5kPzogVXJpS2luZCkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHVyaSA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJG9yaWdpbmFsU3RyaW5nID0gdXJpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJGtpbmQgPSBraW5kIHx8IFVyaUtpbmQuUmVsYXRpdmVPckFic29sdXRlO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHVyaSBpbnN0YW5jZW9mIFVyaSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJG9yaWdpbmFsU3RyaW5nID0gKDxVcmk+dXJpKS4kJG9yaWdpbmFsU3RyaW5nO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJGtpbmQgPSAoPFVyaT51cmkpLiQka2luZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0IGtpbmQgKCk6IFVyaUtpbmQge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy4kJGtpbmQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXQgaG9zdCAoKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgdmFyIHMgPSB0aGlzLiQkb3JpZ2luYWxTdHJpbmc7XHJcbiAgICAgICAgICAgIHZhciBpbmQgPSBNYXRoLm1heCgzLCBzLmluZGV4T2YoXCI6Ly9cIikgKyAzKTtcclxuICAgICAgICAgICAgdmFyIGVuZCA9IHMuaW5kZXhPZihcIi9cIiwgaW5kKTtcclxuICAgICAgICAgICAgLy9UT0RPOiBTdHJpcCBwb3J0XHJcbiAgICAgICAgICAgIHJldHVybiAoZW5kIDwgMCkgPyBzLnN1YnN0cihpbmQpIDogcy5zdWJzdHIoaW5kLCBlbmQgLSBpbmQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0IGFic29sdXRlUGF0aCAoKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgdmFyIHMgPSB0aGlzLiQkb3JpZ2luYWxTdHJpbmc7XHJcbiAgICAgICAgICAgIHZhciBpbmQgPSBNYXRoLm1heCgzLCBzLmluZGV4T2YoXCI6Ly9cIikgKyAzKTtcclxuICAgICAgICAgICAgdmFyIHN0YXJ0ID0gcy5pbmRleE9mKFwiL1wiLCBpbmQpO1xyXG4gICAgICAgICAgICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0IDwgaW5kKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiL1wiO1xyXG4gICAgICAgICAgICB2YXIgcXN0YXJ0ID0gcy5pbmRleE9mKFwiP1wiLCBzdGFydCk7XHJcbiAgICAgICAgICAgIGlmIChxc3RhcnQgPCAwIHx8IHFzdGFydCA8IHN0YXJ0KVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHMuc3Vic3RyKHN0YXJ0KTtcclxuICAgICAgICAgICAgcmV0dXJuIHMuc3Vic3RyKHN0YXJ0LCBxc3RhcnQgLSBzdGFydCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXQgc2NoZW1lICgpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICB2YXIgcyA9IHRoaXMuJCRvcmlnaW5hbFN0cmluZztcclxuICAgICAgICAgICAgdmFyIGluZCA9IHMuaW5kZXhPZihcIjovL1wiKTtcclxuICAgICAgICAgICAgaWYgKGluZCA8IDApXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgcmV0dXJuIHMuc3Vic3RyKDAsIGluZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXQgZnJhZ21lbnQgKCk6IHN0cmluZyB7XHJcbiAgICAgICAgICAgIHZhciBzID0gdGhpcy4kJG9yaWdpbmFsU3RyaW5nO1xyXG4gICAgICAgICAgICB2YXIgaW5kID0gcy5pbmRleE9mKFwiI1wiKTtcclxuICAgICAgICAgICAgaWYgKGluZCA8IDApXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgcmV0dXJuIHMuc3Vic3RyKGluZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXQgb3JpZ2luYWxTdHJpbmcgKCk6IHN0cmluZyB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLiQkb3JpZ2luYWxTdHJpbmcudG9TdHJpbmcoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRvU3RyaW5nICgpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy4kJG9yaWdpbmFsU3RyaW5nLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBlcXVhbHMgKG90aGVyOiBVcmkpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuJCRvcmlnaW5hbFN0cmluZyA9PT0gb3RoZXIuJCRvcmlnaW5hbFN0cmluZztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN0YXRpYyBpc051bGxPckVtcHR5ICh1cmk6IFVyaSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAodXJpID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgcmV0dXJuICF1cmkuJCRvcmlnaW5hbFN0cmluZztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZWdpc3RlclR5cGVDb252ZXJ0ZXIoVXJpLCAodmFsOiBhbnkpOiBhbnkgPT4ge1xyXG4gICAgICAgIGlmICh2YWwgPT0gbnVsbClcclxuICAgICAgICAgICAgdmFsID0gXCJcIjtcclxuICAgICAgICByZXR1cm4gbmV3IFVyaSh2YWwudG9TdHJpbmcoKSk7XHJcbiAgICB9KTtcclxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJVcmlcIiAvPlxyXG5cclxubW9kdWxlIG51bGxzdG9uZSB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElPdXRUeXBlIHtcclxuICAgICAgICB0eXBlOiBhbnk7XHJcbiAgICAgICAgaXNQcmltaXRpdmU6IGJvb2xlYW47XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJVHlwZU1hbmFnZXIge1xyXG4gICAgICAgIGRlZmF1bHRVcmk6IHN0cmluZztcclxuICAgICAgICB4VXJpOiBzdHJpbmc7XHJcbiAgICAgICAgcmVzb2x2ZUxpYnJhcnkgKHVyaTogc3RyaW5nKTogSUxpYnJhcnk7XHJcbiAgICAgICAgbG9hZFR5cGVBc3luYyAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IGFzeW5jLklBc3luY1JlcXVlc3Q8YW55PjtcclxuICAgICAgICByZXNvbHZlVHlwZSh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nLCAvKiBvdXQgKi9vcmVzb2x2ZTogSU91dFR5cGUpOiBib29sZWFuO1xyXG4gICAgICAgIGFkZCAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgdHlwZTogYW55KTogSVR5cGVNYW5hZ2VyO1xyXG4gICAgICAgIGFkZFByaW1pdGl2ZSAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgdHlwZTogYW55KTogSVR5cGVNYW5hZ2VyO1xyXG4gICAgICAgIGFkZEVudW0gKHVyaTogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIGVudTogYW55KTogSVR5cGVNYW5hZ2VyO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIFR5cGVNYW5hZ2VyIGltcGxlbWVudHMgSVR5cGVNYW5hZ2VyIHtcclxuICAgICAgICBsaWJSZXNvbHZlcjogSUxpYnJhcnlSZXNvbHZlciA9IG5ldyBMaWJyYXJ5UmVzb2x2ZXIoKTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IgKHB1YmxpYyBkZWZhdWx0VXJpOiBzdHJpbmcsIHB1YmxpYyB4VXJpOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgdGhpcy5saWJSZXNvbHZlci5yZXNvbHZlKGRlZmF1bHRVcmkpXHJcbiAgICAgICAgICAgICAgICAuYWRkKEFycmF5LCBcIkFycmF5XCIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5saWJSZXNvbHZlci5yZXNvbHZlKHhVcmkpXHJcbiAgICAgICAgICAgICAgICAuYWRkUHJpbWl0aXZlKFN0cmluZywgXCJTdHJpbmdcIilcclxuICAgICAgICAgICAgICAgIC5hZGRQcmltaXRpdmUoTnVtYmVyLCBcIk51bWJlclwiKVxyXG4gICAgICAgICAgICAgICAgLmFkZFByaW1pdGl2ZShOdW1iZXIsIFwiRG91YmxlXCIpXHJcbiAgICAgICAgICAgICAgICAuYWRkUHJpbWl0aXZlKERhdGUsIFwiRGF0ZVwiKVxyXG4gICAgICAgICAgICAgICAgLmFkZFByaW1pdGl2ZShSZWdFeHAsIFwiUmVnRXhwXCIpXHJcbiAgICAgICAgICAgICAgICAuYWRkUHJpbWl0aXZlKEJvb2xlYW4sIFwiQm9vbGVhblwiKVxyXG4gICAgICAgICAgICAgICAgLmFkZFByaW1pdGl2ZShVcmksIFwiVXJpXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVzb2x2ZUxpYnJhcnkgKHVyaTogc3RyaW5nKTogSUxpYnJhcnkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5saWJSZXNvbHZlci5yZXNvbHZlKHVyaSB8fCB0aGlzLmRlZmF1bHRVcmkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZFR5cGVBc3luYyAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IGFzeW5jLklBc3luY1JlcXVlc3Q8YW55PiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxpYlJlc29sdmVyLmxvYWRUeXBlQXN5bmModXJpIHx8IHRoaXMuZGVmYXVsdFVyaSwgbmFtZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXNvbHZlVHlwZSAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgLyogb3V0ICovb3Jlc29sdmU6IElPdXRUeXBlKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIG9yZXNvbHZlLmlzUHJpbWl0aXZlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIG9yZXNvbHZlLnR5cGUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxpYlJlc29sdmVyLnJlc29sdmVUeXBlKHVyaSB8fCB0aGlzLmRlZmF1bHRVcmksIG5hbWUsIG9yZXNvbHZlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFkZCAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgdHlwZTogYW55KTogSVR5cGVNYW5hZ2VyIHtcclxuICAgICAgICAgICAgdmFyIGxpYiA9IHRoaXMubGliUmVzb2x2ZXIucmVzb2x2ZSh1cmkgfHwgdGhpcy5kZWZhdWx0VXJpKTtcclxuICAgICAgICAgICAgaWYgKGxpYilcclxuICAgICAgICAgICAgICAgIGxpYi5hZGQodHlwZSwgbmFtZSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWRkUHJpbWl0aXZlICh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nLCB0eXBlOiBhbnkpOiBJVHlwZU1hbmFnZXIge1xyXG4gICAgICAgICAgICB2YXIgbGliID0gdGhpcy5saWJSZXNvbHZlci5yZXNvbHZlKHVyaSB8fCB0aGlzLmRlZmF1bHRVcmkpO1xyXG4gICAgICAgICAgICBpZiAobGliKVxyXG4gICAgICAgICAgICAgICAgbGliLmFkZFByaW1pdGl2ZSh0eXBlLCBuYW1lKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhZGRFbnVtICh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nLCBlbnU6IGFueSk6IElUeXBlTWFuYWdlciB7XHJcbiAgICAgICAgICAgIHZhciBsaWIgPSB0aGlzLmxpYlJlc29sdmVyLnJlc29sdmUodXJpIHx8IHRoaXMuZGVmYXVsdFVyaSk7XHJcbiAgICAgICAgICAgIGlmIChsaWIpXHJcbiAgICAgICAgICAgICAgICBsaWIuYWRkRW51bShlbnUsIG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGludGVyZmFjZSBBbm5vdGF0ZWRUeXBlIGV4dGVuZHMgRnVuY3Rpb24ge1xyXG4gICAgICAgICQkYW5ub3RhdGlvbnM6IGFueVtdW107XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIEFubm90YXRpb24gKHR5cGU6IEZ1bmN0aW9uLCBuYW1lOiBzdHJpbmcsIHZhbHVlOiBhbnksIGZvcmJpZE11bHRpcGxlPzogYm9vbGVhbikge1xyXG4gICAgICAgIHZhciBhdCA9IDxBbm5vdGF0ZWRUeXBlPnR5cGU7XHJcbiAgICAgICAgdmFyIGFubnM6IGFueVtdW10gPSBhdC4kJGFubm90YXRpb25zO1xyXG4gICAgICAgIGlmICghYW5ucylcclxuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGF0LCBcIiQkYW5ub3RhdGlvbnNcIiwge3ZhbHVlOiAoYW5ucyA9IFtdKSwgd3JpdGFibGU6IGZhbHNlfSk7XHJcbiAgICAgICAgdmFyIGFubjogYW55W10gPSBhbm5zW25hbWVdO1xyXG4gICAgICAgIGlmICghYW5uKVxyXG4gICAgICAgICAgICBhbm5zW25hbWVdID0gYW5uID0gW107XHJcbiAgICAgICAgaWYgKGZvcmJpZE11bHRpcGxlICYmIGFubi5sZW5ndGggPiAwKVxyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IDEgJ1wiICsgbmFtZSArIFwiJyBhbm5vdGF0aW9uIGFsbG93ZWQgcGVyIHR5cGUgW1wiICsgZ2V0VHlwZU5hbWUodHlwZSkgKyBcIl0uXCIpO1xyXG4gICAgICAgIGFubi5wdXNoKHZhbHVlKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gR2V0QW5ub3RhdGlvbnMgKHR5cGU6IEZ1bmN0aW9uLCBuYW1lOiBzdHJpbmcpOiBhbnlbXSB7XHJcbiAgICAgICAgdmFyIGF0ID0gPEFubm90YXRlZFR5cGU+dHlwZTtcclxuICAgICAgICB2YXIgYW5uczogYW55W11bXSA9IGF0LiQkYW5ub3RhdGlvbnM7XHJcbiAgICAgICAgaWYgKCFhbm5zKVxyXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgIHJldHVybiAoYW5uc1tuYW1lXSB8fCBbXSkuc2xpY2UoMCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJVHlwZWRBbm5vdGF0aW9uPFQ+IHtcclxuICAgICAgICAodHlwZTogRnVuY3Rpb24sIC4uLnZhbHVlczogVFtdKTtcclxuICAgICAgICBHZXQodHlwZTogRnVuY3Rpb24pOiBUW107XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gQ3JlYXRlVHlwZWRBbm5vdGF0aW9uPFQ+KG5hbWU6IHN0cmluZyk6IElUeXBlZEFubm90YXRpb248VD4ge1xyXG4gICAgICAgIGZ1bmN0aW9uIHRhICh0eXBlOiBGdW5jdGlvbiwgLi4udmFsdWVzOiBUW10pIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHZhbHVlcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgQW5ub3RhdGlvbih0eXBlLCBuYW1lLCB2YWx1ZXNbaV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAoPGFueT50YSkuR2V0ID0gZnVuY3Rpb24gKHR5cGU6IEZ1bmN0aW9uKTogVFtdIHtcclxuICAgICAgICAgICAgcmV0dXJuIEdldEFubm90YXRpb25zKHR5cGUsIG5hbWUpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIDxJVHlwZWRBbm5vdGF0aW9uPFQ+PnRhO1xyXG4gICAgfVxyXG59IiwibW9kdWxlIG51bGxzdG9uZS5hc3luYyB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElBc3luY1JlcXVlc3Q8VD4ge1xyXG4gICAgICAgIHRoZW4oc3VjY2VzczogKHJlc3VsdDogVCkgPT4gYW55LCBlcnJvcmVkPzogKGVycm9yOiBhbnkpID0+IGFueSk6IElBc3luY1JlcXVlc3Q8VD47XHJcbiAgICB9XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElBc3luY1Jlc29sdXRpb248VD4ge1xyXG4gICAgICAgIChyZXNvbHZlOiAocmVzdWx0OiBUKSA9PiBhbnksIHJlamVjdDogKGVycm9yOiBhbnkpID0+IGFueSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZSA8VD4ocmVzb2x1dGlvbjogSUFzeW5jUmVzb2x1dGlvbjxUPik6IElBc3luY1JlcXVlc3Q8VD4ge1xyXG4gICAgICAgIHZhciBvblN1Y2Nlc3M6IChyZXN1bHQ6IFQpPT5hbnk7XHJcbiAgICAgICAgdmFyIG9uRXJyb3I6IChlcnJvcjogYW55KT0+YW55O1xyXG5cclxuICAgICAgICB2YXIgcmVzb2x2ZWRSZXN1bHQ6IGFueTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gcmVzb2x2ZSAocmVzdWx0OiBUKSB7XHJcbiAgICAgICAgICAgIHJlc29sdmVkUmVzdWx0ID0gcmVzdWx0O1xyXG4gICAgICAgICAgICBvblN1Y2Nlc3MgJiYgb25TdWNjZXNzKHJlc3VsdCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgcmVzb2x2ZWRFcnJvcjogYW55O1xyXG5cclxuICAgICAgICBmdW5jdGlvbiByZWplY3QgKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmVzb2x2ZWRFcnJvciA9IGVycm9yO1xyXG4gICAgICAgICAgICBvbkVycm9yICYmIG9uRXJyb3IoZXJyb3IpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVzb2x1dGlvbihyZXNvbHZlLCByZWplY3QpO1xyXG5cclxuICAgICAgICB2YXIgcmVxID0gPElBc3luY1JlcXVlc3Q8VD4+e1xyXG4gICAgICAgICAgICB0aGVuOiBmdW5jdGlvbiAoc3VjY2VzczogKHJlc3VsdDogVCkgPT4gYW55LCBlcnJvcmVkPzogKGVycm9yOiBhbnkpID0+IGFueSk6IElBc3luY1JlcXVlc3Q8VD4ge1xyXG4gICAgICAgICAgICAgICAgb25TdWNjZXNzID0gc3VjY2VzcztcclxuICAgICAgICAgICAgICAgIG9uRXJyb3IgPSBlcnJvcmVkO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlc29sdmVkUmVzdWx0ICE9PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgb25TdWNjZXNzICYmIG9uU3VjY2VzcyhyZXNvbHZlZFJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChyZXNvbHZlZEVycm9yICE9PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgb25FcnJvciAmJiBvbkVycm9yKHJlc29sdmVkRXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIHJlcTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcmVzb2x2ZTxUPihvYmo6IFQpOiBJQXN5bmNSZXF1ZXN0PFQ+IHtcclxuICAgICAgICByZXR1cm4gYXN5bmMuY3JlYXRlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgcmVzb2x2ZShvYmopO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZWplY3Q8VD4oZXJyOiBhbnkpOiBJQXN5bmNSZXF1ZXN0PFQ+IHtcclxuICAgICAgICByZXR1cm4gYXN5bmMuY3JlYXRlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIG1hbnk8VD4oYXJyOiBJQXN5bmNSZXF1ZXN0PFQ+W10pOiBJQXN5bmNSZXF1ZXN0PFRbXT4ge1xyXG4gICAgICAgIGlmICghYXJyIHx8IGFyci5sZW5ndGggPCAxKVxyXG4gICAgICAgICAgICByZXR1cm4gcmVzb2x2ZTxUW10+KFtdKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGNyZWF0ZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIHZhciByZXNvbHZlczogVFtdID0gbmV3IEFycmF5KGFyci5sZW5ndGgpO1xyXG4gICAgICAgICAgICB2YXIgZXJyb3JzOiBhbnlbXSA9IG5ldyBBcnJheShhcnIubGVuZ3RoKTtcclxuICAgICAgICAgICAgdmFyIGZpbmlzaGVkID0gMDtcclxuICAgICAgICAgICAgdmFyIGNvdW50ID0gYXJyLmxlbmd0aDtcclxuICAgICAgICAgICAgdmFyIGFueWVycm9ycyA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gY29tcGxldGVTaW5nbGUgKGk6IG51bWJlciwgcmVzOiBULCBlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZXNbaV0gPSByZXM7XHJcbiAgICAgICAgICAgICAgICBlcnJvcnNbaV0gPSBlcnI7XHJcbiAgICAgICAgICAgICAgICBhbnllcnJvcnMgPSBhbnllcnJvcnMgfHwgZXJyICE9PSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICBmaW5pc2hlZCsrO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZpbmlzaGVkID49IGNvdW50KVxyXG4gICAgICAgICAgICAgICAgICAgIGFueWVycm9ycyA/IHJlamVjdChuZXcgQWdncmVnYXRlRXJyb3IoZXJyb3JzKSkgOiByZXNvbHZlKHJlc29sdmVzKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBhcnJbaV0udGhlbihyZXNpID0+IGNvbXBsZXRlU2luZ2xlKGksIHJlc2ksIHVuZGVmaW5lZCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycmkgPT4gY29tcGxldGVTaW5nbGUoaSwgdW5kZWZpbmVkLCBlcnJpKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgLy9UT0RPOiBDaGVjayBpbnN0YW5jZXMgaW4gRmF5ZGUgLkVxdWFsc1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGVxdWFscyAodmFsMTogYW55LCB2YWwyOiBhbnkpOiBib29sZWFuIHtcclxuICAgICAgICBpZiAodmFsMSA9PSBudWxsICYmIHZhbDIgPT0gbnVsbClcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgaWYgKHZhbDEgPT0gbnVsbCB8fCB2YWwyID09IG51bGwpXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICBpZiAodmFsMSA9PT0gdmFsMilcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgcmV0dXJuICEhdmFsMS5lcXVhbHMgJiYgdmFsMS5lcXVhbHModmFsMik7XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBjbGFzcyBBZ2dyZWdhdGVFcnJvciB7XHJcbiAgICAgICAgZXJyb3JzOiBhbnlbXTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IgKGVycm9yczogYW55W10pIHtcclxuICAgICAgICAgICAgdGhpcy5lcnJvcnMgPSBlcnJvcnMuZmlsdGVyKGUgPT4gISFlKTtcclxuICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZSh0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldCBmbGF0ICgpOiBhbnlbXSB7XHJcbiAgICAgICAgICAgIHZhciBmbGF0OiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgZXJycyA9IHRoaXMuZXJyb3JzOyBpIDwgZXJycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIGVyciA9IGVycnNbaV07XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgQWdncmVnYXRlRXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBmbGF0ID0gZmxhdC5jb25jYXQoKDxBZ2dyZWdhdGVFcnJvcj5lcnIpLmZsYXQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBmbGF0LnB1c2goZXJyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZmxhdDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lIHtcclxuICAgIGV4cG9ydCBjbGFzcyBEaXJMb2FkRXJyb3Ige1xyXG4gICAgICAgIGNvbnN0cnVjdG9yIChwdWJsaWMgcGF0aDogc3RyaW5nLCBwdWJsaWMgZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKHRoaXMpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUge1xyXG4gICAgZXhwb3J0IGNsYXNzIExpYnJhcnlMb2FkRXJyb3Ige1xyXG4gICAgICAgIGNvbnN0cnVjdG9yIChwdWJsaWMgbGlicmFyeTogTGlicmFyeSwgcHVibGljIGVycm9yOiBFcnJvcikge1xyXG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKHRoaXMpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUubWFya3VwIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSU1hcmt1cEV4dGVuc2lvbiB7XHJcbiAgICAgICAgaW5pdCh2YWw6IHN0cmluZyk7XHJcbiAgICAgICAgcmVzb2x2ZVR5cGVGaWVsZHM/KHJlc29sdmVyOiAoZnVsbDogc3RyaW5nKSA9PiBhbnkpO1xyXG4gICAgICAgIHRyYW5zbXV0ZT8ob3M6IGFueVtdKTogYW55O1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBmaW5pc2hNYXJrdXBFeHRlbnNpb24gKG1lOiBJTWFya3VwRXh0ZW5zaW9uLCBwcmVmaXhSZXNvbHZlcjogSU5zUHJlZml4UmVzb2x2ZXIsIHJlc29sdmVyOiBldmVudHMuSVJlc29sdmVUeXBlLCBvczogYW55W10pOiBhbnkge1xyXG4gICAgICAgIGlmICghbWUpXHJcbiAgICAgICAgICAgIHJldHVybiBtZTtcclxuICAgICAgICBpZiAodHlwZW9mIG1lLnJlc29sdmVUeXBlRmllbGRzID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICAgICAgbWUucmVzb2x2ZVR5cGVGaWVsZHMoKGZ1bGwpID0+IHBhcnNlVHlwZShmdWxsLCBwcmVmaXhSZXNvbHZlciwgcmVzb2x2ZXIpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHR5cGVvZiBtZS50cmFuc211dGUgPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgICAgICByZXR1cm4gbWUudHJhbnNtdXRlKG9zKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG1lO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhcnNlVHlwZSAoZnVsbDogc3RyaW5nLCBwcmVmaXhSZXNvbHZlcjogSU5zUHJlZml4UmVzb2x2ZXIsIHJlc29sdmVyOiBldmVudHMuSVJlc29sdmVUeXBlKSB7XHJcbiAgICAgICAgdmFyIHByZWZpeDogc3RyaW5nID0gbnVsbDtcclxuICAgICAgICB2YXIgbmFtZSA9IGZ1bGw7XHJcbiAgICAgICAgdmFyIGluZCA9IG5hbWUuaW5kZXhPZihcIjpcIik7XHJcbiAgICAgICAgaWYgKGluZCA+IC0xKSB7XHJcbiAgICAgICAgICAgIHByZWZpeCA9IG5hbWUuc3Vic3RyKDAsIGluZCk7XHJcbiAgICAgICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cihpbmQgKyAxKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHVyaSA9IHByZWZpeFJlc29sdmVyLmxvb2t1cE5hbWVzcGFjZVVSSShwcmVmaXgpO1xyXG4gICAgICAgIHZhciBvcnQgPSByZXNvbHZlcih1cmksIG5hbWUpO1xyXG4gICAgICAgIHJldHVybiBvcnQudHlwZTtcclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUubWFya3VwIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSU1hcmt1cFBhcnNlcjxUPiB7XHJcbiAgICAgICAgb24obGlzdGVuZXI6IElNYXJrdXBTYXg8VD4pOiBJTWFya3VwUGFyc2VyPFQ+XHJcbiAgICAgICAgc2V0TmFtZXNwYWNlcyAoZGVmYXVsdFhtbG5zOiBzdHJpbmcsIHhYbWxuczogc3RyaW5nKTogSU1hcmt1cFBhcnNlcjxUPjtcclxuICAgICAgICBzZXRFeHRlbnNpb25QYXJzZXIgKHBhcnNlcjogSU1hcmt1cEV4dGVuc2lvblBhcnNlcik6IElNYXJrdXBQYXJzZXI8VD47XHJcbiAgICAgICAgcGFyc2Uocm9vdDogVCk7XHJcbiAgICAgICAgc2tpcEJyYW5jaCgpO1xyXG4gICAgICAgIHJlc29sdmVQcmVmaXggKHByZWZpeDogc3RyaW5nKTogc3RyaW5nO1xyXG4gICAgICAgIHdhbGtVcE9iamVjdHMgKCk6IElFbnVtZXJhdG9yPGFueT47XHJcbiAgICB9XHJcbiAgICBleHBvcnQgdmFyIE5PX1BBUlNFUjogSU1hcmt1cFBhcnNlcjxhbnk+ID0ge1xyXG4gICAgICAgIG9uIChsaXN0ZW5lcjogSU1hcmt1cFNheDxhbnk+KTogSU1hcmt1cFBhcnNlcjxhbnk+IHtcclxuICAgICAgICAgICAgcmV0dXJuIE5PX1BBUlNFUjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldE5hbWVzcGFjZXMgKGRlZmF1bHRYbWxuczogc3RyaW5nLCB4WG1sbnM6IHN0cmluZyk6IElNYXJrdXBQYXJzZXI8YW55PiB7XHJcbiAgICAgICAgICAgIHJldHVybiBOT19QQVJTRVI7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXRFeHRlbnNpb25QYXJzZXIgKHBhcnNlcjogSU1hcmt1cEV4dGVuc2lvblBhcnNlcik6IElNYXJrdXBQYXJzZXI8YW55PiB7XHJcbiAgICAgICAgICAgIHJldHVybiBOT19QQVJTRVI7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBwYXJzZSAocm9vdDogYW55KSB7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBza2lwQnJhbmNoICgpOiBhbnkge1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVzb2x2ZVByZWZpeCAocHJlZml4OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHdhbGtVcE9iamVjdHMgKCk6IElFbnVtZXJhdG9yPGFueT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gSUVudW1lcmF0b3JfLmVtcHR5O1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSU1hcmt1cFNheDxUPiB7XHJcbiAgICAgICAgcmVzb2x2ZVR5cGU/OiBldmVudHMuSVJlc29sdmVUeXBlO1xyXG4gICAgICAgIHJlc29sdmVPYmplY3Q/OiBldmVudHMuSVJlc29sdmVPYmplY3Q7XHJcbiAgICAgICAgcmVzb2x2ZVByaW1pdGl2ZT86IGV2ZW50cy5JUmVzb2x2ZVByaW1pdGl2ZTtcclxuICAgICAgICByZXNvbHZlUmVzb3VyY2VzPzogZXZlbnRzLklSZXNvbHZlUmVzb3VyY2VzO1xyXG4gICAgICAgIGJyYW5jaFNraXA/OiBldmVudHMuSUJyYW5jaFNraXA8VD47XHJcbiAgICAgICAgb2JqZWN0PzogZXZlbnRzLklPYmplY3Q7XHJcbiAgICAgICAgb2JqZWN0RW5kPzogZXZlbnRzLklPYmplY3RFbmQ7XHJcbiAgICAgICAgY29udGVudFRleHQ/OiBldmVudHMuSVRleHQ7XHJcbiAgICAgICAgbmFtZT86IGV2ZW50cy5JTmFtZTtcclxuICAgICAgICBwcm9wZXJ0eVN0YXJ0PzogZXZlbnRzLklQcm9wZXJ0eVN0YXJ0O1xyXG4gICAgICAgIHByb3BlcnR5RW5kPzogZXZlbnRzLklQcm9wZXJ0eUVuZDtcclxuICAgICAgICBhdHRyaWJ1dGVTdGFydD86IGV2ZW50cy5JQXR0cmlidXRlU3RhcnQ7XHJcbiAgICAgICAgYXR0cmlidXRlRW5kPzogZXZlbnRzLklBdHRyaWJ1dGVFbmQ7XHJcbiAgICAgICAgZXJyb3I/OiBldmVudHMuSVJlc3VtYWJsZUVycm9yO1xyXG4gICAgICAgIGVuZD86ICgpID0+IGFueTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgb3Jlc29sdmU6IElPdXRUeXBlID0ge1xyXG4gICAgICAgIGlzUHJpbWl0aXZlOiBmYWxzZSxcclxuICAgICAgICB0eXBlOiBPYmplY3RcclxuICAgIH07XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU1hcmt1cFNheDxUPiAobGlzdGVuZXI6IElNYXJrdXBTYXg8VD4pOiBJTWFya3VwU2F4PFQ+IHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICByZXNvbHZlVHlwZTogbGlzdGVuZXIucmVzb2x2ZVR5cGUgfHwgKCh1cmksIG5hbWUpID0+IG9yZXNvbHZlKSxcclxuICAgICAgICAgICAgcmVzb2x2ZU9iamVjdDogbGlzdGVuZXIucmVzb2x2ZU9iamVjdCB8fCAoKHR5cGUpID0+IG5ldyAodHlwZSkoKSksXHJcbiAgICAgICAgICAgIHJlc29sdmVQcmltaXRpdmU6IGxpc3RlbmVyLnJlc29sdmVQcmltaXRpdmUgfHwgKCh0eXBlLCB0ZXh0KSA9PiBuZXcgKHR5cGUpKHRleHQpKSxcclxuICAgICAgICAgICAgcmVzb2x2ZVJlc291cmNlczogbGlzdGVuZXIucmVzb2x2ZVJlc291cmNlcyB8fCAoKG93bmVyLCBvd25lclR5cGUpID0+IG5ldyBPYmplY3QoKSksXHJcbiAgICAgICAgICAgIGJyYW5jaFNraXA6IGxpc3RlbmVyLmJyYW5jaFNraXAgfHwgKChyb290LCBvYmopID0+IHtcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIG9iamVjdDogbGlzdGVuZXIub2JqZWN0IHx8ICgob2JqLCBpc0NvbnRlbnQpID0+IHtcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIG9iamVjdEVuZDogbGlzdGVuZXIub2JqZWN0RW5kIHx8ICgob2JqLCBpc0NvbnRlbnQsIHByZXYpID0+IHtcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIGNvbnRlbnRUZXh0OiBsaXN0ZW5lci5jb250ZW50VGV4dCB8fCAoKHRleHQpID0+IHtcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIG5hbWU6IGxpc3RlbmVyLm5hbWUgfHwgKChuYW1lKSA9PiB7XHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBwcm9wZXJ0eVN0YXJ0OiBsaXN0ZW5lci5wcm9wZXJ0eVN0YXJ0IHx8ICgob3duZXJUeXBlLCBwcm9wTmFtZSkgPT4ge1xyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgcHJvcGVydHlFbmQ6IGxpc3RlbmVyLnByb3BlcnR5RW5kIHx8ICgob3duZXJUeXBlLCBwcm9wTmFtZSkgPT4ge1xyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgYXR0cmlidXRlU3RhcnQ6IGxpc3RlbmVyLmF0dHJpYnV0ZVN0YXJ0IHx8ICgob3duZXJUeXBlLCBhdHRyTmFtZSkgPT4ge1xyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgYXR0cmlidXRlRW5kOiBsaXN0ZW5lci5hdHRyaWJ1dGVFbmQgfHwgKChvd25lclR5cGUsIGF0dHJOYW1lLCBvYmopID0+IHtcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIGVycm9yOiBsaXN0ZW5lci5lcnJvciB8fCAoKGUpID0+IHRydWUpLFxyXG4gICAgICAgICAgICBlbmQ6IGxpc3RlbmVyLmVuZCB8fCAoKCkgPT4ge1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lLm1hcmt1cCB7XHJcbiAgICBleHBvcnQgY2xhc3MgTWFya3VwPFQ+IHtcclxuICAgICAgICB1cmk6IFVyaTtcclxuICAgICAgICByb290OiBUO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvciAodXJpOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgdGhpcy51cmkgPSBuZXcgVXJpKHVyaSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjcmVhdGVQYXJzZXIgKCk6IElNYXJrdXBQYXJzZXI8VD4ge1xyXG4gICAgICAgICAgICByZXR1cm4gTk9fUEFSU0VSO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVzb2x2ZSAodHlwZW1ncjogSVR5cGVNYW5hZ2VyLCBjdXN0b21Db2xsZWN0b3I/OiBJQ3VzdG9tQ29sbGVjdG9yKTogYXN5bmMuSUFzeW5jUmVxdWVzdDxhbnk+IHtcclxuICAgICAgICAgICAgdmFyIHJlc29sdmVyID0gbmV3IE1hcmt1cERlcGVuZGVuY3lSZXNvbHZlcjxUPih0eXBlbWdyLCB0aGlzLmNyZWF0ZVBhcnNlcigpKTtcclxuICAgICAgICAgICAgcmVzb2x2ZXIuY29sbGVjdCh0aGlzLnJvb3QsIGN1c3RvbUNvbGxlY3Rvcik7XHJcbiAgICAgICAgICAgIHJldHVybiByZXNvbHZlci5yZXNvbHZlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsb2FkQXN5bmMgKCk6IGFzeW5jLklBc3luY1JlcXVlc3Q8TWFya3VwPFQ+PiB7XHJcbiAgICAgICAgICAgIHZhciByZXFVcmkgPSBcInRleHQhXCIgKyB0aGlzLnVyaS50b1N0cmluZygpO1xyXG4gICAgICAgICAgICB2YXIgbWQgPSB0aGlzO1xyXG4gICAgICAgICAgICByZXR1cm4gYXN5bmMuY3JlYXRlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgICAgICg8RnVuY3Rpb24+cmVxdWlyZSkoW3JlcVVyaV0sIChkYXRhOiBzdHJpbmcpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBtZC5zZXRSb290KG1kLmxvYWRSb290KGRhdGEpKTtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG1kKTtcclxuICAgICAgICAgICAgICAgIH0sIHJlamVjdCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZFJvb3QgKGRhdGE6IHN0cmluZyk6IFQge1xyXG4gICAgICAgICAgICByZXR1cm4gPFQ+PGFueT5kYXRhO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0Um9vdCAobWFya3VwOiBUKTogTWFya3VwPFQ+IHtcclxuICAgICAgICAgICAgdGhpcy5yb290ID0gbWFya3VwO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lLm1hcmt1cCB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElDdXN0b21Db2xsZWN0b3Ige1xyXG4gICAgICAgIChvd25lclVyaTogc3RyaW5nLCBvd25lck5hbWU6IHN0cmluZywgcHJvcE5hbWU6IHN0cmluZywgdmFsOiBhbnkpO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJTWFya3VwRGVwZW5kZW5jeVJlc29sdmVyPFQ+IHtcclxuICAgICAgICBhZGQodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IGJvb2xlYW47XHJcbiAgICAgICAgY29sbGVjdChyb290OiBULCBjdXN0b21Db2xsZWN0b3I/OiBJQ3VzdG9tQ29sbGVjdG9yKTtcclxuICAgICAgICByZXNvbHZlKCk6IGFzeW5jLklBc3luY1JlcXVlc3Q8YW55PjtcclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBNYXJrdXBEZXBlbmRlbmN5UmVzb2x2ZXI8VD4gaW1wbGVtZW50cyBJTWFya3VwRGVwZW5kZW5jeVJlc29sdmVyPFQ+IHtcclxuICAgICAgICBwcml2YXRlICQkdXJpczogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBwcml2YXRlICQkbmFtZXM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgICAgcHJpdmF0ZSAkJHJlc29sdmluZzogc3RyaW5nW10gPSBbXTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IgKHB1YmxpYyB0eXBlTWFuYWdlcjogSVR5cGVNYW5hZ2VyLCBwdWJsaWMgcGFyc2VyOiBJTWFya3VwUGFyc2VyPFQ+KSB7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb2xsZWN0IChyb290OiBULCBjdXN0b21Db2xsZWN0b3I/OiBJQ3VzdG9tQ29sbGVjdG9yKSB7XHJcbiAgICAgICAgICAgIC8vVE9ETzogV2UgbmVlZCB0byBjb2xsZWN0XHJcbiAgICAgICAgICAgIC8vICBSZXNvdXJjZURpY3Rpb25hcnkuU291cmNlXHJcbiAgICAgICAgICAgIC8vICBBcHBsaWNhdGlvbi5UaGVtZU5hbWVcclxuICAgICAgICAgICAgdmFyIGJsYW5rID0ge307XHJcbiAgICAgICAgICAgIHZhciBvcmVzb2x2ZTogSU91dFR5cGUgPSB7XHJcbiAgICAgICAgICAgICAgICBpc1ByaW1pdGl2ZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBPYmplY3RcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdmFyIGxhc3QgPSB7XHJcbiAgICAgICAgICAgICAgICB1cmk6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgb2JqOiB1bmRlZmluZWRcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdmFyIHBhcnNlID0ge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZVR5cGU6ICh1cmksIG5hbWUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZCh1cmksIG5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxhc3QudXJpID0gdXJpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxhc3QubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9yZXNvbHZlO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHJlc29sdmVPYmplY3Q6ICh0eXBlKT0+IHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmxhbms7XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgb2JqZWN0RW5kOiAob2JqLCBpc0NvbnRlbnQsIHByZXYpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsYXN0Lm9iaiA9IG9iajtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eUVuZDogKG93bmVyVHlwZSwgcHJvcE5hbWUpID0+IHtcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVFbmQ6IChvd25lclR5cGUsIGF0dHJOYW1lLCBvYmopID0+IHtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgaWYgKGN1c3RvbUNvbGxlY3Rvcikge1xyXG4gICAgICAgICAgICAgICAgcGFyc2UucHJvcGVydHlFbmQgPSAob3duZXJUeXBlLCBwcm9wTmFtZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUNvbGxlY3RvcihsYXN0LnVyaSwgbGFzdC5uYW1lLCBwcm9wTmFtZSwgbGFzdC5vYmopO1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHBhcnNlLmF0dHJpYnV0ZUVuZCA9IChvd25lclR5cGUsIGF0dHJOYW1lLCBvYmopID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjdXN0b21Db2xsZWN0b3IobGFzdC51cmksIGxhc3QubmFtZSwgYXR0ck5hbWUsIG9iaik7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnBhcnNlclxyXG4gICAgICAgICAgICAgICAgLm9uKHBhcnNlKVxyXG4gICAgICAgICAgICAgICAgLnBhcnNlKHJvb3QpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWRkICh1cmk6IHN0cmluZywgbmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIHZhciB1cmlzID0gdGhpcy4kJHVyaXM7XHJcbiAgICAgICAgICAgIHZhciBuYW1lcyA9IHRoaXMuJCRuYW1lcztcclxuICAgICAgICAgICAgdmFyIGluZCA9IHVyaXMuaW5kZXhPZih1cmkpO1xyXG4gICAgICAgICAgICBpZiAoaW5kID4gLTEgJiYgbmFtZXNbaW5kXSA9PT0gbmFtZSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJCRyZXNvbHZpbmcuaW5kZXhPZih1cmkgKyBcIi9cIiArIG5hbWUpID4gLTEpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIHVyaXMucHVzaCh1cmkpO1xyXG4gICAgICAgICAgICBuYW1lcy5wdXNoKG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlc29sdmUgKCk6IGFzeW5jLklBc3luY1JlcXVlc3Q8YW55PiB7XHJcbiAgICAgICAgICAgIHZhciBhczogYXN5bmMuSUFzeW5jUmVxdWVzdDxhbnk+W10gPSBbXTtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIHVyaXMgPSB0aGlzLiQkdXJpcywgbmFtZXMgPSB0aGlzLiQkbmFtZXMsIHRtID0gdGhpcy50eXBlTWFuYWdlciwgcmVzb2x2aW5nID0gdGhpcy4kJHJlc29sdmluZzsgaSA8IHVyaXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHZhciB1cmkgPSB1cmlzW2ldO1xyXG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBuYW1lc1tpXTtcclxuICAgICAgICAgICAgICAgIHJlc29sdmluZy5wdXNoKHVyaSArIFwiL1wiICsgbmFtZSk7XHJcbiAgICAgICAgICAgICAgICBhcy5wdXNoKHRtLmxvYWRUeXBlQXN5bmModXJpLCBuYW1lKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGFzeW5jLm1hbnkoYXMpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUubWFya3VwLnhhbWwge1xyXG4gICAgLy8gU3ludGF4OlxyXG4gICAgLy8gICAgICB7PEFsaWFzfE5hbWU+IFs8RGVmYXVsdEtleT49XTxEZWZhdWx0VmFsdWU+fDxLZXk+PTxWYWx1ZT59XHJcbiAgICAvLyBFeGFtcGxlczpcclxuICAgIC8vICB7eDpOdWxsIH1cclxuICAgIC8vICB7eDpUeXBlIH1cclxuICAgIC8vICB7eDpTdGF0aWMgfVxyXG4gICAgLy8gIHtUZW1wbGF0ZUJpbmRpbmcgfVxyXG4gICAgLy8gIHtCaW5kaW5nIH1cclxuICAgIC8vICB7U3RhdGljUmVzb3VyY2UgfVxyXG5cclxuICAgIGludGVyZmFjZSBJUGFyc2VDb250ZXh0IHtcclxuICAgICAgICB0ZXh0OiBzdHJpbmc7XHJcbiAgICAgICAgaTogbnVtYmVyO1xyXG4gICAgICAgIGFjYzogc3RyaW5nO1xyXG4gICAgICAgIGVycm9yOiBhbnk7XHJcbiAgICAgICAgcmVzb2x2ZXI6IElOc1ByZWZpeFJlc29sdmVyO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIFhhbWxFeHRlbnNpb25QYXJzZXIgaW1wbGVtZW50cyBJTWFya3VwRXh0ZW5zaW9uUGFyc2VyIHtcclxuICAgICAgICBwcml2YXRlICQkZGVmYXVsdFhtbG5zID0gXCJodHRwOi8vc2NoZW1hcy53c2ljay5jb20vZmF5ZGVcIjtcclxuICAgICAgICBwcml2YXRlICQkeFhtbG5zID0gXCJodHRwOi8vc2NoZW1hcy53c2ljay5jb20vZmF5ZGUveFwiO1xyXG5cclxuICAgICAgICBwcml2YXRlICQkb25SZXNvbHZlVHlwZTogZXZlbnRzLklSZXNvbHZlVHlwZTtcclxuICAgICAgICBwcml2YXRlICQkb25SZXNvbHZlT2JqZWN0OiBldmVudHMuSVJlc29sdmVPYmplY3Q7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uUmVzb2x2ZVByaW1pdGl2ZTogZXZlbnRzLklSZXNvbHZlUHJpbWl0aXZlO1xyXG4gICAgICAgIHByaXZhdGUgJCRvbkVycm9yOiBldmVudHMuSUVycm9yO1xyXG5cclxuICAgICAgICBzZXROYW1lc3BhY2VzIChkZWZhdWx0WG1sbnM6IHN0cmluZywgeFhtbG5zOiBzdHJpbmcpOiBYYW1sRXh0ZW5zaW9uUGFyc2VyIHtcclxuICAgICAgICAgICAgdGhpcy4kJGRlZmF1bHRYbWxucyA9IGRlZmF1bHRYbWxucztcclxuICAgICAgICAgICAgdGhpcy4kJHhYbWxucyA9IHhYbWxucztcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwYXJzZSAodmFsdWU6IHN0cmluZywgcmVzb2x2ZXI6IElOc1ByZWZpeFJlc29sdmVyLCBvczogYW55W10pOiBhbnkge1xyXG4gICAgICAgICAgICBpZiAoIWlzQWxwaGEodmFsdWVbMV0pKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgICAgICB0aGlzLiQkZW5zdXJlKCk7XHJcbiAgICAgICAgICAgIHZhciBjdHg6IElQYXJzZUNvbnRleHQgPSB7XHJcbiAgICAgICAgICAgICAgICB0ZXh0OiB2YWx1ZSxcclxuICAgICAgICAgICAgICAgIGk6IDEsXHJcbiAgICAgICAgICAgICAgICBhY2M6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICBlcnJvcjogXCJcIixcclxuICAgICAgICAgICAgICAgIHJlc29sdmVyOiByZXNvbHZlclxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB2YXIgb2JqID0gdGhpcy4kJGRvUGFyc2UoY3R4LCBvcyk7XHJcbiAgICAgICAgICAgIGlmIChjdHguZXJyb3IpXHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkb25FcnJvcihjdHguZXJyb3IpO1xyXG4gICAgICAgICAgICBvYmogPSBmaW5pc2hNYXJrdXBFeHRlbnNpb24ob2JqLCByZXNvbHZlciwgdGhpcy4kJG9uUmVzb2x2ZVR5cGUsIG9zKTtcclxuICAgICAgICAgICAgcmV0dXJuIG9iajtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRkb1BhcnNlIChjdHg6IElQYXJzZUNvbnRleHQsIG9zOiBhbnlbXSk6IGFueSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy4kJHBhcnNlTmFtZShjdHgpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdGhpcy4kJHN0YXJ0RXh0ZW5zaW9uKGN0eCwgb3MpO1xyXG5cclxuICAgICAgICAgICAgd2hpbGUgKGN0eC5pIDwgY3R4LnRleHQubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuJCRwYXJzZUtleVZhbHVlKGN0eCwgb3MpKVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgaWYgKGN0eC50ZXh0W2N0eC5pXSA9PT0gXCJ9XCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG9zLnBvcCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJHBhcnNlTmFtZSAoY3R4OiBJUGFyc2VDb250ZXh0KTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIHZhciBpbmQgPSBjdHgudGV4dC5pbmRleE9mKFwiIFwiLCBjdHguaSk7XHJcbiAgICAgICAgICAgIGlmIChpbmQgPiBjdHguaSkge1xyXG4gICAgICAgICAgICAgICAgY3R4LmFjYyA9IGN0eC50ZXh0LnN1YnN0cihjdHguaSwgaW5kIC0gY3R4LmkpO1xyXG4gICAgICAgICAgICAgICAgY3R4LmkgPSBpbmQgKyAxO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaW5kID0gY3R4LnRleHQuaW5kZXhPZihcIn1cIiwgY3R4LmkpO1xyXG4gICAgICAgICAgICBpZiAoaW5kID4gY3R4LmkpIHtcclxuICAgICAgICAgICAgICAgIGN0eC5hY2MgPSBjdHgudGV4dC5zdWJzdHIoY3R4LmksIGluZCAtIGN0eC5pKTtcclxuICAgICAgICAgICAgICAgIGN0eC5pID0gaW5kO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY3R4LmVycm9yID0gXCJNaXNzaW5nIGNsb3NpbmcgYnJhY2tldC5cIjtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJHN0YXJ0RXh0ZW5zaW9uIChjdHg6IElQYXJzZUNvbnRleHQsIG9zOiBhbnlbXSkge1xyXG4gICAgICAgICAgICB2YXIgZnVsbCA9IGN0eC5hY2M7XHJcbiAgICAgICAgICAgIHZhciBpbmQgPSBmdWxsLmluZGV4T2YoXCI6XCIpO1xyXG4gICAgICAgICAgICB2YXIgcHJlZml4ID0gKGluZCA8IDApID8gbnVsbCA6IGZ1bGwuc3Vic3RyKDAsIGluZCk7XHJcbiAgICAgICAgICAgIHZhciBuYW1lID0gKGluZCA8IDApID8gZnVsbCA6IGZ1bGwuc3Vic3RyKGluZCArIDEpO1xyXG4gICAgICAgICAgICB2YXIgdXJpID0gcHJlZml4ID8gY3R4LnJlc29sdmVyLmxvb2t1cE5hbWVzcGFjZVVSSShwcmVmaXgpIDogREVGQVVMVF9YTUxOUztcclxuXHJcbiAgICAgICAgICAgIHZhciBvYmo7XHJcbiAgICAgICAgICAgIGlmICh1cmkgPT09IHRoaXMuJCR4WG1sbnMpIHtcclxuICAgICAgICAgICAgICAgIGlmIChuYW1lID09PSBcIk51bGxcIilcclxuICAgICAgICAgICAgICAgICAgICBvYmogPSB0aGlzLiQkcGFyc2VYTnVsbChjdHgpO1xyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobmFtZSA9PT0gXCJUeXBlXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgb2JqID0gdGhpcy4kJHBhcnNlWFR5cGUoY3R4KTtcclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG5hbWUgPT09IFwiU3RhdGljXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgb2JqID0gdGhpcy4kJHBhcnNlWFN0YXRpYyhjdHgpO1xyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gbWFya3VwIGV4dGVuc2lvbi4gW1wiICsgcHJlZml4ICsgXCI6XCIgKyBuYW1lICsgXCJdXCIpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdmFyIG9ydCA9IHRoaXMuJCRvblJlc29sdmVUeXBlKHVyaSwgbmFtZSk7XHJcbiAgICAgICAgICAgICAgICBvYmogPSB0aGlzLiQkb25SZXNvbHZlT2JqZWN0KG9ydC50eXBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcy5wdXNoKG9iaik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkcGFyc2VYTnVsbCAoY3R4OiBJUGFyc2VDb250ZXh0KTogYW55IHtcclxuICAgICAgICAgICAgdmFyIGluZCA9IGN0eC50ZXh0LmluZGV4T2YoXCJ9XCIsIGN0eC5pKTtcclxuICAgICAgICAgICAgaWYgKGluZCA8IGN0eC5pKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW50ZXJtaW5hdGVkIHN0cmluZyBjb25zdGFudC5cIik7XHJcbiAgICAgICAgICAgIGN0eC5pID0gaW5kO1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRwYXJzZVhUeXBlIChjdHg6IElQYXJzZUNvbnRleHQpOiBhbnkge1xyXG4gICAgICAgICAgICB2YXIgZW5kID0gY3R4LnRleHQuaW5kZXhPZihcIn1cIiwgY3R4LmkpO1xyXG4gICAgICAgICAgICBpZiAoZW5kIDwgY3R4LmkpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbnRlcm1pbmF0ZWQgc3RyaW5nIGNvbnN0YW50LlwiKTtcclxuICAgICAgICAgICAgdmFyIHZhbCA9IGN0eC50ZXh0LnN1YnN0cihjdHguaSwgZW5kIC0gY3R4LmkpO1xyXG4gICAgICAgICAgICBjdHguaSA9IGVuZDtcclxuXHJcbiAgICAgICAgICAgIHZhciBpbmQgPSB2YWwuaW5kZXhPZihcIjpcIik7XHJcbiAgICAgICAgICAgIHZhciBwcmVmaXggPSAoaW5kIDwgMCkgPyBudWxsIDogdmFsLnN1YnN0cigwLCBpbmQpO1xyXG4gICAgICAgICAgICB2YXIgbmFtZSA9IChpbmQgPCAwKSA/IHZhbCA6IHZhbC5zdWJzdHIoaW5kICsgMSk7XHJcbiAgICAgICAgICAgIHZhciB1cmkgPSBjdHgucmVzb2x2ZXIubG9va3VwTmFtZXNwYWNlVVJJKHByZWZpeCk7XHJcbiAgICAgICAgICAgIHZhciBvcnQgPSB0aGlzLiQkb25SZXNvbHZlVHlwZSh1cmksIG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gb3J0LnR5cGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkcGFyc2VYU3RhdGljIChjdHg6IElQYXJzZUNvbnRleHQpOiBhbnkge1xyXG4gICAgICAgICAgICB2YXIgdGV4dCA9IGN0eC50ZXh0O1xyXG4gICAgICAgICAgICB2YXIgbGVuID0gdGV4dC5sZW5ndGg7XHJcbiAgICAgICAgICAgIHZhciBzdGFydCA9IGN0eC5pO1xyXG4gICAgICAgICAgICBmb3IgKDsgY3R4LmkgPCBsZW47IGN0eC5pKyspIHtcclxuICAgICAgICAgICAgICAgIGlmICh0ZXh0W2N0eC5pXSA9PT0gXCJ9XCIgJiYgdGV4dFtjdHguaSAtIDFdICE9PSBcIlxcXFxcIilcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgdmFsID0gdGV4dC5zdWJzdHIoc3RhcnQsIGN0eC5pIC0gc3RhcnQpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGZ1bmMgPSBuZXcgRnVuY3Rpb24oXCJyZXR1cm4gKFwiICsgdmFsICsgXCIpO1wiKTtcclxuICAgICAgICAgICAgcmV0dXJuIGZ1bmMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRwYXJzZUtleVZhbHVlIChjdHg6IElQYXJzZUNvbnRleHQsIG9zOiBhbnlbXSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICB2YXIgdGV4dCA9IGN0eC50ZXh0O1xyXG4gICAgICAgICAgICBjdHguYWNjID0gXCJcIjtcclxuICAgICAgICAgICAgdmFyIGtleSA9IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciB2YWw6IGFueSA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdmFyIGxlbiA9IHRleHQubGVuZ3RoO1xyXG4gICAgICAgICAgICB2YXIgbm9uYWxwaGEgPSBmYWxzZTtcclxuICAgICAgICAgICAgZm9yICg7IGN0eC5pIDwgbGVuOyBjdHguaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgY3VyID0gdGV4dFtjdHguaV07XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VyID09PSBcIlxcXFxcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGN0eC5pKys7XHJcbiAgICAgICAgICAgICAgICAgICAgY3R4LmFjYyArPSB0ZXh0W2N0eC5pXTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VyID09PSBcIntcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChub25hbHBoYSB8fCAhaXNBbHBoYSh0ZXh0W2N0eC5pICsgMV0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5hY2MgKz0gY3VyO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub25hbHBoYSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWtleSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjdHguZXJyb3IgPSBcIkEgc3ViIGV4dGVuc2lvbiBtdXN0IGJlIHNldCB0byBhIGtleS5cIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjdHguaSsrO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbCA9IHRoaXMuJCRkb1BhcnNlKGN0eCwgb3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjdHguZXJyb3IpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VyID09PSBcIj1cIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGtleSA9IGN0eC5hY2MudHJpbSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGN0eC5hY2MgPSBcIlwiO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXIgPT09IFwifVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vbmFscGhhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vbmFscGhhID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0eC5hY2MgKz0gY3VyO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQkZmluaXNoS2V5VmFsdWUoY3R4LCBrZXksIHZhbCwgb3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXIgPT09IFwiLFwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3R4LmkrKztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQkZmluaXNoS2V5VmFsdWUoY3R4LCBrZXksIHZhbCwgb3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXkgJiYgIWN0eC5hY2MgJiYgY3VyID09PSBcIidcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGN0eC5pKys7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kJHBhcnNlU2luZ2xlUXVvdGVkKGN0eCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsID0gY3R4LmFjYztcclxuICAgICAgICAgICAgICAgICAgICBjdHguYWNjID0gXCJcIjtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3R4LmFjYyArPSBjdXI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW50ZXJtaW5hdGVkIHN0cmluZyBjb25zdGFudC5cIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkZmluaXNoS2V5VmFsdWUgKGN0eDogSVBhcnNlQ29udGV4dCwga2V5OiBzdHJpbmcsIHZhbDogYW55LCBvczogYW55W10pIHtcclxuICAgICAgICAgICAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoISh2YWwgPSBjdHguYWNjLnRyaW0oKSkpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YWwgPSBmaW5pc2hNYXJrdXBFeHRlbnNpb24odmFsLCBjdHgucmVzb2x2ZXIsIHRoaXMuJCRvblJlc29sdmVUeXBlLCBvcyk7XHJcbiAgICAgICAgICAgIHZhciBjbyA9IG9zW29zLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICBpZiAoIWtleSkge1xyXG4gICAgICAgICAgICAgICAgY28uaW5pdCAmJiBjby5pbml0KHZhbCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb1trZXldID0gdmFsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkcGFyc2VTaW5nbGVRdW90ZWQgKGN0eDogSVBhcnNlQ29udGV4dCkge1xyXG4gICAgICAgICAgICB2YXIgdGV4dCA9IGN0eC50ZXh0O1xyXG4gICAgICAgICAgICB2YXIgbGVuID0gdGV4dC5sZW5ndGg7XHJcbiAgICAgICAgICAgIGZvciAoOyBjdHguaSA8IGxlbjsgY3R4LmkrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIGN1ciA9IHRleHRbY3R4LmldO1xyXG4gICAgICAgICAgICAgICAgaWYgKGN1ciA9PT0gXCJcXFxcXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBjdHguaSsrO1xyXG4gICAgICAgICAgICAgICAgICAgIGN0eC5hY2MgKz0gdGV4dFtjdHguaV07XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGN1ciA9PT0gXCInXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGN0eC5hY2MgKz0gY3VyO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkZW5zdXJlICgpIHtcclxuICAgICAgICAgICAgdGhpcy5vblJlc29sdmVUeXBlKHRoaXMuJCRvblJlc29sdmVUeXBlKVxyXG4gICAgICAgICAgICAgICAgLm9uUmVzb2x2ZU9iamVjdCh0aGlzLiQkb25SZXNvbHZlT2JqZWN0KVxyXG4gICAgICAgICAgICAgICAgLm9uRXJyb3IodGhpcy4kJG9uRXJyb3IpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgb25SZXNvbHZlVHlwZSAoY2I/OiBldmVudHMuSVJlc29sdmVUeXBlKTogWGFtbEV4dGVuc2lvblBhcnNlciB7XHJcbiAgICAgICAgICAgIHZhciBvcmVzb2x2ZTogSU91dFR5cGUgPSB7XHJcbiAgICAgICAgICAgICAgICBpc1ByaW1pdGl2ZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBPYmplY3RcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdGhpcy4kJG9uUmVzb2x2ZVR5cGUgPSBjYiB8fCAoKHhtbG5zLCBuYW1lKSA9PiBvcmVzb2x2ZSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgb25SZXNvbHZlT2JqZWN0IChjYj86IGV2ZW50cy5JUmVzb2x2ZU9iamVjdCk6IFhhbWxFeHRlbnNpb25QYXJzZXIge1xyXG4gICAgICAgICAgICB0aGlzLiQkb25SZXNvbHZlT2JqZWN0ID0gY2IgfHwgKCh0eXBlKSA9PiBuZXcgdHlwZSgpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBvblJlc29sdmVQcmltaXRpdmUgKGNiPzogZXZlbnRzLklSZXNvbHZlUHJpbWl0aXZlKTogWGFtbEV4dGVuc2lvblBhcnNlciB7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvblJlc29sdmVQcmltaXRpdmUgPSBjYiB8fCAoKHR5cGUsIHRleHQpID0+IG5ldyB0eXBlKHRleHQpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBvbkVycm9yIChjYj86IGV2ZW50cy5JRXJyb3IpOiBYYW1sRXh0ZW5zaW9uUGFyc2VyIHtcclxuICAgICAgICAgICAgdGhpcy4kJG9uRXJyb3IgPSBjYiB8fCAoKGUpID0+IHtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpc0FscGhhIChjOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICBpZiAoIWMpXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB2YXIgY29kZSA9IGNbMF0udG9VcHBlckNhc2UoKS5jaGFyQ29kZUF0KDApO1xyXG4gICAgICAgIHJldHVybiBjb2RlID49IDY1ICYmIGNvZGUgPD0gOTA7XHJcbiAgICB9XHJcbn0iLCJtb2R1bGUgbnVsbHN0b25lLm1hcmt1cC54YW1sIHtcclxuICAgIHZhciBwYXJzZXIgPSBuZXcgRE9NUGFyc2VyKCk7XHJcbiAgICB2YXIgeGNhY2hlID0gbmV3IE1lbW9pemVyPFhhbWxNYXJrdXA+KChrZXkpID0+IG5ldyBYYW1sTWFya3VwKGtleSkpO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBYYW1sTWFya3VwIGV4dGVuZHMgbWFya3VwLk1hcmt1cDxFbGVtZW50PiB7XHJcbiAgICAgICAgc3RhdGljIGNyZWF0ZSAodXJpOiBzdHJpbmcpOiBYYW1sTWFya3VwO1xyXG4gICAgICAgIHN0YXRpYyBjcmVhdGUgKHVyaTogVXJpKTogWGFtbE1hcmt1cDtcclxuICAgICAgICBzdGF0aWMgY3JlYXRlICh1cmk6IGFueSk6IFhhbWxNYXJrdXAge1xyXG4gICAgICAgICAgICByZXR1cm4geGNhY2hlLm1lbW9pemUodXJpLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY3JlYXRlUGFyc2VyICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBYYW1sUGFyc2VyKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsb2FkUm9vdCAoZGF0YTogc3RyaW5nKTogRWxlbWVudCB7XHJcbiAgICAgICAgICAgIHZhciBkb2MgPSBwYXJzZXIucGFyc2VGcm9tU3RyaW5nKGRhdGEsIFwidGV4dC94bWxcIik7XHJcbiAgICAgICAgICAgIHJldHVybiBkb2MuZG9jdW1lbnRFbGVtZW50O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm1vZHVsZSBudWxsc3RvbmUubWFya3VwLnhhbWwge1xyXG4gICAgZXhwb3J0IHZhciBERUZBVUxUX1hNTE5TID0gXCJodHRwOi8vc2NoZW1hcy53c2ljay5jb20vZmF5ZGVcIjtcclxuICAgIGV4cG9ydCB2YXIgREVGQVVMVF9YTUxOU19YID0gXCJodHRwOi8vc2NoZW1hcy53c2ljay5jb20vZmF5ZGUveFwiO1xyXG4gICAgdmFyIEVSUk9SX1hNTE5TID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCI7XHJcbiAgICB2YXIgRVJST1JfTkFNRSA9IFwicGFyc2VyZXJyb3JcIjtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgWGFtbFBhcnNlciBpbXBsZW1lbnRzIElNYXJrdXBQYXJzZXI8RWxlbWVudD4ge1xyXG4gICAgICAgIHByaXZhdGUgJCRvblJlc29sdmVUeXBlOiBldmVudHMuSVJlc29sdmVUeXBlO1xyXG4gICAgICAgIHByaXZhdGUgJCRvblJlc29sdmVPYmplY3Q6IGV2ZW50cy5JUmVzb2x2ZU9iamVjdDtcclxuICAgICAgICBwcml2YXRlICQkb25SZXNvbHZlUHJpbWl0aXZlOiBldmVudHMuSVJlc29sdmVQcmltaXRpdmU7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uUmVzb2x2ZVJlc291cmNlczogZXZlbnRzLklSZXNvbHZlUmVzb3VyY2VzO1xyXG4gICAgICAgIHByaXZhdGUgJCRvbkJyYW5jaFNraXA6IGV2ZW50cy5JQnJhbmNoU2tpcDxFbGVtZW50PjtcclxuICAgICAgICBwcml2YXRlICQkb25PYmplY3Q6IGV2ZW50cy5JT2JqZWN0O1xyXG4gICAgICAgIHByaXZhdGUgJCRvbk9iamVjdEVuZDogZXZlbnRzLklPYmplY3RFbmQ7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uQ29udGVudFRleHQ6IGV2ZW50cy5JVGV4dDtcclxuICAgICAgICBwcml2YXRlICQkb25OYW1lOiBldmVudHMuSU5hbWU7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uUHJvcGVydHlTdGFydDogZXZlbnRzLklQcm9wZXJ0eVN0YXJ0O1xyXG4gICAgICAgIHByaXZhdGUgJCRvblByb3BlcnR5RW5kOiBldmVudHMuSVByb3BlcnR5RW5kO1xyXG4gICAgICAgIHByaXZhdGUgJCRvbkF0dHJpYnV0ZVN0YXJ0OiBldmVudHMuSUF0dHJpYnV0ZVN0YXJ0O1xyXG4gICAgICAgIHByaXZhdGUgJCRvbkF0dHJpYnV0ZUVuZDogZXZlbnRzLklBdHRyaWJ1dGVFbmQ7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uRXJyb3I6IGV2ZW50cy5JRXJyb3I7XHJcbiAgICAgICAgcHJpdmF0ZSAkJG9uRW5kOiAoKSA9PiBhbnkgPSBudWxsO1xyXG5cclxuICAgICAgICBwcml2YXRlICQkZXh0ZW5zaW9uOiBJTWFya3VwRXh0ZW5zaW9uUGFyc2VyO1xyXG5cclxuICAgICAgICBwcml2YXRlICQkZGVmYXVsdFhtbG5zOiBzdHJpbmc7XHJcbiAgICAgICAgcHJpdmF0ZSAkJHhYbWxuczogc3RyaW5nO1xyXG5cclxuICAgICAgICBwcml2YXRlICQkb2JqZWN0U3RhY2s6IGFueVtdID0gW107XHJcbiAgICAgICAgcHJpdmF0ZSAkJHNraXBuZXh0ID0gZmFsc2U7XHJcbiAgICAgICAgcHJpdmF0ZSAkJGN1cmVsOiBFbGVtZW50ID0gbnVsbDtcclxuICAgICAgICBwcml2YXRlICQkY3Vya2V5OiBzdHJpbmcgPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yICgpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRFeHRlbnNpb25QYXJzZXIobmV3IFhhbWxFeHRlbnNpb25QYXJzZXIoKSlcclxuICAgICAgICAgICAgICAgIC5zZXROYW1lc3BhY2VzKERFRkFVTFRfWE1MTlMsIERFRkFVTFRfWE1MTlNfWClcclxuICAgICAgICAgICAgICAgIC5vbih7fSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBvbiAobGlzdGVuZXI6IElNYXJrdXBTYXg8RWxlbWVudD4pOiBYYW1sUGFyc2VyIHtcclxuICAgICAgICAgICAgbGlzdGVuZXIgPSBjcmVhdGVNYXJrdXBTYXgobGlzdGVuZXIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kJG9uUmVzb2x2ZVR5cGUgPSBsaXN0ZW5lci5yZXNvbHZlVHlwZTtcclxuICAgICAgICAgICAgdGhpcy4kJG9uUmVzb2x2ZU9iamVjdCA9IGxpc3RlbmVyLnJlc29sdmVPYmplY3Q7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvblJlc29sdmVQcmltaXRpdmUgPSBsaXN0ZW5lci5yZXNvbHZlUHJpbWl0aXZlO1xyXG4gICAgICAgICAgICB0aGlzLiQkb25SZXNvbHZlUmVzb3VyY2VzID0gbGlzdGVuZXIucmVzb2x2ZVJlc291cmNlcztcclxuICAgICAgICAgICAgdGhpcy4kJG9uQnJhbmNoU2tpcCA9IGxpc3RlbmVyLmJyYW5jaFNraXA7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvbk9iamVjdCA9IGxpc3RlbmVyLm9iamVjdDtcclxuICAgICAgICAgICAgdGhpcy4kJG9uT2JqZWN0RW5kID0gbGlzdGVuZXIub2JqZWN0RW5kO1xyXG4gICAgICAgICAgICB0aGlzLiQkb25Db250ZW50VGV4dCA9IGxpc3RlbmVyLmNvbnRlbnRUZXh0O1xyXG4gICAgICAgICAgICB0aGlzLiQkb25OYW1lID0gbGlzdGVuZXIubmFtZTtcclxuICAgICAgICAgICAgdGhpcy4kJG9uUHJvcGVydHlTdGFydCA9IGxpc3RlbmVyLnByb3BlcnR5U3RhcnQ7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvblByb3BlcnR5RW5kID0gbGlzdGVuZXIucHJvcGVydHlFbmQ7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvbkF0dHJpYnV0ZVN0YXJ0ID0gbGlzdGVuZXIuYXR0cmlidXRlU3RhcnQ7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvbkF0dHJpYnV0ZUVuZCA9IGxpc3RlbmVyLmF0dHJpYnV0ZUVuZDtcclxuICAgICAgICAgICAgdGhpcy4kJG9uRXJyb3IgPSBsaXN0ZW5lci5lcnJvcjtcclxuICAgICAgICAgICAgdGhpcy4kJG9uRW5kID0gbGlzdGVuZXIuZW5kO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuJCRleHRlbnNpb24pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRleHRlbnNpb25cclxuICAgICAgICAgICAgICAgICAgICAub25SZXNvbHZlVHlwZSh0aGlzLiQkb25SZXNvbHZlVHlwZSlcclxuICAgICAgICAgICAgICAgICAgICAub25SZXNvbHZlT2JqZWN0KHRoaXMuJCRvblJlc29sdmVPYmplY3QpXHJcbiAgICAgICAgICAgICAgICAgICAgLm9uUmVzb2x2ZVByaW1pdGl2ZSh0aGlzLiQkb25SZXNvbHZlUHJpbWl0aXZlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXROYW1lc3BhY2VzIChkZWZhdWx0WG1sbnM6IHN0cmluZywgeFhtbG5zOiBzdHJpbmcpOiBYYW1sUGFyc2VyIHtcclxuICAgICAgICAgICAgdGhpcy4kJGRlZmF1bHRYbWxucyA9IGRlZmF1bHRYbWxucztcclxuICAgICAgICAgICAgdGhpcy4kJHhYbWxucyA9IHhYbWxucztcclxuICAgICAgICAgICAgaWYgKHRoaXMuJCRleHRlbnNpb24pXHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkZXh0ZW5zaW9uLnNldE5hbWVzcGFjZXModGhpcy4kJGRlZmF1bHRYbWxucywgdGhpcy4kJHhYbWxucyk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0RXh0ZW5zaW9uUGFyc2VyIChwYXJzZXI6IElNYXJrdXBFeHRlbnNpb25QYXJzZXIpOiBYYW1sUGFyc2VyIHtcclxuICAgICAgICAgICAgdGhpcy4kJGV4dGVuc2lvbiA9IHBhcnNlcjtcclxuICAgICAgICAgICAgaWYgKHBhcnNlcikge1xyXG4gICAgICAgICAgICAgICAgcGFyc2VyLnNldE5hbWVzcGFjZXModGhpcy4kJGRlZmF1bHRYbWxucywgdGhpcy4kJHhYbWxucylcclxuICAgICAgICAgICAgICAgICAgICAub25SZXNvbHZlVHlwZSh0aGlzLiQkb25SZXNvbHZlVHlwZSlcclxuICAgICAgICAgICAgICAgICAgICAub25SZXNvbHZlT2JqZWN0KHRoaXMuJCRvblJlc29sdmVPYmplY3QpXHJcbiAgICAgICAgICAgICAgICAgICAgLm9uUmVzb2x2ZVByaW1pdGl2ZSh0aGlzLiQkb25SZXNvbHZlUHJpbWl0aXZlKVxyXG4gICAgICAgICAgICAgICAgICAgIC5vbkVycm9yKChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwYXJzZSAoZWw6IEVsZW1lbnQpOiBYYW1sUGFyc2VyIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLiQkZXh0ZW5zaW9uKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gZXh0ZW5zaW9uIHBhcnNlciBleGlzdHMgb24gcGFyc2VyLlwiKTtcclxuICAgICAgICAgICAgdGhpcy4kJGhhbmRsZUVsZW1lbnQoZWwsIHRydWUpO1xyXG4gICAgICAgICAgICB0aGlzLiQkZGVzdHJveSgpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNraXBCcmFuY2ggKCkge1xyXG4gICAgICAgICAgICB0aGlzLiQkc2tpcG5leHQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd2Fsa1VwT2JqZWN0cyAoKTogSUVudW1lcmF0b3I8YW55PiB7XHJcbiAgICAgICAgICAgIHZhciBvcyA9IHRoaXMuJCRvYmplY3RTdGFjaztcclxuICAgICAgICAgICAgdmFyIGkgPSBvcy5sZW5ndGg7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICBtb3ZlTmV4dCAoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaS0tO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAodGhpcy5jdXJyZW50ID0gb3NbaV0pICE9PSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXNvbHZlUHJlZml4IChwcmVmaXg6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLiQkY3VyZWwubG9va3VwTmFtZXNwYWNlVVJJKHByZWZpeCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkaGFuZGxlRWxlbWVudCAoZWw6IEVsZW1lbnQsIGlzQ29udGVudDogYm9vbGVhbikge1xyXG4gICAgICAgICAgICAvLyBOT1RFOiBIYW5kbGUgdGFnIG9wZW5cclxuICAgICAgICAgICAgLy8gIDxbbnM6XVR5cGUuTmFtZT5cclxuICAgICAgICAgICAgLy8gIDxbbnM6XVR5cGU+XHJcbiAgICAgICAgICAgIHZhciBvbGQgPSB0aGlzLiQkY3VyZWw7XHJcbiAgICAgICAgICAgIHRoaXMuJCRjdXJlbCA9IGVsO1xyXG4gICAgICAgICAgICB2YXIgbmFtZSA9IGVsLmxvY2FsTmFtZTtcclxuICAgICAgICAgICAgdmFyIHhtbG5zID0gZWwubmFtZXNwYWNlVVJJO1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kJHRyeUhhbmRsZUVycm9yKGVsLCB4bWxucywgbmFtZSkgfHwgdGhpcy4kJHRyeUhhbmRsZVByb3BlcnR5VGFnKGVsLCB4bWxucywgbmFtZSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRjdXJlbCA9IG9sZDtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIG9zID0gdGhpcy4kJG9iamVjdFN0YWNrO1xyXG4gICAgICAgICAgICB2YXIgb3J0ID0gdGhpcy4kJG9uUmVzb2x2ZVR5cGUoeG1sbnMsIG5hbWUpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kJHRyeUhhbmRsZVByaW1pdGl2ZShlbCwgb3J0LCBpc0NvbnRlbnQpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkY3VyZWwgPSBvbGQ7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBvYmogPSB0aGlzLiQkb25SZXNvbHZlT2JqZWN0KG9ydC50eXBlKTtcclxuICAgICAgICAgICAgaWYgKG9iaiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBvcy5wdXNoKG9iaik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkb25PYmplY3Qob2JqLCBpc0NvbnRlbnQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBOT1RFOiBIYW5kbGUgcmVzb3VyY2VzIGJlZm9yZSBhdHRyaWJ1dGVzIGFuZCBjaGlsZCBlbGVtZW50c1xyXG4gICAgICAgICAgICB2YXIgcmVzRWwgPSBmaW5kUmVzb3VyY2VzRWxlbWVudChlbCwgeG1sbnMsIG5hbWUpO1xyXG4gICAgICAgICAgICBpZiAocmVzRWwpXHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkaGFuZGxlUmVzb3VyY2VzKG9iaiwgb3J0LnR5cGUsIHJlc0VsKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuJCRjdXJrZXkgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIC8vIE5PVEU6IFdhbGsgYXR0cmlidXRlc1xyXG4gICAgICAgICAgICB0aGlzLiQkcHJvY2Vzc0F0dHJpYnV0ZXMoZWwpO1xyXG4gICAgICAgICAgICB2YXIga2V5ID0gdGhpcy4kJGN1cmtleTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLiQkc2tpcG5leHQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRza2lwbmV4dCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgb3MucG9wKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkb25PYmplY3RFbmQob2JqLCBrZXksIGlzQ29udGVudCwgb3Nbb3MubGVuZ3RoIC0gMV0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJG9uQnJhbmNoU2tpcChlbC5maXJzdEVsZW1lbnRDaGlsZCwgb2JqKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRjdXJlbCA9IG9sZDtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gTk9URTogV2FsayBDaGlsZHJlblxyXG4gICAgICAgICAgICB2YXIgY2hpbGQgPSBlbC5maXJzdEVsZW1lbnRDaGlsZDtcclxuICAgICAgICAgICAgdmFyIGhhc0NoaWxkcmVuID0gISFjaGlsZDtcclxuICAgICAgICAgICAgd2hpbGUgKGNoaWxkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlc0VsIHx8IGNoaWxkICE9PSByZXNFbCkgLy9Ta2lwIFJlc291cmNlcyAod2lsbCBiZSBkb25lIGZpcnN0KVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJCRoYW5kbGVFbGVtZW50KGNoaWxkLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgIGNoaWxkID0gY2hpbGQubmV4dEVsZW1lbnRTaWJsaW5nO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBOT1RFOiBJZiB3ZSBkaWQgbm90IGhpdCBhIGNoaWxkIHRhZywgdXNlIHRleHQgY29udGVudFxyXG4gICAgICAgICAgICBpZiAoIWhhc0NoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdGV4dCA9IGVsLnRleHRDb250ZW50O1xyXG4gICAgICAgICAgICAgICAgaWYgKHRleHQgJiYgKHRleHQgPSB0ZXh0LnRyaW0oKSkpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kJG9uQ29udGVudFRleHQodGV4dCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIE5PVEU6IEhhbmRsZSB0YWcgY2xvc2VcclxuICAgICAgICAgICAgLy8gIDwvW25zOl1UeXBlLk5hbWU+XHJcbiAgICAgICAgICAgIC8vICA8L1tuczpdVHlwZT5cclxuICAgICAgICAgICAgaWYgKG9iaiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBvcy5wb3AoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJCRvbk9iamVjdEVuZChvYmosIGtleSwgaXNDb250ZW50LCBvc1tvcy5sZW5ndGggLSAxXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy4kJGN1cmVsID0gb2xkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJGhhbmRsZVJlc291cmNlcyAob3duZXI6IGFueSwgb3duZXJUeXBlOiBhbnksIHJlc0VsOiBFbGVtZW50KSB7XHJcbiAgICAgICAgICAgIHZhciBvcyA9IHRoaXMuJCRvYmplY3RTdGFjaztcclxuICAgICAgICAgICAgdmFyIHJkID0gdGhpcy4kJG9uUmVzb2x2ZVJlc291cmNlcyhvd25lciwgb3duZXJUeXBlKTtcclxuICAgICAgICAgICAgb3MucHVzaChyZCk7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvbk9iamVjdChyZCwgZmFsc2UpO1xyXG4gICAgICAgICAgICB2YXIgY2hpbGQgPSByZXNFbC5maXJzdEVsZW1lbnRDaGlsZDtcclxuICAgICAgICAgICAgd2hpbGUgKGNoaWxkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkaGFuZGxlRWxlbWVudChjaGlsZCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICBjaGlsZCA9IGNoaWxkLm5leHRFbGVtZW50U2libGluZztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvcy5wb3AoKTtcclxuICAgICAgICAgICAgdGhpcy4kJG9uT2JqZWN0RW5kKHJkLCB1bmRlZmluZWQsIGZhbHNlLCBvc1tvcy5sZW5ndGggLSAxXSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkdHJ5SGFuZGxlRXJyb3IgKGVsOiBFbGVtZW50LCB4bWxuczogc3RyaW5nLCBuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgaWYgKHhtbG5zICE9PSBFUlJPUl9YTUxOUyB8fCBuYW1lICE9PSBFUlJPUl9OQU1FKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLiQkb25FcnJvcihuZXcgRXJyb3IoZWwudGV4dENvbnRlbnQpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkdHJ5SGFuZGxlUHJvcGVydHlUYWcgKGVsOiBFbGVtZW50LCB4bWxuczogc3RyaW5nLCBuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgdmFyIGluZCA9IG5hbWUuaW5kZXhPZignLicpO1xyXG4gICAgICAgICAgICBpZiAoaW5kIDwgMClcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIHZhciBvcnQgPSB0aGlzLiQkb25SZXNvbHZlVHlwZSh4bWxucywgbmFtZS5zdWJzdHIoMCwgaW5kKSk7XHJcbiAgICAgICAgICAgIHZhciB0eXBlID0gb3J0LnR5cGU7XHJcbiAgICAgICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cihpbmQgKyAxKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuJCRvblByb3BlcnR5U3RhcnQodHlwZSwgbmFtZSk7XHJcblxyXG4gICAgICAgICAgICB2YXIgY2hpbGQgPSBlbC5maXJzdEVsZW1lbnRDaGlsZDtcclxuICAgICAgICAgICAgd2hpbGUgKGNoaWxkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkaGFuZGxlRWxlbWVudChjaGlsZCwgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgY2hpbGQgPSBjaGlsZC5uZXh0RWxlbWVudFNpYmxpbmc7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuJCRvblByb3BlcnR5RW5kKHR5cGUsIG5hbWUpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkdHJ5SGFuZGxlUHJpbWl0aXZlIChlbDogRWxlbWVudCwgb3Jlc29sdmU6IElPdXRUeXBlLCBpc0NvbnRlbnQ6IGJvb2xlYW4pOiBib29sZWFuIHtcclxuICAgICAgICAgICAgaWYgKCFvcmVzb2x2ZS5pc1ByaW1pdGl2ZSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgdmFyIHRleHQgPSBlbC50ZXh0Q29udGVudDtcclxuICAgICAgICAgICAgdmFyIG9iaiA9IHRoaXMuJCRvblJlc29sdmVQcmltaXRpdmUob3Jlc29sdmUudHlwZSwgdGV4dCA/IHRleHQudHJpbSgpIDogXCJcIik7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvbk9iamVjdChvYmosIGlzQ29udGVudCk7XHJcbiAgICAgICAgICAgIHRoaXMuJCRjdXJrZXkgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuJCRwcm9jZXNzQXR0cmlidXRlcyhlbCk7XHJcbiAgICAgICAgICAgIHZhciBrZXkgPSB0aGlzLiQkY3Vya2V5O1xyXG4gICAgICAgICAgICB2YXIgb3MgPSB0aGlzLiQkb2JqZWN0U3RhY2s7XHJcbiAgICAgICAgICAgIHRoaXMuJCRvbk9iamVjdEVuZChvYmosIGtleSwgaXNDb250ZW50LCBvc1tvcy5sZW5ndGggLSAxXSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJHByb2Nlc3NBdHRyaWJ1dGVzIChlbDogRWxlbWVudCkge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgYXR0cnMgPSBlbC5hdHRyaWJ1dGVzLCBsZW4gPSBhdHRycy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kJHByb2Nlc3NBdHRyaWJ1dGUoYXR0cnNbaV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkcHJvY2Vzc0F0dHJpYnV0ZSAoYXR0cjogQXR0cik6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICB2YXIgcHJlZml4ID0gYXR0ci5wcmVmaXg7XHJcbiAgICAgICAgICAgIHZhciBuYW1lID0gYXR0ci5sb2NhbE5hbWU7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLiQkc2hvdWxkU2tpcEF0dHIocHJlZml4LCBuYW1lKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB2YXIgdXJpID0gYXR0ci5uYW1lc3BhY2VVUkk7XHJcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGF0dHIudmFsdWU7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLiQkdHJ5SGFuZGxlWEF0dHJpYnV0ZSh1cmksIG5hbWUsIHZhbHVlKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy4kJGhhbmRsZUF0dHJpYnV0ZSh1cmksIG5hbWUsIHZhbHVlLCBhdHRyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRzaG91bGRTa2lwQXR0ciAocHJlZml4OiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAocHJlZml4ID09PSBcInhtbG5zXCIpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgcmV0dXJuICghcHJlZml4ICYmIG5hbWUgPT09IFwieG1sbnNcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlICQkdHJ5SGFuZGxlWEF0dHJpYnV0ZSAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICAvLyAgLi4uIHg6TmFtZT1cIi4uLlwiXHJcbiAgICAgICAgICAgIC8vICAuLi4geDpLZXk9XCIuLi5cIlxyXG4gICAgICAgICAgICBpZiAodXJpICE9PSB0aGlzLiQkeFhtbG5zKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAobmFtZSA9PT0gXCJOYW1lXCIpXHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkb25OYW1lKHZhbHVlKTtcclxuICAgICAgICAgICAgaWYgKG5hbWUgPT09IFwiS2V5XCIpXHJcbiAgICAgICAgICAgICAgICB0aGlzLiQkY3Vya2V5ID0gdmFsdWU7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJGhhbmRsZUF0dHJpYnV0ZSAodXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZywgYXR0cjogQXR0cik6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICAvLyAgLi4uIFtuczpdVHlwZS5OYW1lPVwiLi4uXCJcclxuICAgICAgICAgICAgLy8gIC4uLiBOYW1lPVwiLi4uXCJcclxuXHJcbiAgICAgICAgICAgIHZhciB0eXBlID0gbnVsbDtcclxuICAgICAgICAgICAgdmFyIG5hbWUgPSBuYW1lO1xyXG4gICAgICAgICAgICB2YXIgaW5kID0gbmFtZS5pbmRleE9mKCcuJyk7XHJcbiAgICAgICAgICAgIGlmIChpbmQgPiAtMSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIG9ydCA9IHRoaXMuJCRvblJlc29sdmVUeXBlKHVyaSwgbmFtZS5zdWJzdHIoMCwgaW5kKSk7XHJcbiAgICAgICAgICAgICAgICB0eXBlID0gb3J0LnR5cGU7XHJcbiAgICAgICAgICAgICAgICBuYW1lID0gbmFtZS5zdWJzdHIoaW5kICsgMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy4kJG9uQXR0cmlidXRlU3RhcnQodHlwZSwgbmFtZSk7XHJcbiAgICAgICAgICAgIHZhciB2YWwgPSB0aGlzLiQkZ2V0QXR0clZhbHVlKHZhbHVlLCBhdHRyKTtcclxuICAgICAgICAgICAgdGhpcy4kJG9uQXR0cmlidXRlRW5kKHR5cGUsIG5hbWUsIHZhbCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSAkJGdldEF0dHJWYWx1ZSAodmFsOiBzdHJpbmcsIGF0dHI6IEF0dHIpOiBhbnkge1xyXG4gICAgICAgICAgICBpZiAodmFsWzBdICE9PSBcIntcIilcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWw7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLiQkZXh0ZW5zaW9uLnBhcnNlKHZhbCwgYXR0ciwgdGhpcy4kJG9iamVjdFN0YWNrKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgJCRkZXN0cm95ICgpIHtcclxuICAgICAgICAgICAgdGhpcy4kJG9uRW5kICYmIHRoaXMuJCRvbkVuZCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBmaW5kUmVzb3VyY2VzRWxlbWVudCAob3duZXJFbDogRWxlbWVudCwgdXJpOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IEVsZW1lbnQge1xyXG4gICAgICAgIHZhciBleHBlY3RlZCA9IG5hbWUgKyBcIi5SZXNvdXJjZXNcIjtcclxuICAgICAgICB2YXIgY2hpbGQgPSBvd25lckVsLmZpcnN0RWxlbWVudENoaWxkO1xyXG4gICAgICAgIHdoaWxlIChjaGlsZCkge1xyXG4gICAgICAgICAgICBpZiAoY2hpbGQubG9jYWxOYW1lID09PSBleHBlY3RlZCAmJiBjaGlsZC5uYW1lc3BhY2VVUkkgPT09IHVyaSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZDtcclxuICAgICAgICAgICAgY2hpbGQgPSBjaGlsZC5uZXh0RWxlbWVudFNpYmxpbmc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG59Il19