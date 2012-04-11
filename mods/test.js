modul({
	
	init: function(){
		console.log('Initiated', this.name);	
	},

	receivers: {
		'tjoho': 'tjoho'
	},
	
	tjoho: function(v){
		console.log('tjoho from '+this.name+': '+v);
	},

	test: 'test.js'
	
});