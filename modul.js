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
	
	normalizeUrl: function(url) {
		return url.replace(/([\w]+?\/\.\.\/)+/gi, '') + (url.substr(-3) != '.js' ? '.js' : '');
	},
	
	domready: function(fn) {

		var done = false, 
			top = true,
			doc = window.document, 
			root = doc.documentElement,
			t = !!doc.addEventListener,
			add = t ? 'addEventListener' : 'attachEvent',
			rem = t ? 'removeEventListener' : 'detachEvent',
			pre = t ? '' : 'on',
			init = function(e) {
				if (e.type == 'readystatechange' && doc.readyState != 'complete') return;
				(e.type == 'load' ? window : doc)[rem](pre + e.type, init, false);
				if (!done && (done = true)) fn.call(window, e.type || e);
			},
			poll = function() {
				try { root.doScroll('left'); } catch(e) { setTimeout(poll, 50); return; }
				init('poll');
			};
	
		if (doc.readyState == 'complete') fn.call(modul);
		else {
			if (doc.createEventObject && root.doScroll) {
				try { top = !window.frameElement; } catch(e) { }
				if (top) poll();
			}
			doc[add](pre + 'DOMContentLoaded', init, false);
			doc[add](pre + 'readystatechange', init, false);
			window[add](pre + 'load', init, false);
		}
	
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

var modul = window.modul = function(nm, fn) {

	if(_.is(nm, 'object'))
		return modul.define(nm);
	
	var base = {};
	modul.require([nm], function() {
		modul.module(nm, fn);
		base.meddelande = 'Det gick';
	});
	
	return base;
}

_.extend(modul, {
	
	basepath: '',
	
	require: function(src, fn) {
		var self = this;

		if(!_.is(src, 'array'))
			src = [src];

		modul._require(src, function() {
			var unsolved = [];

			_.each(src, function(s){
				var dep = modul.modules[s].require;
				_.each(dep, function(d) {
					if(!modul.modules[d])
						unsolved.push(d);
				});
			});
			
			if(unsolved.length)
				modul.require(unsolved, fn);
			else
				fn();
		});
	},
	
	_require: function(src, fn) {
		var i = src.length, self = this;

		_.each(src, function(s) {

			if(modul.modules[s])
				!(--i) && fn();
			else {
				var js = document.createElement('script'); 
				js.onload = function() {
					!(--i) && fn();
				}
				js.src = _.normalizeUrl(self.basepath + s);
				js.setAttribute('data-modul', s);
				document.getElementsByTagName('head')[0].appendChild(js);
			}
		});
	},
	
	modules: {},
	
	instances: {},
	
	define: function(op) {
		
		var self = this;
		
		if(!op.name) {
			_.each(_.slice(document.getElementsByTagName("head")[0].childNodes).reverse(), function(s) {
				if(s.nodeName && s.nodeName.toLowerCase() == 'script' && s.getAttribute('data-modul') && !s.getAttribute('data-defined')) {
					op.name = (s.getAttribute('src') || '').replace(self.basepath, '').replace(/\.js$/, '');
					s.setAttribute('data-defined', '1');
					return false;
				}
			});
		}
		
		console.log(op.name, op);
		
		if(this.modules[op.name])
			op.name += _.uid();

		this.modules[op.name] = op;
		
		return this;
	},
	
	inherit: function(nm, req) {
		var base = {}, self = this;
		
		_.each(self.modules[nm].require, function( r ) {
			_.extend(base, self.inherit(r));
		});
		
		return _.extend(base, _.clone(this.modules[nm]));
	},
	
	module: function(nm, fn) {
		
		if(this.modules[nm].single && this.instances[nm].length) {
			fn && fn.apply(this.instances[nm]);
			return this.instances[nm];
		}
		
		var op = this.inherit(nm, this.modules[nm]),
			self = this, 
			evnt,
			args = _.slice(arguments, 1);
		
		// Convenience methods to handle DOM attachment/detachment
		op = _.extend({}, op, _.clone(Events), {
			
			uid: _.uid(),
			
			$el: document.createElement(op.tagName || 'div'),
			
			appendTo: function(el) {
				this.$el.appendTo(el);
			},
			
			remove: function() {
				this.$el.remove();
			}
		});
		
		_.bindAll(op);

		// Attach events
		if(op.events) {
			_.each(op.events, function(fn, ev) {
				
				if(!fn)
					return;
					
				if(modul.is(fn, 'string'))
					fn = op[fn];
				
				// Standard DOM events, might be a nicer way of handling this.
				if(ev.match(/^(on)?((dbl|double)?click|mouse(over|out|up|down|enter|leave|move)|key(down|press|up)|blur|focus(in|out)?|change|resize|scroll)/g)) {
					evnt = ev.split(' ');

					// delegated to child elements
					if(evnt.length == 2)
						op.$el.on(evnt[0], evnt[1], fn);
					// direct
					else
						op.$el.on(evnt[0], fn);
				}
				// Custom events
				else
					op.on(ev, fn);
			});
		}

		if(op.receivers) {
			_.each(op.receivers, function(fn, ev) {

				if(!fn)
					return;
					
				if(_.is(fn, 'string'))
					fn = op[fn];
				op.receive(ev, fn);
			});
		}
		
		if(!this.instances[nm])
			this.instances[nm] = [];

		this.instances[nm].push(op);
		
		op.init && op.init.apply(op);
		
		fn && fn.apply(op);
			
		return op;
	},
	
	error: function(err) {
		this.trigger('error',err);
	}
	
});

_.extend(modul, _.clone(Events));
//_.bindAll(modul);

// Export _ for testing
window._ = _;

// Figure out the modul basepath
_.each(_.slice(document.getElementsByTagName('script')), function(scr){
	if(scr.src && scr.src.match(/modul\.js$/)) {
		modul.basepath = scr.src.replace(/modul\.js$/, '');
		if(scr.getAttribute('data-main')) {
			_.domready(function(){
				console.log('domready');
				modul(scr.getAttribute('data-main'));
			})
		}
		return false;
	}
});

if(!modul.basepath)
	throw new Error("Can't figure out the basepath for modul.js, renamed the file?");

})();