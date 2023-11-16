// Trifolder D&D Character Display App
// by Joey Guziejka
// 11/9/2023
let ddbChars = [];
const TEMPLATE_OK = "content" in document.createElement("template");
const DEX_SCORE = 'Dexterity Score';
const apiUrl = 'http://cors-anywhere.com/https://character-service.dndbeyond.com/character/v5/character/';
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
	const tb = document.querySelector('#dc-input');
	const dc_inputVal = tb.value;
	if (!dc_inputVal || dc_inputVal.length < 1) {
		const url = './sample_data.json';
		const response = await fetch(url);
		const charData = await response.json();
		const itbd = 0;
		ddbChars[itbd] = charData;
	} else {
		const dc_vals = dc_inputVal.split('\n');
		for (let i = 0; i < dc_vals.length; i++) {
			const options = { 
				method: 'GET',
				headers: {
					'Access-Control-Allow-Origin': '*'
				}
			};

			const dc_val = dc_vals[i];
			const url = apiUrl + dc_val;
			//const url = `./${dc_val}.json`;
      try {
        const response = await fetch(url, options);
        const charData = await response.json();
        ddbChars[i] = charData; 
      } catch (error) {
        console.log(error);
      }
		}
	}
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
	const statTemplate = document.querySelector('#dc-stat-template');
	const clone = template.content.cloneNode(true);

	const dc_img = clone.querySelector('.dc-img');
	dc_img.setAttribute('src', c.decorations.avatarUrl);

	const dc_name = clone.querySelector('.dc-name');
	dc_name.textContent = c.name;

	const dc_rccl = clone.querySelector('.dc-raceclass');
	const className = c.classes.map(o => o.definition.name + ' ' + o.subclassDefinition.name).join(', ');
	dc_rccl.innerHTML = `Race: ${c.race.fullName}<br />Class: ${className}`;

	const characterInfo = calculateCharacterStats(c);

	const dc_stats = clone.querySelector('.dc-stats');
	for (let i = 0; i < characterInfo.stats.length; i++) {
		const stat = characterInfo.stats[i];
		const statClone = statTemplate.content.cloneNode(true);
		const statName = statClone.querySelector('.dc-stat-name');
		statName.textContent = stat.n;
		const statTotal = statClone.querySelector('.dc-stat-total');
		statTotal.textContent = stat.t;
		const statMod = statClone.querySelector('.dc-stat-mod');
		statMod.textContent = stat.m > 0 ? '+' + stat.m : stat.m;
		dc_stats.appendChild(statClone);
	}

	let ops = [
		`AC: ${characterInfo.finalAc}`,
		`Level: ${characterInfo.level}`,
		`Passive Perception: ${characterInfo.passivePerception}`,
		`Passive Investigation: ${characterInfo.passiveInvestigation}`,
		`Passive Insight: ${characterInfo.passiveInsight}`
	];
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
	const stats = [];
	// base equipped inv items with AC
	const eq_acs = c.inventory.filter(x => x.equipped).filter(y => y.definition.armorClass != null);
	const baseAcVal = eq_acs.map(x => x.definition.armorClass).reduce(duce, 0);
	if (!baseAcVal || isNaN(baseAcVal) || baseAcVal < 10) {
		baseAcVal = 10;
	}
	// armor type? max 2?
	let isMax2Dex = false;
	for (let i = 0; i < eq_acs.length; i++) {
		if (isMax2Dex) 
			break;
		
		isMax2Dex = eq_acs[i].definition.type !== 'Light Armor';
	}
	// stats
	const baseStats = c.stats.map(x => x.value);
	for (let i = 0; i < STAT_NAMES.length; i++) {
		const sName = STAT_NAMES[i].split('|');
		const raceBonus = c.modifiers.race.filter(x => x.type === 'bonus' && x.subType === sName[1]).map(y => y.value).reduce(duce, 0);
		const classBonus = c.modifiers.class.filter(x => x.type === 'bonus' && x.subType === sName[1]).map(y => y.value).reduce(duce, 0);
		const statTotal = baseStats[i] + raceBonus + classBonus;
		const statMod = statTotalToMod(statTotal);
		stats[i] = { n: sName[0], t: statTotal, m: statMod };
	}

	const dexTotal = stats.find(x => x.n === 'DEX').t;
	const intTotal = stats.find(x => x.n === 'INT').t;
	const wisTotal = stats.find(x => x.n === 'WIS').t;

	const dexMod = statTotalToMod(dexTotal);
	const intMod = statTotalToMod(intTotal);
	const wisMod = statTotalToMod(wisTotal);

	const finalAc = baseAcVal + (isMax2Dex && dexMod > 2 ? 2 : dexMod);
	const level = c.classes.map(x => x.level).reduce(duce, 0);
	const pb = levelToProfBonus(level);
	// prof perception investigation insight
	const hasProfPerceptionClass = c.modifiers.class.some(x => x.type === 'proficiency' && x.subType === 'perception');
	const hasProfPerceptionBakGd = c.modifiers.background.some(x => x.type === 'proficiency' && x.subType === 'perception');

	const hasProfInvestigationClass = c.modifiers.class.some(x => x.type === 'proficiency' && x.subType === 'investigation');
	const hasProfInvestigationBakGd = c.modifiers.background.some(x => x.type === 'proficiency' && x.subType === 'investigation');
	
	const hasProfInsightClass = c.modifiers.class.some(x => x.type === 'proficiency' && x.subType === 'insight');
	const hasProfInsightBakGd = c.modifiers.background.some(x => x.type === 'proficiency' && x.subType === 'insight');
	// tbd expertise
	const passivePerception = 10 + wisMod + (hasProfPerceptionClass || hasProfPerceptionBakGd ? pb : 0);
	const passiveInvestigation = 10 + intMod + (hasProfInvestigationClass || hasProfInvestigationBakGd ? pb : 0);
	const passiveInsight = 10 + wisMod + (hasProfInsightClass || hasProfInsightBakGd ? pb : 0);

	return { finalAc, level, passivePerception, passiveInvestigation, passiveInsight, stats };
}

function statTotalToMod(t) {
	return Math.floor((t - 10) / 2);
}

function levelToProfBonus(level) {
	return Math.ceil(level/4) + 1;
}

function duce(a, b) {
	return a + b;
} 

document.addEventListener("DOMContentLoaded", function(event) {
  init();
});