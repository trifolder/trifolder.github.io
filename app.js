// Trifolder D&D Character Display App
// by Joey Guziejka
// 11/9/2023
let ddbChars = [];
const TEMPLATE_OK = "content" in document.createElement("template");
const DEX_SCORE = 'Dexterity Score';
const apiUrl = 'https://character-service.dndbeyond.com/character/v5/character/';
const testId = 111494816;
const STAT_NAMES = [ 'STR|strength-score', 'DEX|dexterity-score', 'CON|constitution-score', 'INT|intelligence-score', 'WIS|wisdom-score', 'CHA|charisma-score' ];

function init() {
	const btnLoad = document.querySelector("#btn-load");
	btnLoad.addEventListener("click", async () => {
		await handleLoadPress();
	});
}


async function handleLoadPress() {
	await getDataFromDdbUrl();
	await loadCharacterInfo();
}

async function getDataFromDdbUrl() {
	//const url = apiUrl + testId;
	const url = './sample_data.json';
	const response = await fetch(url);
	const charData = await response.json();
	const itbd = 0;
	ddbChars[itbd] = charData;
}

async function loadCharacterInfo() {
	for (let i = 0; i < ddbChars.length; i++) {
		const ddbChar = ddbChars[i];
		if (ddbChar && ddbChar.success && ddbChar.data) {
			buildCharacterView(ddbChar.data);
		} else {
			console.log(ddbChar);
			console.warn('fail');
		}
	}
}

function buildCharacterView(c) {
	if (!TEMPLATE_OK) {
		alert('browser no support templates!!!');
		return;
	}
	
	const template = document.querySelector('#dc-template');
	const clone = template.content.cloneNode(true);

	let dc_img = clone.querySelector('.dc-img');
	dc_img.setAttribute('src', c.decorations.avatarUrl);

	let dc_name = clone.querySelector('.dc-name');
	dc_name.textContent = c.name;

	let dc_rccl = clone.querySelector('.dc-raceclass');
	const className = c.classes.map(o => o.definition.name + ' ' + o.subclassDefinition.name).join(', ');
	dc_rccl.innerHTML = `Race: ${c.race.fullName}<br />Class: ${className}`;

	let stats = calculateCharacterStats(c);
	let ops = [];

	//16; // tbd
	//inventory[0].equipped
	//definition.armorClass
	ops.push(`AC: ${stats.finalAc}`);


	let dc_statlist = clone.querySelector('.dc-stat-list');
	for (let i = 0; i < ops.length; i++) {
		let op = document.createElement('li');
		op.textContent = ops[i];
		dc_statlist.appendChild(op);
	}

	const o_container = document.querySelector('#output');
	o_container.appendChild(clone);
}

function calculateCharacterStats(c) {
	let stats = [];
	// base equipped inv items with AC
	const eq_acs = c.inventory.filter(x => x.equipped).filter(y => y.definition.armorClass != null);
	const baseAcVal = eq_acs.map(x => x.definition.armorClass).reduce((a, b) => a + b, 0);
	if (!baseAcVal || isNaN(baseAcVal) || baseAcVal < 10) {
		baseAcVal = 10;
	}
	// armor type? max 2?
	let max2 = false;
	for (let i = 0; i < eq_acs.length; i++) {
		if (max2) 
			break;
		
		max2 = eq_acs[i].definition.type !== 'Light Armor';
	}

	const baseStats = c.stats.map(x => x.value);

	for (let i = 0; i < STAT_NAMES.length; i++) {
		const sName = STAT_NAMES[i].split('|');
		const raceBonus = c.modifiers.race.filter(x => x.type === 'bonus' && x.subType === sName[1]).map(y => y.value).reduce((a, b) => a + b, 0);
		const classBonus = c.modifiers.class.filter(x => x.type === 'bonus' && x.subType === sName[1]).map(y => y.value).reduce((a, b) => a + b, 0);
		stats[i] = { n: sName[0], b: baseStats[i], r: raceBonus, c: classBonus, t: (baseStats[i] + raceBonus + classBonus) };
	}

// 	c.modifiers.race[6].type === 'bonus' 
// true
// c.modifiers.race[6].subType
// 'dexterity-score'
	//const dexIdx = STAT_INDEX.findIndex(x => x === "DEX");
	//const base_dex_attr = baseStats[dexIdx];
	//c.stats.find(x => x.id === DEX_ID).value;
	// race stat choices
	// const dex_defs = c.choices.choiceDefinitions.filter(x => x.options.some(y => y.label === DEX_SCORE));
	// //const set_id = dex_defs[0].id ?? '1960452172-2';
	// const dex_ids = dex_defs[0].options.filter(x => x.label === DEX_SCORE).map(y => y.id);
	// const racials = c.choices.race.filter(x => dex_ids.some(y => y == x.optionValue));
	// let bonus = 0;
	// for (let i = 0; i < racials.length; i++) {
	// 	const racial = racials[i];
	// 	bonus += racial.label.includes('2') ? 2 : 1;		
	// }

	let modDex = Math.floor((stats[1].t - 10) / 2);
	let finalAc = baseAcVal + (max2 && modDex > 2 ? 2 : modDex);
	return { finalAc, stats };
}

document.addEventListener("DOMContentLoaded", function(event) {
    init();
});