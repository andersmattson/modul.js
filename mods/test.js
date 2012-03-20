modul({

	init: function(){
		console.log('Initiated', this.name);	
	},

	receivers: {
		'tjoho': 'tjoho'	
	},
	
	tjoho: function(){
		console.log('tjoho from '+this.name);
	},

	test: 'test.js'
	
});