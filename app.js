// Trifolder D&D Character Display App
// by Joey Guziejka
// 11/9/2023
let ddbChars = [];
const TEMPLATE_OK = "content" in document.createElement("template");
const DEX_SCORE = 'Dexterity Score';
const DEX_ID = 2;
const apiUrl = 'https://character-service.dndbeyond.com/character/v5/character/';
const testId = 111494816;

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

	let stats = [];
	// base equipped inv items
	const eq_acs = c.inventory.filter(x => x.equipped).filter(y => y.definition.armorClass != null);
	const baseAcVal = eq_acs.map(x => x.definition.armorClass).reduce((a, b) => a + b, 0);
	if (!baseAcVal || isNaN(baseAcVal) || baseAcVal < 10) {
		baseAcVal = 10;
	}
	// armor type? max 2?
	let max2 = false;
	for (let i = 0; i < eq_acs.length; i++) {
		if (max2) 
			continue;
		
		max2 = eq_acs[i].definition.type !== 'Light Armor';
	}
	const base_dex_attr = c.stats.find(x => x.id === DEX_ID).value;
	// race stat choices
	const dex_defs = c.choices.choiceDefinitions.filter(x => x.options.some(y => y.label === DEX_SCORE));
	//const set_id = dex_defs[0].id ?? '1960452172-2';
	const dex_ids = dex_defs[0].options.filter(x => x.label === DEX_SCORE).map(y => y.id);
	const racials =  c.choices.race.filter(x => dex_ids.some(y => y == x.optionValue));
	let bonus = 0;
	for (let i = 0; i < racials.length; i++) {
		const racial = racials[i];
		bonus += racial.label.includes('2') ? 2 : 1;		
	}

	let baseDex = base_dex_attr + bonus;
	let modDex = Math.floor((baseDex - 10) / 2);
	let finalAc = baseAcVal + (max2 && modDex > 2 ? 2 : modDex);


	//16; // tbd
	//inventory[0].equipped
	//definition.armorClass
	stats.push(`AC: ${finalAc}`);


	let dc_statlist = clone.querySelector('.dc-stat-list');
	for (let i = 0; i < stats.length; i++) {
		let stat = document.createElement('li');
		stat.textContent = stats[i];
		dc_statlist.appendChild(stat);
	}

	const o_container = document.querySelector('#output');
	o_container.appendChild(clone);
}


document.addEventListener("DOMContentLoaded", function(event) {
    init();
});