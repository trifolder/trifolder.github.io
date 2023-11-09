let ddbChars = [];
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
	
}



document.addEventListener("DOMContentLoaded", function(event) {
    init();
});