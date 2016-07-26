import * as types from '../action_creators.js';

// static config
const expPerEvolution = 1000;
const avgEvolutionTime = 30; //in seconds
const luckyEggDuration = 1800; //in seconds

const initialState = {};

function recommendation(state = initialState, action) {
	switch (action.type) {
		case types.LOAD:
			const player = action.player;
			const pokemon = action.pokemon;

			// prep pokedex with keys
			const pokedex = action.pokedex.reduce((map, pokemon) => {
				map[pokemon.pokemon_id.toString()] = pokemon;
				return map;	
			},{});


			// group by pokemon
			const pokemonGroups = pokemon.reduce((map,aPokemon) => {
				const PokemonId = aPokemon.pokemon_id.toString();
				
				if(!map.hasOwnProperty(PokemonId)) { 
					map[PokemonId] = []; 
				}
				map[PokemonId].push(aPokemon);
				return map; 
			},{});			
			
			// flatten map
			const pokemonGroupsFlat = Object.keys(pokemonGroups).map(key => pokemonGroups[key]);

			// remove pokemon without evolutions
			const pokemonGroupsFiltered = pokemonGroupsFlat.filter(group => {
				const PokemonId = group[0].pokemon_id;
				if(pokedex[PokemonId] && pokedex[PokemonId].evolution_stones !== null) { return true; }
				else { return false; }
			});
			
			// calculate detail	
			const detail = pokemonGroupsFiltered.map((group) => {
				const PokemonId = group[0].pokemon_id;	
					
				// data points
				const numberOfPokemon = group.length;
				const numberOfCandies = pokedex[PokemonId].evolution_stone_pieces;
				const candiesToEvolve = pokedex[PokemonId].evolution_stones;
					
				// calc points
				let pokemonLeft = numberOfPokemon;
				let candiesLeft = numberOfCandies;	
			        let evolutionCount = 0;
				let transferCount = 0;
				let numberToCatch = 0;	

				// start evolution calculations	
				for(let i = numberOfPokemon; i > 0; i--) {
					// try to evolve	
					if(candiesLeft >= candiesToEvolve) {
						evolutionCount++;	
						pokemonLeft--;
						candiesLeft -= candiesToEvolve;
					} // check if evolution is possible through trading
					else if((candiesLeft + (pokemonLeft - 1)) >= candiesToEvolve) { 
						pokemonLeft--;
						candiesLeft++;	
					}
				}
				
				// check for unused candy
				if(pokemonLeft === 0 && candiesLeft >= candiesToEvolve) {
					numberToCatch = Math.floor(candiesLeft / candiesToEvolve); // could also account for extra candie from catching...	
				}
				
				// create report for the pokemon group	
				return {
					pokemon: {
						PokemonId: PokemonId,
						name: pokedex[PokemonId].name,
						imageURL: pokedex[PokemonId].img,
						candiesToEvolve: pokedex[PokemonId].evolution_stones,	
					},
					inventory: {
						numberOfCandies: numberOfCandies,
						numberOfPokemon: numberOfPokemon,
					},
					outcome: {
						numberOfEvolutions: evolutionCount,
						numberOfTransfers: transferCount,
						experienceGained: (evolutionCount * expPerEvolution),
						timeEvolving: (evolutionCount * avgEvolutionTime),  
						candieLeft: candiesLeft, 
						pokemonLeft: pokemonLeft,	
						toCatch: numberToCatch
					}
				};
			}).sort((a,b) => {
				return b.outcome.numberOfEvolutions - a.outcome.numberOfEvolutions;
			});

			// calculate summary
			const summary = detail.reduce((map,group) => {	
				
				// add to totals
				map.totalTime += group.outcome.timeEvolving;
				map.totalExp += group.outcome.experienceGained;
				//map.levelsGained //TODO
				
				// check if its worth doing a lucky egg	
				if(map.totalTime >= luckyEggDuration) { map.useLuckyEgg = true; } 
				return map;

			},{ useLuckyEgg:false, totalTime:0, totalExp:0, levelsGained:0});
			
			// return final report
			return {
				summary: summary,
				detail: detail
			};	
		default: // default return on unknown action type
			return state;
	}
}

export default recommendation;
