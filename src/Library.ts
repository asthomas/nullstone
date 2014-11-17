module nullstone {
    export interface ILibrary {
        uri: string;
        sourcePath: string;
        rootModule: any;
        loadAsync (): async.IAsyncRequest<Library>;
        resolveType (moduleName: string, name: string, /* out */oresolve: IOutType): boolean;

        add (name: string, type: any): ILibrary;
        addPrimitive (name: string, type: any): ILibrary;
        addEnum (name: string, enu: any): ILibrary;
    }
    export class Library implements ILibrary {
        private $$module: any = null;
        private $$sourcePath: string = null;

        private $$primtypes: any = {};
        private $$types: any = {};

        uri: string;

        get sourcePath (): string {
            return this.$$sourcePath || 'lib/' + this.uri + '/' + this.uri;
        }

        set sourcePath (value: string) {
            this.$$sourcePath = value;
        }

        constructor (uri: string) {
            Object.defineProperty(this, "uri", {value: uri, writable: false});
        }

        get rootModule (): any {
            return this.$$module = this.$$module || require(this.sourcePath);
        }

        loadAsync (): async.IAsyncRequest<Library> {
            return async.create((resolve, reject) => {
                require([this.sourcePath], (rootModule) => {
                    this.$$module = rootModule;
                    resolve(this);
                });
            });
        }

        resolveType (moduleName: string, name: string, /* out */oresolve: IOutType): boolean {
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
            return oresolve.type !== undefined;
        }

        add (name: string, type: any): ILibrary {
            if (!type)
                throw new Error("A type must be specified when registering '" + name + "'`.");
            Object.defineProperty(type, "$$uri", {value: this.uri, writable: false});
            this.$$types[name] = type;
            return this;
        }

        addPrimitive (name: string, type: any): ILibrary {
            if (!type)
                throw new Error("A type must be specified when registering '" + name + "'`.");
            Object.defineProperty(type, "$$uri", {value: this.uri, writable: false});
            this.$$primtypes[name] = type;
            return this;
        }

        addEnum (name: string, enu: any): ILibrary {
            this.add(name, enu);
            Object.defineProperty(enu, "$$enum", {value: true, writable: false});
            enu.name = name;
            return this;
        }
    }
}