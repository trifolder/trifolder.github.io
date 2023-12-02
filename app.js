// Trifolder D&D Character Display App
// by Joey Guziejka
// cd_11/09/2023
// md_12/01/2023

let ddbChars = [];
const TEMPLATE_OK = "content" in document.createElement("template");
let isOnline = false;
const DEX_SCORE = 'Dexterity Score';
const apiUrl = 'http://cors-anywhere.com/https://character-service.dndbeyond.com/character/v5/character/';
const testId = 111494816;
const STAT_NAMES = [ 'STR|strength-score', 'DEX|dexterity-score', 'CON|constitution-score', 'INT|intelligence-score', 'WIS|wisdom-score', 'CHA|charisma-score' ];


async function init() {
	await healthCheck();
	const btnLoad = document.querySelector("#btn-load");
	btnLoad.addEventListener("click", async (e) => {
		await handleLoadPress(e);
	});
	const btnLoadManual = document.querySelector("#btn-load-manual");
	const btnImport = document.querySelector("#btn-import");
	btnImport.addEventListener("click", async (e) => {
		//await handleImport(e);
	});
}

// this function verifies the proxy is running 
// and the app is able to make requests
async function healthCheck() {
	const url = 'https://gradelink-qa.azurewebsites.net/zHealth';
	const options = { 
		method: 'GET',
		headers: {
			'Access-Control-Allow-Origin': '*'
		}
	};
	const response = await fetch(url, options);
	isOnline = response.ok;
	const data = await response.text();
	console.log(data);
}

async function handleLoadPress(e) {
	if (!isOnline) {
		alert('app is offline');
		return;
	}
	const test = prompt('Who ate the cake?');
	if (pass(test)) {
		e.currentTarget.style.display = 'none';
		await loadDefaultCharacterSelection();
	}
	// await getDataFromDdbUrl();
	// await loadCharacterInfo();
}

async function loadDefaultCharacterSelection() {
	if (!TEMPLATE_OK) {
		alert('browser no support templates!!!');
		return;
	}

	const dc_select_area = document.querySelector('.dc-select-area');
	const dcis_template = document.querySelector('#dc-imgselect-template');
	for (let i = 0; i < activeCharacters.length; i++) {
		const activeChar = activeCharacters[i];
		const dcis_clone = dcis_template.content.cloneNode(true);
		const dcis = dcis_clone.querySelector('.dc-imgselect');
		dcis.setAttribute('data-character-id', activeChar.characterId);
		dcis.setAttribute('data-selected', 0);
		dcis.addEventListener("click", (e) => {
			handlDcisSelect(e);
		});
		const dcis_img = dcis_clone.querySelector('.dc-imgselect-img');
		dcis_img.setAttribute('src', activeChar.avatarUrl);
		const dcis_name = dcis_clone.querySelector('.dc-imgselect-name');
		dcis_name.textContent = activeChar.characterName;
		dc_select_area.appendChild(dcis_clone);
	}
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

function handlDcisSelect(e) {
	let selected = e.currentTarget.dataset.selected === '1';
	if (selected) {
		e.currentTarget.dataset.selected = '0';
		e.currentTarget.classList.remove('pikd');
	} else {
		e.currentTarget.dataset.selected = '1';
		e.currentTarget.classList.add('pikd');
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

function pass(t) {
	return nothing.some((z) => z === btoa(t+ceed));
}

document.addEventListener("DOMContentLoaded", async (event) => {
	console.log(event.type);
	await init();
});

// data
const activeCharacters = [{
	"userId": 117971385,
	"username": "EllingTrias",
	"characterId": 111492631,
	"characterName": "Elling Trias the Great",
	"characterUrl": "/profile/EllingTrias/characters/111492631",
	"avatarUrl": "https://www.dndbeyond.com/avatars/17/178/636377835492897814.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp",
	"privacyType": 3,
	"campaignId": null,
	"isAssigned": true
}, {
	"userId": 109083463,
	"username": "dogmaii",
	"characterId": 111498202,
	"characterName": "Jayms (Jym, 30)",
	"characterUrl": "/profile/dogmaii/characters/111498202",
	"avatarUrl": "https://www.dndbeyond.com/avatars/37712/121/1581111423-111498202.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp",
	"privacyType": 3,
	"campaignId": null,
	"isAssigned": true
}, {
	"userId": 116730144,
	"username": "BradleyBEG",
	"characterId": 111500432,
	"characterName": "Airk",
	"characterUrl": "/profile/BradleyBEG/characters/111500432",
	"avatarUrl": "https://www.dndbeyond.com/avatars/32569/576/638131317734505343.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp",
	"privacyType": 2,
	"campaignId": null,
	"isAssigned": true
}, {
	"userId": 100237465,
	"username": "gheist",
	"characterId": 111540702,
	"characterName": " Bicorn Kaufwin Peckish",
	"characterUrl": "/profile/gheist/characters/111540702",
	"avatarUrl": "https://www.dndbeyond.com/avatars/38116/343/1581111423-111540702.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp",
	"privacyType": 2,
	"campaignId": null,
	"isAssigned": true
}, {
	"userId": 105857724,
	"username": "Here4KeepsNCastles",
	"characterId": 111412660,
	"characterName": "Yorti Frandula",
	"characterUrl": "/profile/Here4KeepsNCastles/characters/111412660",
	"avatarUrl": "https://www.dndbeyond.com/avatars/10/67/636339379597405748.png?width=150&height=150&fit=crop&quality=95&auto=webp",
	"privacyType": 2,
	"campaignId": null,
	"isAssigned": true
}, {
	"userId": 101104705,
	"username": "julianj536",
	"characterId": 111807249,
	"characterName": "Pomni",
	"characterUrl": "/profile/julianj536/characters/111807249",
	"avatarUrl": "https://www.dndbeyond.com/avatars/37783/806/1581111423-111793660.jpeg?width=150&height=150&fit=crop&quality=95&auto=webp",
	"privacyType": 2,
	"campaignId": null,
	"isAssigned": true
}
];
const ceed = '=42=';
const nothing = [ 'SmltbXk9NDI9', 'amltbXk9NDI9' ];
