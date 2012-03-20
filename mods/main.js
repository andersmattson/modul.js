modul({
	
	require: ['mods/test2'],
	
	msg: 'this is main',
	
	receivers: {
		'tjoho2': function(){console.log('second tjoho from '+this.name)}
	},
	
	init: function() {
		console.log(this.msg, this);
	}
});
