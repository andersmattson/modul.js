(function() {

// Miniversion of underscore, sort of.
var _ = {
	
	uid: function(prefix) {
		return (prefix || 'modul') + (!_._uid ? (_._uid = 1) : ++_._uid);
	},
	
	is : function(o, type) {
		return Object.prototype.toString.call(o).toLowerCase() == "[object "+type+"]";
	},
	
	slice: function(arr, n) {
		return Array.prototype.slice.call(arr, n);
	},
	
	each: function(obj, fn) {
		if(!obj)
			return;
		
		if(_.is(obj, 'array')) {
			if(obj.length == 0)
				return;

			for (var i = 0, l = obj.length; i < l; i++)
				if(fn.call(obj, obj[i], i) === false)
					return;
		}
		else if(_.is(obj, 'object')) {
			for(var key in obj) {
				if(fn.call(obj, obj[key], key) === false)
					return;
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
			_.each(this._callbacks[ev], function(f, i){
				if(f === fn)
					self._callbacks[ev].splice(i,i);
			});
		}
		else
			this._callbacks[ev] = [];
		
		return this;
	},
	
	trigger: function(ev) {
		var self = this, args = _.slice(arguments), ret, i, l;
		
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

var modul = window.modul = function(nm, fn, ref) {

	ref = ref || {};

	if(_.is(nm, 'object'))
		return modul.define(nm);
	
	modul.require([nm], function() {
		modul.module(nm, fn, ref);
	});
	
	return ref;
}

_.extend(modul, {
	
	_domready: false,
	
	basepath: '',
	
	require: function(src, fn) {
		var self = this;

		if(!_.is(src, 'array'))
			src = [src];

		this._require(src, function() {
			var unsolved = [];

			_.each(src, function(s){
				var dep = self.modules[s].extends;
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
				_.xhr(url.replace(/([\w]+?\/\.\.\/)+/gi, '') + (url.substr(-3) != '.js' ? '.js' : ''), function(t) {
					self._nextload = s;
					if ( t && /\S/.test( t ) ) {
						( window.execScript || function( d ) {
							window[ "eval" ].call( window, d );
						} )( t );
					}
					self._nextload = null;

					!(--i) && fn();
				});
			}
		});
	},
	
	modules: {},
	
	instances: {},
	
	define: function(op) {
		
		var self = this;
		
		if(this._nextload)
			op.name = this._nextload;
		
		if(!op.name) {
			_.each(_.slice(document.getElementsByTagName("head")[0].childNodes).reverse(), function(s) {
				if(s.nodeName && s.nodeName.toLowerCase() == 'script' && s.getAttribute('data-modul') && !s.getAttribute('data-defined')) {
					op.name = (s.getAttribute('src') || '').replace(self.basepath, '').replace(/\.js$/, '');
					s.setAttribute('data-defined', '1');
					return false;
				}
			});
		}
		
		console.log(op.name, this._nextload, op);
		
		if(this.modules[op.name])
			op.name += _.uid();

		this.modules[op.name] = op;
		
		return this;
	},
	
	inherit: function(nm, req) {
		var base = {}, self = this;
		
		_.each(this.modules[nm].extends, function( r ) {
			_.extend(base, self.inherit(r));
		});
		
		return _.extend(base, _.clone(this.modules[nm]));
	},
	
	module: function(nm, fn, ref) {
		
		if(this.modules[nm].single && this.instances[nm].length) {
			fn && fn.apply(this.instances[nm][0]);
			return this.instances[nm][0];
		}
		
		var ref = ref || {},
			self = this, 
			evnt,
			args = _.slice(arguments, 1);
		
		_.extend(ref, this.inherit(nm, this.modules[nm]));
		
		// Convenience methods to handle DOM attachment/detachment
		_.extend(ref, _.clone(Events), {
			
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
				if(ev.match(/^(on)?((dbl|double)?click|mouse(over|out|up|down|enter|leave|move)|key(down|press|up)|blur|focus(in|out)?|change|resize|scroll)/g) && typeof jQuery != 'undefined') {
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
	}
});

_.extend(modul, _.clone(Events));

// Export _ for testing
window._ = _;

(function (fn) {
	if ( window.addEventListener ) {
		document.addEventListener( 'DOMContentLoaded', function(){ fn(); }, false );
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
});

// Figure out the modul basepath and check for main modul.
_.each(_.slice(document.getElementsByTagName('script')), function(scr){
	if(scr.src && scr.src.match(/modul\.js$/)) {
		modul.basepath = scr.src.replace(/modul\.js$/, '');
		if(scr.getAttribute('data-main'))
			modul(scr.getAttribute('data-main'));
		return false;
	}
});

if(!modul.basepath)
	throw new Error("Can't figure out the basepath for modul.js, renamed the file?");

})();