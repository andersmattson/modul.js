(function() {

// Miniversion of underscore, sort of.
var _ = {
	
	uid: function(prefix) {
		return (prefix || 'modul') + (!_._uid ? (_._uid = 1) : ++_._uid);
	},
	
	is : function(o, type) {
		var t = Object.prototype.toString.call(o).toLowerCase().replace(/(\[object\s|\])/gi,'');
		return type ? t == type : t;
	},
	
	toArray: function(collection) {
	
		if(_.is(collection, 'array'))
			return collection;
		
		var ret = [];
		_.each(collection, function(o) {
			ret.push(o);
		});
		
		return ret;
	},
	
	slice: function(arr, n) {
		return Array.prototype.slice.call(_.toArray(arr), n);
	},
	
	each: function(obj, fn) {
		if(!obj)
			return;
		
		if(_.is(obj, 'array') || obj.length) {
			if(obj.length == 0)
				return;

			for (var i = 0, l = obj.length; i < l; i++)
				if(fn.call(obj, obj[i], i) === false)
					return;
		}
		else if(_.is(obj, 'object')) {
			for(var key in obj) {
				try {
					if(obj.hasOwnProperty(key) && fn.call(obj, obj[key], key) === false)
						return;
				}catch(e) {
					var ooo = obj;
					//console.log('error', typeof obj);
				}
			}
		}
	},
	
	extend: function(obj) {
		_.each(_.slice(arguments, 1), function(source) {
			_.each(source, function(val, prop){
				if(_.is(source[prop], 'object') || _.is(source[prop], 'array')) {
					if(obj[prop])
						obj[prop] = _.extend(obj[prop], source[prop]);
					else
						obj[prop] = _.clone(source[prop]);
				}
				else
					obj[prop] = source[prop];
			});
		});
		return obj;
	},
	
	clone: function(obj) {
		if (!_.is(obj, 'object')) return obj;
		return _.is(obj, 'array') ? obj.slice() : _.extend({}, obj);
	},
	
	bindAll: function(obj) {
		_.each(obj, function(o, key) {
			if(_.is(o, 'function')) {
				obj[key] = function() {
					return o.apply(obj, _.slice(arguments));
				}
			}
		});
	},
	
	// Andrea Giammarchis excellent queue system
	queue: function(args, f) {
		setTimeout(args.next = function next() {
			return (f = args.shift()) ? !!f(args) || !0 : !1;
		}, 0);
		return args;
	},
	
	xhr: function(u, f, x) {
	
		if(/^http(s)?\:\/\//gi.test(u)) {
			modul.log('Add loader for external scripts', u);
		}
		x = this.ActiveXObject;
		x = new(x ? x : XMLHttpRequest)('Microsoft.XMLHTTP');
		x.open('GET', u, 1);
		x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		x.onreadystatechange = function() {
			x.readyState > 3 && f ? f(x.responseText, x) : 0
		};
		x.send()
	}
	
};

var Events = {
	_callbacks: {},
	
	on: function(ev, fn) {
		if(!this._callbacks[ev])
			this._callbacks[ev] = [];
		
		this._callbacks[ev].push(fn);
		
		return this;
	},
	
	off: function(ev, fn) {
		var self = this;

		if(fn) {
			_.each(this._callbacks[ev], function(f, i) {
				if(f === fn)
					self._callbacks[ev].splice(i,i);
			});
		}
		else
			this._callbacks[ev] = [];
		
		return this;
	},
	
	trigger: function(ev) {
		var self = this, args = _.slice(arguments, 1), ret, i, l;
		
		_.each(this._callbacks[ev], function(f, i) {
			return f.apply(self, args);
		});
		
		_.each(this._callbacks['all'], function(f, i){
			return f.apply(self, [ev].concat(args));
		});
		
		return this;
	},
	
	emit: function(ev) {

		modul.trigger.apply(modul, ['receive:'+ev].concat(_.slice(arguments, 1)));

		return this;
	},
	
	receive: function(ev, fn) {

		var self = this;

		modul.on('receive:'+ev, function() {
			fn.apply(self, _.slice(arguments));
		});

		return this;
	}
};

var Attributes = {
	_attributes: {},
	
	_changedAttributes: {},
	
	get: function(key, def) {
		return this._changedAttributes[key] !== undefined ? this._changedAttributes[key] : this._attributes[key] !== undefined ? this._attributes[key] : def;
	},
	
	set: function(key, val) {
		this._attributes[key] = val;
		this.trigger('change:'+key, val).trigger('change', key, val);
	},
	
	save: function(fn) {
		_.extend(this._attributes, this._changedAttributes);
		this.reset();
	},
	
	reset: function() {
		this._changedAttributes = {};
	}
};

var DOMEvent = {
	on: function(evnt, elem, func) {
	    (elem.addEventListener) ? elem.addEventListener(evnt,func,false) : elem.attachEvent("on"+evnt, func);
	},
	
	off: function(evnt, elem, func) {
	    (elem.removeEventListener) ? elem.removeEventListener(evnt,func,false) : elem.detachEvent("on"+evnt, func);
	}
};


var modul = window.modul = function(nm, fn, ref) {

	ref = ref || {};

	if(_.is(nm, 'object'))
		return modul.define(nm);
	
	if(modul.modules[nm] && modul.modules[nm].single && modul.instances[nm].length) {
		fn && fn.apply(modul.instances[nm][0]);
		return modul.instances[nm][0];
	}

	modul.require([nm], function() {
		if(modul.modules[nm] === true) {
			fn && fn();
		}
		else
			modul.module(nm, fn, ref);
	});
	
	return ref;
}

_.extend(modul, {
	
	_domready: false,
	
	basepath: null,
	
	require: function(src, fn) {
		var self = this;

		if(!_.is(src, 'array'))
			src = [src];

		this._require(src, function() {
			var unsolved = [];

			_.each(src, function(s){
				var dep = self.modules[s]['inherits'];
				_.each(dep, function(d) {
					if(!self.modules[d])
						unsolved.push(d);
				});
			});
			
			if(unsolved.length)
				self.require(unsolved, fn);
			else
				fn();
		});
	},
	
	_require: function(src, fn) {
		var i = src.length, self = this, url;

		_.each(src, function(s) {

			if(self.modules[s])
				!(--i) && fn();
			else {
				url = self.basepath + s;
				if(url.substr(-3) == '.js') {
					var js = document.createElement('script'); 
					js.src = url;
					js.onload = function() {
						self.modules[s] = true;
						!(--i) && fn();
					}
					document.getElementsByTagName('head')[0].appendChild(js);
				}
				else {
					_.xhr(url.replace(/([\w]+?\/\.\.\/)+/gi, '') + '.js', function(t) {
						self._nextload = s;
						if ( t && /\S/.test( t ) ) {
							( window.execScript || function( d ) {
								window[ "eval" ].call( window, d );
							} )( '(function(){'+t+'})();' );
						}
						self._nextload = null;
	
						!(--i) && fn();
					});
				}
			}
		});
	},
	
	modules: {},
	
	instances: {},
	
	define: function(op) {
		
		var self = this;
		
		if(this._nextload)
			op.name = this._nextload;

		if(this.modules[op.name])
			op.name += _.uid();
		
		this.modules[op.name] = _.extend({}, op, _.clone(Events), _.clone(Attributes));
		
		return this;
	},
	
	inherit: function(nm, req) {
		var base = {}, self = this;
		
		_.each(this.modules[nm]['inherits'], function( r ) {
			_.extend(base, self.inherit(r));
		});
		
		return _.extend(base, _.clone(this.modules[nm]));
	},
	
	module: function(nm, fn, ref) {
		
		var ref = ref || {},
			self = this, 
			evnt,
			args = _.slice(arguments, 1);
		
		_.extend(ref, this.inherit(nm, this.modules[nm]), {
			
			uid: _.uid(),
						
			$el: document.createElement(ref.tagName || 'div'),
			
			appendTo: function(el) {
				this.$el.appendTo(el);
			},
			
			remove: function() {
				this.$el.remove();
			}
		});
		
		_.bindAll(ref);

		// Attach events
		if(ref.events) {
			_.each(ref.events, function(fn, ev) {
				
				if(!fn)
					return;
					
				if(_.is(fn, 'string'))
					fn = ref[fn];
				
				// Standard DOM events, might be a nicer way of handling this.
				if(typeof jQuery != 'undefined' && ev.match(/^(on)?((dbl|double)?click|mouse(over|out|up|down|enter|leave|move)|key(down|press|up)|blur|focus(in|out)?|change|resize|scroll)/g)) {
					evnt = ev.split(' ');

					// delegated to child elements
					if(evnt.length == 2)
						jQuery(ref.$el).on(evnt[0], evnt[1], fn);
					// direct
					else
						jQuery(ref.$el).on(evnt[0], fn);
				}
				// Custom events
				else
					ref.on(ev, fn);
			});
		}

		if(ref.receivers) {
			_.each(ref.receivers, function(fn, ev) {

				if(!fn)
					return;
					
				if(_.is(fn, 'string'))
					fn = ref[fn];
				
				ref.receive(ev, fn);
			});
		}
		
		if(!this.instances[nm])
			this.instances[nm] = [];

		this.instances[nm].push(ref);
		
		ref.init && ref.init.apply(ref);
		
		ref.trigger('init');
		
		fn && fn.apply(ref);
			
		return ref;
	},
	
	log: function() {
		this.emit('log', _.slice(arguments));
	}
}, _.clone(Events));


var /*History = function() {
		_.bindAll(this, 'checkUrl');
	},*/
	routeStripper = /^[#\/]/,
	isExplorer = /msie [\w.]+/,
	historyStarted = false;

var _history = _.extend({}, Events, { 
	
	interval: 50,

	getFragment: function(fragment, forcePushState) {
		if (fragment == null) {
			if (this._hasPushState || forcePushState) {
				fragment = window.location.pathname;
				var search = window.location.search;
				if (search) fragment += search;
			} else {
				fragment = window.location.hash;
			}
		}
		fragment = decodeURIComponent(fragment);
		if (!fragment.indexOf(this.options.root)) fragment = fragment.substr(this.options.root.length);
		return fragment.replace(routeStripper, '');
	},

	start: function(options) {
	
		if (historyStarted) throw new Error("Backbone.history has already been started");

		this.options = _.extend({}, {
			root: '/'
		}, this.options, options);

		this._wantsHashChange = this.options.hashChange !== false;
		this._wantsPushState = !! this.options.pushState;
		this._hasPushState = !! (this.options.pushState && window.history && window.history.pushState);
		var fragment = this.getFragment();
		var docMode = document.documentMode;

		var oldIE = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

		if (oldIE) {
			var f = document.createElement('iframe');
			f.src = 'javascript:0';
			f.setAttribute('tabindex', '-1');
			document.body.appendChild(f);
			this.iframe = f.contentWindow;
			this.navigate(fragment);
		} 
		
		if (this._hasPushState) {
			DOMEvent.on('popstate', window, this.checkUrl);
		} else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
			DOMEvent.on('hashchange', window, this.checkUrl);
		} else if (this._wantsHashChange) {
			this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
		} 
		
		this.fragment = fragment;
		historyStarted = true;
		var loc = window.location;
		var atRoot = loc.pathname == this.options.root; 
		
		if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
			this.fragment = this.getFragment(null, true);
			window.location.replace(this.options.root + '#' + this.fragment); 
			
			return true; 
			
		} else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
			this.fragment = loc.hash.replace(routeStripper, '');
			window.history.replaceState({}, document.title, loc.protocol + '//' + loc.host + this.options.root + this.fragment);
		}
		
		if (!this.options.silent) {
			return this.loadUrl();
		}
	},

	checkUrl: function(e) {
		var current = this.getFragment();
		if (current == this.fragment && this.iframe) current = this.getFragment(this.iframe.location.hash);
		if (current == this.fragment || current == decodeURIComponent(this.fragment)) return false;
		if (this.iframe) this.navigate(current);
		this.loadUrl() || this.loadUrl(window.location.hash);
	},
	
	loadUrl: function(fragmentOverride) {
		modul.emit("route", this.fragment = this.getFragment(fragmentOverride));
		return true;
	},
	
	navigate: function(fragment, options) {
		if (!historyStarted) return false;
		if (!options || options === true) options = {
			trigger: options
		};
		var frag = (fragment || '').replace(routeStripper, '');
		if (this.fragment == frag || this.fragment == decodeURIComponent(frag)) return; 
		if (this._hasPushState) {
			if (frag.indexOf(this.options.root) != 0) frag = this.options.root + frag;
			this.fragment = frag;
			window.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, frag); 
		} else if (this._wantsHashChange) {
			this.fragment = frag;
			this._updateHash(window.location, frag, options.replace);
			if (this.iframe && (frag != this.getFragment(this.iframe.location.hash))) { 
				if (!options.replace) this.iframe.document.open().close();
				this._updateHash(this.iframe.location, frag, options.replace);
			} 
		} else {
			window.location.assign(this.options.root + fragment);
		}
		if (options.trigger) this.loadUrl(fragment);
	},

	_updateHash: function(location, fragment, replace) {
		if (replace) {
			location.replace(location.toString().replace(/(javascript:|#).*$/, '') + '#' + fragment);
		} else {
			location.hash = fragment;
		}
	}
});

// Export _ for testing
window._ = _;

//var _history = new History();
_.bindAll(_history);

modul.navigate = function(url, options) {
	return _history.navigate(url, !options);
};

(function (fn) {
	if ( window.addEventListener ) {
		document.addEventListener( 'DOMContentLoaded', fn, false );
	} else {
		(function(){
			if ( ! document.uniqueID && document.expando ) return;
			var tmp = document.createElement( 'document:ready' );
			try {
				tmp.doScroll( 'left' );
				fn();
			} catch ( err ) {
				setTimeout( arguments.callee, 0 );
			}
		})();
	}
})(function () {
	modul._domready = true;
	modul.trigger('domready').emit('domready');
	_history.start();
});

// Figure out the modul basepath and check for main modul.
_.each(_.slice(document.getElementsByTagName('script')), function(scr){
	if(scr.src && scr.getAttribute('src').match(/modul\.js$/)) {
		// TODO: if this is loaded remotely, what happens with the basepath?
		modul.basepath = scr.getAttribute('src').replace(/modul\.js$/, '');
		modul.libversion = scr.getAttribute('data-version') || 1;
		
		if(typeof jQuery == 'undefined') {
			// Load jQuery
			modul('http://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js', function() {
				modul.select = function(sel, context) {
					return $(sel, context || document);
				}
				if(scr.getAttribute('data-main'))
					modul(scr.getAttribute('data-main'));
			});
		}
		else {
			modul.select = function(sel, context) {
				return (context || document).querySelectorAll(sel);
			}
			if(scr.getAttribute('data-main'))
				modul(scr.getAttribute('data-main'));
		}
		
		return false;
	}
});

if(modul.basepath == null)
	throw new Error("Can't figure out the basepath for modul.js, renamed the file?");

})();