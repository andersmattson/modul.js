modul({
	
	inherits: ['mods/test2'],
	
	msg: 'this is main',
	
	receivers: {
		'tjoho2': function(){
			console.log('second tjoho from '+this.name);
		}
	},
	
	init: function() {
		modul.log(this.msg, this);
	}
});
