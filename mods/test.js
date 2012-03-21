modul({

	init: function(){
		modul.log('Initiated', this.name);	
	},

	receivers: {
		'tjoho': 'tjoho'	
	},
	
	tjoho: function(v){
		modul.log('tjoho from '+this.name+': '+v);
	},

	test: 'test.js'
	
});